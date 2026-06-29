"""
AegisTrace AI Usage Logger — Feature 5
────────────────────────────────────────
Logs every LLM call to AIUsageLog for cost tracking.

Usage:
    from core.ai_usage import log_ai_usage
    log_ai_usage(db, case_id=case.id, operation="triage", model="llama-3.3-70b-versatile",
                 input_tokens=450, output_tokens=320)
"""
import os
import logging
from typing import Optional
from sqlmodel import Session
from models import AIUsageLog

logger = logging.getLogger("aegistrace.ai_usage")

# Default token rates (USD per 1K tokens)
# Override via env: LLM_INPUT_RATE_PER_1K, LLM_OUTPUT_RATE_PER_1K
DEFAULT_INPUT_RATE  = 0.003   # $0.003 per 1K input tokens
DEFAULT_OUTPUT_RATE = 0.015   # $0.015 per 1K output tokens


def get_rates():
    input_rate  = float(os.getenv("LLM_INPUT_RATE_PER_1K",  str(DEFAULT_INPUT_RATE)))
    output_rate = float(os.getenv("LLM_OUTPUT_RATE_PER_1K", str(DEFAULT_OUTPUT_RATE)))
    return input_rate, output_rate


def compute_cost(input_tokens: int, output_tokens: int) -> float:
    """Compute USD cost for given token counts."""
    input_rate, output_rate = get_rates()
    cost = (input_tokens / 1000 * input_rate) + (output_tokens / 1000 * output_rate)
    return round(cost, 8)


def log_ai_usage(
    db: Session,
    case_id: Optional[int],
    operation: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """
    Log an AI usage event to AIUsageLog.
    Fails silently — never crashes caller.
    """
    try:
        cost = compute_cost(input_tokens, output_tokens)
        log_entry = AIUsageLog(
            case_id=case_id,
            operation=operation,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.warning(f"[ai_usage] Failed to log usage: {e}")


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(text) // 4)
