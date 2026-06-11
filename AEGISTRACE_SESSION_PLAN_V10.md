# AEGISTRACE — SESSION PLAN v10.0
**Created:** June 2026 | **Based on:** Full architecture review + strategic planning session
**Purpose:** Hand this file to Claude at the start of any new session to resume exactly where we left off. This is the NEXT-WORK master plan, not a history document.

---

## 🤖 INSTRUCTIONS FOR CLAUDE (READ THIS FIRST)

You are working on AegisTrace v9.2 — a full-stack security operations platform built by Prasanna Kumar Surendran. The master codebase context is in `AEGISTRACE_CONTEXT.md`. Read that file for architecture, rules, and constraints. This file is the **build roadmap only** — what to build next, in what order, and why.

**Non-negotiable rules (repeat from AEGISTRACE_CONTEXT.md):**
- Theme: pure black — `#000000/#080808/#101010` bg, `#EBEBEB` text, `#4DA3FF/#9C7CFF` accent
- Inline styles only — NO Tailwind CSS
- All DB models in `backend/models.py` only
- No Alembic — SQLModel `create_all()` handles new tables
- SQLite only — use `strftime('%Y-%W', ...)` not `func.date_trunc`
- Do NOT add new npm packages without approval

---

## CURRENT STATE (v9.2 — June 2026)

AegisTrace is a complete security operations platform. Everything below is already built and deployed:

- **38 backend routers** covering cases, ITDR, identity graph, endpoint agents, EDR, PCAP, enrichment, threat feeds, simulation, AI defense engine, semantic search, vision analysis, rule generation, and more
- **31 authenticated app pages** + 5 public pages
- **Endpoint agent v6.0** (~3,650 lines) — shadow AI detection, behavioural baseline, YARA-lite, honey token traps, DNS/DGA detection, auto-block engine, vulnerability scanner, command channel
- **NVIDIA NIM Phases 1–9** — Hermes-3 triage loop, NV-EmbedQA embeddings, Llama Guard 3 safety, Qdrant vector store, multi-agent coordinator, alert normalisation, vision analysis, Codestral rule generation
- **Security hardened through v5.5** — bcrypt, JWT revocation, 2FA, Fernet encryption, prompt injection shield, HSTS/CSP, honeypots, AI defense fingerprinting middleware
- **Companion projects:** `mcp-aegis` v0.2.0 (MCP security gateway), `mcp-sploit`, `prompt-fuzz`, `nhi-hunter`, `shadow-sniffer`

**What the platform is missing (the gap):** AegisTrace detects everything but correlates nothing automatically, responds manually to alerts, and doesn't adapt its own detection over time. The four builds below close that gap.

---

## THE PRIORITISED BUILD PLAN

### PRIORITY 1 — Temporal Linker + Attack Graph Tab
**Effort:** 1–2 days | **Impact:** Highest ROI item in the entire backlog

**What it does:**
Automatically correlates events from every data source (endpoint agent logs, ITDR alerts, defense events, MCP/agent actions, IOC enrichments) that occurred on the same host within a ±5-second window. Feeds the correlated chain to Nemotron-70B to generate a plain-English attack narrative. Surfaces the result in a new "Attack Graph" tab in CaseDetail.

**Why first:**
You already have all the data. No new infrastructure, no new data sources. This turns 5 separate alert streams into one readable story. It's the feature that makes a technical security buyer say "I need this" — no SIEM does this out of the box.

**Files to create/modify:**
- `backend/linker.py` — new module
- `backend/routers/graph.py` — new router, `GET /api/graph/reconstruct?case_id=X`
- `frontend/src/pages/app/CaseDetail/AttackGraphTab.jsx` — new tab
- `frontend/src/pages/app/CaseDetail/index.jsx` — add tab to CaseDetail

**Data sources to query (all existing):**
```python
# Group by hostname, within ±5 seconds of each other
sources = [
    RawLogEvent,        # endpoint agent structured logs
    ITDRAlert,          # identity threat alerts
    DefenseEvent,       # AI defense engine catches
    AgentAction,        # AI/MCP agent actions
    ShadowAIEvent,      # shadow AI detections
    HardwareAlert,      # hardware tool alerts
]
```

**Backend logic (linker.py):**
```python
async def reconstruct_chain(case_id: int, session: Session) -> dict:
    """
    1. Load case to get hostname/IP context
    2. Query all event tables for events linked to that case OR matching hostname in ±5s windows
    3. Sort by timestamp
    4. Group into "clusters" (events within 5s of each other = one step)
    5. Pass ordered cluster list to Nemotron-70B
    6. Return: steps (list), narrative (string), mitre_chain (list), confidence (0-100)
    """
```

**Nemotron prompt template:**
```
You are a security incident analyst. Given the following sequence of events from one machine,
reconstruct the attack chain as a numbered list of steps, identify the MITRE ATT&CK techniques,
and write a 2-sentence executive summary.

Events (chronological):
{events_json}

Return as JSON:
{
  "steps": [{"step": 1, "description": "...", "technique": "T1xxx", "severity": "high"}],
  "narrative": "...",
  "mitre_chain": ["T1xxx", "T1yyy"],
  "confidence": 85,
  "suggested_title": "..."
}
```

**Frontend (AttackGraphTab.jsx):**
- Timeline view: vertical list of steps with severity colours, MITRE badges, timestamp
- "Reconstruct" button → calls `/api/graph/reconstruct`
- Narrative box at top (the 2-sentence summary)
- MITRE chain chips
- "Create Case from Graph" button (pre-populates title, MITRE, description from narrative)

---

### PRIORITY 2 — Playbook Engine (SOAR)
**Effort:** 3 days | **Impact:** Transforms AegisTrace from SIEM → SOAR

**What it does:**
Lets analysts define `if trigger then actions` rules. Example: if an ITDR alert with `alert_type=credential_stuffing` and `severity=critical` fires, automatically: (1) isolate the endpoint, (2) create a case, (3) post a Slack webhook. Destructive actions require human approval through the existing `AgentAction` queue.

**Why second:**
The Temporal Linker shows the attack. The Playbook Engine *responds* to it. Together they close the biggest operational gap: the time between detection and containment.

**New model (add to models.py):**
```python
class Playbook(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    trigger_event_type: str = Field(default="")
    # Event types: itdr_alert | defense_event | shadow_ai | mcp_event | case_created | endpoint_alert
    trigger_conditions: Optional[str] = Field(default="{}", sa_column=Column(Text))
    # JSON: {"severity": "critical", "alert_type": "credential_stuffing", "min_confidence": 0.8}
    actions: str = Field(default="[]", sa_column=Column(Text))
    # JSON array of action objects: [{"type": "isolate_endpoint", "params": {...}, "requires_approval": true}]
    is_active: bool = Field(default=True)
    requires_approval: bool = Field(default=True)   # Global approval gate
    run_count: int = Field(default=0)
    last_run_at: Optional[datetime] = Field(default=None)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    org_id: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlaybookRun(SQLModel, table=True):
    """Audit record for every playbook execution."""
    id: Optional[int] = Field(default=None, primary_key=True)
    playbook_id: int = Field(foreign_key="playbook.id", index=True)
    trigger_event_type: str = Field(default="")
    trigger_event_id: Optional[str] = Field(default=None)
    actions_taken: Optional[str] = Field(default="[]", sa_column=Column(Text))  # JSON
    actions_pending: Optional[str] = Field(default="[]", sa_column=Column(Text))  # JSON (awaiting approval)
    status: str = Field(default="running")  # running | completed | failed | pending_approval
    result_summary: Optional[str] = Field(default=None, sa_column=Column(Text))
    run_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)
```

**Supported action types (v1):**
```python
ACTION_TYPES = {
    "isolate_endpoint":  requires_approval=True,   # calls /api/ingest command channel
    "create_case":       requires_approval=False,  # auto-creates with pre-filled fields
    "send_webhook":      requires_approval=False,  # existing webhook system
    "enrich_ioc":        requires_approval=False,  # calls /api/enrichment
    "page_oncall":       requires_approval=False,  # webhook to PagerDuty/Slack
    "add_case_comment":  requires_approval=False,  # adds comment to linked case
    "generate_rules":    requires_approval=False,  # triggers Codestral rule gen
}
```

**Files to create/modify:**
- `backend/routers/orchestration.py` — new router `/api/orchestration/playbooks` CRUD + `/api/orchestration/evaluate` (rule engine)
- `backend/routers/ingest.py` — hook `evaluate_playbooks()` call on every ingest event
- `frontend/src/pages/app/Playbooks.jsx` — new page at `/app/playbooks`
- `frontend/src/App.jsx` — add route
- `frontend/src/components/Sidebar.jsx` — add nav item under Control group

**Built-in seed playbook (wire up on first run):**
```json
{
  "name": "Critical MCP Block → Contain",
  "trigger_event_type": "mcp_event",
  "trigger_conditions": {"action_type": "mcp_block", "min_confidence": 0.9},
  "actions": [
    {"type": "create_case", "requires_approval": false, "params": {"severity": "critical", "incident_type": "ai_agent_compromise"}},
    {"type": "isolate_endpoint", "requires_approval": true, "params": {}},
    {"type": "send_webhook", "requires_approval": false, "params": {"message": "Critical MCP block detected — containment initiated"}}
  ]
}
```

**Frontend (Playbooks.jsx):**
- List view: active playbooks, run count, last triggered
- Builder: trigger selector, condition key-value editor, action sequencer (drag to reorder)
- Run history per playbook
- "Test dry-run" button (evaluates but doesn't execute)

---

### PRIORITY 3 — Adaptive Thresholds Agent
**Effort:** 2 days | **Impact:** The "self-adapting" demo feature

**What it does:**
A background agent that runs every 4 hours, reads false positive rates and detection stats from the last 24 hours, asks Nemotron-70B for threshold recommendations, and applies them at runtime — logged to the audit trail, no restart needed.

**Why third:**
After Temporal Linker + Playbooks, you have the detection → correlation → response story. Adaptive thresholds adds "it improves itself" — the key claim that differentiates you from every static SIEM/SOAR.

**New model (add to models.py):**
```python
class AdaptiveThresholdLog(SQLModel, table=True):
    """Audit trail for every threshold change the adaptive agent makes."""
    id: Optional[int] = Field(default=None, primary_key=True)
    threshold_name: str = Field(default="")         # anomaly_score | behavioral_similarity | itdr_confidence
    old_value: float = Field(default=0.0)
    new_value: float = Field(default=0.0)
    reason: str = Field(default="", sa_column=Column(Text))
    fp_rate_24h: float = Field(default=0.0)
    fn_rate_24h: float = Field(default=0.0)
    agent_model: str = Field(default="")
    applied_at: datetime = Field(default_factory=datetime.utcnow)
```

**Runtime config object (backend/adaptive_config.py):**
```python
# In-memory, updated by agent, read by detectors
_config = {
    "anomaly_score_threshold": 70,        # endpoint agent local score
    "behavioral_similarity_threshold": 0.85,  # behavioral fingerprinter
    "itdr_confidence_threshold": 0.75,    # ITDR detectors
    "defense_fp_tolerance": 0.05,         # 5% false positive tolerance
}
ADJUSTMENT_BOUNDS = {
    # Agent can only move within ±20% of defaults
    "anomaly_score_threshold":          (56, 84),
    "behavioral_similarity_threshold":  (0.68, 1.0),
    "itdr_confidence_threshold":        (0.60, 0.90),
}
```

**Files to create/modify:**
- `backend/adaptive_config.py` — runtime config singleton
- `backend/adaptive_agent.py` — the agent loop
- `backend/main.py` — start adaptive agent thread on startup (after scheduler)
- `backend/routers/defense.py` — read `adaptive_config` for thresholds
- `backend/routers/itdr.py` — read `adaptive_config` for confidence thresholds
- `backend/routers/admin.py` or `backend/routers/analytics.py` — new `GET /api/adaptive/log` endpoint (last 30 threshold changes)
- `frontend/src/pages/app/DefenseConsole.jsx` — add "Adaptive Engine" section showing current thresholds + last change

**Agent logic (adaptive_agent.py):**
```python
async def adaptive_agent_cycle():
    # 1. Compute last 24h stats
    fp_rate = _compute_fp_rate()          # DefenseEvents marked dismissed / total
    fn_estimate = _compute_fn_estimate()  # ITDRAlerts with status=false_positive
    avg_confidence = _compute_avg_confidence()

    # 2. Build Nemotron prompt
    prompt = f"""
    AegisTrace detection stats (last 24h):
    - False positive rate: {fp_rate:.1%}
    - False negative estimate: {fn_estimate:.1%}
    - Average detection confidence: {avg_confidence:.1%}
    - Current thresholds: {json.dumps(_config)}

    Allowed bounds: {json.dumps(ADJUSTMENT_BOUNDS)}
    Target: FP rate < 5%, FN rate < 2%, confidence > 75%.

    If thresholds need adjustment, return JSON with new values.
    If no change needed, return {{"no_change": true}}.
    Include a one-sentence "reason" field.
    """

    result = await call_nemotron_json(prompt)

    # 3. Apply changes (within bounds)
    if not result.get("no_change"):
        for key, val in result.items():
            if key in _config and key in ADJUSTMENT_BOUNDS:
                lo, hi = ADJUSTMENT_BOUNDS[key]
                new_val = max(lo, min(hi, float(val)))
                _log_threshold_change(key, _config[key], new_val, result.get("reason", ""))
                _config[key] = new_val
```

**Safety rules hardcoded in system prompt:**
```
You are the AegisTrace Adaptive Threshold Agent.
You may ONLY adjust the numeric thresholds listed.
You may NEVER: disable detectors, change user permissions, delete data, modify authentication settings.
All adjustments must stay within the provided bounds.
```

---

### PRIORITY 4 — Auto-Rule Generation Trigger
**Effort:** 1 day | **Impact:** Detection library grows without analyst intervention

**What it does:**
Extends the existing `/api/rules/cases/{id}/generate` (Codestral 22B, already built) with an automatic trigger: when the same MITRE technique appears in 3+ cases within 7 days, fire rule generation automatically without analyst input. Rules go to a "pending review" queue.

**Why fourth:**
`/api/rules` is already complete. This is a 1-day extension — one background query + one auto-trigger + a "Pending Rules" tab in the existing Rules UI.

**New model (add to models.py):**
```python
class DetectionRule(SQLModel, table=True):
    """Stores auto-generated detection rules awaiting review."""
    id: Optional[int] = Field(default=None, primary_key=True)
    rule_name: str = Field(default="")
    source_case_id: Optional[int] = Field(default=None, foreign_key="case.id")
    mitre_technique: str = Field(default="")
    yara: str = Field(default="", sa_column=Column(Text))
    sigma: str = Field(default="", sa_column=Column(Text))
    kql: str = Field(default="", sa_column=Column(Text))
    splunk_spl: str = Field(default="", sa_column=Column(Text))
    generated_by: str = Field(default="auto")       # auto | analyst
    status: str = Field(default="pending_review")   # pending_review | approved | rejected | deployed
    reviewed_by: Optional[str] = Field(default=None)
    reviewed_at: Optional[datetime] = Field(default=None)
    org_id: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**Trigger logic (runs nightly via existing scheduler):**
```python
async def check_rule_generation_triggers(engine):
    """Check if any MITRE technique has appeared 3+ times this week."""
    with Session(engine) as session:
        cutoff = datetime.utcnow() - timedelta(days=7)
        cases = session.exec(select(Case).where(Case.created_at > cutoff)).all()

        technique_counts = defaultdict(list)  # technique_id → [case_ids]
        for case in cases:
            for t in json.loads(case.mitre_techniques or "[]"):
                tid = t.get("id", "")
                if tid:
                    technique_counts[tid].append(case.id)

        for technique_id, case_ids in technique_counts.items():
            if len(case_ids) >= 3:
                # Check if we already generated rules for this technique this week
                existing = session.exec(
                    select(DetectionRule)
                    .where(DetectionRule.mitre_technique == technique_id)
                    .where(DetectionRule.created_at > cutoff)
                ).first()
                if not existing:
                    # Trigger Codestral rule generation
                    trigger_auto_rule_gen(session, technique_id, case_ids[-1])
```

**Files to modify:**
- `backend/models.py` — add `DetectionRule`
- `backend/routers/rules.py` — add `GET /api/rules/pending`, `POST /api/rules/{id}/approve`, `POST /api/rules/{id}/reject`
- `backend/routers/schedule_reports.py` — add nightly `check_rule_generation_triggers()` call
- `frontend/src/pages/app/RulesHub.jsx` — add "Pending Review" tab (if this page exists), otherwise create minimal page

---

## DEFERRED ITEMS (Do Not Build Yet)

### PIPROXY — Prompt Injection Proxy
**Status:** Design complete, defer to month 2
**Why:** Depends on mitmproxy in your infra (new system dependency). Needs to run in production to collect false negatives before fine-tuning has value. Build after Playbook Engine is live.
**When to build:** After Priority 1–4 are deployed and the ingest pipeline is receiving events from at least one external tool.
**MVP scope:** mitmproxy base + Layer 1 fast pattern regex + Layer 2 Llama Guard (async, non-blocking) + `POST /api/ingest/piproxy-event`

### Fine-Tuning Pipeline (Adaptive Phase 1)
**Status:** Defer — dependency on PIPROXY
**Why:** Requires PIPROXY collecting `AdversarialExample` records in production. Fine-tuning Llama Guard via LoRA on Colab is a 2-3 week pipeline. No value until you have 500+ false negatives to train on.
**When to build:** After PIPROXY runs for 30+ days in production.

### MCP Guard (Full Sandbox)
**Status:** Scope down to `mcp-verify` CLI only
**Why:** The full bubblewrap + ptrace + eBPF version needs `SYS_ADMIN` + `SYS_PTRACE` — blocked in most container environments. The 20% that gives 80% of the value is static analysis of postinstall scripts + VirusTotal check + Sigstore verification.
**Build `mcp-verify`:** 1-week CLI tool. `POST /api/ingest/supplychain` for AegisTrace integration. Publish on PyPI. Natural companion to `mcp-aegis`.

### NHI Guard (as separate tool)
**Status:** Don't build as separate repo
**Why:** `/api/nhi` already covers trust decay, sprawl scores, lifecycle health. `IdentityConnector` covers Azure AD + Okta sync. The unique value is AWS IAM discovery + CloudTrail analysis.
**What to build instead:** Add `AWSConnector` to `backend/core/connectors/aws_iam.py` following the existing `BaseConnector` pattern. Add `POST /api/nhi/scan/aws` endpoint. 2-3 days max.

### Shadow Sentry (eBPF path)
**Status:** Defer full eBPF, consider user-space version
**Why:** eBPF kernel module requires root, kernel 5.x+, breaks in containerised environments. The existing endpoint agent already does shadow AI detection via connection monitoring.
**User-space alternative:** mitmproxy + JA3 TLS fingerprinting + approved-domain cross-check. 5 days. Gets 70% of the value without kernel work.
**When:** Month 2, after PIPROXY.

### SBC Edge Agent
**Status:** Phase 5+ — needs cloud platform to be smarter first
**Why:** The edge agent only makes sense as a local triage tier once the cloud platform has the Playbook Engine + Adaptive Thresholds to coordinate with. Starting with it now puts the cart before the horse.
**Architecture when ready:** Hybrid edge-cloud. Edge handles: local anomaly scoring (lightweight ONNX model), initial triage classification (Qwen3-0.6B), shadow AI network detection. Cloud handles: complex investigations, playbook execution, cross-user correlation, model training.
**Recommended hardware:** NVIDIA Jetson Orin Nano (nearly 2× RPi5 for AI inference). Use `llama.cpp` with 4-bit quantization for on-device models.

### NVIDIA Morpheus (Phase 10)
**Status:** Post free-tier — needs GPU + Kafka
**Why:** GPU-accelerated DGA detection and log anomaly scoring. Requires migrating off Render free tier to DigitalOcean/Hetzner with GPU attachment.

---

## FULL BUILD TIMELINE

```
Week 1 (1–2 days): Temporal Linker + Attack Graph tab
  → backend/linker.py
  → backend/routers/graph.py  (GET /api/graph/reconstruct)
  → frontend/.../CaseDetail/AttackGraphTab.jsx
  
Week 2 (3 days): Playbook Engine
  → models.py: Playbook, PlaybookRun
  → backend/routers/orchestration.py  (CRUD + rule evaluator)
  → frontend/.../Playbooks.jsx + route + sidebar item
  → Wire evaluate_playbooks() into ingest.py
  → Seed one built-in playbook

Week 3 (2 days): Adaptive Thresholds Agent
  → backend/adaptive_config.py  (runtime config singleton)
  → backend/adaptive_agent.py   (4-hour cycle)
  → main.py: start adaptive thread on startup
  → DefenseConsole.jsx: threshold display + last-change log

Week 4 (1 day): Auto-Rule Generation Trigger
  → models.py: DetectionRule
  → routers/rules.py: pending/approve/reject endpoints
  → schedule_reports.py: nightly trigger check
  → RulesHub.jsx: pending review tab

Month 2: PIPROXY MVP → mcp-verify CLI → AWS NHI connector
Month 3: Shadow Sentry user-space → PIPROXY false-negative collection starts
Month 4+: Fine-tuning pipeline (when enough adversarial examples collected)
Month 5+: SBC Edge Agent (after playbooks + adaptive thresholds are stable)
```

---

## THE STORY THIS BUILDS

After the 4 priority builds, AegisTrace can truthfully claim:

1. **"It correlates everything automatically"** — Temporal Linker turns 5 alert streams into one attack narrative
2. **"It responds in seconds, not hours"** — Playbook Engine goes from detection to containment automatically
3. **"It adjusts its own detection based on live performance"** — Adaptive Thresholds Agent tunes itself every 4 hours
4. **"Its detection library grows without analyst intervention"** — Auto-rule generation adds YARA/Sigma rules when attack patterns repeat

No commercial SIEM/SOAR does all four on free-tier infrastructure. That's the competitive position.

---

## HOW TO START

When Prasanna says "start the next task":
→ Look at Priority 1 (Temporal Linker). Confirm he wants to start there.
→ Read `backend/routers/ingest.py`, `backend/models.py`, and `frontend/src/pages/app/CaseDetail/index.jsx` before writing code.
→ Build `backend/linker.py` first (pure Python, no frontend dependency).
→ Test the query logic before writing any UI.

When Prasanna says "push to GitHub":
```bash
cd ~/Documents/Claude/Projects/aegistrace
rm -f .git/index.lock .git/HEAD.lock
git add -A
git commit -m "v10.0: [feature name]"
git push origin main
```

After completing any task, update `AEGISTRACE_CONTEXT.md` to mark it done.
