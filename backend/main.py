import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables, engine
from seed import seed_demo_data
from routers.auth import ensure_admin, router as auth_router
from routers.cases import router as cases_router
from routers.vt import router as vt_router
from routers.email_router import router as email_router
from routers.ioc import router as ioc_router
from routers.malware import router as malware_router
from routers.terminal import router as terminal_router
from routers.reports import router as reports_router
from routers.public import router as public_router
from routers.portfolio import router as portfolio_router

app = FastAPI(title="AegisTrace API", version="1.0.0", docs_url="/api/docs", redoc_url="/api/redoc")

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth_router)
app.include_router(cases_router)
app.include_router(vt_router)
app.include_router(email_router)
app.include_router(ioc_router)
app.include_router(malware_router)
app.include_router(terminal_router)
app.include_router(reports_router)
app.include_router(public_router)
app.include_router(portfolio_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "AegisTrace", "version": "1.0.0"}


# Serve React frontend
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR / "static")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return {"error": "Frontend not built"}
else:
    @app.get("/")
    def root():
        return {"message": "AegisTrace API running. Frontend not yet built.", "docs": "/api/docs"}


@app.on_event("startup")
async def startup():
    create_db_and_tables()
    seed_demo_data(engine)
    ensure_admin(engine)
    print("[AegisTrace] Server ready.")
