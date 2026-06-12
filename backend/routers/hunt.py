"""
AegisTrace Threat Hunting Engine
─────────────────────────────────
Cross-case queries: IOC frequency, MITRE heatmap, timeline activity,
global IOC search, campaign detection.
"""
import json
import re
import threading
from collections import Counter
from datetime import datetime, timedelta
from decimal import Decimal
import duckdb
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, func
from sqlalchemy import or_ as _or
from models import (
    Case, IOCCorrelation, TimelineEvent, AuditLog, EvidenceArtifact,
    RawLogEvent, Endpoint, AgentAction, ShadowAIEvent, DefenseEvent,
    HardwareAlert, ITDRAlert,
)
from database import get_session, DATABASE_URL
from routers.auth import get_current_user
from models import User

router = APIRouter(prefix="/api/hunt", tags=["hunt"])


@router.get("/iocs")
def ioc_frequency(
    min_cases: int = Query(1, description="Minimum case appearances"),
    ioc_type: str = Query(None),
    limit: int = Query(50),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """All IOCs ranked by number of cases they appear in (scoped to the caller's org)."""
    query = select(IOCCorrelation).where(IOCCorrelation.case_count >= min_cases)
    if ioc_type:
        query = query.where(IOCCorrelation.ioc_type == ioc_type)
    query = query.order_by(IOCCorrelation.case_count.desc()).limit(limit)
    correlations = session.exec(query).all()
    result = []
    for c in correlations:
        case_ids = json.loads(c.case_ids or "[]")
        cases = []
        for cid in case_ids:
            case = session.get(Case, cid)
            if case and case.org_id == _user.org_id:
                cases.append({
                    "id": case.id,
                    "case_number": case.case_number,
                    "title": case.title,
                    "severity": case.severity,
                })
        if not cases:
            continue
        result.append({
            "id": c.id,
            "ioc": c.ioc,
            "ioc_type": c.ioc_type,
            "case_count": len(cases),
            "first_seen": c.first_seen,
            "last_seen": c.last_seen,
            "cases": cases,
            "is_campaign": len(cases) >= 3,
        })
    return result


@router.get("/mitre")
def mitre_heatmap(
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """MITRE ATT&CK technique frequency across the caller's org's cases."""
    cases = session.exec(select(Case).where(Case.org_id == _user.org_id)).all()
    counter: Counter = Counter()
    details: dict = {}
    for case in cases:
        try:
            techniques = json.loads(case.mitre_techniques or "[]")
            for t in techniques:
                tid  = t.get("id", "")
                name = t.get("name", "")
                tactic = t.get("tactic", "")
                if tid:
                    counter[tid] += 1
                    if tid not in details:
                        details[tid] = {"name": name, "tactic": tactic}
        except Exception:
            pass

    result = []
    for tid, count in counter.most_common(30):
        d = details.get(tid, {})
        result.append({
            "technique_id": tid,
            "name": d.get("name", ""),
            "tactic": d.get("tactic", ""),
            "count": count,
        })
    return result


@router.get("/activity")
def recent_activity(
    days: int = Query(30),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """Recent audit log activity for the hunt dashboard (scoped to the caller's org)."""
    since = datetime.utcnow() - timedelta(days=days)
    org_user_ids = set(session.exec(
        select(User.id).where(User.org_id == _user.org_id)
    ).all())
    logs = session.exec(
        select(AuditLog)
        .where(AuditLog.timestamp >= since)
        .where(AuditLog.entity_type != "user_pw")   # never surface password events
        .where(_or(AuditLog.user_id.in_(org_user_ids), AuditLog.user_id == None))  # noqa: E711
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
    ).all()
    return [{
        "id": l.id,
        "action": l.action,
        "entity_type": l.entity_type,
        "entity_id": l.entity_id,
        "user_email": l.user_email,
        "new_value": l.new_value if l.entity_type != "user_pw" else None,
        "timestamp": l.timestamp,
    } for l in logs]


@router.get("/search")
def cross_case_search(
    q: str = Query(..., min_length=2),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """Search IOCs, case titles, findings across all cases."""
    results = {
        "ioc_matches": [],
        "case_matches": [],
    }

    # IOC correlation matches — only count cases visible to the caller's org
    corr_hits = session.exec(
        select(IOCCorrelation).where(IOCCorrelation.ioc.contains(q)).limit(20)
    ).all()
    for c in corr_hits:
        case_ids = json.loads(c.case_ids or "[]")
        org_case_count = sum(
            1 for cid in case_ids
            if (case := session.get(Case, cid)) and case.org_id == _user.org_id
        )
        if org_case_count:
            results["ioc_matches"].append({
                "ioc": c.ioc,
                "ioc_type": c.ioc_type,
                "case_count": org_case_count,
            })

    # Case text matches
    from sqlalchemy import or_
    case_hits = session.exec(
        select(Case).where(
            Case.org_id == _user.org_id,
            or_(
                Case.title.contains(q),
                Case.findings.contains(q),
                Case.description.contains(q),
                Case.commands_run.contains(q),
                Case.case_number.contains(q),
            ),
        ).limit(20)
    ).all()
    for c in case_hits:
        results["case_matches"].append({
            "id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "severity": c.severity,
            "status": c.status,
        })

    return results


@router.get("/campaigns")
def detect_campaigns(
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """IOCs appearing in 3+ cases = potential campaign."""
    correlations = session.exec(
        select(IOCCorrelation)
        .where(IOCCorrelation.case_count >= 3)
        .order_by(IOCCorrelation.case_count.desc())
    ).all()

    campaigns = []
    for c in correlations:
        case_ids = json.loads(c.case_ids or "[]")
        shared_mitre: Counter = Counter()
        cases = []
        for cid in case_ids:
            case = session.get(Case, cid)
            if case and case.org_id == _user.org_id:
                cases.append({
                    "id": case.id, "case_number": case.case_number,
                    "title": case.title, "severity": case.severity,
                })
                try:
                    for t in json.loads(case.mitre_techniques or "[]"):
                        if t.get("id"):
                            shared_mitre[t["id"]] += 1
                except Exception:
                    pass
        if len(cases) < 3:
            continue
        campaigns.append({
            "ioc": c.ioc,
            "ioc_type": c.ioc_type,
            "case_count": len(cases),
            "first_seen": c.first_seen,
            "last_seen": c.last_seen,
            "cases": cases,
            "shared_mitre": [
                {"id": tid, "count": cnt}
                for tid, cnt in shared_mitre.most_common(5)
            ],
        })
    return campaigns


@router.get("/stats")
def hunt_stats(
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """High-level stats for threat hunting dashboard (scoped to the caller's org)."""
    org_case_ids = set(session.exec(
        select(Case.id).where(Case.org_id == _user.org_id)
    ).all())
    total_cases = len(org_case_ids)

    total_iocs = 0
    campaign_iocs = 0
    malicious_iocs = 0
    for c in session.exec(select(IOCCorrelation)).all():
        org_count = sum(1 for cid in json.loads(c.case_ids or "[]") if cid in org_case_ids)
        if org_count == 0:
            continue
        total_iocs += 1
        if org_count >= 3:
            campaign_iocs += 1
        if org_count >= 2:
            malicious_iocs += 1

    recent_events = session.exec(
        select(func.count(TimelineEvent.id))
        .where(TimelineEvent.case_id.in_(org_case_ids))
        .where(TimelineEvent.timestamp >= datetime.utcnow() - timedelta(days=7))
    ).one() if org_case_ids else 0

    return {
        "total_cases": total_cases,
        "total_iocs_tracked": total_iocs,
        "campaign_iocs": campaign_iocs,
        "multi_case_iocs": malicious_iocs,
        "events_last_7_days": recent_events,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SQL HUNTING CONSOLE
# Read-only SQL over the live SQLite database via DuckDB's sqlite_scan — no
# ETL, no second database. Each request opens a fresh in-memory DuckDB
# connection, creates a whitelisted set of read-only views (org-scoped where
# the underlying table has an org_id / org-linked column), then runs the
# caller's query as a subquery of one of those views only.
# ─────────────────────────────────────────────────────────────────────────────

_SQL_BLOCKLIST = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|INSTALL|"
    r"LOAD|COPY|EXPORT|IMPORT|CALL|VACUUM|CHECKPOINT|REPLACE|GRANT|REVOKE|TRUNCATE|SET|"
    r"SQLITE_MASTER|SQLITE_SCAN|DUCKDB_\w*|INFORMATION_SCHEMA|PRAGMA_\w*)\b",
    re.IGNORECASE,
)

_SQL_HUNT_QUERY_TIMEOUT = 10  # seconds
_SQL_HUNT_MAX_LIMIT = 1000

# Tables that predate multi-tenancy and are exposed exactly as the rest of the
# app exposes them today (no org_id column to scope on).
_HUNT_TABLES = {
    "raw_log_events":   RawLogEvent,
    "endpoints":        Endpoint,
    "agent_actions":    AgentAction,
    "shadow_ai_events": ShadowAIEvent,
    "defense_events":   DefenseEvent,
    "hardware_alerts":  HardwareAlert,
}
HUNT_VIEW_NAMES = list(_HUNT_TABLES) + ["itdr_alerts", "cases", "audit_logs"]


def _sqlite_db_path() -> str:
    if not DATABASE_URL.startswith("sqlite:///"):
        raise HTTPException(503, "SQL hunting requires a SQLite database")
    return DATABASE_URL[len("sqlite:///"):]


def _validate_hunt_query(query: str) -> str:
    q = (query or "").strip().rstrip(";").strip()
    if not q:
        raise HTTPException(400, "Query is empty")
    if len(q) > 4000:
        raise HTTPException(400, "Query too long (max 4000 characters)")
    if ";" in q:
        raise HTTPException(400, "Only a single statement is allowed")
    if not re.match(r"^\s*(SELECT|WITH)\b", q, re.IGNORECASE):
        raise HTTPException(400, "Only SELECT / WITH queries are allowed")
    if _SQL_BLOCKLIST.search(q):
        raise HTTPException(400, "Query contains a disallowed keyword")
    return q


def _open_hunt_connection(session: Session, user: User) -> "duckdb.DuckDBPyConnection":
    path = _sqlite_db_path()
    con = duckdb.connect(":memory:")
    con.execute("INSTALL sqlite")
    con.execute("LOAD sqlite")

    def scan(model) -> str:
        return f"sqlite_scan('{path}', '{model.__tablename__}')"

    for view, model in _HUNT_TABLES.items():
        con.execute(f"CREATE VIEW {view} AS SELECT * FROM {scan(model)}")

    con.execute(f"CREATE VIEW itdr_alerts AS SELECT * FROM {scan(ITDRAlert)} WHERE org_id = {int(user.org_id)}")
    con.execute(f"CREATE VIEW cases AS SELECT * FROM {scan(Case)} WHERE org_id = {int(user.org_id)}")

    org_user_ids = session.exec(select(User.id).where(User.org_id == user.org_id)).all()
    ids_sql = ",".join(str(int(i)) for i in org_user_ids) or "-1"
    con.execute(
        f"CREATE VIEW audit_logs AS SELECT * FROM {scan(AuditLog)} "
        f"WHERE (user_id IN ({ids_sql}) OR user_id IS NULL) AND entity_type != 'user_pw'"
    )
    return con


def _jsonable(v):
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, (bytes, bytearray)):
        return v.decode("utf-8", "replace")
    if isinstance(v, Decimal):
        return float(v)
    return v


def _execute_with_timeout(con, sql: str, timeout_s: float = _SQL_HUNT_QUERY_TIMEOUT):
    outcome = {}

    def run():
        try:
            cur = con.execute(sql)
            outcome["columns"] = [d[0] for d in cur.description]
            outcome["rows"] = cur.fetchall()
        except Exception as e:
            outcome["error"] = str(e)

    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(timeout_s)
    if t.is_alive():
        con.interrupt()
        t.join(2)
        raise HTTPException(408, f"Query timed out after {timeout_s:.0f}s")
    if "error" in outcome:
        raise HTTPException(400, f"Query error: {outcome['error']}")
    return outcome["columns"], outcome["rows"]


class SQLHuntRequest(BaseModel):
    query: str
    limit: int = 200


@router.post("/sql")
def sql_hunt(
    body: SQLHuntRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    Run a read-only SQL query against the platform's telemetry via DuckDB
    (sqlite_scan over the live database — zero ETL). SELECT/WITH only, a
    single statement, capped rows and execution time. Available views:
    raw_log_events, endpoints, agent_actions, shadow_ai_events,
    defense_events, hardware_alerts, itdr_alerts, cases, audit_logs.
    """
    query = _validate_hunt_query(body.query)
    limit = max(1, min(body.limit or 200, _SQL_HUNT_MAX_LIMIT))

    con = _open_hunt_connection(session, user)
    try:
        columns, rows = _execute_with_timeout(con, f"SELECT * FROM ({query}) AS _hunt_query LIMIT {limit + 1}")
    finally:
        con.close()

    truncated = len(rows) > limit
    rows = rows[:limit]
    return {
        "columns": columns,
        "rows": [[_jsonable(v) for v in row] for row in rows],
        "row_count": len(rows),
        "truncated": truncated,
    }


@router.get("/sql/schema")
def sql_hunt_schema(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Available tables/views and their columns for the SQL hunting console."""
    con = _open_hunt_connection(session, user)
    try:
        views = {}
        for view in HUNT_VIEW_NAMES:
            cols = con.execute(f"DESCRIBE {view}").fetchall()
            views[view] = [{"name": c[0], "type": c[1]} for c in cols]
    finally:
        con.close()
    return {"views": views}
