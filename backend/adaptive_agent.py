"""
AegisTrace Adaptive Thresholds Agent — v10.1 Priority 3
──────────────────────────────────────────────────────────
Self-tuning background agent. Every 4 hours it reviews the last 24h of
DefenseEvent / ITDRAlert outcomes, asks Nemotron-70B (Groq fallback) whether
detection thresholds should move, clamps any proposed change to
ADJUSTMENT_BOUNDS, applies it to adaptive_config, and writes an
AdaptiveThresholdLog row for full auditability.

The agent can ONLY move the three bounded thresholds in adaptive_config.
ADJUSTMENT_BOUNDS — it cannot disable detectors, touch permissions, delete
data, or change auth settings (enforced by both the system prompt and the
fact that set_value() only accepts known, bounded keys).
"""
import json
import threading
import time as _time
from datetime import datetime, timedelta

from sqlmodel import Session, select

import adaptive_config
from models import DefenseEvent, ITDRAlert, AdaptiveThresholdLog
from nvidia_client import nvidia_chat, NEMOTRON_70B, is_nvidia_available
from ai_router import call_ai_json

CYCLE_SECONDS = 4 * 3600  # every 4 hours

_ADAPTIVE_SYSTEM = """You are AegisTrace's Adaptive Thresholds Agent. Your job is to fine-tune
detection thresholds based on observed false-positive and false-negative rates so the platform
stays accurate without manual tuning.

You may ONLY adjust the numeric thresholds listed. You may NEVER disable detectors, change user
permissions, delete data, or modify authentication settings. All adjustments must stay within the
provided bounds."""


def _build_prompt(fp_rate: float, fn_rate: float, avg_confidence: float,
                   total_defense: int, total_itdr: int) -> str:
    current = adaptive_config.get_all()
    bounds = adaptive_config.ADJUSTMENT_BOUNDS
    return f"""Last 24 hours of telemetry:
- Defense events: {total_defense} total -> false positive rate {fp_rate:.2%}
- ITDR alerts: {total_itdr} total -> false negative (false_positive-marked) rate {fn_rate:.2%}
- Average defense AI confidence: {avg_confidence:.2f}

Current thresholds:
{json.dumps(current, indent=2)}

Allowed adjustment bounds (you may ONLY return keys listed here):
{json.dumps(bounds, indent=2)}

Targets:
- False positive rate < 5%
- False negative rate < 2%
- Average confidence > 0.75

If current performance is within targets, return an empty "adjustments" object — do not change
thresholds just for the sake of it. If the false positive rate is too high, raise the relevant
confidence/score thresholds (within bounds) so fewer borderline events are escalated. If the false
negative rate is too high, lower them so more borderline events are caught.

Respond ONLY with valid JSON:
{{
  "adjustments": {{"<threshold_name>": <new_value>, ...}},
  "reason": "1-2 sentence explanation of what changed and why (or why nothing changed)"
}}"""


def _call_adaptive_ai(prompt: str) -> tuple[dict, str]:
    if is_nvidia_available():
        resp = nvidia_chat(
            model=NEMOTRON_70B,
            messages=[
                {"role": "system", "content": _ADAPTIVE_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        if resp:
            content = resp.choices[0].message.content or ""
            try:
                s = content.find("{")
                e = content.rfind("}") + 1
                return json.loads(content[s:e]), NEMOTRON_70B
            except Exception:
                pass

    result = call_ai_json("analysis", prompt, 0.2, 600)
    return result if isinstance(result, dict) else {}, "groq-fallback"


def adaptive_agent_cycle(session: Session, org_id: int = 1) -> dict:
    """Run one tuning cycle. Returns a summary dict (also used by /api/adaptive/log)."""
    cutoff = datetime.utcnow() - timedelta(hours=24)

    defense_events = session.exec(
        select(DefenseEvent).where(DefenseEvent.detected_at >= cutoff)
    ).all()
    total_defense = len(defense_events)
    dismissed = sum(1 for e in defense_events if e.status == "dismissed")
    fp_rate = round(dismissed / total_defense, 4) if total_defense else 0.0

    itdr_alerts = session.exec(
        select(ITDRAlert)
        .where(ITDRAlert.detected_at >= cutoff, ITDRAlert.org_id == org_id)
    ).all()
    total_itdr = len(itdr_alerts)
    false_positives = sum(1 for a in itdr_alerts if a.status == "false_positive")
    fn_rate = round(false_positives / total_itdr, 4) if total_itdr else 0.0

    confidences = [e.ai_confidence for e in defense_events if e.ai_confidence is not None]
    avg_confidence = round(sum(confidences) / len(confidences), 4) if confidences else 0.0

    prompt = _build_prompt(fp_rate, fn_rate, avg_confidence, total_defense, total_itdr)
    result, model_used = _call_adaptive_ai(prompt)

    adjustments = result.get("adjustments", {}) if isinstance(result, dict) else {}
    reason = (result.get("reason") or "") if isinstance(result, dict) else ""

    applied = []
    if isinstance(adjustments, dict):
        for name, new_value in adjustments.items():
            if name not in adaptive_config.ADJUSTMENT_BOUNDS:
                continue  # agent can only move bounded thresholds
            try:
                new_value = float(new_value)
            except (TypeError, ValueError):
                continue
            old_value = adaptive_config.get(name)
            clamped = adaptive_config.set_value(name, new_value)
            if clamped != old_value:
                session.add(AdaptiveThresholdLog(
                    threshold_name=name,
                    old_value=old_value,
                    new_value=clamped,
                    reason=reason[:2000],
                    fp_rate_24h=fp_rate,
                    fn_rate_24h=fn_rate,
                    agent_model=model_used,
                    org_id=org_id,
                ))
                applied.append({"threshold": name, "old": old_value, "new": clamped})
    if applied:
        session.commit()

    return {
        "fp_rate_24h": fp_rate,
        "fn_rate_24h": fn_rate,
        "avg_confidence_24h": avg_confidence,
        "total_defense_events": total_defense,
        "total_itdr_alerts": total_itdr,
        "applied": applied,
        "reason": reason,
        "agent_model": model_used,
    }


def start_adaptive_agent(engine):
    """Launch the background tuning loop as a daemon thread."""
    def _loop():
        while True:
            _time.sleep(CYCLE_SECONDS)
            try:
                with Session(engine) as session:
                    result = adaptive_agent_cycle(session)
                    if result["applied"]:
                        print(f"[adaptive_agent] Applied {len(result['applied'])} "
                              f"threshold change(s) via {result['agent_model']}")
                    else:
                        print("[adaptive_agent] Cycle complete — no changes applied")
            except Exception as e:
                print(f"[adaptive_agent] Cycle error: {e}")

    threading.Thread(target=_loop, daemon=True).start()
