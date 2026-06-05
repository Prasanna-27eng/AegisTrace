"""
AegisTrace Connector Plugin Architecture
──────────────────────────────────────────
BaseConnector: abstract class every identity provider must implement.
New integration = new file in this directory. Zero changes to existing code.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional


class BaseConnector(ABC):
    """Abstract base class for all identity source connectors."""

    name: str = ""           # Human-readable name e.g. "Azure AD"
    connector_type: str = "" # Machine key e.g. "azure_ad"

    @abstractmethod
    async def authenticate(self, credentials: dict) -> bool:
        """
        Validate credentials and store tokens.
        credentials: varies per connector type.
        Returns True if auth succeeded.
        """
        ...

    @abstractmethod
    async def sync_identities(self) -> list[dict]:
        """
        Pull all identities from the provider.
        Returns list of dicts with keys:
          label, node_type, metadata_json, privilege_level, source_connector
        """
        ...

    @abstractmethod
    async def get_login_events(self, since: datetime) -> list[dict]:
        """
        Pull authentication events since a given datetime.
        Returns list of dicts compatible with AuthEvent model fields.
        """
        ...

    @abstractmethod
    async def get_service_accounts(self) -> list[dict]:
        """
        Pull non-human identities (service principals, app registrations, etc.)
        Returns list of identity dicts.
        """
        ...

    @abstractmethod
    async def test_connection(self) -> dict:
        """
        Validate the connector is working.
        Returns {"ok": True, "message": "..."} or {"ok": False, "error": "..."}
        """
        ...
