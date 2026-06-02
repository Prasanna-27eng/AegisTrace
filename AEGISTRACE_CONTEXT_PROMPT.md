# AegisTrace — Full Context Prompt
> Paste this entire document into a new conversation to resume exactly where we left off.
> Last updated: June 2026 — Session 4

---

## WHO I AM

**Name:** Prasanna Kumar Surendran
**Role:** SOC Analyst · Blue Team L1 · Dublin, Ireland
**Email:** prasanna80564@gmail.com · **Phone:** +353 089 958 2880
**LinkedIn:** https://www.linkedin.com/in/prasannakumarsurendran
**GitHub:** https://github.com/prasanna80564 / https://github.com/Prasanna-27eng
**Certifications:** SC-200 ✓, CompTIA Security+ ✓, TCM PEH ✓, TCM Help Desk ✓, AIG Shield Up ✓
**In progress:** BTL1 (55%), TryHackMe SOC Level 1 (70%), SC-300 (15%), eJPT (20%)

---

## WHAT IS AEGISTRACE

Production-grade SOC investigation platform benchmarked against CrowdStrike Falcon. Built as personal tool + public portfolio showcase.

**Tagline:** "When threats rise, we trace the storm."
**Brand:** Dark (#07080F bg), crimson (#C0392B accent), JetBrains Mono + Inter
**Live URL:** https://aegistrace-7qvn.onrender.com
**GitHub:** https://github.com/Prasanna-27eng/AegisTrace
**Local:** ~/Documents/Claude/Projects/aegistrace

---

## TECH STACK

- **Backend:** FastAPI + SQLModel + SQLite (/var/data/aegistrace.db) + Uvicorn + Groq SDK + httpx + ReportLab + python-docx
- **Frontend:** React 18 (CRA) + React Router v6 + Zustand + Axios + Lucide React
- **Deploy:** Single Dockerfile → Render.com (Frankfurt, free tier, 1GB disk). Auto-deploy on push to main (~8-10 min).

---

## FULL FEATURE LIST (current — Session 4)

1. Case Management — 10-tab lifecycle (Overview, Investigation, IOCs, Terminal, Timeline, Playbook, AI Analysis, AI Chat, Report, Evidence). Autosave 2s debounce. Public/private per case.
2. Multi-Model AI — Groq: llama-3.3-70b (analysis/chat/reports), mixtral-8x7b (classification/code), gemma2-9b (extraction/demo), llama-3.1-8b (fast).
3. VirusTotal v3 — Single + bulk lookup, persistent history, case correlation. **Now fires malicious_ioc webhook on malicious verdict.**
4. Email Forensics — Header parsing, SPF/DKIM/DMARC, routing hops, phishing verdict, MITRE.
5. IOC Correlation Engine — Cross-case IOCCorrelation table. **Now fires malicious_ioc webhook when IOC hits 3+ cases (campaign).**
6. Malware Tools — Base64, URL encode/decode, hash, defang/refang, YARA generator.
7. Threat Hunting — IOC frequency, MITRE ATT&CK, campaign detection, cross-case search.
8. Terminal Import — Paste tool output, AI parses into findings/IOCs/MITRE.
9. DORA Compliance — Article 19 PDF.
10. Webhook Engine — HTTP POST on: case_created, case_closed, case_status_changed, critical_case, malicious_ioc. Slack-compatible, HMAC signed.
11. SIEM Alert Import — POST /api/cases/import-alert (Sentinel/Splunk/generic JSON).
12. Live Audit Log — 4s polling, CSV export, 7-day chart.
13. Endpoint Agent — agent/aegistrace_agent.py (Python 3.7+, zero deps). Ships logs every 5 min. Auto-creates case at threat_score ≥ 60.
14. Log Investigation — /app/logs. Paste any raw log, AI analysis, IOC extraction, push to case.
15. Free IOC Enrichment — /api/enrichment/{ioc} — 7 sources in parallel (Shodan, MalwareBazaar, URLhaus, ThreatFox, GreyNoise, IPInfo, VT).
16. Public Case Library — Per-case public/private toggle (case list row + case detail header). /public gallery.
17. Portfolio Page — /portfolio with live DB stats.
18. Landing Page — AXIS tunnel animation, live AI demo, "Agent Setup" nav link.
19. Admin Panel — Users, Webhooks, Audit Log, System Health.
20. Public Agent Setup Page — /agent-setup (no login). 4-tab guide + download button.
21. Report Generation — **Auth-protected** PDF/DOCX/DORA. Downloads via Axios (Bearer token), not raw <a href> links.
22. **Playbook state persistence** — Playbook checkboxes now saved to case.playbook_state (JSON) and survive navigation.

---

## DATABASE MODELS

```
Endpoint        — hostname, os_type, ip_address, agent_version, last_seen, threat_score_avg, tags (JSON), is_active
LogBatch        — endpoint_id, log_file, log_type, raw_content, ai_verdict, ai_summary, threat_score,
                  extracted_iocs (JSON), mitre_techniques (JSON), case_id
LogAnalysis     — case_id, log_type, raw_content, ai_verdict, threat_score, extracted_iocs (JSON),
                  mitre_techniques (JSON)
Organisation    — name, slug, plan [STUB — not enforced]
User            — email, name, role (admin/analyst/viewer), is_active, hashed_password, org_id
Case            — case_number, title, severity, status, incident_type, analyst_name, customer_name,
                  classification, description, commands_run, findings, recommendations,
                  iocs (JSON), mitre_techniques (JSON), ai_executive_summary, ai_technical_summary,
                  ai_severity_score, is_public, share_token, closure_notes, shift_handoff,
                  playbook_state (JSON),  ← NEW
                  org_id, created_at, updated_at
EvidenceArtifact — case_id, artifact_type, source_module, raw_input, normalized_output,
                   extracted_iocs (JSON), verdict, ai_analysis, confidence, evidence_score, analyst_confirmed
VTHistory       — ioc, ioc_type, verdict, malicious_count, total_engines, full_result (JSON), looked_up_at
EmailAnalysisRecord — raw_headers, raw_body, sender_ip, spf/dkim/dmarc results, routing_hops (JSON),
                      extracted_iocs (JSON), ai_verdict, case_id
ToolRun         — case_id, tool_name, command, output, ai_parsed_result (JSON)
TimelineEvent   — case_id, timestamp, event_type, description, evidence_id
AuditLog        — user_id, user_email, action, entity_type, entity_id, old_value, new_value, ip_address, timestamp
IOCCorrelation  — ioc, ioc_type, case_ids (JSON), case_count, first_seen, last_seen
WebhookConfig   — name, url, events (JSON), secret, is_active, last_fired_at, last_status_code
```

---

## API ROUTES

```
/api/auth/login, /me, /users (CRUD), /change-password
/api/cases?q,severity,status,limit,offset (CRUD)
/api/cases/{id}/generate-ai, /chat, /share, /close, /evidence, /timeline
/api/cases/import-alert, /correlate/all
/api/vt/lookup, /history, /bulk
/api/email/analyse, /history
/api/ioc/extract, /correlate/{ioc}, /correlations, /defang, /refang
/api/malware/encode, /decode, /url-encode, /url-decode, /hash, /defang, /refang, /yara
/api/terminal/analyse, /history
/api/reports/{id}/pdf, /docx, /dora        ← auth required (fixed)
/api/webhooks (CRUD + test)
/api/hunt/iocs, /mitre, /activity, /campaigns, /search, /stats
/api/audit, /stats, /stream
/api/public/cases, /{token}
/api/portfolio/stats
/api/public/demo-analyse
/api/ingest/logs, /endpoints, /endpoints/{id}/batches, /analyse, /analyses, /key
/api/enrichment/{ioc}
/api/health
```

---

## BUGS FIXED — SESSION 4

| # | Bug | Severity | Fix Applied |
|---|---|---|---|
| 1 | **Playbook state resets on navigation** | 🔴 Critical | Added `playbook_state` JSON field to Case model + migration. PlaybookTab now reads from `caseData.playbook_state` and saves via `updateCase()` on every toggle. |
| 2 | **malicious_ioc webhook never fired** | 🔴 Critical | `fire_event("malicious_ioc", ...)` now called in `vt.py` after malicious VT verdict AND in `cases.py` when IOC correlation hits 3+ cases (campaign). |
| 3 | **Hardcoded "Prasanna Kumar" in case closure** | 🟠 High | `OverviewTab.jsx` now uses `useStore().user.name` → `caseData.analyst_name` as fallback. Any analyst's name appears correctly in closure notes. |
| 4 | **Report endpoints had no authentication** | 🟠 High | PDF, DOCX, and DORA endpoints in `reports.py` now require `get_current_user`. Frontend `ReportTab.jsx` and `CaseList.jsx` now use Axios (Bearer token) instead of raw `<a href>` links. |
| 5 | **All CaseDetail tabs crashed with null caseData** | 🟠 High | Added `if (!caseData) return null;` guard to all 6 tabs: AIAnalysisTab, AIChatTab, IOCsTab, InvestigationTab, ReportTab, TerminalTab. (OverviewTab already had it.) |
| 6 | **Dashboard fetched ALL cases with no limit** | 🟡 Medium | Dashboard now calls `/api/cases?limit=100`. Backend `GET /api/cases` now accepts `limit` and `offset` query params for pagination. |
| 7 | **Duplicate migration step number** | 🟡 Medium | Two steps were both numbered `# ── 6.` — renumbered to 6 and 7. |
| 8 | **CaseList PDF download used unauthenticated `<a href>`** | 🟡 Medium | Replaced with Axios blob download that carries Bearer token. |

---

## REMAINING KNOWN ISSUES (not yet fixed)

| # | Issue | Priority | Notes |
|---|---|---|---|
| 1 | No pagination in CaseList UI | Medium | Backend now accepts limit/offset but frontend has no page controls. Add in next session. |
| 2 | Silent `.catch(() => {})` swallows errors | Low | Many error handlers are silent. Should show toast or log. Too many to fix all at once. |
| 3 | Organisation layer is a stub | Low | org_id on User+Case but never enforced. All users see all cases. Fine for personal use. |
| 4 | JWT no server-side invalidation | Low | Tokens valid 7 days even after deactivation. Would need token blocklist (Redis). |
| 5 | Public demo rate limiter in-memory | Low | Resets on server restart. Needs Redis for production. |
| 6 | No 2FA/TOTP | Medium | No second factor on login. Critical gap for a security tool. |
| 7 | Google Fonts dependency | Info | index.css loads from fonts.googleapis.com — app doesn't work fully offline. |

---

## FULL IMPROVEMENT ROADMAP

### PRIORITY 1 — Quick wins (build next session, mostly frontend)

**1A. SLA / Response Time Badges** (pure frontend, ~1-2h)
- Computed from Case.created_at + Case.severity. No backend changes.
- Thresholds: critical=4h, high=8h, medium=48h, low=168h
- New `SLABadge` component in components/SeverityBadge.jsx
- States: green (within), amber (>80% elapsed), red pulsing (BREACHED · Xh over)
- Add to: CaseList rows, CaseDetail header, Dashboard "SLA Breached" stat card

**1B. Case Templates** (pure frontend, ~1-2h)
- 6 templates: Phishing, Ransomware, Brute Force, Data Exfiltration, Malware, Insider Threat
- Each pre-fills: title, severity, incident_type, description boilerplate, MITRE techniques
- Create frontend/src/data/caseTemplates.js
- "New Case" button opens template picker modal (6 cards + "Start Blank")

**1C. CaseList Pagination** (~1h)
- Backend already has limit/offset params
- Add prev/next controls to CaseList.jsx
- Default page size: 25

**1D. Fix: save/restore tabs null guard for PlaybookTab closure checklist** (~30min)
- The closure checklist in PlaybookTab also resets on navigation
- Add `closure_state` JSON to Case model the same way as `playbook_state`

---

### PRIORITY 2 — Dashboard + Metrics (~5-7h total)

**2A. Dashboard Charts**
- npm install recharts in frontend/
- Add GET /api/portfolio/charts to portfolio.py (NOT cases.py — avoids /{case_id} route conflict)
- Returns: weekly (last 8 weeks), by_severity, by_status, mttr_days
- BarChart: cases per week. PieChart: severity breakdown.

**2B. SOC Performance Metrics Page** (new page /app/metrics)
- Pulls from AuditLog + Case tables — no new backend model needed
- Shows per-analyst: case count, avg time to close, most active day
- MTTR trend, case creation rate, FP rate (once FP tracking is built)
- Referenced by: Expel, Hunters.ai

**2C. False Positive Tracking**
- Add `false_positive: bool` + `fp_reason: str` to Case model. Migration needed.
- "Mark as FP" button in CaseDetail header — instantly closes case + logs reason
- FP analytics in metrics page: which incident types / endpoints generate most FPs

---

### PRIORITY 3 — Case Collaboration (~8-10h total)

**3A. Case Comments** (new model + 3 endpoints + frontend)
```python
class CaseComment(SQLModel, table=True):
    id, case_id (FK→case), user_id (FK→user), user_name (str),
    body (Text), created_at
```
- GET/POST/DELETE /api/cases/{id}/comments
- Panel at bottom of OverviewTab (not a new tab)
- Avatar initials circle, name, time, body, delete own comment

**3B. Case Assignment** (~1h)
- Case.analyst_name is already a text field
- Add a "Reassign" dropdown in CaseDetail header that queries /api/auth/users
- Logs reassignment via _audit()
- Filter cases by assigned analyst in CaseList

**3C. Bulk Case Actions** (~2-3h)
- POST /api/cases/bulk-update — body: {ids:[1,2,3], updates:{status:"closed"}}
- Checkbox column on CaseList rows
- Floating action bar when any selected: Change Status, Change Severity, Delete

---

### PRIORITY 4 — Threat Intelligence Enhancements (~8h total)

**4A. IOC Watchlist**
- Add `is_watched: bool` to IOCCorrelation model. Migration needed.
- POST /api/ioc/watch, DELETE /api/ioc/watch/{ioc}, GET /api/ioc/watchlist
- "Watchlist" tab in ThreatHunt.jsx
- "Watch this IOC" button in CaseDetail/IOCsTab.jsx

**4B. Threat Actor Profiling** (free MITRE data, high portfolio value)
- Download enterprise-attack.json from MITRE CTI GitHub (static, ~8MB)
- Bundle as backend/data/mitre_groups.json
- After AI analysis, cross-reference case MITRE techniques against Groups dataset
- Show "Threat Actor Match" card in AI Analysis tab: "These TTPs match APT28 with 3/5 techniques"
- Referenced by: Recorded Future, Mandiant

**4C. MITRE ATT&CK Heatmap View**
- GET /api/portfolio/mitre-heatmap in portfolio.py
- Aggregates mitre_techniques from all cases
- New page /app/mitre (or tab in ThreatHunt): 14 tactic columns, techniques coloured by frequency

**4D. Saved Hunt Query Library**
- New model: SavedQuery (name, description, query_type, query_value, tags, created_by)
- "Saved Hunts" tab in ThreatHunt — 10 pre-built + ability to save own
- Referenced by: Carbon Black, Elastic SIEM, Anvilogic

---

### PRIORITY 5 — Enterprise Alert System (CrowdStrike standard, ~35-45h total)

#### New Models needed:
```python
class Notification(SQLModel, table=True):
    id, user_id (FK, null=broadcast), title, body (Text),
    type (critical/warning/info/success), source, entity_type, entity_id,
    is_read (default False), created_at

class AlertRule(SQLModel, table=True):
    id, name, description, is_active,
    condition_type,     # threat_score|new_case|ioc_match|case_age|endpoint_offline|severity_change
    condition_operator, # gt|lt|eq|contains|any
    condition_value,    # string, parsed per type
    action_types (JSON), action_webhook_ids (JSON), action_email,
    cooldown_minutes (default 60), last_fired_at, fire_count,
    created_by (FK→user), created_at, updated_at

class AlertFired(SQLModel, table=True):
    id, rule_id (FK, nullable), rule_name (denormalised),
    trigger_source, trigger_data (JSON), actions_taken (JSON), fired_at
```

#### New backend files:
- `alert_engine.py` — evaluate_rules(trigger, data, session). Called from ingest.py, cases.py, ioc.py. Background task every 5min for case_age + endpoint_offline.
- `email_service.py` — smtplib (zero new deps). Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM. Gmail-compatible.

#### New API routers:
- /api/notifications — GET, GET /count (polled 30s), PATCH /{id}/read, PATCH /read-all, DELETE
- /api/alert-rules — CRUD + POST /{id}/test
- /api/alerts/history — paginated AlertFired, stats, CSV export

#### 5 default rules (seeded on startup):
| Name | Condition | Actions | Cooldown |
|---|---|---|---|
| Critical Endpoint Threat | threat_score > 80 | in_app + webhook | 30min |
| New Critical Case | new_case AND severity=critical | in_app + email | 15min |
| IOC Campaign Alert | ioc appears in 3+ cases | in_app | 60min |
| SLA Breach — Critical | critical case open > 4h | in_app | 60min |
| Endpoint Gone Offline | last_seen > 30min | in_app | 30min |

#### Frontend:
- Bell icon in AppShell header — polls /count every 30s, red badge if unread
- NotificationDropdown component — 280px panel, coloured borders, time-ago, entity links
- /app/alert-rules — rule table + Add Rule slide-in panel with condition builder
- /app/alerts — alert history table + stats + CSV export
- Admin panel new "Alerts" tab — SMTP config + notification preferences

---

### PRIORITY 6 — Security Hardening (~6-8h)

**6A. 2FA / TOTP** (pip install pyotp, one new dep)
- User profile settings: scan QR code (pyotp + qrcode library)
- Login flow: after password check, if mfa_enabled, show 6-digit TOTP input
- Admin can enforce MFA for all users
- Referenced by: Every enterprise security company

**6B. Playbook Evidence Collection Commands** (~2h, pure frontend)
- In PlaybookTab, each task that involves evidence collection gets expandable section
- Shows ready-to-run commands for Windows, Linux, Mac
- Click to copy — static per incident_type, no AI call needed
- Referenced by: Binalyze

**6C. Case Similarity / AI Deduplication** (~2h)
- When case is saved, send new case description + last 20 case summaries to Groq
- Returns top 3 similar cases with similarity score
- "Similar Cases" card in OverviewTab
- Referenced by: Hunters.ai, Securonix

---

### PRIORITY 7 — Compliance Expansion (~4-6h)

**7A. NIS2 Incident Notification Report** (PDF)
- EU NIS2 Directive (October 2024) — mandatory for operators of essential services
- New report template in reports.py mapping case data to NIS2 Article 23 fields
- New button in ReportTab: "NIS2 Report"
- Massive differentiator — no other free SOC tool has this

**7B. ISO 27001 Annex A Mapping**
- Map case incident_type + MITRE techniques to relevant ISO 27001 controls
- New PDF report template
- Referenced by: Drata, BreachRx

---

### PRIORITY 8 — Startup-Competitive Features

**8A. HIBP Domain Breach Monitoring** (~2h)
- Free HIBP API: https://haveibeenpwned.com/api/v3/breaches
- "Domain Monitor" tool in Tools Hub
- Enter domain → query HIBP → show all known breaches (name, date, data types)
- "Monitor this domain" watchlist → hooks into alert system when new breach found
- Referenced by: Flare, SpyCloud, Cyberint

**8B. Shift Handoff Report** (~2h)
- Case.shift_handoff field exists but no structured workflow
- "Start Handoff" button in CaseDetail: form with outgoing notes, pending actions, escalations
- Auto-emails incoming analyst with summary
- Referenced by: Expel

**8C. SOC Metrics / Analyst Leaderboard** — see Priority 2B above

---

## COMPETITIVE BENCHMARK

| Capability | CrowdStrike | AegisTrace Now | AegisTrace Planned |
|---|---|---|---|
| Endpoint log collection | Kernel agent | Python agent | ✅ Done |
| Behavioral AI analysis | ML models | Groq LLM | ✅ Done |
| IOC enrichment (7 sources) | Falcon Intel | VT + 6 free APIs | ✅ Done |
| MITRE ATT&CK mapping | Auto | AI-extracted | ✅ Done |
| malicious_ioc webhook | Yes | ✅ Fixed | ✅ Done |
| Playbook state persistence | Yes | ✅ Fixed | ✅ Done |
| Auth-protected reports | Yes | ✅ Fixed | ✅ Done |
| Alert rules engine | Fusion SOAR | Webhooks only | Priority 5 |
| In-app notifications | Yes | None | Priority 5 |
| Email alerts | Yes | None | Priority 5 |
| SLA tracking | Yes | None | Priority 1A |
| Dashboard trend charts | Yes | Stat cards only | Priority 2A |
| Case comments | Yes | None | Priority 3A |
| 2FA/TOTP | Yes | None | Priority 6A |
| NIS2 / ISO 27001 reports | No | None | Priority 7 |
| Threat actor profiling | Yes | None | Priority 4B |
| IOC watchlist | Yes | None | Priority 4A |
| HIBP domain monitoring | No | None | Priority 8A |
| Saved hunt queries | Yes | None | Priority 4D |
| False positive tracking | Yes | None | Priority 2C |
| Case templates | Yes | None | Priority 1B |
| Bulk case actions | Yes | None | Priority 3C |

---

## AI MODEL ROUTING

```python
MODELS = {
    "analysis":       "llama-3.3-70b-versatile",
    "chat":           "llama-3.3-70b-versatile",
    "classification": "mixtral-8x7b-32768",
    "extraction":     "gemma2-9b-it",
    "fast":           "llama-3.1-8b-instant",
    "code":           "mixtral-8x7b-32768",
    "report":         "llama-3.3-70b-versatile",
    "demo":           "gemma2-9b-it",
}
```

---

## HOW TO DEPLOY

```bash
cd ~/Documents/Claude/Projects/aegistrace
git add .
git commit -m "feat: description"
git push origin main
# Render auto-deploys — ~8-10 min
# Verify: https://aegistrace-7qvn.onrender.com/api/health
```

---

## INSTRUCTIONS FOR NEXT SESSION

Paste this file into a new conversation, then say:

> "I am continuing to build AegisTrace. Read the context above. Codebase is at ~/Documents/Claude/Projects/aegistrace. Live: https://aegistrace-7qvn.onrender.com. I want to build [feature from roadmap above]."

**Recommended next builds:**
1. Priority 1A — SLA Badges (pure frontend, 1-2h, immediate visible impact)
2. Priority 2A — Dashboard Charts (npm install recharts + one endpoint)
3. Priority 1B — Case Templates (pure frontend, 1-2h)
4. Priority 5 — Full Alert System (biggest enterprise upgrade)

---

*AegisTrace — When threats rise, we trace the storm.*
*Prasanna Kumar Surendran · Dublin · 2025-2026*
