import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { Search, Menu, LayoutDashboard, FolderOpen, Crosshair, Monitor, Settings, ChevronDown, LogOut, Home, ArrowLeft, X, Keyboard, Bell } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import CommandPalette from '../../components/CommandPalette';
import useStore from '../../store/useStore';
import api from '../../api/client';
import useSSE from '../../hooks/useSSE';

const ALERT_LABELS = {
  honey_token_access: 'Honey Token Accessed', suspicious_process: 'Suspicious Process',
  fim_change: 'File Integrity Change', failed_login: 'Failed Login (burst)', yara_match: 'YARA Match',
  dga_domain: 'DGA Domain Detected', suspicious_port: 'Suspicious Port', privilege_escalation: 'Privilege Escalation',
  user_management: 'User Account Changed', suspicious_lineage: 'Suspicious Process Chain',
};

const MOBILE_NAV = [
  { to: '/app/dashboard', Icon: LayoutDashboard, label: 'Home'      },
  { to: '/app/cases',     Icon: FolderOpen,      label: 'Cases'     },
  { to: '/app/hunt',      Icon: Crosshair,       label: 'Hunt'      },
  { to: '/app/endpoints', Icon: Monitor,         label: 'Endpoints' },
  { to: '/app/admin',     Icon: Settings,        label: 'Admin'     },
];

const SHORTCUTS = [
  { keys: ['⌘K'],      label: 'Open command palette',    section: 'Global'     },
  { keys: ['?'],       label: 'Show keyboard shortcuts',  section: 'Global'     },
  { keys: ['Esc'],     label: 'Close panel / dialog',     section: 'Global'     },
  { keys: ['G', 'D'],  label: 'Go to Dashboard',          section: 'Navigation' },
  { keys: ['G', 'C'],  label: 'Go to Cases',              section: 'Navigation' },
  { keys: ['G', 'H'],  label: 'Go to Threat Hunt',        section: 'Navigation' },
  { keys: ['G', 'A'],  label: 'Go to Analytics',          section: 'Navigation' },
  { keys: ['N'],       label: 'New Case',                  section: 'Cases'      },
];

function KBD({ children }) {
  return (
    <kbd style={{ fontSize: '0.65rem', color: '#EBEBEB', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 4, padding: '2px 7px', fontFamily: 'JetBrains Mono' }}>
      {children}
    </kbd>
  );
}

function ShortcutsPanel({ onClose }) {
  const sections = [...new Set(SHORTCUTS.map(s => s.section))];
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '24px 28px', maxWidth: 460, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', animation: 'at-dd-in 0.15s ease' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Keyboard size={15} style={{ color: '#5A8A9F' }} />
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#EBEBEB', margin: 0 }}>Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#686868', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#EBEBEB'}
            onMouseLeave={e => e.currentTarget.style.color = '#686868'}>
            <X size={15} />
          </button>
        </div>

        {sections.map(section => (
          <div key={section} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: '0.58rem', color: '#505050', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>
              {section}
            </div>
            {SHORTCUTS.filter(s => s.section === section).map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.8rem', color: '#A8A8A8' }}>{s.label}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {s.keys.map((k, i) => (
                    <React.Fragment key={k}>
                      {i > 0 && <span style={{ fontSize: '0.6rem', color: '#505050', fontFamily: 'JetBrains Mono' }}>then</span>}
                      <KBD>{k}</KBD>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 4, fontSize: '0.68rem', color: '#505050', fontFamily: 'JetBrains Mono', textAlign: 'center' }}>
          Shortcuts are disabled when typing in an input field.
        </div>
      </div>
    </div>
  );
}

const isTyping = () => {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
};

export default function AppShell() {
  const { token, user, searchQuery, setSearchQuery, logout, addToast } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentCases, setRecentCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [flashId, setFlashId] = useState(null);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const gKeyRef = useRef(false);
  const gTimeoutRef = useRef(null);

  if (!token) return <Navigate to="/app/login" replace />;

  // Global incident stream — toast + notification bell
  useSSE('/api/ingest/stream/global-alerts', useCallback((alert) => {
    const label = ALERT_LABELS[alert.alert_type] || alert.alert_type?.replace(/_/g, ' ') || 'Alert';
    const type  = alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'success';
    addToast(`${alert.hostname}: ${label}`, type);
    setNotifications(prev => [{
      id:          alert.id,
      label,
      severity:    alert.severity,
      hostname:    alert.hostname,
      detected_at: alert.detected_at,
    }, ...prev].slice(0, 20));
    setUnreadCount(c => c + 1);
    setFlashId(alert.id);
    setTimeout(() => setFlashId(id => id === alert.id ? null : id), 1200);
  }, [addToast]));

  // Close bell on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const fn = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [bellOpen]);

  useEffect(() => {
    api.get('/api/cases?limit=10').then(r => setRecentCases(r.data)).catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      // Always handle Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }

      if (isTyping()) return;

      // ? → show shortcuts panel
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(o => !o);
        return;
      }

      // N → new case
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        api.post('/api/cases', { title: 'New Investigation', severity: 'medium', analyst_name: user?.name || 'Analyst' })
          .then(r => navigate(`/app/cases/${r.data.id}`))
          .catch(() => addToast('Failed to create case', 'error'));
        return;
      }

      // G sequence — go-to shortcuts (G then D/C/H/A)
      if (e.key === 'g' || e.key === 'G') {
        gKeyRef.current = true;
        clearTimeout(gTimeoutRef.current);
        gTimeoutRef.current = setTimeout(() => { gKeyRef.current = false; }, 1200);
        return;
      }

      if (gKeyRef.current) {
        gKeyRef.current = false;
        clearTimeout(gTimeoutRef.current);
        const key = e.key.toLowerCase();
        if (key === 'd') { navigate('/app/dashboard'); }
        if (key === 'c') { navigate('/app/cases'); }
        if (key === 'h') { navigate('/app/hunt'); }
        if (key === 'a') { navigate('/app/analytics'); }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(gTimeoutRef.current); };
  }, [navigate, user, addToast]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/app/cases?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const canGoBack = window.history.length > 1;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        recentCases={recentCases}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {shortcutsOpen && <ShortcutsPanel onClose={() => setShortcutsOpen(false)} />}

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
            style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer', padding: 4, display: 'none' }}>
            <Menu size={18} />
          </button>

          {/* Back button */}
          {canGoBack && (
            <button onClick={() => navigate(-1)}
              title="Go back"
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '5px 9px', cursor: 'pointer', color: '#787878', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#EBEBEB'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#787878'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
              <ArrowLeft size={14} />
            </button>
          )}

          {/* Search bar with Cmd+K hint */}
          <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#787878' }} />
            <input className="at-input"
              placeholder="Search cases…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              style={{ paddingLeft: 30, paddingRight: 58, fontSize: '0.8rem' }} />
            <button
              onClick={() => setPaletteOpen(true)}
              title={`Command palette (${isMac ? '⌘' : 'Ctrl'}+K)`}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', fontSize: '0.58rem', color: '#787878', fontFamily: 'JetBrains Mono', letterSpacing: 0, lineHeight: 1.8 }}>
              {isMac ? '⌘K' : 'Ctrl K'}
            </button>
          </div>

          {/* Shortcuts hint button */}
          <button
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#686868', display: 'flex', alignItems: 'center', transition: 'all 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#EBEBEB'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#686868'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <Keyboard size={14} />
          </button>

          {/* Notification bell */}
          <div ref={bellRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => { setBellOpen(o => !o); if (!bellOpen) setUnreadCount(0); }}
              title="Alerts"
              style={{ background: unreadCount > 0 ? 'rgba(239,68,68,0.08)' : 'none', border: `1px solid ${unreadCount > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: unreadCount > 0 ? '#EF4444' : '#686868', display: 'flex', alignItems: 'center', transition: 'all 0.15s', position: 'relative' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = unreadCount > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = unreadCount > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'; }}
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: '#fff', borderRadius: '50%', fontSize: '0.55rem', fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono,monospace', padding: '0 3px', lineHeight: 1 }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="dropdown-pop" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340, background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 200, overflow: 'hidden', transformOrigin: 'top right' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#EBEBEB' }}>Recent Alerts</span>
                  <button onClick={() => { setNotifications([]); setBellOpen(false); }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.68rem', fontFamily: 'JetBrains Mono,monospace' }}>Clear all</button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#555', fontSize: '0.78rem' }}>No recent alerts</div>
                ) : (
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.map((n, i) => {
                      const sevColor = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#22C55E' }[n.severity] || '#787878';
                      const ts = n.detected_at ? new Date(n.detected_at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}) : '';
                      return (
                        <div key={n.id || i} className={n.id === flashId ? 'signal-flash' : undefined} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sevColor, flexShrink: 0, marginTop: 5 }}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.76rem', color: '#EBEBEB', fontWeight: 500, marginBottom: 2 }}>{n.label}</div>
                            <div style={{ fontSize: '0.65rem', color: '#787878', fontFamily: 'JetBrains Mono,monospace' }}>{n.hostname} · {ts}</div>
                          </div>
                          <span style={{ fontSize: '0.58rem', color: sevColor, background: `${sevColor}14`, padding: '1px 6px', borderRadius: 3, fontFamily: 'JetBrains Mono,monospace', textTransform: 'uppercase', flexShrink: 0 }}>{n.severity}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div ref={dropdownRef} style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: dropdownOpen ? 'rgba(90,138,159,0.08)' : 'none', border: '1px solid ' + (dropdownOpen ? 'rgba(90,138,159,0.2)' : 'transparent'), borderRadius: 8, padding: '4px 8px 4px 10px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'none'; }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#EBEBEB' }}>{user?.name}</div>
                <div style={{ fontSize: '0.62rem', color: '#787878', fontFamily: 'JetBrains Mono' }}>{user?.role}</div>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(90,138,159,0.15)', border: '1px solid rgba(90,138,159,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#60A5FA', flexShrink: 0 }}>
                {user?.name?.[0] || 'A'}
              </div>
              <ChevronDown size={12} style={{ color: '#787878', transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {dropdownOpen && (
              <div className="dropdown-pop" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, minWidth: 190, zIndex: 300, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', transformOrigin: 'top right' }}>
                {[
                  { Icon: Home,     label: 'Back to Home',  action: () => { navigate('/');          setDropdownOpen(false); }, color: 'rgba(240,240,248,0.7)' },
                  { Icon: Settings, label: 'Settings',       action: () => { navigate('/app/admin'); setDropdownOpen(false); }, color: 'rgba(240,240,248,0.7)' },
                  { Icon: Keyboard, label: 'Keyboard Shortcuts', action: () => { setShortcutsOpen(true); setDropdownOpen(false); }, color: 'rgba(240,240,248,0.7)' },
                ].map(({ Icon, label, action, color }) => (
                  <button key={label} onClick={action} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', borderRadius: 7, padding: '9px 12px', fontSize: '0.8rem', color, cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <Icon size={14} style={{ flexShrink: 0, opacity: 0.7 }} />{label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />
                <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', borderRadius: 7, padding: '9px 12px', fontSize: '0.8rem', color: '#EF4444', cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <LogOut size={14} style={{ flexShrink: 0 }} /> Sign Out
                </button>
              </div>
            )}
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
        @keyframes at-dd-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
