import os, time
from pathlib import Path
from collections import defaultdict
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from database import create_db_and_tables, engine
from migration import run_migrations
from seed import seed_demo_data
from routers.auth import ensure_admin, cleanup_token_blocklist, router as auth_router
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
from routers.itdr import router as itdr_router
from routers.agent_security import router as agent_security_router
from routers.connectors import router as connectors_router
from routers.nhi import router as nhi_router
from routers.health import router as health_router
from routers.simulation import router as simulation_router
from routers.defense import router as defense_router, honeypot_handler, fingerprint_request
from routers.demo import router as demo_router
from hardware_tools import router as hardware_router
from ai_router import call_ai_json
from core.identity_engine import register_default_detectors
from core.events import event_bus, Events
from models import AuditLog

# ── Rate limiter (slowapi) ────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(
    title="AegisTrace API",
    version="4.3.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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

# ── Request Size Limiter ──────────────────────────────────────────────────────
MAX_REQUEST_BODY = 10 * 1024 * 1024   # 10 MB — prevents memory exhaustion

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BODY:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large (max 10 MB)"},
            )
        return await call_next(request)

app.add_middleware(RequestSizeLimitMiddleware)

# ── Security Headers Middleware ───────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]         = "DENY"
        response.headers["X-XSS-Protection"]        = "1; mode=block"
        response.headers["Referrer-Policy"]          = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]       = "geolocation=(), microphone=(), camera=()"
        response.headers["X-Powered-By"]             = ""          # hide server info
        response.headers["Server"]                   = ""          # hide server info
        # Strict Transport Security (HTTPS only — safe for Render/VPS with SSL)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com; "
            "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.groq.com https://www.virustotal.com "
            "https://fonts.googleapis.com https://api.fontshare.com; "
            "frame-ancestors 'none';"
        )
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── AI Defense Engine — Request Fingerprinting Middleware ─────────────────────
# Pure in-memory counters — zero DB hits on the hot path.
# Only writes to DB when a threshold is actually crossed (rare).
import threading as _threading

_fp_lock = _threading.Lock()
from collections import defaultdict as _defaultdict
_fingerprint:   dict = _defaultdict(lambda: {"requests": [], "endpoints": set()})
_last_flagged:  dict = {}
SCAN_THRESHOLD_REQ = 50   # requests per minute before triage
SCAN_THRESHOLD_EP  = 15   # unique endpoints per minute before triage

class DefenseFingerprintMiddleware(BaseHTTPMiddleware):
    """
    Lightweight passive fingerprinter. Updates in-memory counters only.
    Offloads DB write + Groq triage to a background thread when threshold crossed.
    Never opens a DB session on the hot path — zero performance impact.
    """
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # Skip: health check, static files, defense endpoints themselves
        if not path.startswith("/api/") or path.startswith("/api/defense") or path == "/api/health":
            return await call_next(request)

        try:
            ip  = (request.headers.get("X-Forwarded-For") or
                   (request.client.host if request.client else "unknown")).split(",")[0].strip()
            now = time.time()

            with _fp_lock:
                fp = _fingerprint[ip]
                fp["requests"].append((now, path))
                fp["endpoints"].add(path)
                # Trim to last 60s in-memory (cheap)
                cutoff = now - 60
                fp["requests"] = [(t, p) for t, p in fp["requests"] if t > cutoff]
                fp["endpoints"] = {p for _, p in fp["requests"]}
                req_count  = len(fp["requests"])
                unique_eps = len(fp["endpoints"])

            # Only fire triage if threshold crossed AND not recently flagged
            if req_count >= SCAN_THRESHOLD_REQ or unique_eps >= SCAN_THRESHOLD_EP:
                last_flag = _last_flagged.get(ip, 0)
                if now - last_flag > 300:   # max one triage per IP per 5 minutes
                    _last_flagged[ip] = now
                    ua = request.headers.get("User-Agent", "")
                    # Offload entirely to background thread — request is not held
                    _threading.Thread(
                        target=_background_triage,
                        args=(ip, path, req_count, unique_eps, ua),
                        daemon=True
                    ).start()
        except Exception:
            pass  # defense engine must never break the main app

        return await call_next(request)

# _last_flagged and _fingerprint initialized above with DefenseFingerprintMiddleware

def _background_triage(ip, path, req_count, unique_eps, ua):
    """Runs in a background thread. Opens its own DB session. Never blocks a request."""
    try:
        import asyncio
        from database import get_session as _gs
        db = next(_gs())
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        class _FakeRequest:
            """Minimal request stand-in for the triage function."""
            class client:
                host = ip
            headers = {"User-Agent": ua, "X-Forwarded-For": ip}
            def __init__(self):
                self.headers = type("H", (), {"get": lambda self, k, d="": ua if "User" in k else ip})()
                self.client  = type("C", (), {"host": ip})()
                self.url     = type("U", (), {"path": path})()

        fake_req = _FakeRequest()
        loop.run_until_complete(fingerprint_request(fake_req, db))
        loop.close()
    except Exception as e:
        print(f"[defense] background triage error: {e}")

app.add_middleware(DefenseFingerprintMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────
for r in [auth_router, cases_router, vt_router, email_router, ioc_router,
          malware_router, terminal_router, terminal_lab_router, reports_router,
          public_router, portfolio_router, webhooks_router, hunt_router,
          audit_router, ingest_router, enrichment_router, edr_router, pcap_router,
          feeds_router, schedule_reports_router, hardware_router,
          identity_router, provenance_router, analytics_router, comments_router,
          policies_router, itdr_router, agent_security_router,
          connectors_router, nhi_router, health_router, simulation_router,
          defense_router, demo_router]:
    app.include_router(r)


# Health endpoint now served by routers/health.py


# ── Public AI Demo (rate-limited) ─────────────────────────────────────────────
_demo_calls: dict = defaultdict(list)   # ip → [timestamps]
DEMO_RATE_LIMIT = 10                    # requests per minute per IP

@app.post("/api/public/demo-analyse")
async def public_demo_analyse(request: Request, data: dict):
    # Use real IP (respects X-Forwarded-For from Render proxy)
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host or "unknown")

    now = time.time()
    window = [t for t in _demo_calls[ip] if now - t < 60]
    if len(window) >= DEMO_RATE_LIMIT:
        raise HTTPException(429, f"Rate limit: {DEMO_RATE_LIMIT} requests/minute")
    window.append(now)
    _demo_calls[ip] = window

    text = (data.get("input") or "").strip()
    if not text or len(text) > 500:
        raise HTTPException(400, "Input required (max 500 chars)")

    # Sanitise input through prompt injection shield before sending to Groq
    from core.prompt_shield import shield as _ps
    text = _ps.sanitise(text, "generic").cleaned

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


# ── AI Defense Engine — Honeypot Routes ──────────────────────────────────────
# These fake endpoints exist only to catch scanners. Real users never hit them.
_HONEYPOT_PATHS = [
    "/api/v1/admin/export",
    "/api/v1/admin/dump",
    "/api/v1/users/all",
    "/api/v1/config/secrets",
    "/api/v1/backup/download",
    "/api/debug/vars",
    "/api/internal/tokens",
    "/api/v1/admin/keys",
]
for _hp in _HONEYPOT_PATHS:
    app.add_api_route(_hp, honeypot_handler, methods=["GET", "POST"], include_in_schema=False)

# ── Agent File Downloads ──────────────────────────────────────────────────────
# Served directly from the app so users don't need GitHub access.
_AGENT_DIR = Path(__file__).parent / "agent_files"

@app.get("/api/install/{token}")
def install_bootstrap(token: str, request: Request):
    """
    Returns a Python bootstrap script personalised with the caller's token.
    Run with: python3 -c "import urllib.request; exec(urllib.request.urlopen('URL').read())"

    The bootstrap:
      1. Installs psutil silently
      2. Downloads the agent into memory (no file left on disk after run)
      3. Writes it to /tmp/aegistrace_agent.py and starts it in the background
      4. All env vars pre-set — zero manual configuration needed
    """
    server_url = str(request.base_url).rstrip("/")
    agent_url  = f"{server_url}/agent/aegistrace_agent.py"

    script = f"""
import subprocess, sys, os, urllib.request, tempfile, pathlib

TOKEN   = {repr(token)}
AGENT   = {repr(agent_url)}
SERVER  = {repr(server_url)}
LOGFILE = pathlib.Path.home() / "aegistrace.log"
AGENT_PATH = pathlib.Path("/tmp/aegistrace_agent.py")

print("\\n[AegisTrace] Installing agent...")

# 1. Install psutil
r = subprocess.run(
    [sys.executable, "-m", "pip", "install", "psutil", "-q",
     "--break-system-packages"],
    capture_output=True
)
if r.returncode != 0:
    subprocess.run([sys.executable, "-m", "pip", "install", "psutil", "-q"],
                   capture_output=True)
print("[AegisTrace] ✓ psutil ready")

# 2. Download agent
print("[AegisTrace] Downloading agent...")
AGENT_PATH.write_bytes(urllib.request.urlopen(AGENT).read())
print(f"[AegisTrace] ✓ Agent saved to {{AGENT_PATH}}")

# 3. Launch in background
import socket
hostname = socket.gethostname()
env = os.environ.copy()
env["AEGISTRACE_TOKEN"]  = TOKEN
env["AEGISTRACE_AGENT_ID"] = hostname
env["AEGISTRACE_SERVER"] = SERVER

with open(LOGFILE, "w") as log:
    proc = subprocess.Popen(
        [sys.executable, str(AGENT_PATH)],
        env=env, stdout=log, stderr=log,
        start_new_session=True,
    )

print(f"[AegisTrace] ✓ Agent started — PID {{proc.pid}}")
print(f"[AegisTrace] ✓ Endpoint: {{hostname}}")
print(f"[AegisTrace] ✓ Dashboard: {server_url}/app/endpoints")
print(f"[AegisTrace] ✓ Logs: {{LOGFILE}}")
print("[AegisTrace] You can close this terminal safely.")
"""
    return PlainTextResponse(script.strip(), media_type="text/plain")


@app.get("/agent/aegistrace_agent.py")
def download_agent():
    """Download the AegisTrace endpoint agent script."""
    f = _AGENT_DIR / "aegistrace_agent.py"
    if not f.exists():
        raise HTTPException(404, "Agent file not found — rebuild the Docker image.")
    return FileResponse(
        str(f),
        media_type="text/x-python",
        filename="aegistrace_agent.py",
        headers={"Content-Disposition": 'attachment; filename="aegistrace_agent.py"'},
    )

@app.get("/agent/install.sh")
def download_install_sh():
    """Download the AegisTrace one-command installer."""
    f = _AGENT_DIR / "install.sh"
    if not f.exists():
        raise HTTPException(404, "Installer not found — rebuild the Docker image.")
    return FileResponse(
        str(f),
        media_type="text/x-shellscript",
        filename="install.sh",
        headers={"Content-Disposition": 'attachment; filename="install.sh"'},
    )

# ── Serve React SPA ───────────────────────────────────────────────────────────
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    # Serve /static/* assets
    assets_dir = STATIC_DIR / "static"
    if assets_dir.exists():
        app.mount("/static", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Serve actual static files (images, fonts, etc.) before SPA fallback
        if full_path:
            requested = STATIC_DIR / full_path
            try:
                resolved = requested.resolve()
                static_root = STATIC_DIR.resolve()
                if resolved.is_file() and str(resolved).startswith(str(static_root)):
                    return FileResponse(str(resolved))
            except Exception:
                pass
        # Fall back to SPA index for React routes
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
        from hardware_tools import seed_builtin_devices
        with Session(engine) as _s:
            seed_builtin_devices(_s)
    except Exception as _e:
        print(f"[hardware] Seed skipped: {_e}")

    # ── Event bus handlers ────────────────────────────────────────────────────
    @event_bus.on(Events.IDENTITY_DISCOVERED)
    def on_identity_discovered(payload):
        """Trigger risk calculation when a new identity is discovered."""
        pass  # Risk calculation happens at sync time; extend here for notifications

    @event_bus.on(Events.ITDR_ALERT_FIRED)
    def on_itdr_alert(payload):
        """Log ITDR alerts to audit trail."""
        try:
            from sqlmodel import Session as S
            with S(engine) as session:
                session.add(AuditLog(
                    action="itdr_alert_fired",
                    entity_type="itdr_alert",
                    entity_id=payload.get("alert_type", ""),
                    new_value=str(payload),
                ))
                session.commit()
        except Exception as e:
            print(f"[event_bus] ITDR audit failed: {e}")

    @event_bus.on(Events.SHADOW_AI_DETECTED)
    def on_shadow_ai(payload):
        """Auto-escalate shadow AI events to ITDR."""
        pass  # Handled in ingest.py at detection time

    # ── Nightly cleanup (runs in background) ─────────────────────────────────
    import asyncio, threading

    def _nightly_cleanup():
        """Background thread for nightly maintenance tasks."""
        import time as _time
        while True:
            _time.sleep(6 * 3600)   # every 6 hours
            try:
                cleanup_token_blocklist(engine)
                print("[scheduler] Token blocklist cleanup done")
            except Exception as e:
                print(f"[scheduler] Cleanup error: {e}")
            try:
                from core.cache import cache
                removed = cache.purge_expired()
                if removed:
                    print(f"[scheduler] Cache: purged {removed} expired entries")
            except Exception as e:
                print(f"[scheduler] Cache purge error: {e}")

    threading.Thread(target=_nightly_cleanup, daemon=True).start()

    # ── Auto-generate INGEST_API_KEY if not set ───────────────────────────────
    if not os.getenv("INGEST_API_KEY"):
        import secrets as _secrets
        generated_key = _secrets.token_hex(32)
        os.environ["INGEST_API_KEY"] = generated_key
        print(f"[AegisTrace] INGEST_API_KEY auto-generated for this session.")
        print(f"[AegisTrace] Add to env vars: INGEST_API_KEY={generated_key}")
        print(f"[AegisTrace] Update your endpoint agents to use this key.")

    print("[AegisTrace v5.4] Server ready.")
    print(f"[AegisTrace] Allowed origins: {ALLOWED_ORIGINS}")
    # ── Security posture check at startup ────────────────────────────────────
    _sec_issues = []
    if os.getenv("JWT_SECRET", "") in ("", "aegistrace-secret-change-me-2025"):
        _sec_issues.append("JWT_SECRET is the default — JWT tokens can be forged. Set a 64-char random string.")
    if os.getenv("ADMIN_PIN", "") in ("", "aegis2025"):
        _sec_issues.append("ADMIN_PIN is the default 'aegis2025' — admin account is trivially guessable.")
    if not os.getenv("FERNET_KEY"):
        _sec_issues.append("FERNET_KEY not set — connector API tokens are encrypted with a derived key. Set an explicit 32-byte base64 Fernet key.")
    if _sec_issues:
        border = "=" * 70
        print(f"\n{'!'*3} SECURITY WARNINGS {'!'*3}")
        print(border)
        for i, issue in enumerate(_sec_issues, 1):
            print(f"  [{i}] {issue}")
        print(border)
        print("  Fix these before exposing this service to the internet.\n")
