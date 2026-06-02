import React, { useState } from 'react';
import { Navigate, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { Search, Menu, LayoutDashboard, FolderOpen, Crosshair, Shield, Settings } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import useStore from '../../store/useStore';

/* Mobile bottom nav — 5 key destinations */
const MOBILE_NAV = [
  { to: '/app/dashboard', Icon: LayoutDashboard, label: 'Home'  },
  { to: '/app/cases',     Icon: FolderOpen,      label: 'Cases' },
  { to: '/app/hunt',      Icon: Crosshair,       label: 'Hunt'  },
  { to: '/app/vt-lookup', Icon: Shield,           label: 'VT'   },
  { to: '/app/admin',     Icon: Settings,        label: 'Admin' },
];

export default function AppShell() {
  const { token, user, searchQuery, setSearchQuery } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  if (!token) return <Navigate to="/app/login" replace />;

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/app/cases?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#07080F', overflow: 'hidden' }}>

      {/* Desktop sidebar */}
      <div style={{ display: 'flex' }} className="hidden-mobile">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0 }}>
            <Sidebar collapsed={false} setCollapsed={() => {}} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: -1 }}
            onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{
          background: '#0F1018',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', flexShrink: 0,
        }}>
          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(true)} className="mobile-only"
            style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 4, display: 'none' }}>
            <Menu size={18} />
          </button>

          {/* Search */}
          <div style={{ flex: 1, maxWidth: 380, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
            <input className="at-input"
              placeholder="Search cases, IOCs…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              style={{ paddingLeft: 30, fontSize: '0.8rem' }} />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#F0F0F8' }}>{user?.name}</div>
              <div style={{ fontSize: '0.62rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>{user?.role}</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#C0392B' }}>
              {user?.name?.[0] || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', background: '#07080F', paddingBottom: 60 }}>
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav style={{
          display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#0F1018', borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
        }} className="mobile-bottom-nav">
          {MOBILE_NAV.map(({ to, Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '4px 0', flex: 1, textDecoration: 'none',
              color: isActive ? '#C0392B' : '#71717A',
              fontSize: '0.6rem', fontFamily: 'JetBrains Mono',
            })}>
              {({ isActive }) => (
                <>
                  <Icon size={20} style={{ color: isActive ? '#C0392B' : '#71717A' }} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
          .mobile-only   { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
