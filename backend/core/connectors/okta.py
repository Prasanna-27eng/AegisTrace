"""
AegisTrace — Okta Connector
────────────────────────────
API token auth. Pulls users, groups, logs, apps from Okta.
"""
import json, logging
from datetime import datetime
from typing import Optional
import httpx
from .base import BaseConnector
from core.ssrf_guard import validate_external_host, resolve_and_check, SSRFBlockedError

logger = logging.getLogger("aegistrace.connectors.okta")


class OktaConnector(BaseConnector):
    name           = "Okta"
    connector_type = "okta"

    def __init__(self, okta_domain: str = "", api_token: str = ""):
        self.okta_domain = okta_domain.rstrip("/")
        self.api_token   = api_token

    def _headers(self) -> dict:
        return {"Authorization": f"SSWS {self.api_token}", "Accept": "application/json"}

    async def _get(self, path: str, params: dict = None) -> dict:
        try:
            validate_external_host(self.okta_domain)
        except SSRFBlockedError as e:
            raise ValueError(f"Refusing to contact okta_domain: {e}")
        if not resolve_and_check(self.okta_domain):
            raise ValueError("Refusing to contact okta_domain: resolves to a blocked address")
        url = f"https://{self.okta_domain}{path}"
        async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
            resp = await client.get(url, headers=self._headers(), params=params or {})
            resp.raise_for_status()
            return resp.json()

    async def authenticate(self, credentials: dict) -> bool:
        try:
            self.okta_domain = credentials.get("okta_domain", self.okta_domain).rstrip("/")
            self.api_token   = credentials.get("api_token", self.api_token)
            await self.test_connection()
            return True
        except Exception as e:
            logger.error(f"Okta auth failed: {e}")
            return False

    async def sync_identities(self) -> list[dict]:
        identities = []

        # Pull users
        try:
            users = await self._get("/api/v1/users", {"limit": "200"})
            if isinstance(users, list):
                for u in users:
                    profile = u.get("profile", {})
                    identities.append({
                        "label": profile.get("login") or profile.get("email", ""),
                        "node_type": "user",
                        "privilege_level": "low",
                        "source_connector": "okta",
                        "metadata_json": json.dumps({
                            "first_name": profile.get("firstName"),
                            "last_name": profile.get("lastName"),
                            "department": profile.get("department"),
                            "title": profile.get("title"),
                            "status": u.get("status"),
                            "okta_id": u.get("id"),
                        }),
                    })
        except Exception as e:
            logger.warning(f"Okta user sync failed: {e}")

        # Pull apps (service accounts / integrations)
        try:
            apps = await self._get("/api/v1/apps", {"limit": "200"})
            if isinstance(apps, list):
                for app in apps:
                    identities.append({
                        "label": f"App: {app.get('label', '')}",
                        "node_type": "agent",
                        "privilege_level": "medium",
                        "source_connector": "okta",
                        "metadata_json": json.dumps({
                            "app_name": app.get("name"),
                            "status": app.get("status"),
                            "okta_id": app.get("id"),
                        }),
                    })
        except Exception as e:
            logger.warning(f"Okta app sync failed: {e}")

        return identities

    async def get_login_events(self, since: datetime) -> list[dict]:
        events = []
        try:
            since_str = since.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            logs = await self._get("/api/v1/logs", {"since": since_str, "limit": "500", "filter": "eventType eq \"user.session.start\""})
            if isinstance(logs, list):
                for log in logs:
                    actor = log.get("actor", {})
                    client = log.get("client", {})
                    outcome = log.get("outcome", {})
                    ip_chain = log.get("securityContext", {})
                    events.append({
                        "identity_label": actor.get("alternateId", actor.get("displayName", "")),
                        "event_type": "login" if outcome.get("result") == "SUCCESS" else "failed_login",
                        "success": outcome.get("result") == "SUCCESS",
                        "source_ip": client.get("ipAddress"),
                        "country": client.get("geographicalContext", {}).get("country"),
                        "city": client.get("geographicalContext", {}).get("city"),
                        "user_agent": client.get("userAgent", {}).get("rawUserAgent"),
                        "timestamp": log.get("published"),
                    })
        except Exception as e:
            logger.warning(f"Okta log sync failed: {e}")
        return events

    async def get_service_accounts(self) -> list[dict]:
        return []

    async def test_connection(self) -> dict:
        try:
            data = await self._get("/api/v1/org")
            return {"ok": True, "message": f"Connected to: {data.get('companyName', 'Okta')}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
