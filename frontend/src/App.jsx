import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Toasts from './components/Toast';

// Public pages
import Landing         from './pages/Landing';
import Portfolio       from './pages/Portfolio';
import PublicGallery   from './pages/PublicGallery';
import PublicCaseDetail from './pages/PublicCaseDetail';
import Login           from './pages/Login';

// App pages
import AppShell        from './pages/app/AppShell';
import Dashboard       from './pages/app/Dashboard';
import CaseList        from './pages/app/CaseList';
import CaseDetail      from './pages/app/CaseDetail/index';
import VTLookup        from './pages/app/VTLookup';
import EmailAnalysis   from './pages/app/EmailAnalysis';
import MalwareTools    from './pages/app/MalwareTools';
import ToolsHub        from './pages/app/ToolsHub';
import Admin           from './pages/app/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Toasts />
      <Routes>
        {/* Public */}
        <Route path="/"            element={<Landing />} />
        <Route path="/portfolio"   element={<Portfolio />} />
        <Route path="/public"      element={<PublicGallery />} />
        <Route path="/public/:token" element={<PublicCaseDetail />} />
        <Route path="/app/login"   element={<Login />} />

        {/* Protected app */}
        <Route path="/app" element={<AppShell />}>
          <Route index          element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="cases"      element={<CaseList />} />
          <Route path="cases/:id"  element={<CaseDetail />} />
          <Route path="vt-lookup"  element={<VTLookup />} />
          <Route path="email"      element={<EmailAnalysis />} />
          <Route path="malware"    element={<MalwareTools />} />
          <Route path="tools"      element={<ToolsHub />} />
          <Route path="public"     element={<Navigate to="/public" replace />} />
          <Route path="admin"      element={<Admin />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
