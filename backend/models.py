from typing import Optional, List
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, Column, Text


def gen_uuid():
    return str(uuid.uuid4())


# ── Endpoint Agent ────────────────────────────────────────────────────────────
class RawLogEvent(SQLModel, table=True):
    """Individual structured log event from the endpoint agent (journalctl, auth, kernel, etc.)."""
    id:          Optional[int] = Field(default=None, primary_key=True)
    endpoint_id: int           = Field(foreign_key="endpoint.id", index=True)
    hostname:    str           = Field(default="", index=True)
    category:    str           = Field(default="system")   # auth, kernel, service, package, cron, network
    event_type:  str           = Field(default="log")      # failed_login, sudo_command, session_open, etc.
    source:      str           = Field(default="")         # sshd, sudo, kernel, etc.
    severity:    str           = Field(default="info")     # critical, high, medium, info, debug
    raw:         str           = Field(default="", sa_column=Column(Text))
    username:    Optional[str] = Field(default=None)
    source_ip:   Optional[str] = Field(default=None)
    success:     bool          = Field(default=True)
    extra:       Optional[str] = Field(default="{}", sa_column=Column(Text))  # JSON extra fields
    ts:          datetime      = Field(default_factory=datetime.utcnow, index=True)
    created_at:  datetime      = Field(default_factory=datetime.utcnow)


class Endpoint(SQLModel, table=True):
    """Represents a remote machine running the AegisTrace agent."""
    id: Optional[int] = Field(default=None, primary_key=True)
    hostname: str = Field(index=True)
    os_type: str = Field(default="unknown")     # windows / linux / mac / unknown
    ip_address: str = Field(default="")
    agent_version: str = Field(default="1.0")
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    total_batches: int = Field(default=0)
    threat_score_avg: float = Field(default=0.0)
    is_active: bool = Field(default=True)
    tags: Optional[str] = Field(default="[]", sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Live telemetry snapshot (updated every cycle)
    last_processes:    Optional[str] = Field(default="[]", sa_column=Column(Text))   # JSON
    last_connections:  Optional[str] = Field(default="[]", sa_column=Column(Text))   # JSON
    last_system_info:  Optional[str] = Field(default="{}", sa_column=Column(Text))   # JSON
    local_risk_score:  int = Field(default=0)   # 0-100 from agent
    total_alerts:      int = Field(default=0)
    total_failed_logins: int = Field(default=0)
    vuln_findings:     Optional[str] = Field(default="[]", sa_column=Column(Text))   # JSON: latest vuln scan
    last_vuln_scan:    Optional[datetime] = Field(default=None)


class LogBatch(SQLModel, table=True):
    """A batch of log lines shipped from an endpoint agent."""
    id: Optional[int] = Field(default=None, primary_key=True)
    endpoint_id: int = Field(foreign_key="endpoint.id", index=True)
    log_file: str = Field(default="")          # /var/log/auth.log, Windows Security, etc.
    log_type: str = Field(default="generic")   # syslog / windows_event / apache / generic
    raw_content: str = Field(default="", sa_column=Column(Text))
    line_count: int = Field(default=0)
    ai_verdict: str = Field(default="")        # Clean / Suspicious / Malicious / Unknown
    ai_summary: str = Field(default="", sa_column=Column(Text))
    ai_findings: str = Field(default="", sa_column=Column(Text))
    extracted_iocs: Optional[str] = Field(default="[]", sa_column=Column(Text))
    mitre_techniques: Optional[str] = Field(default="[]", sa_column=Column(Text))
    threat_score: int = Field(default=0)       # 0–100
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Log Investigation ─────────────────────────────────────────────────────────
class LogAnalysis(SQLModel, table=True):
    """A manually pasted/uploaded log investigation."""
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    log_type: str = Field(default="generic")
    raw_content: str = Field(default="", sa_column=Column(Text))
    parsed_entries: Optional[str] = Field(default="[]", sa_column=Column(Text))
    extracted_iocs: Optional[str] = Field(default="[]", sa_column=Column(Text))
    ai_verdict: str = Field(default="")
    ai_summary: str = Field(default="", sa_column=Column(Text))
    ai_findings: str = Field(default="", sa_column=Column(Text))
    mitre_techniques: Optional[str] = Field(default="[]", sa_column=Column(Text))
    threat_score: int = Field(default=0)
    total_entries: int = Field(default=0)
    suspicious_entries: int = Field(default=0)
    source_label: str = Field(default="Manual paste")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Organisation (stub for future multi-tenancy) ─────────────────────────────
class Organisation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="Default")
    slug: str = Field(default="default", unique=True, index=True)
    plan: str = Field(default="personal")   # personal / team / mssp
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── User ─────────────────────────────────────────────────────────────────────
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    role: str = Field(default="analyst")        # admin / analyst / viewer
    is_active: bool = Field(default=True)
    hashed_password: Optional[str] = Field(default=None)   # bcrypt or legacy SHA-256
    org_id: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # ── 2FA / TOTP (v5.1) ────────────────────────────────────────────────────
    mfa_enabled: bool = Field(default=False)
    mfa_secret: Optional[str] = Field(default=None)        # Base32 TOTP secret (server-side only)


# ── Case ─────────────────────────────────────────────────────────────────────
class Case(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_number: str = Field(unique=True, index=True)
    title: str
    severity: str = Field(default="medium")     # critical / high / medium / low / info
    status: str = Field(default="open")         # open / in_progress / pending_closure / closed
    incident_type: str = Field(default="")
    affected_systems: str = Field(default="")
    analyst_name: str = Field(default="")
    customer_name: str = Field(default="")
    classification: str = Field(default="internal")
    description: str = Field(default="", sa_column=Column(Text))
    commands_run: str = Field(default="", sa_column=Column(Text))
    findings: str = Field(default="", sa_column=Column(Text))
    recommendations: str = Field(default="", sa_column=Column(Text))
    tools_output: Optional[str] = Field(default="[]", sa_column=Column(Text))
    iocs: Optional[str] = Field(default="[]", sa_column=Column(Text))
    mitre_techniques: Optional[str] = Field(default="[]", sa_column=Column(Text))
    ai_executive_summary: str = Field(default="", sa_column=Column(Text))
    ai_technical_summary: str = Field(default="", sa_column=Column(Text))
    ai_severity_score: Optional[int] = Field(default=None)
    ai_severity_reasoning: str = Field(default="", sa_column=Column(Text))
    email_analysis: Optional[str] = Field(default=None, sa_column=Column(Text))
    vt_results: Optional[str] = Field(default="[]", sa_column=Column(Text))
    is_public: bool = Field(default=False)
    share_token: str = Field(default_factory=gen_uuid, unique=True, index=True)
    closure_notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    shift_handoff: str = Field(default="", sa_column=Column(Text))
    playbook_state: Optional[str] = Field(default="{}", sa_column=Column(Text))  # JSON {taskId: bool}
    org_id: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ── Evidence Artifact ─────────────────────────────────────────────────────────
class EvidenceArtifact(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id", index=True)
    artifact_type: str = Field(default="")     # email / network / file / log / manual
    source_module: str = Field(default="")
    raw_input: str = Field(default="", sa_column=Column(Text))
    normalized_output: str = Field(default="", sa_column=Column(Text))
    extracted_iocs: Optional[str] = Field(default="[]", sa_column=Column(Text))
    verdict: str = Field(default="")
    ai_analysis: str = Field(default="", sa_column=Column(Text))
    confidence: int = Field(default=0)
    evidence_score: str = Field(default="hypothesis")  # confirmed/strong/weak/hypothesis
    analyst_confirmed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ── VT History ────────────────────────────────────────────────────────────────
class VTHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ioc: str = Field(index=True)
    ioc_type: str = Field(default="")          # ip / domain / hash / url
    verdict: str = Field(default="")           # malicious / suspicious / clean / unknown
    malicious_count: int = Field(default=0)
    total_engines: int = Field(default=0)
    full_result: Optional[str] = Field(default="{}", sa_column=Column(Text))
    looked_up_at: datetime = Field(default_factory=datetime.utcnow)
    notes: str = Field(default="")


# ── Email Analysis ────────────────────────────────────────────────────────────
class EmailAnalysisRecord(SQLModel, table=True):
    __tablename__ = "emailanalysis"
    id: Optional[int] = Field(default=None, primary_key=True)
    raw_headers: str = Field(default="", sa_column=Column(Text))
    raw_body: str = Field(default="", sa_column=Column(Text))
    sender_ip: str = Field(default="")
    sender_domain: str = Field(default="")
    spf_result: str = Field(default="")
    dkim_result: str = Field(default="")
    dmarc_result: str = Field(default="")
    routing_hops: Optional[str] = Field(default="[]", sa_column=Column(Text))
    extracted_iocs: Optional[str] = Field(default="[]", sa_column=Column(Text))
    ai_verdict: str = Field(default="")
    ai_analysis: str = Field(default="", sa_column=Column(Text))
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Tool Run ──────────────────────────────────────────────────────────────────
class ToolRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id", index=True)
    tool_name: str = Field(default="")
    command: str = Field(default="", sa_column=Column(Text))
    output: str = Field(default="", sa_column=Column(Text))
    ai_parsed_result: Optional[str] = Field(default="{}", sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Timeline Event ────────────────────────────────────────────────────────────
class TimelineEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id", index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str = Field(default="")        # detection / action / escalation / closure
    description: str = Field(default="", sa_column=Column(Text))
    evidence_id: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Audit Log ─────────────────────────────────────────────────────────────────
class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, index=True)
    user_email: Optional[str] = Field(default=None)    # denormalised for quick display
    action: str = Field(default="")
    entity_type: str = Field(default="")
    entity_id: Optional[str] = Field(default=None)
    old_value: Optional[str] = Field(default=None, sa_column=Column(Text))
    new_value: Optional[str] = Field(default=None, sa_column=Column(Text))
    ip_address: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── IOC Correlation ───────────────────────────────────────────────────────────
class IOCCorrelation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ioc: str = Field(index=True)
    ioc_type: str = Field(default="")
    case_ids: Optional[str] = Field(default="[]", sa_column=Column(Text))
    case_count: int = Field(default=1)
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── PCAP / Network Traffic Analysis ──────────────────────────────────────────
class PcapAnalysis(SQLModel, table=True):
    """A PCAP file upload analysed for network forensics."""
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id", index=True)
    filename: str = Field(default="")
    file_size: int = Field(default=0)            # bytes
    packet_count: int = Field(default=0)
    duration_secs: float = Field(default=0.0)
    protocols: Optional[str] = Field(default="{}", sa_column=Column(Text))    # JSON {proto: count}
    top_talkers: Optional[str] = Field(default="[]", sa_column=Column(Text))  # JSON [{ip, bytes, pkts}]
    dns_queries: Optional[str] = Field(default="[]", sa_column=Column(Text))  # JSON list of domains
    http_hosts: Optional[str] = Field(default="[]", sa_column=Column(Text))
    extracted_iocs: Optional[str] = Field(default="[]", sa_column=Column(Text))
    suspicious_flows: Optional[str] = Field(default="[]", sa_column=Column(Text))
    ai_verdict: str = Field(default="")
    ai_summary: str = Field(default="", sa_column=Column(Text))
    ai_findings: Optional[str] = Field(default="[]", sa_column=Column(Text))
    threat_score: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── EDR Action Audit Trail ───────────────────────────────────────────────────
class EDRAction(SQLModel, table=True):
    """Every action taken against an endpoint via an EDR integration."""
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id", index=True)
    platform: str = Field(default="")          # crowdstrike / sentinelone / carbonblack
    action: str = Field(default="")            # isolate / un_isolate / list_processes / kill_process / run_command
    endpoint_id: str = Field(default="")       # platform-specific device/agent ID
    hostname: str = Field(default="")
    target: Optional[str] = Field(default=None)  # process PID or command string
    status: str = Field(default="pending")     # pending / success / failed
    result: Optional[str] = Field(default=None, sa_column=Column(Text))  # JSON response
    error: Optional[str] = Field(default=None)
    analyst_id: Optional[int] = Field(default=None)
    analyst_email: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Report Schedule ──────────────────────────────────────────────────────────
class ReportSchedule(SQLModel, table=True):
    """Scheduled automatic PDF report delivery via email."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    recipient_emails: str = Field(default="[]", sa_column=Column(Text))  # JSON list
    schedule_type: str = Field(default="weekly")  # daily / weekly / monthly
    schedule_day: Optional[int] = Field(default=1)  # day of week (0=Mon) or day of month
    schedule_hour: int = Field(default=8)           # 0-23 UTC
    report_type: str = Field(default="digest")      # digest / open_cases / critical_only
    include_closed: bool = Field(default=False)
    org_id: int = Field(default=1)
    is_active: bool = Field(default=True)
    last_sent_at: Optional[datetime] = Field(default=None)
    next_run_at: Optional[datetime] = Field(default=None)
    created_by: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Webhook Config ────────────────────────────────────────────────────────────
class WebhookConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    url: str = Field(default="", sa_column=Column(Text))
    events: str = Field(default="[]", sa_column=Column(Text))
    # events: JSON list of trigger types:
    # case_created / case_closed / critical_case / malicious_ioc / case_status_changed
    secret: Optional[str] = Field(default=None)     # HMAC signing secret
    is_active: bool = Field(default=True)
    last_fired_at: Optional[datetime] = Field(default=None)
    last_status_code: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Hardware Security Platform — Session 6 ────────────────────────────────────

class HardwareDevice(SQLModel, table=True):
    """A physical hardware security/attack tool or sensor registered in the platform."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    device_type: str = Field(default="", index=True)   # wifi_pineapple, hackrf, flipper_zero…
    category: str = Field(default="")                  # wifi_attack, rf_radio, usb_hid…
    log_format: str = Field(default="", sa_column=Column(Text))
    connection_status: str = Field(default="offline")  # online | offline
    last_seen: Optional[datetime] = Field(default=None)
    total_events: int = Field(default=0)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_builtin: bool = Field(default=False)            # built-in profiles can't be deleted
    created_at: datetime = Field(default_factory=datetime.utcnow)


class HardwareAlert(SQLModel, table=True):
    """A normalised security alert produced from a hardware device log."""
    id: Optional[int] = Field(default=None, primary_key=True)
    device_id: Optional[int] = Field(default=None, foreign_key="hardwaredevice.id", index=True)
    device_name: str = Field(default="")
    device_type: str = Field(default="")
    category: str = Field(default="")
    event_type: str = Field(default="")
    severity: str = Field(default="info")              # critical|high|medium|low|info
    mitre_technique: str = Field(default="")
    mitre_tactic: str = Field(default="")
    mitre_description: str = Field(default="")
    hostname: str = Field(default="")
    src_ip: str = Field(default="")
    dst_ip: str = Field(default="")
    iocs: str = Field(default="[]", sa_column=Column(Text))         # JSON array
    ai_summary: str = Field(default="", sa_column=Column(Text))
    ai_response: str = Field(default="[]", sa_column=Column(Text))  # JSON array of findings
    raw: str = Field(default="", sa_column=Column(Text))
    status: str = Field(default="open")                # open|investigating|closed
    investigated: bool = Field(default=False)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── v3.0 Futuristic Models ────────────────────────────────────────────────────

class TerminalSession(SQLModel, table=True):
    """A named Terminal Lab session grouping commands under a case or standalone."""
    id: Optional[int] = Field(default=None, primary_key=True)
    session_name: str = Field(default="")
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    mode: str = Field(default="simulated")        # simulated | sandbox
    sandbox_id: Optional[str] = Field(default=None)
    status: str = Field(default="active")         # active | closed | destroyed
    notes: Optional[str] = Field(default="", sa_column=Column(Text))
    created_by_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)  # v5.3 ownership
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = Field(default=None)


class TerminalCommand(SQLModel, table=True):
    """A single command run inside a TerminalSession."""
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="terminalsession.id", index=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    command: str = Field(default="", sa_column=Column(Text))
    tool_name: str = Field(default="")
    mode: str = Field(default="simulated")
    status: str = Field(default="completed")      # queued | running | completed | failed
    raw_output: str = Field(default="", sa_column=Column(Text))
    parsed_output: Optional[str] = Field(default="{}", sa_column=Column(Text))
    extracted_iocs: Optional[str] = Field(default="[]", sa_column=Column(Text))
    mitre_techniques: Optional[str] = Field(default="[]", sa_column=Column(Text))
    ai_summary: Optional[str] = Field(default="", sa_column=Column(Text))
    error_message: Optional[str] = Field(default=None)
    user_notes: Optional[str] = Field(default="", sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)


class IdentityNode(SQLModel, table=True):
    """A first-class identity entity: user, service account, token, device, or agent."""
    id: Optional[int] = Field(default=None, primary_key=True)
    node_type: str = Field(default="", index=True)  # user | service_account | api_key | token | device | agent | prompt
    label: str = Field(default="", index=True)
    metadata_json: Optional[str] = Field(default="{}", sa_column=Column(Text))  # role, scope, issuer, etc.
    risk_score: int = Field(default=0, index=True)  # 0–100
    is_compromised: bool = Field(default=False, index=True)
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    linked_case_ids: Optional[str] = Field(default="[]", sa_column=Column(Text))
    org_id: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # v4.3 additions
    last_active: Optional[datetime] = Field(default=None)
    expiry_date: Optional[datetime] = Field(default=None)
    privilege_level: str = Field(default="low")          # low | medium | high | admin
    is_orphaned: bool = Field(default=False)
    credential_sprawl_score: float = Field(default=0.0)
    trust_score_history: Optional[str] = Field(default="[]", sa_column=Column(Text))  # JSON [{date, score}]
    anomaly_count_7d: int = Field(default=0)
    source_connector: Optional[str] = Field(default=None)  # azure_ad | okta | google | csv | manual


class IdentityEdge(SQLModel, table=True):
    """A directed relationship between two IdentityNodes."""
    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="identitynode.id", index=True)
    target_id: int = Field(foreign_key="identitynode.id", index=True)
    relationship: str = Field(default="")         # used | issued | accessed | owned | compromised_by | inherited_from
    confidence: int = Field(default=100)
    evidence_ref: Optional[str] = Field(default=None)  # "case:123" or "ioc:x.x.x.x"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TrustEvent(SQLModel, table=True):
    """A trust-relevant event in the chain of actions for a case."""
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id", index=True)
    event_category: str = Field(default="")       # login | token_use | privilege_change | agent_action | ai_output | approval | rejection | policy_override | response_action
    actor: str = Field(default="")                # user email, agent name, or "ai"
    actor_type: str = Field(default="")           # human | ai | agent | system
    description: str = Field(default="", sa_column=Column(Text))
    trust_level: str = Field(default="")          # verified | unverified | suspicious | revoked
    evidence_ref: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProvenanceLedger(SQLModel, table=True):
    """Full audit record for every AI-generated or tool-generated action."""
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id", index=True)
    action_type: str = Field(default="")          # ai_analysis | ai_summary | tool_run | evidence_add | ioc_enrich
    actor: str = Field(default="")                # user email or "ai"
    model_used: Optional[str] = Field(default=None)
    tool_name: Optional[str] = Field(default=None)
    input_context: str = Field(default="", sa_column=Column(Text))
    output_summary: str = Field(default="", sa_column=Column(Text))
    confidence: int = Field(default=0)
    approval_status: str = Field(default="auto")  # auto | pending | approved | rejected
    approved_by: Optional[str] = Field(default=None)
    linked_evidence_id: Optional[int] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CaseComment(SQLModel, table=True):
    """Structured analyst note or handoff comment on a case."""
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id", index=True)
    author_email: str = Field(default="")
    author_name: str = Field(default="")
    comment_type: str = Field(default="note")     # note | handoff | escalation | decision
    body: str = Field(default="", sa_column=Column(Text))
    is_pinned: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InvestigationTemplate(SQLModel, table=True):
    """Pre-built case scaffold for common incident types."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    incident_type: str = Field(default="")        # phishing | brute_force | malware | exfiltration | suspicious_login | endpoint_compromise
    description_template: str = Field(default="", sa_column=Column(Text))
    playbook_template: str = Field(default="{}", sa_column=Column(Text))
    default_severity: str = Field(default="medium")
    default_mitre: Optional[str] = Field(default="[]", sa_column=Column(Text))
    is_builtin: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentAction(SQLModel, table=True):
    """Audit record for every autonomous AI or automation action."""
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_name: str = Field(default="")
    task_scope: str = Field(default="", sa_column=Column(Text))
    action_type: str = Field(default="")          # triage | enrich | summarise | escalate | close
    input_data: str = Field(default="", sa_column=Column(Text))
    output_data: Optional[str] = Field(default=None, sa_column=Column(Text))
    confidence: int = Field(default=0)
    approval_required: bool = Field(default=False)
    approval_status: str = Field(default="auto")  # auto | pending | approved | rejected
    approved_by: Optional[str] = Field(default=None)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    provenance_id: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── v4.0 Identity Risk Engine ─────────────────────────────────────────────────

class IdentityAnomaly(SQLModel, table=True):
    """Anomaly detected for an identity node — drives risk score calculation."""
    id: Optional[int] = Field(default=None, primary_key=True)
    node_id: int = Field(foreign_key="identitynode.id", index=True)
    anomaly_type: str = Field(default="")             # new_location | impossible_travel | failed_login | privilege_change | etc.
    description: str = Field(default="", sa_column=Column(Text))
    severity: str = Field(default="medium")           # low | medium | high | critical
    confidence: float = Field(default=0.8)            # 0.0–1.0
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = Field(default=False)
    resolved_at: Optional[datetime] = Field(default=None)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")


class Policy(SQLModel, table=True):
    """SOC access control policy — validated by the policy engine."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    identity_type: Optional[str] = Field(default=None)   # user | service_account | agent | None=all
    role: Optional[str] = Field(default=None)             # developer | admin | analyst | None=all
    allowed_actions: Optional[str] = Field(default="[]", sa_column=Column(Text))  # JSON list
    denied_actions: Optional[str] = Field(default="[]", sa_column=Column(Text))   # JSON list
    allowed_ips: Optional[str] = Field(default="[]", sa_column=Column(Text))      # JSON list
    allowed_hours_start: Optional[str] = Field(default=None)   # "09:00" UTC
    allowed_hours_end: Optional[str] = Field(default=None)     # "17:00" UTC
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── v4.0 ITDR — Identity Threat Detection & Response ─────────────────────────

class AuthEvent(SQLModel, table=True):
    """
    Authentication / identity event for ITDR analysis.
    Analysts enter these manually or paste from auth logs.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    # Link to identity node (optional — can exist standalone)
    node_id: Optional[int] = Field(default=None, foreign_key="identitynode.id", index=True)
    identity_label: str = Field(default="")   # email / username if no node linked

    # Event type
    event_type: str = Field(default="login")
    # login | failed_login | logout | privilege_change | mfa_challenge
    # password_reset | token_issue | account_lock

    # Auth result
    success: bool = Field(default=True)

    # Location
    source_ip: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    region: Optional[str] = Field(default=None)   # continent / region for impossible-travel

    # Device
    device_id: Optional[str] = Field(default=None)
    device_name: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)

    # Privilege change fields
    privilege_before: Optional[str] = Field(default=None)
    privilege_after: Optional[str] = Field(default=None)
    approved: Optional[bool] = Field(default=None)

    # Case linkage
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── v4.3 Security & Identity Models ──────────────────────────────────────────

class TokenBlocklist(SQLModel, table=True):
    """Server-side JWT revocation — checked on every authenticated request."""
    id: Optional[int] = Field(default=None, primary_key=True)
    token_jti: str = Field(unique=True, index=True)   # JWT ID claim
    blocked_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")


class IdentityConnector(SQLModel, table=True):
    """An external identity provider connected to AegisTrace."""
    id: Optional[int] = Field(default=None, primary_key=True)
    org_name: str = Field(default="")
    connector_type: str = Field(default="")    # azure_ad | okta | google | csv | scim
    client_id: Optional[str] = Field(default=None)
    encrypted_token: Optional[str] = Field(default=None, sa_column=Column(Text))
    tenant_id: Optional[str] = Field(default=None)
    domain: Optional[str] = Field(default=None)
    last_sync: Optional[datetime] = Field(default=None)
    sync_status: str = Field(default="never")  # never | running | ok | error
    identities_discovered: int = Field(default=0)
    last_error: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApprovedAIService(SQLModel, table=True):
    """Whitelist of AI API services allowed for endpoint agents."""
    id: Optional[int] = Field(default=None, primary_key=True)
    service_name: str = Field(default="")
    api_domain: str = Field(default="", index=True)
    is_approved: bool = Field(default=True)
    added_by: Optional[int] = Field(default=None, foreign_key="user.id")
    added_at: datetime = Field(default_factory=datetime.utcnow)


class ShadowAIEvent(SQLModel, table=True):
    """Unapproved AI API access detected by the endpoint agent."""
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: Optional[int] = Field(default=None, foreign_key="endpoint.id")
    process_name: str = Field(default="")
    process_pid: int = Field(default=0)
    destination_domain: str = Field(default="")
    destination_ip: Optional[str] = Field(default=None)
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    is_reviewed: bool = Field(default=False)
    reviewed_by: Optional[int] = Field(default=None, foreign_key="user.id")
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")


class AgentCommand(SQLModel, table=True):
    """Commands queued for an endpoint agent via the command channel."""
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="endpoint.id", index=True)
    command_type: str = Field(default="")    # collect_now | collect_file | kill_process | ping | etc.
    payload: Optional[str] = Field(default="{}", sa_column=Column(Text))
    status: str = Field(default="pending")  # pending | sent | completed | failed
    result: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    executed_at: Optional[datetime] = Field(default=None)


# ── MITRE ATT&CK Simulation Engine ───────────────────────────────────────────

class SimulationRun(SQLModel, table=True):
    """
    Records a single MITRE ATT&CK simulation execution.
    Each run injects real synthetic events into the ITDR pipeline
    and records whether the corresponding detector fired.
    """
    id: Optional[int] = Field(default=None, primary_key=True)

    # Technique metadata
    technique_id: str = Field(index=True)        # e.g. "T1110"
    technique_name: str                           # e.g. "Brute Force"
    mitre_tactic: str                             # e.g. "Credential Access"

    # Simulation execution
    target_identity: str                          # __sim_<uuid>__@aegistrace.internal
    events_injected: int = Field(default=0)       # synthetic events created
    detector_name: Optional[str] = Field(default=None)  # which detector ran

    # Result
    result: str                                   # "DETECTED" | "NOT_DETECTED"
    confidence: Optional[float] = Field(default=None)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    evidence: Optional[str] = Field(default="{}", sa_column=Column(Text))  # JSON

    # Audit
    run_by: str                                   # user email
    run_at: datetime = Field(default_factory=datetime.utcnow)


# ── v5.3 AI Defense Engine ───────────────────────────────────────────────────

class DefenseEvent(SQLModel, table=True):
    """
    Records every threat detected by the AI Defense Engine.
    Lifecycle: detected → triaged (Groq) → pending_review | auto_handled → resolved
    """
    id: Optional[int] = Field(default=None, primary_key=True)

    # Attacker fingerprint
    attacker_ip: str = Field(default="", index=True)
    attack_type: str = Field(default="")            # ai_agent_scan | brute_force | honeypot_trigger | api_abuse | rate_abuse | prompt_injection
    threat_source: str = Field(default="")          # fingerprinter | honeypot | rate_monitor | ingest

    # Request context
    endpoint_hit: str = Field(default="")           # /api/v1/admin/export etc.
    request_count: int = Field(default=1)           # requests in detection window
    user_agent: Optional[str] = Field(default=None, sa_column=Column(Text))
    request_pattern: Optional[str] = Field(default=None, sa_column=Column(Text))  # JSON summary of pattern

    # Groq triage result
    ai_threat_type: Optional[str] = Field(default=None)       # e.g. "AI Agent Scanner"
    ai_confidence: Optional[float] = Field(default=None)       # 0.0 – 1.0
    ai_reasoning: Optional[str] = Field(default=None, sa_column=Column(Text))
    ai_recommended_action: Optional[str] = Field(default=None) # watchlist | rate_limit | block | escalate
    ai_model_used: Optional[str] = Field(default=None)

    # Response status
    status: str = Field(default="detecting")        # detecting | pending_review | auto_handled | approved | dismissed
    response_action: Optional[str] = Field(default=None)       # watchlist | rate_limited | blocked | dismissed
    reviewed_by: Optional[str] = Field(default=None)
    review_notes: Optional[str] = Field(default=None, sa_column=Column(Text))

    # Severity
    severity: str = Field(default="medium")         # low | medium | high | critical

    # Timestamps
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = Field(default=None)


class ITDRAlert(SQLModel, table=True):
    """An ITDR detection alert from any detector."""
    id: Optional[int] = Field(default=None, primary_key=True)
    alert_type: str = Field(default="", index=True)       # credential_stuffing | impossible_travel | token_theft | shadow_ai | privilege_escalation | etc.
    severity: str = Field(default="medium", index=True)   # critical | high | medium | low
    identity_label: Optional[str] = Field(default=None)
    node_id: Optional[int] = Field(default=None, foreign_key="identitynode.id")
    description: str = Field(default="", sa_column=Column(Text))
    evidence: Optional[str] = Field(default="{}", sa_column=Column(Text))  # JSON
    status: str = Field(default="open")                   # open | investigating | resolved | false_positive
    resolved_by: Optional[str] = Field(default=None)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)
