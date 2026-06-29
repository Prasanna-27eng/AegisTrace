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
GET /api/analytics/adaptive-thresholds
"""
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import json
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from models import Case, IOCCorrelation, TimelineEvent, User, AdaptiveThresholdLog, DefenseRecommendation, AIUsageLog
from database import get_session
from routers.auth import get_current_user
import adaptive_config

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
        select(IOCCorrelation)
        .where(IOCCorrelation.org_id == _user.org_id)
        .order_by(IOCCorrelation.case_count.desc())
        .limit(100)
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


@router.get("/sla")
def sla_metrics(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    SLA metrics for the last 30 days vs prior 30 days.
    Returns MTTD, MTTR, MTTC in minutes with trend deltas.
    """
    now = datetime.utcnow()
    period_start   = now - timedelta(days=30)
    prior_start    = now - timedelta(days=60)
    prior_end      = period_start

    def compute_metrics(cases_period, recs_map):
        """Compute MTTC, MTTR for a set of cases."""
        mttc_values = []
        mttr_values = []
        mttd_values = []

        for c in cases_period:
            # MTTC: closed_at - created_at (minutes)
            if c.status == "closed":
                closed_at = getattr(c, "closed_at", None) or c.updated_at
                if closed_at and c.created_at:
                    diff_min = (closed_at - c.created_at).total_seconds() / 60
                    if diff_min > 0:
                        mttc_values.append(diff_min)

            # MTTR: first DefenseRecommendation created_at - case.created_at (minutes)
            recs = recs_map.get(c.id, [])
            if recs and c.created_at:
                first_rec = min(recs, key=lambda r: r.created_at)
                diff_min = (first_rec.created_at - c.created_at).total_seconds() / 60
                if diff_min >= 0:
                    mttr_values.append(diff_min)

            # MTTD: created_at - first_event_at (minutes)
            first_event_at = getattr(c, "first_event_at", None)
            if first_event_at and c.created_at:
                diff_min = (c.created_at - first_event_at).total_seconds() / 60
                if diff_min >= 0:
                    mttd_values.append(diff_min)

        return {
            "mttc": round(sum(mttc_values) / len(mttc_values), 1) if mttc_values else None,
            "mttr": round(sum(mttr_values) / len(mttr_values), 1) if mttr_values else None,
            "mttd": round(sum(mttd_values) / len(mttd_values), 1) if mttd_values else None,
            "case_count": len(cases_period),
        }

    # Current period cases
    current_cases = session.exec(
        select(Case)
        .where(Case.org_id == user.org_id)
        .where(Case.created_at >= period_start)
    ).all()

    # Prior period cases
    prior_cases = session.exec(
        select(Case)
        .where(Case.org_id == user.org_id)
        .where(Case.created_at >= prior_start)
        .where(Case.created_at < prior_end)
    ).all()

    # Build recs map (case_id -> list of DefenseRecommendation)
    all_case_ids = [c.id for c in current_cases + prior_cases]
    recs_map: dict = defaultdict(list)
    if all_case_ids:
        recs = session.exec(
            select(DefenseRecommendation).where(
                DefenseRecommendation.case_id.in_(all_case_ids)
            )
        ).all()
        for r in recs:
            recs_map[r.case_id].append(r)

    current_metrics = compute_metrics(current_cases, recs_map)
    prior_metrics   = compute_metrics(prior_cases, recs_map)

    def delta(current, prior):
        if current is None or prior is None or prior == 0:
            return None
        return round((current - prior) / prior * 100, 1)

    return {
        "mttd_minutes": current_metrics["mttd"],
        "mttr_minutes": current_metrics["mttr"],
        "mttc_minutes": current_metrics["mttc"],
        "cases_analyzed": current_metrics["case_count"],
        "period_days": 30,
        "trend": {
            "mttd_delta_pct": delta(current_metrics["mttd"], prior_metrics["mttd"]),
            "mttr_delta_pct": delta(current_metrics["mttr"], prior_metrics["mttr"]),
            "mttc_delta_pct": delta(current_metrics["mttc"], prior_metrics["mttc"]),
        },
    }


@router.get("/cost")
def cost_metrics(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Cost intelligence: AI usage cost breakdown for last 30 days."""
    cutoff = datetime.utcnow() - timedelta(days=30)
    logs = session.exec(
        select(AIUsageLog).where(AIUsageLog.created_at >= cutoff)
    ).all()

    if not logs:
        return {
            "total_cost_usd_30d": 0.0,
            "cost_per_case_avg": 0.0,
            "cost_per_alert_avg": 0.0,
            "breakdown_by_operation": [],
            "daily_cost": [],
        }

    total_cost = sum(l.cost_usd for l in logs)

    # Per-operation breakdown
    by_op: dict = defaultdict(lambda: {"count": 0, "total_cost_usd": 0.0})
    for l in logs:
        by_op[l.operation]["count"] += 1
        by_op[l.operation]["total_cost_usd"] += l.cost_usd
    breakdown = [
        {"operation": op, "count": v["count"], "total_cost_usd": round(v["total_cost_usd"], 6)}
        for op, v in sorted(by_op.items(), key=lambda x: -x[1]["total_cost_usd"])
    ]

    # Unique cases that had AI usage
    case_ids = {l.case_id for l in logs if l.case_id}
    cost_per_case = round(total_cost / len(case_ids), 6) if case_ids else 0.0

    # Per-alert average (total_count as proxy for alerts)
    total_ops = len(logs)
    cost_per_alert = round(total_cost / total_ops, 6) if total_ops else 0.0

    # Daily cost for last 30 days
    daily: dict = defaultdict(float)
    for l in logs:
        day = l.created_at.strftime("%Y-%m-%d")
        daily[day] += l.cost_usd
    daily_list = [{"date": d, "cost_usd": round(v, 6)} for d, v in sorted(daily.items())]

    return {
        "total_cost_usd_30d": round(total_cost, 6),
        "cost_per_case_avg": cost_per_case,
        "cost_per_alert_avg": cost_per_alert,
        "breakdown_by_operation": breakdown,
        "daily_cost": daily_list,
    }


@router.get("/adaptive-thresholds")
def adaptive_thresholds(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """v10.1 Adaptive Thresholds Agent — current config + last 30 changes."""
    log = session.exec(
        select(AdaptiveThresholdLog)
        .where(AdaptiveThresholdLog.org_id == user.org_id)
        .order_by(AdaptiveThresholdLog.applied_at.desc())
        .limit(30)
    ).all()
    return {
        "current": adaptive_config.get_all(),
        "bounds": adaptive_config.ADJUSTMENT_BOUNDS,
        "log": log,
    }
