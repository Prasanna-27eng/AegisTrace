"""
AegisTrace Semantic Search Router — Phase 2
────────────────────────────────────────────
Endpoints:
  GET  /api/semantic/cases/{case_id}/similar   — top-3 similar past cases
  POST /api/semantic/cases/{case_id}/embed     — (re)generate embedding for a case
  POST /api/semantic/search                    — free-text semantic search over all cases
  POST /api/ingest/normalize                   — Phase 5: normalize raw alert → case schema
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from database import get_session
from routers.auth import get_current_user
from models import User, Case
from embeddings import find_similar_cases, store_case_embedding
from ingest_normalizer import normalize_alert, normalize_batch
from nvidia_client import is_nvidia_available

router = APIRouter(tags=["semantic"])


# ── Similar cases ─────────────────────────────────────────────────────────────

@router.get("/api/semantic/cases/{case_id}/similar")
def get_similar_cases(
    case_id: int,
    top_k: int = 3,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    if not is_nvidia_available():
        return {"similar_cases": [], "note": "NVIDIA_API_KEY not configured"}

    query = f"{case.title} {case.incident_type} {(case.description or '')[:400]}"
    results = find_similar_cases(query, session, org_id=user.org_id, exclude_case_id=case_id, top_k=top_k)
    return {"similar_cases": results, "count": len(results)}


# ── Refresh embedding for a case ──────────────────────────────────────────────

@router.post("/api/semantic/cases/{case_id}/embed")
def embed_case(
    case_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if user.role not in ("admin", "analyst"):
        raise HTTPException(403, "Analysts and admins only")

    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    if not is_nvidia_available():
        return {"ok": False, "note": "NVIDIA_API_KEY not configured"}

    success = store_case_embedding(case, session)
    return {"ok": success, "case_id": case_id}


# ── Free-text semantic search ─────────────────────────────────────────────────

@router.post("/api/semantic/search")
def semantic_search(
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = (data.get("query") or "").strip()[:500]
    if not query:
        raise HTTPException(400, "query required")

    if not is_nvidia_available():
        return {"results": [], "note": "NVIDIA_API_KEY not configured"}

    top_k   = min(int(data.get("top_k", 5)), 10)
    results = find_similar_cases(query, session, org_id=user.org_id, top_k=top_k, min_score=0.50)
    return {"results": results, "count": len(results), "query": query}


# ── Alert normalization (Phase 5) ─────────────────────────────────────────────

@router.post("/api/ingest/normalize")
def normalize_raw_alert(
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Normalize a raw alert from any source into AegisTrace case fields.
    Optionally auto-create a case from the normalized result.
    """
    raw_alert   = data.get("alert")
    source_hint = data.get("source", "unknown")
    auto_create = data.get("auto_create_case", False)

    if not raw_alert:
        raise HTTPException(400, "alert field required")

    normalized = normalize_alert(raw_alert, source_hint)

    if auto_create and not normalized.get("error"):
        from routers.cases import next_case_number
        import json as _json
        from datetime import datetime
        new_case = Case(
            case_number    = next_case_number(session),
            title          = normalized.get("title", "Normalized Alert"),
            description    = normalized.get("description", ""),
            severity       = normalized.get("severity", "medium"),
            incident_type  = normalized.get("incident_type", "other"),
            affected_systems = normalized.get("affected_systems", ""),
            iocs           = _json.dumps(normalized.get("iocs", [])),
            mitre_techniques = _json.dumps(normalized.get("mitre_techniques", [])),
            org_id         = user.org_id,
            status         = "open",
            created_at     = datetime.utcnow(),
            updated_at     = datetime.utcnow(),
        )
        session.add(new_case)
        session.commit()
        session.refresh(new_case)
        normalized["created_case_id"]     = new_case.id
        normalized["created_case_number"] = new_case.case_number

    return normalized


@router.post("/api/ingest/normalize/batch")
def normalize_alert_batch(
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    alerts      = data.get("alerts", [])
    source_hint = data.get("source", "unknown")
    if not alerts or not isinstance(alerts, list):
        raise HTTPException(400, "alerts must be a non-empty list")
    if len(alerts) > 50:
        raise HTTPException(400, "Maximum 50 alerts per batch")

    results = normalize_batch(alerts, source_hint)
    return {"normalized": results, "count": len(results), "source": source_hint}
