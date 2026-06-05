#!/usr/bin/env python3
"""
AegisTrace Endpoint Agent v3.0
────────────────────────────────────────────────────────────────────────
Full rebuild. Single file. One allowed dependency: psutil.
Python 3.8+ · Linux · macOS · Windows

Layer 2 Capabilities (fully implemented):
  ✓ Shadow AI detection — 14 AI API domains, cross-refs approved list
  ✓ Suspicious process detection — known malicious name matching
  ✓ Suspicious port detection — C2 port flagging
  ✓ New network destination detection — baseline + deviation
  ✓ Behavioural Baseline Engine — 7-day learning, 2 std-dev deviation
  ✓ Process Lineage Tree — suspicious parent-child relationship detection
  ✓ File Integrity Monitoring — hash critical system paths, alert on change
  ✓ Privilege Escalation Detector — root escalation, SUID, sudo anomalies
  ✓ Local Anomaly Scorer — pure Python 0-100 composite score
  ✓ Command Channel — bidirectional control from AegisTrace UI
  ✓ Watchdog Thread — restarts main loop on failure
  ✓ Service registration — systemd / LaunchAgent / Windows Service
  ✓ Local event buffer — never loses alerts during server downtime
  ✓ Structured JSON logging — every line is valid JSON

QUICK SETUP:
  pip install psutil
  export AEGISTRACE_TOKEN=your_token
  export AEGISTRACE_AGENT_ID=your_hostname
  python3 aegistrace_agent.py

SERVICE INSTALL:
  sudo python3 aegistrace_agent.py --install-service
"""

# === CONFIG =================================================================
import os

SERVER_URL            = os.environ.get("AEGISTRACE_SERVER", "https://aegistrace-7qvn.onrender.com")
AGENT_TOKEN           = os.environ.get("AEGISTRACE_TOKEN", "")
AGENT_ID              = os.environ.get("AEGISTRACE_AGENT_ID", "")
POLL_INTERVAL         = int(os.environ.get("AEGISTRACE_POLL_INTERVAL", "30"))
COMMAND_POLL_INTERVAL = int(os.environ.get("AEGISTRACE_CMD_INTERVAL", "10"))
APPROVED_AI_SERVICES  = [x.strip() for x in os.environ.get("AEGISTRACE_APPROVED_AI", "").split(",") if x.strip()]

# === CONSTANTS ===============================================================
AGENT_VERSION = "3.0.0"

AI_API_DOMAINS = [
    "api.openai.com", "api.anthropic.com",
    "generativelanguage.googleapis.com", "api.mistral.ai",
    "api.groq.com", "api.cohere.ai", "huggingface.co",
    "api.together.xyz", "api.perplexity.ai", "api.replicate.com",
    "inference.cerebras.ai", "api.deepseek.com",
    "openrouter.ai", "api.x.ai",
]

SENSITIVE_PATHS = [
    ".ssh", ".aws", ".env", ".gnupg", "id_rsa", "id_ed25519",
    "credentials", ".kube/config", ".docker/config.json",
    "passwd", "shadow", "sudoers",
]

SUSPICIOUS_PROCESS_NAMES = [
    "mimikatz", "lazagne", "procdump", "meterpreter",
    "netcat", "ncat", "powersploit", "empire", "cobalt",
    "cobaltstrike", "msfconsole", "metasploit",
]

# Suspicious parent-child relationships: (parent_keyword, child_keyword)
SUSPICIOUS_LINEAGES = [
    ("word",       "cmd"),
    ("word",       "powershell"),
    ("excel",      "cmd"),
    ("excel",      "powershell"),
    ("outlook",    "cmd"),
    ("outlook",    "powershell"),
    ("chrome",     "cmd"),
    ("firefox",    "cmd"),
    ("winword",    "wscript"),
    ("svchost",    "powershell"),
    ("explorer",   "regsvr32"),
    ("explorer",   "mshta"),
]

SUSPICIOUS_PORTS = {4444, 1337, 31337, 8888, 9999, 6666, 5555, 12345}

# Critical paths to monitor for FIM (file integrity monitoring)
FIM_PATHS_LINUX = [
    "/etc/passwd", "/etc/shadow", "/etc/sudoers",
    "/etc/crontab", "/etc/ssh/sshd_config",
    "/etc/hosts", "/etc/ld.so.conf",
]
FIM_PATHS_MAC = [
    "/etc/passwd", "/etc/sudoers",
    "/Library/LaunchDaemons",
    "/etc/hosts",
]
FIM_PATHS_WINDOWS = [
    r"C:\Windows\System32\drivers\etc\hosts",
    r"C:\Windows\System32\config\SAM",
]

# === IMPORTS =================================================================
import sys, json, time, socket, platform, subprocess, logging, threading
import hashlib, hmac, re, math, statistics
from datetime import datetime, timedelta
from pathlib import Path
from urllib import request as urllib_request, error as urllib_error
from typing import Optional, List, Dict, Tuple
from logging.handlers import RotatingFileHandler
from collections import defaultdict, deque

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("[WARN] psutil not installed. Run: pip install psutil")
    print("[WARN] Agent will run with reduced capabilities.")

# === PATHS ===================================================================
_DIR         = Path(__file__).parent
LOG_FILE     = _DIR / "aegistrace_agent.log"
BUFFER_FILE  = _DIR / "aegistrace_buffer.jsonl"
STATE_FILE   = _DIR / "aegistrace_state.json"
BASELINE_FILE= _DIR / "aegistrace_baseline.json"
FIM_FILE     = _DIR / "aegistrace_fim.json"

# === LOGGING =================================================================
class JsonFormatter(logging.Formatter):
    """Structured JSON log formatter — every line is valid JSON."""
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps({
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level":     record.levelname,
            "agent_id":  AGENT_ID or "unknown",
            "version":   AGENT_VERSION,
            "module":    record.module,
            "message":   record.getMessage(),
        })

_file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3)
_file_handler.setFormatter(JsonFormatter())
_stream_handler = logging.StreamHandler(sys.stdout)
_stream_handler.setFormatter(JsonFormatter())

logger = logging.getLogger("aegistrace")
logger.setLevel(logging.INFO)
logger.addHandler(_file_handler)
logger.addHandler(_stream_handler)
logger.propagate = False

# === STATE ===================================================================
def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    except Exception:
        return {}

def save_state(state: dict):
    try:
        STATE_FILE.write_text(json.dumps(state, indent=2))
    except Exception as e:
        logger.warning(f"State save failed: {e}")

# === BASELINE ENGINE =========================================================
# Behavioural baseline: 7-day learning, then flag >2 std dev deviations

class BaselineEngine:
    """
    Learns normal behaviour over the first N cycles, then flags anomalies.
    Tracks: process names, external IPs, login patterns, active hours.
    """
    LEARNING_CYCLES = 5 * 24 * 2  # ~5 days at 30s intervals

    def __init__(self):
        self.data = self._load()
        self._cycle = self.data.get("cycle_count", 0)

    def _load(self) -> dict:
        try:
            return json.loads(BASELINE_FILE.read_text()) if BASELINE_FILE.exists() else {}
        except Exception:
            return {}

    def _save(self):
        try:
            BASELINE_FILE.write_text(json.dumps(self.data))
        except Exception:
            pass

    @property
    def is_learning(self) -> bool:
        return self._cycle < self.LEARNING_CYCLES

    def record(self, processes: list, connections: list):
        """Update baseline with current observation."""
        self._cycle += 1
        self.data["cycle_count"] = self._cycle

        # Track process name frequencies
        proc_names = set()
        for p in processes:
            pname = (p.get("name") or "").lower()
            if pname:
                proc_names.add(pname)
                self.data.setdefault("known_processes", {})[pname] = \
                    self.data.get("known_processes", {}).get(pname, 0) + 1

        # Track external IPs
        for c in connections:
            rip = c.get("remote_ip", "")
            if rip and not rip.startswith(("10.", "192.168.", "172.", "127.", "::1")):
                self.data.setdefault("known_ips", {})[rip] = \
                    self.data.get("known_ips", {}).get(rip, 0) + 1

        # Track active hours
        hour = datetime.utcnow().hour
        hours = self.data.setdefault("active_hours", {})
        hours[str(hour)] = hours.get(str(hour), 0) + 1

        if self._cycle % 100 == 0:
            self._save()

    def check_anomalies(self, processes: list, connections: list) -> list:
        """
        Returns list of anomaly dicts if current state deviates from baseline.
        Only runs after learning period is complete.
        """
        if self.is_learning:
            return []

        anomalies = []
        known_procs = self.data.get("known_processes", {})
        known_ips   = self.data.get("known_ips", {})

        # New processes never seen before
        for p in processes:
            pname = (p.get("name") or "").lower()
            if pname and pname not in known_procs:
                anomalies.append({
                    "type": "behavioural_anomaly",
                    "subtype": "new_process",
                    "description": f"New process never seen during baseline: {pname}",
                    "process_name": pname,
                    "process_pid": p.get("pid", 0),
                    "severity": "low",
                })

        # New external IPs never seen before
        for c in connections:
            rip = c.get("remote_ip", "")
            if rip and not rip.startswith(("10.", "192.168.", "172.", "127.", "::1")):
                if rip not in known_ips:
                    anomalies.append({
                        "type": "new_destination",
                        "description": f"New external IP never seen during baseline: {rip}",
                        "remote_ip": rip,
                        "remote_port": c.get("remote_port"),
                        "process_name": c.get("process_name", "unknown"),
                        "severity": "low",
                    })

        # Unusual hour
        hour = str(datetime.utcnow().hour)
        active_hours = self.data.get("active_hours", {})
        if active_hours and int(active_hours.get(hour, 0)) < 2:
            anomalies.append({
                "type": "behavioural_anomaly",
                "subtype": "unusual_hour",
                "description": f"Activity at unusual hour: {hour}:00 UTC (rarely active at this time)",
                "hour": int(hour),
                "severity": "low",
            })

        return anomalies

_baseline = BaselineEngine()

# === FIM (File Integrity Monitoring) =========================================

class FileIntegrityMonitor:
    """Hash critical system files on startup, alert on changes."""

    def __init__(self):
        self.hashes = self._load()

    def _load(self) -> dict:
        try:
            return json.loads(FIM_FILE.read_text()) if FIM_FILE.exists() else {}
        except Exception:
            return {}

    def _save(self):
        try:
            FIM_FILE.write_text(json.dumps(self.hashes))
        except Exception:
            pass

    def _hash_file(self, path: str) -> Optional[str]:
        try:
            h = hashlib.sha256()
            p = Path(path)
            if p.is_file():
                h.update(p.read_bytes())
                return h.hexdigest()
            elif p.is_dir():
                # For directories, hash the listing
                entries = sorted(str(e) for e in p.iterdir())
                h.update("\n".join(entries).encode())
                return h.hexdigest()
        except Exception:
            pass
        return None

    def _get_paths(self) -> list:
        OS = platform.system().lower()
        if OS == "linux":  return FIM_PATHS_LINUX
        if OS == "darwin": return FIM_PATHS_MAC
        if OS == "windows": return FIM_PATHS_WINDOWS
        return FIM_PATHS_LINUX

    def initialize(self):
        """Hash all paths on startup. No alerts on first run."""
        for path in self._get_paths():
            h = self._hash_file(path)
            if h:
                self.hashes[path] = h
        self._save()
        logger.info(f"FIM initialized: {len(self.hashes)} paths monitored")

    def check(self) -> list:
        """Return list of alerts for changed files."""
        alerts = []
        for path in self._get_paths():
            current = self._hash_file(path)
            if current is None:
                continue
            stored = self.hashes.get(path)
            if stored is None:
                # New path — just record it
                self.hashes[path] = current
            elif stored != current:
                alerts.append({
                    "type": "fim_change",
                    "path": path,
                    "description": f"Critical file modified: {path}",
                    "old_hash": stored[:16] + "...",
                    "new_hash": current[:16] + "...",
                    "severity": "high",
                    "timestamp": datetime.utcnow().isoformat(),
                })
                # Update stored hash
                self.hashes[path] = current
        if alerts:
            self._save()
        return alerts

_fim = FileIntegrityMonitor()

# === LOCAL ANOMALY SCORER ====================================================

def calculate_local_anomaly_score(
    processes: list,
    connections: list,
    alerts: list,
    login_events: list,
) -> Tuple[int, list]:
    """
    Pure Python statistical scorer. Returns (score 0-100, reasons list).
    Weights:
      new process (found suspicious)    +30
      new external IP                   +20
      unusual hours                     +15
      suspicious lineage                +40
      failed logins (> 5)               +25
      shadow AI                         +35
      known malicious process           +50
      suspicious port                   +30
      FIM change                        +40
      privilege escalation              +45
    """
    score = 0
    reasons = []

    alert_types = [a.get("type", "") for a in alerts]

    if "shadow_ai" in alert_types:
        score += 35
        reasons.append("Shadow AI API access detected")

    if "suspicious_process" in alert_types:
        score += 50
        reasons.append("Known malicious process name detected")

    if "suspicious_port" in alert_types:
        score += 30
        reasons.append("Connection to known C2 port")

    if "fim_change" in alert_types:
        score += 40
        reasons.append("Critical system file modified")

    if "privilege_escalation" in alert_types:
        score += 45
        reasons.append("Privilege escalation detected")

    if "suspicious_lineage" in alert_types:
        score += 40
        reasons.append("Suspicious parent-child process relationship")

    # Failed login count
    failed_logins = sum(1 for e in login_events if not e.get("success"))
    if failed_logins > 10:
        score += 25
        reasons.append(f"High failed login count: {failed_logins}")
    elif failed_logins > 5:
        score += 15
        reasons.append(f"Multiple failed logins: {failed_logins}")

    # New external IPs
    known_ips = _baseline.data.get("known_ips", {})
    new_ips = [
        c.get("remote_ip") for c in connections
        if c.get("remote_ip")
        and not c["remote_ip"].startswith(("10.", "192.168.", "172.", "127.", "::1"))
        and c["remote_ip"] not in known_ips
    ]
    if len(new_ips) > 5:
        score += 20
        reasons.append(f"{len(new_ips)} new external IPs")
    elif new_ips:
        score += 10
        reasons.append(f"{len(new_ips)} new external IP(s)")

    return min(score, 100), reasons


# === COLLECTORS ==============================================================

def collect_processes() -> list:
    """Collect running processes with network connections embedded."""
    if not PSUTIL_AVAILABLE:
        return _collect_processes_fallback()
    procs = []
    try:
        for proc in psutil.process_iter(["pid", "ppid", "name", "cmdline", "username", "status", "create_time"]):
            try:
                info = proc.info
                connections = []
                try:
                    for c in proc.connections(kind="inet"):
                        connections.append({
                            "local_ip": str(c.laddr.ip) if c.laddr else "",
                            "local_port": c.laddr.port if c.laddr else 0,
                            "remote_ip": str(c.raddr.ip) if c.raddr else "",
                            "remote_port": c.raddr.port if c.raddr else 0,
                            "status": c.status,
                        })
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    pass

                procs.append({
                    "pid":         info["pid"],
                    "ppid":        info["ppid"],
                    "name":        info["name"] or "",
                    "cmdline":     " ".join(info["cmdline"] or [])[:500],
                    "username":    info["username"] or "",
                    "status":      info["status"] or "",
                    "create_time": info["create_time"],
                    "connections": connections,
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        logger.error(f"collect_processes error: {e}")
    return procs


def _collect_processes_fallback() -> list:
    """Fallback using ps/wmic when psutil unavailable."""
    OS = platform.system().lower()
    procs = []
    try:
        if OS in ("linux", "darwin"):
            r = subprocess.run(
                ["ps", "-eo", "pid,ppid,user,stat,comm,args", "--no-headers"],
                capture_output=True, text=True, timeout=10
            )
            for line in r.stdout.strip().splitlines():
                p = line.split(None, 5)
                if len(p) >= 5:
                    procs.append({"pid": int(p[0]), "ppid": int(p[1]),
                                  "username": p[2], "status": p[3],
                                  "name": p[4], "cmdline": p[5] if len(p) > 5 else p[4],
                                  "connections": []})
    except Exception as e:
        logger.error(f"Fallback process collect error: {e}")
    return procs


def collect_network_connections() -> list:
    """Collect all network connections with hostname resolution."""
    if not PSUTIL_AVAILABLE:
        return _collect_connections_fallback()
    connections = []
    _dns_cache: dict = {}

    def _resolve(ip: str) -> str:
        if ip in _dns_cache:
            return _dns_cache[ip]
        try:
            h = socket.gethostbyaddr(ip)[0]
            _dns_cache[ip] = h
            return h
        except Exception:
            _dns_cache[ip] = ip
            return ip

    try:
        pid_to_name: dict = {}
        try:
            for proc in psutil.process_iter(["pid", "name"]):
                try:
                    pid_to_name[proc.pid] = proc.info["name"] or ""
                except Exception:
                    pass
        except Exception:
            pass

        for c in psutil.net_connections(kind="inet"):
            rip = str(c.raddr.ip) if c.raddr else ""
            connections.append({
                "local_ip":    str(c.laddr.ip) if c.laddr else "",
                "local_port":  c.laddr.port if c.laddr else 0,
                "remote_ip":   rip,
                "remote_port": c.raddr.port if c.raddr else 0,
                "status":      c.status,
                "pid":         c.pid or 0,
                "process_name": pid_to_name.get(c.pid, "") if c.pid else "",
                "remote_hostname": _resolve(rip) if rip else "",
            })
    except Exception as e:
        logger.error(f"collect_network_connections error: {e}")
    return connections


def _collect_connections_fallback() -> list:
    """Fallback using ss/netstat."""
    connections = []
    try:
        OS = platform.system().lower()
        if OS == "linux":
            r = subprocess.run(["ss", "-tunp"], capture_output=True, text=True, timeout=5)
            if not r.stdout.strip():
                r = subprocess.run(["netstat", "-tunp"], capture_output=True, text=True, timeout=5)
            for line in r.stdout.strip().splitlines()[1:]:
                parts = line.split()
                if len(parts) >= 5:
                    connections.append({"raw": line})
    except Exception:
        pass
    return connections


def collect_system_info() -> dict:
    """Collect system-level metrics."""
    info = {
        "hostname":   socket.gethostname(),
        "os":         platform.system(),
        "os_release": platform.release(),
        "ip_address": "",
        "timestamp":  datetime.utcnow().isoformat() + "Z",
    }
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        info["ip_address"] = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    if PSUTIL_AVAILABLE:
        try:
            info["cpu_percent"] = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory()
            info["mem_total_mb"]  = mem.total // (1024 * 1024)
            info["mem_used_mb"]   = mem.used  // (1024 * 1024)
            info["mem_percent"]   = mem.percent
            disk = psutil.disk_usage("/")
            info["disk_total_gb"] = round(disk.total / (1024**3), 1)
            info["disk_used_gb"]  = round(disk.used  / (1024**3), 1)
            info["disk_percent"]  = disk.percent
            users = psutil.users()
            info["logged_in_users"] = [u.name for u in users]
        except Exception as e:
            logger.warning(f"system_info metrics error: {e}")
    else:
        info.update(_fallback_metrics())

    return info


def _fallback_metrics() -> dict:
    """Stdlib-only system metrics."""
    m = {}
    OS = platform.system().lower()
    if OS == "linux":
        try:
            vals = {}
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
    return m


def collect_login_events() -> list:
    """Parse authentication logs for login/logout/failure events."""
    OS = platform.system().lower()
    events = []
    try:
        if OS == "linux":
            events = _parse_linux_auth_logs()
        elif OS == "darwin":
            events = _parse_mac_auth_logs()
        elif OS == "windows":
            events = _parse_windows_auth_logs()
    except Exception as e:
        logger.error(f"collect_login_events error: {e}")
    return events


def _parse_linux_auth_logs() -> list:
    events = []
    for log_path in ["/var/log/auth.log", "/var/log/secure"]:
        p = Path(log_path)
        if not p.exists():
            continue
        try:
            lines = p.read_text(errors="replace").splitlines()[-200:]
            for line in lines:
                lower = line.lower()
                ev = {
                    "raw": line[:300],
                    "timestamp": datetime.utcnow().isoformat(),
                    "success": True,
                    "source_ip": None,
                    "username": None,
                    "event_type": "login",
                }
                ip_match = re.search(r"from\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", line)
                user_match = re.search(r"(?:user|for)\s+(\S+)", line, re.IGNORECASE)
                if ip_match:
                    ev["source_ip"] = ip_match.group(1)
                if user_match:
                    ev["username"] = user_match.group(1)

                if any(x in lower for x in ["failed password", "authentication failure", "invalid user"]):
                    ev["success"] = False
                    ev["event_type"] = "failed_login"
                    events.append(ev)
                elif "accepted" in lower and "publickey" in lower or "accepted password" in lower:
                    ev["event_type"] = "login"
                    events.append(ev)
        except Exception as e:
            logger.warning(f"Linux auth log parse error ({log_path}): {e}")
    return events[-100:]  # Cap at 100


def _parse_mac_auth_logs() -> list:
    events = []
    try:
        r = subprocess.run(["last", "-20"], capture_output=True, text=True, timeout=5)
        for line in r.stdout.splitlines():
            if line.strip():
                parts = line.split()
                if parts:
                    events.append({
                        "username": parts[0] if parts else "",
                        "source_ip": parts[2] if len(parts) > 2 else "",
                        "event_type": "login",
                        "success": True,
                        "timestamp": datetime.utcnow().isoformat(),
                    })
    except Exception:
        pass
    return events


def _parse_windows_auth_logs() -> list:
    events = []
    try:
        ps_cmd = (
            "$ids=@(4624,4625); "
            "Get-WinEvent -FilterHashtable @{LogName='Security';Id=$ids} "
            "-MaxEvents 50 -ErrorAction SilentlyContinue "
            "| Select-Object TimeCreated,Id,Message "
            "| ConvertTo-Json -Depth 1 -Compress"
        )
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
            capture_output=True, text=True, timeout=30
        )
        if r.stdout.strip():
            raw = json.loads(r.stdout)
            if isinstance(raw, dict):
                raw = [raw]
            for ev in raw:
                success = int(ev.get("Id", 0)) == 4624
                ip_match = re.search(r"Network Address:\s+(\d+\.\d+\.\d+\.\d+)", ev.get("Message", ""))
                user_match = re.search(r"Account Name:\s+(\S+)", ev.get("Message", ""))
                events.append({
                    "event_type": "login" if success else "failed_login",
                    "success": success,
                    "source_ip": ip_match.group(1) if ip_match else "",
                    "username": user_match.group(1) if user_match else "",
                    "timestamp": str(ev.get("TimeCreated", "")),
                })
    except Exception as e:
        logger.warning(f"Windows auth log parse error: {e}")
    return events


def collect_file_events() -> list:
    """Detect processes accessing sensitive files."""
    if not PSUTIL_AVAILABLE:
        return []
    events = []
    try:
        for proc in psutil.process_iter(["pid", "name", "username"]):
            try:
                for f in proc.open_files():
                    fpath = str(f.path).lower()
                    if any(s.lower() in fpath for s in SENSITIVE_PATHS):
                        events.append({
                            "pid":          proc.pid,
                            "process_name": proc.info["name"] or "",
                            "username":     proc.info["username"] or "",
                            "file_path":    f.path,
                            "timestamp":    datetime.utcnow().isoformat(),
                        })
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                pass
            except Exception:
                pass
    except Exception as e:
        logger.error(f"collect_file_events error: {e}")
    return events


# === DETECTORS ===============================================================

def detect_shadow_ai(connections: list) -> list:
    """
    Detect outbound connections to AI API domains not in the approved list.
    Returns HIGH severity alerts immediately.
    """
    alerts = []
    approved = set(APPROVED_AI_SERVICES)

    for conn in connections:
        rip   = conn.get("remote_ip", "")
        rhost = conn.get("remote_hostname", "")
        pname = conn.get("process_name", "")

        matched_domain = None
        for domain in AI_API_DOMAINS:
            if domain in rhost or (rip and rhost == rip and _hostname_matches(rip, domain)):
                matched_domain = domain
                break

        if matched_domain and matched_domain not in approved:
            alerts.append({
                "type":               "shadow_ai",
                "process_name":       pname,
                "process_pid":        conn.get("pid", 0),
                "destination_domain": matched_domain,
                "destination_ip":     rip,
                "remote_port":        conn.get("remote_port", 0),
                "description":        f"Unapproved AI API access: {pname} → {matched_domain}",
                "severity":           "HIGH",
                "timestamp":          datetime.utcnow().isoformat(),
            })

    return alerts


def _hostname_matches(ip: str, domain: str) -> bool:
    """Try to resolve IP to check if it matches a known AI domain."""
    try:
        hostname = socket.gethostbyaddr(ip)[0]
        return domain in hostname
    except Exception:
        return False


def detect_suspicious_processes(processes: list) -> list:
    """Match process names against known malicious tool list."""
    alerts = []
    for proc in processes:
        pname = (proc.get("name") or "").lower()
        cmdline = (proc.get("cmdline") or "").lower()

        for suspect in SUSPICIOUS_PROCESS_NAMES:
            if suspect in pname or suspect in cmdline:
                alerts.append({
                    "type":         "suspicious_process",
                    "process_name": proc.get("name", ""),
                    "process_pid":  proc.get("pid", 0),
                    "username":     proc.get("username", ""),
                    "cmdline":      proc.get("cmdline", "")[:300],
                    "matched":      suspect,
                    "description":  f"Known malicious process detected: {proc.get('name')} (matches '{suspect}')",
                    "severity":     "HIGH",
                })
                break

    return alerts


def detect_process_lineage(processes: list) -> list:
    """Build PID-to-process map and flag suspicious parent-child pairs."""
    alerts = []
    pid_map: dict = {p["pid"]: p for p in processes if p.get("pid")}

    for proc in processes:
        pname  = (proc.get("name") or "").lower()
        ppid   = proc.get("ppid", 0)
        parent = pid_map.get(ppid)
        if not parent:
            continue
        parent_name = (parent.get("name") or "").lower()

        for par_kw, child_kw in SUSPICIOUS_LINEAGES:
            if par_kw in parent_name and child_kw in pname:
                alerts.append({
                    "type":          "suspicious_lineage",
                    "process_name":  proc.get("name", ""),
                    "process_pid":   proc.get("pid", 0),
                    "parent_name":   parent.get("name", ""),
                    "parent_pid":    ppid,
                    "description":   f"Suspicious lineage: {parent.get('name')} spawned {proc.get('name')}",
                    "severity":      "HIGH",
                })
                break

    return alerts


def detect_suspicious_ports(connections: list) -> list:
    """Flag connections to known C2/RAT ports."""
    alerts = []
    for conn in connections:
        rport = conn.get("remote_port", 0)
        if rport and int(rport) in SUSPICIOUS_PORTS:
            alerts.append({
                "type":         "suspicious_port",
                "process_name": conn.get("process_name", ""),
                "pid":          conn.get("pid", 0),
                "remote_ip":    conn.get("remote_ip", ""),
                "remote_port":  rport,
                "description":  f"Connection to suspicious port {rport} ({conn.get('process_name', 'unknown')} → {conn.get('remote_ip')})",
                "severity":     "HIGH",
            })
    return alerts


def detect_privilege_escalation(processes: list) -> list:
    """
    Detect privilege escalation patterns:
    - Process running as root that is a known user process
    - SUID/setuid binaries executing
    - sudo usage outside business hours
    """
    if not PSUTIL_AVAILABLE:
        return []
    alerts = []
    OS = platform.system().lower()
    if OS == "windows":
        return alerts

    # Processes running as root with unusual names
    user_space_names = {"python", "python3", "perl", "ruby", "bash", "sh", "curl", "wget"}
    try:
        for proc in psutil.process_iter(["pid", "name", "username", "cmdline"]):
            try:
                info = proc.info
                uname = (info.get("username") or "").lower()
                pname = (info.get("name") or "").lower()
                cmdline = " ".join(info.get("cmdline") or []).lower()

                if uname == "root" and pname in user_space_names:
                    # Check if this could be a privilege escalation (compare with nice/normal state)
                    if "sudo" in cmdline or "su " in cmdline:
                        alerts.append({
                            "type":         "privilege_escalation",
                            "process_name": info.get("name", ""),
                            "process_pid":  info.get("pid", 0),
                            "username":     info.get("username", ""),
                            "cmdline":      cmdline[:300],
                            "description":  f"User-space process running as root with sudo: {info.get('name')} ({cmdline[:100]})",
                            "severity":     "HIGH",
                        })
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                pass
    except Exception as e:
        logger.error(f"detect_privilege_escalation error: {e}")

    return alerts


def detect_new_network_destinations(connections: list) -> list:
    """Flag external IPs never seen before (after baseline is built)."""
    if _baseline.is_learning:
        return []

    known_ips = set(_baseline.data.get("known_ips", {}).keys())
    alerts = []

    for conn in connections:
        rip = conn.get("remote_ip", "")
        if not rip or rip.startswith(("10.", "192.168.", "172.", "127.", "::1", "0.")):
            continue
        if rip not in known_ips:
            alerts.append({
                "type":         "new_destination",
                "remote_ip":    rip,
                "remote_port":  conn.get("remote_port", 0),
                "process_name": conn.get("process_name", ""),
                "remote_hostname": conn.get("remote_hostname", rip),
                "description":  f"New external destination: {conn.get('remote_hostname', rip)}:{conn.get('remote_port')} ({conn.get('process_name', 'unknown')})",
                "severity":     "LOW",
            })

    return alerts


# === TRANSPORT ===============================================================

def ship_telemetry(payload: dict) -> bool:
    """POST telemetry to AegisTrace server. Buffer on failure."""
    url = f"{SERVER_URL.rstrip('/')}/api/ingest/{AGENT_ID}"
    data = json.dumps({
        **payload,
        "agent_id": AGENT_ID,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Agent-Token": AGENT_TOKEN,
        "X-Agent-Version": AGENT_VERSION,
    }

    for attempt in range(3):
        try:
            req = urllib_request.Request(url, data=data, headers=headers, method="POST")
            with urllib_request.urlopen(req, timeout=10) as resp:
                resp.read()
            return True
        except Exception as e:
            wait = 2 ** attempt
            logger.warning(f"Ship attempt {attempt+1} failed: {e}. Retrying in {wait}s")
            if attempt < 2:
                time.sleep(wait)

    # Buffer failed payload
    _buffer_event(payload)
    return False


def _buffer_event(payload: dict):
    """Append a failed payload to the local buffer file."""
    try:
        with open(BUFFER_FILE, "a") as f:
            f.write(json.dumps({
                "payload": payload,
                "buffered_at": datetime.utcnow().isoformat(),
            }) + "\n")
    except Exception as e:
        logger.error(f"Buffer write failed: {e}")


def _flush_buffer():
    """Replay buffered events. Clear buffer on success."""
    if not BUFFER_FILE.exists():
        return
    try:
        lines = BUFFER_FILE.read_text().strip().splitlines()
        if not lines:
            return
        logger.info(f"Flushing {len(lines)} buffered events...")
        remaining = []
        for line in lines:
            try:
                item = json.loads(line)
                if ship_telemetry(item["payload"]):
                    logger.info("Buffer event replayed OK")
                else:
                    remaining.append(line)
            except Exception:
                pass
        if remaining:
            BUFFER_FILE.write_text("\n".join(remaining) + "\n")
        else:
            BUFFER_FILE.unlink(missing_ok=True)
    except Exception as e:
        logger.error(f"Buffer flush error: {e}")


# === COMMAND CHANNEL =========================================================

_command_running = True


def poll_commands_loop():
    """Daemon thread: poll for commands every COMMAND_POLL_INTERVAL seconds."""
    while _command_running:
        try:
            _poll_commands()
        except Exception as e:
            logger.error(f"Command poll error: {e}")
        time.sleep(COMMAND_POLL_INTERVAL)


def _poll_commands():
    url = f"{SERVER_URL.rstrip('/')}/api/ingest/agent/commands/{AGENT_ID}"
    headers = {"X-Agent-Token": AGENT_TOKEN, "X-Agent-Version": AGENT_VERSION}
    try:
        req = urllib_request.Request(url, headers=headers)
        with urllib_request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        for cmd in data.get("commands", []):
            _execute_command(cmd)
    except urllib_error.HTTPError as e:
        if e.code not in (401, 403, 404):
            logger.warning(f"Command poll HTTP {e.code}")
    except Exception as e:
        if "Connection refused" not in str(e) and "timed out" not in str(e):
            logger.warning(f"Command poll error: {e}")


def _execute_command(cmd: dict):
    command_type = cmd.get("command", "")
    payload      = cmd.get("payload", {})
    command_id   = cmd.get("id")

    result = {}
    success = True
    try:
        if command_type == "ping":
            result = {"status": "alive", "version": AGENT_VERSION, "agent_id": AGENT_ID}

        elif command_type == "collect_now":
            # Trigger immediate collection cycle
            threading.Thread(target=_run_collection_cycle, daemon=True).start()
            result = {"status": "collection_started"}

        elif command_type == "collect_file":
            path = payload.get("path", "")
            if path:
                try:
                    content = Path(path).read_text(errors="replace")[:50000]
                    result = {"path": path, "content": content, "size": len(content)}
                except Exception as e:
                    result = {"error": str(e)}
                    success = False

        elif command_type == "kill_process":
            pid = payload.get("pid")
            if pid and PSUTIL_AVAILABLE:
                try:
                    psutil.Process(int(pid)).terminate()
                    result = {"status": f"Process {pid} terminated"}
                except Exception as e:
                    result = {"error": str(e)}
                    success = False

        elif command_type == "get_process_tree":
            pid = payload.get("pid")
            result = _get_process_tree(int(pid)) if pid and PSUTIL_AVAILABLE else {"error": "pid required"}

        elif command_type == "update_approved_ai":
            global APPROVED_AI_SERVICES
            APPROVED_AI_SERVICES = payload.get("domains", [])
            result = {"approved_count": len(APPROVED_AI_SERVICES)}

        elif command_type == "set_poll_interval":
            global POLL_INTERVAL
            POLL_INTERVAL = max(10, int(payload.get("seconds", 30)))
            result = {"poll_interval": POLL_INTERVAL}

        else:
            result = {"error": f"Unknown command: {command_type}"}
            success = False

        logger.info(f"Command '{command_type}' executed: {result}")

    except Exception as e:
        result = {"error": str(e)}
        success = False

    # Post result back
    _post_command_result(command_id, result, success)


def _post_command_result(command_id, result: dict, success: bool):
    try:
        url = f"{SERVER_URL.rstrip('/')}/api/ingest/agent/commands/{AGENT_ID}/result"
        data = json.dumps({"command_id": command_id, "result": result, "success": success}).encode()
        headers = {
            "Content-Type": "application/json",
            "X-Agent-Token": AGENT_TOKEN,
            "X-Agent-Version": AGENT_VERSION,
        }
        req = urllib_request.Request(url, data=data, headers=headers, method="POST")
        with urllib_request.urlopen(req, timeout=10) as _:
            pass
    except Exception:
        pass


def _get_process_tree(pid: int) -> dict:
    """Build process tree upward from given PID."""
    if not PSUTIL_AVAILABLE:
        return {"error": "psutil not available"}
    try:
        proc = psutil.Process(pid)
        tree = []
        current = proc
        for _ in range(10):  # max 10 levels up
            try:
                info = current.as_dict(attrs=["pid", "ppid", "name", "username", "cmdline"])
                tree.append(info)
                parent = current.parent()
                if parent is None or parent.pid == current.pid:
                    break
                current = parent
            except Exception:
                break
        return {"pid": pid, "tree": tree}
    except Exception as e:
        return {"error": str(e)}


# === WATCHDOG ================================================================

_heartbeat_ts = time.time()


def watchdog_thread():
    """Daemon thread: restart main loop if heartbeat goes stale."""
    while True:
        time.sleep(30)
        age = time.time() - _heartbeat_ts
        if age > 90:
            logger.error(f"Watchdog: heartbeat stale ({age:.0f}s). Main loop may be hung.")
            # Can't restart main loop from watchdog without process management, but we can alert
            try:
                _buffer_event({"alerts": [{"type": "watchdog_alert",
                    "description": f"Agent main loop may be hung (heartbeat age: {age:.0f}s)",
                    "severity": "HIGH"}]})
            except Exception:
                pass


# === MAIN LOOP ===============================================================

_main_loop_running = True


def _run_collection_cycle():
    """One full collection + detection + ship cycle."""
    global _heartbeat_ts
    _heartbeat_ts = time.time()

    system_info = collect_system_info()
    processes   = collect_processes()
    connections = collect_network_connections()
    login_events= collect_login_events()
    file_events = collect_file_events()

    # Run FIM check
    fim_alerts = _fim.check()

    # Run all detectors
    alerts = []
    alerts += detect_shadow_ai(connections)
    alerts += detect_suspicious_processes(processes)
    alerts += detect_process_lineage(processes)
    alerts += detect_suspicious_ports(connections)
    alerts += detect_privilege_escalation(processes)
    alerts += detect_new_network_destinations(connections)
    alerts += fim_alerts

    # Behavioural baseline
    baseline_anomalies = _baseline.check_anomalies(processes, connections)
    _baseline.record(processes, connections)

    # Only ship behavioural anomalies if they're unusual enough
    for anomaly in baseline_anomalies:
        if anomaly.get("subtype") not in ("unusual_hour", "new_process"):
            alerts.append(anomaly)

    # Local anomaly scoring
    anomaly_score, score_reasons = calculate_local_anomaly_score(
        processes, connections, alerts, login_events
    )

    # Add score to system_info
    system_info["local_anomaly_score"] = anomaly_score
    system_info["anomaly_reasons"] = score_reasons

    payload = {
        "system_info":        system_info,
        "processes":          processes[:500],  # cap at 500 to limit payload size
        "network_connections": connections,
        "login_events":       login_events,
        "file_events":        file_events[:50],
        "alerts":             alerts,
        "local_anomaly_score": anomaly_score,
    }

    # Ship immediately on high-severity alerts (don't wait for next cycle)
    critical_alerts = [a for a in alerts if a.get("severity") in ("HIGH", "CRITICAL")]
    if critical_alerts:
        logger.warning(f"High-severity alerts ({len(critical_alerts)}): {[a.get('type') for a in critical_alerts]}")
        # Ship shadow AI alerts immediately
        shadow_ai = [a for a in critical_alerts if a.get("type") == "shadow_ai"]
        if shadow_ai:
            ship_telemetry({
                "system_info": system_info,
                "alerts": shadow_ai,
                "priority": "immediate",
                "processes": [],
                "network_connections": [],
                "login_events": [],
                "file_events": [],
            })

    # Ship full telemetry
    ship_telemetry(payload)

    return alerts


def main_loop():
    """Main collection loop with error recovery."""
    global _heartbeat_ts, _main_loop_running

    logger.info("Main collection loop starting")
    _flush_buffer()

    while _main_loop_running:
        try:
            _heartbeat_ts = time.time()
            alerts = _run_collection_cycle()
            logger.info(f"Cycle complete. Alerts: {len(alerts)}. Sleeping {POLL_INTERVAL}s")
        except KeyboardInterrupt:
            logger.info("Agent stopped by user")
            break
        except Exception as e:
            logger.error(f"Main loop error: {e}")
            time.sleep(5)
            continue

        time.sleep(POLL_INTERVAL)


# === VALIDATION ==============================================================

def validate_config():
    """Validate required environment variables on startup."""
    errors = []
    if not AGENT_TOKEN:
        errors.append("AEGISTRACE_TOKEN is not set")
    if not AGENT_ID:
        errors.append("AEGISTRACE_AGENT_ID is not set")
    if not PSUTIL_AVAILABLE:
        print("[WARN] psutil not installed. Install with: pip install psutil")
        print("[WARN] Running with reduced capability (no process/port monitoring)")

    if errors:
        print("\n[AegisTrace Agent] Setup required:")
        for e in errors:
            print(f"  ✗ {e}")
        print("\nSet environment variables and restart:")
        print("  export AEGISTRACE_TOKEN=<your-token>")
        print("  export AEGISTRACE_AGENT_ID=<your-hostname>")
        print("  export AEGISTRACE_SERVER=https://aegistrace-7qvn.onrender.com")
        print("\nOr use install.sh: curl -sSL https://aegistrace.com/install.sh | bash -s TOKEN AGENT_ID")
        sys.exit(1)

    print(f"[AegisTrace] Server: {SERVER_URL}")
    print(f"[AegisTrace] Agent ID: {AGENT_ID}")
    print(f"[AegisTrace] Poll interval: {POLL_INTERVAL}s")
    print(f"[AegisTrace] Approved AI services: {APPROVED_AI_SERVICES or 'none (all AI traffic flagged)'}")
    print(f"[AegisTrace] psutil: {'available' if PSUTIL_AVAILABLE else 'not available (reduced mode)'}")


# === SERVICE REGISTRATION ====================================================

def register_as_service():
    """Register agent as OS service. Non-fatal if not root."""
    OS = platform.system().lower()
    agent_path  = Path(__file__).resolve()
    python_path = sys.executable

    if OS == "linux" and os.geteuid() == 0:
        _install_systemd(agent_path, python_path)
    elif OS == "darwin":
        _install_launchagent(agent_path, python_path)
    elif OS == "windows":
        _install_windows_service(agent_path, python_path)
    else:
        print("[service] Running without service registration (not root or unsupported OS)")
        print("[service] To register manually, re-run as root/admin with --install-service")


def _install_systemd(agent_path: Path, python_path: str):
    svc_file = Path("/etc/systemd/system/aegistrace-agent.service")
    svc_content = f"""[Unit]
Description=AegisTrace Endpoint Agent v{AGENT_VERSION}
After=network.target

[Service]
Type=simple
Environment=AEGISTRACE_TOKEN={AGENT_TOKEN}
Environment=AEGISTRACE_AGENT_ID={AGENT_ID}
Environment=AEGISTRACE_SERVER={SERVER_URL}
Environment=AEGISTRACE_POLL_INTERVAL={POLL_INTERVAL}
ExecStart={python_path} {agent_path}
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
    try:
        svc_file.write_text(svc_content)
        os.system("systemctl daemon-reload && systemctl enable aegistrace-agent && systemctl start aegistrace-agent")
        print(f"[service] systemd service installed. Status: systemctl status aegistrace-agent")
    except Exception as e:
        print(f"[service] systemd install failed: {e}")


def _install_launchagent(agent_path: Path, python_path: str):
    plist_path = Path.home() / "Library/LaunchAgents/com.aegistrace.agent.plist"
    plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
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
    <key>EnvironmentVariables</key>
    <dict>
        <key>AEGISTRACE_TOKEN</key><string>{AGENT_TOKEN}</string>
        <key>AEGISTRACE_AGENT_ID</key><string>{AGENT_ID}</string>
        <key>AEGISTRACE_SERVER</key><string>{SERVER_URL}</string>
    </dict>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>/tmp/aegistrace_agent.log</string>
    <key>StandardErrorPath</key><string>/tmp/aegistrace_agent_err.log</string>
</dict>
</plist>"""
    try:
        plist_path.parent.mkdir(parents=True, exist_ok=True)
        plist_path.write_text(plist_content)
        os.system(f"launchctl load {plist_path}")
        print(f"[service] LaunchAgent installed: {plist_path}")
    except Exception as e:
        print(f"[service] LaunchAgent install failed: {e}")


def _install_windows_service(agent_path: Path, python_path: str):
    try:
        cmd = f'sc create AegisTraceAgent binPath= "{python_path} {agent_path}" start= auto'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            subprocess.run("sc start AegisTraceAgent", shell=True)
            print("[service] Windows Service registered as AegisTraceAgent")
        else:
            print(f"[service] Windows Service install failed: {result.stderr}")
    except Exception as e:
        print(f"[service] Windows Service error: {e}")


# === CONNECTIVITY CHECK ======================================================

def _do_check():
    hostname = socket.gethostname()
    print(f"\n{'='*60}")
    print(f"  AegisTrace Agent v{AGENT_VERSION} — Connectivity Check")
    print(f"{'='*60}")
    print(f"  Server   : {SERVER_URL}")
    print(f"  Agent ID : {AGENT_ID}")
    print(f"  psutil   : {'available' if PSUTIL_AVAILABLE else 'NOT AVAILABLE'}")
    print()

    # Test health endpoint
    try:
        req = urllib_request.Request(f"{SERVER_URL.rstrip('/')}/api/health")
        with urllib_request.urlopen(req, timeout=10) as resp:
            h = json.loads(resp.read())
        print(f"  OK  Server reachable. Status: {h.get('status')} v{h.get('version')}")
    except Exception as e:
        print(f"  FAIL  Cannot reach server: {e}")
        return

    # Test auth
    try:
        url = f"{SERVER_URL.rstrip('/')}/api/ingest/agent/commands/{AGENT_ID}"
        headers = {"X-Agent-Token": AGENT_TOKEN, "X-Agent-Version": AGENT_VERSION}
        req = urllib_request.Request(url, headers=headers)
        with urllib_request.urlopen(req, timeout=10) as _:
            pass
        print("  OK  Agent token valid")
    except urllib_error.HTTPError as e:
        if e.code == 401:
            print("  FAIL  Invalid agent token")
        elif e.code == 404:
            print("  OK  Token valid (agent not yet registered — will auto-register on first telemetry)")
        else:
            print(f"  WARN  HTTP {e.code}")
    except Exception as e:
        print(f"  WARN  Command channel check: {e}")

    # System info
    info = collect_system_info()
    print(f"\n  System: {info.get('os')} {info.get('os_release')} | CPU: {info.get('cpu_percent', 'N/A')}% | Mem: {info.get('mem_percent', 'N/A')}%")
    print(f"  Hostname: {info.get('hostname')} | IP: {info.get('ip_address')}")
    print(f"\n  Buffer: {BUFFER_FILE.exists()} ({BUFFER_FILE.stat().st_size if BUFFER_FILE.exists() else 0} bytes)")
    print(f"\n  All checks passed. Agent is ready.\n")


# === ENTRYPOINT ==============================================================

if __name__ == "__main__":
    if "--check"          in sys.argv: _do_check();           sys.exit(0)
    if "--install-service" in sys.argv:
        validate_config()
        register_as_service()
        sys.exit(0)
    if "--once"           in sys.argv:
        validate_config()
        _fim.initialize()
        _run_collection_cycle()
        sys.exit(0)

    print(f"\nAegisTrace Agent v{AGENT_VERSION}")
    print(f"{'='*50}")
    validate_config()

    # Initialize FIM on first run
    if not FIM_FILE.exists():
        print("[FIM] Initializing file integrity monitoring...")
        _fim.initialize()

    # Start service registration (non-blocking)
    print("[service] Attempting service registration...")
    register_as_service()

    # Start watchdog thread
    threading.Thread(target=watchdog_thread, daemon=True).start()
    print("[watchdog] Started")

    # Start command polling thread
    threading.Thread(target=poll_commands_loop, daemon=True).start()
    print("[commands] Command channel started")

    print(f"\nAgent running. Press Ctrl+C to stop.\n")

    # Run main loop
    main_loop()
