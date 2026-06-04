"""
AegisTrace v4.0 — Policy Enforcement Router
──────────────────────────────────────────────
Defensive SOC policy engine: validate whether an action is permitted for
a given identity node, and provide CRUD for policy definitions.

GET    /api/policies
POST   /api/policies
PATCH  /api/policies/{id}
DELETE /api/policies/{id}
POST   /api/policies/validate
"""
import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from models import Policy, IdentityNode, User, AuditLog
from database import get_session
from routers.auth import get_current_user

router = APIRouter(prefix="/api/policies", tags=["policies"])


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("")
def list_policies(
    active_only: bool = Query(True),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    q = select(Policy)
    if active_only:
        q = q.where(Policy.is_active == True)   # noqa: E712
    return session.exec(q.order_by(Policy.created_at.desc())).all()


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("")
def create_policy(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    policy = Policy(
        name=data.get("name", "Unnamed Policy"),
        description=data.get("description"),
        identity_type=data.get("identity_type"),
        role=data.get("role"),
        allowed_actions=json.dumps(data.get("allowed_actions") or []),
        denied_actions=json.dumps(data.get("denied_actions") or []),
        allowed_ips=json.dumps(data.get("allowed_ips") or []),
        allowed_hours_start=data.get("allowed_hours_start"),
        allowed_hours_end=data.get("allowed_hours_end"),
        is_active=data.get("is_active", True),
    )
    session.add(policy)
    session.add(AuditLog(
        action="policy_created", entity_type="policy",
        new_value=data.get("name", ""), user_id=user.id, user_email=user.email,
    ))
    session.commit()
    session.refresh(policy)
    return policy


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{policy_id}")
def update_policy(
    policy_id: int,
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    policy = session.get(Policy, policy_id)
    if not policy:
        raise HTTPException(404, "Policy not found")
    for field in ("name", "description", "identity_type", "role",
                  "allowed_hours_start", "allowed_hours_end"):
        if field in data:
            setattr(policy, field, data[field])
    for json_field in ("allowed_actions", "denied_actions", "allowed_ips"):
        if json_field in data:
            setattr(policy, json_field, json.dumps(data[json_field]))
    if "is_active" in data:
        policy.is_active = data["is_active"]
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{policy_id}")
def delete_policy(
    policy_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    policy = session.get(Policy, policy_id)
    if not policy:
        raise HTTPException(404, "Policy not found")
    session.delete(policy)
    session.commit()
    return {"ok": True}


# ── Validate ──────────────────────────────────────────────────────────────────

@router.post("/validate")
def validate_action(
    data: dict,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """
    Check whether an action is permitted for an identity node.

    Request body:
        node_id:    int          — IdentityNode to check
        action:     str          — action being attempted (e.g. "delete", "read")
        ip_address: str|null     — caller IP, or null to skip IP check

    Response:
        {
          "allowed":          bool,
          "violations":       [{policy, type, reason}],
          "node_risk_score":  int
        }
    """
    node_id    = data.get("node_id")
    action     = data.get("action", "")
    ip_address = data.get("ip_address")

    node = session.get(IdentityNode, node_id) if node_id else None

    # Fetch active policies, scoped to node type / role if available
    policies = session.exec(
        select(Policy).where(Policy.is_active == True)   # noqa: E712
    ).all()

    if node:
        policies = [
            p for p in policies
            if (p.identity_type is None or p.identity_type == node.node_type)
        ]

    violations = []
    now = datetime.now(timezone.utc)

    for p in policies:
        denied   = json.loads(p.denied_actions or "[]")
        allowed  = json.loads(p.allowed_actions or "[]")
        ips      = json.loads(p.allowed_ips or "[]")

        if action and denied and action in denied:
            violations.append({
                "policy": p.name,
                "type":   "denied_action",
                "reason": f"'{action}' is explicitly denied by policy '{p.name}'",
            })

        if action and allowed and action not in allowed:
            violations.append({
                "policy": p.name,
                "type":   "unauthorized_action",
                "reason": f"'{action}' is not in the allowed list for policy '{p.name}'",
            })

        if ip_address and ips and ip_address not in ips:
            violations.append({
                "policy": p.name,
                "type":   "unauthorized_ip",
                "reason": f"IP '{ip_address}' not in allowed list for policy '{p.name}'",
            })

        if p.allowed_hours_start and p.allowed_hours_end:
            h, m = now.hour, now.minute
            current = h * 60 + m
            sh, sm  = map(int, p.allowed_hours_start.split(":"))
            eh, em  = map(int, p.allowed_hours_end.split(":"))
            if not (sh * 60 + sm <= current <= eh * 60 + em):
                violations.append({
                    "policy": p.name,
                    "type":   "outside_time_window",
                    "reason": (
                        f"Action attempted at {now.strftime('%H:%M')} UTC "
                        f"outside allowed window {p.allowed_hours_start}–{p.allowed_hours_end}"
                    ),
                })

    return {
        "allowed":         len(violations) == 0,
        "violations":      violations,
        "node_risk_score": node.risk_score if node else None,
    }
