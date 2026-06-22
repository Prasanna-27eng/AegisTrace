"""
AegisTrace Memory Forensics API — v6.2  (Layer 4)
──────────────────────────────────────────────────
GET /api/memory/dumps?hostname=X  — list dumps for a host (authenticated)
GET /api/memory/dumps/{id}         — get single dump + analysis (authenticated)
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select
from models import MemoryDump, User
from database import get_session
from routers.auth import get_current_user

router = APIRouter(tags=["memory"])


@router.get("/api/memory/dumps")
def list_dumps(
    hostname: str = Query(default=""),
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List memory dumps for the authenticated user's org, optionally filtered by hostname."""
    q = select(MemoryDump).where(MemoryDump.org_id == _user.org_id)
    if hostname:
        q = q.where(MemoryDump.hostname == hostname)
    q = q.order_by(MemoryDump.captured_at.desc()).limit(50)
    return session.exec(q).all()


@router.get("/api/memory/dumps/{dump_id}")
def get_dump(
    dump_id: int,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get a single memory dump record with full Volatility analysis."""
    dump = session.get(MemoryDump, dump_id)
    if not dump or dump.org_id != _user.org_id:
        raise HTTPException(404, "Memory dump not found")
    return dump
