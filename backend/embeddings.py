"""
AegisTrace Embedding Service — Phase 2
───────────────────────────────────────
Generates and stores case embeddings using NVIDIA NV-EmbedQA-E5-v5.
Provides cosine similarity search for "similar past cases" retrieval.

Storage: embeddings saved as JSON text in CaseEmbedding rows (SQLite-compatible,
no vector DB required). Pure-Python cosine sim — fast enough for hundreds of cases.
"""

import json
import math
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from nvidia_client import nvidia_embed


# ── Cosine similarity (pure Python — no numpy required) ───────────────────────

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
    """Flatten case fields into a single text block for embedding."""
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
        techniques = " ".join(t.get("id", "") + " " + t.get("name", "") for t in mitre[:5])
        if techniques:
            parts.append(f"MITRE: {techniques}")
    except Exception:
        pass
    return "\n".join(parts)


# ── Store / refresh embedding for a case ─────────────────────────────────────

def store_case_embedding(case, session: Session) -> bool:
    """
    Generate and store (or update) the embedding for a case.
    Returns True on success, False if NVIDIA unavailable or error.
    """
    from models import CaseEmbedding

    text   = _case_summary_text(case)
    vector = nvidia_embed(text)
    if not vector:
        return False

    existing = session.exec(
        select(CaseEmbedding).where(CaseEmbedding.case_id == case.id)
    ).first()

    if existing:
        existing.embedding    = json.dumps(vector)
        existing.summary_text = text[:2000]
        existing.updated_at   = datetime.utcnow()
        session.add(existing)
    else:
        emb = CaseEmbedding(
            case_id      = case.id,
            embedding    = json.dumps(vector),
            summary_text = text[:2000],
        )
        session.add(emb)

    session.commit()
    return True


# ── Semantic search ───────────────────────────────────────────────────────────

def find_similar_cases(
    query_text: str,
    session: Session,
    exclude_case_id: Optional[int] = None,
    top_k: int = 3,
    min_score: float = 0.55,
) -> list[dict]:
    """
    Return up to `top_k` past cases semantically similar to query_text.
    Each result: {case_id, case_number, title, score, summary_text}
    """
    from models import CaseEmbedding, Case

    query_vec = nvidia_embed(query_text)
    if not query_vec:
        return []

    rows = session.exec(select(CaseEmbedding)).all()
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
    results = []
    for score, row in scored[:top_k]:
        case = session.get(Case, row.case_id)
        if case:
            results.append({
                "case_id":      row.case_id,
                "case_number":  case.case_number,
                "title":        case.title,
                "severity":     case.severity,
                "status":       case.status,
                "score":        round(score, 3),
                "summary_text": row.summary_text[:400],
            })
    return results
