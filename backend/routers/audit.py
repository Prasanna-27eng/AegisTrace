"""
AegisTrace Live Audit Log
─────────────────────────
Full audit history + real-time SSE stream.
Every significant action in the app is recorded here.
"""
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, func
from sqlalchemy import or_ as _or
from models import AuditLog, Case, User
from database import get_session, engine
from routers.auth import get_current_user, require_admin
from models import User as UserModel

router = APIRouter(prefix="/api/audit", tags=["audit"])


def _org_user_ids(session: Session, user: UserModel) -> set:
    """User IDs belonging to the caller's org (for scoping AuditLog rows)."""
    return set(session.exec(select(User.id).where(User.org_id == user.org_id)).all())


def _org_scope(query, org_user_ids: set):
    """Restrict an AuditLog query to the caller's org's users plus system-generated entries."""
    return query.where(_or(AuditLog.user_id.in_(org_user_ids), AuditLog.user_id == None))  # noqa: E711

# Action descriptions for human-readable display
ACTION_LABELS = {
    "login":              "User logged in",
    "case_created":       "Case created",
    "case_updated":       "Case updated",
    "case_closed":        "Case closed",
    "case_deleted":       "Case deleted",
    "status_changed":     "Status changed",
    "share_toggled":      "Public visibility toggled",
    "ai_generated":       "AI analysis generated",
    "evidence_added":     "Evidence artifact added",
    "alert_imported":     "SIEM alert imported",
    "vt_lookup":          "VirusTotal lookup performed",
    "email_analysed":     "Email header analysed",
    "terminal_analysed":  "Terminal output parsed",
    "user_created":       "New user created",
    "user_updated":       "User account updated",
    "user_deleted":       "User account deleted",
    "password_changed":   "Password changed",
    "password_set":       "Password set",
    "webhook_fired":      "Webhook event fired",
}

ACTION_CATEGORY = {
    "login":             "auth",
    "case_created":      "case",
    "case_updated":      "case",
    "case_closed":       "case",
    "case_deleted":      "case",
    "status_changed":    "case",
    "share_toggled":     "case",
    "ai_generated":      "ai",
    "evidence_added":    "evidence",
    "alert_imported":    "import",
    "vt_lookup":         "intel",
    "email_analysed":    "intel",
    "terminal_analysed": "intel",
    "user_created":      "admin",
    "user_updated":      "admin",
    "user_deleted":      "admin",
    "password_changed":  "admin",
}


def _serialize(log: AuditLog) -> dict:
    return {
        "id":           log.id,
        "action":       log.action,
        "label":        ACTION_LABELS.get(log.action, log.action.replace("_", " ").title()),
        "category":     ACTION_CATEGORY.get(log.action, "system"),
        "entity_type":  log.entity_type,
        "entity_id":    log.entity_id,
        "user_email":   log.user_email,
        "user_id":      log.user_id,
        "detail":       log.new_value if log.entity_type not in ("user_pw",) else None,
        "timestamp":    log.timestamp.isoformat(),
    }


# ── Full audit log ─────────────────────────────────────────────────────────────
@router.get("")
def list_audit(
    days:     int      = Query(7),
    category: Optional[str] = Query(None),
    action:   Optional[str] = Query(None),
    user_id:  Optional[int] = Query(None),
    limit:    int      = Query(200),
    offset:   int      = Query(0),
    _user: UserModel = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    since = datetime.utcnow() - timedelta(days=days)
    org_user_ids = _org_user_ids(session, _user)
    query = _org_scope(
        select(AuditLog)
        .where(AuditLog.timestamp >= since)
        .where(AuditLog.entity_type != "user_pw"),
        org_user_ids,
    )
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    query = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit)
    logs = session.exec(query).all()

    # Filter by category client-side (easier than SQL)
    result = [_serialize(l) for l in logs]
    if category:
        result = [r for r in result if r["category"] == category]
    return result


# ── Live polling endpoint (called every 5s by frontend) ────────────────────────
@router.get("/since/{timestamp}")
def audit_since(
    timestamp: str,
    _user: UserModel = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Returns all audit events since a given ISO timestamp. Used for live polling."""
    try:
        since = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except Exception:
        since = datetime.utcnow() - timedelta(minutes=1)

    org_user_ids = _org_user_ids(session, _user)
    logs = session.exec(
        _org_scope(
            select(AuditLog)
            .where(AuditLog.timestamp > since)
            .where(AuditLog.entity_type != "user_pw"),
            org_user_ids,
        )
        .order_by(AuditLog.timestamp.asc())
        .limit(50)
    ).all()
    return [_serialize(l) for l in logs]


# ── Stats ──────────────────────────────────────────────────────────────────────
@router.get("/stats")
def audit_stats(
    _user: UserModel = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Summary counts for the audit dashboard (scoped to the caller's org)."""
    since_24h = datetime.utcnow() - timedelta(hours=24)
    since_7d  = datetime.utcnow() - timedelta(days=7)
    org_user_ids = _org_user_ids(session, _user)

    def count_action(action: str, since: datetime) -> int:
        return session.exec(
            _org_scope(
                select(func.count(AuditLog.id))
                .where(AuditLog.action == action)
                .where(AuditLog.timestamp >= since),
                org_user_ids,
            )
        ).one()

    total_cases    = session.exec(select(func.count(Case.id)).where(Case.org_id == _user.org_id)).one()
    logins_24h     = count_action("login", since_24h)
    cases_7d       = count_action("case_created", since_7d)
    ai_calls_7d    = count_action("ai_generated", since_7d)
    vt_lookups_7d  = count_action("vt_lookup", since_7d)
    alerts_7d      = count_action("alert_imported", since_7d)

    # Actions per day (last 7 days)
    daily = []
    for i in range(7):
        day_start = (datetime.utcnow() - timedelta(days=i+1)).replace(hour=0, minute=0, second=0)
        day_end   = day_start + timedelta(days=1)
        cnt = session.exec(
            _org_scope(
                select(func.count(AuditLog.id))
                .where(AuditLog.timestamp >= day_start)
                .where(AuditLog.timestamp < day_end)
                .where(AuditLog.entity_type != "user_pw"),
                org_user_ids,
            )
        ).one()
        daily.append({"date": day_start.strftime("%Y-%m-%d"), "count": cnt})
    daily.reverse()

    return {
        "total_cases":    total_cases,
        "logins_24h":     logins_24h,
        "cases_7d":       cases_7d,
        "ai_calls_7d":    ai_calls_7d,
        "vt_lookups_7d":  vt_lookups_7d,
        "alerts_7d":      alerts_7d,
        "activity_by_day": daily,
    }


# ── SSE stream (Server-Sent Events) ───────────────────────────────────────────
@router.get("/stream")
async def audit_stream(request: Request, _user: UserModel = Depends(get_current_user)):
    """
    Real-time SSE stream of audit events.
    Frontend connects with EventSource and receives new events as they happen.
    Falls back gracefully if SSE isn't supported.
    """
    last_id: list = [0]

    async def event_generator():
        # Send a heartbeat comment first
        yield "retry: 3000\n\n"

        while True:
            if await request.is_disconnected():
                break
            try:
                with Session(engine) as session:
                    org_user_ids = _org_user_ids(session, _user)
                    query = _org_scope(
                        select(AuditLog)
                        .where(AuditLog.id > last_id[0])
                        .where(AuditLog.entity_type != "user_pw"),
                        org_user_ids,
                    ).order_by(AuditLog.timestamp.asc()).limit(20)
                    new_logs = session.exec(query).all()
                    for log in new_logs:
                        last_id[0] = log.id
                        data = json.dumps(_serialize(log))
                        yield f"id: {log.id}\ndata: {data}\n\n"
            except Exception:
                pass
            await asyncio.sleep(3)   # poll DB every 3 seconds

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )
