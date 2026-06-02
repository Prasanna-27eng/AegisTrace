"""
AegisTrace Threat Hunting Engine
─────────────────────────────────
Cross-case queries: IOC frequency, MITRE heatmap, timeline activity,
global IOC search, campaign detection.
"""
import json
from collections import Counter
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from models import Case, IOCCorrelation, TimelineEvent, AuditLog, EvidenceArtifact
from database import get_session
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
    """All IOCs ranked by number of cases they appear in."""
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
            if case:
                cases.append({
                    "id": case.id,
                    "case_number": case.case_number,
                    "title": case.title,
                    "severity": case.severity,
                })
        result.append({
            "id": c.id,
            "ioc": c.ioc,
            "ioc_type": c.ioc_type,
            "case_count": c.case_count,
            "first_seen": c.first_seen,
            "last_seen": c.last_seen,
            "cases": cases,
            "is_campaign": c.case_count >= 3,
        })
    return result


@router.get("/mitre")
def mitre_heatmap(
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """MITRE ATT&CK technique frequency across all cases."""
    cases = session.exec(select(Case)).all()
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
    """Recent audit log activity for the hunt dashboard."""
    since = datetime.utcnow() - timedelta(days=days)
    logs = session.exec(
        select(AuditLog)
        .where(AuditLog.timestamp >= since)
        .where(AuditLog.entity_type != "user_pw")   # never surface password events
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

    # IOC correlation matches
    corr_hits = session.exec(
        select(IOCCorrelation).where(IOCCorrelation.ioc.contains(q)).limit(20)
    ).all()
    for c in corr_hits:
        results["ioc_matches"].append({
            "ioc": c.ioc,
            "ioc_type": c.ioc_type,
            "case_count": c.case_count,
        })

    # Case text matches
    from sqlalchemy import or_
    case_hits = session.exec(
        select(Case).where(or_(
            Case.title.contains(q),
            Case.findings.contains(q),
            Case.description.contains(q),
            Case.commands_run.contains(q),
            Case.case_number.contains(q),
        )).limit(20)
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
            if case:
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
        campaigns.append({
            "ioc": c.ioc,
            "ioc_type": c.ioc_type,
            "case_count": c.case_count,
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
    """High-level stats for threat hunting dashboard."""
    total_cases = session.exec(select(func.count(Case.id))).one()
    total_iocs  = session.exec(select(func.count(IOCCorrelation.id))).one()
    campaign_iocs = session.exec(
        select(func.count(IOCCorrelation.id))
        .where(IOCCorrelation.case_count >= 3)
    ).one()
    malicious_iocs = len([
        c for c in session.exec(select(IOCCorrelation)).all()
        if c.case_count >= 2
    ])
    recent_events = session.exec(
        select(func.count(TimelineEvent.id))
        .where(TimelineEvent.timestamp >= datetime.utcnow() - timedelta(days=7))
    ).one()
    return {
        "total_cases": total_cases,
        "total_iocs_tracked": total_iocs,
        "campaign_iocs": campaign_iocs,
        "multi_case_iocs": malicious_iocs,
        "events_last_7_days": recent_events,
    }
