# AegisTrace — Bug Fix Log & Feature Gap Analysis

## Bugs Fixed (this session)

| # | File | Bug | Fix Applied |
|---|------|-----|-------------|
| 1 | `frontend/src/pages/app/Dashboard.jsx` | `FolderOpen` used but not imported → runtime crash on empty case list | Added to lucide-react import |
| 2 | `backend/routers/cases.py` | `GET /api/cases` had no auth → anyone could list all cases | Added `_user: User = Depends(get_current_user)` |
| 3 | `backend/routers/cases.py` | `GET /api/cases/{id}` had no auth → any anonymous user could read any case | Added `get_current_user` dependency |
| 4 | `backend/routers/cases.py` | `GET /api/cases/correlate/all` had no auth | Added `get_current_user` dependency |
| 5 | `backend/routers/cases.py` | `DELETE /api/cases/{id}` allowed viewer-role users to delete cases | Added role check: admins and analysts only |
| 6 | `backend/routers/cases.py` | `fire_event("case_status_changed")` fired on **every** PATCH, not just status changes → webhook spam | Wrapped in `if "status" in data and data["status"] != old_status` guard |
| 7 | `backend/routers/vt.py` | All VT endpoints (lookup, bulk, history) had no auth → API key could be burned by anyone | Added `get_current_user` to all 5 endpoints |
| 8 | `backend/routers/ioc.py` | All IOC endpoints had no auth | Added `get_current_user` to all 5 endpoints + added import |
| 9 | `backend/routers/malware.py` | All 9 malware tool endpoints had no auth | Added `get_current_user` to all endpoints + added import |
| 10 | `backend/routers/terminal.py` | `analyse`, `history`, `tools` had no auth → AI calls could be triggered anonymously | Added `get_current_user` to all 3 endpoints |
| 11 | `backend/routers/email_router.py` | `analyse`, `history`, `history/{id}` had no auth | Added `get_current_user` to all 3 endpoints |
| 12 | `backend/main.py` | Dead code: `_login_attempts` dict and `LOGIN_RATE_LIMIT = 10` defined but never used (actual rate limiting is in `auth.py`) | Removed dead code |
| 13 | `frontend/.../CaseDetail/index.jsx` | `debounceTimer` stored in `useState` → stale closure bug, `clearTimeout` unreliable | Changed to `useRef(null)` — timer now always points to the live handle |

---

## Feature Gap Analysis vs. Industry Leaders

Compared against: **Splunk SOAR**, **Palo Alto Cortex XSOAR**, **CrowdStrike Falcon**, **Microsoft Sentinel**, **IBM QRadar**, **Rapid7 InsightIDR**.

### 🔴 Critical Gaps (high effort, high value)

**1. SOAR Playbook Automation (Cortex XSOAR, Splunk SOAR)**
AegisTrace has static playbook checklists — analysts tick boxes manually. Competitors execute automated response actions: block IPs at the firewall, quarantine endpoints via EDR API, revoke compromised tokens, send JIRA tickets. This is the single biggest differentiator to close.

**2. Real-time Push Notifications (all platforms)**
No email/SMS/push alerts when a critical case is created or an SLA breaches. Webhooks exist but require external configuration. A built-in notification system (email via SendGrid/SES, Slack, PagerDuty) would directly reduce response time.

**3. EDR / Endpoint Integration (CrowdStrike, SentinelOne, Carbon Black)**
AegisTrace has an endpoint agent for log shipping but no two-way integration with EDR platforms. Cannot isolate a host, kill a process, or pull memory artifacts from within the case workflow. Competitors offer this natively.

### 🟡 Medium Gaps (medium effort, significant value)

**4. Case Assignment & Workload Management**
No analyst assignment system. Cases have `analyst_name` as a plain text field — not linked to a real user. Competitors show per-analyst queues, workload balancing, and escalation paths.

**5. MISP / OpenCTI / TAXII Integration**
IOCs are extracted and correlated internally but cannot be pushed to or pulled from external TIPs (MISP, OpenCTI, Anomali). This limits threat-sharing capability that tools like IBM QRadar and Sentinel offer out of the box.

**6. Analyst Performance Metrics**
No MTTR (Mean Time to Respond) or MTTD (Mean Time to Detect) tracking per analyst or team. Platforms like Rapid7 InsightIDR and Splunk have SOC efficiency dashboards that help team leads spot bottlenecks.

**7. SLA Escalation (automatic, not just visual)**
AegisTrace colours cases red when SLA is breached but takes no automatic action. Competitors auto-escalate: bump severity, reassign to senior analyst, fire a PagerDuty alert. The SLA threshold data is already in the code — escalation just needs wiring.

**8. Case Merging / Linking**
No way to link related cases or merge duplicates into a parent incident. Cortex XSOAR and Sentinel support incident grouping natively, which is critical for campaign tracking.

### 🟢 Lower Gaps (lower effort, good polish)

**9. Dark Web Monitoring**
Not present. Platforms like CrowdStrike Falcon X and Recorded Future provide leaked credential monitoring. Could be added as a free tier using HaveIBeenPwned API for domain-level monitoring.

**10. Network Traffic / PCAP Analysis**
Email header analysis exists but no PCAP upload/parsing (Zeek/Suricata integration). Competitors support full network forensics in-platform.

**11. Multi-tenancy Enforcement**
`org_id` exists on models but is never filtered in queries. For MSSP use, every query should scope to the authenticated user's `org_id`. One migration + query filter changes would unlock this.

**12. Mobile / PWA Support**
No mobile-responsive layout or Progressive Web App manifest. Competitors have native mobile apps. Low effort: add viewport meta + responsive CSS breakpoints.

**13. Threat Intel Feed Subscriptions**
No live feed ingestion (CISA alerts, ISAC feeds, Abuse.ch live feeds). Would complement the existing free enrichment sources already wired (URLhaus, MalwareBazaar, ThreatFox).

**14. Report Scheduling**
No scheduled report delivery. Managers at enterprises expect automated weekly PDF digests to their inbox. Could be implemented with a simple cron + email integration.

---

## Quick Wins (can ship in < 1 day each)

| Feature | What to build | Why |
|---------|--------------|-----|
| Email notifications | SendGrid/SMTP on case creation / SLA breach | Direct analyst response improvement |
| org_id query filtering | Add `.where(Case.org_id == user.org_id)` to all case queries | Enables multi-tenant / MSSP mode |
| Case assignment | Link `analyst_name` to `User.id` + assignment API | Real workload visibility |
| MTTR stat on Dashboard | Calculate `closed_at - created_at` per case | Zero-effort analytics insight |
| HaveIBeenPwned domain check | Add `query_hibp_domain()` to enrichment router | Free dark-web signal |
