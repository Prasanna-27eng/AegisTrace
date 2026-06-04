"""
AegisTrace Hardware Security Analysis Platform
backend/hardware_tools.py
──────────────────────────────────────────────
18 forensic analysis tools + device registry + ingest + tool-run endpoints.
Zero new pip dependencies — stdlib + groq + fastapi + sqlmodel only.
"""
import re, json, math, time
from collections import defaultdict, Counter
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import HardwareDevice, HardwareAlert, Case, ToolRun, AuditLog, User
from database import get_session
from routers.auth import get_current_user, _audit
from ai_router import call_ai_json

router = APIRouter(prefix="/api/hardware", tags=["hardware"])

# ── Rate limiter (20 tool runs / user / 60s) ──────────────────────────────────
_tool_run_log: dict = defaultdict(list)

def _check_rate_limit(user_email: str):
    now = time.time()
    window = [t for t in _tool_run_log[user_email] if now - t < 60]
    if len(window) >= 20:
        raise HTTPException(429, "Too many tool runs. Wait 60 seconds.")
    window.append(now)
    _tool_run_log[user_email] = window

# ── MITRE auto-mapping ────────────────────────────────────────────────────────
MITRE_MAP = {
    "deauth_attack":      ("T1499", "Impact",             "Endpoint Denial of Service"),
    "evil_twin":          ("T1557.002", "Credential Access", "ARP Cache Poisoning / Evil Twin"),
    "probe_request":      ("T1040", "Discovery",          "Network Sniffing"),
    "handshake_capture":  ("T1040", "Discovery",          "Network Sniffing"),
    "jamming_detected":   ("T1464", "Impact",             "Network Denial of Service"),
    "replay_attack":      ("T1056", "Collection",         "Input Capture / Signal Replay"),
    "signal_anomaly":     ("T1040", "Discovery",          "Network Sniffing"),
    "process_creation":   ("T1059", "Execution",          "Command and Scripting Interpreter"),
    "network_connect":    ("T1071", "Command and Control","Application Layer Protocol"),
    "file_create":        ("T1105", "Command and Control","Ingress Tool Transfer"),
    "registry_modify":    ("T1547", "Persistence",        "Boot or Logon Autostart Execution"),
    "logon_event":        ("T1078", "Defense Evasion",    "Valid Accounts"),
    "keystroke_inject":   ("T1056.001", "Collection",     "Keylogging"),
    "card_clone":         ("T1530", "Collection",         "Data from Cloud Storage / RFID Clone"),
    "rfid_brute":         ("T1110", "Credential Access",  "Brute Force"),
    "lateral_movement":   ("T1021", "Lateral Movement",   "Remote Services"),
    "dns_tunnel":         ("T1071.004", "Command and Control", "DNS Tunnelling"),
    "arp_poison":         ("T1557.002", "Credential Access", "ARP Cache Poisoning"),
    "lsass_access":       ("T1003.001", "Credential Access", "OS Credential Dumping: LSASS"),
    "process_injection":  ("T1055", "Defense Evasion",    "Process Injection"),
}

# ══════════════════════════════════════════════════════════════════════════════
# DEVICE REGISTRY
# ══════════════════════════════════════════════════════════════════════════════

BUILTIN_DEVICES = [
    {"name":"WiFi Pineapple Mark VII","device_type":"wifi_pineapple","category":"wifi_attack",
     "log_format":"PineAP JSON: type,client_mac,ssid,bssid,channel,timestamp","is_builtin":True},
    {"name":"HackRF One","device_type":"hackrf","category":"rf_radio",
     "log_format":"hackrf_sweep CSV: date,time,hz_low,hz_high,hz_bin,samples,dBm","is_builtin":True},
    {"name":"Flipper Zero","device_type":"flipper_zero","category":"multi_tool",
     "log_format":"Serial text: mixed RF/RFID/NFC/BadUSB log lines","is_builtin":True},
    {"name":"USB Rubber Ducky","device_type":"rubber_ducky","category":"usb_hid",
     "log_format":"HID log: timestamp,event_type,keystroke,target_pid","is_builtin":True},
    {"name":"Bash Bunny","device_type":"bash_bunny","category":"usb_hid",
     "log_format":"Payload log: stage,payload_name,command,output,timestamp","is_builtin":True},
    {"name":"LAN Turtle","device_type":"lan_turtle","category":"network",
     "log_format":"syslog: hostname,facility,severity,message","is_builtin":True},
    {"name":"Proxmark 3","device_type":"proxmark3","category":"rfid",
     "log_format":"Proxmark CLI: card_type,uid,data_blocks,timestamp","is_builtin":True},
    {"name":"Suricata IDS","device_type":"suricata","category":"network_ids",
     "log_format":"eve.json: timestamp,event_type,src_ip,dest_ip,alert","is_builtin":True},
    {"name":"Sysmon","device_type":"sysmon","category":"endpoint",
     "log_format":"Windows Event XML/JSON: EventID,Image,CommandLine,ParentImage","is_builtin":True},
    {"name":"ESP32 / IoT Sensor","device_type":"esp32","category":"iot",
     "log_format":"Serial JSON: device_id,sensor_type,value,timestamp,alert","is_builtin":True},
]

def seed_builtin_devices(session: Session):
    count = len(session.exec(select(HardwareDevice).where(HardwareDevice.is_builtin == True)).all())
    if count >= len(BUILTIN_DEVICES):
        return
    for d in BUILTIN_DEVICES:
        existing = session.exec(
            select(HardwareDevice).where(HardwareDevice.device_type == d["device_type"])
        ).first()
        if not existing:
            session.add(HardwareDevice(**d))
    session.commit()

@router.get("/devices")
def list_devices(session: Session = Depends(get_session), _u: User = Depends(get_current_user)):
    return session.exec(select(HardwareDevice).order_by(HardwareDevice.is_builtin.desc())).all()

@router.post("/devices")
def create_device(data: dict, session: Session = Depends(get_session), _u: User = Depends(get_current_user)):
    dev = HardwareDevice(
        name=data.get("name","Custom Device"),
        device_type=data.get("device_type","custom"),
        category=data.get("category","custom"),
        log_format=data.get("log_format",""),
        notes=data.get("notes",""),
        is_builtin=False,
    )
    session.add(dev); session.commit(); session.refresh(dev)
    return dev

@router.delete("/devices/{dev_id}")
def delete_device(dev_id: int, session: Session = Depends(get_session), _u: User = Depends(get_current_user)):
    dev = session.get(HardwareDevice, dev_id)
    if not dev: raise HTTPException(404, "Device not found")
    if dev.is_builtin: raise HTTPException(400, "Cannot delete built-in device")
    session.delete(dev); session.commit()
    return {"ok": True}

@router.post("/devices/seed")
def seed_devices(session: Session = Depends(get_session), _u: User = Depends(get_current_user)):
    count = len(session.exec(select(HardwareDevice).where(HardwareDevice.is_builtin == True)).all())
    if count >= len(BUILTIN_DEVICES):
        return {"message": "already seeded", "count": count}
    seed_builtin_devices(session)
    return {"message": "seeded", "count": len(BUILTIN_DEVICES)}

@router.get("/stats")
def hardware_stats(session: Session = Depends(get_session), _u: User = Depends(get_current_user)):
    from sqlmodel import func as sqlfunc
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    alerts = session.exec(
        select(HardwareAlert).where(HardwareAlert.created_at >= today_start)
    ).all()
    by_sev: dict = {"critical":0,"high":0,"medium":0,"low":0,"info":0}
    by_dev: dict = {}
    by_cat: dict = {}
    mitre_c: dict = {}
    for a in alerts:
        by_sev[a.severity] = by_sev.get(a.severity, 0) + 1
        by_dev[a.device_name] = by_dev.get(a.device_name, 0) + 1
        by_cat[a.category]    = by_cat.get(a.category, 0) + 1
        if a.mitre_technique:
            mitre_c[a.mitre_technique] = mitre_c.get(a.mitre_technique, 0) + 1
    top_mitre = sorted([{"technique": k, "count": v} for k,v in mitre_c.items()],
                       key=lambda x: x["count"], reverse=True)[:5]
    devices_online = len(session.exec(
        select(HardwareDevice).where(HardwareDevice.connection_status == "online")
    ).all())
    return {
        "total_alerts_today": len(alerts),
        "by_severity": by_sev,
        "by_device": by_dev,
        "by_category": by_cat,
        "devices_online": devices_online,
        "top_mitre": top_mitre,
    }

# ══════════════════════════════════════════════════════════════════════════════
# ALERT MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/alerts")
def list_alerts(
    page: int = 1, page_size: int = 25,
    device_type: str = "", severity: str = "", status: str = "",
    session: Session = Depends(get_session), _u: User = Depends(get_current_user)
):
    q = select(HardwareAlert).order_by(HardwareAlert.created_at.desc())
    if device_type: q = q.where(HardwareAlert.device_type == device_type)
    if severity:    q = q.where(HardwareAlert.severity == severity)
    if status:      q = q.where(HardwareAlert.status == status)
    all_alerts = session.exec(q).all()
    start = (page - 1) * page_size
    return {"total": len(all_alerts), "page": page, "page_size": page_size,
            "alerts": all_alerts[start:start + page_size]}

@router.get("/alerts/{alert_id}")
def get_alert(alert_id: int, session: Session = Depends(get_session), _u: User = Depends(get_current_user)):
    a = session.get(HardwareAlert, alert_id)
    if not a: raise HTTPException(404)
    return a

@router.patch("/alerts/{alert_id}")
def update_alert(alert_id: int, data: dict, session: Session = Depends(get_session), _u: User = Depends(get_current_user)):
    a = session.get(HardwareAlert, alert_id)
    if not a: raise HTTPException(404)
    if "status" in data:       a.status = data["status"]
    if "investigated" in data: a.investigated = bool(data["investigated"])
    if "case_id" in data:      a.case_id = data["case_id"]
    session.add(a); session.commit(); session.refresh(a)
    return a

@router.post("/alerts/{alert_id}/create-case")
def create_case_from_alert(
    alert_id: int, session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    a = session.get(HardwareAlert, alert_id)
    if not a: raise HTTPException(404)
    from routers.cases import next_case_number
    case = Case(
        case_number=next_case_number(session),
        title=f"[{a.device_type.upper()}] {a.event_type} — {a.device_name}",
        severity=a.severity if a.severity in ("critical","high","medium","low") else "medium",
        status="open",
        incident_type="hardware_attack",
        affected_systems=a.hostname or a.device_name,
        analyst_name=current_user.name,
        description=f"Hardware alert from {a.device_name} ({a.device_type}).\n\n{a.ai_summary}",
        iocs=a.iocs,
        mitre_techniques=json.dumps([{"id": a.mitre_technique, "name": a.mitre_description, "tactic": a.mitre_tactic}]) if a.mitre_technique else "[]",
        ai_executive_summary=a.ai_summary,
    )
    session.add(case); session.commit(); session.refresh(case)
    a.case_id = case.id; a.status = "investigating"
    session.add(a); session.commit()
    return {"case_id": case.id, "case_number": case.case_number}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL RUN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/tools/run")
async def run_tool(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tool_type  = data.get("tool_type", "")
    input_data = data.get("input_data", "")
    alert_id   = data.get("alert_id")
    case_id    = data.get("case_id")

    if tool_type not in TOOL_REGISTRY:
        raise HTTPException(400, f"Unknown tool: {tool_type}. Valid: {list(TOOL_REGISTRY.keys())}")
    if len(input_data) > 512_000:
        raise HTTPException(400, "Input exceeds 500KB limit")
    if not input_data.strip():
        raise HTTPException(400, "input_data is required")

    _check_rate_limit(current_user.email)

    result = TOOL_REGISTRY[tool_type](input_data)

    run = ToolRun(
        case_id=case_id,
        tool_name=tool_type,
        command=f"hardware_tool:{tool_type}",
        output=json.dumps(result),
        ai_parsed_result="{}",
    )
    session.add(run); session.commit(); session.refresh(run)

    session.add(AuditLog(
        user_id=current_user.id, user_email=current_user.email,
        action="hardware_tool_run", entity_type="hardware_tool",
        entity_id=str(run.id),
        new_value=json.dumps({"tool_type": tool_type, "input_length": len(input_data), "alert_id": alert_id}),
    ))
    session.commit()

    return {"run_id": run.id, "tool_type": tool_type,
            "result": result, "executed_at": run.created_at.isoformat()}

@router.get("/tools/{run_id}")
def get_tool_run(run_id: int, session: Session = Depends(get_session), _u: User = Depends(get_current_user)):
    run = session.get(ToolRun, run_id)
    if not run: raise HTTPException(404, "Tool run not found")
    try:
        result = json.loads(run.output)
    except Exception:
        result = {"raw": run.output}
    return {"run_id": run.id, "tool_name": run.tool_name,
            "result": result, "case_id": run.case_id,
            "executed_at": run.created_at.isoformat()}


# ══════════════════════════════════════════════════════════════════════════════
# HELPER UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

def _shannon_entropy(s: str) -> float:
    if not s: return 0.0
    freq = Counter(s)
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in freq.values() if c)

def _parse_json_lines(text: str) -> list:
    rows = []
    for line in text.strip().splitlines():
        line = line.strip()
        if line.startswith("{"):
            try: rows.append(json.loads(line))
            except Exception: pass
    return rows

def _extract_mac(text: str) -> list:
    return re.findall(r'([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})', text)

def _extract_ips(text: str) -> list:
    return re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', text)

def _is_internal(ip: str) -> bool:
    return (ip.startswith("10.") or ip.startswith("192.168.") or
            ip.startswith("172.16.") or ip.startswith("172.17.") or
            ip.startswith("172.18.") or ip.startswith("172.19.") or
            ip.startswith("172.2") or ip.startswith("172.3") or
            ip == "127.0.0.1")

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 1 — PROBE REQUEST ANALYSER
# ══════════════════════════════════════════════════════════════════════════════
def run_probe_request_analyser(input_data: str) -> dict:
    try:
        SUSPICIOUS_SSIDS = {"evil","hack","pineapple","rogue","test","free wifi","airport","hotel","starbucks","mcdonalds"}
        probes = []
        rows = _parse_json_lines(input_data)
        if rows:
            for r in rows:
                mac  = r.get("client_mac") or r.get("mac","")
                ssid = r.get("ssid","")
                ch   = r.get("channel",0)
                ts   = r.get("timestamp","")
                sig  = r.get("signal",r.get("rssi",0))
                if mac or ssid:
                    probes.append({"mac":mac,"ssid":ssid,"channel":ch,"timestamp":ts,"signal":sig})
        else:
            for line in input_data.splitlines():
                macs  = _extract_mac(line)
                ssid_m = re.search(r'(?:ssid|looking for|probing)[:\s"\']+([^\s"\']{1,64})', line, re.I)
                ch_m   = re.search(r'(?:ch|channel)[:\s]+(\d+)', line, re.I)
                ts_m   = re.search(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})', line)
                if macs:
                    probes.append({
                        "mac": macs[0],
                        "ssid": ssid_m.group(1) if ssid_m else "",
                        "channel": int(ch_m.group(1)) if ch_m else 0,
                        "timestamp": ts_m.group(1) if ts_m else "",
                        "signal": 0,
                    })

        by_mac: dict = {}
        for p in probes:
            m = p["mac"]
            if m not in by_mac:
                by_mac[m] = {"mac":m,"probe_count":0,"ssids":[],"channels":set()}
            by_mac[m]["probe_count"] += 1
            if p["ssid"] and p["ssid"] not in by_mac[m]["ssids"]:
                by_mac[m]["ssids"].append(p["ssid"])
            if p["channel"]: by_mac[m]["channels"].add(p["channel"])

        ssid_counts = Counter(p["ssid"] for p in probes if p["ssid"])
        client_profiles = []
        suspicious = []
        for mac, info in by_mac.items():
            flagged = False; flag_reason = ""
            if len(info["ssids"]) > 5:
                flagged = True; flag_reason = f"Probing {len(info['ssids'])} unique SSIDs — aggressive scanner"
            for s in info["ssids"]:
                if any(kw in s.lower() for kw in SUSPICIOUS_SSIDS):
                    flagged = True; flag_reason = f"Probing suspicious SSID: {s}"
            client_profiles.append({
                "mac": mac, "probe_count": info["probe_count"],
                "unique_ssids": len(info["ssids"]), "ssid_list": info["ssids"][:10],
                "channels": sorted(info["channels"]), "flagged": flagged, "flag_reason": flag_reason,
            })
            if flagged: suspicious.append({"mac": mac, "reason": flag_reason})

        return {
            "total_probes": len(probes), "unique_clients": len(by_mac),
            "unique_ssids": len(ssid_counts),
            "client_profiles": sorted(client_profiles, key=lambda x: x["probe_count"], reverse=True),
            "suspicious_clients": suspicious,
            "top_probed_ssids": [{"ssid":s,"count":c} for s,c in ssid_counts.most_common(10)],
            "summary": f"Parsed {len(probes)} probe requests from {len(by_mac)} unique clients. {len(suspicious)} flagged as suspicious.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 2 — EVIL TWIN DETECTOR
# ══════════════════════════════════════════════════════════════════════════════
def run_evil_twin_detector(input_data: str) -> dict:
    try:
        COMMON_CHANNELS = {1,6,11,36,40,44,48,149,153,157,161}
        aps = []
        rows = _parse_json_lines(input_data)
        if rows:
            for r in rows:
                ssid  = r.get("ssid","")
                bssid = r.get("bssid","")
                ch    = r.get("channel",0)
                enc   = r.get("encryption","") or r.get("security","")
                if ssid or bssid:
                    aps.append({"ssid":ssid,"bssid":bssid,"channel":int(ch) if ch else 0,"encryption":enc})
        else:
            for line in input_data.splitlines():
                ssid_m  = re.search(r'(?:SSID|essid)[:\s"\']+([^\s"\']{1,64})', line, re.I)
                bssid_m = re.search(r'(?:BSSID|bssid)[:\s]+([0-9A-Fa-f:]{17})', line, re.I)
                ch_m    = re.search(r'[Cc]hannel[:\s]+(\d+)', line)
                macs    = _extract_mac(line)
                if ssid_m or bssid_m or macs:
                    aps.append({
                        "ssid":  ssid_m.group(1)  if ssid_m  else "",
                        "bssid": bssid_m.group(1) if bssid_m else (macs[0] if macs else ""),
                        "channel": int(ch_m.group(1)) if ch_m else 0,
                        "encryption": "",
                    })

        by_ssid: dict = {}
        for ap in aps:
            s = ap["ssid"]
            if s not in by_ssid: by_ssid[s] = []
            by_ssid[s].append(ap)

        suspects = []
        for ssid, ap_list in by_ssid.items():
            if not ssid: continue
            bssids  = list({a["bssid"] for a in ap_list if a["bssid"]})
            channels = list({a["channel"] for a in ap_list if a["channel"]})
            if len(bssids) >= 2:
                unusual_ch = [c for c in channels if c not in COMMON_CHANNELS]
                suspects.append({
                    "ssid": ssid, "bssid_count": len(bssids),
                    "bssids": bssids, "channels": channels,
                    "unusual_channels": unusual_ch,
                    "verdict": "evil_twin_detected",
                    "reason": f"{len(bssids)} different BSSIDs claiming same SSID" + (f"; unusual channels {unusual_ch}" if unusual_ch else ""),
                })

        verdict = "evil_twin_detected" if suspects else "clean"
        return {
            "total_aps": len(aps), "unique_ssids": len(by_ssid),
            "evil_twin_suspects": suspects,
            "clean_aps": len(by_ssid) - len(suspects),
            "verdict": verdict,
            "summary": f"{len(suspects)} evil twin suspect(s) found across {len(by_ssid)} SSIDs." if suspects else f"No evil twins detected across {len(by_ssid)} SSIDs.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 3 — DEAUTH TIMELINE
# ══════════════════════════════════════════════════════════════════════════════
def run_deauth_timeline(input_data: str) -> dict:
    try:
        frames = []
        for line in input_data.splitlines():
            ts_m   = re.search(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})', line)
            macs   = _extract_mac(line)
            reason = re.search(r'reason[:\s]+(\d+)', line, re.I)
            if macs:
                frames.append({
                    "timestamp": ts_m.group(1) if ts_m else "",
                    "attacker_mac": macs[0] if len(macs) >= 1 else "",
                    "victim_mac":   macs[1] if len(macs) >= 2 else "",
                    "bssid":        macs[2] if len(macs) >= 3 else "",
                    "reason_code":  int(reason.group(1)) if reason else 0,
                })
        if not frames:
            rows = _parse_json_lines(input_data)
            for r in rows:
                frames.append({
                    "timestamp":    r.get("timestamp",""),
                    "attacker_mac": r.get("attacker","") or r.get("src",""),
                    "victim_mac":   r.get("victim","")   or r.get("dst",""),
                    "bssid":        r.get("bssid",""),
                    "reason_code":  r.get("reason",0),
                })

        if not frames:
            return {"error": "No deauth frames found in input", "total_frames": 0,
                    "is_attack": False, "summary": "No deauthentication frames could be parsed."}

        bursts = []
        burst_start_idx = 0
        for i in range(1, len(frames)):
            # If gap > 30 frames treat as new burst (no real timestamps in many logs)
            if i - burst_start_idx >= 10:
                burst_frames = frames[burst_start_idx:i]
                attacker_macs = Counter(f["attacker_mac"] for f in burst_frames)
                victims = list({f["victim_mac"] for f in burst_frames})
                bursts.append({
                    "start_time":   burst_frames[0]["timestamp"],
                    "end_time":     burst_frames[-1]["timestamp"],
                    "frame_count":  len(burst_frames),
                    "attacker_mac": attacker_macs.most_common(1)[0][0] if attacker_macs else "",
                    "victims":      victims[:5],
                })
                burst_start_idx = i

        remaining = frames[burst_start_idx:]
        if remaining:
            attacker_macs = Counter(f["attacker_mac"] for f in remaining)
            victims = list({f["victim_mac"] for f in remaining})
            if len(remaining) >= 10:
                bursts.append({
                    "start_time":   remaining[0]["timestamp"],
                    "end_time":     remaining[-1]["timestamp"],
                    "frame_count":  len(remaining),
                    "attacker_mac": attacker_macs.most_common(1)[0][0] if attacker_macs else "",
                    "victims":      victims[:5],
                })

        is_attack = len(frames) > 30 or len(bursts) > 0
        by_attacker = []
        for mac, cnt in Counter(f["attacker_mac"] for f in frames).most_common():
            if mac:
                victims_of = list({f["victim_mac"] for f in frames if f["attacker_mac"] == mac})
                by_attacker.append({"mac":mac,"total_frames":cnt,"unique_victims":len(victims_of),"victims":victims_of[:5]})

        return {
            "total_frames": len(frames),
            "is_attack": is_attack,
            "attack_bursts": bursts,
            "attackers": by_attacker,
            "events_per_minute": round(len(frames) / max(1, len(set(f["timestamp"][:16] for f in frames if f["timestamp"]))), 1),
            "timeline": frames[:50],
            "summary": f"{'ATTACK DETECTED' if is_attack else 'Low activity'}: {len(frames)} deauth frames from {len(by_attacker)} source(s). {len(bursts)} burst(s) detected.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 4 — HANDSHAKE INSPECTOR
# ══════════════════════════════════════════════════════════════════════════════
def run_handshake_inspector(input_data: str) -> dict:
    try:
        handshakes = []
        rows = _parse_json_lines(input_data)
        if not rows:
            for line in input_data.splitlines():
                macs   = _extract_mac(line)
                ssid_m = re.search(r'(?:ssid|network)[:\s"\']+([^\s"\']{1,64})', line, re.I)
                msg_m  = re.search(r'[Mm]essage\s*(\d)', line)
                ts_m   = re.search(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.,]\d+)', line)
                if macs:
                    handshakes.append({
                        "client_mac": macs[0], "ap_bssid": macs[1] if len(macs)>1 else "",
                        "ssid": ssid_m.group(1) if ssid_m else "",
                        "message": int(msg_m.group(1)) if msg_m else 0,
                        "timestamp": ts_m.group(1) if ts_m else "",
                    })
        else:
            for r in rows:
                handshakes.append({
                    "client_mac": r.get("client",""), "ap_bssid": r.get("bssid",""),
                    "ssid": r.get("ssid",""), "message": r.get("message",0),
                    "timestamp": r.get("timestamp",""),
                })

        by_pair: dict = {}
        for hs in handshakes:
            key = f"{hs['ssid']}|{hs['client_mac']}"
            if key not in by_pair: by_pair[key] = {"ssid":hs["ssid"],"client_mac":hs["client_mac"],"ap_bssid":hs.get("ap_bssid",""),"messages":[],"timestamps":[]}
            by_pair[key]["messages"].append(hs.get("message",0))
            by_pair[key]["timestamps"].append(hs.get("timestamp",""))

        results = []
        for info in by_pair.values():
            msgs_seen = set(m for m in info["messages"] if m > 0)
            complete  = len(msgs_seen) >= 4 or (not msgs_seen and len(info["messages"]) >= 2)
            # Timing analysis — if timestamps include milliseconds check interval
            intervals = []
            ts_list = [t for t in info["timestamps"] if t]
            for i in range(1, len(ts_list)):
                try:
                    def parse_ms(ts):
                        for fmt in ["%Y-%m-%dT%H:%M:%S.%f","%Y-%m-%d %H:%M:%S.%f","%Y-%m-%dT%H:%M:%S","%Y-%m-%d %H:%M:%S"]:
                            try: return datetime.strptime(ts[:26], fmt)
                            except: pass
                        return None
                    t1 = parse_ms(ts_list[i-1])
                    t2 = parse_ms(ts_list[i])
                    if t1 and t2:
                        intervals.append(abs((t2-t1).total_seconds()*1000))
                except: pass
            avg_interval = sum(intervals)/len(intervals) if intervals else 9999
            automated    = avg_interval < 10 and len(intervals) > 0
            results.append({
                "ssid": info["ssid"], "client_mac": info["client_mac"],
                "ap_bssid": info["ap_bssid"], "complete": complete,
                "eapol_messages_seen": sorted(msgs_seen) if msgs_seen else list(range(1, len(info["messages"])+1)),
                "avg_interval_ms": round(avg_interval, 2),
                "automated_suspected": automated,
            })

        automation = any(r["automated_suspected"] for r in results)
        complete   = sum(1 for r in results if r["complete"])
        return {
            "total_handshakes": len(results),
            "complete_handshakes": complete,
            "partial_handshakes": len(results) - complete,
            "handshakes": results,
            "automation_detected": automation,
            "crackable_count": complete,
            "summary": f"{complete} complete WPA handshake(s). {'Automated capture suspected.' if automation else 'No automation detected.'}",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 5 — SPECTRUM ANALYSER
# ══════════════════════════════════════════════════════════════════════════════
def run_spectrum_analyser(input_data: str) -> dict:
    try:
        BANDS = [
            ("433MHz",   430e6,  435e6),
            ("868MHz",   863e6,  870e6),
            ("915MHz",   902e6,  928e6),
            ("GPS-L1", 1574e6, 1576e6),
            ("2.4GHz", 2400e6, 2500e6),
            ("5GHz",   5150e6, 5850e6),
        ]
        samples = []
        for line in input_data.strip().splitlines():
            line = line.strip()
            if not line or line.startswith("#"): continue
            parts = re.split(r'[,\s]+', line)
            if len(parts) >= 6:
                try:
                    hz_low  = float(parts[2]) if len(parts) > 2 else 0
                    hz_high = float(parts[3]) if len(parts) > 3 else 0
                    freq    = (hz_low + hz_high) / 2
                    dbm_vals = [float(p) for p in parts[6:] if re.match(r'^-?\d+\.?\d*$', p)]
                    if dbm_vals and freq > 0:
                        avg_dbm = sum(dbm_vals) / len(dbm_vals)
                        samples.append({"freq_hz": freq, "dbm": avg_dbm})
                except Exception: pass
            elif len(parts) == 2:
                try:
                    freq = float(parts[0]) * 1e6
                    dbm  = float(parts[1])
                    samples.append({"freq_hz": freq, "dbm": dbm})
                except Exception: pass

        if not samples:
            return {"error": "No parseable spectrum data found", "total_samples": 0,
                    "summary": "Could not parse spectrum data. Expected hackrf_sweep CSV or freq,dBm pairs."}

        noise_floor = -95.0
        all_dbm = sorted(s["dbm"] for s in samples)
        if len(all_dbm) > 10:
            noise_floor = all_dbm[len(all_dbm)//10]

        band_results = []
        used_freqs = set()
        for bname, flow, fhigh in BANDS:
            band_samples = [s for s in samples if flow <= s["freq_hz"] <= fhigh]
            if band_samples:
                dbm_vals = [s["dbm"] for s in band_samples]
                peak = max(dbm_vals); avg = sum(dbm_vals)/len(dbm_vals)
                band_results.append({
                    "name": bname, "freq_range": f"{flow/1e6:.0f}–{fhigh/1e6:.0f} MHz",
                    "peak_dbm": round(peak,1), "avg_dbm": round(avg,1),
                    "noise_floor": round(noise_floor,1), "sample_count": len(band_samples),
                    "is_active": peak > -70, "is_anomaly": peak > -50,
                })
                used_freqs.update(s["freq_hz"] for s in band_samples)

        unclassified = [s for s in samples if s["freq_hz"] not in used_freqs and s["dbm"] > -80]
        if unclassified:
            peak = max(s["dbm"] for s in unclassified)
            band_results.append({
                "name": "Unknown", "freq_range": "Other",
                "peak_dbm": round(peak,1), "avg_dbm": round(sum(s["dbm"] for s in unclassified)/len(unclassified),1),
                "noise_floor": round(noise_floor,1), "sample_count": len(unclassified),
                "is_active": peak > -70, "is_anomaly": peak > -50,
            })

        active   = [b["name"] for b in band_results if b["is_active"]]
        anomalies = [b["name"] for b in band_results if b["is_anomaly"]]
        strongest = max(band_results, key=lambda b: b["peak_dbm"], default=None)
        return {
            "total_samples": len(samples),
            "noise_floor_dbm": round(noise_floor, 1),
            "bands": band_results,
            "active_bands": active, "anomaly_bands": anomalies,
            "strongest_signal": {"band": strongest["name"], "dbm": strongest["peak_dbm"]} if strongest else None,
            "summary": f"{len(samples)} samples. Active bands: {', '.join(active) or 'none'}. " + (f"ANOMALY on {', '.join(anomalies)}." if anomalies else "No anomalies."),
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 6 — REPLAY ATTACK DETECTOR
# ══════════════════════════════════════════════════════════════════════════════
def run_replay_attack_detector(input_data: str) -> dict:
    try:
        FREQ_TARGETS = {315:"car fobs (US)", 433:"car fobs/garage/IoT", 868:"EU remotes/LoRa", 915:"IoT/SCADA", 2400:"WiFi/Zigbee/BT"}
        signals = []
        for line in input_data.splitlines():
            ts_m  = re.search(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)', line)
            freq_m = re.search(r'(\d+(?:\.\d+)?)\s*[Mm][Hh][Zz]', line)
            dbm_m  = re.search(r'(-\d{2,3}(?:\.\d+)?)\s*[dD][Bb][Mm]', line)
            dur_m  = re.search(r'(\d+(?:\.\d+)?)\s*ms', line)
            rows   = _parse_json_lines(line)
            if rows:
                r = rows[0]
                freq_hz = float(r.get("freq_hz") or r.get("frequency",0))
                signals.append({
                    "timestamp": r.get("timestamp",""), "freq_mhz": freq_hz/1e6 if freq_hz>1000 else float(r.get("freq_mhz",0)),
                    "dbm": float(r.get("dbm",r.get("signal",0))), "duration_ms": float(r.get("duration",0)),
                })
            elif freq_m:
                signals.append({
                    "timestamp": ts_m.group(1) if ts_m else f"sig_{len(signals)}",
                    "freq_mhz":  float(freq_m.group(1)),
                    "dbm":       float(dbm_m.group(1)) if dbm_m else -70,
                    "duration_ms": float(dur_m.group(1)) if dur_m else 0,
                })

        if not signals:
            return {"total_signals": 0, "replay_candidates": [], "verdict": "clean",
                    "summary": "No RF signals found in input."}

        def sig_hash(s):
            freq = round(s["freq_mhz"], 1)
            dur  = round(s["duration_ms"] / 10) * 10
            dbm  = round(s["dbm"] / 5) * 5
            return f"{freq}|{dur}|{dbm}"

        by_hash: dict = {}
        for s in signals:
            h = sig_hash(s)
            if h not in by_hash: by_hash[h] = []
            by_hash[h].append(s)

        candidates = []
        for h, sigs in by_hash.items():
            if len(sigs) >= 2:
                freq_mhz = sigs[0]["freq_mhz"]
                target = next((v for k,v in FREQ_TARGETS.items() if abs(freq_mhz - k) < 20), "unknown device")
                candidates.append({
                    "freq_mhz": freq_mhz, "occurrences": len(sigs),
                    "timestamps": [s["timestamp"] for s in sigs[:5]],
                    "target_type": target,
                    "confidence": "high" if len(sigs) >= 3 else "medium",
                    "signal_hash": h,
                })

        verdict = ("replay_attack_confirmed" if any(c["confidence"]=="high" for c in candidates)
                   else "possible_replay" if candidates else "clean")
        return {
            "total_signals": len(signals),
            "replay_candidates": candidates,
            "verdict": verdict,
            "affected_frequencies": list({f"{c['freq_mhz']} MHz" for c in candidates}),
            "summary": f"{len(candidates)} replay candidate(s) detected. Verdict: {verdict}." if candidates else "No replay patterns detected.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 7 — JAMMING DETECTOR
# ══════════════════════════════════════════════════════════════════════════════
def run_jamming_detector(input_data: str) -> dict:
    try:
        spec = run_spectrum_analyser(input_data)
        if spec.get("error"):
            return spec
        noise_floor = spec.get("noise_floor_dbm", -95)
        bands = spec.get("bands", [])
        if not bands:
            return {"jamming_detected": False, "jamming_type": "none",
                    "summary": "No spectrum data to analyse."}
        max_dbm    = max(b["peak_dbm"] for b in bands)
        db_above   = max_dbm - noise_floor
        anomaly_bands = [b for b in bands if b["is_anomaly"]]
        jamming    = db_above > 20 and anomaly_bands
        gps_jammed = any(b["name"] == "GPS-L1" and b["is_anomaly"] for b in bands)
        total_anom_bw = len(anomaly_bands)
        if len(anomaly_bands) > 2:
            jtype = "broadband"
        elif len(anomaly_bands) == 1:
            jtype = "targeted"
        else:
            jtype = "sweep" if len(anomaly_bands) > 0 else "none"
        sev = "none"
        if jamming:
            if db_above > 40 or gps_jammed: sev = "critical"
            elif db_above > 30: sev = "high"
            elif db_above > 20: sev = "medium"
            else: sev = "low"
        return {
            "jamming_detected": bool(jamming),
            "jamming_type": jtype if jamming else "none",
            "affected_bands": [b["name"] for b in anomaly_bands],
            "affected_freq_ranges": [b["freq_range"] for b in anomaly_bands],
            "max_signal_dbm": max_dbm,
            "noise_floor_dbm": noise_floor,
            "db_above_noise": round(db_above, 1),
            "gps_jamming_suspected": gps_jammed,
            "severity": sev,
            "summary": (f"JAMMING DETECTED ({jtype}, {sev}): {db_above:.0f}dB above noise floor on {[b['name'] for b in anomaly_bands]}." if jamming else f"No jamming detected. Max signal {max_dbm}dBm is {db_above:.0f}dB above estimated noise floor."),
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 8 — KEYSTROKE INJECTION ANALYSER
# ══════════════════════════════════════════════════════════════════════════════
def run_keystroke_injection_analyser(input_data: str) -> dict:
    try:
        FLAGGED_PATTERNS = [
            (r'base64',       "Base64 encoding detected",         "T1027"),
            (r'powershell\s+-e', "Encoded PowerShell",            "T1059.001"),
            (r'certutil',     "certutil LOLBin",                  "T1105"),
            (r'net user|net localgroup', "Account manipulation",  "T1136"),
            (r'reg add|reg delete', "Registry modification",      "T1547"),
            (r'schtasks',     "Scheduled task creation",          "T1053"),
            (r'sc\.exe|sc create', "Service installation",        "T1543"),
            (r'https?://',    "URL in typed content",             "T1071"),
            (r'curl|wget|Invoke-WebRequest', "Download command",  "T1105"),
            (r'DownloadString|DownloadFile',  "Download method",  "T1105"),
            (r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', "IP address typed", "T1071"),
        ]
        events = []
        rows = _parse_json_lines(input_data)
        if rows:
            for r in rows:
                events.append({"key": r.get("key","") or r.get("keystroke",""),
                               "modifier": r.get("modifier",""), "timestamp": r.get("timestamp","")})
        else:
            for line in input_data.splitlines():
                key_m = re.search(r'KEY[:\s]+([A-Za-z0-9_\-]+)', line, re.I)
                ts_m  = re.search(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)', line)
                mod_m = re.search(r'(?:CTRL|ALT|SHIFT|GUI|SUPER)', line, re.I)
                if key_m:
                    events.append({"key": key_m.group(1), "modifier": mod_m.group(0) if mod_m else "", "timestamp": ts_m.group(1) if ts_m else ""})

        if not events:
            text = input_data
        else:
            SPECIALS = {"ENTER":"\n","SPACE":" ","TAB":"\t","BACKSPACE":"","DELETE":""}
            chars = []
            for ev in events:
                k = ev["key"]
                if k in SPECIALS: chars.append(SPECIALS[k])
                elif len(k) == 1: chars.append(k.upper() if ev.get("modifier","") else k)
                else: chars.append(f"[{k}]")
            text = "".join(chars)

        total_chars = len(text.replace("\n","").replace(" ",""))
        ts_list = [e["timestamp"] for e in events if e.get("timestamp")]
        wpm = 0.0; automated = False
        if len(ts_list) >= 2:
            try:
                def parse_ts(ts):
                    for fmt in ["%Y-%m-%dT%H:%M:%S.%f","%Y-%m-%d %H:%M:%S.%f","%Y-%m-%dT%H:%M:%S","%Y-%m-%d %H:%M:%S"]:
                        try: return datetime.strptime(ts[:26], fmt)
                        except: pass
                    return None
                t1 = parse_ts(ts_list[0]); t2 = parse_ts(ts_list[-1])
                if t1 and t2:
                    secs = max(0.1, abs((t2-t1).total_seconds()))
                    wpm  = (total_chars / 5) / (secs / 60)
                    automated = wpm > 300
            except: pass

        cmds_found = []
        mitre_set  = set()
        extracted_urls = list(set(re.findall(r'https?://[^\s"\'<>]+', text)))
        extracted_ips  = list(set(re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', text)))
        cred_patterns  = bool(re.search(r'password|passwd|passw|secret|token|api.?key', text, re.I))
        for pattern, reason, mitre in FLAGGED_PATTERNS:
            if re.search(pattern, text, re.I):
                cmds_found.append({"command": re.search(pattern, text, re.I).group(0), "flagged": True, "reason": reason, "mitre_technique": mitre})
                mitre_set.add(mitre)

        return {
            "total_keystrokes": len(events),
            "reconstructed_text": text[:2000],
            "typing_speed_wpm": round(wpm, 1),
            "automated": automated,
            "session_duration_seconds": 0,
            "commands_detected": cmds_found,
            "extracted_urls": extracted_urls[:10],
            "extracted_ips": extracted_ips[:10],
            "credential_patterns_found": cred_patterns,
            "mitre_techniques": list(mitre_set),
            "summary": f"{'AUTOMATED INJECTION' if automated else 'Manual typing'} detected at {round(wpm)}WPM. {len(cmds_found)} suspicious pattern(s). {len(extracted_urls)} URL(s) found.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}


# ══════════════════════════════════════════════════════════════════════════════
# TOOL 9 — PAYLOAD DECODER (DuckyScript)
# ══════════════════════════════════════════════════════════════════════════════
def run_payload_decoder(input_data: str) -> dict:
    try:
        DUCKY_MITRE = {
            "GUI": ("T1059", "GUI key — opens Run box or start menu"),
            "STRING": ("T1059", "Types text/command"),
            "ENTER": ("T1059", "Executes command"),
            "powershell": ("T1059.001", "PowerShell execution"),
            "cmd": ("T1059.003", "Windows CMD execution"),
            "certutil": ("T1105", "certutil download"),
            "wget": ("T1105", "Download via wget"),
            "curl": ("T1105", "Download via curl"),
            "Invoke-WebRequest": ("T1105", "PowerShell download"),
            "schtasks": ("T1053", "Scheduled task persistence"),
            "reg add": ("T1547", "Registry persistence"),
            "net user": ("T1136", "User account manipulation"),
            "net localgroup": ("T1098", "Group membership change"),
        }
        PHASE_PATTERNS = {
            "STAGE_2_EXEC":     [r'GUI\s+r', r'cmd\.exe', r'powershell'],
            "STAGE_1_RECON":    [r'whoami', r'ipconfig', r'net\s+user', r'systeminfo'],
            "STAGE_3_DOWNLOAD": [r'curl', r'wget', r'Invoke-WebRequest', r'certutil\s+-url', r'DownloadFile'],
            "STAGE_4_PERSIST":  [r'schtasks', r'reg\s+add', r'startup', r'RunOnce'],
            "STAGE_5_EXFIL":    [r'upload', r'ftp', r'POST\s+http', r'Invoke-WebRequest.+uri'],
            "STAGE_6_CLEANUP":  [r'wevtutil\s+cl', r'clear-eventlog', r'rm\s+.+\.exe', r'del\s+/f'],
        }

        lines = input_data.strip().splitlines()
        steps = []
        total_delay = 0
        all_urls, all_ips, all_files = [], [], []
        mitre_set = set()
        phases_detected = set()

        for i, line in enumerate(lines, 1):
            line = line.rstrip()
            if not line: continue
            parts   = line.split(None, 1)
            cmd     = parts[0].upper() if parts else ""
            arg     = parts[1] if len(parts) > 1 else ""
            human   = ""
            mitre   = ""

            if cmd in ("REM", "//"):
                human = f"Comment: {arg}"
            elif cmd in ("DELAY", "DEFAULTDELAY", "DEFAULT_DELAY"):
                try:    ms = int(re.search(r'\d+', arg).group()); total_delay += ms; human = f"Wait {ms}ms"
                except: human = f"Delay: {arg}"
            elif cmd == "STRING":
                human = f"Type text: {arg[:60]}{'...' if len(arg)>60 else ''}"
                for pat, (mt, reason) in DUCKY_MITRE.items():
                    if pat.lower() in arg.lower():
                        mitre = mt; mitre_set.add(mt)
                urls_in_arg = re.findall(r'https?://[^\s"\']+', arg)
                all_urls.extend(urls_in_arg)
                ips_in_arg = re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', arg)
                all_ips.extend(ips_in_arg)
                files_in_arg = re.findall(r'[\w\-]+\.\w{2,4}', arg)
                all_files.extend(f for f in files_in_arg if '.' in f and not f.startswith('.'))
            elif cmd == "ENTER":   human = "Press ENTER — execute command"
            elif cmd == "GUI":     gui_actions = {'r':'Open Run box','x':'Admin menu'}; human = f"Press GUI+{arg} — {gui_actions.get(arg.strip().lower(),'keyboard shortcut')}"
            elif cmd == "CTRL":    human = f"CTRL+{arg}"
            elif cmd == "ALT":     human = f"ALT+{arg}"
            elif cmd == "DELAY":   human = "Wait"
            elif cmd == "REPEAT":  human = f"Repeat previous command {arg} times"
            elif cmd == "LED":     human = f"Set LED: {arg}"
            elif cmd in ("F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"):
                human = f"Press {cmd}"
            else:
                human = f"{cmd} {arg}".strip()

            for phase, pats in PHASE_PATTERNS.items():
                if any(re.search(p, line, re.I) for p in pats):
                    phases_detected.add(phase)

            steps.append({"line_number": i, "command": cmd, "argument": arg, "human_explanation": human, "mitre": mitre})

        phase_list = sorted(phases_detected)
        risk = "critical" if "STAGE_3_DOWNLOAD" in phases_detected or len(mitre_set) >= 3 else \
               "high" if len(mitre_set) >= 2 else "medium" if mitre_set else "low"
        objective = "Reconnaissance + execution" if "STAGE_1_RECON" in phases_detected else \
                    "Download + execute payload" if "STAGE_3_DOWNLOAD" in phases_detected else \
                    "Persistence installation" if "STAGE_4_PERSIST" in phases_detected else \
                    "Command execution"
        return {
            "total_lines": len(lines),
            "payload_steps": steps,
            "attack_phases_detected": phase_list,
            "total_delay_ms": total_delay,
            "estimated_execution_seconds": round(total_delay / 1000, 1),
            "embedded_iocs": {"urls": list(set(all_urls))[:10], "ips": list(set(all_ips))[:10], "files": list(set(all_files))[:10]},
            "mitre_techniques": list(mitre_set),
            "overall_objective": objective,
            "risk_level": risk,
            "summary": f"{len(steps)}-step payload. Phases: {', '.join(phase_list) or 'unknown'}. Risk: {risk}. Exec time: ~{total_delay/1000:.1f}s.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 10 — ENCODED COMMAND DECODER
# ══════════════════════════════════════════════════════════════════════════════
def run_encoded_command_decoder(input_data: str) -> dict:
    import base64, urllib.parse, codecs
    try:
        original = input_data.strip()
        layers = []

        def try_decode(text):
            text = text.strip()

            # PowerShell -EncodedCommand
            ps_match = re.search(r'(?:-e(?:nc(?:odedcommand)?)?)\s+([A-Za-z0-9+/=]{20,})', text, re.I)
            if ps_match:
                try:
                    decoded = base64.b64decode(ps_match.group(1) + "==").decode("utf-16-le", errors="replace")
                    return "powershell_encodedcommand", decoded
                except Exception: pass

            # Pure base64
            b64_match = re.match(r'^[A-Za-z0-9+/\s]+=*$', text.replace('\n',''))
            if b64_match and len(text) % 4 <= 2:
                try:
                    decoded = base64.b64decode(text + "==").decode("utf-8", errors="strict")
                    if decoded.isprintable() or '\n' in decoded:
                        return "base64", decoded
                except Exception: pass
                try:
                    decoded = base64.b64decode(text + "==").decode("utf-16-le", errors="replace")
                    if len(decoded) > 5 and decoded.isprintable():
                        return "base64_utf16le", decoded
                except Exception: pass

            # Hex
            hex_match = re.match(r'^[0-9a-fA-F\s]+$', text)
            if hex_match and len(text.replace(" ","")) % 2 == 0:
                try:
                    decoded = bytes.fromhex(text.replace(" ","")).decode("utf-8", errors="strict")
                    if decoded.isprintable():
                        return "hex", decoded
                except Exception: pass

            # URL encoding
            if "%" in text:
                decoded = urllib.parse.unquote(text)
                if decoded != text:
                    return "url_encoded", decoded

            # ROT13
            rot = codecs.decode(text, "rot_13")
            common_words = ["the","and","for","cmd","exe","powershell","set","run","echo","if"]
            if sum(1 for w in common_words if w in rot.lower()) >= 2:
                return "rot13", rot

            # char() obfuscation
            char_matches = re.findall(r'char\s*\(\s*(\d+)\s*\)', text, re.I)
            if len(char_matches) >= 3:
                decoded = "".join(chr(int(c)) for c in char_matches if 32 <= int(c) <= 126)
                if decoded:
                    return "char_obfuscation", decoded

            return None, None

        current = original
        for layer_num in range(1, 6):
            encoding, decoded = try_decode(current)
            if not encoding or decoded == current:
                break
            layers.append({
                "layer": layer_num, "encoding_type": encoding,
                "input_preview": current[:100] + ("…" if len(current) > 100 else ""),
                "output_preview": decoded[:100] + ("…" if len(decoded) > 100 else ""),
            })
            current = decoded

        final = current
        MALICIOUS_PATTERNS = [
            "downloadstring","downloadfile","invoke-webrequest","iex ","bypass",
            "hidden","noprofile","encodedcommand","certutil","regsvr32","mshta",
            "net user","net localgroup","schtasks /create","reg add","runas",
        ]
        is_malicious  = any(p in final.lower() for p in MALICIOUS_PATTERNS)
        mal_indicators = [p for p in MALICIOUS_PATTERNS if p in final.lower()]

        mitre = "T1027"
        if "downloadstring" in final.lower() or "invoke-webrequest" in final.lower(): mitre = "T1105"
        if "schtasks" in final.lower(): mitre = "T1053"
        if "net user" in final.lower(): mitre = "T1136"

        ai_explanation = ""
        if layers:
            try:
                import groq as _groq, os as _os
                client = _groq.Groq(api_key=_os.getenv("GROQ_API_KEY",""))
                resp = client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[{"role":"user","content":f"What does this command do? Answer in 2 sentences max, plain English:\n{final[:500]}"}],
                    max_tokens=120,
                )
                ai_explanation = resp.choices[0].message.content.strip()
            except Exception:
                ai_explanation = "AI explanation unavailable."

        return {
            "original": original[:200],
            "original_length": len(original),
            "encoding_detected": layers[0]["encoding_type"] if layers else "none",
            "layers_count": len(layers),
            "decoding_layers": layers,
            "final_decoded": final[:2000],
            "ai_explanation": ai_explanation,
            "is_malicious": is_malicious,
            "malicious_indicators": mal_indicators,
            "mitre_technique": mitre if layers else "",
            "summary": f"{len(layers)} encoding layer(s) detected ({', '.join(l['encoding_type'] for l in layers)}). {'MALICIOUS indicators found.' if is_malicious else 'No obvious malicious patterns.'}" if layers else "No encoding detected in input.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 11 — SURICATA PARSER
# ══════════════════════════════════════════════════════════════════════════════
def run_suricata_parser(input_data: str) -> dict:
    try:
        SUSP_UAS = ["python-requests","curl","wget","sqlmap","nikto","nmap","masscan","scrapy","httpx","go-http-client"]
        INJECT   = ["../","..\\","%00","UNION ","SELECT ","<script","cmd=","exec(","eval(","; ls","| cat","DROP TABLE"]
        SUSP_TLDS= {".xyz",".top",".tk",".pw",".cc",".ws",".su",".bit"}

        alerts, dns_events, http_events, flows, parse_errors = [], [], [], [], 0
        for line in input_data.strip().splitlines():
            line = line.strip()
            if not line: continue
            try:
                ev = json.loads(line)
                etype = ev.get("event_type","")
                if etype == "alert":     alerts.append(ev)
                elif etype == "dns":     dns_events.append(ev)
                elif etype == "http":    http_events.append(ev)
                elif etype == "flow":    flows.append(ev)
            except Exception:
                parse_errors += 1

        # Alerts
        alert_out = []
        mitre_map_local = {"Malware Command and Control":"T1071","Network Scan":"T1046","Exploit":"T1190","Brute Force":"T1110"}
        for a in alerts:
            sig  = a.get("alert",{})
            cat  = sig.get("category","")
            mitre = next((v for k,v in mitre_map_local.items() if k in cat), "T1071")
            alert_out.append({
                "signature": sig.get("signature",""), "category": cat,
                "severity": sig.get("severity",3),
                "src_ip": a.get("src_ip",""), "dest_ip": a.get("dest_ip",""),
                "src_port": a.get("src_port",0), "dest_port": a.get("dest_port",0),
                "timestamp": a.get("timestamp",""), "mitre_technique": mitre,
            })
        top_sigs = Counter(a["signature"] for a in alert_out).most_common(10)
        suspicious_ips_c = Counter(a["src_ip"] for a in alert_out)
        suspicious_ips = [{"ip":ip,"alert_count":cnt,"threat_score":min(100,cnt*10)} for ip,cnt in suspicious_ips_c.most_common(10)]

        # DNS
        dga_suspects, tunnel_suspects, flagged_tlds = [], [], []
        for d in dns_events:
            dns = d.get("dns",{})
            domain = dns.get("rrname","") or dns.get("query","")
            if not domain: continue
            etype  = dns.get("type","query")
            label  = domain.split(".")[0] if "." in domain else domain
            ent    = _shannon_entropy(label)
            tld    = "." + domain.split(".")[-1] if "." in domain else ""
            if ent > 3.5 or len(label) > 12:
                dga_suspects.append({"domain":domain,"entropy":round(ent,2),"label_length":len(label),"confidence":"high" if ent>4.0 else "medium"})
            if dns.get("rrtype","").upper() in ("TXT","NULL") or (len(label) > 30):
                tunnel_suspects.append({"domain":domain,"query_type":dns.get("rrtype",""),"subdomain_length":len(label),"reason":"Long subdomain or TXT/NULL query type"})
            if tld in SUSP_TLDS:
                flagged_tlds.append({"domain":domain,"tld":tld})

        # HTTP
        susp_uas, inject_attempts = [], []
        for h in http_events:
            http = h.get("http",{})
            ua   = http.get("http_user_agent","")
            url  = http.get("url","") or http.get("http_uri","")
            if any(s in ua.lower() for s in SUSP_UAS):
                susp_uas.append({"ua":ua,"src":h.get("src_ip","")})
            if any(p.lower() in url.lower() for p in INJECT):
                inject_attempts.append({"url":url[:200],"pattern":next(p for p in INJECT if p.lower() in url.lower())})

        # Beaconing detection
        flow_pairs = defaultdict(list)
        for f in flows:
            key = f"{f.get('src_ip','')}:{f.get('dest_ip','')}:{f.get('dest_port',0)}"
            flow_pairs[key].append(f.get("timestamp",""))
        beaconing = len(flow_pairs) > 0 and any(len(v) > 5 for v in flow_pairs.values())

        # Port scan detection
        dest_ports_by_src = defaultdict(set)
        for a in alerts:
            dest_ports_by_src[a.get("src_ip","")].add(a.get("dest_port",0))
        port_scan = any(len(ports) > 10 for ports in dest_ports_by_src.values())

        c2_candidates = list({a["src_ip"] for a in alert_out if "Command and Control" in a.get("category","")})

        return {
            "total_events": len(alerts)+len(dns_events)+len(http_events)+len(flows),
            "parse_errors": parse_errors,
            "event_types": {"alert":len(alerts),"dns":len(dns_events),"http":len(http_events),"flow":len(flows)},
            "alerts": alert_out[:50],
            "top_signatures": [{"signature":s,"count":c} for s,c in top_sigs],
            "suspicious_ips": suspicious_ips,
            "dns_analysis": {"total_queries":len(dns_events),"dga_suspects":dga_suspects[:10],"tunnel_suspects":tunnel_suspects[:10],"flagged_tlds":flagged_tlds[:10]},
            "http_analysis": {"total_requests":len(http_events),"suspicious_uas":susp_uas[:10],"injection_attempts":inject_attempts[:10]},
            "port_scan_detected": port_scan,
            "beaconing_detected": beaconing,
            "c2_candidates": c2_candidates[:10],
            "summary": f"{len(alerts)} alerts, {len(dns_events)} DNS, {len(http_events)} HTTP events. {'C2 detected.' if c2_candidates else ''} {'Port scan.' if port_scan else ''} {len(dga_suspects)} DGA suspects.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 12 — ARP POISON DETECTOR
# ══════════════════════════════════════════════════════════════════════════════
def run_arp_poison_detector(input_data: str) -> dict:
    try:
        records = []
        for line in input_data.splitlines():
            macs = _extract_mac(line)
            ips  = _extract_ips(line)
            ts_m = re.search(r'(\d{2}:\d{2}:\d{2}(?:\.\d+)?)', line)
            atype = "reply" if re.search(r'reply|is.at', line, re.I) else "request" if re.search(r'request|who.has', line, re.I) else "gratuitous" if re.search(r'gratuitous', line, re.I) else "unknown"
            if macs and ips:
                records.append({"timestamp": ts_m.group(1) if ts_m else "", "sender_ip": ips[0], "sender_mac": macs[0], "target_ip": ips[1] if len(ips)>1 else "", "arp_type": atype})

        if not records:
            rows = _parse_json_lines(input_data)
            for r in rows:
                records.append({"timestamp":r.get("timestamp",""),"sender_ip":r.get("src_ip",""),"sender_mac":r.get("src_mac",""),"target_ip":r.get("dst_ip",""),"arp_type":r.get("type","unknown")})

        ip_to_macs: dict = defaultdict(set)
        for r in records:
            if r["sender_ip"] and r["sender_mac"]:
                ip_to_macs[r["sender_ip"]].add(r["sender_mac"])

        conflicts = [{"ip":ip,"macs":list(macs),"packet_count":sum(1 for r in records if r["sender_ip"]==ip)}
                     for ip,macs in ip_to_macs.items() if len(macs)>1]
        grat_arps = sum(1 for r in records if r["arp_type"] == "gratuitous")
        reply_count = sum(1 for r in records if r["arp_type"] == "reply")
        # Simple MITM check — if one MAC claims to be the gateway (x.x.x.1) AND another IP
        mitm = len(conflicts) > 0 and any(ip.endswith(".1") or ip.endswith(".254") for ip in ip_to_macs if len(ip_to_macs[ip])>1)
        suspicious = [{"mac":list(macs)[0],"ip":ip,"reason":"Claims multiple IPs"} for ip,macs in ip_to_macs.items() if len(macs)>1]
        verdict = "poisoning_detected" if conflicts else "suspicious" if grat_arps > 5 else "clean"
        return {
            "total_arp_packets": len(records),
            "unique_ip_mac_pairs": len(ip_to_macs),
            "conflicting_mappings": conflicts,
            "gratuitous_arps": grat_arps,
            "arp_rate_per_second": round(reply_count / max(1, len(set(r["timestamp"][:8] for r in records if r["timestamp"]))), 2),
            "mitm_pattern_detected": mitm,
            "suspicious_sources": suspicious[:10],
            "verdict": verdict,
            "summary": f"{'ARP POISONING DETECTED' if conflicts else 'Clean'}: {len(conflicts)} IP(s) with multiple MAC mappings. {'MITM pattern.' if mitm else ''} {grat_arps} gratuitous ARP(s).",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 13 — DNS ANALYSER
# ══════════════════════════════════════════════════════════════════════════════
def run_dns_analyser(input_data: str) -> dict:
    try:
        SUSP_TLDS = {".xyz",".top",".tk",".pw",".cc",".ws",".su",".bit",".onion"}
        queries = []
        rows = _parse_json_lines(input_data)
        if rows:
            for r in rows:
                dns = r.get("dns",r)
                domain = dns.get("rrname","") or dns.get("query","") or dns.get("name","")
                if domain:
                    queries.append({"src_ip":r.get("src_ip",""),"domain":domain,"qtype":dns.get("rrtype","A"),"timestamp":r.get("timestamp","")})
        else:
            for line in input_data.splitlines():
                dom_m = re.search(r'(?:query|resolve|name)[:\s]+([a-zA-Z0-9._\-]{4,253})', line, re.I)
                ips   = _extract_ips(line)
                if dom_m:
                    queries.append({"src_ip": ips[0] if ips else "","domain": dom_m.group(1),"qtype":"A","timestamp":""})

        unique_domains = list({q["domain"] for q in queries})
        dga_suspects, tunnel_suspects, flagged_tlds, long_domains = [], [], [], []
        for domain in unique_domains:
            label  = domain.split(".")[0] if "." in domain else domain
            ent    = _shannon_entropy(label)
            tld    = "." + domain.split(".")[-1] if "." in domain else ""
            if ent > 3.5 or len(label) > 12:
                consec = max((len(list(g)) for k,g in __import__("itertools").groupby(label, lambda c: c not in "aeiou") if k), default=0)
                dga_suspects.append({"domain":domain,"entropy":round(ent,2),"consonant_clusters":consec,"length":len(label),"confidence":"high" if ent>4.0 else "medium"})
            if len(label) > 30:
                tunnel_suspects.append({"domain":domain,"query_type":"A","subdomain_length":len(label),"query_count":sum(1 for q in queries if q["domain"]==domain),"reason":"Very long subdomain — potential DNS tunnel"})
            if tld in SUSP_TLDS:
                flagged_tlds.append({"domain":domain,"tld":tld})
            if len(domain) > 50:
                long_domains.append(domain)

        top_domains = Counter(q["domain"] for q in queries).most_common(10)
        top_hosts   = Counter(q["src_ip"]  for q in queries if q["src_ip"]).most_common(10)

        return {
            "total_queries": len(queries),
            "unique_domains": len(unique_domains),
            "unique_resolvers": len({q["src_ip"] for q in queries if q["src_ip"]}),
            "dga_suspects": dga_suspects[:15],
            "tunnel_suspects": tunnel_suspects[:10],
            "flagged_tlds": flagged_tlds[:15],
            "long_domains": long_domains[:10],
            "beaconing_domains": [],
            "top_querying_hosts": [{"ip":ip,"query_count":cnt} for ip,cnt in top_hosts],
            "high_volume_domains": [{"domain":d,"count":c} for d,c in top_domains],
            "summary": f"{len(queries)} queries, {len(unique_domains)} domains. {len(dga_suspects)} DGA suspects, {len(tunnel_suspects)} tunnel suspects.",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 14 — LATERAL MOVEMENT TRACER
# ══════════════════════════════════════════════════════════════════════════════
def run_lateral_movement_tracer(input_data: str) -> dict:
    try:
        LATERAL_PORTS = {445:"SMB",3389:"RDP",5985:"WinRM-HTTP",5986:"WinRM-HTTPS",22:"SSH",135:"RPC",139:"NetBIOS",389:"LDAP",636:"LDAPS",88:"Kerberos",3268:"GlobalCatalog"}
        conns = []
        rows = _parse_json_lines(input_data)
        if rows:
            for r in rows:
                src = r.get("src_ip","") or r.get("src","")
                dst = r.get("dest_ip","") or r.get("dst","") or r.get("remote_ip","")
                port = int(r.get("dest_port",0) or r.get("port",0) or 0)
                if src and dst and port:
                    conns.append({"src_ip":src,"dst_ip":dst,"port":port,"protocol":r.get("proto","TCP")})
        else:
            for line in input_data.splitlines():
                ips  = _extract_ips(line)
                port_m = re.search(r':(\d+)(?:\s|$)', line)
                if len(ips) >= 2 and port_m:
                    conns.append({"src_ip":ips[0],"dst_ip":ips[1],"port":int(port_m.group(1)),"protocol":"TCP"})

        internal = [(c["src_ip"],c["dst_ip"],c["port"]) for c in conns if _is_internal(c["src_ip"]) and _is_internal(c["dst_ip"])]
        external = [(c["src_ip"],c["dst_ip"],c["port"]) for c in conns if not _is_internal(c["dst_ip"])]

        sensitive_hits = []
        for c in conns:
            if c["port"] in LATERAL_PORTS and _is_internal(c["src_ip"]) and _is_internal(c["dst_ip"]):
                sensitive_hits.append({
                    "src_ip":c["src_ip"],"dst_ip":c["dst_ip"],"port":c["port"],
                    "protocol":c.get("protocol","TCP"),
                    "service_name":LATERAL_PORTS[c["port"]],
                    "connection_count":1,
                })

        # Pivot candidates: hosts that both receive AND send on sensitive ports
        receives = {c["dst_ip"] for c in conns if c["port"] in LATERAL_PORTS}
        sends    = {c["src_ip"] for c in conns if c["port"] in LATERAL_PORTS and _is_internal(c.get("dst_ip",""))}
        pivots   = receives & sends

        hubs = Counter(c["src_ip"] for c in conns if _is_internal(c["src_ip"]))
        hub_list = [{"ip":ip,"total_connections":cnt,"unique_destinations":len({c["dst_ip"] for c in conns if c["src_ip"]==ip})} for ip,cnt in hubs.most_common(5) if cnt >= 5]

        mitre = []
        if sensitive_hits:
            if any(h["port"] in (445,139) for h in sensitive_hits): mitre.append("T1021.002")
            if any(h["port"] == 3389      for h in sensitive_hits): mitre.append("T1021.001")
            if any(h["port"] in (5985,5986) for h in sensitive_hits): mitre.append("T1021.006")
            mitre.append("T1021")

        return {
            "total_connections": len(conns),
            "internal_connections": len(internal),
            "external_connections": len(external),
            "lateral_movement_suspected": len(sensitive_hits) > 0,
            "sensitive_port_hits": sensitive_hits[:20],
            "pivot_candidates": [{"ip":ip,"services":list({LATERAL_PORTS.get(c["port"],"?") for c in conns if c["src_ip"]==ip or c["dst_ip"]==ip})} for ip in pivots][:10],
            "connection_hubs": hub_list,
            "mitre_techniques": mitre,
            "summary": f"{len(sensitive_hits)} sensitive-port connection(s). {len(pivots)} pivot candidate(s). {'LATERAL MOVEMENT SUSPECTED.' if sensitive_hits else 'No lateral movement detected.'}",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 15 — CARD CLONE DETECTOR
# ══════════════════════════════════════════════════════════════════════════════
def run_card_clone_detector(input_data: str) -> dict:
    try:
        reads = []
        rows = _parse_json_lines(input_data)
        if rows:
            for r in rows:
                uid    = r.get("uid","") or r.get("card_uid","")
                reader = r.get("reader","") or r.get("reader_id","")
                ts     = r.get("timestamp","")
                loc    = r.get("location","")
                if uid:
                    reads.append({"uid":uid,"reader":reader,"timestamp":ts,"location":loc,"granted":r.get("access_granted",True)})
        else:
            for line in input_data.splitlines():
                uid_m  = re.search(r'(?:UID|uid|card)[:\s]+([0-9A-Fa-f]{4,20})', line)
                rdr_m  = re.search(r'(?:reader|door|gate)[:\s]+(\w+)', line, re.I)
                ts_m   = re.search(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})', line)
                if uid_m:
                    reads.append({"uid":uid_m.group(1),"reader":rdr_m.group(1) if rdr_m else "","timestamp":ts_m.group(1) if ts_m else "","location":"","granted":True})

        by_uid: dict = defaultdict(list)
        for r in reads: by_uid[r["uid"]].append(r)

        clone_suspects, rapid_reread, impossible_travel = [], [], []
        for uid, uid_reads in by_uid.items():
            if len(uid_reads) < 2: continue
            readers_used = list({r["reader"] for r in uid_reads})
            if len(readers_used) >= 2:
                for i in range(1, len(uid_reads)):
                    r1 = uid_reads[i-1]; r2 = uid_reads[i]
                    if r1["reader"] != r2["reader"] and r1["timestamp"] and r2["timestamp"]:
                        try:
                            def parse_ts2(ts):
                                for fmt in ["%Y-%m-%dT%H:%M:%S","%Y-%m-%d %H:%M:%S"]:
                                    try: return datetime.strptime(ts[:19],fmt)
                                    except: pass
                                return None
                            t1 = parse_ts2(r1["timestamp"]); t2 = parse_ts2(r2["timestamp"])
                            if t1 and t2:
                                gap = abs((t2-t1).total_seconds())
                                if gap < 300:
                                    impossible_travel.append({"uid":uid,"reader_a":r1["reader"],"reader_b":r2["reader"],"time_gap_seconds":gap,"min_required":300})
                        except: pass
            # Rapid re-read check
            same_reader_reads = defaultdict(list)
            for r in uid_reads: same_reader_reads[r["reader"]].append(r)
            for reader, rreads in same_reader_reads.items():
                if len(rreads) >= 3: rapid_reread.append({"uid":uid,"reader":reader,"reads_count":len(rreads),"time_window_seconds":30})

        if impossible_travel or rapid_reread:
            for it in impossible_travel:
                clone_suspects.append({"uid":it["uid"],"reads":[{"reader":it["reader_a"]},{"reader":it["reader_b"]}],"reason":"Impossible travel detected","confidence":"high"})

        verdict = "clone_detected" if clone_suspects else "suspicious" if rapid_reread else "clean"
        return {
            "total_reads": len(reads), "unique_cards": len(by_uid),
            "unique_readers": len({r["reader"] for r in reads}),
            "clone_suspects": clone_suspects[:10], "rapid_reread_events": rapid_reread[:10],
            "impossible_travel_events": impossible_travel[:10],
            "anomaly_access": [],
            "verdict": verdict,
            "summary": f"{'CLONE DETECTED' if clone_suspects else 'Clean'}: {len(reads)} reads from {len(by_uid)} cards. {len(impossible_travel)} impossible travel event(s).",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 16 — RFID BRUTE FORCE DETECTOR
# ══════════════════════════════════════════════════════════════════════════════
def run_rfid_brute_force_detector(input_data: str) -> dict:
    try:
        reads = []
        for line in input_data.splitlines():
            uid_m = re.search(r'(?:UID|uid)[:\s]+([0-9A-Fa-f]{4,20})', line)
            ts_m  = re.search(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})', line)
            if uid_m:
                reads.append({"uid":uid_m.group(1),"timestamp":ts_m.group(1) if ts_m else ""})
        rows = _parse_json_lines(input_data)
        for r in rows:
            uid = r.get("uid","") or r.get("card_uid","")
            if uid: reads.append({"uid":uid,"timestamp":r.get("timestamp","")})

        if not reads:
            return {"total_reads":0,"automated":False,"summary":"No RFID reads found in input."}

        ts_list = [r["timestamp"] for r in reads if r["timestamp"]]
        duration_min = 1.0
        if len(ts_list) >= 2:
            try:
                def parse_ts3(ts):
                    for fmt in ["%Y-%m-%dT%H:%M:%S","%Y-%m-%d %H:%M:%S"]:
                        try: return datetime.strptime(ts[:19],fmt)
                        except: pass
                    return None
                t1 = parse_ts3(ts_list[0]); t2 = parse_ts3(ts_list[-1])
                if t1 and t2: duration_min = max(0.01, abs((t2-t1).total_seconds())/60)
            except: pass

        rpm = len(reads) / duration_min
        automated = rpm > 60
        conf = "high" if rpm > 200 else "medium" if rpm > 60 else "low"

        uids = [r["uid"] for r in reads]
        try:
            uid_ints = sorted(int(u, 16) for u in uids if re.match(r'^[0-9A-Fa-f]+$', u))
            diffs = [uid_ints[i]-uid_ints[i-1] for i in range(1,min(20,len(uid_ints)))]
            sequential = len(diffs) >= 5 and all(d == diffs[0] for d in diffs) and diffs[0] <= 5
            seq_ranges = [{"start_uid":hex(uid_ints[0]),"end_uid":hex(uid_ints[-1]),"count":len(uid_ints),"increment":diffs[0] if diffs else 1}] if sequential else []
        except:
            sequential = False; seq_ranges = []

        uid_range = f"{min(uids)} → {max(uids)}" if uids else "unknown"
        estimated_tool = "Proxmark3 (automated scan)" if rpm > 200 else "RFID scanner (automated)" if automated else "Manual reader"

        return {
            "total_reads": len(reads), "reads_per_minute": round(rpm, 1),
            "automated": automated, "automation_confidence": conf,
            "sequential_pattern_detected": sequential, "sequential_ranges": seq_ranges,
            "failed_read_spikes": [], "uid_space_coverage": uid_range,
            "estimated_tool": estimated_tool,
            "summary": f"{'AUTOMATED SCAN' if automated else 'Manual reads'}: {rpm:.0f} reads/min. {estimated_tool}. {f'Sequential UIDs detected.' if sequential else ''}",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}


# ══════════════════════════════════════════════════════════════════════════════
# TOOL 17 — SYSMON PARSER
# ══════════════════════════════════════════════════════════════════════════════
def run_sysmon_parser(input_data: str) -> dict:
    try:
        LOLBINS = {"certutil","mshta","wscript","cscript","regsvr32","rundll32","msiexec",
                   "bitsadmin","forfiles","ieexec","msconfig","eventvwr","fodhelper",
                   "pcalua","expand","hh","makecab","odbcconf","print","reg","regasm",
                   "regsvcs","installutil","msbuild","msxsl","csc","vbc","mmc",
                   "diskshadow","dnscmd","nltest","wab","bash","cmstp","control",
                   "mavinject","presentationhost","replace","squirrel","xwizard"}
        SUSP_PARENTS = {
            "winword.exe": ["cmd.exe","powershell.exe","wscript.exe","cscript.exe","mshta.exe"],
            "excel.exe":   ["cmd.exe","powershell.exe","wscript.exe","cscript.exe"],
            "outlook.exe": ["cmd.exe","powershell.exe","wscript.exe","cscript.exe","mshta.exe"],
            "chrome.exe":  ["cmd.exe","powershell.exe"],
            "firefox.exe": ["cmd.exe","powershell.exe"],
            "msedge.exe":  ["cmd.exe","powershell.exe"],
            "msiexec.exe": ["powershell.exe","cmd.exe"],
        }
        ENC_PATTERNS = [r'-enc\s+', r'-encodedcommand', r'-e\s+[A-Za-z0-9+/=]{20,}', r'frombase64string']

        def extract_field(text, field):
            m = re.search(rf'<Data Name="{field}">(.*?)</Data>', text, re.I | re.S)
            if m: return m.group(1).strip()
            m = re.search(rf'"{field}":\s*"([^"]*)"', text)
            if m: return m.group(1).strip()
            return ""

        events = []
        # Try JSON lines first
        rows = _parse_json_lines(input_data)
        if rows:
            for r in rows:
                eid = r.get("EventID") or r.get("event_id") or r.get("Id",0)
                events.append({"event_id":int(eid) if str(eid).isdigit() else 0,
                               "image": r.get("Image","") or r.get("image",""),
                               "cmdline": r.get("CommandLine","") or r.get("command_line",""),
                               "parent_image": r.get("ParentImage","") or r.get("parent_image",""),
                               "parent_cmdline": r.get("ParentCommandLine",""),
                               "pid": r.get("ProcessId",0), "ppid": r.get("ParentProcessId",0),
                               "user": r.get("User",""),
                               "timestamp": r.get("UtcTime","") or r.get("timestamp",""),
                               "raw": json.dumps(r)[:200]})
        else:
            # XML / text — split on <Event> blocks
            blocks = re.split(r'<Event>|(?=\{.*?EventID)', input_data, flags=re.S)
            for block in blocks:
                if not block.strip(): continue
                eid_m = re.search(r'<EventID>(\d+)</EventID>|"Id":\s*(\d+)|EventID\s*=\s*(\d+)', block)
                eid   = int(eid_m.group(1) or eid_m.group(2) or eid_m.group(3)) if eid_m else 0
                events.append({
                    "event_id": eid,
                    "image":        extract_field(block,"Image"),
                    "cmdline":      extract_field(block,"CommandLine"),
                    "parent_image": extract_field(block,"ParentImage"),
                    "parent_cmdline": extract_field(block,"ParentCommandLine"),
                    "pid":  extract_field(block,"ProcessId") or 0,
                    "ppid": extract_field(block,"ParentProcessId") or 0,
                    "user": extract_field(block,"User"),
                    "timestamp": extract_field(block,"UtcTime"),
                    "raw": block[:200],
                })

        by_eid = Counter(e["event_id"] for e in events)
        process_tree, lolbin_hits, susp_chains, encoded_cmds = [], [], [], []
        lsass_access, injection_events, network_conns, reg_mods = [], [], [], []
        mitre_set = set()

        for ev in events:
            eid  = ev["event_id"]
            img  = ev.get("image","").lower()
            cmd  = ev.get("cmdline","").lower()
            par  = ev.get("parent_image","").lower()
            proc = img.split("\\")[-1] if "\\" in img else img.split("/")[-1] if "/" in img else img

            score = 0; flags = []

            if eid == 1:
                # LOLBin check
                if proc in LOLBINS:
                    score += 40; flags.append(f"LOLBin: {proc}")
                    lolbin_hits.append({"process":proc,"cmdline":ev.get("cmdline","")[:200],"parent":par,"timestamp":ev.get("timestamp",""),"lolbin_name":proc,"mitre_technique":"T1218","risk":"high"})
                    mitre_set.add("T1218")
                # Encoded command
                if any(re.search(p, ev.get("cmdline",""), re.I) for p in ENC_PATTERNS):
                    score += 35; flags.append("Encoded/obfuscated command")
                    encoded_cmds.append({"process":proc,"cmdline":ev.get("cmdline","")[:200],"encoding_detected":"base64/encoded","decoded_preview":""})
                    mitre_set.add("T1059.001")
                # Suspicious parent-child
                par_name = par.split("\\")[-1].split("/")[-1] if par else ""
                if par_name in SUSP_PARENTS and proc in SUSP_PARENTS.get(par_name,[]):
                    score += 45; flags.append(f"Suspicious spawn: {par_name} → {proc}")
                    susp_chains.append({"parent":par_name,"child":proc,"cmdline":ev.get("cmdline","")[:200],"reason":f"Office/browser spawning {proc}","mitre_technique":"T1566.001"})
                    mitre_set.add("T1566.001")
                # Temp/appdata path
                if any(p in img.lower() for p in [r"\\temp\\",r"\\appdata\\",r"\\downloads\\","/tmp/","/dev/shm/"]):
                    score += 20; flags.append("Suspicious path (temp/appdata)")
                process_tree.append({"pid":ev.get("pid",0),"name":proc,"image":img,"cmdline":ev.get("cmdline","")[:150],"parent_pid":ev.get("ppid",0),"parent_name":par_name,"user":ev.get("user",""),"timestamp":ev.get("timestamp",""),"anomaly_score":min(score,100),"flags":flags})

            elif eid == 10:
                target = extract_field(ev.get("raw",""), "TargetImage").lower()
                if "lsass" in target:
                    lsass_access.append({"accessing_process":proc,"pid":ev.get("pid",0),"timestamp":ev.get("timestamp","")})
                    mitre_set.add("T1003.001")

            elif eid == 8:
                injection_events.append({"source_process":proc,"target_process":"","timestamp":ev.get("timestamp","")})
                mitre_set.add("T1055")

            elif eid == 3:
                dst_ip = extract_field(ev.get("raw",""), "DestinationIp")
                dst_port = extract_field(ev.get("raw",""), "DestinationPort")
                flagged_conn = not _is_internal(dst_ip) if dst_ip else False
                if dst_ip:
                    network_conns.append({"process":proc,"dst_ip":dst_ip,"dst_port":dst_port,"flagged":flagged_conn,"reason":"External connection" if flagged_conn else ""})

            elif eid in (12,13):
                reg_key = extract_field(ev.get("raw",""), "TargetObject")
                persist = any(p in reg_key.lower() for p in ["currentversion\\run","startup","services"])
                if persist: mitre_set.add("T1547")
                reg_mods.append({"process":proc,"registry_key":reg_key[:150],"details":"","persistence_suspected":persist})

        threat_level = ("critical" if lsass_access or injection_events else
                        "high" if lolbin_hits or susp_chains else
                        "medium" if encoded_cmds else
                        "low" if process_tree else "clean")

        return {
            "total_events": len(events),
            "events_by_id": dict(by_eid.most_common()),
            "process_tree": process_tree[:50],
            "lolbin_hits": lolbin_hits[:20],
            "encoded_commands": encoded_cmds[:10],
            "suspicious_parent_child": susp_chains[:10],
            "lsass_access_events": lsass_access,
            "injection_events": injection_events,
            "network_connections": network_conns[:20],
            "registry_modifications": reg_mods[:20],
            "overall_threat_level": threat_level,
            "mitre_techniques": list(mitre_set),
            "summary": f"Threat: {threat_level.upper()}. {len(lolbin_hits)} LOLBin(s), {len(susp_chains)} suspicious chain(s), {len(lsass_access)} LSASS access, {len(injection_events)} injection(s).",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 18 — PROCESS TREE ANALYSER
# ══════════════════════════════════════════════════════════════════════════════
def run_process_tree_analyser(input_data: str) -> dict:
    try:
        SUSP_PATHS = [r'\temp\\', r'\appdata\local\temp', r'\downloads\\', r'\appdata\roaming',
                      '/tmp/', '/dev/shm/', '/var/tmp/']
        SUSP_SPAWN = {
            "chrome.exe":["cmd.exe","powershell.exe"],"firefox.exe":["cmd.exe","powershell.exe"],
            "winword.exe":["cmd.exe","powershell.exe","wscript.exe"],
            "excel.exe":["cmd.exe","powershell.exe","wscript.exe"],
            "outlook.exe":["cmd.exe","powershell.exe","wscript.exe"],
        }
        procs = []
        rows = _parse_json_lines(input_data)
        if rows:
            for r in rows:
                if isinstance(r, dict) and ("pid" in r or "ProcessId" in r):
                    procs.append({
                        "pid":   int(r.get("pid") or r.get("ProcessId",0) or 0),
                        "ppid":  int(r.get("ppid") or r.get("ParentProcessId",0) or 0),
                        "name":  r.get("name") or r.get("Name",""),
                        "exe":   r.get("exe") or r.get("ExecutablePath","") or r.get("cmdline",""),
                        "cmdline": r.get("cmdline") or r.get("CommandLine",""),
                        "user":  r.get("user") or r.get("User",""),
                        "cpu":   float(r.get("cpu") or r.get("CPU",0) or 0),
                        "mem":   float(r.get("mem") or r.get("MemMB",0) or 0),
                        "status": r.get("status","running"),
                    })
        else:
            # ps aux style: USER PID %CPU %MEM ... COMMAND
            for line in input_data.strip().splitlines():
                p = line.split(None, 10)
                if len(p) >= 7 and p[1].isdigit():
                    procs.append({"pid":int(p[1]),"ppid":0,"name":p[-1].split("/")[-1][:30],"exe":p[-1],"cmdline":p[-1],"user":p[0],"cpu":float(p[2]) if p[2].replace(".","").isdigit() else 0,"mem":float(p[3]) if p[3].replace(".","").isdigit() else 0,"status":"running"})

        by_pid = {p["pid"]: p for p in procs if p.get("pid")}
        high_risk = []
        susp_paths, susp_names, anomalous_spawn, resource_anom = [], [], [], []
        lsass_anom = []

        for proc in procs:
            score = 0; flags = []
            exe  = (proc.get("exe","") or "").lower()
            name = (proc.get("name","") or proc.get("exe","")).split("/")[-1].split("\\")[-1].lower()
            ppid = proc.get("ppid",0)
            parent = by_pid.get(ppid,{})
            parent_name = (parent.get("name","") or "").lower()

            if any(p in exe for p in SUSP_PATHS):
                score += 30; flags.append(f"Suspicious path: {exe[:60]}")
                susp_paths.append({"process":name,"path":exe[:100],"reason":"Runs from temp/appdata/downloads"})

            consonants = max((len(list(g)) for k,g in __import__("itertools").groupby(name.replace(".exe",""), lambda c: c not in "aeiou") if k), default=0)
            if consonants > 8 or (len(name) < 4 and name.endswith(".exe") and name not in {"cmd.exe","sc.exe"}):
                score += 20; flags.append("Suspicious process name")
                susp_names.append({"process":name,"reason":"Random-looking name" if consonants>8 else "Suspiciously short name"})

            if parent_name in SUSP_SPAWN and name in SUSP_SPAWN.get(parent_name,[]):
                score += 30; flags.append(f"Anomalous spawn: {parent_name} → {name}")
                anomalous_spawn.append({"parent":parent_name,"child":name,"reason":f"Browser/office app spawning shell"})

            if proc.get("cpu",0) > 80:
                score += 20; flags.append(f"High CPU: {proc['cpu']}%")
                resource_anom.append({"process":name,"cpu":proc["cpu"],"memory":proc.get("mem",0),"reason":"CPU > 80%"})
            if proc.get("mem",0) > 1000:
                score += 20; flags.append(f"High memory: {proc['mem']}MB")

            if "lsass" in name and (proc.get("user","").upper() not in ("NT AUTHORITY\\SYSTEM","SYSTEM")):
                lsass_anom.append({"process":name,"user":proc.get("user",""),"reason":"lsass running as non-SYSTEM"})
                score += 50; flags.append("LSASS anomaly")

            if score > 0:
                high_risk.append({"name":name,"pid":proc.get("pid",0),"exe":exe[:100],"cmdline":(proc.get("cmdline","") or "")[:100],"user":proc.get("user",""),"cpu":proc.get("cpu",0),"memory":proc.get("mem",0),"risk_score":min(score,100),"flags":flags,"parent_name":parent_name})

        high_risk.sort(key=lambda x: x["risk_score"], reverse=True)
        overall = ("critical" if lsass_anom else "high" if any(p["risk_score"]>=60 for p in high_risk) else "medium" if high_risk else "low" if procs else "clean")

        return {
            "total_processes": len(procs),
            "process_tree": {},
            "high_risk_processes": high_risk[:20],
            "suspicious_paths": susp_paths[:10],
            "suspicious_names": susp_names[:10],
            "anomalous_spawn": anomalous_spawn[:10],
            "resource_anomalies": resource_anom[:10],
            "lsass_anomalies": lsass_anom,
            "overall_risk_level": overall,
            "summary": f"Risk: {overall.upper()}. {len(high_risk)} suspicious process(es) from {len(procs)} total. {len(anomalous_spawn)} anomalous spawn(s). {len(lsass_anom)} LSASS anomaly(s).",
        }
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL 19 — AI UNIVERSAL PARSER
# ══════════════════════════════════════════════════════════════════════════════
def run_ai_universal_parser(input_data: str) -> dict:
    try:
        import groq as _groq, os as _os
        client = _groq.Groq(api_key=_os.getenv("GROQ_API_KEY",""))
        SCHEMA = '{"detected_source":"","detected_format":"","event_type":"","severity":"info","mitre_technique":"","mitre_tactic":"","src_ip":"","dst_ip":"","hostname":"","iocs":[],"key_findings":[],"ai_summary":"","recommended_actions":[]}'
        prompt = f"Analyse this security log and return ONLY valid JSON matching this schema exactly:\n{SCHEMA}\n\nLog:\n{input_data[:8000]}"
        for attempt in range(2):
            try:
                resp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role":"system","content":"You are a cybersecurity log parser. Return ONLY valid JSON, no markdown, no backticks, no explanation."},
                        {"role":"user","content":prompt if attempt == 0 else "Return only a JSON object, no other text. " + prompt}
                    ],
                    max_tokens=800, temperature=0.1,
                )
                text = resp.choices[0].message.content.strip()
                # Extract JSON if wrapped
                json_m = re.search(r'\{.*\}', text, re.S)
                if json_m:
                    result = json.loads(json_m.group(0))
                    return result
            except Exception:
                continue
        return {"detected_source":"unknown","ai_summary":"Could not parse log format automatically","raw_preview":input_data[:500]}
    except Exception as e:
        return {"error": str(e), "raw_input_length": len(input_data)}

# ══════════════════════════════════════════════════════════════════════════════
# TOOL REGISTRY
# ══════════════════════════════════════════════════════════════════════════════
TOOL_REGISTRY = {
    "probe_request_analyser":      run_probe_request_analyser,
    "evil_twin_detector":          run_evil_twin_detector,
    "deauth_timeline":             run_deauth_timeline,
    "handshake_inspector":         run_handshake_inspector,
    "spectrum_analyser":           run_spectrum_analyser,
    "replay_attack_detector":      run_replay_attack_detector,
    "jamming_detector":            run_jamming_detector,
    "keystroke_injection_analyser":run_keystroke_injection_analyser,
    "payload_decoder":             run_payload_decoder,
    "encoded_command_decoder":     run_encoded_command_decoder,
    "suricata_parser":             run_suricata_parser,
    "arp_poison_detector":         run_arp_poison_detector,
    "dns_analyser":                run_dns_analyser,
    "lateral_movement_tracer":     run_lateral_movement_tracer,
    "card_clone_detector":         run_card_clone_detector,
    "rfid_brute_force_detector":   run_rfid_brute_force_detector,
    "sysmon_parser":               run_sysmon_parser,
    "process_tree_analyser":       run_process_tree_analyser,
    "ai_universal_parser":         run_ai_universal_parser,
}
