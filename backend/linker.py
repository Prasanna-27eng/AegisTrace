"""
AegisTrace v10.0 — Temporal Linker
───────────────────────────────────────────────
Correlates events from every detection source that occurred around the same
time / on the same host as a case, clusters them into "steps", and asks
Nemotron-70B (Groq fallback) to reconstruct the attack chain as a narrative.

Sources correlated:
  - AgentAction   (case_id FK)   — AI/MCP agent actions
  - ITDRAlert     (case_id FK)   — identity threat alerts
  - ShadowAIEvent (case_id FK)   — shadow AI detections
  - HardwareAlert (case_id FK)   — hardware attack tool alerts
  - RawLogEvent   (hostname+ts)  — endpoint agent structured logs
  - DefenseEvent  (attacker_ip)  — AI defense engine catches (IP heuristic)

Entry point: reconstruct_chain(case_id, session) -> dict
"""
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Session, select

from models import (
    Case, Endpoint, RawLogEvent, ITDRAlert, DefenseEvent,
    AgentAction, ShadowAIEvent, HardwareAlert,
)
from nvidia_client import nvidia_chat, NEMOTRON_70B, is_nvidia_available
from ai_router import call_ai_json

CLUSTER_WINDOW_SECONDS = 5
RAW_LOG_WINDOW = timedelta(minutes=10)
DEFENSE_WINDOW = timedelta(hours=1)
MAX_EVENTS_FOR_PROMPT = 60

_LINKER_SYSTEM = """You are a security incident analyst. Given a chronological sequence of
correlated security events from one investigation, reconstruct the attack chain as a
numbered list of steps, identify the relevant MITRE ATT&CK techniques, and write a
2-sentence executive summary. Output ONLY the JSON object requested — no prose, no
markdown fences outside the JSON."""


def _norm(timestamp: datetime, source: str, hostname: str, description: str,
          severity: str, ref_id: Optional[int] = None) -> dict:
    return {
        "timestamp": (timestamp or datetime.utcnow()).isoformat(),
        "source": source,
        "hostname": hostname or "",
        "description": description,
        "severity": severity or "medium",
        "id": ref_id,
    }


def _collect_anchor_events(case: Case, session: Session) -> tuple[list[dict], set[str]]:
    """Events directly linked to this case via case_id FK. Also extracts hostnames."""
    events: list[dict] = []
    hostnames: set[str] = set()

    for a in session.exec(select(AgentAction).where(AgentAction.case_id == case.id)).all():
        events.append(_norm(
            a.created_at, "agent_action", "",
            f"Agent '{a.agent_name}' performed {a.action_type}"
            + (f" (approval: {a.approval_status})" if a.approval_required else ""),
            "high" if a.approval_status == "rejected" else "medium",
            a.id,
        ))

    for itdr in session.exec(select(ITDRAlert).where(ITDRAlert.case_id == case.id)).all():
        events.append(_norm(
            itdr.detected_at, "itdr_alert", "",
            f"ITDR alert: {itdr.alert_type} — {itdr.description}"[:300],
            itdr.severity,
            itdr.id,
        ))

    for sa in session.exec(select(ShadowAIEvent).where(ShadowAIEvent.case_id == case.id)).all():
        host = ""
        if sa.agent_id:
            ep = session.get(Endpoint, sa.agent_id)
            if ep:
                host = ep.hostname
                hostnames.add(host)
        events.append(_norm(
            sa.detected_at, "shadow_ai", host,
            f"Shadow AI: process '{sa.process_name}' contacted {sa.destination_domain}",
            "medium",
            sa.id,
        ))

    for hw in session.exec(select(HardwareAlert).where(HardwareAlert.case_id == case.id)).all():
        if hw.hostname:
            hostnames.add(hw.hostname)
        events.append(_norm(
            hw.created_at, "hardware_alert", hw.hostname,
            f"Hardware alert: {hw.device_name} ({hw.device_type}) — {hw.event_type}",
            hw.severity,
            hw.id,
        ))

    return events, hostnames


def _collect_raw_logs(hostnames: set[str], time_range: tuple[datetime, datetime],
                       session: Session) -> list[dict]:
    """RawLogEvent entries for the case's hostnames within the anchor time window."""
    if not hostnames:
        return []
    start, end = time_range
    start -= RAW_LOG_WINDOW
    end += RAW_LOG_WINDOW

    events: list[dict] = []
    rows = session.exec(
        select(RawLogEvent)
        .where(RawLogEvent.hostname.in_(hostnames))
        .where(RawLogEvent.ts >= start)
        .where(RawLogEvent.ts <= end)
    ).all()
    for r in rows:
        desc = f"{r.source}: {r.event_type}"
        if r.username:
            desc += f" (user={r.username})"
        if r.source_ip:
            desc += f" from {r.source_ip}"
        if not r.success:
            desc += " [FAILED]"
        events.append(_norm(r.ts, "raw_log", r.hostname, desc, r.severity, r.id))
    return events


def _collect_defense_events(case: Case, time_range: tuple[datetime, datetime],
                             session: Session) -> list[dict]:
    """DefenseEvent rows whose attacker_ip matches an IP IOC on the case, near the time window."""
    try:
        iocs = json.loads(case.iocs or "[]")
    except Exception:
        iocs = []
    ips = {i.get("ioc") for i in iocs if isinstance(i, dict) and i.get("type", "").lower() == "ip"}
    if not ips:
        return []

    start, end = time_range
    start -= DEFENSE_WINDOW
    end += DEFENSE_WINDOW

    events: list[dict] = []
    rows = session.exec(
        select(DefenseEvent)
        .where(DefenseEvent.attacker_ip.in_(ips))
        .where(DefenseEvent.detected_at >= start)
        .where(DefenseEvent.detected_at <= end)
    ).all()
    for d in rows:
        events.append(_norm(
            d.detected_at, "defense_event", "",
            f"Defense engine: {d.attack_type} from {d.attacker_ip} on {d.endpoint_hit}",
            d.severity,
            d.id,
        ))
    return events


def _time_range(events: list[dict], case: Case) -> tuple[datetime, datetime]:
    timestamps = [datetime.fromisoformat(e["timestamp"]) for e in events]
    if not timestamps:
        anchor = case.created_at or datetime.utcnow()
        return anchor - timedelta(hours=1), anchor + timedelta(hours=1)
    return min(timestamps), max(timestamps)


def _cluster_events(events: list[dict]) -> list[list[dict]]:
    """Sort chronologically and group events within CLUSTER_WINDOW_SECONDS of the
    previous event in the same group into one 'step'."""
    ordered = sorted(events, key=lambda e: e["timestamp"])
    clusters: list[list[dict]] = []
    last_ts: Optional[datetime] = None

    for ev in ordered:
        ts = datetime.fromisoformat(ev["timestamp"])
        if last_ts is not None and (ts - last_ts).total_seconds() <= CLUSTER_WINDOW_SECONDS:
            clusters[-1].append(ev)
        else:
            clusters.append([ev])
        last_ts = ts

    return clusters


def _build_prompt(case: Case, clusters: list[list[dict]]) -> str:
    cluster_summaries = []
    for i, cluster in enumerate(clusters, 1):
        cluster_summaries.append({
            "cluster": i,
            "timestamp": cluster[0]["timestamp"],
            "events": [
                {"source": e["source"], "hostname": e["hostname"],
                 "severity": e["severity"], "description": e["description"]}
                for e in cluster
            ],
        })

    return f"""Case: {case.case_number} — {case.title}
Incident type: {case.incident_type}
Affected systems: {case.affected_systems or 'unknown'}

Correlated event clusters (chronological, each cluster = events within {CLUSTER_WINDOW_SECONDS}s of each other):
{json.dumps(cluster_summaries, indent=2, default=str)}

Reconstruct the attack chain. Return as JSON:
{{
  "steps": [{{"step": 1, "description": "...", "technique": "T1xxx", "severity": "high"}}],
  "narrative": "2-sentence executive summary",
  "mitre_chain": ["T1xxx", "T1yyy"],
  "confidence": 85,
  "suggested_title": "..."
}}"""


async def _call_linker_ai(prompt: str) -> tuple[dict, str]:
    if is_nvidia_available():
        resp = nvidia_chat(
            model=NEMOTRON_70B,
            messages=[
                {"role": "system", "content": _LINKER_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1500,
        )
        if resp:
            content = resp.choices[0].message.content or ""
            try:
                s = content.find("{")
                e = content.rfind("}") + 1
                return json.loads(content[s:e]), NEMOTRON_70B
            except Exception:
                pass

    result = await asyncio.to_thread(call_ai_json, "analysis", prompt, 0.2, 1500)
    return result, "groq-fallback"


async def reconstruct_chain(case_id: int, session: Session) -> dict:
    case = session.get(Case, case_id)
    if not case:
        return {"error": "Case not found"}

    anchor_events, hostnames = _collect_anchor_events(case, session)

    time_range = _time_range(anchor_events, case)

    all_events = list(anchor_events)
    all_events += _collect_raw_logs(hostnames, time_range, session)
    all_events += _collect_defense_events(case, time_range, session)

    if not all_events:
        return {
            "case_id": case_id,
            "event_count": 0,
            "step_count": 0,
            "steps": [],
            "narrative": "No correlated events were found for this case yet.",
            "mitre_chain": [],
            "confidence": 0,
            "suggested_title": case.title,
            "model_used": None,
            "events": [],
            "generated_at": datetime.utcnow().isoformat(),
        }

    all_events.sort(key=lambda e: e["timestamp"])
    if len(all_events) > MAX_EVENTS_FOR_PROMPT:
        all_events = all_events[:MAX_EVENTS_FOR_PROMPT]

    clusters = _cluster_events(all_events)
    prompt = _build_prompt(case, clusters)
    ai_result, model_used = await _call_linker_ai(prompt)

    return {
        "case_id": case_id,
        "event_count": len(all_events),
        "step_count": len(clusters),
        "steps": ai_result.get("steps", []),
        "narrative": ai_result.get("narrative", ""),
        "mitre_chain": ai_result.get("mitre_chain", []),
        "confidence": ai_result.get("confidence", 0),
        "suggested_title": ai_result.get("suggested_title", case.title),
        "model_used": model_used,
        "events": all_events,
        "generated_at": datetime.utcnow().isoformat(),
    }
