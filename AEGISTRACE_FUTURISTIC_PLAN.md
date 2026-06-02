# AegisTrace — Futuristic Feature Roadmap
> Beyond CrowdStrike. What the next generation of SOC tooling looks like.
> Session 5 — June 2026

---

## The Vision

AegisTrace becomes an **autonomous threat intelligence platform** — not just a tool analysts use, but a system that thinks alongside them. AI that proactively surfaces threats, correlates patterns across time, generates its own detection rules, and explains every decision in plain English. A system that would take a team of 5 analysts at a major SOC to replicate manually.

---

## TIER 1 — AI-Native Analyst Experience

### 1. Proactive AI Triage Engine
**What it does:** Instead of clicking "Generate AI Analysis," the system watches all incoming data and *proactively surfaces anomalies*. A small panel in the sidebar shows: "⚠ 3 new patterns detected in the last hour." Click to expand — AI has already written the case summary, extracted IOCs, and suggested severity.

**How it works:**
- Background task runs every 5 minutes after each ingest batch
- Uses Groq gemma2-9b (fast, cheap) to score every new log batch against a SOC triage prompt
- If score > 40, auto-generates a triage suggestion card and pushes to the notification feed
- Analyst can dismiss, escalate to a case, or mark as expected

**Why it's futuristic:** Current tools require analyst action to get AI analysis. This flips it — AI is always watching, analyst only intervenes when needed. Mirrors how CrowdStrike Falcon Complete MDR works.

**Effort:** 3-4h. Hooks into existing ingest pipeline + notification system (Phase 7).

---

### 2. Natural Language Case Query
**What it does:** Replace filter dropdowns with a single search bar. Type in plain English:
- "Show me all ransomware cases from the last 30 days with critical severity"
- "Which endpoints had failed SSH logins in the last 6 hours"
- "Find cases where the same IP appears and the case is still open"

AI translates the query to structured filters and runs the search.

**How it works:**
- `POST /api/cases/nl-search` — send natural language query to Groq (llama-3.3-70b)
- Groq returns structured JSON: `{status: "open", severity: "critical", incident_type: "ransomware", days: 30}`
- Backend applies filters and returns results
- Frontend renders results exactly like the regular case list

**Why it's futuristic:** Every major enterprise tool is moving to natural language interfaces. This makes AegisTrace usable by non-technical security managers and executives.

**Effort:** 2h. One new endpoint, small frontend change.

---

### 3. Explainable AI Verdict Cards
**What it does:** Every AI verdict now shows a visible reasoning chain instead of just a score. Like a judge giving reasons for a ruling:

```
Threat Score: 78/100

Reasoning chain:
① IP 185.220.101.34 — matches TOR exit node list (Shodan data)
② Same IP appeared in 2 previous cases (SOC-2026-0014, SOC-2026-0007) 
③ Port 4444 connection detected — common Metasploit default
④ Login at 03:17 UTC — 4 standard deviations from this endpoint's baseline
⑤ PowerShell with -EncodedCommand flag — MITRE T1059.001
```

**How it works:**
- Modify the AI analysis prompt to return `"reasoning_steps": ["step1", "step2"]` in the JSON
- Store reasoning_steps in Case.ai_technical_summary (or a new field)
- Display as numbered chain in AIAnalysisTab

**Why it's futuristic:** XAI (Explainable AI) is the #1 demand in enterprise security. Analysts don't trust black-box verdicts. Showing the chain builds trust and teaches junior analysts.

**Effort:** 2h. Prompt update + frontend display.

---

### 4. AI Memory — Cross-Case Pattern Recognition
**What it does:** When AI is analysing a new case, it receives context from the 10 most similar historical cases. It can say: "This pattern of encoded PowerShell followed by LSASS dumping matches the campaign we saw in SOC-2026-0014 in March. That case was attributed to FIN7."

**How it works:**
- Before calling Groq for case analysis, query the last 50 closed cases
- Build a "memory context" block: case numbers, titles, key IOCs, threat actors, outcomes
- Prepend to the analysis prompt as a `[HISTORICAL CONTEXT]` block
- Groq now reasons with history, not just the current case
- This is essentially Retrieval-Augmented Generation (RAG) — no vector database needed for this scale

**Why it's futuristic:** RAG is what separates basic LLM use from enterprise AI. The analyst gets the benefit of institutional memory automatically.

**Effort:** 2-3h. No new infrastructure — just richer prompts.

---

### 5. AI Attack Narrative Generator
**What it does:** After case closure, one button generates a full narrative report: "At 08:12 UTC on Tuesday 14 January, a threat actor originating from a TOR exit node in Frankfurt initiated..."

The narrative is written like a forensic report — past tense, specific timestamps from the timeline, named systems, named users. Not a summary. A story.

**How it works:**
- `POST /api/cases/{id}/narrative` — calls llama-3.3-70b with a rich "write forensic narrative" prompt
- Input: all case fields + full timeline events + closure notes
- Output: 600-900 word narrative stored as `Case.ai_narrative` (new field)
- ReportTab gets new "AI Narrative PDF" option

**Why it's futuristic:** Board-level reporting. C-suite doesn't read bullet points. This turns a closed case into a publishable incident report.

**Effort:** 2h. One endpoint + one prompt + ReportTab button.

---

## TIER 2 — Visual Intelligence

### 6. Knowledge Graph — Entity Relationship Visualiser
**What it does:** A full-screen interactive graph showing every entity in AegisTrace and how they're connected. Cases → IOCs → Endpoints → Threat Actors → Cases. Hover a node to see details. Click to navigate.

Looks like: a dark canvas with glowing red/purple nodes, crimson connecting lines, zooming animation.

**Tech:** `d3-force` (already in available libs). No new backend needed — build the graph from existing data.

**Nodes:**
- Cases (red squares) — size = severity
- IOCs (purple circles) — size = case_count
- Endpoints (white monitors) — colour = online/offline
- Threat Actors (from MITRE Groups matching) — amber hexagons

**Edges:**
- Case → IOC (case contains this IOC)
- IOC → IOC (shared in same case = connected)
- Endpoint → Case (endpoint generated this case)

**Why it's futuristic:** Maltego costs £3000/year. This gives the same visual relationship mapping built into your SOC platform, free.

**Effort:** 4-5h. New page `/app/graph`. Pure frontend using existing API data.

---

### 7. Process Tree Visualiser
**What it does:** The endpoint agent already collects process snapshots (`ps aux` / `Get-Process`). Display this as an interactive process tree in the case detail. Parent-child relationships shown as a tree. Suspicious processes highlighted.

Suspicious patterns flagged automatically:
- `word.exe → cmd.exe` — red (Office spawning shell)
- `powershell.exe -EncodedCommand` — red (obfuscation)
- `svchost.exe` not under `services.exe` — amber (masquerading)
- Any process from temp directory — amber

**How it works:**
- Parser in ingest.py extracts parent PID relationships from process snapshot
- Stored as JSON in LogBatch
- New `ProcessTreeTab.jsx` in CaseDetail renders using a recursive tree component

**Why it's futuristic:** This is how CrowdStrike Falcon's "process tree" works. Junior analysts can immediately see attack chains without having to interpret raw `ps` output.

**Effort:** 4h. Parser + visualisation component.

---

### 8. Impossible Travel Detector
**What it does:** The agent already collects login events (Windows 4624, Linux auth.log). When the same username logs in from two different country IPs within 4 hours, auto-create a case with: "Impossible travel detected — user j.murphy logged in from Dublin (IE) and Lagos (NG) within 2h 14m."

**How it works:**
- Extend the ingest AI analysis to check for geo-location patterns using IPInfo data already being collected
- Cross-reference login events across log batches for the same username
- If same user, different countries, < 4h gap → trigger `evaluate_rules("impossible_travel", {...})`
- Auto-create a medium-severity case

**Why it's futuristic:** This is what Azure AD Identity Protection does. Building it into a free SOC tool is genuinely impressive.

**Effort:** 3h. Logic in ingest.py + alert rule trigger.

---

## TIER 3 — Automation & SOAR

### 9. Sigma Rule Auto-Generator
**What it does:** After closing a case, AI generates a ready-to-deploy Sigma detection rule from the findings. The analyst reviews it, edits if needed, and exports it.

Example output:
```yaml
title: Encoded PowerShell Execution from Word.exe
status: experimental
author: AegisTrace AI
logsource:
  category: process_creation
detection:
  selection:
    ParentImage|endswith: '\WINWORD.EXE'
    CommandLine|contains: '-EncodedCommand'
  condition: selection
level: high
tags:
  - attack.execution
  - attack.t1059.001
```

**How it works:**
- `POST /api/cases/{id}/sigma-rule` — calls mixtral-8x7b with a Sigma rule generation prompt
- Input: case findings, MITRE techniques, IOCs, commands run
- Output: valid YAML Sigma rule
- New "Sigma Rule" tab in ReportTab with copy button and download

**Why it's futuristic:** Sigma is the universal SIEM detection language. Turning investigations into detection rules means each closed case makes the next attack easier to catch. This is the core loop of an intelligence-driven SOC.

**Effort:** 2h. One endpoint + one prompt + frontend tab.

---

### 10. Automated Response Actions (SOAR Lite)
**What it does:** Each playbook step gets an optional "Auto-execute" action. Analyst selects from a list of pre-built actions:
- "Block IP in firewall" → fires a webhook to your firewall API
- "Isolate endpoint" → sends isolation command via agent heartbeat channel
- "Create Jira ticket" → fires webhook to Jira API
- "Send Slack alert" → fires to Slack webhook

Actions are defined as webhook templates. The playbook step shows a "Execute" button that fires the webhook with case-specific data substituted in.

**Why it's futuristic:** This is SOAR (Security Orchestration, Automation, and Response) — a market that Palo Alto acquired Demisto for $560M for. Building a simplified version free.

**Effort:** 3-4h. New `PlaybookAction` model + action execution engine.

---

### 11. Real-Time Threat Feed Integration
**What it does:** Live feed of new IOCs from abuse.ch pulls every 15 minutes. When a new IOC in the feed matches any of your monitored endpoints, active cases, or watched IOCs — instant notification.

**Sources (all completely free, no API key):**
- URLhaus (new malware URLs): `https://urlhaus-api.abuse.ch/v1/urls/recent/`
- MalwareBazaar (new malware hashes): `https://mb-api.abuse.ch/api/v1/` (query=get_recent)
- ThreatFox (new IOCs): `https://threatfox-api.abuse.ch/api/v1/` (query=get_iocs)
- Feodo Tracker (botnet C2 IPs): `https://feodotracker.abuse.ch/downloads/ipblocklist.json`

**How it works:**
- Background task every 15 min: pull latest IOCs from all 4 sources
- Cross-reference against `IOCCorrelation` table and active `Endpoint.ip_address`
- If match found → create Notification + fire alert rule
- New "Threat Feed" section in ThreatHunt showing latest feed entries

**Why it's futuristic:** Commercial threat intel subscriptions cost £50k+/year. This gives real-time threat feed for free.

**Effort:** 4h. Background task + 4 API callers + cross-reference logic + frontend view.

---

### 12. Threat Actor MITRE Group Matching
**What it does:** Download MITRE ATT&CK Groups dataset (free JSON from MITRE GitHub). When a case has MITRE techniques extracted, cross-reference against all known APT groups to find the closest match.

Shows in AIAnalysisTab:
```
🎯 Threat Actor Match — 74% confidence
   APT28 (Fancy Bear) — Russian GRU Unit 26165
   Matching techniques: T1566 (Phishing), T1059 (PowerShell), T1003 (LSASS Dump)
   Known targets: Government, Defence, Energy
   Primary region: Western Europe, USA
```

**How it works:**
- Download `enterprise-attack.json` from `https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json`
- Store as `backend/data/mitre_groups.json` (static file, update quarterly)
- After AI extracts techniques, compare technique list against groups dataset
- Return top 3 matching groups with confidence score
- Display in AIAnalysisTab below the technique list

**Why it's futuristic:** Threat attribution is what separates L1 from L3 analysts. This gives every analyst access to the same attribution context that threat intel teams spend months building.

**Effort:** 3h. Data file + matching logic + frontend display.

---

## TIER 4 — Platform Features

### 13. Live Collaboration Indicators
**What it does:** When multiple analysts have the same case open, show who's in the case. Small avatar bubbles in the case header: "👤 Maria is in this case."

**How it works:**
- `WebSocket /ws/case/{id}` — analysts join a room on case open, leave on close
- Server broadcasts presence list to all connected clients
- Frontend renders avatar initials bubbles (first letter of name, random colour)
- No conflict resolution needed — just awareness

**Why it's futuristic:** This is what Google Docs and Notion do. In a real SOC with multiple analysts, knowing who's in a case prevents duplicate work.

**Effort:** 3h. WebSocket endpoint in FastAPI + frontend presence component.

---

### 14. Zero Trust Endpoint Posture Score
**What it does:** For each endpoint, calculate a posture score (0-100) based on observable risk signals:
- No EDR process detected → -20
- Connections to unusual geo IPs → -15 per connection
- High entropy process names (obfuscation) → -10
- Admin account logins at unusual hours → -10
- Recent failed logins → -5 each

Shown on Endpoints page as a posture card. Red = high risk, green = healthy.

**Why it's futuristic:** Zero Trust is the dominant security framework. Giving each endpoint a live posture score is exactly what Microsoft Defender for Endpoint charges £15/device/month for.

**Effort:** 3h. Scoring logic in ingest.py + frontend score card.

---

### 15. AI Weekly Threat Debrief
**What it does:** Every Monday morning (or on-demand), AI generates a "Threat Landscape Briefing" based on all cases from the previous week:

```
AEGISTRACE WEEKLY DEBRIEF — Week 22, 2026

📊 Activity Summary
Cases opened: 7 | Closed: 5 | Critical: 1

🎯 Top Attack Patterns This Week
1. Credential stuffing against web portals (3 cases)
2. Encoded PowerShell execution (2 cases)

🌍 Top IOC Sources
1. TOR exit nodes — 185.220.x.x range (4 cases)
2. Hosting provider AS12345 — 5 new IPs

💡 Recommended Hardening
1. Block TOR exit node ranges at perimeter
2. Enforce PowerShell Constrained Language Mode

🔮 Watch For Next Week
The credential stuffing pattern matches a campaign seen across EU firms this month.
Recommend enabling account lockout after 3 failed attempts.
```

**How it works:**
- Scheduled task every Monday 08:00 (APScheduler)
- Pull all cases from past 7 days, aggregate patterns
- Single Groq call to llama-3.3-70b with all data
- Store as a `WeeklyDebrief` model
- Send email to admin + create in-app notification
- New "Debrief" section on Dashboard

**Why it's futuristic:** This is what a vCISO (virtual CISO) service provides. Automated, weekly strategic intelligence at zero cost.

**Effort:** 3h. Scheduled task + single AI call + dashboard widget.

---

## Implementation Priority

| # | Feature | Effort | Wow Factor | Build Order |
|---|---|---|---|---|
| 1 | Explainable AI reasoning chain | 2h | ⭐⭐⭐⭐⭐ | **Build now** |
| 2 | Natural language case query | 2h | ⭐⭐⭐⭐⭐ | **Build now** |
| 3 | Threat actor MITRE group matching | 3h | ⭐⭐⭐⭐⭐ | **Build now** |
| 4 | AI attack narrative generator | 2h | ⭐⭐⭐⭐ | Next sprint |
| 5 | Knowledge graph visualiser | 5h | ⭐⭐⭐⭐⭐ | Next sprint |
| 6 | Sigma rule auto-generator | 2h | ⭐⭐⭐⭐ | Next sprint |
| 7 | Real-time threat feed | 4h | ⭐⭐⭐⭐ | Next sprint |
| 8 | Proactive AI triage engine | 4h | ⭐⭐⭐⭐⭐ | After alerts |
| 9 | AI memory / RAG | 3h | ⭐⭐⭐⭐ | After alerts |
| 10 | Process tree visualiser | 4h | ⭐⭐⭐⭐ | Future |
| 11 | Impossible travel detection | 3h | ⭐⭐⭐⭐ | Future |
| 12 | Zero trust posture score | 3h | ⭐⭐⭐ | Future |
| 13 | SOAR lite (playbook actions) | 4h | ⭐⭐⭐⭐ | Future |
| 14 | Live collaboration indicators | 3h | ⭐⭐⭐ | Future |
| 15 | Weekly AI debrief | 3h | ⭐⭐⭐⭐ | Future |

**The three highest-impact features to build next (all under 3h each):**
1. Explainable AI reasoning chain — makes every AI verdict trustworthy
2. Natural language case query — feels like magic to non-technical users
3. Threat actor MITRE group matching — free attribution intel nobody else gives you free

---

*AegisTrace — When threats rise, we trace the storm.*
