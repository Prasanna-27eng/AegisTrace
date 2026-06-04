import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Toasts from './components/Toast';

import Landing          from './pages/Landing';
import Mission          from './pages/Mission';
import Portfolio        from './pages/Portfolio';
import PublicGallery    from './pages/PublicGallery';
import PublicCaseDetail from './pages/PublicCaseDetail';
import AgentSetup       from './pages/AgentSetup';
import Login            from './pages/Login';

import AppShell         from './pages/app/AppShell';
import Dashboard        from './pages/app/Dashboard';
import CaseList         from './pages/app/CaseList';
import CaseDetail       from './pages/app/CaseDetail/index';
import VTLookup         from './pages/app/VTLookup';
import EmailAnalysis    from './pages/app/EmailAnalysis';
import MalwareTools     from './pages/app/MalwareTools';
import ToolsHub         from './pages/app/ToolsHub';
import Admin            from './pages/app/Admin';
import ThreatHunt       from './pages/app/ThreatHunt';
import AuditLog         from './pages/app/AuditLog';
import Endpoints        from './pages/app/Endpoints';
import LogInvestigation from './pages/app/LogInvestigation';
import EDRPage          from './pages/app/EDRPage';
import PcapAnalysis     from './pages/app/PcapAnalysis';
import ThreatFeeds      from './pages/app/ThreatFeeds';
import HardwareTools    from './pages/app/HardwareTools';
import ToolResult       from './pages/app/ToolResult';
import TerminalLab      from './pages/app/TerminalLab';
import IdentityGraph    from './pages/app/IdentityGraph';

export default function App() {
  return (
    <BrowserRouter>
      <Toasts />
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
          <Route index              element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="cases"       element={<CaseList />} />
          <Route path="cases/:id"   element={<CaseDetail />} />
          <Route path="hunt"        element={<ThreatHunt />} />
          <Route path="endpoints"   element={<Endpoints />} />
          <Route path="logs"        element={<LogInvestigation />} />
          <Route path="audit"       element={<AuditLog />} />
          <Route path="vt-lookup"   element={<VTLookup />} />
          <Route path="email"       element={<EmailAnalysis />} />
          <Route path="malware"     element={<MalwareTools />} />
          <Route path="tools"       element={<ToolsHub />} />
          <Route path="public"      element={<Navigate to="/public" replace />} />
          <Route path="admin"       element={<Admin />} />
          <Route path="edr/:caseId" element={<EDRPage />} />
          <Route path="pcap"        element={<PcapAnalysis />} />
          <Route path="feeds"             element={<ThreatFeeds />} />
          <Route path="hardware/tools"    element={<HardwareTools />} />
          <Route path="terminal-lab"      element={<TerminalLab />} />
          <Route path="identity-graph"    element={<IdentityGraph />} />
        </Route>

        <Route path="/app/hardware/tools/:runId" element={<ToolResult />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
