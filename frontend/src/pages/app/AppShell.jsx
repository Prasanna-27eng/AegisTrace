import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import useStore from '../../store/useStore';

export default function AppShell() {
  const { token, user, searchQuery, setSearchQuery } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const isMobile = window.innerWidth < 768;

  if (!token) return <Navigate to="/app/login" replace />;

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/app/cases?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#07080F', overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex" style={{ display: 'flex' }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.6)' }} onClick={() => setMobileOpen(false)} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0 }}>
            <Sidebar collapsed={false} setCollapsed={() => {}} />
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          background: '#0F1018',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setMobileOpen(true)}
            style={{ display: 'none', background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 4 }}
            className="mobile-menu-btn"
          >
            <Menu size={18} />
          </button>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
            <input
              className="at-input"
              placeholder="Search cases, IOCs, hashes…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              style={{ paddingLeft: 32, fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#F0F0F8' }}>{user?.name}</div>
              <div style={{ fontSize: '0.65rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>{user?.role}</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#C0392B' }}>
              {user?.name?.[0] || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', background: '#07080F' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
