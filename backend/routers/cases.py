import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select, func, or_
from models import Case, EvidenceArtifact, TimelineEvent, IOCCorrelation, AuditLog
from database import get_session
from ai_router import call_ai, call_ai_json
from routers.auth import get_current_user, _audit
from models import User

router = APIRouter(prefix="/api/cases", tags=["cases"])


def next_case_number(session: Session) -> str:
    """Use MAX(id) to avoid duplicates on deletion."""
    result = session.exec(select(func.max(Case.id))).one()
    next_id = (result or 0) + 1
    return f"SOC-{datetime.utcnow().year}-{next_id:04d}"


def correlate_iocs(session: Session, case_id: int, iocs_raw: str):
    try:
        iocs = json.loads(iocs_raw or "[]")
    except Exception:
        return
    for item in iocs:
        val = item.get("ioc", "")
        itype = item.get("type", "")
        if not val:
            continue
        existing = session.exec(
            select(IOCCorrelation).where(IOCCorrelation.ioc == val)
        ).first()
        if existing:
            ids = json.loads(existing.case_ids or "[]")
            if case_id not in ids:
                ids.append(case_id)
                existing.case_ids = json.dumps(ids)
                existing.case_count = len(ids)
                existing.last_seen = datetime.utcnow()
                session.add(existing)
                # Fire malicious_ioc webhook when IOC reaches campaign threshold (3+ cases)
                if existing.case_count >= 3:
                    try:
                        from routers.webhooks import fire_event
                        fire_event("malicious_ioc", {
                            "ioc": val,
                            "ioc_type": itype,
                            "verdict": "campaign_ioc",
                            "case_count": existing.case_count,
                            "source": "ioc_correlation",
                        })
                    except Exception:
                        pass
        else:
            session.add(IOCCorrelation(
                ioc=val, ioc_type=itype,
                case_ids=json.dumps([case_id]), case_count=1
            ))


# ── LIST / CREATE ─────────────────────────────────────────────────────────────
@router.get("")
def list_cases(
    q: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    incident_type: Optional[str] = Query(None),
    sort: str = Query("newest"),
    limit: Optional[int] = Query(None),
    offset: int = Query(0),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    query = select(Case).where(Case.org_id == _user.org_id)
    if severity:
        query = query.where(Case.severity == severity)
    if status:
        query = query.where(Case.status == status)
    if incident_type:
        query = query.where(Case.incident_type == incident_type)
    if q:
        query = query.where(or_(
            Case.title.contains(q),
            Case.case_number.contains(q),
            Case.analyst_name.contains(q),
            Case.customer_name.contains(q),
            Case.findings.contains(q),
            Case.description.contains(q),
        ))
    if sort != "severity":
        query = query.order_by(Case.created_at.desc())
        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)
    cases = session.exec(query).all()
    if sort == "severity":
        order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        cases.sort(key=lambda c: order.get(c.severity, 5))
        if offset or limit:
            cases = cases[offset:offset + limit] if limit else cases[offset:]
    return cases


@router.post("")
def create_case(
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = Case(
        case_number=next_case_number(session),
        title=data.get("title", "Untitled Case"),
        severity=data.get("severity", "medium"),
        status="open",
        incident_type=data.get("incident_type", ""),
        analyst_name=data.get("analyst_name", user.name),
        customer_name=data.get("customer_name", ""),
        affected_systems=data.get("affected_systems", ""),
        classification=data.get("classification", "internal"),
        description=data.get("description", ""),
        org_id=user.org_id,
    )
    session.add(case)
    session.commit()
    session.refresh(case)
    _audit(session, "case_created", "case", str(case.id),
           user.id, user.email, case.title)
    session.commit()
    return case


# ── GET / UPDATE / DELETE ─────────────────────────────────────────────────────
@router.get("/{case_id}")
def get_case(case_id: int, session: Session = Depends(get_session),
             _user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case or case.org_id != _user.org_id:
        raise HTTPException(404, "Case not found")
    return case


@router.patch("/{case_id}")
def update_case(
    case_id: int,
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")
    allowed = [
        "title", "severity", "status", "incident_type", "affected_systems",
        "analyst_name", "customer_name", "classification", "description",
        "commands_run", "findings", "recommendations", "iocs",
        "mitre_techniques", "is_public", "shift_handoff",
        "ai_executive_summary", "ai_technical_summary",
        "ai_severity_score", "ai_severity_reasoning",
        "vt_results", "closure_notes", "tools_output", "email_analysis",
        "playbook_state",
    ]
    old_status = case.status
    for k, v in data.items():
        if k in allowed:
            setattr(case, k, v if not isinstance(v, (dict, list)) else json.dumps(v))
    case.updated_at = datetime.utcnow()
    if "iocs" in data:
        correlate_iocs(session, case_id, case.iocs)
    # Log status changes explicitly
    if "status" in data and data["status"] != old_status:
        _audit(session, "status_changed", "case", str(case.id),
               user.id, user.email, f"{old_status} → {data['status']}")
    session.add(case)
    session.commit()
    session.refresh(case)
    # Fire webhook ONLY when status actually changed
    if "status" in data and data["status"] != old_status:
        try:
            from routers.webhooks import fire_event
            fire_event("case_status_changed", {
                "case_number": case.case_number,
                "title": case.title,
                "severity": case.severity,
                "status": case.status,
                "old_status": old_status,
            })
        except Exception:
            pass
    return case


@router.delete("/{case_id}")
def delete_case(
    case_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if user.role not in ("admin", "analyst"):
        raise HTTPException(403, "Analysts and admins only")
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")
    _audit(session, "case_deleted", "case", str(case.id),
           user.id, user.email, case.title)
    session.delete(case)
    session.commit()
    return {"ok": True}


# ── GENERATE AI ───────────────────────────────────────────────────────────────
@router.post("/{case_id}/generate-ai")
async def generate_ai(
    case_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    iocs  = json.loads(case.iocs or "[]")
    mitre = json.loads(case.mitre_techniques or "[]")

    prompt = f"""Analyse this security incident:
Case: {case.case_number} — {case.title}
Severity: {case.severity} | Type: {case.incident_type}
Affected: {case.affected_systems}
Description: {case.description[:800]}
Findings: {case.findings[:800]}
Commands: {(case.commands_run or '')[:1200]}
IOCs ({len(iocs)}): {json.dumps(iocs[:10])}
MITRE: {json.dumps(mitre)}

Respond ONLY with valid JSON:
{{
  "executive_summary": "2-3 sentences for non-technical leadership",
  "technical_summary": "4-6 sentences technical analysis",
  "severity_score": <0-100>,
  "severity_reasoning": "why this score",
  "mitre_techniques": [{{"id":"T####","name":"...","tactic":"..."}}],
  "recommended_actions": ["action 1","action 2","action 3"]
}}"""

    result = call_ai_json("analysis", prompt, temperature=0.25, max_tokens=1500)
    if result.get("parse_error"):
        result = {"executive_summary": result.get("raw",""), "technical_summary": "",
                  "severity_score": 50, "severity_reasoning": "",
                  "mitre_techniques": [], "recommended_actions": []}

    case.ai_executive_summary = result.get("executive_summary", "")
    case.ai_technical_summary = result.get("technical_summary", "")
    case.ai_severity_score    = result.get("severity_score", 50)
    case.ai_severity_reasoning= result.get("severity_reasoning", "")
    if result.get("mitre_techniques"):
        case.mitre_techniques = json.dumps(result["mitre_techniques"])
    case.updated_at = datetime.utcnow()
    session.add(case)
    _audit(session, "ai_generated", "case", str(case.id), user.id, user.email)
    session.commit()
    session.refresh(case)
    return case


# ── AI CHAT ───────────────────────────────────────────────────────────────────
# SECURITY: requires auth + org_id check + rate limiting + input length cap
_chat_attempts: dict = {}   # ip → [timestamps]
CHAT_RATE_LIMIT = 20        # messages per minute per IP

@router.post("/{case_id}/chat")
async def case_chat(
    case_id: int,
    data: dict,
    request: Request,
    user: User = Depends(get_current_user),   # FIXED: was missing entirely
    session: Session = Depends(get_session),
):
    # Rate limit chat to prevent Groq quota drain
    from routers.auth import _get_real_ip
    ip  = _get_real_ip(request)
    now = __import__("time").time()
    _chat_attempts[ip] = [t for t in _chat_attempts.get(ip, []) if now - t < 60]
    if len(_chat_attempts[ip]) >= CHAT_RATE_LIMIT:
        raise HTTPException(429, "Too many messages. Slow down.")
    _chat_attempts[ip].append(now)

    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:   # FIXED: org isolation
        raise HTTPException(404, "Case not found")

    # Input length cap — prevent prompt injection via long messages
    message = (data.get("message") or "").strip()[:500]
    if not message:
        raise HTTPException(400, "Message required")

    history = data.get("history", [])
    context = f"""Case {case.case_number}: {case.title}
Severity: {case.severity} | Type: {case.incident_type}
Description: {case.description[:600]}
Findings: {case.findings[:600]}
IOCs: {case.iocs[:300]}
MITRE: {case.mitre_techniques[:200]}"""
    # commands_run excluded from chat context — contains sensitive investigation steps
    prompt = f"Context:\n{context}\n\nAnalyst: {message}"
    reply = call_ai("chat", prompt, temperature=0.35, max_tokens=700,
                    history=history[-6:])
    return {"reply": reply}


# ── SHARE / CLOSE ─────────────────────────────────────────────────────────────
@router.post("/{case_id}/share")
def toggle_share(
    case_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404)
    case.is_public  = not case.is_public
    case.updated_at = datetime.utcnow()
    session.add(case)
    _audit(session, "share_toggled", "case", str(case.id),
           user.id, user.email, str(case.is_public))
    session.commit()
    return {"is_public": case.is_public, "share_token": case.share_token}


@router.post("/{case_id}/close")
def close_case(
    case_id: int,
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404)
    for field in ["final_findings", "remediation_steps", "lessons_learned"]:
        if not data.get(field):
            raise HTTPException(400, f"Missing required closure field: {field}")
    case.closure_notes = json.dumps({
        "final_findings":    data["final_findings"],
        "remediation_steps": data["remediation_steps"],
        "lessons_learned":   data["lessons_learned"],
        "evidence_complete": data.get("evidence_complete", False),
        "closed_by":         user.name,
        "closed_at":         datetime.utcnow().isoformat(),
    })
    case.status     = "closed"
    case.updated_at = datetime.utcnow()
    session.add(case)
    _audit(session, "case_closed", "case", str(case.id), user.id, user.email)
    session.commit()
    session.refresh(case)
    try:
        from routers.webhooks import fire_event
        fire_event("case_closed", {
            "case_number": case.case_number,
            "title": case.title,
            "severity": case.severity,
            "closed_by": user.name,
        })
    except Exception:
        pass
    return case


# ── EVIDENCE ──────────────────────────────────────────────────────────────────
@router.get("/{case_id}/evidence")
def list_evidence(
    case_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")
    return session.exec(
        select(EvidenceArtifact).where(EvidenceArtifact.case_id == case_id)
    ).all()


@router.post("/{case_id}/evidence")
def add_evidence(
    case_id: int, data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ev = EvidenceArtifact(
        case_id=case_id,
        artifact_type=data.get("artifact_type", "manual"),
        source_module=data.get("source_module", ""),
        raw_input=data.get("raw_input", ""),
        normalized_output=data.get("normalized_output", ""),
        extracted_iocs=json.dumps(data.get("extracted_iocs", [])),
        verdict=data.get("verdict", ""),
        ai_analysis=data.get("ai_analysis", ""),
        confidence=data.get("confidence", 0),
        evidence_score=data.get("evidence_score", "hypothesis"),
    )
    session.add(ev)
    _audit(session, "evidence_added", "evidence", str(case_id), user.id, user.email)
    session.commit()
    session.refresh(ev)
    return ev


@router.patch("/{case_id}/evidence/{ev_id}")
def update_evidence(
    case_id: int, ev_id: int, data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ev = session.get(EvidenceArtifact, ev_id)
    if not ev:
        raise HTTPException(404)
    for k, v in data.items():
        if hasattr(ev, k):
            setattr(ev, k, v)
    ev.updated_at = datetime.utcnow()
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


# ── TIMELINE ──────────────────────────────────────────────────────────────────
@router.get("/{case_id}/timeline")
def list_timeline(
    case_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")
    return session.exec(
        select(TimelineEvent)
        .where(TimelineEvent.case_id == case_id)
        .order_by(TimelineEvent.timestamp)
    ).all()


@router.post("/{case_id}/timeline")
def add_timeline(
    case_id: int, data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ts = data.get("timestamp")
    try:
        ts = datetime.fromisoformat((ts or "").replace("Z", "+00:00"))
    except Exception:
        ts = datetime.utcnow()
    ev = TimelineEvent(
        case_id=case_id, timestamp=ts,
        event_type=data.get("event_type", "action"),
        description=data.get("description", ""),
    )
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


# ── SIEM / ALERT IMPORT ───────────────────────────────────────────────────────
@router.post("/import-alert")
def import_alert(
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Import a security alert from an external SIEM (Sentinel, Splunk, generic JSON).
    Creates a new case automatically. Supports CEF fields and Sentinel schema.
    """
    # Normalise from different SIEM formats
    source = data.get("source", "generic").lower()

    if source == "sentinel":
        title       = data.get("AlertDisplayName") or data.get("title", "SIEM Alert")
        severity_raw= (data.get("Severity") or data.get("severity", "medium")).lower()
        description = data.get("Description") or data.get("description", "")
        ioc_list    = data.get("Entities", [])
        system      = data.get("CompromisedEntity") or data.get("affected_systems", "")
    elif source == "splunk":
        title       = data.get("search_name") or data.get("title", "Splunk Alert")
        severity_raw= (data.get("urgency") or data.get("severity", "medium")).lower()
        description = data.get("message") or data.get("description", "")
        ioc_list    = []
        system      = data.get("host") or data.get("affected_systems", "")
    else:
        title       = data.get("title", "Imported Alert")
        severity_raw= (data.get("severity", "medium")).lower()
        description = data.get("description", "")
        ioc_list    = data.get("iocs", [])
        system      = data.get("affected_systems", "")

    # Map severity
    sev_map = {
        "critical": "critical", "high": "high", "medium": "medium",
        "low": "low", "informational": "info", "info": "info",
        "3": "low", "4": "medium", "5": "high", "8": "critical",
    }
    severity = sev_map.get(severity_raw, "medium")

    # Build IOC list
    normalised_iocs = []
    for item in ioc_list:
        if isinstance(item, dict):
            ioc_val  = item.get("Address") or item.get("HostName") or item.get("ioc", "")
            ioc_type = item.get("Type", "ip").lower()
            if ioc_val:
                normalised_iocs.append({"ioc": ioc_val, "type": ioc_type})
        elif isinstance(item, str):
            normalised_iocs.append({"ioc": item, "type": "unknown"})

    case = Case(
        case_number=next_case_number(session),
        title=title,
        severity=severity,
        status="open",
        incident_type=data.get("incident_type", "siem_alert"),
        analyst_name=user.name,
        customer_name=data.get("customer_name", ""),
        affected_systems=system,
        description=description,
        iocs=json.dumps(normalised_iocs),
    )
    session.add(case)
    session.commit()
    session.refresh(case)

    if normalised_iocs:
        correlate_iocs(session, case.id, case.iocs)

    # Auto timeline entry
    session.add(TimelineEvent(
        case_id=case.id,
        event_type="detection",
        description=f"Alert imported from {source.upper()}: {title}",
    ))

    _audit(session, "alert_imported", "case", str(case.id),
           user.id, user.email, f"Source: {source}")
    session.commit()

    # Fire critical webhook if needed
    if severity == "critical":
        try:
            from routers.webhooks import fire_event
            fire_event("critical_case", {
                "case_number": case.case_number,
                "title": case.title, "source": source,
            })
        except Exception:
            pass

    return case


# ── IOC CORRELATION ───────────────────────────────────────────────────────────
@router.get("/correlate/all")
def correlate_all(session: Session = Depends(get_session),
                  _user: User = Depends(get_current_user)):
    return session.exec(
        select(IOCCorrelation).where(IOCCorrelation.case_count > 1)
        .order_by(IOCCorrelation.case_count.desc())
    ).all()
