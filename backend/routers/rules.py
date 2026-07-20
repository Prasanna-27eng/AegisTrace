"""
AegisTrace Detection Rule Generator — Phase 9
───────────────────────────────────────────────
Codestral 22B generates deployable detection rules from case IOCs and MITRE techniques.

Endpoints:
  POST /api/rules/cases/{id}/generate   — generate YARA + Sigma + KQL + Splunk SPL
  GET  /api/rules/cases/{id}            — get previously generated rules
"""

import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from routers.auth import get_current_user, _audit
from models import User, Case, DetectionRule
from nvidia_client import nvidia_chat, CODESTRAL, is_nvidia_available
from ai_router import call_ai

router = APIRouter(tags=["rules"])

_CODESTRAL_SYSTEM = """You are a cybersecurity detection engineer.
Generate production-grade detection rules in exactly the formats requested.
Rules must be syntactically correct and deployable without modification.
Output ONLY the JSON object requested — no prose, no markdown fences outside the JSON."""


def _build_rules_prompt(case, iocs: list, mitre: list) -> str:
    ioc_summary = ", ".join(
        f"{i.get('ioc', '')} ({i.get('type', '')})"
        for i in iocs[:8]
    )
    mitre_summary = ", ".join(
        f"{t.get('id', '')} {t.get('name', '')}"
        for t in mitre[:5]
    )

    return f"""Generate detection rules for this security incident:

Case: {case.case_number} — {case.title}
Incident type: {case.incident_type}
Severity: {case.severity}
IOCs: {ioc_summary or 'none specified'}
MITRE techniques: {mitre_summary or 'none specified'}
Description: {(case.description or '')[:400]}

Generate these 4 rule types and return as JSON:
{{
  "yara": "complete valid YARA rule as a string",
  "sigma": "complete valid Sigma rule in YAML format as a string",
  "kql": "complete valid KQL query for Microsoft Sentinel as a string",
  "splunk_spl": "complete valid Splunk SPL query as a string",
  "rule_name": "short alphanumeric rule identifier",
  "description": "one sentence describing what these rules detect",
  "platforms": ["windows","linux","macos"],
  "generated_at": "{datetime.utcnow().isoformat()}"
}}

Rules must:
- Use real IOC values from the case where present
- Include meta/description fields in YARA and Sigma
- Be immediately deployable in the target platform
- Cover the MITRE techniques listed"""


async def _generate_with_codestral(prompt: str) -> dict:
    """Try Codestral first, fall back to Groq code task."""
    if is_nvidia_available():
        resp = nvidia_chat(
            model=CODESTRAL,
            messages=[
                {"role": "system", "content": _CODESTRAL_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.1,
            max_tokens=2500,
        )
        if resp:
            content = resp.choices[0].message.content or ""
            try:
                s = content.find("{")
                e = content.rfind("}") + 1
                return json.loads(content[s:e])
            except Exception:
                pass

    # Groq fallback
    import asyncio
    raw = await asyncio.to_thread(call_ai, "code", prompt, 0.1, 2000)
    try:
        s = raw.find("{")
        e = raw.rfind("}") + 1
        return json.loads(raw[s:e])
    except Exception:
        return {
            "yara":        raw[:500] if "rule" in raw else "// Generation failed",
            "sigma":       "// Generation failed",
            "kql":         "// Generation failed",
            "splunk_spl":  "// Generation failed",
            "rule_name":   f"AEGIS_{case.case_number.replace('-', '_')}",
            "description": "Rule generation partially failed — see raw output",
            "platforms":   ["windows", "linux", "macos"],
            "error":       "Parse failed",
        }


@router.post("/api/rules/cases/{case_id}/generate")
async def generate_rules(
    case_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    iocs  = []
    mitre = []
    try:
        iocs  = json.loads(case.iocs or "[]")
        mitre = json.loads(case.mitre_techniques or "[]")
    except Exception:
        pass

    if not iocs and not mitre and not case.description:
        raise HTTPException(400, "Case needs IOCs, MITRE techniques, or a description before rules can be generated")

    prompt = _build_rules_prompt(case, iocs, mitre)
    result = await _generate_with_codestral(prompt)

    result["case_id"]     = case_id
    result["case_number"] = case.case_number
    result["model"]       = CODESTRAL if is_nvidia_available() else "groq-fallback"

    _audit(session, "rules_generated", "case", str(case.id), user.id, user.email,
           result.get("rule_name", ""))
    session.commit()

    return result


# ── Auto-rule trigger check ────────────────────────────────────────────────
async def check_rule_generation_triggers(org_id: int, session: Session):
    """
    Called after any case update. Checks if any MITRE technique has appeared
    in 3+ cases within the last 7 days for this org. If so, auto-generates
    detection rules via Codestral and queues them for human review.
    """
    cutoff = datetime.utcnow() - timedelta(days=7)
    cases = session.exec(
        select(Case)
        .where(Case.org_id == org_id)
        .where(Case.created_at >= cutoff)
        .where(Case.mitre_techniques != "[]")
        .where(Case.mitre_techniques != None)  # noqa: E711
    ).all()

    # Count technique frequency
    technique_cases: dict[str, list[int]] = {}
    for case in cases:
        try:
            techniques = json.loads(case.mitre_techniques or "[]")
        except Exception:
            continue
        for t in techniques:
            tid = t.get("id", "") if isinstance(t, dict) else str(t)
            if tid:
                technique_cases.setdefault(tid, []).append(case.id)

    # Find techniques at threshold (3+)
    for technique_id, case_ids in technique_cases.items():
        if len(case_ids) < 3:
            continue

        # Check if we already have a pending/approved rule for this technique
        existing = session.exec(
            select(DetectionRule)
            .where(DetectionRule.org_id == org_id)
            .where(DetectionRule.trigger_technique == technique_id)
            .where(DetectionRule.status.in_(["pending_review", "approved", "deployed"]))
        ).first()
        if existing:
            continue

        # Auto-generate rules for the triggering cases
        trigger_cases = [c for c in cases if c.id in case_ids[:3]]
        if not trigger_cases:
            continue

        # Build IOC + context from triggering cases
        all_iocs: list = []
        for tc in trigger_cases:
            try:
                all_iocs.extend(json.loads(tc.iocs or "[]")[:3])
            except Exception:
                pass

        safe_tech_id = technique_id.replace(".", "_")
        prompt = f"""Generate detection rules for MITRE technique {technique_id}.
This technique appeared in {len(case_ids)} cases in the last 7 days.

Recent case titles: {', '.join(tc.title for tc in trigger_cases[:3])}
Sample IOCs: {', '.join(i.get('ioc','') for i in all_iocs[:5] if isinstance(i, dict))}

Return JSON:
{{
  "yara": "complete YARA rule",
  "sigma": "complete Sigma rule YAML",
  "kql": "complete KQL query",
  "splunk_spl": "complete SPL query",
  "rule_name": "AT_{safe_tech_id}",
  "description": "one sentence",
  "ai_confidence": 0.0
}}"""

        result = await _generate_with_codestral(prompt)
        if not result:
            continue

        rule = DetectionRule(
            org_id=org_id,
            rule_name=result.get("rule_name", f"AT_{safe_tech_id}"),
            trigger_technique=technique_id,
            trigger_case_ids=json.dumps(case_ids[:10]),
            status="pending_review",
            yara=result.get("yara"),
            sigma=result.get("sigma"),
            kql=result.get("kql"),
            splunk_spl=result.get("splunk_spl"),
            description=result.get("description"),
            ai_confidence=float(result.get("ai_confidence", 0.75)),
        )
        session.add(rule)
        session.commit()


# ── Pending rules endpoints ────────────────────────────────────────────────
@router.get("/api/rules/pending")
async def list_pending_rules(
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all auto-generated rules awaiting human review."""
    rules = session.exec(
        select(DetectionRule)
        .where(DetectionRule.org_id == _user.org_id)
        .order_by(DetectionRule.generated_at.desc())
    ).all()
    return [
        {
            "id": r.id,
            "rule_name": r.rule_name,
            "trigger_technique": r.trigger_technique,
            "trigger_case_ids": json.loads(r.trigger_case_ids or "[]"),
            "status": r.status,
            "description": r.description,
            "ai_confidence": r.ai_confidence,
            "severity": r.severity,
            "generated_at": r.generated_at.isoformat() if r.generated_at else None,
            "reviewed_by": r.reviewed_by,
            "review_notes": r.review_notes,
        }
        for r in rules
    ]


@router.get("/api/rules/pending/{rule_id}")
async def get_pending_rule(
    rule_id: int,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rule = session.get(DetectionRule, rule_id)
    if not rule or rule.org_id != _user.org_id:
        raise HTTPException(404, "Rule not found")
    return {
        "id": rule.id, "rule_name": rule.rule_name,
        "trigger_technique": rule.trigger_technique,
        "trigger_case_ids": json.loads(rule.trigger_case_ids or "[]"),
        "status": rule.status, "description": rule.description,
        "ai_confidence": rule.ai_confidence, "severity": rule.severity,
        "yara": rule.yara, "sigma": rule.sigma,
        "kql": rule.kql, "splunk_spl": rule.splunk_spl,
        "generated_at": rule.generated_at.isoformat() if rule.generated_at else None,
        "reviewed_by": rule.reviewed_by, "review_notes": rule.review_notes,
    }


@router.post("/api/rules/pending/{rule_id}/approve")
async def approve_pending_rule(
    rule_id: int,
    body: dict = {},
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if _user.role not in ("admin", "analyst"):
        raise HTTPException(403, "Insufficient role")
    rule = session.get(DetectionRule, rule_id)
    if not rule or rule.org_id != _user.org_id:
        raise HTTPException(404, "Rule not found")
    rule.status = "approved"
    rule.reviewed_by = _user.name or _user.email
    rule.review_notes = body.get("notes")
    rule.reviewed_at = datetime.utcnow()
    session.add(rule)
    session.commit()
    _audit(session, "rule_approved", "detection_rule", str(rule.id),
           _user.id, _user.email, rule.rule_name)
    return {"status": "approved"}


@router.post("/api/rules/pending/{rule_id}/reject")
async def reject_pending_rule(
    rule_id: int,
    body: dict = {},
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if _user.role not in ("admin", "analyst"):
        raise HTTPException(403, "Insufficient role")
    rule = session.get(DetectionRule, rule_id)
    if not rule or rule.org_id != _user.org_id:
        raise HTTPException(404, "Rule not found")
    rule.status = "rejected"
    rule.reviewed_by = _user.name or _user.email
    rule.review_notes = body.get("notes", "Rejected")
    rule.reviewed_at = datetime.utcnow()
    session.add(rule)
    session.commit()
    _audit(session, "rule_rejected", "detection_rule", str(rule.id),
           _user.id, _user.email, rule.rule_name)
    return {"status": "rejected"}
