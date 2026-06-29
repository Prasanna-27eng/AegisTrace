"""
AegisTrace Response Tiers Router
─────────────────────────────────
Manages the human-in-the-loop approval queue for D3FEND recommendations
with tier-based ordering and audit logging.

Tier order (most urgent first):
  1. human-required — must have explicit human approval
  2. auto-veto      — auto-blocked unless analyst overrides
  3. auto-safe      — executes automatically unless vetoed
  4. recommend      — suggested but not automated
  5. observe        — informational only

GET  /api/response-tiers/pending        — all pending recommendations across open cases
POST /api/response-tiers/execute/{id}  — mark as executed + audit log
POST /api/response-tiers/veto/{id}     — mark as vetoed + audit log
"""
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import DefenseRecommendation, Case, AuditLog, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/response-tiers", tags=["response-tiers"])

TIER_ORDER = {
    "human-required": 0,
    "auto-veto":       1,
    "auto-safe":       2,
    "recommend":       3,
    "observe":         4,
}


@router.get("/pending")
def list_pending(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List all pending DefenseRecommendations across open cases.
    Ordered by tier: human-required → auto-veto → auto-safe → recommend → observe.
    """
    # Get open case IDs for this org
    open_cases = db.exec(
        select(Case.id).where(
            Case.org_id == current_user.org_id,
            Case.status != "closed",
        )
    ).all()
    open_case_ids = [r for r in open_cases]

    if not open_case_ids:
        return []

    recs = db.exec(
        select(DefenseRecommendation).where(
            DefenseRecommendation.case_id.in_(open_case_ids),
            DefenseRecommendation.status == "pending",
        )
    ).all()

    # Enrich with case info
    case_map = {}
    for case_id in open_case_ids:
        c = db.get(Case, case_id)
        if c:
            case_map[case_id] = c

    result = []
    for r in recs:
        case = case_map.get(r.case_id)
        result.append({
            "id": r.id,
            "case_id": r.case_id,
            "case_number": case.case_number if case else None,
            "case_title": case.title if case else None,
            "case_severity": case.severity if case else None,
            "technique_id": r.technique_id,
            "technique_name": r.technique_name,
            "d3fend_id": r.d3fend_id,
            "countermeasure_name": r.countermeasure_name,
            "description": r.description,
            "tier": r.tier,
            "blast_radius": r.blast_radius,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # Sort by tier order
    result.sort(key=lambda x: TIER_ORDER.get(x["tier"], 99))
    return result


@router.post("/execute/{rec_id}")
def execute_recommendation(
    rec_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a recommendation as executed and create an audit log entry."""
    rec = db.get(DefenseRecommendation, rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

    # Check org access via case
    case = db.get(Case, rec.case_id)
    if not case or case.org_id != current_user.org_id:
        raise HTTPException(403, "Access denied")

    rec.status = "executed"
    db.add(rec)
    db.add(AuditLog(
        action="defense_rec_executed",
        entity_type="defense_recommendation",
        entity_id=str(rec_id),
        user_id=current_user.id,
        user_email=current_user.email,
        new_value=json.dumps({
            "technique_id": rec.technique_id,
            "d3fend_id": rec.d3fend_id,
            "countermeasure": rec.countermeasure_name,
            "tier": rec.tier,
            "case_id": rec.case_id,
        }),
    ))
    db.commit()
    db.refresh(rec)
    return {
        "id": rec.id,
        "status": rec.status,
        "message": f"Countermeasure '{rec.countermeasure_name}' marked as executed",
    }


@router.post("/veto/{rec_id}")
def veto_recommendation(
    rec_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Veto a recommendation and create an audit log entry."""
    rec = db.get(DefenseRecommendation, rec_id)
    if not rec:
        raise HTTPException(404, "Recommendation not found")

    case = db.get(Case, rec.case_id)
    if not case or case.org_id != current_user.org_id:
        raise HTTPException(403, "Access denied")

    rec.status = "vetoed"
    db.add(rec)
    db.add(AuditLog(
        action="defense_rec_vetoed",
        entity_type="defense_recommendation",
        entity_id=str(rec_id),
        user_id=current_user.id,
        user_email=current_user.email,
        new_value=json.dumps({
            "technique_id": rec.technique_id,
            "d3fend_id": rec.d3fend_id,
            "countermeasure": rec.countermeasure_name,
            "tier": rec.tier,
            "case_id": rec.case_id,
        }),
    ))
    db.commit()
    db.refresh(rec)
    return {
        "id": rec.id,
        "status": rec.status,
        "message": f"Countermeasure '{rec.countermeasure_name}' vetoed",
    }
