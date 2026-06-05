"""
AegisTrace NHI (Non-Human Identity) Lifecycle Router
──────────────────────────────────────────────────────
Routes: /api/nhi/*
Trust decay, sprawl scores, lifecycle health.
"""
import json, logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from models import IdentityNode, IdentityAnomaly, ITDRAlert
from database import get_session
from routers.auth import get_current_user
from models import User
from core.events import event_bus, Events
from core.cache import cache, TTL_NHI_SUMMARY

logger = logging.getLogger("aegistrace.nhi")
router = APIRouter(prefix="/api/nhi", tags=["nhi"])

STALE_DAYS       = 30   # inactive for this many days = stale
EXPIRY_WARN_DAYS = 14   # expiring within this many days = warning
LOW_TRUST_THRESHOLD = 30


# ── Trust decay formula ───────────────────────────────────────────────────────
def calculate_trust_score(node: IdentityNode) -> float:
    now = datetime.utcnow()
    base = node.risk_score if node.risk_score and node.risk_score > 0 else 100

    last = node.last_active or node.last_seen
    days_inactive = (now - last).days if last else 90
    anomaly_penalty = (node.anomaly_count_7d or 0) * 10
    inactivity_decay = min(days_inactive * 0.5, 40)

    privilege_factor = {
        "admin": 1.5, "high": 1.2, "medium": 1.0, "low": 0.8
    }.get(node.privilege_level or "low", 1.0)

    new_score = max(0.0, (base - inactivity_decay - anomaly_penalty) * privilege_factor)
    return round(new_score, 2)


# ── NHI Health ────────────────────────────────────────────────────────────────
@router.get("/health")
def nhi_health(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cached = cache.get("nhi:health")
    if cached:
        return cached

    now = datetime.utcnow()
    stale_cutoff  = now - timedelta(days=STALE_DAYS)
    expiry_cutoff = now + timedelta(days=EXPIRY_WARN_DAYS)

    all_nodes = session.exec(select(IdentityNode)).all()
    non_human = [n for n in all_nodes if n.node_type != "user"]

    def _node_summary(n: IdentityNode) -> dict:
        return {
            "id": n.id,
            "label": n.label,
            "node_type": n.node_type,
            "last_active": (n.last_active or n.last_seen).isoformat() if (n.last_active or n.last_seen) else None,
            "privilege_level": n.privilege_level or "low",
            "credential_sprawl_score": n.credential_sprawl_score or 0.0,
            "trust_score": calculate_trust_score(n),
            "risk_score": n.risk_score,
        }

    # Stale: last_active > 30 days ago
    stale = [_node_summary(n) for n in non_human
             if (n.last_active or n.last_seen) and (n.last_active or n.last_seen) < stale_cutoff]

    # Expiring soon
    expiring_soon = [_node_summary(n) for n in non_human
                     if n.expiry_date and now < n.expiry_date < expiry_cutoff]

    # Never expires AND high privilege
    never_expires_high = [_node_summary(n) for n in non_human
                          if not n.expiry_date and n.privilege_level in ("high", "admin")]

    # Orphaned
    orphaned = [_node_summary(n) for n in non_human if n.is_orphaned]

    result = {
        "stale": {"count": len(stale), "items": stale},
        "expiring_soon": {"count": len(expiring_soon), "items": expiring_soon},
        "never_expires_high_privilege": {"count": len(never_expires_high), "items": never_expires_high},
        "orphaned": {"count": len(orphaned), "items": orphaned},
        "total_nhi": len(non_human),
        "total_human": len([n for n in all_nodes if n.node_type == "user"]),
    }
    cache.set("nhi:health", result, ttl_seconds=TTL_NHI_SUMMARY)
    return result


@router.get("/summary")
def nhi_summary(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cached = cache.get("nhi:summary")
    if cached:
        return cached

    all_nodes = session.exec(select(IdentityNode)).all()
    non_human = [n for n in all_nodes if n.node_type != "user"]
    humans    = [n for n in all_nodes if n.node_type == "user"]

    avg_trust = 0.0
    if non_human:
        scores = [calculate_trust_score(n) for n in non_human]
        avg_trust = round(sum(scores) / len(scores), 2)

    nhi_count   = len(non_human)
    human_count = len(humans)
    ratio = f"{round(nhi_count / human_count)}:1" if human_count > 0 else f"{nhi_count}:0"

    result = {
        "total_nhi": nhi_count,
        "total_human": human_count,
        "ratio": ratio,
        "avg_trust_score": avg_trust,
        "by_type": {},
    }
    for n in non_human:
        t = n.node_type
        result["by_type"][t] = result["by_type"].get(t, 0) + 1

    cache.set("nhi:summary", result, ttl_seconds=TTL_NHI_SUMMARY)
    return result


@router.get("/sprawl-score/{node_id}")
def get_sprawl_score(
    node_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    node = session.get(IdentityNode, node_id)
    if not node:
        raise HTTPException(404, "Identity node not found")

    # Sprawl score: based on edges (linked cases) + anomaly count + privilege
    linked = json.loads(node.linked_case_ids or "[]")
    case_count = len(linked)
    privilege_bonus = {"admin": 30, "high": 20, "medium": 10, "low": 0}.get(node.privilege_level or "low", 0)
    anomaly_bonus = min((node.anomaly_count_7d or 0) * 5, 30)
    sprawl = min(case_count * 10 + privilege_bonus + anomaly_bonus, 100)

    node.credential_sprawl_score = float(sprawl)
    session.add(node)
    session.commit()

    return {"node_id": node_id, "label": node.label, "sprawl_score": sprawl}


@router.get("/trust-timeline/{node_id}")
def trust_timeline(
    node_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    node = session.get(IdentityNode, node_id)
    if not node:
        raise HTTPException(404, "Identity node not found")

    history = json.loads(node.trust_score_history or "[]")
    current = calculate_trust_score(node)

    return {
        "node_id": node_id,
        "label": node.label,
        "current_trust_score": current,
        "history": history,
    }


@router.post("/trust-decay/run")
def run_trust_decay(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Manually trigger trust decay recalculation for all identity nodes."""
    from routers.health import record_job_run
    nodes = session.exec(select(IdentityNode)).all()
    updated = 0
    alerted = 0

    for node in nodes:
        old_score = node.risk_score
        new_score = calculate_trust_score(node)

        # Update trust score history
        history = json.loads(node.trust_score_history or "[]")
        history.append({"date": datetime.utcnow().date().isoformat(), "score": new_score})
        if len(history) > 90:  # keep 90 days
            history = history[-90:]
        node.trust_score_history = json.dumps(history)

        if abs(old_score - new_score) > 1:
            node.risk_score = int(new_score)
            session.add(node)
            event_bus.emit(Events.IDENTITY_RISK_CHANGED, {
                "node_id": node.id,
                "old_score": old_score,
                "new_score": new_score,
            })
            updated += 1

        # Auto-create ITDR alert when score drops below threshold
        if new_score < LOW_TRUST_THRESHOLD and old_score >= LOW_TRUST_THRESHOLD:
            session.add(ITDRAlert(
                alert_type="low_trust_score",
                severity="high",
                identity_label=node.label,
                node_id=node.id,
                description=f"Trust score for '{node.label}' dropped to {new_score} (below threshold {LOW_TRUST_THRESHOLD}). Node type: {node.node_type}, Privilege: {node.privilege_level}.",
                evidence=json.dumps({"old_score": old_score, "new_score": new_score, "threshold": LOW_TRUST_THRESHOLD}),
            ))
            event_bus.emit(Events.ITDR_ALERT_FIRED, {
                "alert_type": "low_trust_score",
                "identity_id": node.id,
                "severity": "high",
                "details": {"new_score": new_score},
            })
            alerted += 1

    session.commit()
    cache.invalidate_prefix("nhi:")
    record_job_run("trust_decay")

    return {
        "ok": True,
        "nodes_processed": len(nodes),
        "scores_updated": updated,
        "itdr_alerts_created": alerted,
    }
