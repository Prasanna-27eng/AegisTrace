"""
AegisTrace Agent Tools — Phase 1, 4 & v9.0
─────────────────────────────────────────────
Tool definitions (JSON schema for function calling) + executor.
The triage agent and specialist agents share these tools.

Tools available to NVIDIA NIM agents:
  enrich_ioc                → query VirusTotal + AbuseIPDB for an IOC
  get_case_timeline         → fetch timeline events for a case
  get_endpoint_data         → fetch endpoint telemetry + vuln findings (DB)
  get_ioc_correlations      → find other cases sharing the same IOC
  search_similar_cases      → semantic search over past cases
  get_live_processes        → fetch LIVE process list via EDR API (v9.0)
  analyze_process_anomalies → score process cmdlines via NVIDIA embeddings (v9.0)
"""

import asyncio
import json
import math
import os
from typing import Any

import httpx

# ── Tool JSON schemas (OpenAI function-calling format) ────────────────────────

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "enrich_ioc",
            "description": (
                "Enrich a single indicator of compromise (IP, domain, hash, or URL) "
                "by querying VirusTotal and AbuseIPDB. Returns threat scores, categories, "
                "and detection counts."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ioc": {
                        "type": "string",
                        "description": "The IOC value to enrich (e.g. '185.220.101.5', 'evil.example.com', 'abc123...')"
                    },
                    "ioc_type": {
                        "type": "string",
                        "enum": ["ip", "domain", "hash", "url", "auto"],
                        "description": "IOC type. Use 'auto' to let the system detect it."
                    }
                },
                "required": ["ioc"]
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_case_timeline",
            "description": "Retrieve all timeline events for a specific case, ordered by timestamp.",
            "parameters": {
                "type": "object",
                "properties": {
                    "case_id": {"type": "integer", "description": "The case database ID"}
                },
                "required": ["case_id"]
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_endpoint_data",
            "description": (
                "Fetch stored telemetry and vulnerability findings for an endpoint by hostname. "
                "Returns risk score, alert counts, failed logins, and top vuln findings from the database."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "hostname": {"type": "string", "description": "The endpoint hostname to look up"}
                },
                "required": ["hostname"]
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_ioc_correlations",
            "description": (
                "Check if an IOC appears in other cases. Returns a list of correlated cases "
                "and the total count, useful for understanding campaign scope."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "ioc": {"type": "string", "description": "The IOC value to look up"}
                },
                "required": ["ioc"]
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_similar_cases",
            "description": (
                "Search past cases semantically similar to a description or IOC pattern. "
                "Useful for finding precedents, related campaigns, or known patterns."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Description of what to search for"},
                    "exclude_case_id": {"type": "integer", "description": "Case ID to exclude from results (current case)"}
                },
                "required": ["query"]
            },
        },
    },
    # ── v9.0: Live EDR process tool ───────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_live_processes",
            "description": (
                "Fetch the LIVE running process list from an endpoint via the connected EDR platform "
                "(CrowdStrike, SentinelOne, or Carbon Black Cloud). Returns real-time PIDs, process names, "
                "users, and command lines. Use this for current process state — more accurate than cached DB data."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "hostname": {
                        "type": "string",
                        "description": "Endpoint hostname to query for live processes"
                    },
                    "platform": {
                        "type": "string",
                        "enum": ["crowdstrike", "sentinelone", "carbonblack", "auto"],
                        "description": "EDR platform to query. Use 'auto' to try all configured platforms."
                    },
                },
                "required": ["hostname"]
            },
        },
    },
    # ── v9.0: NVIDIA embedding-based process anomaly scorer ───────────────────
    {
        "type": "function",
        "function": {
            "name": "analyze_process_anomalies",
            "description": (
                "Score a list of process command lines for suspicious/anomalous behaviour using NVIDIA "
                "NV-EmbedQA embedding similarity against known-malicious patterns plus rule-based keyword "
                "matching. Returns anomaly scores 0-100 per process. Score >70 = high suspicion, "
                "40-70 = medium, <40 = likely benign."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "processes": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of process command lines to analyze (max 30)"
                    },
                },
                "required": ["processes"]
            },
        },
    },
]


# ── Tool executor ─────────────────────────────────────────────────────────────

async def execute_tool(name: str, args: str | dict, session=None, org_id: int = None) -> dict:
    """
    Execute a named tool and return its result as a dict.
    All errors are caught and returned as {"error": "..."} so the agent loop continues.
    """
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except Exception:
            return {"error": "Invalid tool arguments (not valid JSON)"}

    try:
        if name == "enrich_ioc":
            return await _enrich_ioc(args.get("ioc", ""), args.get("ioc_type", "auto"))
        elif name == "get_case_timeline":
            return _get_case_timeline(int(args.get("case_id", 0)), session)
        elif name == "get_endpoint_data":
            return _get_endpoint_data(args.get("hostname", ""), session)
        elif name == "get_ioc_correlations":
            return _get_ioc_correlations(args.get("ioc", ""), session)
        elif name == "search_similar_cases":
            return _search_similar_cases(
                args.get("query", ""),
                args.get("exclude_case_id"),
                session,
                org_id,
            )
        elif name == "get_live_processes":
            return await _get_live_processes(
                args.get("hostname", ""),
                args.get("platform", "auto"),
            )
        elif name == "analyze_process_anomalies":
            return _analyze_process_anomalies(args.get("processes", []))
        else:
            return {"error": f"Unknown tool: {name}"}
    except Exception as exc:
        return {"error": str(exc)}


# ── Existing tool implementations ─────────────────────────────────────────────

async def _enrich_ioc(ioc: str, ioc_type: str = "auto") -> dict:
    """Call the internal enrichment API."""
    base_url = os.environ.get("INTERNAL_API_URL", "http://localhost:8000")
    api_key  = os.environ.get("INGEST_API_KEY", "")
    headers  = {"X-API-Key": api_key} if api_key else {}

    results = {}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{base_url}/api/enrichment/ioc",
                json={"ioc": ioc, "type": ioc_type},
                headers=headers,
            )
            if resp.status_code == 200:
                results = resp.json()
    except Exception as exc:
        results = {"error": str(exc), "ioc": ioc}

    return results or {"ioc": ioc, "note": "Enrichment unavailable or no data"}


def _get_case_timeline(case_id: int, session) -> dict:
    if not session or not case_id:
        return {"events": [], "count": 0}
    try:
        from sqlmodel import select
        from models import TimelineEvent
        events = session.exec(
            select(TimelineEvent)
            .where(TimelineEvent.case_id == case_id)
            .order_by(TimelineEvent.timestamp)
        ).all()
        return {
            "count": len(events),
            "events": [
                {
                    "timestamp": str(e.timestamp),
                    "event_type": e.event_type,
                    "description": e.description[:300],
                    "actor": e.actor,
                    "source": e.source,
                }
                for e in events[:20]
            ],
        }
    except Exception as exc:
        return {"error": str(exc), "events": []}


def _get_endpoint_data(hostname: str, session) -> dict:
    if not session or not hostname:
        return {"error": "hostname required"}
    try:
        from sqlmodel import select
        from models import Endpoint
        ep = session.exec(
            select(Endpoint).where(Endpoint.hostname == hostname)
        ).first()
        if not ep:
            return {"error": f"No endpoint found for hostname: {hostname}"}

        vuln_findings = []
        try:
            vuln_findings = json.loads(ep.vuln_findings or "[]")
        except Exception:
            pass

        return {
            "hostname":          ep.hostname,
            "os_type":           ep.os_type,
            "ip_address":        ep.ip_address,
            "local_risk_score":  ep.local_risk_score,
            "total_alerts":      ep.total_alerts,
            "total_failed_logins": ep.total_failed_logins,
            "last_seen":         str(ep.last_seen),
            "vuln_count":        len(vuln_findings),
            "critical_vulns":    sum(1 for v in vuln_findings if v.get("severity") == "critical"),
            "high_vulns":        sum(1 for v in vuln_findings if v.get("severity") == "high"),
            "top_vulns":         vuln_findings[:5],
        }
    except Exception as exc:
        return {"error": str(exc)}


def _get_ioc_correlations(ioc: str, session) -> dict:
    if not session or not ioc:
        return {"correlations": [], "count": 0}
    try:
        from sqlmodel import select
        from models import IOCCorrelation
        corr = session.exec(
            select(IOCCorrelation).where(IOCCorrelation.ioc_value == ioc)
        ).first()
        if not corr:
            return {"correlations": [], "count": 0, "ioc": ioc}
        case_ids = json.loads(corr.case_ids or "[]")
        return {
            "ioc":          ioc,
            "ioc_type":     corr.ioc_type,
            "case_count":   corr.case_count,
            "case_ids":     case_ids[:10],
            "first_seen":   str(corr.first_seen),
            "last_seen":    str(corr.last_seen),
        }
    except Exception as exc:
        return {"error": str(exc)}


def _search_similar_cases(query: str, exclude_case_id, session, org_id=None) -> dict:
    if not session or not query:
        return {"similar_cases": []}
    try:
        from embeddings import find_similar_cases
        results = find_similar_cases(
            query_text=query,
            session=session,
            org_id=org_id,
            exclude_case_id=exclude_case_id,
            top_k=3,
        )
        return {"similar_cases": results, "count": len(results)}
    except Exception as exc:
        return {"error": str(exc), "similar_cases": []}


# ── v9.0: Live EDR process fetcher ────────────────────────────────────────────

async def _get_live_processes(hostname: str, platform: str = "auto") -> dict:
    """
    Fetch live processes from CrowdStrike, SentinelOne, or Carbon Black.
    Tries all configured platforms when platform='auto'.
    Uses asyncio.to_thread since EDR clients are synchronous.
    """
    if not hostname:
        return {"error": "hostname required", "processes": []}

    try:
        from routers.edr import CrowdStrikeClient, SentinelOneClient, CarbonBlackClient
    except ImportError:
        return {"error": "EDR module unavailable", "processes": []}

    clients_map = {
        "crowdstrike": CrowdStrikeClient,
        "sentinelone":  SentinelOneClient,
        "carbonblack":  CarbonBlackClient,
    }

    targets = (
        list(clients_map.items())
        if platform == "auto"
        else [(platform, clients_map[platform])] if platform in clients_map
        else []
    )

    for platform_name, ClientClass in targets:
        client = ClientClass()
        if not client.configured:
            continue
        try:
            hosts = await asyncio.to_thread(client.search_hosts, hostname)
            if not hosts:
                continue
            endpoint_id = hosts[0]["endpoint_id"]
            processes   = await asyncio.to_thread(client.list_processes, endpoint_id)

            # Flatten each process into a single cmdline string for analyze_process_anomalies
            cmdlines = [
                f"{p.get('name', '')} {p.get('command', p.get('executablePath', ''))}".strip()
                for p in processes
            ]
            return {
                "platform":       platform_name,
                "hostname":       hostname,
                "endpoint_id":    endpoint_id,
                "process_count":  len(processes),
                "processes":      processes[:30],
                "cmdlines":       [c for c in cmdlines if c][:30],
            }
        except Exception as exc:
            continue  # try next platform

    return {
        "note": f"No configured EDR found process data for hostname '{hostname}'",
        "processes": [],
        "cmdlines": [],
    }


# ── v9.0: NVIDIA embedding-based process anomaly scorer ──────────────────────

_MALICIOUS_PATTERNS = [
    "powershell -nop -w hidden -encodedcommand",
    "cmd.exe /c certutil -decode -urlcache",
    "mshta.exe http://",
    "regsvr32.exe /s /n /u /i: http://",
    "wscript.exe //nologo //b",
    "rundll32.exe javascript:",
    "net user administrator /add",
    "net localgroup administrators /add",
    "mimikatz privilege::debug sekurlsa::logonpasswords",
    "Invoke-Expression (New-Object Net.WebClient).DownloadString",
    "bitsadmin /transfer /download",
    "schtasks /create /ru SYSTEM /sc onlogon",
    "wmic process call create cmd.exe",
    "python -c import socket os subprocess",
]

_SUSPICIOUS_KEYWORDS: dict[str, int] = {
    "powershell":        15,
    "-enc":              30,
    "-nop":              20,
    "-w hidden":         30,
    "certutil":          30,
    "regsvr32":          25,
    "mshta":             40,
    "wscript":           15,
    "cscript":           15,
    "rundll32":          20,
    "net user":          35,
    "net localgroup":    35,
    "mimikatz":          85,
    "invoke-expression": 30,
    "downloadstring":    35,
    "bitsadmin":         25,
    "schtasks":          20,
    "wmic process":      25,
    "whoami /all":       20,
    "base64":            20,
    "frombase64string":  35,
    "bypass":            25,
    "/c powershell":     40,
    "curl http":         15,
    "wget http":         15,
    "nc -e":             50,
    "bash -i":           45,
    "/dev/tcp/":         50,
    "chmod +x":          15,
    "xterm -display":    40,
}

# Cached malicious centroid (computed once per process lifetime)
_malicious_centroid: list[float] | None = None
_centroid_computed  = False


def _get_malicious_centroid() -> list[float] | None:
    """Lazily compute + cache the average NVIDIA embedding of malicious patterns."""
    global _malicious_centroid, _centroid_computed
    if _centroid_computed:
        return _malicious_centroid
    _centroid_computed = True

    try:
        from nvidia_client import nvidia_embed, is_nvidia_available
        if not is_nvidia_available():
            return None

        embeddings = []
        for pattern in _MALICIOUS_PATTERNS[:8]:  # cap API calls
            vec = nvidia_embed(pattern)
            if vec:
                embeddings.append(vec)

        if not embeddings:
            return None

        n   = len(embeddings)
        dim = len(embeddings[0])
        _malicious_centroid = [
            sum(embeddings[i][d] for i in range(n)) / n for d in range(dim)
        ]
    except Exception:
        _malicious_centroid = None

    return _malicious_centroid


def _cosine_sim(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if not mag_a or not mag_b:
        return 0.0
    return dot / (mag_a * mag_b)


def _analyze_process_anomalies(processes: list) -> list:
    """
    Score each process cmdline for suspicious behaviour.
    Combines rule-based keyword matching with NVIDIA embedding similarity.
    Returns list sorted by anomaly_score descending.
    """
    if not processes:
        return []

    centroid = _get_malicious_centroid()

    try:
        from nvidia_client import nvidia_embed, is_nvidia_available
        nvidia_ok = is_nvidia_available()
    except Exception:
        nvidia_ok = False
        centroid  = None

    results = []
    for proc in processes[:30]:
        proc_str   = str(proc)[:500]
        proc_lower = proc_str.lower()

        # Rule-based score
        rule_score = min(
            sum(score for kw, score in _SUSPICIOUS_KEYWORDS.items() if kw in proc_lower),
            90,
        )
        matched_keywords = [
            kw for kw, s in _SUSPICIOUS_KEYWORDS.items()
            if kw in proc_lower and s >= 20
        ]

        # NVIDIA embedding similarity to malicious centroid
        embed_score = 0
        if nvidia_ok and centroid:
            try:
                proc_vec    = nvidia_embed(proc_str)
                sim         = _cosine_sim(proc_vec, centroid) if proc_vec else 0.0
                embed_score = int(sim * 100)
            except Exception:
                embed_score = 0

        final_score = min(max(rule_score, embed_score), 100)

        if matched_keywords:
            reason = f"Keyword matches: {', '.join(matched_keywords[:3])}"
        elif embed_score > 55:
            reason = f"High embedding similarity to malicious patterns ({embed_score}%)"
        else:
            reason = "Normal"

        results.append({
            "process":       proc_str[:200],
            "anomaly_score": final_score,
            "rule_score":    rule_score,
            "embed_score":   embed_score,
            "reason":        reason,
        })

    results.sort(key=lambda x: x["anomaly_score"], reverse=True)
    return results
