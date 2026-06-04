"""
AegisTrace Provenance + Trust Timeline Router — v3.0
──────────────────────────────────────────────────────
Every AI-generated and tool-generated action is logged here.
Trust events record the chain of identity actions per case.

GET  /api/provenance/case/{case_id}
POST /api/provenance/
GET  /api/trust/events
POST /api/trust/events
GET  /api/trust/events/case/{case_id}
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from models import ProvenanceLedger, TrustEvent, User, AuditLog
from database import get_session
from routers.auth import get_current_user

router = APIRouter(tags=["provenance"])


# ── Provenance Ledger ─────────────────────────────────────────────────────────

@router.get("/api/provenance/case/{case_id}")
def get_provenance_for_case(
    case_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    records = session.exec(
        select(ProvenanceLedger)
        .where(ProvenanceLedger.case_id == case_id)
        .order_by(ProvenanceLedger.timestamp.desc())
    ).all()
    return records


@router.get("/api/provenance/")
def list_provenance(
    action_type: Optional[str] = Query(None),
    limit: int = Query(50),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    q = select(ProvenanceLedger).order_by(ProvenanceLedger.timestamp.desc()).limit(limit)
    if action_type:
        q = q.where(ProvenanceLedger.action_type == action_type)
    return session.exec(q).all()


@router.post("/api/provenance/")
def log_provenance(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    record = ProvenanceLedger(
        case_id=data.get("case_id"),
        action_type=data.get("action_type", "manual"),
        actor=data.get("actor") or user.email,
        model_used=data.get("model_used"),
        tool_name=data.get("tool_name"),
        input_context=data.get("input_context", ""),
        output_summary=data.get("output_summary", ""),
        confidence=data.get("confidence", 0),
        approval_status=data.get("approval_status", "auto"),
        approved_by=data.get("approved_by"),
        linked_evidence_id=data.get("linked_evidence_id"),
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.patch("/api/provenance/{record_id}/approve")
def approve_action(
    record_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    record = session.get(ProvenanceLedger, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    record.approval_status = "approved" if data.get("approved", True) else "rejected"
    record.approved_by = user.email
    session.add(record)
    session.add(AuditLog(
        action=f"provenance_{record.approval_status}",
        entity_type="provenance",
        entity_id=str(record_id),
        user_id=user.id,
        user_email=user.email,
    ))
    session.commit()
    session.refresh(record)
    return record


# ── Trust Timeline ────────────────────────────────────────────────────────────

@router.get("/api/trust/events")
def list_trust_events(
    limit: int = Query(50),
    event_category: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    q = select(TrustEvent).order_by(TrustEvent.timestamp.desc()).limit(limit)
    if event_category:
        q = q.where(TrustEvent.event_category == event_category)
    return session.exec(q).all()


@router.get("/api/trust/events/case/{case_id}")
def get_trust_events_for_case(
    case_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    events = session.exec(
        select(TrustEvent)
        .where(TrustEvent.case_id == case_id)
        .order_by(TrustEvent.timestamp.asc())
    ).all()
    return events


@router.post("/api/trust/events")
def create_trust_event(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    event = TrustEvent(
        case_id=data.get("case_id"),
        event_category=data.get("event_category", "action"),
        actor=data.get("actor") or user.email,
        actor_type=data.get("actor_type", "human"),
        description=data.get("description", ""),
        trust_level=data.get("trust_level", "verified"),
        evidence_ref=data.get("evidence_ref"),
        timestamp=datetime.fromisoformat(data["timestamp"]) if data.get("timestamp") else datetime.utcnow(),
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event
