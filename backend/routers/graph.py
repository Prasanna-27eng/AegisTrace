"""
AegisTrace v10.0 — Attack Graph (Temporal Linker)
───────────────────────────────────────────────
Reconstructs an attack chain by correlating events across all detection
sources for a case and asking Nemotron-70B (Groq fallback) for a narrative.

Endpoints:
  GET /api/graph/reconstruct?case_id=X — correlate events + generate attack chain
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from database import get_session
from routers.auth import get_current_user
from models import User, Case
from linker import reconstruct_chain

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/reconstruct")
async def get_attack_graph(
    case_id: int = Query(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    return await reconstruct_chain(case_id, session)
