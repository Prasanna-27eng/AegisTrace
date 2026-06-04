import os, time
from pathlib import Path
from collections import defaultdict
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from database import create_db_and_tables, engine
from migration import run_migrations
from seed import seed_demo_data
from routers.auth import ensure_admin, router as auth_router
from routers.cases import router as cases_router
from routers.vt import router as vt_router
from routers.email_router import router as email_router
from routers.ioc import router as ioc_router
from routers.malware import router as malware_router
from routers.terminal import router as terminal_router
from routers.terminal_lab import router as terminal_lab_router
from routers.reports import router as reports_router
from routers.public import router as public_router
from routers.portfolio import router as portfolio_router
from routers.webhooks import router as webhooks_router
from routers.hunt import router as hunt_router
from routers.audit import router as audit_router
from routers.ingest import router as ingest_router
from routers.enrichment import router as enrichment_router
from routers.edr import router as edr_router
from routers.pcap import router as pcap_router
from routers.feeds import router as feeds_router
from routers.schedule_reports import router as schedule_reports_router, start_scheduler
from routers.identity import router as identity_router
from routers.provenance import router as provenance_router
from routers.analytics import router as analytics_router
from routers.comments import router as comments_router
from routers.policies import router as policies_router
from hardware_tools import router as hardware_router
from ai_router import call_ai_json
from core.identity_engine import register_default_detectors

app = FastAPI(
    title="AegisTrace API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
PUBLIC_URL = os.getenv("PUBLIC_URL", "https://aegistrace-7qvn.onrender.com")
ALLOWED_ORIGINS = list({
    "http://localhost:3000",
    "http://localhost:8000",
    PUBLIC_URL,
    PUBLIC_URL.rstrip("/"),
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security Headers Middleware ───────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────
for r in [auth_router, cases_router, vt_router, email_router, ioc_router,
          malware_router, terminal_router, terminal_lab_router, reports_router,
          public_router, portfolio_router, webhooks_router, hunt_router,
          audit_router, ingest_router, enrichment_router, edr_router, pcap_router,
          feeds_router, schedule_reports_router, hardware_router,
          identity_router, provenance_router, analytics_router, comments_router,
          policies_router]:
    app.include_router(r)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "AegisTrace",
        "version": "2.0.0",
        "groq": bool(os.getenv("GROQ_API_KEY")),
        "vt": bool(os.getenv("VIRUSTOTAL_API_KEY")),
    }


# ── Public AI Demo (rate-limited) ─────────────────────────────────────────────
_demo_calls: dict = defaultdict(list)   # ip → [timestamps]
DEMO_RATE_LIMIT = 10                    # requests per minute per IP

@app.post("/api/public/demo-analyse")
async def public_demo_analyse(request: Request, data: dict):
    ip = request.client.host or "unknown"
    now = time.time()
    window = [t for t in _demo_calls[ip] if now - t < 60]
    if len(window) >= DEMO_RATE_LIMIT:
        raise HTTPException(429, f"Rate limit: {DEMO_RATE_LIMIT} requests/minute")
    window.append(now)
    _demo_calls[ip] = window

    text = (data.get("input") or "").strip()
    if not text or len(text) > 500:
        raise HTTPException(400, "Input required (max 500 chars)")

    prompt = f"""Analyse this for cybersecurity threats: {text}

Respond ONLY with valid JSON:
{{
  "verdict": "Malicious|Suspicious|Clean|Unknown",
  "risk_level": "Critical|High|Medium|Low|Clean|Unknown",
  "confidence": <0-100>,
  "type": "IP Address|Domain|URL|File Hash|Email|Text Sample|Unknown",
  "summary": "1-2 sentence plain-English assessment",
  "indicators": ["key indicator 1", "key indicator 2"],
  "recommendation": "What should an analyst do next?"
}}"""
    result = call_ai_json("demo", prompt, temperature=0.2, max_tokens=400)
    return result


# ── Serve React SPA ───────────────────────────────────────────────────────────
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    # Serve /static/* assets
    assets_dir = STATIC_DIR / "static"
    if assets_dir.exists():
        app.mount("/static", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return {"error": "Frontend not built yet"}
else:
    @app.get("/")
    def root():
        return {"message": "AegisTrace v2.0 API", "docs": "/api/docs"}


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    create_db_and_tables()   # create any NEW tables (never destroys existing)
    run_migrations(engine)   # safe column-level migrations
    seed_demo_data(engine)   # idempotent — skips if demo cases already exist
    ensure_admin(engine)     # sync admin password from ADMIN_PIN env var
    start_scheduler()        # launch background report-delivery scheduler
    register_default_detectors()  # v4.0 identity risk engine
    # ── Hardware platform startup ─────────────────────────────────────────────
    try:
        from sqlmodel import Session
        from models import HardwareDevice
        from hardware_tools import seed_builtin_devices
        with Session(engine) as _s:
            seed_builtin_devices(_s)
    except Exception as _e:
        print(f"[hardware] Seed skipped: {_e}")
    print("[AegisTrace v2.0] Server ready.")
    print(f"[AegisTrace] Allowed origins: {ALLOWED_ORIGINS}")
    # ── Security warnings for weak defaults ──────────────────────────────────
    if os.getenv("JWT_SECRET", "") in ("", "aegistrace-secret-change-me-2025"):
        print("[SECURITY WARNING] JWT_SECRET is using the default value. Set a strong random secret in environment variables!")
    if os.getenv("ADMIN_PIN", "") in ("", "aegis2025"):
        print("[SECURITY WARNING] ADMIN_PIN is using the default value 'aegis2025'. Change it in environment variables!")
