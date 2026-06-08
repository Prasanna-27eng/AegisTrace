"""
AegisTrace Embedding Service — Phase 2 + Qdrant (v8.1)
────────────────────────────────────────────────────────
Generates case embeddings using NVIDIA NV-EmbedQA-E5-v5 (1024 dim).

Storage priority:
  1. Qdrant Cloud — filtered ANN search, org-scoped, reranker-ready
  2. SQLite JSON   — pure-Python cosine sim fallback when Qdrant unavailable

Retrieval pipeline (find_similar_cases):
  Embed query → Qdrant ANN (or SQLite cosine) → NV-RerankQA reranker → top_k
"""

import json
import math
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from nvidia_client import nvidia_embed, nvidia_rerank
import qdrant_store


# ── Cosine similarity (SQLite fallback — no numpy required) ───────────────────

def _cosine_sim(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ── Build embedding text from a case ─────────────────────────────────────────

def _case_summary_text(case) -> str:
    parts = [
        f"Title: {case.title}",
        f"Type: {case.incident_type}",
        f"Severity: {case.severity}",
        f"Description: {(case.description or '')[:600]}",
        f"Findings: {(case.findings or '')[:600]}",
    ]
    try:
        iocs = json.loads(case.iocs or "[]")
        ioc_str = " ".join(i.get("ioc", "") for i in iocs[:8])
        if ioc_str:
            parts.append(f"IOCs: {ioc_str}")
    except Exception:
        pass
    try:
        mitre = json.loads(case.mitre_techniques or "[]")
        techniques = " ".join(
            t.get("id", "") + " " + t.get("name", "") for t in mitre[:5]
        )
        if techniques:
            parts.append(f"MITRE: {techniques}")
    except Exception:
        pass
    return "\n".join(parts)


# ── Store / refresh embedding for a case ─────────────────────────────────────

def store_case_embedding(case, session: Session) -> bool:
    """
    Generate embedding and store it.
    Qdrant primary: upserts the vector with org-scoped payload.
    SQLite fallback: saves JSON embedding in CaseEmbedding row.
    Returns True on success.
    """
    text   = _case_summary_text(case)
    vector = nvidia_embed(text)
    if not vector:
        return False

    # ── Primary: Qdrant Cloud ────────────────────────────────────────────────
    if qdrant_store.is_qdrant_available():
        return qdrant_store.upsert_case(
            case_id      = case.id,
            org_id       = case.org_id,
            vector       = vector,
            case_number  = case.case_number or "",
            title        = case.title or "",
            severity     = case.severity or "",
            status       = case.status or "",
            summary_text = text,
        )

    # ── Fallback: SQLite JSON ────────────────────────────────────────────────
    from models import CaseEmbedding

    existing = session.exec(
        select(CaseEmbedding).where(CaseEmbedding.case_id == case.id)
    ).first()

    if existing:
        existing.embedding    = json.dumps(vector)
        existing.summary_text = text[:2000]
        existing.updated_at   = datetime.utcnow()
        session.add(existing)
    else:
        session.add(CaseEmbedding(
            case_id      = case.id,
            embedding    = json.dumps(vector),
            summary_text = text[:2000],
        ))
    session.commit()
    return True


# ── Semantic search ───────────────────────────────────────────────────────────

def find_similar_cases(
    query_text: str,
    session: Session,
    org_id: Optional[int] = None,
    exclude_case_id: Optional[int] = None,
    top_k: int = 3,
    min_score: float = 0.55,
) -> list[dict]:
    """
    Return up to top_k past cases semantically similar to query_text.
    Each result: {case_id, case_number, title, severity, status, score, summary_text}

    Pipeline:
      1. Embed query_text (NVIDIA NV-EmbedQA-E5-v5)
      2. Qdrant ANN search (or SQLite cosine sim fallback)
      3. NV-RerankQA reranker pass for precision (fetches top_k*3, reranks to top_k)
    """
    query_vec = nvidia_embed(query_text)
    if not query_vec:
        return []

    # ── Primary: Qdrant ANN search ───────────────────────────────────────────
    if qdrant_store.is_qdrant_available() and org_id is not None:
        candidates_raw = qdrant_store.search_similar(
            query_vec       = query_vec,
            org_id          = org_id,
            exclude_case_id = exclude_case_id,
            top_k           = top_k * 3,
            min_score       = min_score,
        )
        candidates = [(r["score"], r) for r in candidates_raw]

    # ── Fallback: SQLite cosine similarity ───────────────────────────────────
    else:
        from models import CaseEmbedding, Case

        rows   = session.exec(select(CaseEmbedding)).all()
        scored = []
        for row in rows:
            if exclude_case_id and row.case_id == exclude_case_id:
                continue
            try:
                vec   = json.loads(row.embedding or "[]")
                score = _cosine_sim(query_vec, vec)
                if score >= min_score:
                    scored.append((score, row))
            except Exception:
                continue
        scored.sort(key=lambda x: x[0], reverse=True)

        candidates = []
        for score, row in scored[: top_k * 3]:
            case = session.get(Case, row.case_id)
            if case:
                candidates.append((score, {
                    "case_id":      row.case_id,
                    "case_number":  case.case_number,
                    "title":        case.title,
                    "severity":     case.severity,
                    "status":       case.status,
                    "score":        round(float(score), 3),
                    "summary_text": row.summary_text[:400],
                }))

    if not candidates:
        return []

    # ── Phase 7: NV-RerankQA reranker ────────────────────────────────────────
    if len(candidates) > 1:
        passages = [r["summary_text"] for _, r in candidates]
        reranked = nvidia_rerank(query_text, passages, top_n=top_k)

        final, seen = [], set()
        for item in reranked:
            idx = item.get("index", 0)
            if idx < len(candidates) and idx not in seen:
                seen.add(idx)
                score, result = candidates[idx]
                result = dict(result)
                result["score"] = round(float(item.get("logit", score)), 3)
                final.append(result)
        for i, (score, result) in enumerate(candidates):
            if i not in seen and len(final) < top_k:
                final.append(result)
    else:
        final = [r for _, r in candidates]

    return final[:top_k]
