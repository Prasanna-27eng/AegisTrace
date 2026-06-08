"""
AegisTrace Qdrant Vector Store
────────────────────────────────
Replaces SQLite JSON embedding storage with Qdrant Cloud for ANN search.
Provides org-scoped filtered search and idempotent collection management.

Gracefully disabled when QDRANT_URL env var is not set — falls back to
the SQLite cosine-similarity path in embeddings.py automatically.
"""

import os
import logging
from typing import Optional

log = logging.getLogger(__name__)

QDRANT_URL     = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
COLLECTION     = "aegistrace_cases"
VECTOR_SIZE    = 1024   # NV-EmbedQA-E5-v5 output dimension

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not QDRANT_URL:
        return None
    try:
        from qdrant_client import QdrantClient
        _client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY or None,
            timeout=10,
        )
        return _client
    except Exception as e:
        log.warning("Qdrant client init failed: %s", e)
        return None


def is_qdrant_available() -> bool:
    return bool(QDRANT_URL) and _get_client() is not None


def init_collection() -> None:
    """Create the collection if it doesn't exist. Idempotent — safe to call at every startup."""
    client = _get_client()
    if not client:
        log.info("Qdrant: QDRANT_URL not set — using SQLite fallback for embeddings")
        return
    try:
        from qdrant_client.models import Distance, VectorParams
        existing = {c.name for c in client.get_collections().collections}
        if COLLECTION not in existing:
            client.create_collection(
                collection_name=COLLECTION,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            log.info("Qdrant: created collection '%s'", COLLECTION)
        else:
            log.info("Qdrant: collection '%s' ready", COLLECTION)
    except Exception as e:
        log.warning("Qdrant init_collection failed: %s", e)


def upsert_case(
    case_id: int,
    org_id: int,
    vector: list[float],
    case_number: str,
    title: str,
    severity: str,
    status: str,
    summary_text: str,
) -> bool:
    """
    Upsert a case embedding into Qdrant.
    Uses case_id as the point ID (integer) so re-analysis overwrites cleanly.
    Returns True on success.
    """
    client = _get_client()
    if not client:
        return False
    try:
        from qdrant_client.models import PointStruct
        client.upsert(
            collection_name=COLLECTION,
            points=[
                PointStruct(
                    id=case_id,
                    vector=vector,
                    payload={
                        "case_id":      case_id,
                        "org_id":       org_id,
                        "case_number":  case_number,
                        "title":        title,
                        "severity":     severity,
                        "status":       status,
                        "summary_text": summary_text[:2000],
                    },
                )
            ],
        )
        return True
    except Exception as e:
        log.warning("Qdrant upsert failed for case %s: %s", case_id, e)
        return False


def search_similar(
    query_vec: list[float],
    org_id: int,
    exclude_case_id: Optional[int] = None,
    top_k: int = 9,            # fetch 3x candidates so the reranker has material
    min_score: float = 0.55,
) -> list[dict]:
    """
    Filtered ANN search scoped to org_id.
    Returns up to top_k results: {case_id, case_number, title, severity, status, score, summary_text}
    Results with score < min_score are dropped by the Qdrant score_threshold.
    """
    client = _get_client()
    if not client:
        return []
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue, HasIdCondition

        must     = [FieldCondition(key="org_id", match=MatchValue(value=org_id))]
        must_not = [HasIdCondition(has_id=[exclude_case_id])] if exclude_case_id else []

        hits = client.search(
            collection_name=COLLECTION,
            query_vector=query_vec,
            query_filter=Filter(must=must, must_not=must_not or None),
            limit=top_k,
            score_threshold=min_score,
        )

        return [
            {
                "case_id":      h.id,
                "case_number":  (h.payload or {}).get("case_number", ""),
                "title":        (h.payload or {}).get("title", ""),
                "severity":     (h.payload or {}).get("severity", ""),
                "status":       (h.payload or {}).get("status", ""),
                "score":        round(float(h.score), 3),
                "summary_text": (h.payload or {}).get("summary_text", "")[:400],
            }
            for h in hits
        ]
    except Exception as e:
        log.warning("Qdrant search failed: %s", e)
        return []
