"""
AegisTrace Analytics Router — v3.0
────────────────────────────────────
Trend and metric queries over existing data.
All queries hit existing tables — no new models needed.

GET /api/analytics/overview
GET /api/analytics/cases-over-time
GET /api/analytics/severity-breakdown
GET /api/analytics/ioc-types
GET /api/analytics/time-to-close
GET /api/analytics/mitre-heatmap
GET /api/analytics/analyst-throughput
GET /api/analytics/sla-status
"""
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import json
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from models import Case, IOCCorrelation, TimelineEvent, User
from database import get_session
from routers.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def overview(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    cases = session.exec(select(Case).where(Case.org_id == user.org_id)).all()
    now = datetime.utcnow()
    open_cases = [c for c in cases if c.status != "closed"]
    closed = [c for c in cases if c.status == "closed"]

    # Average time to close (hours)
    ttc_hours = []
    for c in closed:
        if c.created_at and c.updated_at:
            diff = (c.updated_at - c.created_at).total_seconds() / 3600
            if diff > 0:
                ttc_hours.append(diff)
    avg_ttc = round(sum(ttc_hours) / len(ttc_hours), 1) if ttc_hours else 0

    # SLA breach count
    sla_thresholds = {"critical": 4, "high": 8, "medium": 48, "low": 168}
    breached = sum(
        1 for c in open_cases
        if (now - c.created_at).total_seconds() / 3600 > sla_thresholds.get(c.severity, 48)
    )

    return {
        "total_cases": len(cases),
        "open_cases": len(open_cases),
        "closed_cases": len(closed),
        "critical_open": sum(1 for c in open_cases if c.severity == "critical"),
        "avg_time_to_close_hours": avg_ttc,
        "sla_breached": breached,
        "cases_with_ai": sum(1 for c in cases if c.ai_executive_summary),
        "public_cases": sum(1 for c in cases if c.is_public),
    }


@router.get("/cases-over-time")
def cases_over_time(
    days: int = Query(30),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    cases = session.exec(
        select(Case)
        .where(Case.org_id == user.org_id)
        .where(Case.created_at >= cutoff)
    ).all()

    # Group by date
    created_by_date: dict = defaultdict(int)
    closed_by_date: dict = defaultdict(int)
    for c in cases:
        day = c.created_at.strftime("%Y-%m-%d")
        created_by_date[day] += 1
        if c.status == "closed":
            day2 = c.updated_at.strftime("%Y-%m-%d")
            closed_by_date[day2] += 1

    # Build full date range
    result = []
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        result.append({
            "date": d,
            "created": created_by_date.get(d, 0),
            "closed": closed_by_date.get(d, 0),
        })
    return result


@router.get("/severity-breakdown")
def severity_breakdown(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    cases = session.exec(
        select(Case).where(Case.org_id == user.org_id).where(Case.status != "closed")
    ).all()
    counts = Counter(c.severity for c in cases)
    order = ["critical", "high", "medium", "low", "info"]
    return [{"severity": s, "count": counts.get(s, 0)} for s in order]


@router.get("/ioc-types")
def ioc_types(
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    correlations = session.exec(
        select(IOCCorrelation).order_by(IOCCorrelation.case_count.desc()).limit(100)
    ).all()
    type_counts = Counter(c.ioc_type for c in correlations)
    return [{"type": t, "count": n} for t, n in type_counts.most_common()]


@router.get("/time-to-close")
def time_to_close(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    closed = session.exec(
        select(Case)
        .where(Case.org_id == user.org_id)
        .where(Case.status == "closed")
        .order_by(Case.updated_at.desc())
        .limit(100)
    ).all()

    by_severity: dict = defaultdict(list)
    for c in closed:
        if c.created_at and c.updated_at:
            hours = (c.updated_at - c.created_at).total_seconds() / 3600
            if hours > 0:
                by_severity[c.severity].append(hours)

    result = []
    for sev in ["critical", "high", "medium", "low"]:
        hrs = by_severity.get(sev, [])
        result.append({
            "severity": sev,
            "avg_hours": round(sum(hrs) / len(hrs), 1) if hrs else 0,
            "count": len(hrs),
        })
    return result


@router.get("/mitre-heatmap")
def mitre_heatmap(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    cases = session.exec(select(Case).where(Case.org_id == user.org_id)).all()
    technique_counts: dict = Counter()
    for c in cases:
        try:
            techniques = json.loads(c.mitre_techniques or "[]")
            for t in techniques:
                tid = t.get("id", "")
                name = t.get("name", "")
                if tid:
                    technique_counts[f"{tid}|{name}"] += 1
        except Exception:
            pass
    result = []
    for key, count in technique_counts.most_common(20):
        parts = key.split("|", 1)
        result.append({"id": parts[0], "name": parts[1] if len(parts) > 1 else "", "count": count})
    return result


@router.get("/analyst-throughput")
def analyst_throughput(
    days: int = Query(30),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    cases = session.exec(
        select(Case)
        .where(Case.org_id == user.org_id)
        .where(Case.created_at >= cutoff)
    ).all()
    by_analyst: dict = defaultdict(lambda: {"created": 0, "closed": 0})
    for c in cases:
        name = c.analyst_name or "Unassigned"
        by_analyst[name]["created"] += 1
        if c.status == "closed":
            by_analyst[name]["closed"] += 1
    return [
        {"analyst": name, "created": v["created"], "closed": v["closed"]}
        for name, v in sorted(by_analyst.items(), key=lambda x: -x[1]["created"])
    ]


@router.get("/sla-status")
def sla_status(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Open cases with SLA classification."""
    open_cases = session.exec(
        select(Case)
        .where(Case.org_id == user.org_id)
        .where(Case.status != "closed")
    ).all()
    now = datetime.utcnow()
    thresholds = {"critical": 4, "high": 8, "medium": 48, "low": 168}
    result = []
    for c in open_cases:
        hours = (now - c.created_at).total_seconds() / 3600
        limit = thresholds.get(c.severity, 48)
        pct = hours / limit
        status = "breached" if pct >= 1 else "at_risk" if pct >= 0.8 else "on_track"
        result.append({
            "case_id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "severity": c.severity,
            "analyst": c.analyst_name,
            "age_hours": round(hours, 1),
            "sla_hours": limit,
            "sla_status": status,
            "pct_used": round(pct * 100, 1),
        })
    return sorted(result, key=lambda x: -x["pct_used"])
