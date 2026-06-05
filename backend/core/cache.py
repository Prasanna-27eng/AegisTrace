"""
AegisTrace TTL Cache
────────────────────
Simple in-memory cache using a dict + timestamps.
No external dependencies. Thread-safe for FastAPI's async workers.
"""
import time
import threading
from typing import Any, Optional


class TTLCache:
    """
    In-memory TTL cache. Values expire after ttl_seconds.

    Usage:
        cache = TTLCache()
        cache.set("analytics:summary", data, ttl_seconds=300)
        cached = cache.get("analytics:summary")
        if cached is not None:
            return cached
    """

    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}   # key → (value, expires_at)
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            value, expires_at = entry
            if time.time() > expires_at:
                del self._store[key]
                self._misses += 1
                return None
            self._hits += 1
            return value

    def set(self, key: str, value: Any, ttl_seconds: float = 60) -> None:
        with self._lock:
            self._store[key] = (value, time.time() + ttl_seconds)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        """Remove all keys starting with prefix. Returns count removed."""
        with self._lock:
            keys_to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_remove:
                del self._store[k]
            return len(keys_to_remove)

    def purge_expired(self) -> int:
        """Remove expired entries. Call periodically for memory hygiene."""
        now = time.time()
        with self._lock:
            expired = [k for k, (_, exp) in self._store.items() if now > exp]
            for k in expired:
                del self._store[k]
            return len(expired)

    @property
    def stats(self) -> dict:
        with self._lock:
            total = self._hits + self._misses
            return {
                "entries": len(self._store),
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": f"{round(self._hits / total * 100)}%" if total > 0 else "0%",
            }


# ── Global singleton ──────────────────────────────────────────────────────────
cache = TTLCache()

# ── TTL constants ─────────────────────────────────────────────────────────────
TTL_ANALYTICS    = 300    # 5 minutes
TTL_PORTFOLIO    = 600    # 10 minutes
TTL_FEEDS        = 900    # 15 minutes
TTL_VT_PERMANENT = 86400 * 365  # 1 year (VT results are immutable per IOC)
TTL_DASHBOARD    = 60    # 60 seconds
TTL_HUNT_HEATMAP = 300   # 5 minutes
TTL_NHI_SUMMARY  = 120   # 2 minutes
