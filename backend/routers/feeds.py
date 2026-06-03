"""
AegisTrace Live Threat Intelligence Feeds
──────────────────────────────────────────
Polls authoritative free public threat intel sources and returns
structured, deduped IOC/advisory data for the analyst dashboard.

Sources (all free, no API key required unless noted):
  CISA KEV      — CISA Known Exploited Vulnerabilities catalogue (JSON)
  Abuse.ch URLhaus live  — Active malicious URLs updated every 5 min
  ThreatFox recent IOCs  — Last 24h malicious IOCs (IPs, domains, hashes)
  Abuse.ch MalwareBazaar — Recent malware samples added today
  PhishTank     — Recent phishing URLs (no key for read)

Results are cached in-process for CACHE_TTL seconds to avoid hammering
public feeds on every page load.
"""

import os, json, time, re
from datetime import datetime, timedelta
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from models import User
from database import get_session
from routers.auth import get_current_user

router = APIRouter(prefix="/api/feeds", tags=["feeds"])

TIMEOUT   = 12   # seconds per feed request
CACHE_TTL = 300  # 5 minutes

# ── In-process cache ──────────────────────────────────────────────────────────
_cache: dict = {}   # key → {"data": ..., "ts": float}

def _cached(key: str, fetch_fn):
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        return entry["data"], True
    result = fetch_fn()
    _cache[key] = {"data": result, "ts": time.time()}
    return result, False


# ═══════════════════════════════════════════════════════════════════════════════
#  Feed fetchers
# ═══════════════════════════════════════════════════════════════════════════════

def _fetch_cisa_kev() -> dict:
    """CISA Known Exploited Vulnerabilities — full catalogue."""
    try:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.get("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json")
            r.raise_for_status()
            d = r.json()
            vulns = d.get("vulnerabilities", [])
            # Sort by dateAdded descending
            vulns.sort(key=lambda v: v.get("dateAdded", ""), reverse=True)
            return {
                "source": "CISA KEV",
                "source_url": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
                "total": len(vulns),
                "catalogue_version": d.get("catalogVersion", ""),
                "date_released": d.get("dateReleased", ""),
                "recent": [
                    {
                        "cve_id":       v.get("cveID", ""),
                        "vendor":       v.get("vendorProject", ""),
                        "product":      v.get("product", ""),
                        "name":         v.get("vulnerabilityName", ""),
                        "date_added":   v.get("dateAdded", ""),
                        "due_date":     v.get("dueDate", ""),
                        "description":  v.get("shortDescription", "")[:200],
                        "action":       v.get("requiredAction", ""),
                        "severity":     "critical",   # CISA KEV entries are all critical
                    }
                    for v in vulns[:30]
                ],
            }
    except Exception as e:
        return {"source": "CISA KEV", "error": str(e), "recent": []}


def _fetch_urlhaus_recent() -> dict:
    """Abuse.ch URLhaus — recently added malicious URLs."""
    try:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post("https://urlhaus-api.abuse.ch/v1/urls/recent/limit/50/")
            r.raise_for_status()
            d = r.json()
            urls = d.get("urls", [])
            return {
                "source": "URLhaus (Abuse.ch)",
                "source_url": "https://urlhaus.abuse.ch/",
                "query_status": d.get("query_status", ""),
                "total": len(urls),
                "items": [
                    {
                        "url":          u.get("url", ""),
                        "url_status":   u.get("url_status", ""),
                        "host":         u.get("host", ""),
                        "date_added":   u.get("date_added", ""),
                        "threat":       u.get("threat", ""),
                        "tags":         u.get("tags") or [],
                        "reporter":     u.get("reporter", ""),
                        "ioc_type":     "url",
                    }
                    for u in urls[:30]
                    if u.get("url_status") == "online"
                ],
            }
    except Exception as e:
        return {"source": "URLhaus", "error": str(e), "items": []}


def _fetch_threatfox_recent() -> dict:
    """ThreatFox — IOCs added in the last 24 hours."""
    try:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(
                "https://threatfox-api.abuse.ch/api/v1/",
                json={"query": "get_iocs", "days": 1},
            )
            r.raise_for_status()
            d = r.json()
            iocs = d.get("data", []) or []
            return {
                "source": "ThreatFox (Abuse.ch)",
                "source_url": "https://threatfox.abuse.ch/",
                "query_status": d.get("query_status", ""),
                "total": len(iocs),
                "items": [
                    {
                        "ioc":            i.get("ioc", ""),
                        "ioc_type":       i.get("ioc_type", ""),
                        "threat_type":    i.get("threat_type", ""),
                        "malware":        i.get("malware_printable", ""),
                        "confidence":     i.get("confidence_level", 0),
                        "first_seen":     i.get("first_seen", ""),
                        "tags":           i.get("tags") or [],
                        "reporter":       i.get("reporter", ""),
                    }
                    for i in iocs[:40]
                ],
            }
    except Exception as e:
        return {"source": "ThreatFox", "error": str(e), "items": []}


def _fetch_malwarebazaar_recent() -> dict:
    """MalwareBazaar — malware samples added in the last 24h."""
    try:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(
                "https://mb-api.abuse.ch/api/v1/",
                data={"query": "get_recent", "selector": "time"},
            )
            r.raise_for_status()
            d = r.json()
            samples = d.get("data", []) or []
            return {
                "source": "MalwareBazaar (Abuse.ch)",
                "source_url": "https://bazaar.abuse.ch/",
                "query_status": d.get("query_status", ""),
                "total": len(samples),
                "items": [
                    {
                        "sha256":         s.get("sha256_hash", ""),
                        "md5":            s.get("md5_hash", ""),
                        "file_name":      s.get("file_name", ""),
                        "file_type":      s.get("file_type_mime", ""),
                        "signature":      s.get("signature", ""),
                        "tags":           s.get("tags") or [],
                        "first_seen":     s.get("first_seen", ""),
                        "reporter":       s.get("reporter", ""),
                        "ioc_type":       "hash",
                    }
                    for s in samples[:25]
                ],
            }
    except Exception as e:
        return {"source": "MalwareBazaar", "error": str(e), "items": []}


def _fetch_feodotracker() -> dict:
    """Abuse.ch Feodo Tracker — active C2 botnet IPs."""
    try:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.get("https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json")
            r.raise_for_status()
            d = r.json()
            hosts = d if isinstance(d, list) else []
            return {
                "source": "Feodo Tracker (Abuse.ch)",
                "source_url": "https://feodotracker.abuse.ch/",
                "total": len(hosts),
                "items": [
                    {
                        "ip":           h.get("ip_address", ""),
                        "port":         h.get("port", ""),
                        "malware":      h.get("malware", ""),
                        "last_online":  h.get("last_online", ""),
                        "first_seen":   h.get("first_seen", ""),
                        "ioc_type":     "ip",
                    }
                    for h in hosts[:30]
                ],
            }
    except Exception as e:
        return {"source": "Feodo Tracker", "error": str(e), "items": []}


# ═══════════════════════════════════════════════════════════════════════════════
#  API endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/all")
def all_feeds(
    force_refresh: bool = Query(False, description="Bypass cache and re-fetch all feeds"),
    _user: User = Depends(get_current_user),
):
    """
    Fetch all threat intelligence feeds in one call.
    Results are cached for 5 minutes.
    """
    if force_refresh:
        for key in list(_cache.keys()):
            if key.startswith("feed_"):
                del _cache[key]

    results = {}
    sources = {
        "cisa_kev":        _fetch_cisa_kev,
        "urlhaus":         _fetch_urlhaus_recent,
        "threatfox":       _fetch_threatfox_recent,
        "malwarebazaar":   _fetch_malwarebazaar_recent,
        "feodotracker":    _fetch_feodotracker,
    }
    cache_hits = {}
    for name, fn in sources.items():
        data, from_cache = _cached(f"feed_{name}", fn)
        results[name]    = data
        cache_hits[name] = from_cache

    return {
        "fetched_at": datetime.utcnow().isoformat(),
        "cache_ttl_secs": CACHE_TTL,
        "cache_hits": cache_hits,
        "feeds": results,
    }


@router.get("/cisa-kev")
def cisa_kev(_user: User = Depends(get_current_user)):
    """CISA Known Exploited Vulnerabilities catalogue."""
    data, _ = _cached("feed_cisa_kev", _fetch_cisa_kev)
    return data


@router.get("/urlhaus")
def urlhaus(_user: User = Depends(get_current_user)):
    """Recent active malicious URLs from Abuse.ch URLhaus."""
    data, _ = _cached("feed_urlhaus", _fetch_urlhaus_recent)
    return data


@router.get("/threatfox")
def threatfox(_user: User = Depends(get_current_user)):
    """IOCs from ThreatFox added in the last 24 hours."""
    data, _ = _cached("feed_threatfox", _fetch_threatfox_recent)
    return data


@router.get("/malwarebazaar")
def malwarebazaar(_user: User = Depends(get_current_user)):
    """Recent malware samples from MalwareBazaar."""
    data, _ = _cached("feed_malwarebazaar", _fetch_malwarebazaar_recent)
    return data


@router.get("/feodo")
def feodo(_user: User = Depends(get_current_user)):
    """Active C2 botnet IPs from Feodo Tracker."""
    data, _ = _cached("feed_feodotracker", _fetch_feodotracker)
    return data


@router.get("/summary")
def feeds_summary(_user: User = Depends(get_current_user)):
    """
    Lightweight summary for the dashboard widget — counts and freshness only,
    no full item lists. Uses cache if available.
    """
    summary = {}
    sources = {
        "CISA KEV":      ("feed_cisa_kev",      _fetch_cisa_kev),
        "URLhaus":       ("feed_urlhaus",        _fetch_urlhaus_recent),
        "ThreatFox":     ("feed_threatfox",      _fetch_threatfox_recent),
        "MalwareBazaar": ("feed_malwarebazaar",  _fetch_malwarebazaar_recent),
        "Feodo Tracker": ("feed_feodotracker",   _fetch_feodotracker),
    }
    for label, (cache_key, fn) in sources.items():
        entry = _cache.get(cache_key)
        if entry:
            d = entry["data"]
            summary[label] = {
                "total":       d.get("total", len(d.get("items", d.get("recent", [])))),
                "has_error":   "error" in d,
                "cached_secs": int(time.time() - entry["ts"]),
            }
        else:
            summary[label] = {"total": None, "has_error": False, "cached_secs": None}
    return {"feeds": summary, "cache_ttl_secs": CACHE_TTL}
