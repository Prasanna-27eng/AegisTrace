"""
AegisTrace Health Check
────────────────────────
GET /api/health — no auth required.
Returns status of all platform components.
"""
import os, time
from datetime import datetime
from fastapi import APIRouter
from sqlmodel import Session, text
from database import engine
from core.cache import cache

router = APIRouter(tags=["health"])

# Background job timestamps — updated by the jobs themselves
_job_last_run: dict = {}


def record_job_run(job_name: str):
    """Call this from background jobs to update their last-run timestamp."""
    _job_last_run[job_name] = datetime.utcnow().isoformat()


@router.get("/api/health")
def health_check():
    checks = {}

    # ── Database ──────────────────────────────────────────────────────────────
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # ── Groq API ──────────────────────────────────────────────────────────────
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        checks["groq_api"] = "not_configured"
    else:
        # Don't make a live call every health check — just confirm key present
        checks["groq_api"] = "configured"

    # ── VirusTotal ────────────────────────────────────────────────────────────
    vt_key = os.getenv("VIRUSTOTAL_API_KEY", "")
    checks["virustotal"] = "configured" if vt_key else "not_configured"

    # ── Background jobs ───────────────────────────────────────────────────────
    jobs = {}
    for job_name, last_run in _job_last_run.items():
        jobs[job_name] = f"last_run: {last_run}"
    if not jobs:
        jobs = {
            "trust_decay":      "not_started",
            "connector_sync":   "not_started",
            "token_cleanup":    "not_started",
        }
    checks["background_jobs"] = jobs

    # ── Cache stats ───────────────────────────────────────────────────────────
    checks["cache"] = cache.stats

    # ── Connectors ────────────────────────────────────────────────────────────
    try:
        from sqlmodel import Session as S
        from models import IdentityConnector
        from sqlmodel import select
        with S(engine) as session:
            connectors = session.exec(select(IdentityConnector).where(IdentityConnector.is_active == True)).all()
            connector_statuses = {}
            for c in connectors:
                connector_statuses[c.connector_type] = c.sync_status
            if not connector_statuses:
                connector_statuses = {"status": "none_configured"}
            checks["connectors"] = connector_statuses
    except Exception:
        checks["connectors"] = {"status": "unknown"}

    # ── Overall status ────────────────────────────────────────────────────────
    overall = "ok" if checks.get("database") == "ok" else "degraded"

    return {
        "status": overall,
        "version": "4.3.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": checks,
    }
