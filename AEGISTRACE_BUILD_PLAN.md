# AEGISTRACE — COMPLETE BUILD PLAN
**Date:** June 2026 | **Version target:** 3.0  
**Based on:** Full codebase analysis of current v2.0

---

## WHAT ALREADY EXISTS (do not rebuild)

| Feature | Status | Location |
|---|---|---|
| Case management (CRUD, autosave) | ✅ Done | `routers/cases.py`, `CaseDetail/` |
| IOC enrichment + correlation | ✅ Done | `routers/ioc.py`, `routers/enrichment.py` |
| Email forensics | ✅ Done | `routers/email_router.py` |
| Terminal (paste-and-analyse) | ✅ Partial | `routers/terminal.py`, `CaseDetail/TerminalTab.jsx` |
| AI analysis (Groq, multi-model) | ✅ Done | `ai_router.py`, `CaseDetail/AIAnalysisTab.jsx` |
| AI chat per case | ✅ Done | `CaseDetail/AIChatTab.jsx` |
| Reporting (PDF/DOCX) | ✅ Done | `routers/reports.py`, `CaseDetail/ReportTab.jsx` |
| Public case gallery | ✅ Done | `routers/public.py`, `PublicGallery.jsx` |
| Endpoint ingestion + agent | ✅ Done | `routers/ingest.py`, `Endpoints.jsx` |
| Audit logs | ✅ Done | `routers/audit.py`, `AuditLog.jsx` |
| Webhook alerting | ✅ Done | `routers/webhooks.py` |
| Playbook persistence | ✅ Done | `CaseDetail/PlaybookTab.jsx` |
| Threat hunting | ✅ Done | `routers/hunt.py`, `ThreatHunt.jsx` |
| Malware tools | ✅ Done | `routers/malware.py`, `MalwareTools.jsx` |
| Hardware tools (Pineapple, HackRF, Flipper) | ✅ Done | `hardware_tools.py`, `HardwareTools.jsx` |
| PCAP analysis | ✅ Done | `routers/pcap.py`, `PcapAnalysis.jsx` |
| EDR integration | ✅ Done | `routers/edr.py`, `EDRPage.jsx` |
| Threat feeds | ✅ Done | `routers/feeds.py`, `ThreatFeeds.jsx` |
| VT lookup | ✅ Done | `routers/vt.py`, `VTLookup.jsx` |
| Command palette (Cmd+K) | ✅ Done | `components/CommandPalette.jsx` |
| Scheduled reports | ✅ Done | `routers/schedule_reports.py` |
| Auth + JWT | ✅ Done | `routers/auth.py` |

---

## WHAT NEEDS TO BE BUILT

All new work is organised into 6 phases in recommended build order.

---

## PHASE 1 — TERMINAL LAB (Standalone Workspace)

**Goal:** Elevate the existing paste-and-analyse terminal tab into a full standalone Linux-style lab workspace.

### What exists now
`CaseDetail/TerminalTab.jsx` — pastes output and calls `/api/terminal/analyse`. Not a real terminal.  
`backend/routers/terminal.py` — only two endpoints: `POST /api/terminal/analyse` and `GET /api/terminal/history`.

### New backend models to add in `backend/models.py`

```python
class TerminalSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_name: str = Field(default="")
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    mode: str = Field(default="simulated")       # simulated | sandbox
    sandbox_id: Optional[str] = Field(default=None)
    status: str = Field(default="active")        # active | closed | destroyed
    notes: Optional[str] = Field(default="", sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = Field(default=None)

class TerminalCommand(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="terminalsession.id", index=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    command: str = Field(default="", sa_column=Column(Text))
    tool_name: str = Field(default="")
    mode: str = Field(default="simulated")
    status: str = Field(default="queued")        # queued | running | completed | failed
    raw_output: str = Field(default="", sa_column=Column(Text))
    parsed_output: Optional[str] = Field(default="{}", sa_column=Column(Text))
    extracted_iocs: Optional[str] = Field(default="[]", sa_column=Column(Text))
    mitre_techniques: Optional[str] = Field(default="[]", sa_column=Column(Text))
    ai_summary: Optional[str] = Field(default="", sa_column=Column(Text))
    error_message: Optional[str] = Field(default=None)
    user_notes: Optional[str] = Field(default="", sa_column=Column(Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)

class SandboxSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    terminal_session_id: int = Field(foreign_key="terminalsession.id")
    container_id: Optional[str] = Field(default=None)
    status: str = Field(default="stopped")       # starting | running | stopped | destroyed
    started_at: Optional[datetime] = Field(default=None)
    stopped_at: Optional[datetime] = Field(default=None)
    resource_limits: Optional[str] = Field(default="{}", sa_column=Column(Text))  # JSON
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### New backend router: `backend/routers/terminal_lab.py`

New endpoints:
```
GET  /api/terminal/sessions
POST /api/terminal/sessions
GET  /api/terminal/sessions/{id}
POST /api/terminal/sessions/{id}/commands     ← run a command
POST /api/terminal/sessions/{id}/clear
POST /api/terminal/sessions/{id}/save-to-case
POST /api/terminal/sandbox/start
POST /api/terminal/sandbox/stop
GET  /api/terminal/tools                      ← list all supported tools
POST /api/terminal/parse-output               ← AI parse any raw output
POST /api/terminal/extract-iocs               ← standalone IOC extractor
```

**Simulated mode logic** — implement a command interpreter that returns realistic analyst output for:
`pwd, ls, cat, head, tail, grep, strings, file, sha256sum, md5sum, whois, dig, nslookup, curl -I, netstat, ss, ps, top, ioc-extract, defang, refang, yara-generate, log-parse`

**Sandbox mode logic** — Docker subprocess with allowlist, resource limits, session timeout, destroy on close.

### Changes to `backend/main.py`
```python
from routers.terminal_lab import router as terminal_lab_router
app.include_router(terminal_lab_router)
```

### New frontend files to create

```
frontend/src/pages/app/TerminalLab.jsx            ← main page
frontend/src/pages/app/terminal/
  TerminalSessionList.jsx   ← sidebar: sessions + new session button
  TerminalSessionView.jsx   ← main command area
  CommandInput.jsx          ← prompt + input + mode switch
  OutputPane.jsx            ← raw output + parsed results side by side
  ToolLauncherPanel.jsx     ← preset tool launchers with form wrappers
  SandboxStatusBadge.jsx    ← shows simulated / sandbox / destroyed
  ParsedIOCPanel.jsx        ← extracted IOCs with push-to-case button
```

### Changes to existing frontend files

**`frontend/src/App.jsx`** — add route:
```jsx
<Route path="terminal-lab" element={<TerminalLab />} />
```

**`frontend/src/components/Sidebar.jsx`** — add new group:
```jsx
{
  label: 'Lab',
  items: [
    { to: '/app/terminal-lab', label: 'Terminal Lab', Icon: Terminal },
  ],
}
```

**`frontend/src/pages/app/CaseDetail/TerminalTab.jsx`** — keep existing paste-analyse flow but add a button: "Open in Terminal Lab" that opens `/app/terminal-lab?case_id=X`.

### UI spec
- Dark theme, JetBrains Mono for output, crimson for active/danger states, purple for AI/sandbox labels
- Prompt: `aegistrace@lab:~$`
- Command history with arrow key navigation
- Status indicators: queued → running → completed / failed
- Show raw output and parsed output side by side
- Buttons: Clear | Copy | Save to Case | Push IOCs | Add to Timeline | Generate AI Summary

---

## PHASE 2 — IDENTITY GRAPH

**Goal:** Visual graph of users, service accounts, API keys, tokens, devices, agents, cases, and IOCs — answering who acted, what identity was used, what access it had, and how trust was inherited or broken.

### New backend models in `backend/models.py`

```python
class IdentityNode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    node_type: str = Field(default="")     # user | service_account | api_key | token | device | agent | prompt
    label: str = Field(default="")
    metadata: Optional[str] = Field(default="{}", sa_column=Column(Text))  # JSON — role, scope, issuer, etc.
    risk_score: int = Field(default=0)     # 0–100
    is_compromised: bool = Field(default=False)
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    linked_case_ids: Optional[str] = Field(default="[]", sa_column=Column(Text))
    org_id: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class IdentityEdge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="identitynode.id", index=True)
    target_id: int = Field(foreign_key="identitynode.id", index=True)
    relationship: str = Field(default="")  # used | issued | accessed | owned | compromised_by | inherited_from
    confidence: int = Field(default=100)
    evidence_ref: Optional[str] = Field(default=None)  # case_id or ioc
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### New backend router: `backend/routers/identity.py`

```
GET  /api/identity/nodes
POST /api/identity/nodes
GET  /api/identity/nodes/{id}
PATCH /api/identity/nodes/{id}
GET  /api/identity/graph          ← returns full graph (nodes + edges) for D3/Cytoscape
POST /api/identity/edges
GET  /api/identity/edges
POST /api/identity/nodes/{id}/link-case
POST /api/identity/nodes/{id}/mark-compromised
GET  /api/identity/search?q=...
```

### New frontend file: `frontend/src/pages/app/IdentityGraph.jsx`

Uses a graph visualization library (D3 force-directed or React Flow) to render nodes/edges. Node types are colour-coded. Clicking a node opens a side panel with its details, linked cases, and risk score.

### Changes to existing frontend files

**`frontend/src/App.jsx`** — add route:
```jsx
<Route path="identity-graph" element={<IdentityGraph />} />
```

**`frontend/src/components/Sidebar.jsx`** — add to Intelligence group:
```jsx
{ to: '/app/identity-graph', label: 'Identity Graph', Icon: GitMerge },
```

**`frontend/src/components/CommandPalette.jsx`** — add "Identity Graph" as a jump target.

---

## PHASE 3 — TRUST TIMELINE + PROVENANCE LEDGER

**Goal:** Every AI-generated output and every critical action stores its full provenance chain — who acted, what model, what evidence, what confidence, approval status.

### New backend models in `backend/models.py`

```python
class TrustEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id", index=True)
    event_category: str = Field(default="")  # login | token_use | privilege_change | agent_action | ai_output | approval | rejection | policy_override | response_action
    actor: str = Field(default="")           # user email, agent name, or "ai"
    actor_type: str = Field(default="")      # human | ai | agent | system
    description: str = Field(default="", sa_column=Column(Text))
    trust_level: str = Field(default="")     # verified | unverified | suspicious | revoked
    evidence_ref: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProvenanceLedger(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id", index=True)
    action_type: str = Field(default="")     # ai_analysis | ai_summary | tool_run | evidence_add | ioc_enrich
    actor: str = Field(default="")
    model_used: Optional[str] = Field(default=None)
    tool_name: Optional[str] = Field(default=None)
    input_context: str = Field(default="", sa_column=Column(Text))
    output_summary: str = Field(default="", sa_column=Column(Text))
    confidence: int = Field(default=0)
    approval_status: str = Field(default="auto")   # auto | pending | approved | rejected
    approved_by: Optional[str] = Field(default=None)
    linked_evidence_id: Optional[int] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
```

### New backend router: `backend/routers/provenance.py`

```
GET  /api/provenance/case/{case_id}     ← full ledger for a case
POST /api/provenance/                   ← internal: log a provenance entry
GET  /api/trust/events
POST /api/trust/events
GET  /api/trust/events/case/{case_id}
```

### Changes to `backend/ai_router.py`

Wrap `call_ai` and `call_ai_json` to automatically write a `ProvenanceLedger` entry after every AI call. Fields: model, case_id (if available), prompt hash, confidence, timestamp.

### Changes to `backend/routers/cases.py`

Auto-write a `TrustEvent` when: case status changes, AI analysis is generated, case is closed or escalated.

### New frontend files in `frontend/src/pages/app/CaseDetail/`

```
TrustTimelineTab.jsx    ← renders TrustEvent list as a visual timeline
ProvenanceTab.jsx       ← renders ProvenanceLedger entries as a ledger table
```

### Changes to `frontend/src/pages/app/CaseDetail/index.jsx`

Add two new tabs to the TABS array:
```jsx
{ id: 'trust',      label: 'Trust Timeline' },
{ id: 'provenance', label: 'Provenance' },
```

Import and render the two new tab components.

---

## PHASE 4 — AI ENHANCEMENTS (Proactive + Explainable + Triage)

**Goal:** AI stops being passive. It auto-surfaces threats, explains every conclusion, and maintains a triage queue. Every AI output shows its full reasoning chain.

### Proactive AI — changes to `backend/routers/cases.py`

In the `POST /api/cases` create handler and in the evidence add handler, automatically trigger a lightweight AI triage call:
- After case creation: call AI with `fast` model to classify incident type and suggest severity.
- After new IOC is added: call AI with `extraction` model to check for campaign matches.
- Store results in Case.ai_executive_summary (draft) with a flag `ai_auto_generated: true`.

### Explainable AI — changes to `backend/routers/cases.py` and `ai_router.py`

Expand the AI analysis prompt for the `analysis` model to always return:
```json
{
  "executive_summary": "...",
  "technical_summary": "...",
  "reasoning_chain": ["step 1", "step 2", "step 3"],
  "evidence_used": ["finding from description", "IOC match", "MITRE indicator"],
  "what_could_be_wrong": "...",
  "confidence": 85,
  "next_step": "..."
}
```

### Explainable AI — changes to `frontend/src/pages/app/CaseDetail/AIAnalysisTab.jsx`

Add a collapsible "Reasoning Chain" section that shows `reasoning_chain`, `evidence_used`, and `what_could_be_wrong` from the AI response. Add a "Why this conclusion?" expand button. Show `model_used` and `confidence` prominently.

### AI Triage Lane — new backend router: `backend/routers/triage.py`

```
GET  /api/triage/queue                 ← open cases sorted by AI urgency + age + SLA
POST /api/triage/classify/{case_id}   ← re-run AI triage classification
GET  /api/triage/stats                 ← triage queue metrics
```

### AI Triage Lane — new frontend section in `frontend/src/pages/app/Dashboard.jsx`

Add a "Triage Queue" panel below the existing stat tiles showing cases sorted by AI urgency score with quick-action buttons (Assign, Escalate, Dismiss).

### Changes to `backend/main.py`

```python
from routers.triage import router as triage_router
app.include_router(triage_router)
```

---

## PHASE 5 — ANALYTICS + DASHBOARD UPGRADES

**Goal:** Surface trends, performance metrics, and entity correlations. Make the platform feel like an enterprise product with data behind every decision.

### New backend router: `backend/routers/analytics.py`

```
GET /api/analytics/cases-over-time      ← open/closed/created per day/week
GET /api/analytics/severity-breakdown   ← count per severity
GET /api/analytics/ioc-types            ← most common IOC types
GET /api/analytics/time-to-close        ← average resolution time
GET /api/analytics/mitre-heatmap        ← technique frequency
GET /api/analytics/analyst-throughput   ← cases per analyst
GET /api/analytics/campaign-clusters    ← IOCs that appear in 3+ cases
```

All these queries run against the existing `Case`, `IOCCorrelation`, and `TimelineEvent` tables — no new models required.

### Changes to `frontend/src/pages/app/Dashboard.jsx`

Add a second section "Trends & Analytics" with:
- Case volume chart (line — cases created vs. closed over 30 days)
- Severity breakdown (donut chart)
- Top 5 MITRE techniques (horizontal bar)
- Average time to close per severity (stat tiles)
- Analyst throughput table

Use a minimal chart library already used in the codebase, or add recharts (already in React ecosystem).

### Changes to `frontend/src/pages/app/CaseList.jsx`

Add visible columns:
- **Age** — colour-coded (red if past SLA threshold by severity)
- **Owner** — analyst_name field
- **Next Action** — short text field, editable inline
- **Linked cases** — count of cases sharing an IOC
- **SLA status** — on-track / at-risk / breached badge

These fields all come from existing `Case` model data.

### Changes to `frontend/src/components/CommandPalette.jsx`

Add jump targets for all new pages: Terminal Lab, Identity Graph, Analytics, Triage Queue, Provenance, Trust Timeline.

---

## PHASE 6 — CASE QUALITY + WORKFLOW IMPROVEMENTS

**Goal:** Make cases feel more complete and portfolio-ready with comments, templates, report previews, and story-driven public pages.

### New backend models in `backend/models.py`

```python
class CaseComment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id", index=True)
    author_email: str = Field(default="")
    author_name: str = Field(default="")
    comment_type: str = Field(default="note")    # note | handoff | escalation | decision
    body: str = Field(default="", sa_column=Column(Text))
    is_pinned: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InvestigationTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    incident_type: str = Field(default="")   # phishing | brute_force | malware | exfiltration | suspicious_login | endpoint_compromise
    description_template: str = Field(default="", sa_column=Column(Text))
    playbook_template: str = Field(default="{}", sa_column=Column(Text))
    default_severity: str = Field(default="medium")
    default_mitre: Optional[str] = Field(default="[]", sa_column=Column(Text))
    is_builtin: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### New backend router: `backend/routers/comments.py`

```
GET  /api/cases/{id}/comments
POST /api/cases/{id}/comments
PATCH /api/cases/{id}/comments/{comment_id}
DELETE /api/cases/{id}/comments/{comment_id}
```

### New backend router: `backend/routers/templates.py`

```
GET  /api/templates
POST /api/templates
GET  /api/templates/{id}
POST /api/templates/{id}/apply/{case_id}   ← apply template to a case
```

### Seed built-in templates in `backend/seed.py`

Add default templates for: phishing, brute force, malware, exfiltration, suspicious login, endpoint compromise. Each includes a description template, default MITRE techniques, and a playbook.

### Changes to `frontend/src/pages/app/CaseDetail/index.jsx`

Add a Comments tab:
```jsx
{ id: 'comments', label: 'Comments' },
```

Create `frontend/src/pages/app/CaseDetail/CommentsTab.jsx`.

### New frontend section in `frontend/src/pages/app/CaseList.jsx` (or new page)

Add a "Templates" button in the new case modal that shows all `InvestigationTemplate` records. Selecting one pre-fills description, playbook, severity, and MITRE.

### Changes to `frontend/src/pages/app/CaseDetail/ReportTab.jsx`

Add a "Preview" section before export that shows:
- Which sections are filled vs. empty
- Whether evidence is confirmed
- Whether MITRE mapping exists
- Whether the case has a closure note
- A "completeness score" (e.g. 7/9 sections complete)

### Changes to `frontend/src/pages/PublicCaseDetail.jsx`

Restructure the public page to render the case as a narrative story:
- **Trigger** — how the incident was first detected
- **Investigation Steps** — timeline events formatted as prose
- **Findings** — key IOCs and MITRE techniques
- **Outcome** — closure note
- **Lessons Learned** — recommendations

### Agent Supervision stub (future-ready)

Add an `AgentAction` model to `backend/models.py` now (no UI yet) so the schema is ready:
```python
class AgentAction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_name: str = Field(default="")
    task_scope: str = Field(default="", sa_column=Column(Text))
    action_type: str = Field(default="")
    input_data: str = Field(default="", sa_column=Column(Text))
    output_data: Optional[str] = Field(default=None, sa_column=Column(Text))
    confidence: int = Field(default=0)
    approval_required: bool = Field(default=False)
    approval_status: str = Field(default="auto")  # auto | pending | approved | rejected
    approved_by: Optional[str] = Field(default=None)
    case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    provenance_id: Optional[int] = Field(default=None, foreign_key="provenanceledger.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## COMPLETE FILE CHANGE SUMMARY

### Backend — files modified
| File | Change |
|---|---|
| `backend/models.py` | Add: TerminalSession, TerminalCommand, SandboxSession, IdentityNode, IdentityEdge, TrustEvent, ProvenanceLedger, CaseComment, InvestigationTemplate, AgentAction |
| `backend/main.py` | Register 5 new routers: terminal_lab, identity, provenance, triage, analytics, comments, templates |
| `backend/ai_router.py` | Wrap AI calls to auto-write ProvenanceLedger entries |
| `backend/routers/cases.py` | Add proactive AI trigger on create; add TrustEvent writes on status change |
| `backend/seed.py` | Add InvestigationTemplate seed data (6 templates) |
| `backend/migration.py` | Add safe migration for all new columns/tables |

### Backend — new files
| File | Purpose |
|---|---|
| `backend/routers/terminal_lab.py` | Full terminal session + sandbox management |
| `backend/routers/identity.py` | Identity graph nodes and edges |
| `backend/routers/provenance.py` | Provenance ledger + trust events |
| `backend/routers/triage.py` | AI triage queue |
| `backend/routers/analytics.py` | Trend/metric queries |
| `backend/routers/comments.py` | Case comments |
| `backend/routers/templates.py` | Investigation templates |

### Frontend — files modified
| File | Change |
|---|---|
| `frontend/src/App.jsx` | Add 3 new routes: terminal-lab, identity-graph, analytics |
| `frontend/src/components/Sidebar.jsx` | Add Lab group (Terminal Lab); add to Intelligence (Identity Graph, Analytics) |
| `frontend/src/components/CommandPalette.jsx` | Add new jump targets for all new pages |
| `frontend/src/pages/app/Dashboard.jsx` | Add Triage Lane + Analytics Trends sections |
| `frontend/src/pages/app/CaseList.jsx` | Add SLA, age, next-action, linked-cases columns; add Template button in new case modal |
| `frontend/src/pages/app/CaseDetail/index.jsx` | Add tabs: Trust Timeline, Provenance, Comments |
| `frontend/src/pages/app/CaseDetail/AIAnalysisTab.jsx` | Add reasoning chain, evidence used, what-could-be-wrong, confidence display |
| `frontend/src/pages/app/CaseDetail/TerminalTab.jsx` | Add "Open in Terminal Lab" button |
| `frontend/src/pages/app/CaseDetail/ReportTab.jsx` | Add completeness preview before export |
| `frontend/src/pages/PublicCaseDetail.jsx` | Restructure as narrative story format |

### Frontend — new files
| File | Purpose |
|---|---|
| `frontend/src/pages/app/TerminalLab.jsx` | Standalone terminal workspace |
| `frontend/src/pages/app/terminal/CommandInput.jsx` | Prompt input + mode switch |
| `frontend/src/pages/app/terminal/OutputPane.jsx` | Raw + parsed output side by side |
| `frontend/src/pages/app/terminal/ToolLauncherPanel.jsx` | Preset tool buttons with form wrappers |
| `frontend/src/pages/app/terminal/SandboxStatusBadge.jsx` | Simulated / Sandbox / Destroyed badge |
| `frontend/src/pages/app/terminal/ParsedIOCPanel.jsx` | Extracted IOCs with push-to-case button |
| `frontend/src/pages/app/terminal/TerminalSessionList.jsx` | Session sidebar |
| `frontend/src/pages/app/IdentityGraph.jsx` | Identity graph visualization |
| `frontend/src/pages/app/CaseDetail/TrustTimelineTab.jsx` | Trust event timeline |
| `frontend/src/pages/app/CaseDetail/ProvenanceTab.jsx` | Provenance ledger table |
| `frontend/src/pages/app/CaseDetail/CommentsTab.jsx` | Case comments + notes |

---

## PHASED BUILD ORDER (RECOMMENDED)

```
Phase 1 — Terminal Lab               ~3–4 days
  backend/models.py (new models)
  backend/routers/terminal_lab.py
  frontend TerminalLab + subcomponents
  Sidebar + App.jsx updates

Phase 2 — Identity Graph              ~2 days
  backend/models.py (IdentityNode, IdentityEdge)
  backend/routers/identity.py
  frontend IdentityGraph.jsx
  Sidebar + App.jsx updates

Phase 3 — Trust + Provenance          ~1–2 days
  backend/models.py (TrustEvent, ProvenanceLedger)
  backend/routers/provenance.py
  ai_router.py wrapper
  cases.py trust events
  CaseDetail TrustTimelineTab + ProvenanceTab

Phase 4 — AI Enhancements             ~1–2 days
  cases.py proactive AI
  ai_router.py reasoning chain
  AIAnalysisTab.jsx explainability
  backend/routers/triage.py
  Dashboard.jsx triage lane

Phase 5 — Analytics + Dashboard       ~1–2 days
  backend/routers/analytics.py
  Dashboard.jsx trend charts
  CaseList.jsx SLA + next-action columns

Phase 6 — Case Quality                ~1–2 days
  backend/models.py (CaseComment, InvestigationTemplate, AgentAction)
  backend/routers/comments.py + templates.py
  seed.py templates
  CaseDetail CommentsTab
  ReportTab preview
  CaseList template picker
  PublicCaseDetail narrative format
  CommandPalette expansion
```

---

## DESIGN RULES (apply to every new component)

- Dark background: `#0B0D14` / `#0F1018`
- Card borders: `rgba(255,255,255,0.07)`
- Crimson accent: `#C0392B` — active states, dangerous actions, critical indicators
- Purple: `#A78BFA` — AI labels, sandbox mode, provenance markers
- Terminal font: `JetBrains Mono` — all code, output, IOC values, hashes
- Body font: match existing (Inter/system)
- No playful animations, no emoji decorations, no pastel colours
- Dense layout — high information density preferred over whitespace
- Every AI output must show: model name, confidence score, generated timestamp
- Every sandbox action must show: mode badge (simulated/sandbox), status, session ID

---

## WHAT NOT TO BUILD (scope guard)

- No public sandbox access — Terminal Lab is private-only
- No direct host shell passthrough — all commands go through allowlist
- No raw container exec — only approved tool wrappers
- No post-quantum crypto implementation (add model stubs only, UI later)
- No multi-tenant org switching (org_id exists, multi-tenancy UI is out of scope for v3.0)
- No mobile layout — desktop analyst tool only

---

*End of plan. Start with Phase 1 (Terminal Lab) — it is the highest-impact, most visible upgrade and the foundation for the sandbox and provenance work that follows.*
