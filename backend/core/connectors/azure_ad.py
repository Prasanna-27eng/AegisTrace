"""
AegisTrace — Azure AD / Microsoft Entra ID Connector
─────────────────────────────────────────────────────
OAuth2 flow using Microsoft Graph API.
Scopes: User.Read.All, AuditLog.Read.All, Directory.Read.All
"""
import os, json, logging
from datetime import datetime, timedelta
from typing import Optional
import httpx
from .base import BaseConnector

logger = logging.getLogger("aegistrace.connectors.azure_ad")

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
AUTH_BASE  = "https://login.microsoftonline.com"
SCOPES     = "https://graph.microsoft.com/.default"


class AzureADConnector(BaseConnector):
    name           = "Azure AD / Microsoft Entra"
    connector_type = "azure_ad"

    def __init__(self, client_id: str, client_secret: str, tenant_id: str):
        self.client_id     = client_id
        self.client_secret = client_secret
        self.tenant_id     = tenant_id
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    async def _get_token(self) -> str:
        """Client credentials OAuth2 flow."""
        if self._access_token and self._token_expiry and datetime.utcnow() < self._token_expiry:
            return self._access_token
        url = f"{AUTH_BASE}/{self.tenant_id}/oauth2/v2.0/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": SCOPES,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, data=data)
            resp.raise_for_status()
            token_data = resp.json()
        self._access_token = token_data["access_token"]
        self._token_expiry = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600) - 60)
        return self._access_token

    async def _graph_get(self, path: str, params: dict = None) -> dict:
        token = await self._get_token()
        headers = {"Authorization": f"Bearer {token}"}
        url = f"{GRAPH_BASE}{path}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=headers, params=params or {})
            resp.raise_for_status()
            return resp.json()

    async def authenticate(self, credentials: dict) -> bool:
        try:
            self.client_id     = credentials.get("client_id", self.client_id)
            self.client_secret = credentials.get("client_secret", self.client_secret)
            self.tenant_id     = credentials.get("tenant_id", self.tenant_id)
            await self._get_token()
            return True
        except Exception as e:
            logger.error(f"Azure AD auth failed: {e}")
            return False

    async def sync_identities(self) -> list[dict]:
        identities = []

        # Pull users
        try:
            data = await self._graph_get("/users", {"$select": "id,displayName,userPrincipalName,jobTitle,department,accountEnabled,createdDateTime,lastSignInDateTime", "$top": "999"})
            for u in data.get("value", []):
                identities.append({
                    "label": u.get("userPrincipalName") or u.get("displayName", ""),
                    "node_type": "user",
                    "privilege_level": "low",
                    "source_connector": "azure_ad",
                    "metadata_json": json.dumps({
                        "display_name": u.get("displayName"),
                        "job_title": u.get("jobTitle"),
                        "department": u.get("department"),
                        "account_enabled": u.get("accountEnabled"),
                        "azure_id": u.get("id"),
                    }),
                })
        except Exception as e:
            logger.warning(f"Azure user sync failed: {e}")

        # Pull service principals
        try:
            data = await self._graph_get("/servicePrincipals", {"$select": "id,displayName,appId,servicePrincipalType,accountEnabled", "$top": "999"})
            for sp in data.get("value", []):
                identities.append({
                    "label": sp.get("displayName", ""),
                    "node_type": "service_account",
                    "privilege_level": "medium",
                    "source_connector": "azure_ad",
                    "metadata_json": json.dumps({
                        "app_id": sp.get("appId"),
                        "sp_type": sp.get("servicePrincipalType"),
                        "azure_id": sp.get("id"),
                    }),
                })
        except Exception as e:
            logger.warning(f"Azure service principal sync failed: {e}")

        # Pull app registrations
        try:
            data = await self._graph_get("/applications", {"$select": "id,displayName,appId,createdDateTime", "$top": "999"})
            for app in data.get("value", []):
                identities.append({
                    "label": f"App: {app.get('displayName', '')}",
                    "node_type": "agent",
                    "privilege_level": "medium",
                    "source_connector": "azure_ad",
                    "metadata_json": json.dumps({
                        "app_id": app.get("appId"),
                        "azure_id": app.get("id"),
                    }),
                })
        except Exception as e:
            logger.warning(f"Azure app sync failed: {e}")

        return identities

    async def get_login_events(self, since: datetime) -> list[dict]:
        events = []
        try:
            since_str = since.strftime("%Y-%m-%dT%H:%M:%SZ")
            data = await self._graph_get(
                "/auditLogs/signIns",
                {"$filter": f"createdDateTime ge {since_str}", "$top": "500"},
            )
            for ev in data.get("value", []):
                events.append({
                    "identity_label": ev.get("userPrincipalName", ""),
                    "event_type": "login" if ev.get("status", {}).get("errorCode") == 0 else "failed_login",
                    "success": ev.get("status", {}).get("errorCode") == 0,
                    "source_ip": ev.get("ipAddress"),
                    "country": ev.get("location", {}).get("countryOrRegion"),
                    "city": ev.get("location", {}).get("city"),
                    "user_agent": ev.get("userAgent"),
                    "timestamp": ev.get("createdDateTime"),
                })
        except Exception as e:
            logger.warning(f"Azure sign-in log sync failed: {e}")
        return events

    async def get_service_accounts(self) -> list[dict]:
        """Already included in sync_identities."""
        return []

    async def test_connection(self) -> dict:
        try:
            data = await self._graph_get("/organization", {"$select": "displayName"})
            org = data.get("value", [{}])[0].get("displayName", "Unknown")
            return {"ok": True, "message": f"Connected to: {org}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
