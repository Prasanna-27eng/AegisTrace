"""
AegisTrace v10.0 — Playbook Engine (SOAR)
───────────────────────────────────────────────
Lets analysts define "if trigger then actions" automation rules. When a
matching event occurs, configured actions either execute immediately or are
queued in the existing ProvenanceLedger approval queue (/app/agent-security)
if they require human approval.

Endpoints:
  GET    /api/orchestration/playbooks              — list playbooks
  POST   /api/orchestration/playbooks              — create playbook (admin)
  PATCH  /api/orchestration/playbooks/{id}         — update playbook (admin)
  DELETE /api/orchestration/playbooks/{id}         — delete playbook (admin)
  GET    /api/orchestration/playbooks/{id}/runs    — run history
  POST   /api/orchestration/evaluate               — evaluate a synthetic event (dry-run by default)
  POST   /api/orchestration/seed                   — seed the built-in playbook (admin)

Called from other routers via evaluate_playbooks(session, event_type, event_data).
"""
import json
import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from routers.auth import get_current_user, require_admin, _audit
from models import (
    User, Playbook, PlaybookRun, Case, Endpoint, AgentCommand,
    AgentAction, ProvenanceLedger, CaseComment,
)

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])

# Action types and their default approval requirement.
ACTION_TYPES = {
    "isolate_endpoint": True,
    "create_case": False,
    "send_webhook": False,
    "enrich_ioc": False,
    "page_oncall": False,
    "add_case_comment": False,
    "generate_rules": False,
}

SEED_PLAYBOOK = {
    "name": "Critical MCP Block -> Contain",
    "description": "When mcp-aegis blocks a high-confidence malicious tool call, open a case, "
                    "queue endpoint isolation for approval, and notify via webhook.",
    "trigger_event_type": "mcp_event",
    "trigger_conditions": {"action_type": "mcp_block", "min_confidence": 0.9},
    "actions": [
        {"type": "create_case", "requires_approval": False,
         "params": {"severity": "critical", "incident_type": "ai_agent_compromise"}},
        {"type": "isolate_endpoint", "requires_approval": True, "params": {}},
        {"type": "send_webhook", "requires_approval": False,
         "params": {"message": "Critical MCP block detected — containment initiated"}},
    ],
}


# ── Trigger condition matching ────────────────────────────────────────────────
def _conditions_match(conditions: dict, event_data: dict) -> bool:
    for key, expected in conditions.items():
        if key.startswith("min_"):
            actual = event_data.get(key[4:])
            if actual is None or float(actual) < float(expected):
                return False
        elif key.startswith("max_"):
            actual = event_data.get(key[4:])
            if actual is None or float(actual) > float(expected):
                return False
        else:
            actual = event_data.get(key)
            if isinstance(actual, str) and isinstance(expected, str):
                if actual.lower() != expected.lower():
                    return False
            elif actual != expected:
                return False
    return True


# ── Action executors ──────────────────────────────────────────────────────────
def _action_isolate_endpoint(session: Session, params: dict, event_data: dict) -> dict:
    hostname = params.get("hostname") or event_data.get("hostname")
    if not hostname:
        return {"status": "skipped", "detail": "No hostname available to isolate"}
    ep = session.exec(select(Endpoint).where(Endpoint.hostname == hostname)).first()
    if not ep:
        return {"status": "error", "detail": f"Endpoint '{hostname}' not found"}
    cmd = AgentCommand(agent_id=ep.id, command_type="isolate_device", payload="{}", status="pending")
    session.add(cmd)
    session.flush()
    return {"status": "done", "detail": f"Isolation command queued for {hostname}", "command_id": cmd.id}


def _action_create_case(session: Session, params: dict, event_data: dict) -> dict:
    case_number = f"CASE-PB-{int(datetime.utcnow().timestamp())}"
    title = params.get("title") or (
        f"Auto: {event_data.get('alert_type') or event_data.get('action_type') or 'Playbook trigger'}"
    )
    case = Case(
        case_number=case_number,
        title=title,
        severity=params.get("severity", event_data.get("severity", "medium")),
        incident_type=params.get("incident_type", ""),
        affected_systems=event_data.get("hostname", ""),
        description=f"Auto-created by Playbook Engine.\n\nTrigger event: {json.dumps(event_data, default=str)[:500]}",
    )
    session.add(case)
    session.flush()
    return {"status": "done", "detail": f"Case {case.case_number} created", "case_id": case.id}


def _action_send_webhook(params: dict, event_data: dict, case) -> dict:
    from routers.webhooks import fire_event
    fire_event("playbook_action", {
        "message": params.get("message", "Playbook action triggered"),
        "title": case.title if case else event_data.get("description", ""),
        "case_number": case.case_number if case else None,
        "severity": event_data.get("severity", "medium"),
    })
    return {"status": "done", "detail": "Webhook fired"}


def _action_page_oncall(params: dict, event_data: dict, case) -> dict:
    from routers.webhooks import fire_event
    fire_event("playbook_page_oncall", {
        "message": params.get("message", "On-call paged by Playbook Engine"),
        "title": case.title if case else event_data.get("description", ""),
        "case_number": case.case_number if case else None,
        "severity": event_data.get("severity", "high"),
    })
    return {"status": "done", "detail": "On-call paged via webhook"}


def _action_add_case_comment(session: Session, params: dict, event_data: dict, case) -> dict:
    if not case:
        return {"status": "skipped", "detail": "No case linked to this event"}
    body = params.get("body") or f"Playbook auto-comment — trigger event: {json.dumps(event_data, default=str)[:300]}"
    session.add(CaseComment(
        case_id=case.id, author_email="playbook-engine", author_name="Playbook Engine",
        comment_type="note", body=body,
    ))
    return {"status": "done", "detail": "Comment added to case"}


async def _action_enrich_ioc(session: Session, params: dict, event_data: dict, case) -> dict:
    ioc = params.get("ioc") or event_data.get("attacker_ip") or event_data.get("ip")
    if not ioc:
        return {"status": "skipped", "detail": "No IOC available to enrich"}

    from routers.enrichment import _detect_type, query_threatfox, query_shodan_internetdb
    ioc_type = _detect_type(ioc)
    try:
        if ioc_type == "ip":
            results = await asyncio.gather(query_shodan_internetdb(ioc), query_threatfox(ioc), return_exceptions=True)
        else:
            results = await asyncio.gather(query_threatfox(ioc), return_exceptions=True)
    except Exception:
        results = []

    verdicts = [r.get("verdict") for r in results if isinstance(r, dict) and r.get("verdict")]
    overall = "malicious" if "malicious" in verdicts else ("suspicious" if "suspicious" in verdicts else "unknown")

    if case:
        try:
            iocs = json.loads(case.iocs or "[]")
        except Exception:
            iocs = []
        if not any(isinstance(i, dict) and i.get("ioc") == ioc for i in iocs):
            iocs.append({"ioc": ioc, "type": ioc_type, "verdict": overall, "source": "playbook_auto_enrich"})
            case.iocs = json.dumps(iocs)
            session.add(case)

    return {"status": "done", "detail": f"Enriched {ioc}: {overall}"}


async def _action_generate_rules(session: Session, case) -> dict:
    if not case:
        return {"status": "skipped", "detail": "No case linked to this event"}
    try:
        iocs = json.loads(case.iocs or "[]")
        mitre = json.loads(case.mitre_techniques or "[]")
    except Exception:
        iocs, mitre = [], []
    if not iocs and not mitre and not case.description:
        return {"status": "skipped", "detail": "Case has no IOCs/MITRE/description to generate rules from"}

    from routers.rules import _build_rules_prompt, _generate_with_codestral
    prompt = _build_rules_prompt(case, iocs, mitre)
    result = await _generate_with_codestral(prompt)
    session.add(AgentAction(
        agent_name="playbook-engine", action_type="rule_generation",
        input_data=json.dumps({"case_id": case.id}),
        output_data=json.dumps(result, default=str),
        confidence=80, approval_required=False, approval_status="auto",
        case_id=case.id,
    ))
    return {"status": "done", "detail": f"Generated rules: {result.get('rule_name', '(unnamed)')}"}


async def _execute_action(session: Session, atype: str, params: dict, event_data: dict, case) -> dict:
    if atype == "isolate_endpoint":
        return _action_isolate_endpoint(session, params, event_data)
    if atype == "create_case":
        return _action_create_case(session, params, event_data)
    if atype == "send_webhook":
        return _action_send_webhook(params, event_data, case)
    if atype == "page_oncall":
        return _action_page_oncall(params, event_data, case)
    if atype == "add_case_comment":
        return _action_add_case_comment(session, params, event_data, case)
    if atype == "enrich_ioc":
        return await _action_enrich_ioc(session, params, event_data, case)
    if atype == "generate_rules":
        return await _action_generate_rules(session, case)
    return {"status": "error", "detail": f"Unknown action type '{atype}'"}


# ── Approval closure (called from agent_security.approve_action) ─────────────
async def execute_approved_playbook_action(session: Session, record: ProvenanceLedger) -> dict:
    """
    Execute a deferred playbook action after a ProvenanceLedger entry
    (action_type == "playbook_action") has been approved.
    """
    try:
        ctx = json.loads(record.input_context or "{}")
    except Exception:
        return {"status": "error", "detail": "Could not parse action context"}

    action = ctx.get("action", {})
    event_data = ctx.get("event", {})
    atype = action.get("type") or record.tool_name
    params = action.get("params", {})

    case = None
    if record.case_id:
        case = session.get(Case, record.case_id)
    elif event_data.get("case_id"):
        case = session.get(Case, event_data["case_id"])

    try:
        outcome = await _execute_action(session, atype, params, event_data, case)
    except Exception as e:
        outcome = {"status": "error", "detail": str(e)}

    record.output_summary = f"Executed on approval: {json.dumps(outcome, default=str)}"
    session.add(record)
    session.commit()
    return outcome


# ── Core evaluator (called from ingest routers) ───────────────────────────────
async def evaluate_playbooks(session: Session, event_type: str, event_data: dict, dry_run: bool = False):
    """
    Evaluate all active playbooks for `event_type` against `event_data`.
    Non-approval actions execute immediately; approval-gated actions are queued
    in ProvenanceLedger (visible at /app/agent-security).
    Returns a list of PlaybookRun records (or preview dicts if dry_run).
    """
    playbooks = session.exec(
        select(Playbook)
        .where(Playbook.is_active == True)
        .where(Playbook.trigger_event_type == event_type)
    ).all()

    results = []
    for pb in playbooks:
        try:
            conditions = json.loads(pb.trigger_conditions or "{}")
        except Exception:
            conditions = {}
        if not _conditions_match(conditions, event_data):
            continue

        case = None
        case_id = event_data.get("case_id")
        if case_id:
            case = session.get(Case, case_id)

        try:
            actions = json.loads(pb.actions or "[]")
        except Exception:
            actions = []

        actions_taken = []
        actions_pending = []

        for action in actions:
            atype = action.get("type")
            params = action.get("params", {})
            requires_approval = action.get("requires_approval", ACTION_TYPES.get(atype, False)) and pb.requires_approval

            if dry_run:
                (actions_pending if requires_approval else actions_taken).append(
                    {"type": atype, "params": params, "status": "preview"}
                )
                continue

            if requires_approval:
                ledger = ProvenanceLedger(
                    case_id=case.id if case else None,
                    action_type="playbook_action",
                    actor="playbook-engine",
                    tool_name=atype,
                    input_context=json.dumps({"playbook": pb.name, "action": action, "event": event_data}, default=str),
                    output_summary=f"Pending approval: {atype} ({pb.name})",
                    confidence=0,
                    approval_status="pending",
                )
                session.add(ledger)
                session.flush()
                actions_pending.append({"type": atype, "params": params, "ledger_id": ledger.id})
                continue

            try:
                outcome = await _execute_action(session, atype, params, event_data, case)
            except Exception as e:
                outcome = {"status": "error", "detail": str(e)}
            actions_taken.append({"type": atype, **outcome})

        if dry_run:
            results.append({
                "playbook_id": pb.id, "playbook_name": pb.name,
                "actions_taken": actions_taken, "actions_pending": actions_pending,
            })
            continue

        run = PlaybookRun(
            playbook_id=pb.id,
            trigger_event_type=event_type,
            trigger_event_id=str(event_data.get("id", "")),
            actions_taken=json.dumps(actions_taken, default=str),
            actions_pending=json.dumps(actions_pending, default=str),
            status="pending_approval" if actions_pending else "completed",
            result_summary=f"{len(actions_taken)} action(s) executed, {len(actions_pending)} pending approval",
            completed_at=None if actions_pending else datetime.utcnow(),
        )
        session.add(run)
        pb.run_count += 1
        pb.last_run_at = datetime.utcnow()
        session.add(pb)
        session.commit()
        session.refresh(run)
        results.append(run)

    return results


def seed_builtin_playbooks(session: Session):
    """Idempotent — seeds the built-in 'Critical MCP Block -> Contain' playbook."""
    existing = session.exec(select(Playbook).where(Playbook.name == SEED_PLAYBOOK["name"])).first()
    if existing:
        return
    session.add(Playbook(
        name=SEED_PLAYBOOK["name"],
        description=SEED_PLAYBOOK["description"],
        trigger_event_type=SEED_PLAYBOOK["trigger_event_type"],
        trigger_conditions=json.dumps(SEED_PLAYBOOK["trigger_conditions"]),
        actions=json.dumps(SEED_PLAYBOOK["actions"]),
        is_active=True,
        requires_approval=True,
        org_id=1,
    ))
    session.commit()


# ── CRUD endpoints ─────────────────────────────────────────────────────────────
@router.get("/playbooks")
def list_playbooks(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(
        select(Playbook).where(Playbook.org_id == user.org_id).order_by(Playbook.created_at.desc())
    ).all()


@router.post("/playbooks")
def create_playbook(data: dict, user: User = Depends(require_admin), session: Session = Depends(get_session)):
    pb = Playbook(
        name=data.get("name", "Untitled Playbook"),
        description=data.get("description", ""),
        trigger_event_type=data.get("trigger_event_type", ""),
        trigger_conditions=json.dumps(data.get("trigger_conditions", {})),
        actions=json.dumps(data.get("actions", [])),
        is_active=data.get("is_active", True),
        requires_approval=data.get("requires_approval", True),
        created_by=user.id,
        org_id=user.org_id,
    )
    session.add(pb)
    _audit(session, "playbook_created", "playbook", "", user.id, user.email, pb.name)
    session.commit()
    session.refresh(pb)
    return pb


@router.patch("/playbooks/{pb_id}")
def update_playbook(pb_id: int, data: dict, user: User = Depends(require_admin), session: Session = Depends(get_session)):
    pb = session.get(Playbook, pb_id)
    if not pb or pb.org_id != user.org_id:
        raise HTTPException(404, "Playbook not found")
    for field in ("name", "description", "trigger_event_type", "is_active", "requires_approval"):
        if field in data:
            setattr(pb, field, data[field])
    if "trigger_conditions" in data:
        pb.trigger_conditions = json.dumps(data["trigger_conditions"])
    if "actions" in data:
        pb.actions = json.dumps(data["actions"])
    session.add(pb)
    _audit(session, "playbook_updated", "playbook", str(pb_id), user.id, user.email, pb.name)
    session.commit()
    session.refresh(pb)
    return pb


@router.delete("/playbooks/{pb_id}")
def delete_playbook(pb_id: int, user: User = Depends(require_admin), session: Session = Depends(get_session)):
    pb = session.get(Playbook, pb_id)
    if not pb or pb.org_id != user.org_id:
        raise HTTPException(404, "Playbook not found")
    session.delete(pb)
    _audit(session, "playbook_deleted", "playbook", str(pb_id), user.id, user.email, pb.name)
    session.commit()
    return {"ok": True}


@router.get("/playbooks/{pb_id}/runs")
def list_runs(pb_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    pb = session.get(Playbook, pb_id)
    if not pb or pb.org_id != user.org_id:
        raise HTTPException(404, "Playbook not found")
    return session.exec(
        select(PlaybookRun).where(PlaybookRun.playbook_id == pb_id).order_by(PlaybookRun.run_at.desc()).limit(50)
    ).all()


@router.post("/evaluate")
async def evaluate_endpoint(data: dict, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Evaluate playbooks for a synthetic event. Dry-run by default (no side effects)."""
    event_type = data.get("trigger_event_type") or data.get("event_type")
    if not event_type:
        raise HTTPException(400, "trigger_event_type required")
    event_data = data.get("event_data", {})
    dry_run = data.get("dry_run", True)
    results = await evaluate_playbooks(session, event_type, event_data, dry_run=dry_run)
    return {"dry_run": dry_run, "results": results}


@router.post("/seed")
def seed_endpoint(user: User = Depends(require_admin), session: Session = Depends(get_session)):
    before = session.exec(select(Playbook).where(Playbook.name == SEED_PLAYBOOK["name"])).first()
    seed_builtin_playbooks(session)
    after = session.exec(select(Playbook).where(Playbook.name == SEED_PLAYBOOK["name"])).first()
    return {"ok": True, "created": before is None, "playbook_id": after.id if after else None}
