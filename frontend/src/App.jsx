import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Toasts from './components/Toast';

// ── Loading screen for code splitting ────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#080C14',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid #4DA3FF', borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <div style={{ color: '#4DA3FF', fontSize: 13, opacity: 0.7 }}>AegisTrace</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ── Public pages (small — load eagerly) ──────────────────────────────────────
import Landing          from './pages/Landing';
import Login            from './pages/Login';

// ── Public pages (lazy loaded) ───────────────────────────────────────────────
const Mission          = lazy(() => import('./pages/Mission'));
const Portfolio        = lazy(() => import('./pages/Portfolio'));
const PublicGallery    = lazy(() => import('./pages/PublicGallery'));
const PublicCaseDetail = lazy(() => import('./pages/PublicCaseDetail'));
const AgentSetup       = lazy(() => import('./pages/AgentSetup'));

// ── App shell (lazy loaded) ───────────────────────────────────────────────────
const AppShell         = lazy(() => import('./pages/app/AppShell'));

// ── App pages (all lazy) ─────────────────────────────────────────────────────
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

export default function App() {
  return (
    <BrowserRouter>
      <Toasts />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public */}
          <Route path="/"              element={<Landing />} />
          <Route path="/mission"       element={<Mission />} />
          <Route path="/portfolio"     element={<Portfolio />} />
          <Route path="/public"        element={<PublicGallery />} />
          <Route path="/public/:token" element={<PublicCaseDetail />} />
          <Route path="/agent-setup"   element={<AgentSetup />} />
          <Route path="/app/login"     element={<Login />} />

          {/* Protected app */}
          <Route path="/app" element={<AppShell />}>
            <Route index                    element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard"         element={<Dashboard />} />
            <Route path="cases"             element={<CaseList />} />
            <Route path="cases/:id"         element={<CaseDetail />} />
            <Route path="hunt"              element={<ThreatHunt />} />
            <Route path="endpoints"         element={<Endpoints />} />
            <Route path="logs"              element={<Navigate to="/app/terminal-lab" replace />} />
            <Route path="audit"             element={<AuditLog />} />
            <Route path="vt-lookup"         element={<VTLookup />} />
            <Route path="email"             element={<EmailAnalysis />} />
            <Route path="malware"           element={<Navigate to="/app/terminal-lab" replace />} />
            <Route path="tools"             element={<ToolsHub />} />
            <Route path="public"            element={<Navigate to="/public" replace />} />
            <Route path="admin"             element={<Admin />} />
            <Route path="pcap"              element={<PcapAnalysis />} />
            <Route path="feeds"             element={<ThreatFeeds />} />
            <Route path="hardware/tools"    element={<HardwareTools />} />
            <Route path="terminal-lab"      element={<TerminalLab />} />
            <Route path="identity-graph"    element={<IdentityGraph />} />
            <Route path="itdr"              element={<ITDRPage />} />
            <Route path="analytics"         element={<Analytics />} />
            <Route path="policies"          element={<Policies />} />
            <Route path="agent-security"    element={<AgentSecurity />} />
            <Route path="connectors"        element={<ConnectorHub />} />
            <Route path="nhi-health"        element={<NHIHealth />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
