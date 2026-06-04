import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { Search, Menu, LayoutDashboard, FolderOpen, Crosshair, Monitor, Settings } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import CommandPalette from '../../components/CommandPalette';
import useStore from '../../store/useStore';
import api from '../../api/client';

const MOBILE_NAV = [
  { to: '/app/dashboard', Icon: LayoutDashboard, label: 'Home'      },
  { to: '/app/cases',     Icon: FolderOpen,      label: 'Cases'     },
  { to: '/app/hunt',      Icon: Crosshair,       label: 'Hunt'      },
  { to: '/app/endpoints', Icon: Monitor,         label: 'Endpoints' },
  { to: '/app/admin',     Icon: Settings,        label: 'Admin'     },
];

export default function AppShell() {
  const { token, user, searchQuery, setSearchQuery } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentCases, setRecentCases] = useState([]);
  const navigate = useNavigate();

  if (!token) return <Navigate to="/app/login" replace />;

  useEffect(() => {
    api.get('/api/cases?limit=10').then(r => setRecentCases(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/app/cases?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} recentCases={recentCases} />

      <div style={{ display: 'flex' }} className="hidden-mobile">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0 }}>
            <Sidebar collapsed={false} setCollapsed={() => {}} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: -1 }}
            onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', flexShrink: 0 }}>
          <button onClick={() => setMobileOpen(true)} className="mobile-only"
            style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 4, display: 'none' }}>
            <Menu size={18} />
          </button>

          {/* Search bar with Cmd+K hint */}
          <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
            <input className="at-input"
              placeholder="Search cases…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              style={{ paddingLeft: 30, paddingRight: 58, fontSize: '0.8rem' }} />
            <button
              onClick={() => setPaletteOpen(true)}
              title={`Command palette (${isMac ? '⌘' : 'Ctrl'}+K)`}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: '0.58rem', color: '#71717A', fontFamily: 'JetBrains Mono', letterSpacing: 0, lineHeight: 1.8 }}>
              {isMac ? '⌘K' : 'Ctrl K'}
            </button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#F0F0F8' }}>{user?.name}</div>
              <div style={{ fontSize: '0.62rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>{user?.role}</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#60A5FA', flexShrink: 0 }}>
              {user?.name?.[0] || 'A'}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', paddingBottom: 60 }}>
          <Outlet />
        </main>

        <nav style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '8px 0 max(8px, env(safe-area-inset-bottom))' }} className="mobile-bottom-nav">
          {MOBILE_NAV.map(({ to, Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', flex: 1, textDecoration: 'none', color: isActive ? '#60A5FA' : 'var(--text-muted)', fontSize: '0.6rem', fontFamily: 'JetBrains Mono' })}>
              {({ isActive }) => (<><Icon size={20} style={{ color: isActive ? '#60A5FA' : 'var(--text-muted)' }} /><span>{label}</span></>)}
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
