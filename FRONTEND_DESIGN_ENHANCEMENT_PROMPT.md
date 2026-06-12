# AegisTrace — Frontend Design Enhancement Brief

Paste this whole file to Claude at the start of a new session to drive a focused
design-enhancement pass on the AegisTrace frontend (`frontend/src/`). It contains
everything Claude needs: current state, design tokens, constraints, and the ask.

---

## 1. What AegisTrace is

AegisTrace is an AI-powered security operations platform (SOC case management,
ITDR, threat hunting, SOAR playbooks, endpoint defense, identity graph, etc.).
The frontend is React (CRA, react-router, framer-motion, zustand, lucide-react,
axios) with **inline styles only — no Tailwind, no CSS modules, no new npm
packages without approval**. Global tokens/utility classes live in
`frontend/src/index.css`.

The frontend splits into two visually distinct worlds that currently do **not**
share a design language:

1. **Public marketing site** — `Landing.jsx`, `Mission.jsx`, `Portfolio.jsx`,
   `Login.jsx` (and the public case gallery pages). Cinematic, premium,
   amber/gold "Void Core" editorial design, built specifically to look like a
   $2000 agency build.
2. **The app itself** — `pages/app/*` (30+ pages behind `AppShell.jsx`/
   `Sidebar.jsx`). A dense, functional, pure-black SOC tool with a muted
   teal/cyan accent — utilitarian, data-table-heavy, no cinematic treatment.

---

## 2. Current design system — Public pages

**Tokens** (defined inline per-page, not in `index.css`):
- Accent gold: `#F59E0B` (hover `#FBBF24`)
- Background: `#050405` (near-black), elevated sections `#060507`
- Text: `#F5F0E8` (warm white), subdued `rgba(245,240,232,0.4-0.6)`
- Emil ease: `[0.16, 1, 0.3, 1]` — expo ease-out everywhere, no bounce, no ease-in

**Fonts** (Fontshare CDN, imported in `index.css` line 1):
- `Clash Display` (`.cd`) — headings, display, brand
- `Cabinet Grotesk` (`.cg`) — body, nav, labels
- `JetBrains Mono` (`.mono`) — data, step numbers, badges

**Shared building blocks** (re-implemented per-page, not extracted to a shared
component yet):
- `TiltCard` — `perspective(900px)` + mouse-tracked `rotateX/Y` (±10-12°),
  `translateZ(6px)` on hover. Used in `Landing.jsx:60-83` and
  `Portfolio.jsx:15-39`.
- `Reveal` — `framer-motion` `useInView` fade/slide-up on scroll, `once: true`,
  `margin: '-70px'`, duration ~0.85s with the Emil ease.
- `Counter` — animated number count-up on scroll-into-view
  (`Landing.jsx:140-159`, `Portfolio.jsx:41-61`).
- `.gold-btn` / `.ghost-btn` / `.nav-link` — defined per-page in a `<style>`
  block (e.g. `Landing.jsx:212-239`).
- Ken Burns hero backgrounds (`@keyframes kenburns`, scale 1.06→1.0, 20s),
  scanline sweep, ripple rings, particle canvas (amber dots + connecting
  lines on Landing hero).

**Page-specific worlds:**
- **Landing** (`Landing.jsx`, 546 lines) — full-bleed Ken-Burns hero over
  `/assets/pages/mainwebpage.jpg`, particle network, trust ticker (marquee),
  17-module capability grid (`ModuleCard`, 1px gap "seam" grid), 4-step "how
  it works" rail, animated stats row, "built for" 3-col grid, CTA with ripple
  rings, footer.
- **Mission** (`Mission.jsx`, 582 lines) — scroll-parallax hero
  (`useScroll`/`useTransform`) over `mission page .jpg`, origin story,
  problem statement, "how it's different", "who is it for", principles grid,
  roadmap (v1/v2/v3 `RoadItem`s with done/active states), CTA, footer.
- **Portfolio** (`Portfolio.jsx`, 601 lines) — pure editorial, **no background
  image**. Clash Display name at up to 88px, left-label/right-content grid,
  skill tags (not progress bars), asymmetric project grid (1 flagship +
  3 smaller via `ProjectCard`), experience, `CertChip` grid, education, CTA,
  footer.
- **Login** (`Login.jsx`, 476 lines) — "Event Horizon": `login page.jpg` at
  72% dark overlay, mouse-parallax background (22px X / 16px Y, 0.06 lerp),
  frosted glass card (`backdrop-filter: blur(24px)`), zero decoration.

**House rules already established (do not violate):**
- No border-left accent stripes
- No gradient text (`background-clip: text`)
- No identical/repetitive card grids — each section gets its own layout idea
- No uppercase eyebrow label on every section
- No progress bars for skills
- No constellation/particle backgrounds outside the Landing hero
- WCAG AA contrast throughout
- `@media (prefers-reduced-motion: reduce)` already handled

---

## 3. Current design system — App frontend (`pages/app/*`)

**Tokens** — `frontend/src/index.css:6-75`, "Black Edition v4.0":
- Backgrounds: `--bg:#000`, `--surface:#080808`, `--card:#101010`,
  `--card-hover:#161616`, `--elevated:#1A1A1A`, `--inset:#050505`
- Accent (primary): `--accent:#4E7A8E` (muted teal), `--accent-light:#7AABB5`,
  `--accent-hover:#3D6B7C`, soft/border/glow variants
- Secondary accent (`--accent2`): `#7AABB5` / `#8FAFC0` — "AI/Intelligence"
- Status: `--success:#4BE38A`, `--warning:#F5B84B`, `--error:#FF667C`,
  `--info:#5A8A9F`
- Text: `--text-primary:#EBEBEB`, `--text-secondary:#A8A8A8`,
  `--text-muted:#686868`, `--text-disabled:#383838`
- Borders: `rgba(255,255,255,0.08 / 0.13 / 0.20)`
- Font: `Inter` for UI/body, `JetBrains Mono` for all data/metadata/badges —
  **no Clash Display / Cabinet Grotesk in the app** (those are public-page only)
- Radii: `0.375rem` → `1rem`; transitions `150/200/350ms cubic-bezier(0.4,0,0.2,1)`
  (note: **not** the Emil ease used on public pages)

**Shared utility classes** (`index.css:230-570`): `.at-card` (glass card,
`backdrop-filter: blur(8px)`, hover border `rgba(99,102,241,0.18)` — note this
hover tint is indigo/violet, inconsistent with the teal accent elsewhere),
`.btn-accent` / `.btn-ghost` / `.btn-danger`, `.at-input` / `.at-textarea` /
`.at-select` / `.at-label`, `.sidebar-item`, `.tab-btn`, `.badge` +
`.sev-*` / `.status-*` severity/status badges, `.ioc-pill`, `.section-label`,
`.skeleton` loading pulse, responsive overrides for ≤768px/≤480px via
attribute selectors on inline `style` strings (fragile but functional).

**Shell structure** (`AppShell.jsx` + `Sidebar.jsx`):
- Fixed-width sidebar (220px expanded / 56px collapsed), 7 nav groups
  (Control, Investigation, Intelligence, Identity & Trust, Lab, Hardware,
  System) — `Sidebar.jsx:13-75`. Group labels are tiny uppercase JetBrains
  Mono at 0.58rem.
- Header bar: back button, search input with `⌘K` command-palette hint,
  shortcuts button, notification bell with dropdown, user dropdown
  (`AppShell.jsx:253-384`).
- Mobile: hidden sidebar + bottom tab bar (`MOBILE_NAV`, 5 items).

**Typical page anatomy** (e.g. `Dashboard.jsx`): `StatTile` cards using
`.at-card` with a label/icon row + large JetBrains Mono value + colored
sub-line; list rows like `AttentionRow` with hover background change and a
2px left accent bar for critical severity; `SeverityBadge`/`StatusBadge`
components; everything is data-dense, grid-based, minimal motion (mostly
`fade-up` 0.4s on mount, `criticalPulse` for urgent items).

**Animation library** — `index.css:109-200` "Void Core — Kinetic Library v1.0":
`compileText`, `laserScanReveal`, `horizonCollapse`, `fadeUp`, `hexRipple`,
`ghostIn` — all built but **mostly unused inside `pages/app/*`** (they were
designed for the public pages' predecessor and the kinetic feel hasn't been
carried into the app).

---

## 4. The gap (why this enhancement matters)

The public site (Landing/Mission/Portfolio/Login) reads as a premium,
intentional, cinematic product. The moment a user logs in, they land in
`AppShell` and the experience drops to a generic dark-mode admin template:
flat `.at-card` grids, no signature motion, an accent color (`#4E7A8E` muted
teal) that has no relationship to the gold (`#F59E0B`) identity established on
the public site, and an `.at-card:hover` border tint (`rgba(99,102,241,0.18)`
indigo) that doesn't match either accent. With 30+ pages built on the same few
primitives (`.at-card`, `StatTile`, tab bars, tables), small, systemic
improvements to those shared primitives and tokens propagate everywhere.

---

## 5. The ask

Do a design-enhancement pass on the app frontend (`pages/app/*` +
`AppShell.jsx` + `Sidebar.jsx` + shared components in `components/`), with the
public pages as the quality bar — **without turning the SOC tool into a
marketing page**. Specifically:

1. **Audit first.** Read `index.css`, `AppShell.jsx`, `Sidebar.jsx`,
   `Dashboard.jsx`, `CaseList.jsx`, and 2-3 more representative app pages
   (pick ones with tables, forms, and charts). Identify concrete
   inconsistencies: color drift (the indigo `.at-card:hover` border vs. teal
   accent), inconsistent spacing/radius usage, dead/unused animation classes,
   weak empty/loading/error states, and any accessibility gaps (contrast,
   focus rings, reduced-motion coverage for app-only animations).

2. **Propose a refreshed but compatible token set.** Keep the pure-black
   foundation (`--bg`, `--surface`, `--card`, etc.) — it works and is recent
   (v5.1). Resolve the accent inconsistency: either commit to the muted teal
   (`#4E7A8E`/`#5A8A9F`/`#7AABB5`) everywhere and remove the stray indigo
   hover tint, or deliberately bridge to the public site's gold as a sparing
   "signal" color (e.g., for AI-generated content, critical alerts, or primary
   CTAs only) — recommend one and justify it. Don't introduce a third unrelated
   hue.

3. **Elevate the shared primitives**, since they're reused across 30+ pages:
   - `.at-card` — hover/focus states, subtle depth (shadow layering already
     defined in `--shadow-*`, use it more), consistent border-radius scale.
   - `StatTile` / `AttentionRow` style components — consider extracting a
     shared `components/StatTile.jsx` if the same pattern is duplicated
     across pages (check first).
   - Empty states, loading skeletons (`.skeleton` exists — is it used
     consistently?), and error states — give these a deliberate, branded look
     instead of bare text.
   - Tab bars (`.tab-btn`), badges, and table row styling — tighten
     consistency of hover/active treatments.

4. **Bring intentional motion into the app, sparingly.** The "Void Core"
   library (`compileText`, `laserScanReveal`, `fadeUp`, `hexRipple`) already
   exists in `index.css` but is barely used in `pages/app/*`. Decide where
   motion earns its place in a data-dense SOC tool (e.g., page-mount reveal
   for primary content, a subtle pulse for new real-time events arriving via
   SSE, a polished transition for the command palette / notification bell) —
   and where it should stay absent (tables, forms — keep these snappy).
   Respect the existing `prefers-reduced-motion` block.

5. **Sidebar & header polish.** `Sidebar.jsx` has 7 dense nav groups with tiny
   labels — consider improving the active-state treatment, group dividers, or
   collapsed-state tooltips/icons-only legibility. The header
   (`AppShell.jsx:253-384`) has a lot of stacked controls (search, shortcuts,
   bell, user menu) — check spacing/alignment consistency, especially at the
   ≥768px/≤768px breakpoint.

6. **Don't touch the public pages' design system** (Landing/Mission/
   Portfolio/Login are recently finished and intentional — see Section 2's
   "house rules"). If you find genuinely reusable patterns from the public
   pages (e.g., the `Reveal` scroll-in helper, `TiltCard`) that would benefit
   the app without breaking its functional character, you may port a
   simplified version — but the app should feel like a *sibling* to the public
   site, not a clone of it.

---

## 6. Constraints (non-negotiable)

- **Inline styles only** — no Tailwind, no CSS modules, no styled-components.
  Shared rules go in `frontend/src/index.css` as utility classes (existing
  pattern: `.at-card`, `.btn-accent`, etc.).
- **No new npm packages** without explicit approval — current deps: react,
  react-dom, react-router-dom, axios, zustand, lucide-react, framer-motion,
  react-scripts.
- **All 30+ app pages must keep working** — this is primarily a *systemic*
  change (tokens + shared primitives in `index.css` + `AppShell`/`Sidebar`),
  not a rewrite of every page. Touch individual pages only where it
  demonstrates the new patterns or fixes a glaring inconsistency.
- **WCAG AA contrast** and existing `prefers-reduced-motion` support must be
  preserved/extended, not regressed.
- **Mobile responsiveness** — `index.css:511-543` already has breakpoint
  overrides keyed off inline `style` attribute selectors; keep this working or
  improve it, don't remove coverage.
- **Verify with a real build and browser check** — run `npm run build` (or
  `CI=true npm run build`) for compile errors, then start the dev server and
  click through Dashboard, Cases, one detail page, and the Sidebar
  collapsed/expanded states in a browser before calling this done.

---

## 7. Suggested order of operations

1. Audit pass (read-only) → short written findings (color drift, dead CSS,
   inconsistent spacing/radius, accessibility gaps).
2. Propose the token/accent decision from item 2 above — get sign-off before
   touching 30 files.
3. Update `index.css` shared primitives (`.at-card`, badges, skeletons, tab
   bars, buttons) — this alone improves every page.
4. Polish `AppShell.jsx` + `Sidebar.jsx`.
5. Apply the new patterns to 2-3 representative pages (Dashboard, Cases list,
   one detail/tab-heavy page) as a reference implementation.
6. Build + browser-test; then decide with the user whether to roll the pattern
   out further.
