"""
AegisTrace Connector Hub
─────────────────────────
Identity provider OAuth + sync.
Routes: /api/connectors/*
"""
import os, json, asyncio, logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlmodel import Session, select
from models import IdentityConnector, IdentityNode, ApprovedAIService, AuditLog
from database import get_session
from routers.auth import get_current_user, require_admin
from models import User
from core.events import event_bus, Events

logger = logging.getLogger("aegistrace.connectors")
router = APIRouter(prefix="/api/connectors", tags=["connectors"])

# ── In-memory sync state ──────────────────────────────────────────────────────
_sync_running: set = set()


# ── Helper: import identities from a connector into IdentityNode table ────────
async def _import_identities(connector_obj, connector_db: IdentityConnector, session: Session):
    """Run sync and upsert into IdentityNode."""
    try:
        connector_db.sync_status = "running"
        session.add(connector_db)
        session.commit()

        identities = await connector_obj.sync_identities()
        count = 0
        for identity in identities:
            label = identity.get("label", "").strip()
            if not label:
                continue
            # Upsert by label + source_connector
            existing = session.exec(
                select(IdentityNode)
                .where(IdentityNode.label == label)
                .where(IdentityNode.source_connector == identity.get("source_connector"))
            ).first()
            if existing:
                existing.last_active = datetime.utcnow()
                existing.metadata_json = identity.get("metadata_json", "{}")
                session.add(existing)
            else:
                node = IdentityNode(
                    label=label,
                    node_type=identity.get("node_type", "user"),
                    privilege_level=identity.get("privilege_level", "low"),
                    source_connector=identity.get("source_connector", ""),
                    metadata_json=identity.get("metadata_json", "{}"),
                    last_active=datetime.utcnow(),
                )
                session.add(node)
                session.flush()
                event_bus.emit(Events.IDENTITY_DISCOVERED, {
                    "node_id": node.id,
                    "node_type": node.node_type,
                    "source": node.source_connector,
                    "timestamp": datetime.utcnow().isoformat(),
                })
            count += 1

        session.commit()
        connector_db.sync_status = "ok"
        connector_db.last_sync = datetime.utcnow()
        connector_db.identities_discovered = count
        connector_db.last_error = None
        session.add(connector_db)
        session.commit()
        logger.info(f"Connector {connector_db.connector_type} synced {count} identities")
        return count
    except Exception as e:
        logger.error(f"Connector sync failed: {e}")
        connector_db.sync_status = "error"
        connector_db.last_error = str(e)
        session.add(connector_db)
        session.commit()
        return 0


# ── List all connectors ───────────────────────────────────────────────────────
@router.get("")
def list_connectors(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    connectors = session.exec(select(IdentityConnector)).all()
    return [
        {
            "id": c.id,
            "org_name": c.org_name,
            "connector_type": c.connector_type,
            "sync_status": c.sync_status,
            "last_sync": c.last_sync,
            "identities_discovered": c.identities_discovered,
            "is_active": c.is_active,
            "last_error": c.last_error,
        }
        for c in connectors
    ]


# ── Okta: API token connect ───────────────────────────────────────────────────
@router.post("/okta/connect")
async def okta_connect(
    data: dict,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    okta_domain = (data.get("okta_domain") or "").strip()
    api_token   = (data.get("api_token") or "").strip()
    if not okta_domain or not api_token:
        raise HTTPException(400, "okta_domain and api_token required")

    from core.connectors.okta import OktaConnector
    connector_obj = OktaConnector(okta_domain=okta_domain, api_token=api_token)
    test = await connector_obj.test_connection()
    if not test.get("ok"):
        raise HTTPException(400, f"Okta connection failed: {test.get('error')}")

    # Store connector
    existing = session.exec(
        select(IdentityConnector).where(IdentityConnector.connector_type == "okta")
    ).first()
    if existing:
        existing.encrypted_token = api_token
        existing.domain = okta_domain
        existing.is_active = True
        session.add(existing)
        session.commit()
        connector_db = existing
    else:
        connector_db = IdentityConnector(
            org_name=data.get("org_name", okta_domain),
            connector_type="okta",
            domain=okta_domain,
            encrypted_token=api_token,
            created_by=user.id,
        )
        session.add(connector_db)
        session.commit()
        session.refresh(connector_db)

    # Kick off background sync
    async def _bg_sync():
        from database import get_session as gs
        from sqlmodel import Session as S
        with S(session.bind) as new_session:
            db_conn = new_session.get(IdentityConnector, connector_db.id)
            obj = OktaConnector(okta_domain=db_conn.domain, api_token=db_conn.encrypted_token)
            await _import_identities(obj, db_conn, new_session)

    background_tasks.add_task(_bg_sync)
    return {"ok": True, "message": test["message"], "connector_id": connector_db.id}


@router.post("/okta/sync")
async def okta_sync(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    connector_db = session.exec(
        select(IdentityConnector).where(IdentityConnector.connector_type == "okta", IdentityConnector.is_active == True)
    ).first()
    if not connector_db:
        raise HTTPException(404, "Okta not connected")

    from core.connectors.okta import OktaConnector

    async def _bg_sync():
        from sqlmodel import Session as S
        with S(session.bind) as new_session:
            db_conn = new_session.get(IdentityConnector, connector_db.id)
            obj = OktaConnector(okta_domain=db_conn.domain, api_token=db_conn.encrypted_token)
            await _import_identities(obj, db_conn, new_session)

    background_tasks.add_task(_bg_sync)
    return {"ok": True, "message": "Okta sync started"}


# ── Azure AD: OAuth connect ───────────────────────────────────────────────────
@router.post("/azure/connect")
async def azure_connect(
    data: dict,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Accept client_id + client_secret + tenant_id and run app-only sync."""
    client_id     = (data.get("client_id") or "").strip()
    client_secret = (data.get("client_secret") or "").strip()
    tenant_id     = (data.get("tenant_id") or "").strip()
    if not client_id or not client_secret or not tenant_id:
        raise HTTPException(400, "client_id, client_secret, and tenant_id required")

    from core.connectors.azure_ad import AzureADConnector
    connector_obj = AzureADConnector(client_id=client_id, client_secret=client_secret, tenant_id=tenant_id)
    test = await connector_obj.test_connection()
    if not test.get("ok"):
        raise HTTPException(400, f"Azure AD connection failed: {test.get('error')}")

    existing = session.exec(
        select(IdentityConnector).where(IdentityConnector.connector_type == "azure_ad")
    ).first()
    creds_json = json.dumps({"client_id": client_id, "client_secret": client_secret, "tenant_id": tenant_id})
    if existing:
        existing.encrypted_token = creds_json
        existing.tenant_id = tenant_id
        existing.is_active = True
        session.add(existing)
        session.commit()
        connector_db = existing
    else:
        connector_db = IdentityConnector(
            org_name=data.get("org_name", "Azure AD"),
            connector_type="azure_ad",
            client_id=client_id,
            tenant_id=tenant_id,
            encrypted_token=creds_json,
            created_by=user.id,
        )
        session.add(connector_db)
        session.commit()
        session.refresh(connector_db)

    async def _bg_sync():
        from sqlmodel import Session as S
        with S(session.bind) as new_session:
            db_conn = new_session.get(IdentityConnector, connector_db.id)
            creds = json.loads(db_conn.encrypted_token)
            obj = AzureADConnector(**creds)
            await _import_identities(obj, db_conn, new_session)

    background_tasks.add_task(_bg_sync)
    return {"ok": True, "message": test["message"], "connector_id": connector_db.id}


@router.post("/azure/sync")
async def azure_sync(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    connector_db = session.exec(
        select(IdentityConnector).where(IdentityConnector.connector_type == "azure_ad", IdentityConnector.is_active == True)
    ).first()
    if not connector_db:
        raise HTTPException(404, "Azure AD not connected")

    from core.connectors.azure_ad import AzureADConnector

    async def _bg_sync():
        from sqlmodel import Session as S
        with S(session.bind) as new_session:
            db_conn = new_session.get(IdentityConnector, connector_db.id)
            creds = json.loads(db_conn.encrypted_token)
            obj = AzureADConnector(**creds)
            await _import_identities(obj, db_conn, new_session)

    background_tasks.add_task(_bg_sync)
    return {"ok": True, "message": "Azure AD sync started"}


# ── CSV Upload ────────────────────────────────────────────────────────────────
@router.post("/csv/upload")
async def csv_upload(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    content = (await file.read()).decode("utf-8", errors="replace")
    from core.connectors.csv_import import CSVImportConnector
    c = CSVImportConnector(csv_content=content)
    preview = c.parse_preview()
    # Cache the content briefly so /confirm can import it
    from core.cache import cache
    cache.set(f"csv_upload:{user.id}", content, ttl_seconds=600)
    return {"ok": True, "preview": preview}


@router.post("/csv/confirm")
async def csv_confirm(
    data: dict,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from core.cache import cache
    content = cache.get(f"csv_upload:{user.id}")
    if not content:
        raise HTTPException(400, "No pending CSV upload found. Please upload again.")

    connector_db = IdentityConnector(
        org_name=data.get("org_name", "CSV Import"),
        connector_type="csv",
        created_by=user.id,
    )
    session.add(connector_db)
    session.commit()
    session.refresh(connector_db)

    from core.connectors.csv_import import CSVImportConnector

    async def _bg_import():
        from sqlmodel import Session as S
        with S(session.bind) as new_session:
            db_conn = new_session.get(IdentityConnector, connector_db.id)
            obj = CSVImportConnector(csv_content=content)
            await _import_identities(obj, db_conn, new_session)

    background_tasks.add_task(_bg_import)
    return {"ok": True, "message": "CSV import started", "connector_id": connector_db.id}


# ── Connector status ──────────────────────────────────────────────────────────
@router.get("/{connector_id}/status")
def connector_status(
    connector_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    c = session.get(IdentityConnector, connector_id)
    if not c:
        raise HTTPException(404, "Connector not found")
    return {
        "id": c.id,
        "connector_type": c.connector_type,
        "sync_status": c.sync_status,
        "last_sync": c.last_sync,
        "identities_discovered": c.identities_discovered,
        "last_error": c.last_error,
    }


@router.delete("/{connector_id}")
def delete_connector(
    connector_id: int,
    user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    c = session.get(IdentityConnector, connector_id)
    if not c:
        raise HTTPException(404, "Connector not found")
    c.is_active = False
    c.encrypted_token = None
    session.add(c)
    session.commit()
    return {"ok": True}


# ── Approved AI Services ──────────────────────────────────────────────────────
@router.get("/approved-ai")
def list_approved_ai(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    services = session.exec(select(ApprovedAIService).where(ApprovedAIService.is_approved == True)).all()
    return [{"id": s.id, "service_name": s.service_name, "api_domain": s.api_domain} for s in services]


@router.post("/approved-ai")
def save_approved_ai(
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    services = data.get("services", [])
    # Clear existing and replace
    existing = session.exec(select(ApprovedAIService)).all()
    for s in existing:
        session.delete(s)

    _WELL_KNOWN = {
        "ChatGPT":    "api.openai.com",
        "GitHub Copilot": "api.github.com",
        "Gemini":     "generativelanguage.googleapis.com",
        "Claude":     "api.anthropic.com",
        "Perplexity": "api.perplexity.ai",
        "Mistral":    "api.mistral.ai",
        "Groq":       "api.groq.com",
    }

    for svc in services:
        name   = svc.get("name", "")
        domain = svc.get("domain", "") or _WELL_KNOWN.get(name, "")
        if domain:
            session.add(ApprovedAIService(
                service_name=name,
                api_domain=domain,
                is_approved=True,
                added_by=user.id,
            ))
    session.commit()
    return {"ok": True, "count": len(services)}
