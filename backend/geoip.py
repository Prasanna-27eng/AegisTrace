"""
GeoIP — offline IP -> country lookups via MaxMind GeoLite2.
─────────────────────────────────────────────────────────────
Used by ITDR (create_auth_event / create_bulk_events) to auto-fill
AuthEvent.country from source_ip when no country is supplied, so the
impossible-travel detector has data to work with even for raw IP-only
log lines.

Requires MAXMIND_LICENSE_KEY env var (free account:
https://www.maxmind.com/en/geolite2/signup). Without it, lookups are
no-ops and country continues to come from manual entry / AI log parsing
as before — this module is purely additive.
"""
import os
import tarfile
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Optional

_DB_DIR  = Path(os.getenv("GEOIP_DB_DIR", "/var/data"))
_DB_PATH = _DB_DIR / "GeoLite2-Country.mmdb"
_DOWNLOAD_URL = (
    "https://download.maxmind.com/app/geoip_download"
    "?edition_id=GeoLite2-Country&license_key={key}&suffix=tar.gz"
)
_MAX_AGE_SECONDS = 35 * 24 * 3600  # MaxMind ships weekly updates; refresh monthly

_reader = None
_init_done = False


def _ensure_db() -> Optional[Path]:
    """Return a usable GeoLite2-Country.mmdb path, downloading/refreshing if needed."""
    key = os.getenv("MAXMIND_LICENSE_KEY")
    if _DB_PATH.exists():
        fresh = (time.time() - _DB_PATH.stat().st_mtime) < _MAX_AGE_SECONDS
        if fresh or not key:
            return _DB_PATH
    if not key:
        return None

    try:
        _DB_DIR.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(suffix=".tar.gz") as tmp:
            urllib.request.urlretrieve(_DOWNLOAD_URL.format(key=key), tmp.name)
            with tarfile.open(tmp.name, "r:gz") as tf:
                for member in tf.getmembers():
                    if member.name.endswith(".mmdb"):
                        member.name = _DB_PATH.name  # flatten into _DB_DIR
                        tf.extract(member, _DB_DIR)
                        break
        return _DB_PATH if _DB_PATH.exists() else None
    except Exception as e:
        print(f"[geoip] GeoLite2 download failed: {e}")
        return _DB_PATH if _DB_PATH.exists() else None


def init() -> bool:
    """Call once at startup. Returns True if country lookups are available."""
    global _reader, _init_done
    if _init_done:
        return _reader is not None
    _init_done = True

    db_path = _ensure_db()
    if not db_path:
        return False
    try:
        import geoip2.database
        _reader = geoip2.database.Reader(str(db_path))
        return True
    except Exception as e:
        print(f"[geoip] Reader init failed: {e}")
        return False


def lookup_country(ip: Optional[str]) -> Optional[str]:
    """Return the ISO 3166-1 alpha-2 country code for `ip`, or None if unavailable."""
    if not ip:
        return None
    if not _init_done:
        init()
    if not _reader:
        return None
    try:
        return _reader.country(ip).country.iso_code
    except Exception:
        return None
