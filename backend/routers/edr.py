"""
AegisTrace EDR Integration
──────────────────────────
Two-way integration with CrowdStrike Falcon, SentinelOne, and Carbon Black Cloud.

Supported actions:
  • status          — which EDR platforms are configured and reachable
  • search          — find endpoints by hostname / IP across all platforms
  • isolate         — cut endpoint from network (contain in CrowdStrike)
  • un_isolate      — lift network isolation
  • list_processes  — enumerate running processes on an endpoint
  • kill_process    — terminate a process by PID
  • run_command     — execute a forensic command via RTR / Remote Shell

All actions are written to EDRAction for full audit trail.
High-risk actions (isolate, kill_process, run_command) are screened by
Llama Guard 3 (v9.0) for injection abuse before execution.

Environment variables required (see .env.example):
  CrowdStrike:   CROWDSTRIKE_CLIENT_ID, CROWDSTRIKE_CLIENT_SECRET, CROWDSTRIKE_BASE_URL
  SentinelOne:   SENTINELONE_BASE_URL, SENTINELONE_API_TOKEN
  Carbon Black:  CARBONBLACK_ORG_KEY, CARBONBLACK_API_ID, CARBONBLACK_API_SECRET, CARBONBLACK_BASE_URL
"""

import os, json, time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import EDRAction, User, AuditLog
from database import get_session
from routers.auth import get_current_user
import httpx

router = APIRouter(prefix="/api/edr", tags=["edr"])

TIMEOUT = 15   # seconds for EDR API calls


# ── Llama Guard safety screen for high-risk EDR actions (v9.0) ────────────────

def _guard_edr_action(action: str, target: str, extra: str = "") -> Optional[str]:
    """
    Screen EDR action parameters through Llama Guard 3 for injection abuse (S14).
    Primarily catches prompt injection or shell injection attempts embedded in
    hostname / PID / command parameters before they reach the EDR API.
    Returns an error label string if blocked, None if safe or NVIDIA unavailable.
    """
    try:
        from guardrails import safety_check
        payload = f"EDR {action} on target: {target}. Parameters: {extra}".strip()[:500]
        result  = safety_check(payload)
        if not result.get("safe", True):
            return result.get("label", "Policy violation")
    except Exception:
        pass
    return None


# ═══════════════════════════════════════════════════════════════════════════════
#  CROWDSTRIKE FALCON
# ═══════════════════════════════════════════════════════════════════════════════

class CrowdStrikeClient:
    """CrowdStrike Falcon OAuth2 client with automatic token refresh."""

    def __init__(self):
        self.base    = os.getenv("CROWDSTRIKE_BASE_URL", "https://api.crowdstrike.com").rstrip("/")
        self.cid     = os.getenv("CROWDSTRIKE_CLIENT_ID", "")
        self.secret  = os.getenv("CROWDSTRIKE_CLIENT_SECRET", "")
        self._token  = None
        self._expiry = 0

    @property
    def configured(self) -> bool:
        return bool(self.cid and self.secret)

    def _get_token(self) -> str:
        if self._token and time.time() < self._expiry - 30:
            return self._token
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/oauth2/token",
                       data={"client_id": self.cid, "client_secret": self.secret},
                       headers={"Content-Type": "application/x-www-form-urlencoded"})
            r.raise_for_status()
            d = r.json()
            self._token  = d["access_token"]
            self._expiry = time.time() + d.get("expires_in", 1800)
        return self._token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._get_token()}", "Content-Type": "application/json"}

    def ping(self) -> bool:
        try:
            with httpx.Client(timeout=8) as c:
                r = c.get(f"{self.base}/sensors/combined/installers/v1",
                          headers=self._headers(), params={"limit": 1})
                return r.status_code < 500
        except Exception:
            return False

    def search_hosts(self, query: str) -> list:
        """Search for hosts by hostname or IP."""
        with httpx.Client(timeout=TIMEOUT) as c:
            # Get device IDs matching query
            r = c.get(f"{self.base}/devices/queries/devices/v1",
                      headers=self._headers(),
                      params={"filter": f"hostname:*'{query}'", "limit": 20})
            r.raise_for_status()
            ids = r.json().get("resources", [])
            if not ids:
                # Try IP
                r2 = c.get(f"{self.base}/devices/queries/devices/v1",
                           headers=self._headers(),
                           params={"filter": f"local_ip:'{query}'", "limit": 20})
                r2.raise_for_status()
                ids = r2.json().get("resources", [])
            if not ids:
                return []
            # Fetch device details
            r3 = c.post(f"{self.base}/devices/entities/devices/v2",
                        headers=self._headers(),
                        json={"ids": ids[:20]})
            r3.raise_for_status()
            devices = r3.json().get("resources", [])
        results = []
        for d in devices:
            results.append({
                "platform": "crowdstrike",
                "endpoint_id": d.get("device_id", ""),
                "hostname": d.get("hostname", ""),
                "ip": d.get("local_ip", ""),
                "os": d.get("platform_name", ""),
                "os_version": d.get("os_version", ""),
                "status": d.get("status", ""),
                "isolation_status": d.get("status", "").lower(),   # normal / contained / containment_pending
                "last_seen": d.get("last_seen", ""),
                "agent_version": d.get("agent_version", ""),
                "tags": d.get("tags", []),
            })
        return results

    def isolate(self, device_id: str) -> dict:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/devices/entities/devices-actions/v2",
                       headers=self._headers(),
                       params={"action_name": "contain"},
                       json={"ids": [device_id]})
            r.raise_for_status()
            return r.json()

    def un_isolate(self, device_id: str) -> dict:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/devices/entities/devices-actions/v2",
                       headers=self._headers(),
                       params={"action_name": "lift_containment"},
                       json={"ids": [device_id]})
            r.raise_for_status()
            return r.json()

    def list_processes(self, device_id: str) -> list:
        """Use Real Time Response to list processes."""
        session_id = None
        try:
            with httpx.Client(timeout=TIMEOUT) as c:
                # 1. Init RTR session
                rs = c.post(f"{self.base}/real-time-response/entities/sessions/v1",
                            headers=self._headers(),
                            json={"device_id": device_id, "origin": "AegisTrace", "queue_offline": False})
                rs.raise_for_status()
                session_id = rs.json()["resources"][0]["session_id"]

                # 2. Run 'ps' command
                rc = c.post(f"{self.base}/real-time-response/entities/command/v1",
                            headers=self._headers(),
                            json={"base_command": "ps", "command_string": "ps",
                                  "session_id": session_id, "device_id": device_id})
                rc.raise_for_status()
                cloud_request_id = rc.json()["resources"][0]["cloud_request_id"]

                # 3. Poll for result (up to 10s)
                for _ in range(10):
                    time.sleep(1)
                    rr = c.get(f"{self.base}/real-time-response/entities/command/v1",
                               headers=self._headers(),
                               params={"cloud_request_id": cloud_request_id, "sequence_id": 0})
                    rr.raise_for_status()
                    resources = rr.json().get("resources", [])
                    if resources and resources[0].get("complete"):
                        return _parse_ps_output(resources[0].get("stdout", ""), "crowdstrike")

            return []
        finally:
            if session_id:
                try:
                    with httpx.Client(timeout=8) as c:
                        c.delete(f"{self.base}/real-time-response/entities/sessions/v1",
                                 headers=self._headers(),
                                 params={"session_id": session_id})
                except Exception:
                    pass

    def kill_process(self, device_id: str, pid: str) -> dict:
        session_id = None
        try:
            with httpx.Client(timeout=TIMEOUT) as c:
                rs = c.post(f"{self.base}/real-time-response/entities/sessions/v1",
                            headers=self._headers(),
                            json={"device_id": device_id, "origin": "AegisTrace", "queue_offline": False})
                rs.raise_for_status()
                session_id = rs.json()["resources"][0]["session_id"]

                rc = c.post(f"{self.base}/real-time-response/entities/active-responder-command/v1",
                            headers=self._headers(),
                            json={"base_command": "kill", "command_string": f"kill pid={pid}",
                                  "session_id": session_id, "device_id": device_id})
                rc.raise_for_status()
                cloud_request_id = rc.json()["resources"][0]["cloud_request_id"]

                for _ in range(10):
                    time.sleep(1)
                    rr = c.get(f"{self.base}/real-time-response/entities/active-responder-command/v1",
                               headers=self._headers(),
                               params={"cloud_request_id": cloud_request_id, "sequence_id": 0})
                    rr.raise_for_status()
                    resources = rr.json().get("resources", [])
                    if resources and resources[0].get("complete"):
                        return {"stdout": resources[0].get("stdout", ""),
                                "stderr": resources[0].get("stderr", ""),
                                "success": not resources[0].get("stderr")}
            return {"success": False, "error": "Timed out waiting for kill confirmation"}
        finally:
            if session_id:
                try:
                    with httpx.Client(timeout=8) as c:
                        c.delete(f"{self.base}/real-time-response/entities/sessions/v1",
                                 headers=self._headers(),
                                 params={"session_id": session_id})
                except Exception:
                    pass

    def run_command(self, device_id: str, command: str) -> dict:
        """Run an arbitrary RTR read-only command (ls, cat, reg query, netstat, etc.)."""
        SAFE_COMMANDS = {"ls", "cat", "reg query", "netstat", "ifconfig", "ipconfig",
                         "env", "history", "pwd", "users", "groups", "ps", "runkey",
                         "get", "filehash", "memdump"}
        base_cmd = command.strip().split()[0].lower()
        if base_cmd not in SAFE_COMMANDS:
            raise ValueError(f"Command '{base_cmd}' not in allowed read-only command list: {sorted(SAFE_COMMANDS)}")

        session_id = None
        try:
            with httpx.Client(timeout=TIMEOUT) as c:
                rs = c.post(f"{self.base}/real-time-response/entities/sessions/v1",
                            headers=self._headers(),
                            json={"device_id": device_id, "origin": "AegisTrace", "queue_offline": False})
                rs.raise_for_status()
                session_id = rs.json()["resources"][0]["session_id"]

                rc = c.post(f"{self.base}/real-time-response/entities/command/v1",
                            headers=self._headers(),
                            json={"base_command": base_cmd, "command_string": command,
                                  "session_id": session_id, "device_id": device_id})
                rc.raise_for_status()
                cloud_request_id = rc.json()["resources"][0]["cloud_request_id"]

                for _ in range(15):
                    time.sleep(1)
                    rr = c.get(f"{self.base}/real-time-response/entities/command/v1",
                               headers=self._headers(),
                               params={"cloud_request_id": cloud_request_id, "sequence_id": 0})
                    rr.raise_for_status()
                    resources = rr.json().get("resources", [])
                    if resources and resources[0].get("complete"):
                        return {"stdout": resources[0].get("stdout", ""),
                                "stderr": resources[0].get("stderr", ""),
                                "success": not resources[0].get("stderr")}
            return {"success": False, "error": "Command timed out"}
        finally:
            if session_id:
                try:
                    with httpx.Client(timeout=8) as c:
                        c.delete(f"{self.base}/real-time-response/entities/sessions/v1",
                                 headers=self._headers(),
                                 params={"session_id": session_id})
                except Exception:
                    pass


# ═══════════════════════════════════════════════════════════════════════════════
#  SENTINELONE
# ═══════════════════════════════════════════════════════════════════════════════

class SentinelOneClient:

    def __init__(self):
        self.base  = os.getenv("SENTINELONE_BASE_URL", "").rstrip("/")
        self.token = os.getenv("SENTINELONE_API_TOKEN", "")

    @property
    def configured(self) -> bool:
        return bool(self.base and self.token)

    def _headers(self) -> dict:
        return {"Authorization": f"ApiToken {self.token}", "Content-Type": "application/json"}

    def ping(self) -> bool:
        try:
            with httpx.Client(timeout=8) as c:
                r = c.get(f"{self.base}/web/api/v2.1/system/status", headers=self._headers())
                return r.status_code == 200
        except Exception:
            return False

    def search_hosts(self, query: str) -> list:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.get(f"{self.base}/web/api/v2.1/agents",
                      headers=self._headers(),
                      params={"query": query, "limit": 20})
            r.raise_for_status()
            agents = r.json().get("data", [])
        results = []
        for a in agents:
            network = a.get("networkStatus", "connected")
            results.append({
                "platform": "sentinelone",
                "endpoint_id": a.get("id", ""),
                "hostname": a.get("computerName", ""),
                "ip": (a.get("lastIpToMgmt") or a.get("networkInterfaces", [{}])[0].get("inet", [""])[0]),
                "os": a.get("osType", ""),
                "os_version": a.get("osName", ""),
                "status": a.get("agentVersion", ""),
                "isolation_status": "isolated" if network == "disconnected" else "connected",
                "last_seen": a.get("lastActiveDate", ""),
                "agent_version": a.get("agentVersion", ""),
                "tags": [t.get("name", "") for t in a.get("tags", {}).get("sentinelTags", [])],
            })
        return results

    def isolate(self, agent_id: str) -> dict:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/web/api/v2.1/agents/actions/disconnect",
                       headers=self._headers(),
                       json={"filter": {"ids": [agent_id]}})
            r.raise_for_status()
            return r.json()

    def un_isolate(self, agent_id: str) -> dict:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/web/api/v2.1/agents/actions/connect",
                       headers=self._headers(),
                       json={"filter": {"ids": [agent_id]}})
            r.raise_for_status()
            return r.json()

    def list_processes(self, agent_id: str) -> list:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.get(f"{self.base}/web/api/v2.1/agents/{agent_id}/processes",
                      headers=self._headers())
            r.raise_for_status()
            procs = r.json().get("data", [])
        return [
            {
                "pid": p.get("pid"),
                "name": p.get("processName", ""),
                "user": p.get("userName", ""),
                "cpu": p.get("cpuUsage", 0),
                "memory": p.get("memoryUsage", 0),
                "start_time": p.get("startTime", ""),
                "command": p.get("executablePath", ""),
            }
            for p in procs
        ]

    def kill_process(self, agent_id: str, pid: str) -> dict:
        """SentinelOne uses Remote Script Orchestration to kill processes."""
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/web/api/v2.1/remote-scripts/execute",
                       headers=self._headers(),
                       json={
                           "data": {"outputDestination": "SentinelCloud", "requiresApproval": False,
                                    "scriptType": "action",
                                    "inputParams": f"--pid {pid}"},
                           "filter": {"ids": [agent_id]},
                           "scriptId": "__kill_process__",
                       })
            if r.status_code == 404:
                # Fallback: use threats actions endpoint with process termination
                return {"success": False, "note": "Remote script kill not available on this tier. Use SentinelOne console."}
            r.raise_for_status()
            return {"success": True, "data": r.json()}

    def run_command(self, agent_id: str, command: str) -> dict:
        """Run a script via Remote Script Orchestration."""
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/web/api/v2.1/remote-scripts/execute",
                       headers=self._headers(),
                       json={
                           "data": {"outputDestination": "SentinelCloud",
                                    "requiresApproval": False,
                                    "scriptType": "dataCollection",
                                    "inputParams": command},
                           "filter": {"ids": [agent_id]},
                       })
            r.raise_for_status()
            task_id = r.json().get("data", {}).get("parentTaskId", "")
            # Poll for result
            for _ in range(12):
                time.sleep(2)
                tr = c.get(f"{self.base}/web/api/v2.1/remote-scripts/results/{task_id}",
                           headers=self._headers())
                if tr.status_code == 200:
                    data = tr.json().get("data", {})
                    if data.get("status") == "completed":
                        return {"success": True, "stdout": data.get("output", "")}
            return {"success": False, "error": "Command timed out"}


# ═══════════════════════════════════════════════════════════════════════════════
#  CARBON BLACK CLOUD
# ═══════════════════════════════════════════════════════════════════════════════

class CarbonBlackClient:

    def __init__(self):
        self.base       = os.getenv("CARBONBLACK_BASE_URL", "").rstrip("/")
        self.org_key    = os.getenv("CARBONBLACK_ORG_KEY", "")
        self.api_id     = os.getenv("CARBONBLACK_API_ID", "")
        self.api_secret = os.getenv("CARBONBLACK_API_SECRET", "")

    @property
    def configured(self) -> bool:
        return bool(self.base and self.org_key and self.api_id and self.api_secret)

    def _headers(self) -> dict:
        return {
            "X-Auth-Token": f"{self.api_secret}/{self.api_id}",
            "Content-Type": "application/json",
        }

    def ping(self) -> bool:
        try:
            with httpx.Client(timeout=8) as c:
                r = c.get(f"{self.base}/appservices/v6/orgs/{self.org_key}/devices/_search",
                          headers=self._headers(),
                          json={"rows": 1, "start": 0})
                return r.status_code in (200, 400)
        except Exception:
            return False

    def search_hosts(self, query: str) -> list:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/devices/_search",
                       headers=self._headers(),
                       json={"rows": 20, "start": 0,
                             "criteria": {"name": [query], "ip_address": [query]}})
            r.raise_for_status()
            devices = r.json().get("results", [])
        results = []
        for d in devices:
            results.append({
                "platform": "carbonblack",
                "endpoint_id": str(d.get("id", "")),
                "hostname": d.get("name", ""),
                "ip": d.get("last_internal_ip_address", ""),
                "os": d.get("os", ""),
                "os_version": d.get("os_version", ""),
                "status": d.get("status", ""),
                "isolation_status": "isolated" if d.get("quarantined") else "connected",
                "last_seen": d.get("last_contact_time", ""),
                "agent_version": d.get("sensor_version", ""),
                "tags": d.get("tags", []),
            })
        return results

    def isolate(self, device_id: str) -> dict:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/devices/actions",
                       headers=self._headers(),
                       json={"action_type": "QUARANTINE",
                             "device_id": [int(device_id)],
                             "options": {"toggle": "ON"}})
            r.raise_for_status()
            return {"success": True, "data": r.json() if r.text else {}}

    def un_isolate(self, device_id: str) -> dict:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/devices/actions",
                       headers=self._headers(),
                       json={"action_type": "QUARANTINE",
                             "device_id": [int(device_id)],
                             "options": {"toggle": "OFF"}})
            r.raise_for_status()
            return {"success": True, "data": r.json() if r.text else {}}

    def list_processes(self, device_id: str) -> list:
        """Carbon Black Live Response — list processes."""
        session_id = None
        try:
            with httpx.Client(timeout=TIMEOUT) as c:
                # Start Live Response session
                rs = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions",
                            headers=self._headers(),
                            json={"device_id": int(device_id)})
                rs.raise_for_status()
                session_id = rs.json()["id"]

                # Wait for session to be ACTIVE
                for _ in range(10):
                    time.sleep(1)
                    ss = c.get(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}",
                               headers=self._headers())
                    if ss.json().get("status") == "ACTIVE":
                        break

                # List processes
                rp = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}/commands",
                            headers=self._headers(),
                            json={"name": "process list"})
                rp.raise_for_status()
                cmd_id = rp.json()["id"]

                for _ in range(10):
                    time.sleep(1)
                    cr = c.get(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}/commands/{cmd_id}",
                               headers=self._headers())
                    if cr.json().get("status") == "complete":
                        return [
                            {"pid": p.get("pid"), "name": p.get("process_path", ""),
                             "parent_pid": p.get("parent"), "sid": p.get("sid", "")}
                            for p in cr.json().get("processes", [])
                        ]
                return []
        finally:
            if session_id:
                try:
                    with httpx.Client(timeout=8) as c:
                        c.delete(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}",
                                 headers=self._headers())
                except Exception:
                    pass

    def kill_process(self, device_id: str, pid: str) -> dict:
        session_id = None
        try:
            with httpx.Client(timeout=TIMEOUT) as c:
                rs = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions",
                            headers=self._headers(),
                            json={"device_id": int(device_id)})
                rs.raise_for_status()
                session_id = rs.json()["id"]

                for _ in range(10):
                    time.sleep(1)
                    ss = c.get(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}",
                               headers=self._headers())
                    if ss.json().get("status") == "ACTIVE":
                        break

                rk = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}/commands",
                            headers=self._headers(),
                            json={"name": "kill", "pid": int(pid)})
                rk.raise_for_status()
                return {"success": True, "command_id": rk.json().get("id")}
        finally:
            if session_id:
                try:
                    with httpx.Client(timeout=8) as c:
                        c.delete(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}",
                                 headers=self._headers())
                except Exception:
                    pass

    def run_command(self, device_id: str, command: str) -> dict:
        """Execute a shell/script command via Carbon Black Live Response."""
        session_id = None
        try:
            with httpx.Client(timeout=TIMEOUT) as c:
                rs = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions",
                            headers=self._headers(),
                            json={"device_id": int(device_id)})
                rs.raise_for_status()
                session_id = rs.json()["id"]

                for _ in range(10):
                    time.sleep(1)
                    ss = c.get(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}",
                               headers=self._headers())
                    if ss.json().get("status") == "ACTIVE":
                        break

                rc = c.post(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}/commands",
                            headers=self._headers(),
                            json={"name": "memdump", "object": command})
                rc.raise_for_status()
                cmd_id = rc.json()["id"]

                for _ in range(12):
                    time.sleep(2)
                    cr = c.get(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}/commands/{cmd_id}",
                               headers=self._headers())
                    if cr.json().get("status") == "complete":
                        return {"success": True, "result": cr.json()}
                return {"success": False, "error": "Command timed out"}
        finally:
            if session_id:
                try:
                    with httpx.Client(timeout=8) as c:
                        c.delete(f"{self.base}/appservices/v6/orgs/{self.org_key}/liveresponse/sessions/{session_id}",
                                 headers=self._headers())
                except Exception:
                    pass


# ═══════════════════════════════════════════════════════════════════════════════
#  Shared helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _parse_ps_output(raw: str, platform: str) -> list:
    """Parse CrowdStrike RTR 'ps' stdout into a list of process dicts."""
    procs = []
    for line in raw.splitlines():
        parts = line.split(None, 4)
        if len(parts) >= 2:
            procs.append({"pid": parts[0], "name": parts[-1] if len(parts) > 1 else "",
                          "user": parts[1] if len(parts) > 2 else "", "platform": platform})
    return procs


def _get_clients() -> dict:
    return {
        "crowdstrike": CrowdStrikeClient(),
        "sentinelone":  SentinelOneClient(),
        "carbonblack":  CarbonBlackClient(),
    }


def _get_client(platform: str):
    clients = _get_clients()
    if platform not in clients:
        raise HTTPException(400, f"Unknown platform: {platform}. Valid: {list(clients)}")
    c = clients[platform]
    if not c.configured:
        raise HTTPException(503, f"{platform} is not configured. Add credentials to environment variables.")
    return c


def _log_action(session: Session, action: EDRAction) -> EDRAction:
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


def _finish_action(session: Session, action: EDRAction, result: dict = None, error: str = None):
    action.status  = "failed" if error else "success"
    action.result  = json.dumps(result) if result else None
    action.error   = error
    session.add(action)
    session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
#  API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status")
def edr_status(user: User = Depends(get_current_user)):
    """Return connection status for all configured EDR platforms."""
    clients = _get_clients()
    statuses = {}
    for name, client in clients.items():
        if not client.configured:
            statuses[name] = {"configured": False, "connected": False}
        else:
            try:
                ok = client.ping()
                statuses[name] = {"configured": True, "connected": ok}
            except Exception as e:
                statuses[name] = {"configured": True, "connected": False, "error": str(e)}
    return {"platforms": statuses,
            "any_configured": any(v["configured"] for v in statuses.values())}


@router.get("/search")
def search_endpoints(
    q: str,
    platform: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """Search endpoints by hostname or IP across all (or one) configured EDR platform."""
    if not q or len(q) < 2:
        raise HTTPException(400, "Query must be at least 2 characters")

    clients = _get_clients()
    results = []
    errors  = {}

    targets = {platform: clients[platform]} if platform and platform in clients else clients

    for name, client in targets.items():
        if not client.configured:
            continue
        try:
            hits = client.search_hosts(q)
            results.extend(hits)
        except Exception as e:
            errors[name] = str(e)

    return {"results": results, "total": len(results), "errors": errors}


@router.post("/endpoints/{platform}/{endpoint_id}/isolate")
def isolate_endpoint(
    platform: str,
    endpoint_id: str,
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Isolate (network-contain) an endpoint from the network."""
    client   = _get_client(platform)
    case_id  = data.get("case_id")
    hostname = data.get("hostname", endpoint_id)
    note     = data.get("note", "")

    # Llama Guard screen — catch injection attempts in hostname/note
    blocked = _guard_edr_action("network isolate", hostname, note[:200])
    if blocked:
        raise HTTPException(403, f"Action blocked by safety policy: {blocked}")

    action = _log_action(session, EDRAction(
        case_id=case_id, platform=platform, action="isolate",
        endpoint_id=endpoint_id, hostname=hostname, target=note,
        status="pending", analyst_id=user.id, analyst_email=user.email,
    ))

    try:
        result = client.isolate(endpoint_id)
        _finish_action(session, action, result=result)
        # Audit log
        session.add(AuditLog(action="edr_isolate", entity_type="endpoint",
                              entity_id=endpoint_id, user_id=user.id,
                              user_email=user.email, new_value=hostname))
        session.commit()
        return {"ok": True, "action_id": action.id, "result": result}
    except Exception as e:
        _finish_action(session, action, error=str(e))
        raise HTTPException(500, f"Isolation failed: {e}")


@router.post("/endpoints/{platform}/{endpoint_id}/un-isolate")
def un_isolate_endpoint(
    platform: str,
    endpoint_id: str,
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lift network isolation from an endpoint."""
    client = _get_client(platform)
    case_id = data.get("case_id")
    hostname = data.get("hostname", endpoint_id)

    action = _log_action(session, EDRAction(
        case_id=case_id, platform=platform, action="un_isolate",
        endpoint_id=endpoint_id, hostname=hostname,
        status="pending", analyst_id=user.id, analyst_email=user.email,
    ))
    try:
        result = client.un_isolate(endpoint_id)
        _finish_action(session, action, result=result)
        session.add(AuditLog(action="edr_un_isolate", entity_type="endpoint",
                              entity_id=endpoint_id, user_id=user.id,
                              user_email=user.email, new_value=hostname))
        session.commit()
        return {"ok": True, "action_id": action.id, "result": result}
    except Exception as e:
        _finish_action(session, action, error=str(e))
        raise HTTPException(500, f"Un-isolation failed: {e}")


@router.get("/endpoints/{platform}/{endpoint_id}/processes")
def list_processes(
    platform: str,
    endpoint_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List running processes on an endpoint."""
    client = _get_client(platform)
    action = _log_action(session, EDRAction(
        platform=platform, action="list_processes",
        endpoint_id=endpoint_id, status="pending",
        analyst_id=user.id, analyst_email=user.email,
    ))
    try:
        procs = client.list_processes(endpoint_id)
        _finish_action(session, action, result={"count": len(procs)})
        return {"processes": procs, "count": len(procs), "action_id": action.id}
    except Exception as e:
        _finish_action(session, action, error=str(e))
        raise HTTPException(500, f"Process list failed: {e}")


@router.post("/endpoints/{platform}/{endpoint_id}/kill-process")
def kill_process(
    platform: str,
    endpoint_id: str,
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Kill a process by PID on an endpoint."""
    pid = str(data.get("pid", "")).strip()
    if not pid:
        raise HTTPException(400, "pid is required")

    client   = _get_client(platform)
    hostname = data.get("hostname", endpoint_id)
    case_id  = data.get("case_id")

    # Llama Guard screen — catch injected PIDs or hostile hostnames
    blocked = _guard_edr_action("kill process", hostname, f"pid={pid}")
    if blocked:
        raise HTTPException(403, f"Action blocked by safety policy: {blocked}")

    action = _log_action(session, EDRAction(
        case_id=case_id, platform=platform, action="kill_process",
        endpoint_id=endpoint_id, hostname=hostname, target=f"PID:{pid}",
        status="pending", analyst_id=user.id, analyst_email=user.email,
    ))
    try:
        result = client.kill_process(endpoint_id, pid)
        _finish_action(session, action, result=result)
        session.add(AuditLog(action="edr_kill_process", entity_type="endpoint",
                              entity_id=endpoint_id, user_id=user.id,
                              user_email=user.email, new_value=f"PID {pid} on {hostname}"))
        session.commit()
        return {"ok": result.get("success", True), "action_id": action.id, "result": result}
    except Exception as e:
        _finish_action(session, action, error=str(e))
        raise HTTPException(500, f"Kill process failed: {e}")


@router.post("/endpoints/{platform}/{endpoint_id}/run-command")
def run_command(
    platform: str,
    endpoint_id: str,
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Run a forensic/read-only command on an endpoint via RTR / Live Response."""
    command = (data.get("command") or "").strip()
    if not command:
        raise HTTPException(400, "command is required")

    # Llama Guard screen — most important here since command is free-form text
    # Catches prompt injection, shell injection attempts, and code interpreter abuse (S14)
    blocked = _guard_edr_action("run command", endpoint_id, command)
    if blocked:
        raise HTTPException(403, f"Command blocked by safety policy: {blocked}")

    client   = _get_client(platform)
    hostname = data.get("hostname", endpoint_id)
    case_id  = data.get("case_id")

    action = _log_action(session, EDRAction(
        case_id=case_id, platform=platform, action="run_command",
        endpoint_id=endpoint_id, hostname=hostname, target=command,
        status="pending", analyst_id=user.id, analyst_email=user.email,
    ))
    try:
        result = client.run_command(endpoint_id, command)
        _finish_action(session, action, result=result)
        session.add(AuditLog(action="edr_run_command", entity_type="endpoint",
                              entity_id=endpoint_id, user_id=user.id,
                              user_email=user.email, new_value=command))
        session.commit()
        return {"ok": result.get("success", True), "action_id": action.id, "result": result}
    except ValueError as ve:
        _finish_action(session, action, error=str(ve))
        raise HTTPException(400, str(ve))
    except Exception as e:
        _finish_action(session, action, error=str(e))
        raise HTTPException(500, f"Command failed: {e}")


@router.get("/history")
def edr_history(
    case_id: Optional[int] = None,
    platform: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """EDR action history — scoped to a case or globally."""
    query = select(EDRAction).order_by(EDRAction.created_at.desc()).limit(limit)
    if case_id:
        query = query.where(EDRAction.case_id == case_id)
    if platform:
        query = query.where(EDRAction.platform == platform)
    actions = session.exec(query).all()
    return actions


@router.get("/history/recent")
def edr_recent(
    limit: int = 10,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Last N EDR actions across all cases — used by the dashboard widget."""
    actions = session.exec(
        select(EDRAction).order_by(EDRAction.created_at.desc()).limit(limit)
    ).all()
    return actions
