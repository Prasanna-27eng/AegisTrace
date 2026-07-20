import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import Toasts from './components/Toast';
import PageCurtain from './components/PageTransition';
import InfiniteMenu from './components/InfiniteMenu';

function PublicLayout() {
  return (
    <>
      <InfiniteMenu />
      <Outlet />
    </>
  );
}

/* ─── Branded Suspense fallback ─────────────────────────────────────────────
   Shown during lazy-chunk loading. Matches the site's #050405 dark theme.   */
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#050405',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Gold progress bar */}
        <div style={{ width: 120, height: 1, background: 'rgba(245,240,232,0.08)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: '#F59E0B',
            animation: 'pageload-bar 1.4s cubic-bezier(0.4,0,0.2,1) infinite',
          }}/>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.22em' }}>
          AEGISTRACE
        </span>
      </div>
      <style>{`
        @keyframes pageload-bar {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/* ─── Scroll-to-top on every route change ──────────────────────────────────
   UX: navigating to a new page should start at the top, not mid-scroll.    */
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

/* ─── Public pages (all lazy — biggest UX/perf win) ────────────────────────
   Landing and Login are the most-visited so they get their own chunks but
   still lazy — Suspense fallback is fast enough to not matter.              */
const Landing          = lazy(() => import('./pages/Landing'));
const Login            = lazy(() => import('./pages/Login'));
const Platform         = lazy(() => import('./pages/Platform'));
const Tools            = lazy(() => import('./pages/Tools'));
const Mission          = lazy(() => import('./pages/Mission'));
const Portfolio        = lazy(() => import('./pages/Portfolio'));
const PublicGallery    = lazy(() => import('./pages/PublicGallery'));
const PublicCaseDetail = lazy(() => import('./pages/PublicCaseDetail'));
const AgentSetup       = lazy(() => import('./pages/AgentSetup'));
const Features         = lazy(() => import('./pages/Features'));

/* ─── App shell ─────────────────────────────────────────────────────────── */
const AppShell         = lazy(() => import('./pages/app/AppShell'));

/* ─── App pages ─────────────────────────────────────────────────────────── */
const Dashboard        = lazy(() => import('./pages/app/Dashboard'));
const CaseList         = lazy(() => import('./pages/app/CaseList'));
const CaseDetail       = lazy(() => import('./pages/app/CaseDetail/index'));
const VTLookup         = lazy(() => import('./pages/app/VTLookup'));
const EmailAnalysis    = lazy(() => import('./pages/app/EmailAnalysis'));
const ToolsHub         = lazy(() => import('./pages/app/ToolsHub'));
const Admin            = lazy(() => import('./pages/app/Admin'));
const ThreatHunt       = lazy(() => import('./pages/app/ThreatHunt'));
const AuditLog         = lazy(() => import('./pages/app/AuditLog'));
const Endpoints        = lazy(() => import('./pages/app/Endpoints'));
const PcapAnalysis     = lazy(() => import('./pages/app/PcapAnalysis'));
const ThreatFeeds      = lazy(() => import('./pages/app/ThreatFeeds'));
const HardwareTools    = lazy(() => import('./pages/app/HardwareTools'));
const TerminalLab      = lazy(() => import('./pages/app/TerminalLab'));
const IdentityGraph    = lazy(() => import('./pages/app/IdentityGraph'));
const ITDRPage         = lazy(() => import('./pages/app/ITDRPage'));
const Analytics        = lazy(() => import('./pages/app/Analytics'));
const Policies         = lazy(() => import('./pages/app/Policies'));
const AgentSecurity    = lazy(() => import('./pages/app/AgentSecurity'));
const ConnectorHub     = lazy(() => import('./pages/app/ConnectorHub'));
const NHIHealth        = lazy(() => import('./pages/app/NHIHealth'));
const ShadowAI         = lazy(() => import('./pages/app/ShadowAI'));
const ControlPlane     = lazy(() => import('./pages/app/ControlPlane'));
const SimulationHub    = lazy(() => import('./pages/app/SimulationHub'));
const DeploymentHub    = lazy(() => import('./pages/app/DeploymentHub'));
const DefenseConsole   = lazy(() => import('./pages/app/DefenseConsole'));
const Playbooks        = lazy(() => import('./pages/app/Playbooks'));
const DetectionLibrary = lazy(() => import('./pages/app/DetectionLibrary'));
const LogInvestigation = lazy(() => import('./pages/app/LogInvestigation'));
const EDRPage          = lazy(() => import('./pages/app/EDRPage'));
const MalwareTools     = lazy(() => import('./pages/app/MalwareTools'));

export default function App() {
  return (
    <BrowserRouter>
      <PageCurtain />
      <Toasts />
      <Suspense fallback={<PageLoader />}>
        <ScrollReset />
        <Routes>
          {/* ── Public (with InfiniteMenu background) ── */}
          <Route element={<PublicLayout />}>
            <Route path="/"              element={<Landing />} />
            <Route path="/platform"      element={<Platform />} />
            <Route path="/tools"         element={<Tools />} />
            <Route path="/mission"       element={<Mission />} />
            <Route path="/portfolio"     element={<Portfolio />} />
            <Route path="/public"        element={<PublicGallery />} />
            <Route path="/public/:token" element={<PublicCaseDetail />} />
            <Route path="/agent-setup"   element={<AgentSetup />} />
            <Route path="/features"      element={<Features />} />
            <Route path="/app/login"     element={<Login />} />
          </Route>

          {/* ── Protected app ── */}
          <Route path="/app" element={<AppShell />}>
            <Route index                    element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard"         element={<Dashboard />} />
            <Route path="cases"             element={<CaseList />} />
            <Route path="cases/:id"         element={<CaseDetail />} />
            <Route path="hunt"              element={<ThreatHunt />} />
            <Route path="endpoints"         element={<Endpoints />} />
            <Route path="logs"              element={<LogInvestigation />} />
            <Route path="audit"             element={<AuditLog />} />
            <Route path="vt-lookup"         element={<VTLookup />} />
            <Route path="email"             element={<EmailAnalysis />} />
            <Route path="malware"           element={<MalwareTools />} />
            <Route path="tools"             element={<ToolsHub />} />
            <Route path="public"            element={<Navigate to="/public" replace />} />
            <Route path="admin"             element={<Admin />} />
            <Route path="pcap"              element={<PcapAnalysis />} />
            <Route path="feeds"             element={<ThreatFeeds />} />
            <Route path="hardware/tools"    element={<HardwareTools />} />
            <Route path="terminal-lab"      element={<TerminalLab />} />
            <Route path="identity-graph"    element={<IdentityGraph />} />
            <Route path="itdr"              element={<ITDRPage />} />
            <Route path="edr"               element={<EDRPage />} />
            <Route path="analytics"         element={<Analytics />} />
            <Route path="policies"          element={<Policies />} />
            <Route path="agent-security"    element={<AgentSecurity />} />
            <Route path="connectors"        element={<ConnectorHub />} />
            <Route path="nhi-health"        element={<NHIHealth />} />
            <Route path="shadow-ai"         element={<ShadowAI />} />
            <Route path="control-plane"     element={<ControlPlane />} />
            <Route path="simulation"        element={<SimulationHub />} />
            <Route path="deploy"            element={<DeploymentHub />} />
            <Route path="defense-console"   element={<DefenseConsole />} />
            <Route path="playbooks"         element={<Playbooks />} />
            <Route path="detections"        element={<DetectionLibrary />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
