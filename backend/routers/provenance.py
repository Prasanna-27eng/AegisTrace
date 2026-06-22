"""
AegisTrace Provenance + Trust Timeline Router — v3.1
──────────────────────────────────────────────────────
Every AI-generated and tool-generated action is logged here.
Trust events record the chain of identity actions per case.

GET  /api/provenance/case/{case_id}
POST /api/provenance/
GET  /api/provenance/verify
GET  /api/provenance/certificate/{case_id}
GET  /api/trust/events
POST /api/trust/events
GET  /api/trust/events/case/{case_id}
"""
import hashlib
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy import or_ as _or
from models import ProvenanceLedger, TrustEvent, User, AuditLog, Case
from database import get_session
from routers.auth import get_current_user

router = APIRouter(tags=["provenance"])

# Enum fields that drive approval-workflow / compliance reporting logic —
# reject unrecognized values rather than trusting the raw request body.
_VALID_APPROVAL_STATUSES = {"auto", "pending", "approved", "rejected"}
_VALID_ACTOR_TYPES  = {"human", "ai", "agent", "system"}
_VALID_TRUST_LEVELS = {"verified", "unverified", "suspicious", "revoked"}


def _org_case_ids(session: Session, user: User) -> set:
    """Case IDs visible to the caller's org."""
    return set(session.exec(select(Case.id).where(Case.org_id == user.org_id)).all())


# ── v10.3 Hash Chain Helpers ──────────────────────────────────────────────────

def _compute_entry_hash(entry: ProvenanceLedger) -> str:
    """SHA-256 of key fields + prev_hash. Deterministic, tamper-evident."""
    payload = "|".join([
        str(entry.action_type or ""),
        str(entry.actor or ""),
        str(entry.timestamp.isoformat() if entry.timestamp else ""),
        str(entry.output_summary or "")[:500],  # cap to prevent giant strings
        str(entry.prev_hash or "GENESIS"),
    ])
    return hashlib.sha256(payload.encode()).hexdigest()


def _get_chain_tail(session: Session, case_id: Optional[int], org_id: int) -> str:
    """Get the entry_hash of the most recent ProvenanceLedger entry for this case/org."""
    if case_id:
        last = session.exec(
            select(ProvenanceLedger)
            .where(ProvenanceLedger.case_id == case_id)
            .order_by(ProvenanceLedger.timestamp.desc())
        ).first()
    else:
        last = None
    return last.entry_hash if (last and last.entry_hash) else "GENESIS"


# ── Provenance Ledger ─────────────────────────────────────────────────────────

@router.get("/api/provenance/case/{case_id}")
def get_provenance_for_case(
    case_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != _user.org_id:
        raise HTTPException(404, "Case not found")
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
    org_case_ids = _org_case_ids(session, _user)
    q = (
        select(ProvenanceLedger)
        .where(_or(ProvenanceLedger.case_id == None, ProvenanceLedger.case_id.in_(org_case_ids)))  # noqa: E711
        .order_by(ProvenanceLedger.timestamp.desc())
        .limit(limit)
    )
    if action_type:
        q = q.where(ProvenanceLedger.action_type == action_type)
    return session.exec(q).all()


@router.get("/api/provenance/verify")
def verify_provenance_chain(
    case_id: Optional[int] = Query(default=None),
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Walk the ProvenanceLedger hash chain for a case (or all entries if no case_id).
    Returns: { valid: bool, entries_checked: int, broken_at: id|null, first_entry: id|null }
    Chain is valid if every entry_hash matches recomputed SHA-256 of its fields.
    Entries with empty entry_hash (created before v10.3) are skipped with a note.
    """
    org_case_ids = _org_case_ids(session, _user)

    if case_id:
        case = session.get(Case, case_id)
        if not case or case.org_id != _user.org_id:
            raise HTTPException(404)
        entries = session.exec(
            select(ProvenanceLedger)
            .where(ProvenanceLedger.case_id == case_id)
            .order_by(ProvenanceLedger.timestamp.asc())
        ).all()
    else:
        entries = session.exec(
            select(ProvenanceLedger)
            .where(_or(ProvenanceLedger.case_id == None, ProvenanceLedger.case_id.in_(org_case_ids)))  # noqa: E711
            .order_by(ProvenanceLedger.timestamp.asc())
        ).all()

    checked = 0
    legacy_skipped = 0
    for entry in entries:
        if not entry.entry_hash:
            legacy_skipped += 1
            continue  # pre-chain entry, skip
        recomputed = _compute_entry_hash(entry)
        if recomputed != entry.entry_hash:
            return {
                "valid": False,
                "entries_checked": checked,
                "legacy_skipped": legacy_skipped,
                "broken_at": entry.id,
                "broken_at_timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
                "message": "Chain integrity violation detected",
            }
        checked += 1

    return {
        "valid": True,
        "entries_checked": checked,
        "legacy_skipped": legacy_skipped,
        "broken_at": None,
        "message": f"Chain verified: {checked} entries intact" + (f", {legacy_skipped} pre-v10.3 entries skipped" if legacy_skipped else ""),
    }


@router.get("/api/provenance/certificate/{case_id}")
def export_trust_certificate(
    case_id: int,
    fmt: str = Query(default="json"),  # json | summary
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Export a cryptographically-backed Trust Certificate for a case.
    Includes: case metadata, chain verification result, all provenance entries with hashes.
    Suitable for regulatory submission (DORA Article 19, DPDPA).
    """
    case = session.get(Case, case_id)
    if not case or case.org_id != _user.org_id:
        raise HTTPException(404)

    entries = session.exec(
        select(ProvenanceLedger)
        .where(ProvenanceLedger.case_id == case_id)
        .order_by(ProvenanceLedger.timestamp.asc())
    ).all()

    # Verify chain
    chain_valid = True
    broken_at = None
    for entry in entries:
        if not entry.entry_hash:
            continue
        if _compute_entry_hash(entry) != entry.entry_hash:
            chain_valid = False
            broken_at = entry.id
            break

    # Build certificate fingerprint (hash of all entry_hashes in order)
    chain_fingerprint = hashlib.sha256(
        "|".join(e.entry_hash for e in entries if e.entry_hash).encode()
    ).hexdigest()

    certificate = {
        "certificate_type": "AegisTrace Trust Certificate",
        "certificate_version": "1.0",
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": _user.name or _user.email,
        "case": {
            "id": case.id,
            "case_number": case.case_number,
            "title": case.title,
            "severity": case.severity,
            "status": case.status,
            "created_at": case.created_at.isoformat() if case.created_at else None,
        },
        "chain_integrity": {
            "valid": chain_valid,
            "broken_at_entry": broken_at,
            "entries_in_chain": len([e for e in entries if e.entry_hash]),
            "legacy_entries": len([e for e in entries if not e.entry_hash]),
            "chain_fingerprint": chain_fingerprint,
            "algorithm": "SHA-256",
        },
        "provenance_entries": [
            {
                "id": e.id,
                "action_type": e.action_type,
                "actor": e.actor,
                "model_used": e.model_used,
                "confidence": e.confidence,
                "approval_status": e.approval_status,
                "approved_by": e.approved_by,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "prev_hash": e.prev_hash,
                "entry_hash": e.entry_hash,
                "output_summary": (e.output_summary or "")[:300],
            }
            for e in entries
        ],
        "regulatory_note": "This certificate provides cryptographic proof of AI decision integrity for regulatory review. Chain fingerprint uniquely identifies this case's decision history.",
    }
    return certificate


@router.post("/api/provenance/")
def log_provenance(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    case_id = data.get("case_id")
    if case_id is not None:
        case = session.get(Case, case_id)
        if not case or case.org_id != user.org_id:
            raise HTTPException(404, "Case not found")
    approval_status = data.get("approval_status", "auto")
    if approval_status not in _VALID_APPROVAL_STATUSES:
        raise HTTPException(400, f"Invalid approval_status. Must be one of: {sorted(_VALID_APPROVAL_STATUSES)}")
    record = ProvenanceLedger(
        case_id=case_id,
        action_type=data.get("action_type", "manual"),
        actor=data.get("actor") or user.email,
        model_used=data.get("model_used"),
        tool_name=data.get("tool_name"),
        input_context=data.get("input_context", ""),
        output_summary=data.get("output_summary", ""),
        confidence=data.get("confidence", 0),
        approval_status=approval_status,
        approved_by=data.get("approved_by"),
        linked_evidence_id=data.get("linked_evidence_id"),
    )
    # ── v10.3: stamp hash chain before persisting ──────────────────────────
    record.prev_hash = _get_chain_tail(session, record.case_id, user.org_id)
    record.entry_hash = _compute_entry_hash(record)
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
    if record.case_id is not None:
        case = session.get(Case, record.case_id)
        if not case or case.org_id != user.org_id:
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
    org_case_ids = _org_case_ids(session, _user)
    q = (
        select(TrustEvent)
        .where(_or(TrustEvent.case_id == None, TrustEvent.case_id.in_(org_case_ids)))  # noqa: E711
        .order_by(TrustEvent.timestamp.desc())
        .limit(limit)
    )
    if event_category:
        q = q.where(TrustEvent.event_category == event_category)
    return session.exec(q).all()


@router.get("/api/trust/events/case/{case_id}")
def get_trust_events_for_case(
    case_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != _user.org_id:
        raise HTTPException(404, "Case not found")
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
    case_id = data.get("case_id")
    if case_id is not None:
        case = session.get(Case, case_id)
        if not case or case.org_id != user.org_id:
            raise HTTPException(404, "Case not found")
    actor_type  = data.get("actor_type", "human")
    trust_level = data.get("trust_level", "verified")
    if actor_type not in _VALID_ACTOR_TYPES:
        raise HTTPException(400, f"Invalid actor_type. Must be one of: {sorted(_VALID_ACTOR_TYPES)}")
    if trust_level not in _VALID_TRUST_LEVELS:
        raise HTTPException(400, f"Invalid trust_level. Must be one of: {sorted(_VALID_TRUST_LEVELS)}")
    event = TrustEvent(
        case_id=case_id,
        event_category=data.get("event_category", "action"),
        actor=data.get("actor") or user.email,
        actor_type=actor_type,
        description=data.get("description", ""),
        trust_level=trust_level,
        evidence_ref=data.get("evidence_ref"),
        timestamp=datetime.fromisoformat(data["timestamp"]) if data.get("timestamp") else datetime.utcnow(),
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event
