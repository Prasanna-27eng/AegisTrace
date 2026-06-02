from typing import Optional
from datetime import datetime
import uuid
from sqlmodel import SQLModel, Field, Column, Text


def gen_uuid():
    return str(uuid.uuid4())


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
    hashed_password: Optional[str] = Field(default=None)   # SHA-256 hex
    org_id: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)


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
