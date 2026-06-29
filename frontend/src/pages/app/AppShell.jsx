/**
 * AppShell v3 — Minimalist Dock UI
 * Layout: fullscreen MagicRings background → floating glass topbar → content → bottom Dock
 * No sidebar. All navigation lives in the Dock.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import {
  Search, Keyboard, Bell, X, LogOut, Settings, Home,
  LayoutDashboard, Radio, BarChart3,
  FolderOpen, Crosshair, Share2, Monitor, Mail, Rss,
  Radar, ShieldAlert, ScanEye, BookOpen,
  Plug, KeyRound, FlaskConical, Wrench, Download,
  Settings2, ScrollText, Lock, ClipboardList,
  Command,
} from '../../components/icons';
import CommandPalette from '../../components/CommandPalette';
import Dock from '../../components/Dock';
import MagicRings from '../../components/MagicRings';
import useStore from '../../store/useStore';
import api from '../../api/client';
import useSSE from '../../hooks/useSSE';

/* ─── Alert metadata ────────────────────────────────────────────────────── */
const ALERT_LABELS = {
  honey_token_access: 'Honey Token Accessed', suspicious_process: 'Suspicious Process',
  fim_change: 'File Integrity Change', failed_login: 'Failed Login (burst)', yara_match: 'YARA Match',
  dga_domain: 'DGA Domain Detected', suspicious_port: 'Suspicious Port',
  privilege_escalation: 'Privilege Escalation', user_management: 'User Account Changed',
  suspicious_lineage: 'Suspicious Process Chain',
};

/* ─── Dock navigation groups ────────────────────────────────────────────── */
const iconStyle = { width: 20, height: 20 };

const DOCK_GROUPS = [
  // Core
  [
    { to: '/app/dashboard',      label: 'Dashboard',      icon: <LayoutDashboard style={iconStyle} /> },
    { to: '/app/analytics',      label: 'Analytics',      icon: <BarChart3       style={iconStyle} /> },
    { to: '/app/control-plane',  label: 'Control Plane',  icon: <Radio           style={iconStyle} /> },
  ],
  // Threat Management
  [
    { to: '/app/cases',          label: 'Cases',          icon: <FolderOpen  style={iconStyle} /> },
    { to: '/app/hunt',           label: 'Threat Hunt',    icon: <Crosshair   style={iconStyle} /> },
    { to: '/app/identity-graph', label: 'Identity Graph', icon: <Share2      style={iconStyle} /> },
    { to: '/app/endpoints',      label: 'Endpoints',      icon: <Monitor     style={iconStyle} /> },
    { to: '/app/email',          label: 'Email Analysis', icon: <Mail        style={iconStyle} /> },
    { to: '/app/feeds',          label: 'Threat Feeds',   icon: <Rss         style={iconStyle} /> },
  ],
  // Detection
  [
    { to: '/app/itdr',           label: 'ITDR',           icon: <Radar       style={iconStyle} /> },
    { to: '/app/defense-console',label: 'AI Defense',     icon: <ShieldAlert style={iconStyle} /> },
    { to: '/app/shadow-ai',      label: 'Shadow AI',      icon: <ScanEye     style={iconStyle} /> },
    { to: '/app/playbooks',      label: 'Playbooks',      icon: <BookOpen    style={iconStyle} /> },
  ],
  // Platform
  [
    { to: '/app/connectors',     label: 'Connectors',     icon: <Plug        style={iconStyle} /> },
    { to: '/app/nhi-health',     label: 'NHI Health',     icon: <KeyRound    style={iconStyle} /> },
    { to: '/app/simulation',     label: 'Simulation',     icon: <FlaskConical style={iconStyle} /> },
    { to: '/app/tools',          label: 'Tools Hub',      icon: <Wrench      style={iconStyle} /> },
    { to: '/app/deploy',         label: 'Deploy',         icon: <Download    style={iconStyle} /> },
  ],
  // Settings
  [
    { to: '/app/admin',          label: 'Admin',          icon: <Settings2   style={iconStyle} /> },
    { to: '/app/policies',       label: 'Policies',       icon: <ClipboardList style={iconStyle} /> },
    { to: '/app/agent-security', label: 'Agent Security', icon: <Lock        style={iconStyle} /> },
    { to: '/app/audit',          label: 'Audit Log',      icon: <ScrollText  style={iconStyle} /> },
  ],
];

/* ─── Keyboard shortcuts panel ──────────────────────────────────────────── */
const SHORTCUTS = [
  { keys: ['⌘K'], label: 'Command palette',   section: 'Global'     },
  { keys: ['?'],  label: 'Keyboard shortcuts', section: 'Global'     },
  { keys: ['G','D'], label: 'Go to Dashboard', section: 'Navigation' },
  { keys: ['G','C'], label: 'Go to Cases',     section: 'Navigation' },
  { keys: ['G','H'], label: 'Go to Hunt',      section: 'Navigation' },
  { keys: ['G','A'], label: 'Go to Analytics', section: 'Navigation' },
  { keys: ['N'],  label: 'New Case',           section: 'Cases'      },
];

function ShortcutsPanel({ onClose }) {
  const sections = [...new Set(SHORTCUTS.map(s => s.section))];
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(26,22,18,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(245,240,232,0.97)', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 16, padding: '24px 28px', maxWidth: 460, width: '90%', boxShadow: '0 24px 64px rgba(26,22,18,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Keyboard size={15} style={{ color: 'var(--accent-light)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={15} />
          </button>
        </div>
        {sections.map(section => (
          <div key={section} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{section}</div>
            {SHORTCUTS.filter(s => s.section === section).map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>{s.label}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {s.keys.map((k, i) => (
                    <React.Fragment key={k}>
                      {i > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>then</span>}
                      <kbd style={{ fontSize: 11, color: 'var(--text-primary)', background: 'rgba(26,22,18,0.06)', border: '1px solid rgba(26,22,18,0.14)', borderRadius: 4, padding: '2px 7px', fontFamily: 'var(--font-mono)' }}>{k}</kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main shell ────────────────────────────────────────────────────────── */
const isTyping = () => {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
};

export default function AppShell() {
  const { token, user, searchQuery, setSearchQuery, logout, addToast } = useStore();
  const [paletteOpen, setPaletteOpen]   = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [bellOpen, setBellOpen]         = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [flashId, setFlashId]           = useState(null);
  const [recentCases, setRecentCases]   = useState([]);
  const bellRef    = useRef(null);
  const userRef    = useRef(null);
  const navigate   = useNavigate();
  const gKeyRef    = useRef(false);
  const gTimeout   = useRef(null);

  if (!token) return <Navigate to="/app/login" replace />;

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator?.platform || '');
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'A';

  /* ── Real-time alerts ── */
  useSSE('/api/ingest/stream/global-alerts', useCallback((alert) => {
    const label = ALERT_LABELS[alert.alert_type] || alert.alert_type?.replace(/_/g, ' ') || 'Alert';
    const type  = alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'success';
    addToast(`${alert.hostname}: ${label}`, type);
    setNotifications(prev => [{ id: alert.id, label, severity: alert.severity, hostname: alert.hostname, detected_at: alert.detected_at }, ...prev].slice(0, 20));
    setUnreadCount(c => c + 1);
    setFlashId(alert.id);
    setTimeout(() => setFlashId(id => id === alert.id ? null : id), 1200);
  }, [addToast]));

  /* ── Fetch recent cases ── */
  useEffect(() => { api.get('/api/cases?limit=10').then(r => setRecentCases(r.data)).catch(() => {}); }, []);

  /* ── Outside-click close for popups ── */
  useEffect(() => {
    const fn = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* ── Global keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(o => !o); return; }
      if (isTyping()) return;
      if (e.key === '?') { e.preventDefault(); setShortcutsOpen(o => !o); return; }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        api.post('/api/cases', { title: 'New Investigation', severity: 'medium', analyst_name: user?.name || 'Analyst' })
          .then(r => navigate(`/app/cases/${r.data.id}`))
          .catch(() => addToast('Failed to create case', 'error'));
        return;
      }
      if (e.key === 'g' || e.key === 'G') {
        gKeyRef.current = true;
        clearTimeout(gTimeout.current);
        gTimeout.current = setTimeout(() => { gKeyRef.current = false; }, 1200);
        return;
      }
      if (gKeyRef.current) {
        gKeyRef.current = false;
        clearTimeout(gTimeout.current);
        const k = e.key.toLowerCase();
        if (k === 'd') navigate('/app/dashboard');
        if (k === 'c') navigate('/app/cases');
        if (k === 'h') navigate('/app/hunt');
        if (k === 'a') navigate('/app/analytics');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(gTimeout.current); };
  }, [navigate, user, addToast]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', backgroundImage: 'radial-gradient(circle, rgba(26,22,18,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px', overflow: 'hidden', position: 'relative' }}>

      {/* ── MagicRings background ── */}
      <MagicRings color="#CC785C" accent="#D98B6A" />

      {/* ── Floating glass topbar ── */}
      <header style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: 1200,
        height: 48,
        background: 'rgba(245,240,232,0.88)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        borderRadius: 14,
        border: '1px solid rgba(26,22,18,0.1)',
        boxShadow: '0 4px 24px rgba(26,22,18,0.1), 0 1px 0 rgba(26,22,18,0.6) inset',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
        zIndex: 200,
      }}>

        {/* Logo */}
        <div onClick={() => navigate('/app/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0, textDecoration: 'none' }}>
          <img
            src="/assets/brand/aegistrace-icon-transparent.png"
            alt="AegisTrace"
            style={{ width: 24, height: 24, objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(204,120,92,0.65))' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.2em' }}>
            AEGISTRACE
          </span>
        </div>

        {/* Search — centered */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(26,22,18,0.4)', pointerEvents: 'none' }} />
            <input
              placeholder="Search cases, indicators, rules..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) navigate(`/app/cases?q=${encodeURIComponent(searchQuery)}`); }}
              style={{
                width: '100%',
                background: 'rgba(26,22,18,0.05)',
                border: '1px solid rgba(26,22,18,0.1)',
                borderRadius: 8,
                padding: '6px 88px 6px 30px',
                color: '#1A1612',
                fontSize: 12,
                fontFamily: 'var(--font-ui)',
                outline: 'none',
                transition: 'background 140ms, border-color 140ms',
              }}
              onFocus={e => { e.target.style.background = 'rgba(26,22,18,0.07)'; e.target.style.borderColor = 'rgba(204,120,92,0.35)'; }}
              onBlur={e => { e.target.style.background = 'rgba(26,22,18,0.05)'; e.target.style.borderColor = 'rgba(26,22,18,0.1)'; }}
            />
            <button
              onClick={() => setPaletteOpen(true)}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(26,22,18,0.06)', border: '1px solid rgba(26,22,18,0.12)',
                borderRadius: 5, padding: '2px 7px', cursor: 'pointer',
                fontSize: 10, color: 'rgba(26,22,18,0.5)', fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              <Command size={10} />{isMac ? 'K' : 'Ctrl K'}
            </button>
          </div>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

          {/* Shortcuts */}
          <TopbarBtn onClick={() => setShortcutsOpen(true)} title="Shortcuts (?)">
            <Keyboard size={14} />
          </TopbarBtn>

          {/* Bell */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <TopbarBtn
              onClick={() => { setBellOpen(o => !o); if (!bellOpen) setUnreadCount(0); }}
              active={unreadCount > 0}
              title="Alerts"
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -3, right: -3, background: '#EF4444', color: '#fff', borderRadius: '50%', fontSize: 8, fontWeight: 700, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', border: '1.5px solid #050505' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </TopbarBtn>

            {bellOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, background: 'rgba(245,240,232,0.97)', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 12, boxShadow: '0 16px 48px rgba(26,22,18,0.15)', zIndex: 400, overflow: 'hidden', backdropFilter: 'blur(24px)' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(26,22,18,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>Recent Alerts</span>
                  <button onClick={() => { setNotifications([]); setBellOpen(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-mono)' }}>Clear</button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-ui)' }}>No recent alerts</div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.map((n, i) => {
                      const sc = { critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981' }[n.severity] || '#888';
                      const ts = n.detected_at ? new Date(n.detected_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                      return (
                        <div key={n.id || i} style={{ padding: '9px 14px', borderBottom: '1px solid rgba(26,22,18,0.05)', display: 'flex', gap: 10, alignItems: 'flex-start', background: n.id === flashId ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc, flexShrink: 0, marginTop: 5 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-ui)', marginBottom: 2 }}>{n.label}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{n.hostname} · {ts}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User avatar */}
          <div ref={userRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: userMenuOpen ? 'rgba(204,120,92,0.1)' : 'rgba(26,22,18,0.05)', border: `1px solid ${userMenuOpen ? 'rgba(204,120,92,0.25)' : 'rgba(26,22,18,0.1)'}`, borderRadius: 8, padding: '4px 10px 4px 5px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,22,18,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = userMenuOpen ? 'rgba(204,120,92,0.1)' : 'rgba(26,22,18,0.05)'; }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#CC785C,#D98B6A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {initials}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{user?.name?.split(' ')[0]}</span>
            </button>

            {userMenuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'rgba(245,240,232,0.97)', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 10, padding: 6, minWidth: 180, zIndex: 400, boxShadow: '0 10px 40px rgba(26,22,18,0.14)', backdropFilter: 'blur(24px)' }}>
                {[
                  { Icon: Home,     label: 'Back to Home',      action: () => { navigate('/'); setUserMenuOpen(false); } },
                  { Icon: Settings, label: 'Settings',           action: () => { navigate('/app/admin'); setUserMenuOpen(false); } },
                  { Icon: Keyboard, label: 'Shortcuts',          action: () => { setShortcutsOpen(true); setUserMenuOpen(false); } },
                ].map(({ Icon, label, action }) => (
                  <button key={label} onClick={action} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'none', border: 'none', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,22,18,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Icon size={13} style={{ opacity: 0.7 }} />{label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'rgba(26,22,18,0.07)', margin: '4px 6px' }} />
                <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'none', border: 'none', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={13} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
        zIndex: 1,
        paddingTop: 72,    /* topbar height 48 + 12 gap + 12 extra */
        paddingBottom: 96, /* dock height ~68 + 28 margin */
        minHeight: 0,
      }}>
        <Outlet />
      </main>

      {/* ── Dock ── */}
      <Dock items={DOCK_GROUPS} />

      {/* ── Overlays ── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        recentCases={recentCases}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      {shortcutsOpen && <ShortcutsPanel onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}

/* ─── Small topbar icon button ──────────────────────────────────────────── */
function TopbarBtn({ children, onClick, title, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30,
        background: active ? 'rgba(239,68,68,0.1)' : 'rgba(26,22,18,0.05)',
        border: `1px solid ${active ? 'rgba(239,68,68,0.25)' : 'rgba(26,22,18,0.1)'}`,
        borderRadius: 7,
        color: active ? '#EF4444' : 'rgba(26,22,18,0.55)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,22,18,0.09)'; e.currentTarget.style.color = '#1A1612'; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(239,68,68,0.1)' : 'rgba(26,22,18,0.05)'; e.currentTarget.style.color = active ? '#EF4444' : 'rgba(26,22,18,0.55)'; }}
    >
      {children}
    </button>
  );
}
