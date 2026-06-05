"""
AegisTrace — CSV Import Connector
───────────────────────────────────
Upload a CSV file, auto-detect columns, preview, then import identities.
"""
import csv, io, json, logging
from .base import BaseConnector
from datetime import datetime

logger = logging.getLogger("aegistrace.connectors.csv")


# Column aliases for auto-detection
_ALIASES = {
    "label":           ["name", "displayname", "username", "email", "login", "upn", "label"],
    "node_type":       ["type", "node_type", "identity_type", "account_type"],
    "privilege_level": ["privilege", "privilege_level", "role", "access_level"],
    "department":      ["department", "dept", "team", "group"],
    "email":           ["email", "emailaddress", "mail"],
    "status":          ["status", "account_status", "enabled", "active"],
}

_NODE_TYPE_MAP = {
    "user": "user", "human": "user", "employee": "user",
    "service": "service_account", "service_account": "service_account", "svc": "service_account",
    "api": "api_key", "apikey": "api_key", "api_key": "api_key",
    "token": "token",
    "device": "device", "machine": "device",
    "agent": "agent", "bot": "agent",
}

_PRIVILEGE_MAP = {
    "admin": "admin", "administrator": "admin", "root": "admin",
    "high": "high", "privileged": "high", "elevated": "high",
    "medium": "medium", "standard": "medium",
    "low": "low", "readonly": "low", "read-only": "low",
}


def _detect_column(header: str) -> str | None:
    """Map a CSV column header to a known field name."""
    h = header.lower().strip().replace(" ", "").replace("_", "")
    for field, aliases in _ALIASES.items():
        for alias in aliases:
            if h == alias.replace("_", ""):
                return field
    return None


class CSVImportConnector(BaseConnector):
    name           = "CSV Import"
    connector_type = "csv"

    def __init__(self, csv_content: str = ""):
        self.csv_content = csv_content
        self._column_map: dict = {}

    async def authenticate(self, credentials: dict) -> bool:
        self.csv_content = credentials.get("csv_content", "")
        return bool(self.csv_content.strip())

    def parse_preview(self, csv_content: str = None) -> dict:
        """
        Parse CSV and return column mapping preview without importing.
        Returns {columns, detected_mapping, sample_rows, row_count}
        """
        content = csv_content or self.csv_content
        reader = csv.DictReader(io.StringIO(content))
        headers = reader.fieldnames or []

        detected = {}
        for h in headers:
            field = _detect_column(h)
            if field:
                detected[h] = field

        rows = []
        for i, row in enumerate(reader):
            if i >= 5:
                break
            rows.append(dict(row))

        # Count total
        total = content.count("\n")

        return {
            "columns": headers,
            "detected_mapping": detected,
            "sample_rows": rows,
            "row_count": max(total - 1, len(rows)),
        }

    async def sync_identities(self) -> list[dict]:
        identities = []
        if not self.csv_content.strip():
            return identities

        reader = csv.DictReader(io.StringIO(self.csv_content))
        headers = reader.fieldnames or []

        # Build column map
        col_map = {}
        for h in headers:
            field = _detect_column(h)
            if field:
                col_map[h] = field

        for row in reader:
            identity = {
                "node_type": "user",
                "privilege_level": "low",
                "source_connector": "csv",
                "metadata_json": "{}",
            }
            meta = {}
            for col, val in row.items():
                field = col_map.get(col)
                if field == "label":
                    identity["label"] = val.strip()
                elif field == "node_type":
                    identity["node_type"] = _NODE_TYPE_MAP.get(val.lower().strip(), "user")
                elif field == "privilege_level":
                    identity["privilege_level"] = _PRIVILEGE_MAP.get(val.lower().strip(), "low")
                else:
                    meta[col] = val

            if "label" not in identity or not identity["label"]:
                # Use first column as label fallback
                first_val = list(row.values())[0] if row else ""
                identity["label"] = first_val.strip()

            identity["metadata_json"] = json.dumps(meta)
            identities.append(identity)

        return identities

    async def get_login_events(self, since: datetime) -> list[dict]:
        return []

    async def get_service_accounts(self) -> list[dict]:
        return []

    async def test_connection(self) -> dict:
        if self.csv_content.strip():
            preview = self.parse_preview()
            return {"ok": True, "message": f"{preview['row_count']} rows detected"}
        return {"ok": False, "error": "No CSV content provided"}
