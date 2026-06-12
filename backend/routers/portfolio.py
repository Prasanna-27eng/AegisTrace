from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from models import Case, VTHistory, EmailAnalysisRecord, User
from database import get_session
from routers.auth import get_current_user

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/stats")
def get_stats(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    total_cases = session.exec(select(func.count(Case.id)).where(Case.org_id == user.org_id)).one()
    closed_cases = session.exec(select(func.count(Case.id)).where(Case.org_id == user.org_id, Case.status == "closed")).one()
    public_cases = session.exec(select(func.count(Case.id)).where(Case.org_id == user.org_id, Case.is_public == True)).one()
    critical_cases = session.exec(select(func.count(Case.id)).where(Case.org_id == user.org_id, Case.severity == "critical")).one()
    high_cases = session.exec(select(func.count(Case.id)).where(Case.org_id == user.org_id, Case.severity == "high")).one()
    vt_lookups = session.exec(select(func.count(VTHistory.id)).where(VTHistory.org_id == user.org_id)).one()
    email_analyses = session.exec(select(func.count(EmailAnalysisRecord.id)).where(EmailAnalysisRecord.org_id == user.org_id)).one()

    # Count total IOCs across all cases
    all_cases = session.exec(select(Case).where(Case.org_id == user.org_id)).all()
    total_iocs = 0
    import json
    for c in all_cases:
        try:
            iocs = json.loads(c.iocs or "[]")
            total_iocs += len(iocs)
        except Exception:
            pass

    return {
        "total_cases": total_cases,
        "closed_cases": closed_cases,
        "public_cases": public_cases,
        "critical_cases": critical_cases,
        "high_cases": high_cases,
        "total_iocs": total_iocs,
        "vt_lookups": vt_lookups,
        "email_analyses": email_analyses,
    }
