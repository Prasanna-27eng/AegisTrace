import json
import os
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, or_
from models import Case, EvidenceArtifact, TimelineEvent, IOCCorrelation, AuditLog
from database import get_session
from groq import Groq

router = APIRouter(prefix="/api/cases", tags=["cases"])


def audit(session: Session, action: str, entity_type: str, entity_id: str, new_value: str = ""):
    log = AuditLog(action=action, entity_type=entity_type, entity_id=entity_id, new_value=new_value)
    session.add(log)


def next_case_number(session: Session) -> str:
    cases = session.exec(select(Case).order_by(Case.id.desc())).all()
    year = datetime.utcnow().year
    num = len(cases) + 1
    return f"SOC-{year}-{num:04d}"


def correlate_iocs(session: Session, case_id: int, iocs_raw: str):
    try:
        iocs = json.loads(iocs_raw or "[]")
    except Exception:
        return
    for item in iocs:
        ioc_val = item.get("ioc", "")
        ioc_type = item.get("type", "")
        if not ioc_val:
            continue
        existing = session.exec(select(IOCCorrelation).where(IOCCorrelation.ioc == ioc_val)).first()
        if existing:
            ids = json.loads(existing.case_ids or "[]")
            if case_id not in ids:
                ids.append(case_id)
                existing.case_ids = json.dumps(ids)
                existing.case_count = len(ids)
                existing.last_seen = datetime.utcnow()
                session.add(existing)
        else:
            corr = IOCCorrelation(ioc=ioc_val, ioc_type=ioc_type,
                                  case_ids=json.dumps([case_id]), case_count=1)
            session.add(corr)


# ── LIST / CREATE ───────────────────────────────────────────────────────────
@router.get("")
def list_cases(
    q: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    incident_type: Optional[str] = Query(None),
    sort: str = Query("newest"),
    session: Session = Depends(get_session),
):
    query = select(Case)
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
        ))
    if sort == "severity":
        order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        cases = session.exec(query).all()
        cases.sort(key=lambda c: order.get(c.severity, 5))
        return cases
    query = query.order_by(Case.created_at.desc())
    return session.exec(query).all()


@router.post("")
def create_case(data: dict, session: Session = Depends(get_session)):
    case = Case(
        case_number=next_case_number(session),
        title=data.get("title", "Untitled Case"),
        severity=data.get("severity", "medium"),
        status="open",
        incident_type=data.get("incident_type", ""),
        analyst_name=data.get("analyst_name", ""),
        customer_name=data.get("customer_name", ""),
        affected_systems=data.get("affected_systems", ""),
        classification=data.get("classification", "internal"),
        description=data.get("description", ""),
    )
    session.add(case)
    session.commit()
    session.refresh(case)
    audit(session, "case_created", "case", str(case.id), case.title)
    session.commit()
    return case


# ── GET / UPDATE / DELETE ───────────────────────────────────────────────────
@router.get("/{case_id}")
def get_case(case_id: int, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    return case


@router.patch("/{case_id}")
def update_case(case_id: int, data: dict, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    allowed = ["title", "severity", "status", "incident_type", "affected_systems",
               "analyst_name", "customer_name", "classification", "description",
               "commands_run", "findings", "recommendations", "iocs", "timeline_events",
               "mitre_techniques", "is_public", "shift_handoff", "ai_executive_summary",
               "ai_technical_summary", "ai_severity_score", "ai_severity_reasoning",
               "vt_results", "closure_notes", "tools_output"]
    for k, v in data.items():
        if k in allowed:
            setattr(case, k, v if not isinstance(v, (dict, list)) else json.dumps(v))
    case.updated_at = datetime.utcnow()
    if "iocs" in data:
        correlate_iocs(session, case_id, case.iocs)
    session.add(case)
    session.commit()
    session.refresh(case)
    audit(session, "case_updated", "case", str(case.id))
    session.commit()
    return case


@router.delete("/{case_id}")
def delete_case(case_id: int, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    audit(session, "case_deleted", "case", str(case.id), case.title)
    session.delete(case)
    session.commit()
    return {"ok": True}


# ── GENERATE AI ─────────────────────────────────────────────────────────────
@router.post("/{case_id}/generate-ai")
async def generate_ai(case_id: int, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(503, "GROQ_API_KEY not configured")

    client = Groq(api_key=groq_key)

    iocs = json.loads(case.iocs or "[]")
    mitre = json.loads(case.mitre_techniques or "[]")

    prompt = f"""You are a senior SOC analyst. Analyse this security incident and produce structured output.

Case: {case.case_number}
Title: {case.title}
Severity: {case.severity}
Type: {case.incident_type}
Affected Systems: {case.affected_systems}
Description: {case.description}
Findings: {case.findings}
Commands Run: {case.commands_run[:2000] if case.commands_run else 'None'}
IOCs: {json.dumps(iocs[:10])}
MITRE Techniques: {json.dumps(mitre)}

Respond ONLY with valid JSON in this exact structure:
{{
  "executive_summary": "2-3 sentences for non-technical leadership",
  "technical_summary": "Detailed technical analysis for analysts, 4-6 sentences",
  "severity_score": <integer 0-100>,
  "severity_reasoning": "Why this score was assigned",
  "mitre_techniques": [{{"id": "T####", "name": "...", "tactic": "..."}}],
  "recommended_actions": ["action 1", "action 2", "action 3"]
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1500,
    )

    raw = response.choices[0].message.content.strip()
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
    except Exception:
        result = {"executive_summary": raw, "technical_summary": "", "severity_score": 50, "severity_reasoning": "", "mitre_techniques": [], "recommended_actions": []}

    case.ai_executive_summary = result.get("executive_summary", "")
    case.ai_technical_summary = result.get("technical_summary", "")
    case.ai_severity_score = result.get("severity_score", 50)
    case.ai_severity_reasoning = result.get("severity_reasoning", "")
    if result.get("mitre_techniques"):
        case.mitre_techniques = json.dumps(result["mitre_techniques"])
    case.updated_at = datetime.utcnow()
    session.add(case)
    session.commit()
    session.refresh(case)
    audit(session, "ai_generated", "case", str(case.id))
    session.commit()
    return case


# ── AI CHAT ─────────────────────────────────────────────────────────────────
@router.post("/{case_id}/chat")
async def case_chat(case_id: int, data: dict, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(503, "GROQ_API_KEY not configured")

    user_message = data.get("message", "")
    history = data.get("history", [])

    client = Groq(api_key=groq_key)
    system = f"""You are AegisTrace AI, a SOC analyst assistant scoped to case {case.case_number}.
Answer ONLY based on the case evidence provided. Cite evidence when possible. Never make up facts.
Do not write to the case without analyst approval.

Case Evidence:
Title: {case.title}
Severity: {case.severity} | Type: {case.incident_type}
Description: {case.description[:1000]}
Findings: {case.findings[:1000]}
IOCs: {case.iocs[:500]}
MITRE: {case.mitre_techniques[:300]}
Commands Run: {case.commands_run[:800]}"""

    messages = [{"role": "system", "content": system}]
    for h in history[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.4,
        max_tokens=800,
    )
    return {"reply": response.choices[0].message.content.strip()}


# ── SHARE / PUBLIC ───────────────────────────────────────────────────────────
@router.post("/{case_id}/share")
def toggle_share(case_id: int, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    case.is_public = not case.is_public
    case.updated_at = datetime.utcnow()
    session.add(case)
    session.commit()
    session.refresh(case)
    audit(session, "share_toggled", "case", str(case.id), str(case.is_public))
    session.commit()
    return {"is_public": case.is_public, "share_token": case.share_token}


# ── CLOSE ────────────────────────────────────────────────────────────────────
@router.post("/{case_id}/close")
def close_case(case_id: int, data: dict, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    required = ["final_findings", "remediation_steps", "lessons_learned"]
    for field in required:
        if not data.get(field):
            raise HTTPException(400, f"Missing required closure field: {field}")

    closure = {
        "final_findings": data["final_findings"],
        "remediation_steps": data["remediation_steps"],
        "lessons_learned": data["lessons_learned"],
        "evidence_complete": data.get("evidence_complete", False),
        "closed_by": data.get("closed_by", "analyst"),
        "closed_at": datetime.utcnow().isoformat(),
    }
    case.closure_notes = json.dumps(closure)
    case.status = "closed"
    case.updated_at = datetime.utcnow()
    session.add(case)
    session.commit()
    session.refresh(case)
    audit(session, "case_closed", "case", str(case.id))
    session.commit()
    return case


# ── EVIDENCE ─────────────────────────────────────────────────────────────────
@router.get("/{case_id}/evidence")
def list_evidence(case_id: int, session: Session = Depends(get_session)):
    return session.exec(select(EvidenceArtifact).where(EvidenceArtifact.case_id == case_id)).all()


@router.post("/{case_id}/evidence")
def add_evidence(case_id: int, data: dict, session: Session = Depends(get_session)):
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
    session.commit()
    session.refresh(ev)
    return ev


@router.patch("/{case_id}/evidence/{ev_id}")
def update_evidence(case_id: int, ev_id: int, data: dict, session: Session = Depends(get_session)):
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


# ── TIMELINE ─────────────────────────────────────────────────────────────────
@router.get("/{case_id}/timeline")
def list_timeline(case_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(TimelineEvent).where(TimelineEvent.case_id == case_id).order_by(TimelineEvent.timestamp)
    ).all()


@router.post("/{case_id}/timeline")
def add_timeline_event(case_id: int, data: dict, session: Session = Depends(get_session)):
    ts = data.get("timestamp")
    if ts:
        try:
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            ts = datetime.utcnow()
    else:
        ts = datetime.utcnow()
    ev = TimelineEvent(
        case_id=case_id,
        timestamp=ts,
        event_type=data.get("event_type", "action"),
        description=data.get("description", ""),
    )
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


# ── IOC CORRELATION ──────────────────────────────────────────────────────────
@router.get("/correlate/all")
def correlate_all(session: Session = Depends(get_session)):
    return session.exec(select(IOCCorrelation).where(IOCCorrelation.case_count > 1)).all()
