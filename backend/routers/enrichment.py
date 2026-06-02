"""
AegisTrace Free Intelligence Enrichment
────────────────────────────────────────
Multi-source IOC enrichment using completely free APIs.
No paid keys required for any of these sources.

Sources:
  Shodan InternetDB  — open ports, hostnames, CVEs for IPs (no key)
  MalwareBazaar      — hash lookup against 10M+ malware samples (no key)
  URLhaus            — malicious URL/domain database (no key)
  ThreatFox          — IOC database with malware families (no key)
  GreyNoise          — IP noise/scanner classification (free community key)
  IPInfo             — IP geolocation + ASN (no key, 50k/month)
  NVD CVE            — CVE lookup (no key)
"""
import os, re, json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
from routers.auth import get_current_user
from models import User
import httpx

router = APIRouter(prefix="/api/enrich", tags=["enrichment"])

TIMEOUT = 8  # seconds per request

# ── Helpers ───────────────────────────────────────────────────────────────────
_IP_RE     = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
_HASH_RE   = re.compile(r"^[a-fA-F0-9]{32,64}$")
_URL_RE    = re.compile(r"^https?://")
_DOMAIN_RE = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$")


def _detect_type(ioc: str) -> str:
    ioc = ioc.strip()
    if _IP_RE.match(ioc):    return "ip"
    if _HASH_RE.match(ioc):  return "hash"
    if _URL_RE.match(ioc):   return "url"
    if _DOMAIN_RE.match(ioc): return "domain"
    return "unknown"


# ── Individual source queries ─────────────────────────────────────────────────

async def query_shodan_internetdb(ip: str) -> dict:
    """Shodan InternetDB — ports, tags, vulns, hostnames. No key needed."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(f"https://internetdb.shodan.io/{ip}")
            if r.status_code == 200:
                d = r.json()
                return {
                    "source": "Shodan InternetDB",
                    "found": True,
                    "ports": d.get("ports", []),
                    "hostnames": d.get("hostnames", []),
                    "tags": d.get("tags", []),
                    "vulns": d.get("vulns", []),
                    "cpes": d.get("cpes", []),
                }
            return {"source": "Shodan InternetDB", "found": False}
    except Exception as e:
        return {"source": "Shodan InternetDB", "error": str(e), "found": False}


async def query_malwarebazaar(hash_val: str) -> dict:
    """MalwareBazaar — hash lookup. No key needed."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                "https://mb-api.abuse.ch/api/v1/",
                data={"query": "get_info", "hash": hash_val},
            )
            if r.status_code == 200:
                d = r.json()
                if d.get("query_status") == "ok":
                    info = d["data"][0] if d.get("data") else {}
                    return {
                        "source": "MalwareBazaar",
                        "found": True,
                        "file_name": info.get("file_name"),
                        "file_type": info.get("file_type_mime"),
                        "signature": info.get("signature"),
                        "tags": info.get("tags", []),
                        "first_seen": info.get("first_seen"),
                        "reporter": info.get("reporter"),
                        "verdict": "malicious",
                    }
            return {"source": "MalwareBazaar", "found": False}
    except Exception as e:
        return {"source": "MalwareBazaar", "error": str(e), "found": False}


async def query_urlhaus(ioc: str, ioc_type: str) -> dict:
    """URLhaus — malicious URL/domain database. No key needed."""
    try:
        payload = {"url": ioc} if ioc_type == "url" else {"host": ioc}
        endpoint = "url" if ioc_type == "url" else "host"
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                f"https://urlhaus-api.abuse.ch/v1/{endpoint}/",
                data=payload,
            )
            if r.status_code == 200:
                d = r.json()
                if d.get("query_status") in ("is_host", "is_url"):
                    urls = d.get("urls", [])
                    malicious = [u for u in urls if u.get("url_status") == "online"]
                    return {
                        "source": "URLhaus",
                        "found": True,
                        "urls_found": len(urls),
                        "active_malicious": len(malicious),
                        "tags": list({t for u in urls for t in (u.get("tags") or [])}),
                        "verdict": "malicious" if urls else "clean",
                    }
            return {"source": "URLhaus", "found": False}
    except Exception as e:
        return {"source": "URLhaus", "error": str(e), "found": False}


async def query_threatfox(ioc: str) -> dict:
    """ThreatFox IOC database. No key needed."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                "https://threatfox-api.abuse.ch/api/v1/",
                json={"query": "search_ioc", "search_term": ioc},
            )
            if r.status_code == 200:
                d = r.json()
                if d.get("query_status") == "ok":
                    data = d.get("data", [])
                    if data:
                        entry = data[0]
                        return {
                            "source": "ThreatFox",
                            "found": True,
                            "malware": entry.get("malware"),
                            "malware_family": entry.get("malware_printable"),
                            "threat_type": entry.get("threat_type"),
                            "confidence": entry.get("confidence_level"),
                            "first_seen": entry.get("first_seen"),
                            "tags": entry.get("tags", []),
                            "verdict": "malicious",
                        }
            return {"source": "ThreatFox", "found": False}
    except Exception as e:
        return {"source": "ThreatFox", "error": str(e), "found": False}


async def query_greynoise(ip: str) -> dict:
    """GreyNoise community — is this IP a known mass-scanner? Free community key."""
    key = os.getenv("GREYNOISE_API_KEY", "")
    try:
        headers = {"key": key} if key else {}
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            # Community endpoint works without key but key improves rate limits
            r = await client.get(
                f"https://api.greynoise.io/v3/community/{ip}",
                headers=headers,
            )
            if r.status_code == 200:
                d = r.json()
                return {
                    "source": "GreyNoise",
                    "found": True,
                    "noise": d.get("noise", False),       # True = mass internet scanner
                    "riot": d.get("riot", False),          # True = benign service (Google, etc.)
                    "classification": d.get("classification", ""),  # malicious/benign/unknown
                    "name": d.get("name"),
                    "link": d.get("link"),
                    "verdict": "benign" if d.get("riot") else ("scanner" if d.get("noise") else "unknown"),
                }
            return {"source": "GreyNoise", "found": False}
    except Exception as e:
        return {"source": "GreyNoise", "error": str(e), "found": False}


async def query_ipinfo(ip: str) -> dict:
    """IPInfo — geolocation + ASN. No key for basic (50k/month free)."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(f"https://ipinfo.io/{ip}/json")
            if r.status_code == 200:
                d = r.json()
                return {
                    "source": "IPInfo",
                    "found": True,
                    "country": d.get("country"),
                    "region": d.get("region"),
                    "city": d.get("city"),
                    "org": d.get("org"),      # ASN + org name
                    "hostname": d.get("hostname"),
                    "timezone": d.get("timezone"),
                }
            return {"source": "IPInfo", "found": False}
    except Exception as e:
        return {"source": "IPInfo", "error": str(e), "found": False}


async def query_nvd_cve(keyword: str) -> dict:
    """NVD CVE lookup — no key needed."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                "https://services.nvd.nist.gov/rest/json/cves/2.0",
                params={"keywordSearch": keyword, "resultsPerPage": 5},
            )
            if r.status_code == 200:
                d = r.json()
                vulns = d.get("vulnerabilities", [])
                results = []
                for v in vulns:
                    cve = v.get("cve", {})
                    metrics = cve.get("metrics", {})
                    cvss = (metrics.get("cvssMetricV31") or metrics.get("cvssMetricV30") or [{}])[0]
                    score = cvss.get("cvssData", {}).get("baseScore")
                    results.append({
                        "id": cve.get("id"),
                        "description": (cve.get("descriptions") or [{}])[0].get("value","")[:200],
                        "cvss_score": score,
                        "severity": cvss.get("cvssData", {}).get("baseSeverity"),
                    })
                return {
                    "source": "NVD CVE",
                    "found": len(results) > 0,
                    "total": d.get("totalResults", 0),
                    "cves": results,
                }
            return {"source": "NVD CVE", "found": False}
    except Exception as e:
        return {"source": "NVD CVE", "error": str(e), "found": False}


# ── Main enrichment endpoint ──────────────────────────────────────────────────
@router.get("/{ioc}")
async def enrich(
    ioc: str,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Enrich an IOC with all available free sources in parallel."""
    ioc = ioc.strip()
    ioc_type = _detect_type(ioc)
    results = {"ioc": ioc, "type": ioc_type, "sources": {}}

    import asyncio

    tasks = []

    if ioc_type == "ip":
        tasks = [
            query_shodan_internetdb(ioc),
            query_greynoise(ioc),
            query_ipinfo(ioc),
            query_threatfox(ioc),
            query_urlhaus(ioc, "host"),
        ]

    elif ioc_type == "hash":
        tasks = [
            query_malwarebazaar(ioc),
            query_threatfox(ioc),
        ]

    elif ioc_type in ("url", "domain"):
        tasks = [
            query_urlhaus(ioc, ioc_type),
            query_threatfox(ioc),
        ]
        if ioc_type == "domain":
            tasks.append(query_ipinfo(ioc))

    else:
        tasks = [query_threatfox(ioc)]

    source_results = await asyncio.gather(*tasks, return_exceptions=True)

    verdicts = []
    for r in source_results:
        if isinstance(r, Exception):
            continue
        src = r.get("source", "unknown")
        results["sources"][src] = r
        if r.get("verdict"):
            verdicts.append(r["verdict"])

    # Overall verdict
    if "malicious" in verdicts:
        results["overall_verdict"] = "malicious"
    elif "suspicious" in verdicts:
        results["overall_verdict"] = "suspicious"
    elif "scanner" in verdicts:
        results["overall_verdict"] = "scanner"
    elif "benign" in verdicts or "clean" in verdicts:
        results["overall_verdict"] = "clean"
    else:
        results["overall_verdict"] = "unknown"

    return results


@router.get("/cve/{keyword}")
async def cve_lookup(
    keyword: str,
    _user: User = Depends(get_current_user),
):
    """Look up CVEs by keyword/product name using NVD (no key needed)."""
    return await query_nvd_cve(keyword)
