"""
AegisTrace NVIDIA NIM Client
─────────────────────────────
OpenAI-compatible client pointing at NVIDIA's hosted inference API.
All phases use this module; never import openai directly in other files.

Falls back gracefully: if NVIDIA_API_KEY is not set, get_nvidia_client()
returns None and callers must handle the None case (fall back to Groq).
"""

import os
from typing import Optional

try:
    from openai import OpenAI as _OpenAI
    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False

# ── Model constants ───────────────────────────────────────────────────────────
NEMOTRON_70B  = "nvidia/llama-3.1-nemotron-70b-instruct"   # coordinator synthesis
HERMES_3      = "nousresearch/hermes-3-llama-3.1-70b"      # Phase 6: triage agent (best tool calling)
LLAMA_70B     = "meta/llama-3.1-70b-instruct"              # Phase 5: normalization, synthesis
EMBED_MODEL   = "nvidia/nv-embedqa-e5-v5"                  # Phase 2: 1024-dim embeddings
RERANK_MODEL  = "nvidia/nv-rerankqa-mistral-4b-v3"         # Phase 7: reranker for similarity search
GUARD_MODEL   = "meta/llama-guard-3-8b"                    # Phase 3: safety classifier
VISION_MODEL  = "meta/llama-3.2-11b-vision-instruct"       # Phase 8: screenshot/image analysis
CODESTRAL     = "mistralai/codestral-22b-instruct-v0.1"    # Phase 9: YARA/Sigma/KQL rule generation
LLAMA_405B    = "meta/llama-3.1-405b-instruct"             # reserved for complex synthesis

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

_client: Optional[object] = None
_initialized = False


def get_nvidia_client():
    """Return the NVIDIA NIM client, or None if not configured."""
    global _client, _initialized
    if _initialized:
        return _client
    _initialized = True

    if not _OPENAI_AVAILABLE:
        print("[nvidia] openai package not installed — NVIDIA phases disabled")
        return None

    api_key = os.environ.get("NVIDIA_API_KEY", "").strip()
    if not api_key:
        print("[nvidia] NVIDIA_API_KEY not set — NVIDIA phases disabled")
        return None

    try:
        _client = _OpenAI(base_url=NVIDIA_BASE_URL, api_key=api_key)
        print("[nvidia] NVIDIA NIM client initialized")
    except Exception as exc:
        print(f"[nvidia] Client init failed: {exc}")
        _client = None

    return _client


def is_nvidia_available() -> bool:
    return get_nvidia_client() is not None


def nvidia_chat(
    model: str,
    messages: list,
    *,
    temperature: float = 0.2,
    max_tokens: int = 1200,
    tools: list = None,
    tool_choice: str = "auto",
    response_format: dict = None,
):
    """
    Single wrapper for NVIDIA NIM chat completions.
    Returns the raw completion object, or None on failure.
    """
    client = get_nvidia_client()
    if client is None:
        return None

    kwargs = dict(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = tool_choice
    if response_format:
        kwargs["response_format"] = response_format

    try:
        return client.chat.completions.create(**kwargs)
    except Exception as exc:
        print(f"[nvidia] Chat error ({model}): {exc}")
        return None


def nvidia_rerank(query: str, passages: list[str], top_n: int = 5) -> list[dict]:
    """
    Rerank passages by relevance to query using NV-RerankQA-Mistral-4B.
    Returns list of {index, relevance_score} sorted by score descending.
    Falls back to identity order on failure.
    """
    client = get_nvidia_client()
    if client is None or not passages:
        return [{"index": i, "relevance_score": 1.0 - i * 0.01} for i in range(len(passages))]

    try:
        resp = client.post(
            "/ranking",
            json={
                "model": RERANK_MODEL,
                "query": {"role": "user", "content": query[:500]},
                "passages": [{"role": "user", "content": p[:500]} for p in passages[:20]],
                "top_n": top_n,
                "truncate": "END",
            },
        )
        if hasattr(resp, "json"):
            data = resp.json()
        else:
            data = resp
        rankings = data.get("rankings", [])
        return sorted(rankings, key=lambda x: x.get("logit", 0), reverse=True)
    except Exception as exc:
        print(f"[nvidia] Rerank error: {exc}")
        return [{"index": i, "relevance_score": 1.0} for i in range(len(passages))]


def nvidia_vision(image_b64: str, prompt: str, mime: str = "image/jpeg") -> str:
    """
    Analyze an image using Llama 3.2 Vision 11B.
    image_b64: base64-encoded image bytes.
    Returns the model's text response, or "" on failure.
    """
    client = get_nvidia_client()
    if client is None:
        return ""

    try:
        resp = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                ],
            }],
            max_tokens=1200,
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:
        print(f"[nvidia] Vision error: {exc}")
        return ""


def nvidia_embed(text: str) -> list[float]:
    """
    Embed text using NV-EmbedQA-E5-v5.
    Returns a 1024-dim float list, or [] on failure.
    """
    client = get_nvidia_client()
    if client is None:
        return []

    try:
        resp = client.embeddings.create(
            model=EMBED_MODEL,
            input=text[:8000],
            encoding_format="float",
            extra_body={"input_type": "passage", "truncate": "END"},
        )
        return resp.data[0].embedding
    except Exception as exc:
        print(f"[nvidia] Embed error: {exc}")
        return []
