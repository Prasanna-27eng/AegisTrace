"""
AegisTrace — AI Agent Security Router  v4.2
─────────────────────────────────────────────
Human approval queue for all AI-generated actions.
Every AI action is logged to ProvenanceLedger with approval_status='pending'.
Analysts Accept or Reject from this queue before the action executes.

GET  /api/agent-security/actions          — list all actions (filter by status)
GET  /api/agent-security/stats            — counts by approval_status
PATCH /api/agent-security/actions/{id}/approve  — approve an action
PATCH /api/agent-security/actions/{id}/reject   — reject with reason
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from models import ProvenanceLedger, User, AuditLog
from database import get_session
from routers.auth import get_current_user

router = APIRouter(tags=["agent-security"])


@router.get("/api/agent-security/actions")
def list_agent_actions(
    status: Optional[str] = Query(None),  # pending | approved | rejected | auto
    limit: int = Query(100),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """List all AI agent actions from the Provenance Ledger."""
    q = select(ProvenanceLedger).order_by(ProvenanceLedger.timestamp.desc()).limit(limit)
    if status:
        q = q.where(ProvenanceLedger.approval_status == status)
    records = session.exec(q).all()
    return records


@router.get("/api/agent-security/stats")
def agent_security_stats(
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """Counts of actions by approval status."""
    all_records = session.exec(select(ProvenanceLedger)).all()
    return {
        "pending":  sum(1 for r in all_records if r.approval_status == "pending"),
        "approved": sum(1 for r in all_records if r.approval_status == "approved"),
        "rejected": sum(1 for r in all_records if r.approval_status == "rejected"),
        "auto":     sum(1 for r in all_records if r.approval_status == "auto"),
        "total":    len(all_records),
    }


@router.patch("/api/agent-security/actions/{action_id}/approve")
def approve_action(
    action_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Approve a pending AI action."""
    record = session.get(ProvenanceLedger, action_id)
    if not record:
        raise HTTPException(status_code=404, detail="Action not found")
    if record.approval_status not in ("pending", "auto"):
        raise HTTPException(status_code=400, detail=f"Action is already {record.approval_status}")

    record.approval_status = "approved"
    record.approved_by = user.name or user.email
    session.add(record)

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action="agent_action_approved",
        resource_type="provenance_ledger",
        resource_id=action_id,
        details=f"Approved AI action: {record.action_type} (model: {record.model_used})",
        ip_address="internal",
    )
    session.add(audit)
    session.commit()
    session.refresh(record)
    return record


@router.patch("/api/agent-security/actions/{action_id}/reject")
def reject_action(
    action_id: int,
    data: dict = None,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Reject a pending AI action with an optional reason."""
    record = session.get(ProvenanceLedger, action_id)
    if not record:
        raise HTTPException(status_code=404, detail="Action not found")
    if record.approval_status not in ("pending", "auto"):
        raise HTTPException(status_code=400, detail=f"Action is already {record.approval_status}")

    reason = (data or {}).get("reason", "")
    record.approval_status = "rejected"
    record.approved_by = user.name or user.email
    # Store rejection reason in reasoning field if it exists
    if reason and hasattr(record, "reasoning"):
        record.reasoning = f"[REJECTED] {reason}\n\n{record.reasoning or ''}"
    session.add(record)

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action="agent_action_rejected",
        resource_type="provenance_ledger",
        resource_id=action_id,
        details=f"Rejected AI action: {record.action_type}. Reason: {reason or 'No reason given'}",
        ip_address="internal",
    )
    session.add(audit)
    session.commit()
    session.refresh(record)
    return record
