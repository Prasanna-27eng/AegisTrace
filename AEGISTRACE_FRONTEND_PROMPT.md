# AegisTrace — Frontend Development Prompt
> Complete specification for building and extending the AegisTrace frontend.
> Paste this into any new AI session when working on the frontend.

---

## PROJECT OVERVIEW

You are building the frontend for **AegisTrace**, a production-grade SOC (Security Operations Centre) investigation platform. The frontend is a React 18 SPA served by a FastAPI backend. It has two distinct zones: a **public marketing site** (landing page, portfolio, public case library, agent setup guide) and a **protected app** (the full SOC platform behind login).

The app is deployed on Render.com. Live: `https://aegistrace-7qvn.onrender.com`

---

## DESIGN SYSTEM

### Colours (CSS variables in index.css)
```css
--bg:           #07080F   /* darkest — page background */
--surface:      #0F1018   /* header, sidebar, panels */
--card:         #16171F   /* card backgrounds */
--accent:       #C0392B   /* crimson — primary CTA, critical alerts */
--accent2:      #A78BFA   /* purple — AI/intel features */
--border:       rgba(255,255,255,0.07)
--text-primary: #F0F0F8
--text-muted:   #71717A
--success:      #22C55E
--warning:      #EAB308
--error:        #EF4444
```

### Typography
- **Body/UI:** `Inter` (Google Fonts) — weights 300/400/500/600/700
- **Code/IOCs/mono:** `JetBrains Mono` — weights 400/500/600
- **Landing page headings:** `Instrument Serif` (italic for emphasis)
- Rule: All IOC values, case numbers, API keys, terminal output, and hash values **always** use JetBrains Mono

### Severity colour mapping
```js
critical → #C0392B (crimson)
high     → #EF4444 (red)
medium   → #EAB308 (amber)
low      → #A78BFA (purple)
info     → #71717A (muted)
```

### Status colour mapping
```js
open             → #EF4444
in_progress      → #EAB308
pending_closure  → #A78BFA
closed           → #22C55E
```

### Component classes (from index.css)
```
.at-card          — dark card with border
.at-input         — styled text input
.at-textarea      — styled textarea
.at-select        — styled select/dropdown
.at-label         — form field label
.at-field         — label + input wrapper
.btn-accent       — crimson filled button
.btn-ghost        — transparent border button
.section-label    — uppercase monospace section heading
.spinner          — CSS spin animation (apply to Loader2 icon)
.verdict-malicious / .verdict-suspicious / .verdict-clean / .verdict-unknown
.tab-btn / .tab-btn.active  — tab navigation buttons
.critical-pulse   — red pulsing animation for critical items
.hidden-mobile / .mobile-only — responsive visibility
.mobile-bottom-nav — mobile navigation bar
```

---

## TECH STACK

```json
{
  "react": "18.3.1",
  "react-router-dom": "6.23.1",
  "axios": "1.7.2",
  "zustand": "4.5.2",
  "lucide-react": "0.395.0",
  "react-hook-form": "7.51.5",
  "zod": "3.23.8"
}
```

All icons are from **lucide-react**. No Material UI, no Chakra, no Ant Design. Tailwind is imported in index.css but mostly unused — prefer inline styles + custom classes.

---

## STATE MANAGEMENT (Zustand store)

File: `src/store/useStore.js`

```js
{
  // Auth
  token,        // JWT string from localStorage
  user,         // { id, email, name, role }
  setAuth(token, user),
  logout(),
  isAuthenticated(),

  // Toasts
  toasts,                          // [{id, message, type}]
  addToast(message, type),         // type: 'success'|'error'|'warning'|'info'

  // Cases
  cases, setCases(cases),
  currentCase, setCurrentCase(c),

  // Search
  searchQuery, setSearchQuery(q),

  // Autosave
  autosaveStatus,                  // 'idle'|'saving'|'saved'
  setAutosaveStatus(s),
}
```

---

## API CLIENT

File: `src/api/client.js`

```js
import axios from 'axios';
const api = axios.create({ baseURL: '', timeout: 30000 });
// Interceptor: adds Authorization: Bearer {token} from localStorage
// Interceptor: on 401, clears localStorage and redirects to /app/login
export default api;
```

All API calls use this client. Never use `fetch` directly.

**Backend base URL:** same origin (served by FastAPI). In development: proxied to `http://localhost:8000` via package.json proxy.

---

## ROUTING (App.jsx)

```
Public routes (no auth):
  /                   → Landing.jsx
  /portfolio          → Portfolio.jsx
  /public             → PublicGallery.jsx
  /public/:token      → PublicCaseDetail.jsx
  /agent-setup        → AgentSetup.jsx
  /app/login          → Login.jsx

Protected routes (under AppShell, auth required):
  /app/dashboard      → Dashboard.jsx
  /app/cases          → CaseList.jsx
  /app/cases/:id      → CaseDetail/index.jsx
  /app/hunt           → ThreatHunt.jsx
  /app/endpoints      → Endpoints.jsx
  /app/logs           → LogInvestigation.jsx
  /app/audit          → AuditLog.jsx
  /app/vt-lookup      → VTLookup.jsx
  /app/email          → EmailAnalysis.jsx
  /app/malware        → MalwareTools.jsx
  /app/tools          → ToolsHub.jsx
  /app/admin          → Admin.jsx
```

---

## APP SHELL (AppShell.jsx)

Wraps all protected routes. Structure:
```
<div style="display:flex; height:100vh; overflow:hidden">
  <Sidebar />                    ← desktop only (hidden-mobile class)
  <div style="flex:1; flex-direction:column">
    <header>                     ← top bar: hamburger, search, user info
    <MobileOverlaySidebar />     ← mobile only
    <main><Outlet /></main>       ← page content
    <MobileBottomNav />          ← mobile only (5 key destinations)
  </div>
</div>
```

Top bar elements (left→right):
1. Hamburger button (mobile only)
2. Search input — on Enter, navigates to `/app/cases?q={query}`
3. `marginLeft:auto` spacer
4. Autosave status indicator
5. User name + role (JetBrains Mono)
6. Save button (Loader2/Save icon)
7. Share button (Share2)
8. Public/Private toggle (Globe icon, btn-accent when public)
9. PDF download (Download icon)

**When adding new header elements** (e.g., notification bell): insert them BEFORE the user name block, after the search input flex-1 spacer.

---

## SIDEBAR (Sidebar.jsx)

Groups:
```
Investigation:
  Dashboard    → /app/dashboard   (LayoutDashboard)
  Cases        → /app/cases       (FolderOpen)
  Threat Hunt  → /app/hunt        (Crosshair)
  Endpoints    → /app/endpoints   (Monitor)
  Log Invest.  → /app/logs        (FileSearch)

Intelligence:
  VT Lookup    → /app/vt-lookup   (Shield)
  Email Anal.  → /app/email       (Mail)
  Malware Tools→ /app/malware     (Bug)
  Tools Hub    → /app/tools       (Wrench)

System:
  Audit Log    → /app/audit       (ScrollText)
  Public View  → /app/public      (Globe)
  Admin        → /app/admin       (Settings)
```

Sidebar can be collapsed (icon-only mode). State: local `useState`, not Zustand. Use `<NavLink>` with `isActive` style for active state.

---

## CASE DETAIL (CaseDetail/index.jsx)

10-tab investigation workspace. Tabs:
```
overview | investigation | iocs | terminal | timeline | playbook | ai | chat | report
```

Key patterns:
- `caseData` — loaded from `GET /api/cases/:id`
- `updateCase(updates)` — patches caseData locally + calls autosave with 2s debounce
- `reload` — re-fetches from API
- `caseId` — the URL param id (string)
- All tabs receive `{ caseData, updateCase, reload, caseId }` as props
- **Every tab MUST start with `if (!caseData) return null;`**

Autosave: 2-second debounce. `useStore.setAutosaveStatus('saving')` → after API call → `'saved'` → 2s later → `'idle'`.

Header elements:
- Back button → `/app/cases`
- Breadcrumb: Cases / case_number
- Right side: autosave indicator, Save, Share, Public toggle, PDF download

---

## EACH TAB — What it does

### OverviewTab
- Editable fields: title, severity, status, incident_type, analyst_name, customer_name, classification, affected_systems, description
- IOC preview grid (first 12 IOCs from `caseData.iocs` JSON)
- Case closure modal (final_findings, remediation_steps, lessons_learned, evidence_complete)
- `closed_by` = `useStore().user.name` (NOT hardcoded)

### InvestigationTab
- Evidence artifact list from `GET /api/cases/:id/evidence`
- Add evidence form: artifact_type, source_module, raw_input, verdict, evidence_score, confidence
- Each evidence card shows verdict badge, confidence bar, AI analysis

### IOCsTab
- Parse `caseData.iocs` JSON array
- Each IOC shows: value (defanged), type badge, verdict badge, defang/refang button
- Add IOC form, delete IOC
- "Enrich" button calls `/api/enrichment/{ioc}` and shows results panel

### TerminalTab
- Tool selector + command input + output textarea
- Submit calls `POST /api/terminal/analyse`
- Shows: key_findings, iocs_found, mitre_techniques, summary, recommended_actions
- History from `GET /api/terminal/history?case_id={id}`

### TimelineTab
- Events from `GET /api/cases/:id/timeline` ordered by timestamp
- Timeline visualisation (vertical line, event dots)
- Event types: detection (red), action (blue), escalation (amber), closure (green)
- Add event form

### PlaybookTab
- PLAYBOOKS object with per-incident-type task lists
- Checks saved to `caseData.playbook_state` (JSON) via `updateCase({playbook_state: JSON.stringify(checked)})`
- Progress bar (completed/total %)
- Milestone markers on key tasks
- Closure checklist (separate from playbook)

### AIAnalysisTab
- Shows: ai_executive_summary, ai_technical_summary, ai_severity_score, ai_severity_reasoning
- MITRE techniques list with tactic badges
- "Generate AI Analysis" button → `POST /api/cases/:id/generate-ai`
- Loading state with spinner
- Null guard: if no analysis yet, show prompt to generate

### AIChatTab
- Chat interface with message history
- System context: case data scoped to this case only
- `POST /api/cases/:id/chat` with `{message, history}`
- Messages: analyst (right-aligned), AI (left-aligned, with AegisTrace branding)

### ReportTab
- 3 download cards: PDF, DOCX, DORA
- Downloads via Axios blob (NOT `<a href>`) to carry Bearer token
- `useAuthDownload()` hook: `api.get(url, {responseType: 'blob'})` → `URL.createObjectURL`
- Report contents preview table showing which fields are populated

---

## PUBLIC PAGES

### Landing.jsx
Full-viewport hero with animated TunnelCanvas (nested squares converging to vanishing point with mouse parallax). Key sections:
1. Hero — tagline, CTA buttons (open in new tab via `window.open('/app/login', '_blank')`)
2. Stats bar — live from `GET /api/portfolio/stats`
3. AI Live Demo — public users can paste any IOC and get analysis via `POST /api/public/demo-analyse`
4. Features grid — 12 feature cards
5. How It Works — 4 steps
6. AI Models — 4 model cards
7. CTA + Footer

All "Launch App" / "Enter the platform" buttons use `window.open('/app/login', '_blank', 'noopener,noreferrer')` — opens in new tab.

Nav links: Features (smooth scroll), Live Demo (smooth scroll), How It Works (smooth scroll), Portfolio, Case Library, Agent Setup.

### AgentSetup.jsx (public, /agent-setup)
No login required. 4-tab guide: Quick Start, Background Service, What It Collects, Config Options. Direct download button for `aegistrace_agent.py` from GitHub raw.

### PublicGallery.jsx (/public)
Grid of public cases from `GET /api/public/cases`. Each card: case number, title, severity badge, incident type, date. Click → PublicCaseDetail.

### PublicCaseDetail.jsx (/public/:token)
Read-only case view using share token: `GET /api/public/:token`. Shows: all case fields, IOC table, MITRE techniques, timeline. PDF download button (auth not required for public cases — the public.py router doesn't require auth).

---

## DASHBOARD

Fetches:
- `GET /api/cases?limit=100` — for stats computation
- `GET /api/vt/history` — recent VT lookups
- `GET /api/portfolio/stats` — aggregate counts

Stat cards: Active Cases, Critical, VT Lookups, Pending Closure, Total IOCs

Main grid (2-column):
- Left: Recent Cases list (5 most recently updated)
- Right column: VT Recent (5 lookups), Pending Closure alert (if any), Quick Actions

---

## FORMS & VALIDATION PATTERN

Use `react-hook-form` + `zod` for complex forms. Simple forms use controlled state with `useState`.

Pattern for API-connected forms:
```jsx
const [loading, setLoading] = useState(false);
const handleSubmit = async () => {
  setLoading(true);
  try {
    const res = await api.post('/api/...', formData);
    addToast('Success message', 'success');
    onSuccess(res.data);
  } catch (e) {
    addToast(e.response?.data?.detail || 'Operation failed', 'error');
  } finally {
    setLoading(false);
  }
};
```

Never use `window.alert()` or `window.confirm()` except for destructive deletions.

---

## ADDING NEW FEATURES — RULES

### New page in the app:
1. Create `frontend/src/pages/app/YourPage.jsx`
2. Add route in `App.jsx` inside the `/app` route group
3. Add nav link in `Sidebar.jsx` with appropriate icon from lucide-react

### New public page:
1. Create `frontend/src/pages/YourPage.jsx`
2. Add route in `App.jsx` in the public routes section
3. Add nav link in `Landing.jsx` nav if appropriate

### New tab in CaseDetail:
1. Create `frontend/src/pages/app/CaseDetail/YourTab.jsx`
2. **Must start with:** `if (!caseData) return null;`
3. Add to `TABS` array in `CaseDetail/index.jsx`
4. Import and render in the tab content section
5. Receive `{ caseData, updateCase, reload, caseId }` props

### New backend endpoint then call it:
```js
// GET
api.get('/api/your-endpoint').then(r => setData(r.data)).catch(() => addToast('Failed', 'error'));

// POST
const res = await api.post('/api/your-endpoint', payload);

// PATCH
await api.patch(`/api/cases/${caseId}`, { field: value });

// File download (always use this pattern for authenticated downloads)
const res = await api.get('/api/reports/...', { responseType: 'blob' });
const href = URL.createObjectURL(new Blob([res.data]));
const a = document.createElement('a'); a.href = href; a.download = 'filename.pdf'; a.click();
URL.revokeObjectURL(href);
```

### Adding to the notification bell (Phase 7):
1. Bell icon goes in `AppShell.jsx` header — after search input spacer
2. `useEffect` polling `GET /api/notifications/count` every 30s
3. Red badge: `unreadCount > 0` → show count (max "9+")
4. Dropdown: `NotificationDropdown` component, absolute positioned below bell

---

## MOBILE RESPONSIVE RULES

- Sidebar: hidden on mobile (use `hidden-mobile` class)
- Mobile bottom nav: 5 icons — Home, Cases, Hunt, Endpoints, Admin
- Use `mobile-only` class for mobile-visible elements
- Grid layouts: use `repeat(auto-fit, minmax(Xpx, 1fr))` — adapts automatically
- Long forms: stack vertically on small screens using flexWrap

---

## PERFORMANCE RULES

- Never fetch all cases without a limit (`?limit=100` minimum)
- Use `useCallback` for all event handlers passed as props to prevent re-renders
- Use `useEffect` cleanup to cancel timers (autosave debouncer)
- Lazy-load heavy components if bundle gets large
- CDN fonts from Google → acceptable for portfolio use, note it requires internet

---

## SECURITY RULES (frontend)

- Never put secrets, API keys, or credentials in frontend code
- Always use the Axios `api` client for API calls (carries Bearer token automatically)
- For file downloads: ALWAYS use Axios blob download, NEVER `<a href="/api/...">` (bypasses auth)
- Don't use `dangerouslySetInnerHTML` — React escapes by default
- Store only non-sensitive session data in Zustand/localStorage (token, user name/role only)

---

## DESIGN PRINCIPLES

1. **Dark, professional, clinical** — this is a security tool, not a social app. No gradients, no shadows (except tunnel canvas). Everything is flat, dark, subtle.

2. **JetBrains Mono for technical data** — every IOC, hash, case number, API key, command, and log line MUST use JetBrains Mono.

3. **Crimson (#C0392B) for danger and action** — used for: critical severity, primary CTA buttons, active nav state, malicious verdicts. Not used for decorative purposes.

4. **Purple (#A78BFA) for AI/intel** — used for: AI features, intelligence lookups, IOC types, enrichment results.

5. **Minimal animation** — only: autosave pulse, critical pulse (blinking red bar), spinner, fadeUp entrance. No particle effects in the app shell (only on landing page canvas).

6. **Information density** — pack as much relevant information as possible per screen. Analysts work fast. Don't pad with whitespace.

7. **Consistent card pattern** — everything is `.at-card`. No arbitrary div backgrounds.

---

## COMMON GOTCHAS

- `caseData.iocs` is a **JSON string**, not an array. Always: `JSON.parse(caseData.iocs || '[]')`
- `caseData.mitre_techniques` is also a JSON string
- PlaybookTab state: read from `caseData.playbook_state` on mount, save via `updateCase`
- Case ID in URL params is a **string** (`useParams()` returns strings). Backend expects int — Axios converts automatically for path params, but `parseInt(id)` if you need to compare
- Report downloads need `{ responseType: 'blob' }` in the Axios config
- `addToast` from `useStore()` — types: 'success', 'error', 'warning' (info is not styled separately)
- `user?.role === 'admin'` for admin-only UI elements
- Backend returns `is_public: bool` — use it to show/hide public-related UI

---

## FULL FILE MAP

```
src/
├── App.jsx                            — Routes
├── api/
│   └── client.js                      — Axios instance + interceptors
├── components/
│   ├── Logo.jsx                       — AegisTrace logo SVG
│   ├── ParticleCanvas.jsx             — (unused in app, landing-only)
│   ├── SeverityBadge.jsx              — SeverityBadge, StatusBadge components
│   ├── Sidebar.jsx                    — App sidebar navigation
│   ├── Toast.jsx                      — Toast notification renderer
│   └── WireframeBackground.jsx        — (landing wireframe effect)
├── index.css                          — Design system, component classes, CSS vars
├── index.js                           — React entrypoint
├── pages/
│   ├── AgentSetup.jsx                 — Public agent setup guide
│   ├── Landing.jsx                    — Marketing landing page
│   ├── Login.jsx                      — Auth login form
│   ├── Portfolio.jsx                  — Prasanna's portfolio
│   ├── PublicCaseDetail.jsx           — Public case view (share token)
│   ├── PublicGallery.jsx              — Public case library
│   └── app/
│       ├── Admin.jsx                  — Admin panel (Users, Webhooks, System)
│       ├── AppShell.jsx               — Auth wrapper + layout shell
│       ├── AuditLog.jsx               — Live audit log
│       ├── CaseDetail/
│       │   ├── AIAnalysisTab.jsx
│       │   ├── AIChatTab.jsx
│       │   ├── IOCsTab.jsx
│       │   ├── InvestigationTab.jsx
│       │   ├── OverviewTab.jsx
│       │   ├── PlaybookTab.jsx
│       │   ├── ReportTab.jsx
│       │   ├── TerminalTab.jsx
│       │   ├── TimelineTab.jsx
│       │   └── index.jsx              — Tab router + case loader + autosave
│       ├── CaseList.jsx               — Cases list + filters + public toggle
│       ├── Dashboard.jsx              — Stat cards + recent cases
│       ├── EmailAnalysis.jsx          — Email forensics tool
│       ├── Endpoints.jsx              — Endpoint agent monitoring + setup guide modal
│       ├── LogInvestigation.jsx       — Raw log analysis tool
│       ├── MalwareTools.jsx           — Encode/decode/hash/YARA tools
│       ├── ThreatHunt.jsx             — IOC frequency + MITRE + campaigns
│       ├── ToolsHub.jsx               — External intel tools
│       └── VTLookup.jsx               — VirusTotal lookup
└── store/
    └── useStore.js                    — Zustand global store
```

---

## PROMPT FOR AI SESSIONS

When starting a new AI session to work on this frontend, paste this document and say:

> "I am extending the AegisTrace frontend. The full codebase is at ~/Documents/Claude/Projects/aegistrace. Read the design system and patterns in this prompt carefully. I want to build [feature name]. Follow all the rules in this document — use existing component classes, follow the dark theme, use JetBrains Mono for technical data, and always add null guards to CaseDetail tabs."

---

*AegisTrace Frontend — Built with React 18, Zustand, Axios, Lucide React*
*Design: dark ocean (#07080F) + crimson (#C0392B) + JetBrains Mono*
*Prasanna Kumar Surendran · Dublin · 2025-2026*
