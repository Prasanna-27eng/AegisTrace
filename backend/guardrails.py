"""
AegisTrace Guardrails — Phase 3
─────────────────────────────────
Llama Guard 3 safety classifier applied to all AI chat inputs.
Runs alongside the existing PromptShield (v5.3) — defense in depth.

Llama Guard returns "safe" or "unsafe\n<category>" where categories are:
  S1  Violent Crimes          S5  Defamation
  S2  Non-Violent Crimes      S6  Specialized Advice
  S3  Sex-Related Crimes      S7  Privacy
  S4  Child Sexual Exploit    S8  Intellectual Property
  S9  Indiscriminate Weapons  S10 Hate
  S11 Suicide & Self-Harm     S12 Sexual Content
  S13 Elections               S14 Code Interpreter Abuse

For a SOC platform the relevant blocks are: S2 (credential harvesting requests),
S9 (weapons requests), S14 (code interpreter misuse / prompt injection attempts).
"""

import os
from typing import Optional

from nvidia_client import get_nvidia_client, GUARD_MODEL

# ── Category descriptions for API responses ───────────────────────────────────
_CATEGORIES = {
    "S1": "Violent content", "S2": "Non-violent crime facilitation",
    "S3": "Sex-related crime", "S4": "Child safety",
    "S5": "Defamation", "S6": "Unauthorized specialized advice",
    "S7": "Privacy violation", "S8": "IP infringement",
    "S9": "Weapon-related content", "S10": "Hate speech",
    "S11": "Self-harm content", "S12": "Sexual content",
    "S13": "Election interference", "S14": "Code interpreter / injection abuse",
}

_GUARD_ENABLED = os.environ.get("NVIDIA_GUARDRAILS", "true").lower() != "false"


def safety_check(user_message: str) -> dict:
    """
    Run Llama Guard on a user message.

    Returns:
        {"safe": True}
        {"safe": False, "category": "S14", "label": "Code interpreter / injection abuse"}
    """
    if not _GUARD_ENABLED:
        return {"safe": True}

    client = get_nvidia_client()
    if client is None:
        return {"safe": True}   # if NVIDIA unavailable, don't block — shield still runs

    # Llama Guard expects a conversation format
    formatted = f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{user_message[:2000]}<|eot_id|>"

    try:
        resp = client.chat.completions.create(
            model=GUARD_MODEL,
            messages=[{"role": "user", "content": formatted}],
            max_tokens=20,
            temperature=0.0,
        )
        raw = resp.choices[0].message.content.strip()
    except Exception as exc:
        print(f"[guardrails] Llama Guard call failed: {exc}")
        return {"safe": True}

    if raw.lower().startswith("safe"):
        return {"safe": True}

    # Parse "unsafe\nS14" or "unsafe S14"
    category = None
    lines = raw.replace("\n", " ").split()
    for token in lines:
        token = token.strip().upper()
        if token in _CATEGORIES:
            category = token
            break

    return {
        "safe":     False,
        "category": category or "unknown",
        "label":    _CATEGORIES.get(category, "Policy violation"),
        "raw":      raw[:80],
    }


def assert_safe(user_message: str) -> Optional[str]:
    """
    Returns None if safe, or an error string to return to the caller.
    Use as a fast gate in route handlers.
    """
    result = safety_check(user_message)
    if result["safe"]:
        return None
    label = result.get("label", "Policy violation")
    return f"Message blocked by safety policy: {label}. Please rephrase."
