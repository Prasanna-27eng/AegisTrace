"""
AegisTrace Case Knowledge Base — Feature 3
───────────────────────────────────────────
Extracts and stores threat knowledge from closed cases.
Used to seed investigation context and reduce mean time to respond.

GET  /api/knowledge                     — list all knowledge entries
GET  /api/knowledge/relevant?case_id=N  — top 3 relevant entries for a case
"""
import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select

from database import get_session
from models import Case, CaseKnowledge, User
from routers.auth import get_current_user
from ai_router import call_ai_json

logger = logging.getLogger("aegistrace.knowledge")
router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


async def extract_case_knowledge(case_id: int, db: Session) -> None:
    """
    Background task: extract threat knowledge from a closed case via LLM.
    Creates a CaseKnowledge row. Fails gracefully if LLM is unavailable.
    """
    try:
        case = db.get(Case, case_id)
        if not case:
            logger.warning(f"[knowledge] Case {case_id} not found for knowledge extraction")
            return

        # Don't re-extract if already done
        existing = db.exec(
            select(CaseKnowledge).where(CaseKnowledge.case_id == case_id)
        ).first()
        if existing:
            return

        prompt = f"""You are a cybersecurity knowledge extraction engine.
Analyse this closed security incident and extract structured knowledge for future use.

Case: {case.case_number} — {case.title}
Severity: {case.severity} | Type: {case.incident_type}
Description: {(case.description or '')[:800]}
Findings: {(case.findings or '')[:800]}
Recommendations: {(case.recommendations or '')[:400]}
MITRE Techniques: {case.mitre_techniques or '[]'}

Extract the following and respond ONLY with valid JSON:
{{
  "title": "Short descriptive title for this threat pattern (max 80 chars)",
  "threat_pattern": "1-2 sentences describing the threat pattern observed",
  "identity_type": "user|service_account|api_key|machine|ai_agent",
  "root_cause": "1-2 sentences on the root cause of this incident",
  "resolution_steps": ["step 1", "step 2", "step 3"],
  "tags": ["tag1", "tag2", "tag3"]
}}"""

        result = call_ai_json("analysis", prompt, temperature=0.2, max_tokens=600)
        if result.get("parse_error"):
            logger.warning(f"[knowledge] LLM parse error for case {case_id}")
            return

        knowledge = CaseKnowledge(
            case_id=case_id,
            title=result.get("title", case.title)[:200],
            threat_pattern=result.get("threat_pattern", ""),
            identity_type=result.get("identity_type", "user"),
            root_cause=result.get("root_cause", ""),
            resolution_steps=json.dumps(result.get("resolution_steps", [])),
            tags=json.dumps(result.get("tags", [])),
        )
        db.add(knowledge)
        db.commit()
        logger.info(f"[knowledge] Extracted knowledge for case {case_id}: {knowledge.title}")

    except Exception as e:
        logger.error(f"[knowledge] Failed to extract knowledge for case {case_id}: {e}")


@router.get("")
def list_knowledge(
    identity_type: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """List all CaseKnowledge entries. Filter by identity_type or tag."""
    query = select(CaseKnowledge).order_by(CaseKnowledge.created_at.desc())
    entries = db.exec(query).all()

    result = []
    for e in entries:
        try:
            tags_list = json.loads(e.tags or "[]")
            steps_list = json.loads(e.resolution_steps or "[]")
        except Exception:
            tags_list = []
            steps_list = []

        # Filter by identity_type
        if identity_type and e.identity_type != identity_type:
            continue

        # Filter by tag
        if tag and tag not in tags_list:
            continue

        result.append({
            "id": e.id,
            "case_id": e.case_id,
            "title": e.title,
            "threat_pattern": e.threat_pattern,
            "identity_type": e.identity_type,
            "root_cause": e.root_cause,
            "resolution_steps": steps_list,
            "tags": tags_list,
            "times_referenced": e.times_referenced,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })

    return result


@router.get("/relevant")
def get_relevant_knowledge(
    case_id: int = Query(...),
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    Find top 3 most relevant knowledge entries for the given case.
    Scoring: +2 for matching identity_type, +1 per matching tag.
    """
    case = db.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    try:
        case_techniques = json.loads(case.mitre_techniques or "[]")
        case_technique_ids = {
            t.get("id", "").upper() if isinstance(t, dict) else str(t).upper()
            for t in case_techniques
        }
    except Exception:
        case_technique_ids = set()

    # Use incident_type as a proxy for identity_type guess
    identity_type_map = {
        "phishing": "user",
        "brute_force": "user",
        "credential_stuffing": "user",
        "identity": "user",
        "siem_alert": "user",
        "exfiltration": "service_account",
        "malware": "machine",
        "endpoint_compromise": "machine",
        "ai_threat": "ai_agent",
        "nhi": "api_key",
    }
    case_identity_type = identity_type_map.get(case.incident_type or "", "user")

    all_knowledge = db.exec(select(CaseKnowledge)).all()
    scored = []

    for k in all_knowledge:
        if k.case_id == case_id:
            continue  # don't recommend own knowledge
        score = 0

        # +2 for matching identity type
        if k.identity_type == case_identity_type:
            score += 2

        # +1 per matching tag that overlaps with MITRE techniques
        try:
            k_tags = json.loads(k.tags or "[]")
        except Exception:
            k_tags = []

        for tag in k_tags:
            if tag.upper() in case_technique_ids:
                score += 1

        scored.append((score, k))

    # Sort by score descending, take top 3
    scored.sort(key=lambda x: -x[0])
    top3 = [k for score, k in scored[:3] if score > 0 or len(scored) <= 3]

    result = []
    for k in top3[:3]:
        try:
            tags_list = json.loads(k.tags or "[]")
            steps_list = json.loads(k.resolution_steps or "[]")
        except Exception:
            tags_list = []
            steps_list = []

        # Increment times_referenced
        k.times_referenced += 1
        db.add(k)

        result.append({
            "id": k.id,
            "case_id": k.case_id,
            "title": k.title,
            "threat_pattern": k.threat_pattern,
            "identity_type": k.identity_type,
            "root_cause": k.root_cause,
            "resolution_steps": steps_list,
            "tags": tags_list,
            "times_referenced": k.times_referenced,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        })

    db.commit()
    return result
