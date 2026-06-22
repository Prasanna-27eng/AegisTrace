"""
AegisTrace — Agent Delegation Token Router  v10.5
───────────────────────────────────────────────────
Implements Agent Identity Attestation from the ATSP standard.

A delegation token is a signed pre-authorization credential that records:
  who authorized (human email + user_id)
  which agent (agent_name + agent_type)
  what it can do (capabilities list)
  for how long (not_before / not_after)
  with what constraints (scope_constraints JSON)

Every AI action should reference the active delegation token for its agent.
The token's HMAC signature proves it was issued by the platform, not fabricated.

GET    /api/delegation-tokens           — list all tokens for the org
POST   /api/delegation-tokens           — issue a new delegation token
GET    /api/delegation-tokens/{id}      — get a single token
POST   /api/delegation-tokens/{id}/revoke  — revoke a token
GET    /api/delegation-tokens/{id}/verify  — verify the token signature
GET    /api/delegation-tokens/active/{agent_name}  — get active token for an agent
"""
import hashlib
import hmac as _hmac
import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session
from models import AgentDelegationToken, User, AuditLog
from routers.auth import get_current_user, _audit

router = APIRouter(tags=["delegation"])

# ── Signature helpers ─────────────────────────────────────────────────────────

def _sign_token(token: AgentDelegationToken) -> str:
    """
    HMAC-SHA256 over the key fields of a delegation token.
    Uses JWT_SECRET so only the server can issue valid tokens.
    """
    secret = os.getenv("JWT_SECRET", "aegistrace-dev-secret")
    payload = "|".join([
        str(token.org_id),
        str(token.token_id),
        str(token.agent_name),
        str(token.authorized_by),
        str(token.not_after.isoformat()),
        str(token.capabilities),
    ])
    return _hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def _verify_signature(token: AgentDelegationToken) -> bool:
    expected = _sign_token(token)
    return _hmac.compare_digest(expected, token.signature or "")


# ── Standard capability definitions ──────────────────────────────────────────

DEFINED_CAPABILITIES = [
    "read_cases",           # read case data
    "enrich_ioc",           # query enrichment APIs for IOCs
    "add_case_comment",     # append analysis notes to a case
    "triage_alert",         # classify and prioritise incoming alerts
    "generate_report",      # draft incident reports
    "close_case",           # mark a case as closed (requires human approval by default)
    "isolate_endpoint",     # trigger endpoint isolation (always requires approval)
    "query_identity_graph", # read identity graph nodes and edges
    "run_playbook",         # execute a SOAR playbook action
    "generate_rule",        # generate YARA/Sigma/KQL detection rules
    "access_provenance",    # read provenance ledger entries
]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/api/delegation-tokens")
def list_tokens(
    active_only: bool = Query(default=False),
    agent_name:  Optional[str] = Query(default=None),
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all delegation tokens for the caller's org."""
    q = select(AgentDelegationToken).where(AgentDelegationToken.org_id == _user.org_id)
    if active_only:
        now = datetime.utcnow()
        q = q.where(
            AgentDelegationToken.is_active == True,
            AgentDelegationToken.is_revoked == False,
            AgentDelegationToken.not_before <= now,
            AgentDelegationToken.not_after >= now,
        )
    if agent_name:
        q = q.where(AgentDelegationToken.agent_name == agent_name)
    q = q.order_by(AgentDelegationToken.created_at.desc()).limit(100)
    tokens = session.exec(q).all()
    return [_token_dict(t) for t in tokens]


@router.post("/api/delegation-tokens", status_code=201)
def issue_token(
    body: dict,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Issue a new Agent Delegation Token (analyst or admin only).

    Required body fields:
      agent_name     — which agent to authorize
      purpose        — plain-language description of what for
      capabilities   — list of allowed capability strings
      not_after_hours — how many hours until the token expires (max 720 = 30 days)

    Optional:
      agent_type     — ai | mcp | automation | workflow  (default: ai)
      scope_constraints — dict: { max_actions, require_approval_above_confidence, case_id }
      not_before_offset_minutes — delay before token becomes active (default: 0)
    """
    if _user.role not in ("admin", "analyst"):
        raise HTTPException(403, "Only analysts and admins can issue delegation tokens")

    agent_name   = body.get("agent_name", "").strip()
    purpose      = body.get("purpose", "").strip()
    capabilities = body.get("capabilities", [])
    hours        = min(int(body.get("not_after_hours", 8)), 720)  # cap at 30 days

    if not agent_name:
        raise HTTPException(400, "agent_name is required")
    if not purpose:
        raise HTTPException(400, "purpose is required")
    if not capabilities:
        raise HTTPException(400, "at least one capability is required")

    # Validate capability names
    invalid = [c for c in capabilities if c not in DEFINED_CAPABILITIES]
    if invalid:
        raise HTTPException(400, f"Unknown capabilities: {invalid}. Allowed: {DEFINED_CAPABILITIES}")

    now = datetime.utcnow()
    offset = int(body.get("not_before_offset_minutes", 0))
    not_before = now + timedelta(minutes=offset)
    not_after  = now + timedelta(hours=hours)

    token = AgentDelegationToken(
        org_id           = _user.org_id,
        token_id         = str(uuid.uuid4()),
        agent_name       = agent_name,
        agent_type       = body.get("agent_type", "ai"),
        authorized_by    = _user.email,
        authorized_by_id = _user.id,
        purpose          = purpose,
        capabilities     = json.dumps(capabilities),
        scope_constraints= json.dumps(body.get("scope_constraints", {})),
        not_before       = not_before,
        not_after        = not_after,
        is_active        = True,
        is_revoked       = False,
        signature        = "",  # computed after insert
    )

    # Compute and set signature before final save
    token.signature = _sign_token(token)
    session.add(token)
    session.commit()
    session.refresh(token)

    _audit(session, _user, "delegation_token_issued",
           f"Token {token.token_id[:8]} issued for {agent_name} by {_user.email} "
           f"(expires {not_after.strftime('%Y-%m-%d %H:%M UTC')})")

    return _token_dict(token)


@router.get("/api/delegation-tokens/meta/capabilities")
def list_capabilities(
    _user: User = Depends(get_current_user),
):
    """Return the list of valid capability strings."""
    return {"capabilities": DEFINED_CAPABILITIES}


@router.get("/api/delegation-tokens/active/{agent_name}")
def get_active_token_for_agent(
    agent_name: str,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get the current active delegation token for a given agent name."""
    now = datetime.utcnow()
    token = session.exec(
        select(AgentDelegationToken)
        .where(AgentDelegationToken.org_id == _user.org_id)
        .where(AgentDelegationToken.agent_name == agent_name)
        .where(AgentDelegationToken.is_active == True)
        .where(AgentDelegationToken.is_revoked == False)
        .where(AgentDelegationToken.not_before <= now)
        .where(AgentDelegationToken.not_after >= now)
        .order_by(AgentDelegationToken.not_after.desc())
    ).first()

    if not token:
        return {"active": False, "token": None}

    return {"active": True, "token": _token_dict(token)}


@router.get("/api/delegation-tokens/{token_id}")
def get_token(
    token_id: str,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    token = _get_or_404(token_id, _user, session)
    return _token_dict(token)


@router.post("/api/delegation-tokens/{token_id}/revoke")
def revoke_token(
    token_id: str,
    body: dict = {},
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Revoke a delegation token immediately. Only the issuer or admin can revoke."""
    if _user.role not in ("admin", "analyst"):
        raise HTTPException(403, "Insufficient role")

    token = _get_or_404(token_id, _user, session)

    if token.is_revoked:
        raise HTTPException(400, "Token is already revoked")

    token.is_revoked     = True
    token.is_active      = False
    token.revoked_at     = datetime.utcnow()
    token.revoked_by     = _user.email
    token.revocation_reason = body.get("reason", "Manually revoked")
    session.add(token)
    session.commit()

    _audit(session, _user, "delegation_token_revoked",
           f"Token {token.token_id[:8]} for {token.agent_name} revoked by {_user.email}")

    return {"revoked": True, "token_id": token_id}


@router.get("/api/delegation-tokens/{token_id}/verify")
def verify_token(
    token_id: str,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Cryptographically verify a delegation token's HMAC signature.
    Returns validity, expiry status, and current usage count.
    """
    token = _get_or_404(token_id, _user, session)
    now   = datetime.utcnow()

    sig_valid   = _verify_signature(token)
    not_expired = token.not_after > now
    not_early   = token.not_before <= now

    return {
        "token_id":       token.token_id,
        "agent_name":     token.agent_name,
        "signature_valid": sig_valid,
        "not_expired":    not_expired,
        "not_before_met": not_early,
        "is_revoked":     token.is_revoked,
        "is_usable":      sig_valid and not_expired and not_early and not token.is_revoked,
        "actions_taken":  token.actions_taken,
        "expires_at":     token.not_after.isoformat(),
        "capabilities":   json.loads(token.capabilities or "[]"),
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_or_404(token_id: str, user: User, session: Session) -> AgentDelegationToken:
    token = session.exec(
        select(AgentDelegationToken)
        .where(AgentDelegationToken.token_id == token_id)
        .where(AgentDelegationToken.org_id == user.org_id)
    ).first()
    if not token:
        raise HTTPException(404, "Token not found")
    return token


def _token_dict(t: AgentDelegationToken) -> dict:
    now = datetime.utcnow()
    return {
        "id":               t.id,
        "token_id":         t.token_id,
        "agent_name":       t.agent_name,
        "agent_type":       t.agent_type,
        "authorized_by":    t.authorized_by,
        "purpose":          t.purpose,
        "capabilities":     json.loads(t.capabilities or "[]"),
        "scope_constraints":json.loads(t.scope_constraints or "{}"),
        "not_before":       t.not_before.isoformat(),
        "not_after":        t.not_after.isoformat(),
        "is_active":        t.is_active,
        "is_revoked":       t.is_revoked,
        "revoked_at":       t.revoked_at.isoformat() if t.revoked_at else None,
        "revoked_by":       t.revoked_by,
        "revocation_reason":t.revocation_reason,
        "actions_taken":    t.actions_taken,
        "last_used_at":     t.last_used_at.isoformat() if t.last_used_at else None,
        "signature":        t.signature[:16] + "..." if t.signature else "",  # truncated for display
        "is_expired":       t.not_after < now,
        "is_usable":        t.is_active and not t.is_revoked and t.not_before <= now and t.not_after >= now,
        "created_at":       t.created_at.isoformat(),
    }
