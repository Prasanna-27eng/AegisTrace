"""
AegisTrace PCAP / Network Traffic Analysis
──────────────────────────────────────────
Upload a .pcap/.pcapng file and get:
  • Packet count, duration, protocol breakdown
  • Top talkers (src/dst IPs by byte volume)
  • DNS queries (extracted domains → IOC candidates)
  • HTTP/HTTPS hostnames contacted
  • Suspicious flows (port scans, large data exfil, C2 beaconing patterns)
  • Full IOC extraction (IPs, domains, URLs)
  • AI-powered forensic summary and threat score

Requires: scapy (pip install scapy)
"""

import io, json, re, tempfile, os
from datetime import datetime
from collections import Counter, defaultdict
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select
from models import PcapAnalysis, AuditLog, User, Case
from database import get_session
from routers.auth import get_current_user
from ai_router import call_ai_json

router = APIRouter(prefix="/api/pcap", tags=["pcap"])

MAX_PCAP_SIZE = 50 * 1024 * 1024   # 50 MB hard limit

# ── Private IP ranges (exclude from external-IOC list) ──────────────────────
_PRIVATE_RE = re.compile(
    r"^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|::1|fc00:|fe80:)"
)

def _is_private(ip: str) -> bool:
    return bool(_PRIVATE_RE.match(ip))


# ── PCAP parsing with scapy ──────────────────────────────────────────────────

def _parse_pcap(data: bytes, filename: str) -> dict:
    """Parse raw PCAP bytes and return forensic summary dict."""
    try:
        from scapy.all import rdpcap, IP, IPv6, TCP, UDP, DNS, DNSQR, Raw, Ether
        from scapy.layers.http import HTTP, HTTPRequest, HTTPResponse
    except ImportError:
        raise HTTPException(503, "scapy not installed. Run: pip install scapy")

    # Write to temp file (scapy needs a file path)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pcap") as tf:
        tf.write(data)
        tmp_path = tf.name

    try:
        packets = rdpcap(tmp_path)
    finally:
        os.unlink(tmp_path)

    total_packets = len(packets)
    if total_packets == 0:
        return {"packet_count": 0, "error": "Empty PCAP file"}

    # ── Timestamps ───────────────────────────────────────────────────────────
    times = [float(p.time) for p in packets if hasattr(p, 'time')]
    duration = (max(times) - min(times)) if len(times) > 1 else 0.0

    # ── Protocol counter ─────────────────────────────────────────────────────
    proto_counter: Counter = Counter()
    for pkt in packets:
        if pkt.haslayer('TCP'):
            proto_counter['TCP'] += 1
        elif pkt.haslayer('UDP'):
            proto_counter['UDP'] += 1
        elif pkt.haslayer('ICMP'):
            proto_counter['ICMP'] += 1
        elif pkt.haslayer('ARP'):
            proto_counter['ARP'] += 1
        else:
            proto_counter['Other'] += 1

    # ── Top talkers by bytes ─────────────────────────────────────────────────
    ip_bytes: dict = defaultdict(int)    # ip → bytes sent
    ip_pkts:  dict = defaultdict(int)

    for pkt in packets:
        pkt_len = len(pkt)
        if pkt.haslayer(IP):
            src = pkt[IP].src
            ip_bytes[src] += pkt_len
            ip_pkts[src]  += 1
        elif pkt.haslayer(IPv6):
            src = pkt[IPv6].src
            ip_bytes[src] += pkt_len
            ip_pkts[src]  += 1

    top_talkers = sorted(
        [{"ip": ip, "bytes": b, "packets": ip_pkts[ip], "is_private": _is_private(ip)}
         for ip, b in ip_bytes.items()],
        key=lambda x: x["bytes"], reverse=True
    )[:20]

    # ── DNS queries ──────────────────────────────────────────────────────────
    dns_queries: list = []
    dns_seen = set()
    for pkt in packets:
        if pkt.haslayer(DNSQR):
            try:
                name = pkt[DNSQR].qname.decode('utf-8', errors='replace').rstrip('.')
                if name and name not in dns_seen:
                    dns_seen.add(name)
                    dns_queries.append(name)
            except Exception:
                pass

    # ── HTTP hosts ───────────────────────────────────────────────────────────
    http_hosts: list = []
    http_seen  = set()
    for pkt in packets:
        if pkt.haslayer(TCP) and pkt.haslayer(Raw):
            try:
                payload = pkt[Raw].load.decode('utf-8', errors='replace')
                m = re.search(r'Host:\s*([^\r\n]+)', payload, re.IGNORECASE)
                if m:
                    host = m.group(1).strip()
                    if host and host not in http_seen:
                        http_seen.add(host)
                        http_hosts.append(host)
            except Exception:
                pass

    # ── IOC extraction ───────────────────────────────────────────────────────
    extracted_iocs = []
    ioc_seen = set()

    # External IPs from top talkers
    for t in top_talkers:
        ip = t["ip"]
        if not _is_private(ip) and ip not in ioc_seen:
            ioc_seen.add(ip)
            extracted_iocs.append({"ioc": ip, "type": "ip", "source": "traffic"})

    # Domains from DNS
    for d in dns_queries:
        if d and d not in ioc_seen and not d.endswith('.local') and '.' in d:
            ioc_seen.add(d)
            extracted_iocs.append({"ioc": d, "type": "domain", "source": "dns"})

    # HTTP hosts
    for h in http_hosts:
        clean = h.split(':')[0]
        if clean and clean not in ioc_seen:
            ioc_seen.add(clean)
            extracted_iocs.append({"ioc": clean, "type": "domain", "source": "http_host"})

    # ── Suspicious flow detection ─────────────────────────────────────────────
    suspicious_flows = []

    # 1. Port scan detection: single IP hitting many unique dst ports in short window
    dst_ports_per_src: dict = defaultdict(set)
    for pkt in packets:
        if pkt.haslayer(IP) and pkt.haslayer(TCP):
            dst_ports_per_src[pkt[IP].src].add(pkt[TCP].dport)
    for src, ports in dst_ports_per_src.items():
        if len(ports) > 30:
            suspicious_flows.append({
                "type": "port_scan",
                "src": src,
                "unique_ports": len(ports),
                "description": f"{src} scanned {len(ports)} unique TCP ports",
                "severity": "high" if len(ports) > 100 else "medium",
            })

    # 2. Large data exfil: single flow > 1 MB outbound to external IP
    flow_bytes: dict = defaultdict(int)
    for pkt in packets:
        if pkt.haslayer(IP) and pkt.haslayer(TCP):
            key = (pkt[IP].src, pkt[IP].dst, pkt[TCP].dport)
            flow_bytes[key] += len(pkt)
    for (src, dst, dport), total in flow_bytes.items():
        if total > 1_000_000 and not _is_private(dst):
            suspicious_flows.append({
                "type": "large_transfer",
                "src": src, "dst": dst, "port": dport,
                "bytes": total,
                "description": f"Large transfer {total // 1024}KB from {src} → {dst}:{dport}",
                "severity": "high" if total > 10_000_000 else "medium",
            })

    # 3. Beaconing: regular periodic connections to same external dst
    beacon_times: dict = defaultdict(list)
    for pkt in packets:
        if pkt.haslayer(IP) and pkt.haslayer(TCP) and hasattr(pkt, 'time'):
            dst = pkt[IP].dst
            if not _is_private(dst):
                beacon_times[(pkt[IP].src, dst)].append(float(pkt.time))
    for (src, dst), tlist in beacon_times.items():
        if len(tlist) >= 10:
            intervals = sorted([tlist[i+1] - tlist[i] for i in range(len(tlist)-1)])
            if intervals:
                median = intervals[len(intervals)//2]
                jitter  = (max(intervals) - min(intervals)) / max(median, 0.001)
                if 5 < median < 600 and jitter < 0.25:   # < 25% jitter → beaconing
                    suspicious_flows.append({
                        "type": "beaconing",
                        "src": src, "dst": dst,
                        "beacon_interval_secs": round(median, 1),
                        "connection_count": len(tlist),
                        "description": f"Possible C2 beaconing: {src}→{dst} every ~{round(median)}s ({len(tlist)} connections)",
                        "severity": "high",
                    })

    return {
        "packet_count":     total_packets,
        "duration_secs":    round(duration, 2),
        "protocols":        dict(proto_counter.most_common(10)),
        "top_talkers":      top_talkers,
        "dns_queries":      dns_queries[:100],
        "http_hosts":       http_hosts[:50],
        "extracted_iocs":   extracted_iocs[:100],
        "suspicious_flows": suspicious_flows[:50],
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/analyse")
async def analyse_pcap(
    file: UploadFile = File(...),
    case_id: Optional[int] = Form(None),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Upload a .pcap or .pcapng file for full network forensic analysis.
    Returns protocol breakdown, top talkers, DNS queries, HTTP hosts,
    extracted IOCs, suspicious flows, and an AI threat summary.
    """
    filename = file.filename or "upload.pcap"
    if not filename.lower().endswith(('.pcap', '.pcapng', '.cap')):
        raise HTTPException(400, "Only .pcap / .pcapng / .cap files are accepted")

    data = await file.read()
    if len(data) > MAX_PCAP_SIZE:
        raise HTTPException(413, f"File too large. Max {MAX_PCAP_SIZE // 1024 // 1024} MB")
    if len(data) < 24:
        raise HTTPException(400, "File is too small to be a valid PCAP")

    # ── Parse ──────────────────────────────────────────────────────────────
    parsed = _parse_pcap(data, filename)
    if "error" in parsed:
        raise HTTPException(422, parsed["error"])

    # ── AI Analysis ────────────────────────────────────────────────────────
    suspicious_count = len(parsed["suspicious_flows"])
    external_ips = [i["ioc"] for i in parsed["extracted_iocs"] if i["type"] == "ip"]

    prompt = f"""Analyse this network capture for security threats.

File: {filename}
Packets: {parsed['packet_count']} over {parsed['duration_secs']}s
Protocols: {json.dumps(parsed['protocols'])}
Top external IPs: {json.dumps(external_ips[:10])}
DNS queries ({len(parsed['dns_queries'])}): {json.dumps(parsed['dns_queries'][:20])}
HTTP hosts: {json.dumps(parsed['http_hosts'][:15])}
Suspicious flows ({suspicious_count}): {json.dumps(parsed['suspicious_flows'][:10])}

Respond ONLY with valid JSON:
{{
  "verdict": "Malicious|Suspicious|Clean|Unknown",
  "threat_score": <0-100>,
  "summary": "2-3 sentence assessment of the capture",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "likely_attack": "e.g. C2 beacon, data exfiltration, port scan, lateral movement, or None",
  "recommended_actions": ["action 1", "action 2"]
}}"""

    ai_result = call_ai_json("extraction", prompt, temperature=0.2, max_tokens=600)
    if ai_result.get("parse_error"):
        ai_result = {
            "verdict": "Suspicious" if suspicious_count > 0 else "Unknown",
            "threat_score": min(suspicious_count * 20, 80),
            "summary": "AI analysis unavailable. Manual review required.",
            "key_findings": [f.get("description", "") for f in parsed["suspicious_flows"][:3]],
            "likely_attack": "Unknown",
            "recommended_actions": ["Review suspicious flows manually"],
        }

    # ── Save to DB ─────────────────────────────────────────────────────────
    record = PcapAnalysis(
        case_id=case_id,
        filename=filename,
        file_size=len(data),
        packet_count=parsed["packet_count"],
        duration_secs=parsed["duration_secs"],
        protocols=json.dumps(parsed["protocols"]),
        top_talkers=json.dumps(parsed["top_talkers"]),
        dns_queries=json.dumps(parsed["dns_queries"]),
        http_hosts=json.dumps(parsed["http_hosts"]),
        extracted_iocs=json.dumps(parsed["extracted_iocs"]),
        suspicious_flows=json.dumps(parsed["suspicious_flows"]),
        ai_verdict=ai_result.get("verdict", "Unknown"),
        ai_summary=ai_result.get("summary", ""),
        ai_findings=json.dumps(ai_result.get("key_findings", [])),
        threat_score=ai_result.get("threat_score", 0),
    )
    session.add(record)
    session.add(AuditLog(action="pcap_analysed", entity_type="pcap",
                          entity_id=filename, user_id=user.id, user_email=user.email))
    session.commit()
    session.refresh(record)

    # Auto-link IOCs to the case if provided
    if case_id and parsed["extracted_iocs"]:
        case = session.get(Case, case_id)
        if case:
            existing = json.loads(case.iocs or "[]")
            seen = {i.get("ioc") for i in existing}
            new_iocs = [i for i in parsed["extracted_iocs"] if i["ioc"] not in seen]
            if new_iocs:
                existing.extend(new_iocs[:50])
                case.iocs = json.dumps(existing)
                session.add(case)
                session.commit()

    return {
        "id":              record.id,
        "filename":        filename,
        "packet_count":    parsed["packet_count"],
        "duration_secs":   parsed["duration_secs"],
        "protocols":       parsed["protocols"],
        "top_talkers":     parsed["top_talkers"],
        "dns_queries":     parsed["dns_queries"],
        "http_hosts":      parsed["http_hosts"],
        "extracted_iocs":  parsed["extracted_iocs"],
        "suspicious_flows":parsed["suspicious_flows"],
        "ai_verdict":      ai_result.get("verdict", "Unknown"),
        "ai_threat_score": ai_result.get("threat_score", 0),
        "ai_summary":      ai_result.get("summary", ""),
        "ai_findings":     ai_result.get("key_findings", []),
        "ai_likely_attack":ai_result.get("likely_attack", ""),
        "ai_recommended":  ai_result.get("recommended_actions", []),
    }


@router.get("/history")
def pcap_history(
    case_id: Optional[int] = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    query = select(PcapAnalysis).order_by(PcapAnalysis.created_at.desc()).limit(limit)
    if case_id:
        query = query.where(PcapAnalysis.case_id == case_id)
    return session.exec(query).all()


@router.get("/{record_id}")
def get_pcap(
    record_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    r = session.get(PcapAnalysis, record_id)
    if not r:
        raise HTTPException(404)
    return r
