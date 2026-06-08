"""
AegisTrace Agent Tools — Phase 1 & 4
──────────────────────────────────────
Tool definitions (JSON schema for function calling) + executor.
The triage agent and specialist agents share these tools.

Tools available to NVIDIA Nemotron:
  enrich_ioc            → query VirusTotal + AbuseIPDB for an IOC
  get_case_timeline     → fetch timeline events for a case
  get_endpoint_data     → fetch endpoint telemetry + vuln findings
  get_ioc_correlations  → find other cases sharing the same IOC
  search_similar_cases  → semantic search over past cases
"""

import json
import httpx
import os
from typing import Any

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
                "Fetch live telemetry and vulnerability findings for an endpoint by hostname. "
                "Returns running processes, network connections, risk score, and vuln scan results."
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
]


# ── Tool executor ─────────────────────────────────────────────────────────────

async def execute_tool(name: str, args: str | dict, session=None) -> dict:
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
            )
        else:
            return {"error": f"Unknown tool: {name}"}
    except Exception as exc:
        return {"error": str(exc)}


# ── Tool implementations ──────────────────────────────────────────────────────

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


def _search_similar_cases(query: str, exclude_case_id, session) -> dict:
    if not session or not query:
        return {"similar_cases": []}
    try:
        from embeddings import find_similar_cases
        results = find_similar_cases(
            query_text=query,
            session=session,
            exclude_case_id=exclude_case_id,
            top_k=3,
        )
        return {"similar_cases": results, "count": len(results)}
    except Exception as exc:
        return {"error": str(exc), "similar_cases": []}
