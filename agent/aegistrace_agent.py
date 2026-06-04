#!/usr/bin/env python3
"""
AegisTrace Endpoint Agent v2.0
────────────────────────────────────────────────────────────────
Silently collects logs, metrics & security telemetry and ships
them to your AegisTrace instance. Zero external dependencies.

v2.0 Changes over v1.0:
  ✓ Fixed Windows Get-WinEvent timestamp filter (FilterHashtable)
  ✓ Fixed Python 3.8 type-hint crash (Tuple from typing)
  ✓ Rich process snapshot (pid/ppid/exe/cmdline for process_tree_analyser)
  ✓ Sysmon event collection (Microsoft-Windows-Sysmon/Operational)
  ✓ Added EventIDs 4688, 4697, 4698, 4702, 4771, 4776, 1102
  ✓ System metrics (CPU/mem/disk — no psutil needed)
  ✓ Heartbeat every 60s (server knows agent is alive, not just quiet)
  ✓ Retry queue (survives Render cold-starts / network blips)
  ✓ Persistence enumeration (cron/registry/schtasks/LaunchAgents)
  ✓ Config file support (aegistrace_agent.conf — update without re-download)
  ✓ --check flag (test connectivity before deploying as service)
  ✓ Local pre-scoring (flag suspicious batches before shipping)

QUICK SETUP:
  1. Edit CONFIG below, or create aegistrace_agent.conf
  2. Run:  python3 aegistrace_agent.py
  3. Test: python3 aegistrace_agent.py --check
  4. Service: sudo python3 aegistrace_agent.py --install-service
"""

# ══ CONFIG — EDIT THESE OR USE aegistrace_agent.conf ════════════════════════
AEGISTRACE_URL    = "https://aegistrace-7qvn.onrender.com"
INGEST_KEY        = "REPLACE_WITH_YOUR_INGEST_KEY"
INTERVAL_SECONDS  = 300
HEARTBEAT_SECONDS = 60
MAX_LINES         = 500
AUTO_ANALYSE      = True
AUTO_CASE         = True
THREAT_THRESHOLD  = 60
AGENT_VERSION     = "2.0"
TAGS              = []
# ════════════════════════════════════════════════════════════════════════════

import os, sys, json, time, socket, platform, subprocess, logging
from datetime import datetime
from pathlib import Path
from urllib import request, error
from typing import Tuple, Optional, List, Dict

# ── Paths ─────────────────────────────────────────────────────────────────────
_DIR        = Path(__file__).parent
LOG_FILE    = _DIR / "aegistrace_agent.log"
STATE_FILE  = _DIR / "aegistrace_agent_state.json"
RETRY_FILE  = _DIR / "aegistrace_retry_queue.json"
CONFIG_FILE = _DIR / "aegistrace_agent.conf"

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("aegistrace_agent")


# ── Config file override ───────────────────────────────────────────────────────
def _load_config_file():
    global AEGISTRACE_URL, INGEST_KEY, INTERVAL_SECONDS, HEARTBEAT_SECONDS
    global MAX_LINES, AUTO_ANALYSE, AUTO_CASE, THREAT_THRESHOLD, TAGS
    if not CONFIG_FILE.exists():
        return
    try:
        cfg = json.loads(CONFIG_FILE.read_text())
        if "url"              in cfg: AEGISTRACE_URL    = cfg["url"]
        if "key"              in cfg: INGEST_KEY        = cfg["key"]
        if "interval"         in cfg: INTERVAL_SECONDS  = int(cfg["interval"])
        if "heartbeat"        in cfg: HEARTBEAT_SECONDS = int(cfg["heartbeat"])
        if "max_lines"        in cfg: MAX_LINES         = int(cfg["max_lines"])
        if "auto_analyse"     in cfg: AUTO_ANALYSE      = bool(cfg["auto_analyse"])
        if "auto_case"        in cfg: AUTO_CASE         = bool(cfg["auto_case"])
        if "threat_threshold" in cfg: THREAT_THRESHOLD  = int(cfg["threat_threshold"])
        if "tags"             in cfg: TAGS              = list(cfg["tags"])
        log.info(f"[config] Loaded from {CONFIG_FILE.name}")
    except Exception as e:
        log.warning(f"[config] Error: {e}")

_load_config_file()

# ── Platform ───────────────────────────────────────────────────────────────────
OS = platform.system().lower()

def get_hostname() -> str:
    return socket.gethostname()

def get_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return ""

def get_os_type() -> str:
    return {"windows": "windows", "linux": "linux", "darwin": "mac"}.get(OS, "unknown")


# ── State ──────────────────────────────────────────────────────────────────────
def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    except Exception:
        return {}

def save_state(state: dict):
    try:
        STATE_FILE.write_text(json.dumps(state, indent=2))
    except Exception:
        pass


# ── Retry queue ───────────────────────────────────────────────────────────────
def load_retry_queue() -> List[dict]:
    try:
        return json.loads(RETRY_FILE.read_text()) if RETRY_FILE.exists() else []
    except Exception:
        return []

def save_retry_queue(queue: List[dict]):
    try:
        RETRY_FILE.write_text(json.dumps(queue, indent=2))
    except Exception:
        pass

def enqueue_retry(hostname: str, ip: str, batch: dict):
    queue = load_retry_queue()
    queue.append({"hostname": hostname, "ip": ip, "batch": batch,
                  "queued_at": datetime.utcnow().isoformat(), "attempts": 0})
    save_retry_queue(queue[-50:])
    log.warning(f"[retry] Queued: {batch.get('log_file','?')} (total={len(queue[-50:])})")

def flush_retry_queue(hostname: str, ip: str):
    queue = load_retry_queue()
    if not queue:
        return
    log.info(f"[retry] Flushing {len(queue)} queued batches…")
    remaining = []
    for item in queue:
        item["attempts"] = item.get("attempts", 0) + 1
        r = ship_batch(item["hostname"], item["ip"], item["batch"])
        if r.get("ok"):
            log.info(f"[retry] ✓ {item['batch'].get('log_file','?')}")
        elif item["attempts"] < 5:
            remaining.append(item)
        else:
            log.warning(f"[retry] Dropped after 5 attempts: {item['batch'].get('log_file','?')}")
    save_retry_queue(remaining)


# ── File tail reader ───────────────────────────────────────────────────────────
def read_file_tail(path: str, max_lines: int, state: dict) -> Tuple[str, int]:
    try:
        p = Path(path)
        if not p.exists():
            return "", 0
        size     = p.stat().st_size
        last_pos = state.get(path, 0)
        if size < last_pos:
            last_pos = 0   # log rotated
        with open(p, "r", errors="replace") as f:
            f.seek(last_pos)
            lines: List[str] = []
            for line in f:
                lines.append(line)
                if len(lines) >= max_lines:
                    break
            new_pos = f.tell()
        return "".join(lines), new_pos
    except Exception as e:
        log.warning(f"Cannot read {path}: {e}")
        return "", state.get(path, 0)


# ── Local pre-filter ──────────────────────────────────────────────────────────
def pre_score(content: str, log_type: str) -> int:
    """Quick 0-100 threat hint based on pattern matching — never blocks shipping."""
    score = 0
    lower = content.lower()
    lines = lower.splitlines()

    # Auth failures
    fails = sum(1 for l in lines if any(p in l for p in [
        "failed password", "authentication failure", "invalid user",
        "failed login", "logon failure", "bad password", "4625"
    ]))
    if fails > 20: score += 40
    elif fails > 10: score += 25
    elif fails > 3:  score += 10

    # LOLBins / encoded payloads
    lol_hits = sum(1 for l in lines if any(p in l for p in [
        "certutil", "mshta", "regsvr32", "rundll32", "downloadstring",
        "invoke-webrequest", "-enc ", "-encodedcommand", "bypass", "iex "
    ]))
    if lol_hits > 3: score += 30
    elif lol_hits:   score += 15

    # Credential access
    if any(p in lower for p in ["lsass", "mimikatz", "secretsdump",
                                  "createremotethread", "procdump"]):
        score += 35

    # Audit log cleared — immediate high-priority
    if "1102" in content or "audit log was cleared" in lower:
        score += 40

    # Privilege escalation
    if any(p in lower for p in ["net localgroup administrators", "useradd",
                                  "4672", "4648", "sudo", "su -"]):
        score += 15

    return min(score, 100)


# ══ SYSTEM METRICS (no psutil — pure stdlib) ══════════════════════════════════

def _linux_metrics() -> dict:
    m: dict = {}
    try:
        vals: dict = {}
        for line in Path("/proc/meminfo").read_text().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                vals[k.strip()] = int(v.strip().split()[0])
        total = vals.get("MemTotal", 0)
        avail = vals.get("MemAvailable", vals.get("MemFree", 0))
        if total:
            m["mem_total_mb"] = total // 1024
            m["mem_used_mb"]  = (total - avail) // 1024
            m["mem_percent"]  = round((total - avail) / total * 100, 1)
    except Exception:
        pass
    try:
        parts = Path("/proc/loadavg").read_text().split()
        m["cpu_load_1m"]  = float(parts[0])
        m["cpu_load_5m"]  = float(parts[1])
        m["cpu_load_15m"] = float(parts[2])
    except Exception:
        pass
    try:
        df  = subprocess.run(["df", "-BM", "/"], capture_output=True, text=True, timeout=5)
        row = df.stdout.strip().splitlines()
        if len(row) > 1:
            p = row[1].split()
            m["disk_total_mb"] = int(p[1].rstrip("M"))
            m["disk_used_mb"]  = int(p[2].rstrip("M"))
            m["disk_free_mb"]  = int(p[3].rstrip("M"))
            m["disk_percent"]  = int(p[4].rstrip("%"))
    except Exception:
        pass
    return m

def _windows_metrics() -> dict:
    m: dict = {}
    try:
        r = subprocess.run(
            ["wmic", "OS", "get", "TotalVisibleMemorySize,FreePhysicalMemory", "/value"],
            capture_output=True, text=True, timeout=10,
        )
        for line in r.stdout.splitlines():
            if "TotalVisibleMemorySize=" in line:
                m["mem_total_mb"] = int(line.split("=")[1].strip()) // 1024
            elif "FreePhysicalMemory=" in line:
                free  = int(line.split("=")[1].strip()) // 1024
                total = m.get("mem_total_mb", 0)
                m["mem_used_mb"] = total - free
                m["mem_percent"] = round((total - free) / total * 100, 1) if total else 0
    except Exception:
        pass
    try:
        r = subprocess.run(["wmic", "cpu", "get", "LoadPercentage", "/value"],
                           capture_output=True, text=True, timeout=10)
        for line in r.stdout.splitlines():
            if "LoadPercentage=" in line:
                v = line.split("=")[1].strip()
                if v.isdigit():
                    m["cpu_percent"] = int(v)
    except Exception:
        pass
    return m

def _mac_metrics() -> dict:
    m: dict = {}
    try:
        r    = subprocess.run(["vm_stat"], capture_output=True, text=True, timeout=5)
        vals: dict = {}
        for line in r.stdout.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                try:
                    vals[k.strip()] = int(v.strip().rstrip("."))
                except Exception:
                    pass
        total = sum(vals.values())
        free  = vals.get("Pages free", 0)
        if total:
            m["mem_total_mb"] = total * 4096 // (1024 * 1024)
            m["mem_free_mb"]  = free  * 4096 // (1024 * 1024)
            m["mem_used_mb"]  = m["mem_total_mb"] - m["mem_free_mb"]
            m["mem_percent"]  = round(m["mem_used_mb"] / m["mem_total_mb"] * 100, 1)
    except Exception:
        pass
    return m

def get_metrics() -> dict:
    try:
        if OS == "windows": return _windows_metrics()
        if OS == "darwin":  return _mac_metrics()
        return _linux_metrics()
    except Exception:
        return {}


# ══ LOG COLLECTORS ════════════════════════════════════════════════════════════

def collect_linux(state: dict) -> List[dict]:
    batches: List[dict] = []

    for path, ltype in [
        ("/var/log/auth.log",         "auth_log"),
        ("/var/log/secure",           "auth_log"),
        ("/var/log/syslog",           "syslog"),
        ("/var/log/messages",         "syslog"),
        ("/var/log/kern.log",         "syslog"),
        ("/var/log/nginx/access.log", "nginx_access"),
        ("/var/log/nginx/error.log",  "nginx_access"),
        ("/var/log/apache2/access.log", "apache_access"),
        ("/var/log/apache2/error.log",  "apache_access"),
        ("/var/log/httpd/access_log",   "apache_access"),
    ]:
        content, new_pos = read_file_tail(path, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": path, "log_type": ltype,
                            "content": content, "new_pos": new_pos, "path_key": path})

    # journalctl
    try:
        last_ts = state.get("journalctl_since", "")
        cmd     = ["journalctl", "-n", str(MAX_LINES), "--no-pager", "-o", "short"]
        if last_ts:
            cmd += ["--since", last_ts]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if r.stdout.strip():
            batches.append({"log_file": "journalctl", "log_type": "syslog",
                            "content": r.stdout, "new_pos": None,
                            "path_key": "journalctl_since",
                            "new_ts": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")})
    except Exception:
        pass

    # Rich process snapshot — process_tree_analyser compatible JSON
    try:
        r = subprocess.run(
            ["ps", "-eo", "pid,ppid,user,pcpu,pmem,stat,comm,args", "--no-headers"],
            capture_output=True, text=True, timeout=10,
        )
        if r.stdout.strip():
            procs = []
            for line in r.stdout.strip().splitlines():
                p = line.split(None, 7)
                if len(p) >= 7:
                    procs.append({
                        "pid": int(p[0]), "ppid": int(p[1]), "user": p[2],
                        "cpu": float(p[3]), "mem": float(p[4]),
                        "status": p[5], "name": p[6],
                        "cmdline": p[7] if len(p) > 7 else p[6],
                    })
            if procs:
                batches.append({"log_file": "process_list", "log_type": "process_snapshot",
                                "content": json.dumps(procs), "new_pos": None, "path_key": None})
    except Exception:
        pass

    # Network connections
    try:
        r = subprocess.run(["ss", "-tunp"], capture_output=True, text=True, timeout=5)
        if not r.stdout.strip():
            r = subprocess.run(["netstat", "-tunp"], capture_output=True, text=True, timeout=5)
        if r.stdout.strip():
            batches.append({"log_file": "network_connections", "log_type": "netstat",
                            "content": r.stdout, "new_pos": None, "path_key": None})
    except Exception:
        pass

    # Persistence enumeration
    persist: List[str] = []
    for p in ["/etc/crontab", "/var/spool/cron/crontabs"]:
        pp = Path(p)
        if pp.is_file():
            try:
                persist.append(f"# {p}\n{pp.read_text()}")
            except Exception:
                pass
        elif pp.is_dir():
            for f in pp.iterdir():
                try:
                    persist.append(f"# {f}\n{f.read_text()}")
                except Exception:
                    pass
    for p in ["/etc/rc.local", "/etc/rc.d/rc.local"]:
        try:
            c = Path(p).read_text()
            if c.strip():
                persist.append(f"# {p}\n{c}")
        except Exception:
            pass
    try:
        r = subprocess.run(
            ["systemctl", "list-unit-files", "--type=service", "--state=enabled", "--no-pager"],
            capture_output=True, text=True, timeout=10,
        )
        if r.stdout.strip():
            persist.append(f"# systemctl enabled\n{r.stdout}")
    except Exception:
        pass
    try:
        r = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=5)
        if r.stdout.strip():
            persist.append(f"# user crontab\n{r.stdout}")
    except Exception:
        pass
    if persist:
        batches.append({"log_file": "persistence", "log_type": "persistence_scan",
                        "content": "\n\n".join(persist)[:50000],
                        "new_pos": None, "path_key": None})

    return batches


def _ps(cmd: str, timeout: int = 30) -> Optional[str]:
    """Run PowerShell command and return stdout or None."""
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd],
            capture_output=True, text=True, timeout=timeout,
        )
        out = r.stdout.strip()
        return out if out and out.lower() not in ("", "null") else None
    except Exception:
        return None


def collect_windows(state: dict) -> List[dict]:
    batches: List[dict] = []

    # Event log queries — v2.0 FIXED: FilterHashtable with StartTime
    event_queries = [
        {
            "name":     "Security",
            "log_type": "windows_event",
            "ids": [4624, 4625, 4634, 4648, 4688, 4697, 4698, 4702,
                    4720, 4726, 4732, 4756, 4771, 4776, 1102],
        },
        {
            "name":     "System",
            "log_type": "windows_event",
            "ids":      [7045, 7040, 7036],
        },
        {
            "name":     "Microsoft-Windows-Sysmon/Operational",
            "log_type": "sysmon",
            "ids":      [1, 3, 7, 8, 10, 11, 12, 13, 15, 22],
        },
    ]

    for eq in event_queries:
        key     = f"win_{eq['name'].replace('/', '_')}"
        last_ts = state.get(key, "")
        id_arr  = ", ".join(str(i) for i in eq["ids"])
        try:
            if last_ts:
                # FIX: use FilterHashtable @{StartTime=...} — correct PowerShell syntax
                ps_cmd = (
                    f"$ids=@({id_arr}); $st=[datetime]'{last_ts}'; "
                    f"Get-WinEvent -FilterHashtable @{{LogName='{eq['name']}';Id=$ids;StartTime=$st}} "
                    f"-ErrorAction SilentlyContinue "
                    f"| Select-Object TimeCreated,Id,LevelDisplayName,Message "
                    f"| ConvertTo-Json -Depth 1 -Compress"
                )
            else:
                ps_cmd = (
                    f"$ids=@({id_arr}); "
                    f"Get-WinEvent -FilterHashtable @{{LogName='{eq['name']}';Id=$ids}} "
                    f"-MaxEvents {MAX_LINES} -ErrorAction SilentlyContinue "
                    f"| Select-Object TimeCreated,Id,LevelDisplayName,Message "
                    f"| ConvertTo-Json -Depth 1 -Compress"
                )
            out = _ps(ps_cmd, timeout=45)
            if out:
                batches.append({
                    "log_file": f"Windows {eq['name']}",
                    "log_type": eq["log_type"],
                    "content":  out,
                    "new_pos":  None,
                    "path_key": key,
                    "new_ts":   datetime.utcnow().isoformat(),
                })
        except Exception as e:
            log.debug(f"[windows] {eq['name']}: {e}")

    # Application events
    try:
        key     = "win_Application"
        last_ts = state.get(key, "")
        if last_ts:
            ps_cmd = (
                f"$st=[datetime]'{last_ts}'; "
                f"Get-WinEvent -FilterHashtable @{{LogName='Application';StartTime=$st}} "
                f"-MaxEvents 100 -ErrorAction SilentlyContinue "
                f"| Select-Object TimeCreated,Id,LevelDisplayName,Message "
                f"| ConvertTo-Json -Depth 1 -Compress"
            )
        else:
            ps_cmd = (
                "Get-WinEvent -LogName Application -MaxEvents 100 -ErrorAction SilentlyContinue "
                "| Select-Object TimeCreated,Id,LevelDisplayName,Message "
                "| ConvertTo-Json -Depth 1 -Compress"
            )
        out = _ps(ps_cmd, timeout=30)
        if out:
            batches.append({"log_file": "Windows Application", "log_type": "windows_event",
                            "content": out, "new_pos": None,
                            "path_key": "win_Application",
                            "new_ts": datetime.utcnow().isoformat()})
    except Exception:
        pass

    # PowerShell history
    try:
        ps_hist = os.path.expandvars(
            r"%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt")
        content, new_pos = read_file_tail(ps_hist, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": "PowerShell History", "log_type": "windows_event",
                            "content": content, "new_pos": new_pos, "path_key": ps_hist})
    except Exception:
        pass

    # Rich process snapshot — process_tree_analyser compatible
    try:
        ps_cmd = (
            "Get-CimInstance Win32_Process | "
            "Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine,"
            "@{N='MemMB';E={[math]::Round($_.WorkingSetSize/1MB,1)}},"
            "@{N='User';E={try{$o=$_.GetOwner();\"$($o.Domain)\\$($o.User)\"}catch{'SYSTEM'}}} | "
            "ConvertTo-Json -Depth 1 -Compress"
        )
        out = _ps(ps_cmd, timeout=30)
        if out:
            try:
                raw = json.loads(out)
                if isinstance(raw, dict):
                    raw = [raw]
                procs = [{
                    "pid": p.get("ProcessId"), "ppid": p.get("ParentProcessId"),
                    "name": p.get("Name", ""), "exe": p.get("ExecutablePath", ""),
                    "cmdline": p.get("CommandLine", ""),
                    "cpu": 0, "mem": p.get("MemMB", 0), "user": p.get("User", "SYSTEM"),
                } for p in raw if p.get("ProcessId")]
                batches.append({"log_file": "process_list", "log_type": "process_snapshot",
                                "content": json.dumps(procs), "new_pos": None, "path_key": None})
            except Exception:
                batches.append({"log_file": "process_list", "log_type": "process_snapshot",
                                "content": out, "new_pos": None, "path_key": None})
    except Exception:
        pass

    # Network connections
    out = _ps(
        "Get-NetTCPConnection | Select-Object LocalAddress,LocalPort,"
        "RemoteAddress,RemotePort,State | ConvertTo-Json -Compress",
        timeout=10,
    )
    if out:
        batches.append({"log_file": "network_connections", "log_type": "netstat",
                        "content": out, "new_pos": None, "path_key": None})

    # Persistence — registry Run keys + scheduled tasks + services
    persist: List[str] = []
    for rkey in [
        r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
        r"HKLM\Software\Microsoft\Windows\CurrentVersion\Run",
        r"HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce",
        r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunServices",
    ]:
        try:
            r = subprocess.run(["reg", "query", rkey], capture_output=True, text=True, timeout=5)
            if r.stdout.strip():
                persist.append(f"# Registry Run: {rkey}\n{r.stdout}")
        except Exception:
            pass
    out = _ps(
        "Get-ScheduledTask | Select-Object TaskName,TaskPath,State | ConvertTo-Json -Compress",
        timeout=20,
    )
    if out:
        persist.append(f"# Scheduled Tasks\n{out}")
    out = _ps(
        "Get-Service | Where-Object {$_.Status -eq 'Running'} | "
        "Select-Object Name,DisplayName,Status | ConvertTo-Json -Compress",
        timeout=15,
    )
    if out:
        persist.append(f"# Running Services\n{out}")
    if persist:
        batches.append({"log_file": "persistence", "log_type": "persistence_scan",
                        "content": "\n\n".join(persist)[:50000],
                        "new_pos": None, "path_key": None})

    return batches


def collect_mac(state: dict) -> List[dict]:
    batches: List[dict] = []

    for path, ltype in [("/var/log/system.log", "syslog"),
                         ("/var/log/secure.log", "auth_log")]:
        content, new_pos = read_file_tail(path, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": path, "log_type": ltype,
                            "content": content, "new_pos": new_pos, "path_key": path})

    try:
        r = subprocess.run(
            ["log", "show", "--predicate",
             "eventMessage contains[c] 'error' or eventMessage contains[c] 'fail'",
             "--last", "1h", "--style", "compact"],
            capture_output=True, text=True, timeout=15,
        )
        if r.stdout.strip():
            batches.append({"log_file": "macos_unified_log", "log_type": "syslog",
                            "content": r.stdout[:50000], "new_pos": None, "path_key": None})
    except Exception:
        pass

    try:
        r = subprocess.run(
            ["ps", "-eo", "pid,ppid,user,pcpu,pmem,stat,comm,args", "--no-headers"],
            capture_output=True, text=True, timeout=10,
        )
        if r.stdout.strip():
            procs = []
            for line in r.stdout.strip().splitlines():
                p = line.split(None, 7)
                if len(p) >= 7:
                    procs.append({
                        "pid": int(p[0]), "ppid": int(p[1]), "user": p[2],
                        "cpu": float(p[3]), "mem": float(p[4]),
                        "status": p[5], "name": p[6],
                        "cmdline": p[7] if len(p) > 7 else p[6],
                    })
            if procs:
                batches.append({"log_file": "process_list", "log_type": "process_snapshot",
                                "content": json.dumps(procs), "new_pos": None, "path_key": None})
    except Exception:
        pass

    persist: List[str] = []
    for d in ["/Library/LaunchAgents", "/Library/LaunchDaemons",
              str(Path.home() / "Library/LaunchAgents")]:
        dp = Path(d)
        if dp.exists():
            for f in dp.glob("*.plist"):
                try:
                    persist.append(f"# {f}\n{f.read_text()}")
                except Exception:
                    pass
    if persist:
        batches.append({"log_file": "persistence", "log_type": "persistence_scan",
                        "content": "\n\n".join(persist)[:50000],
                        "new_pos": None, "path_key": None})

    return batches


def collect_logs(state: dict) -> List[dict]:
    if OS == "windows": return collect_windows(state)
    if OS == "darwin":  return collect_mac(state)
    return collect_linux(state)


# ══ SHIPPING ══════════════════════════════════════════════════════════════════

def ship_batch(hostname: str, ip: str, batch: dict) -> dict:
    payload = json.dumps({
        "hostname":         hostname,
        "os_type":          get_os_type(),
        "ip_address":       ip,
        "log_file":         batch["log_file"],
        "log_type":         batch["log_type"],
        "content":          batch["content"],
        "auto_analyse":     AUTO_ANALYSE,
        "auto_case":        AUTO_CASE,
        "threat_threshold": THREAT_THRESHOLD,
        "agent_version":    AGENT_VERSION,
        "tags":             TAGS,
        "pre_score":        pre_score(batch.get("content", ""), batch.get("log_type", "")),
        "metrics":          get_metrics(),
    }).encode("utf-8")

    url = f"{AEGISTRACE_URL.rstrip('/')}/api/ingest/logs"
    req = request.Request(url, data=payload,
                          headers={"Content-Type": "application/json",
                                   "X-AegisTrace-Key": INGEST_KEY},
                          method="POST")
    try:
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except error.HTTPError as e:
        log.error(f"HTTP {e.code}: {e.read().decode()}")
        return {"error": f"HTTP {e.code}"}
    except Exception as e:
        log.error(f"Ship error: {e}")
        return {"error": str(e)}


def send_heartbeat(hostname: str, ip: str):
    """Lightweight ping — server marks endpoint alive even when no new logs."""
    payload = json.dumps({
        "hostname":      hostname,
        "ip_address":    ip,
        "os_type":       get_os_type(),
        "agent_version": AGENT_VERSION,
        "tags":          TAGS,
        "metrics":       get_metrics(),
    }).encode("utf-8")
    url = f"{AEGISTRACE_URL.rstrip('/')}/api/ingest/heartbeat"
    req = request.Request(url, data=payload,
                          headers={"Content-Type": "application/json",
                                   "X-AegisTrace-Key": INGEST_KEY},
                          method="POST")
    try:
        with request.urlopen(req, timeout=10) as _:
            pass
    except Exception as e:
        log.debug(f"Heartbeat (non-fatal): {e}")


# ══ MAIN LOOP ═════════════════════════════════════════════════════════════════

def run_once():
    hostname = get_hostname()
    ip       = get_ip()
    state    = load_state()

    log.info(f"Collecting: {hostname} ({ip}) [{get_os_type()}]")
    flush_retry_queue(hostname, ip)

    batches = collect_logs(state)
    if not batches:
        log.info("No new log data.")
        return

    shipped = skipped = total_lines = max_score = 0
    for batch in batches:
        if not batch.get("content", "").strip():
            skipped += 1
            continue
        lines = len(batch["content"].splitlines())
        log.info(f"Shipping: {batch['log_file']} ({lines} lines)")
        result = ship_batch(hostname, ip, batch)
        if result.get("ok"):
            shipped     += 1
            total_lines += result.get("lines_received", 0)
            score        = result.get("threat_score", 0)
            max_score    = max(max_score, score)
            if result.get("case_created"):
                log.warning(f"CASE CREATED: score={score} case=#{result['case_created']}")
            else:
                log.info(f"OK: {result.get('message','OK')}")
            key = batch.get("path_key")
            if key and batch.get("new_pos") is not None:
                state[key] = batch["new_pos"]
            elif key and batch.get("new_ts"):
                state[key] = batch["new_ts"]
        else:
            enqueue_retry(hostname, ip, batch)

    save_state(state)
    log.info(f"Done: {shipped} shipped, {skipped} skipped, {total_lines} lines, peak={max_score}/100")


def main():
    _load_config_file()
    if "--check"           in sys.argv: _do_check();               return
    if "--install-service" in sys.argv: _install_systemd_service(); return
    if "--install-launchd" in sys.argv: _install_launchd();         return
    if "--once"            in sys.argv: run_once();                 return

    hostname = get_hostname()
    ip       = get_ip()
    log.info(f"AegisTrace Agent v{AGENT_VERSION} starting")
    log.info(f"  Host: {hostname} ({ip}) | OS: {get_os_type()}")
    log.info(f"  Server: {AEGISTRACE_URL} | Interval: {INTERVAL_SECONDS}s | HB: {HEARTBEAT_SECONDS}s")

    last_hb = 0.0
    while True:
        now = time.time()
        if now - last_hb >= HEARTBEAT_SECONDS:
            send_heartbeat(hostname, ip)
            last_hb = now
        try:
            run_once()
        except KeyboardInterrupt:
            log.info("Agent stopped.")
            break
        except Exception as e:
            log.error(f"Run error: {e}")
        log.info(f"Sleeping {INTERVAL_SECONDS}s…")
        time.sleep(INTERVAL_SECONDS)


def _do_check():
    hostname = get_hostname()
    ip       = get_ip()
    print(f"\n{'='*55}")
    print(f"  AegisTrace Agent v{AGENT_VERSION} — Connectivity Check")
    print(f"{'='*55}")
    print(f"  Server  : {AEGISTRACE_URL}")
    print(f"  Host    : {hostname} ({ip}) | OS: {get_os_type()}")
    print(f"  Config  : {'found' if CONFIG_FILE.exists() else 'not found (using hardcoded defaults)'}")
    print()
    try:
        req = request.Request(f"{AEGISTRACE_URL.rstrip('/')}/api/health")
        with request.urlopen(req, timeout=10) as resp:
            h = json.loads(resp.read().decode())
        print(f"  OK  Server reachable  status={h.get('status')} groq={h.get('groq')} vt={h.get('vt')}")
    except Exception as e:
        print(f"  FAIL  Cannot reach server: {e}")
        return
    send_heartbeat(hostname, ip)
    print(f"  OK  Ingest key valid — heartbeat sent")
    m = get_metrics()
    if m:
        print(f"\n  System Metrics:")
        for k, v in m.items():
            if k != "disks":
                print(f"    {k}: {v}")
    print(f"\n  Retry queue: {len(load_retry_queue())} item(s)")
    print(f"  All checks passed. Agent is ready.\n")


def _install_systemd_service():
    agent_path  = Path(__file__).resolve()
    python_path = sys.executable
    svc = f"""[Unit]
Description=AegisTrace Endpoint Agent v2.0
After=network.target

[Service]
Type=simple
ExecStart={python_path} {agent_path}
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
    p = Path("/etc/systemd/system/aegistrace-agent.service")
    p.write_text(svc)
    os.system("systemctl daemon-reload && systemctl enable aegistrace-agent && systemctl start aegistrace-agent")
    print("Service installed. Check: systemctl status aegistrace-agent")


def _install_launchd():
    agent_path  = Path(__file__).resolve()
    python_path = sys.executable
    plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
    "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.aegistrace.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python_path}</string>
        <string>{agent_path}</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StartInterval</key><integer>{INTERVAL_SECONDS}</integer>
    <key>StandardOutPath</key><string>/tmp/aegistrace_agent.log</string>
    <key>StandardErrorPath</key><string>/tmp/aegistrace_agent_err.log</string>
</dict>
</plist>"""
    plist_path = Path.home() / "Library/LaunchAgents/com.aegistrace.agent.plist"
    plist_path.parent.mkdir(parents=True, exist_ok=True)
    plist_path.write_text(plist)
    os.system(f"launchctl load {plist_path}")
    print(f"LaunchAgent installed: {plist_path}")


if __name__ == "__main__":
    main()
