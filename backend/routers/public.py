import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import Case
from database import get_session

router = APIRouter(prefix="/api/public", tags=["public"])


def sanitize_case(case: Case) -> dict:
    """
    Public-safe case view. Strips all PII and sensitive operational fields.
    Rules:
    - customer_name: redacted (client confidentiality)
    - analyst_name: redacted (staff privacy)
    - commands_run: excluded (sensitive investigation steps)
    - affected_systems: excluded (infrastructure disclosure)
    - tools_output: excluded (tooling disclosure)
    - id: excluded (prevents total case count enumeration)
    """
    return {
        "case_number": case.case_number,
        "title": case.title,
        "severity": case.severity,
        "status": case.status,
        "incident_type": case.incident_type,
        "analyst_name": "AegisTrace Analyst",   # redacted — staff privacy
        "customer_name": "Redacted",             # redacted — client confidentiality
        "description": case.description,
        "findings": case.findings,
        "recommendations": case.recommendations,
        "iocs": json.loads(case.iocs or "[]"),
        "mitre_techniques": json.loads(case.mitre_techniques or "[]"),
        "ai_executive_summary": case.ai_executive_summary,
        "ai_technical_summary": case.ai_technical_summary,
        "ai_severity_score": case.ai_severity_score,
        # commands_run, affected_systems, tools_output, id — all intentionally excluded
        "share_token": case.share_token,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


@router.get("/cases")
def list_public_cases(session: Session = Depends(get_session)):
    cases = session.exec(select(Case).where(Case.is_public == True).order_by(Case.updated_at.desc())).all()
    return [sanitize_case(c) for c in cases]


@router.get("/{token}")
def get_public_case(token: str, session: Session = Depends(get_session)):
    case = session.exec(select(Case).where(Case.share_token == token, Case.is_public == True)).first()
    if not case:
        raise HTTPException(404, "Case not found or not public")
    return sanitize_case(case)
