"""
AegisTrace Ingest Normalizer — Phase 5
────────────────────────────────────────
NVIDIA-powered alert normalization layer.
Converts raw alerts from any source (Wazuh, osquery, Falco, Sysmon CEF,
SIEM exports, custom webhooks) into the AegisTrace case schema.

This enables zero-config integration: pipe raw alerts in, get normalized
case fields out — no hardcoded parsers per source format.
"""

import json
from nvidia_client import nvidia_chat, LLAMA_70B, is_nvidia_available
from ai_router import call_ai_json

_NORMALIZE_SYSTEM = """You are a security log normalization engine.
Your job: convert raw security alerts from any vendor format into the AegisTrace case schema.
Output ONLY valid JSON. No prose, no markdown, just the JSON object."""

_SCHEMA_HINT = """
Target schema (output):
{
  "title": "brief incident title (max 80 chars)",
  "description": "what happened, where, who was involved",
  "severity": "low|medium|high|critical",
  "incident_type": "one of: malware|phishing|data_breach|ddos|insider_threat|ransomware|identity_threat|endpoint_compromise|network_intrusion|policy_violation|other",
  "affected_systems": "comma-separated hostnames or IPs",
  "iocs": [{"ioc":"value","type":"ip|domain|hash|url|email","confidence":0-100}],
  "mitre_techniques": [{"id":"T####","name":"technique name","tactic":"tactic name"}],
  "source_type": "wazuh|osquery|falco|sysmon|crowdstrike|splunk|elastic|custom|unknown",
  "raw_timestamp": "ISO8601 timestamp from the alert if present",
  "confidence": <0-100 how confident you are in the normalization>
}"""


def normalize_alert(raw_alert: dict | str, source_hint: str = "unknown") -> dict:
    """
    Normalize a raw alert into AegisTrace case fields.

    Args:
        raw_alert:   The raw alert — dict or JSON string from any source
        source_hint: Hint about the source format (e.g. "wazuh", "osquery", "falco")

    Returns:
        Normalized dict matching the AegisTrace case schema.
        Always returns a dict — errors are included in the result as {"error": "..."}.
    """
    if isinstance(raw_alert, str):
        try:
            raw_alert = json.loads(raw_alert)
        except Exception:
            raw_alert = {"raw_text": raw_alert}

    # Truncate very large payloads
    raw_json = json.dumps(raw_alert)[:3000]

    prompt = f"""Source format hint: {source_hint}

Raw alert:
{raw_json}

{_SCHEMA_HINT}

Normalize the alert above into the target schema."""

    result = {}

    if is_nvidia_available():
        resp = nvidia_chat(
            model=LLAMA_70B,
            messages=[
                {"role": "system", "content": _NORMALIZE_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.1,
            max_tokens=1000,
        )
        if resp:
            content = resp.choices[0].message.content or ""
            try:
                s = content.find("{")
                e = content.rfind("}") + 1
                result = json.loads(content[s:e])
            except Exception:
                result = {}

    if not result:
        result = call_ai_json("extraction", prompt, 0.1, 1000)

    # Ensure required fields have defaults
    result.setdefault("title", f"Alert from {source_hint}")
    result.setdefault("description", str(raw_alert)[:300])
    result.setdefault("severity", "medium")
    result.setdefault("incident_type", "other")
    result.setdefault("iocs", [])
    result.setdefault("mitre_techniques", [])
    result.setdefault("affected_systems", "")
    result.setdefault("source_type", source_hint)
    result.setdefault("confidence", 50)
    result["normalized_by"] = "nvidia-ingest-normalizer"

    return result


def normalize_batch(alerts: list[dict], source_hint: str = "unknown") -> list[dict]:
    """Normalize a list of alerts. Each alert is normalized independently."""
    return [normalize_alert(alert, source_hint) for alert in alerts]
