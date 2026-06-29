import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Search,
  LayoutDashboard, Radio, BarChart3,
  FolderOpen, Crosshair, Share2, Monitor, Mail, Rss,
  Radar, ShieldAlert, ScanEye, BookOpen,
  Plug, KeyRound, FlaskConical, Wrench, Download,
  Settings2, ScrollText, Lock, ClipboardList,
} from './icons';
import useStore from '../store/useStore';

/* ─── Icon map — Lucide icons only, no emoji ────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/app/dashboard',       label: 'Dashboard',         Icon: LayoutDashboard },
      { to: '/app/control-plane',   label: 'Control Plane',     Icon: Radio           },
      { to: '/app/analytics',       label: 'Analytics',         Icon: BarChart3       },
    ],
  },
  {
    label: 'Threat Management',
    items: [
      { to: '/app/cases',           label: 'Cases',             Icon: FolderOpen  },
      { to: '/app/hunt',            label: 'Threat Hunt',       Icon: Crosshair   },
      { to: '/app/identity-graph',  label: 'Identity Graph',    Icon: Share2      },
      { to: '/app/endpoints',       label: 'Endpoints',         Icon: Monitor     },
      { to: '/app/email',           label: 'Email Analysis',    Icon: Mail        },
      { to: '/app/feeds',           label: 'Threat Feeds',      Icon: Rss         },
    ],
  },
  {
    label: 'Detection',
    items: [
      { to: '/app/itdr',            label: 'ITDR',              Icon: Radar       },
      { to: '/app/defense-console', label: 'AI Defense',        Icon: ShieldAlert },
      { to: '/app/shadow-ai',       label: 'Shadow AI',         Icon: ScanEye     },
      { to: '/app/playbooks',       label: 'Playbooks',         Icon: BookOpen    },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/app/connectors',      label: 'Connectors',        Icon: Plug        },
      { to: '/app/nhi-health',      label: 'NHI Health',        Icon: KeyRound    },
      { to: '/app/simulation',      label: 'Simulation',        Icon: FlaskConical },
      { to: '/app/deploy',           label: 'Deploy & Setup',     Icon: Download         },
      { to: '/app/tools',           label: 'Tools Hub',         Icon: Wrench      },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/app/admin',           label: 'Admin',             Icon: Settings2   },
      { to: '/app/policies',        label: 'Policies',          Icon: ClipboardList },
      { to: '/app/agent-security',  label: 'Agent Security',    Icon: Lock        },
      { to: '/app/audit',           label: 'Audit Log',         Icon: ScrollText  },
    ],
  },
];

/* ── Animated collapsible group children ───────────────────────────────── */
function GroupChildren({ open, children }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight);
  }, [children]);

  return (
    <div style={{
      overflow: 'hidden',
      maxHeight: open ? `${height}px` : '0px',
      transition: 'max-height 220ms cubic-bezier(0.23,1,0.32,1)',
    }}>
      <div ref={ref}>{children}</div>
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed }) {
  const { logout, user } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  /* Track which groups are open — Overview open by default, rest closed */
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    NAV_GROUPS.forEach(g => { initial[g.label] = g.label === 'Overview'; });
    return initial;
  });

  /* Auto-open the group containing the active route */
  useEffect(() => {
    NAV_GROUPS.forEach(g => {
      const hasActive = g.items.some(item => location.pathname.startsWith(item.to));
      if (hasActive) setOpenGroups(prev => ({ ...prev, [g.label]: true }));
    });
  }, [location.pathname]);

  const toggleGroup = (label) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  const filteredGroups = searchQuery.trim()
    ? NAV_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : NAV_GROUPS;

  return (
    <>
      <aside style={{
        position: 'fixed',
        top: 'var(--topbar-h, 52px)',
        left: 0,
        bottom: 0,
        width: collapsed ? 'var(--sidebar-w-collapsed, 56px)' : 'var(--sidebar-w, 240px)',
        background: 'var(--sidebar-bg, #030308)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 220ms cubic-bezier(0.23,1,0.32,1)',
        overflow: 'hidden',
        zIndex: 'var(--z-sticky, 200)',
      }}>

        {/* Logo + collapse toggle */}
        <div style={{
          padding: collapsed ? '12px 0' : '12px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          height: 52,
        }}>
          {/* Logo in expanded sidebar */}
          {!collapsed && (
            <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, borderRadius: 6, padding: '3px 6px', transition: 'background 140ms ease-out' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,126,200,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <img src="/assets/brand/aegistrace-icon-transparent.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(204,120,92,0.35))' }}/>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', letterSpacing: '0.16em' }}>AEGISTRACE</span>
            </div>
          )}
          {collapsed && (
            <img src="/assets/brand/aegistrace-icon-transparent.png" alt="AegisTrace" title="AegisTrace" onClick={() => navigate('/')} style={{ width: 24, height: 24, objectFit: 'contain', cursor: 'pointer', filter: 'drop-shadow(0 0 4px rgba(204,120,92,0.35))' }}/>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 5,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '3px 4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 140ms ease-out',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(74,126,200,0.10)';
              e.currentTarget.style.color = 'rgba(26,22,18,0.7)';
              e.currentTarget.style.borderColor = 'rgba(204,120,92,0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Search filter (expanded only) */}
        {!collapsed && (
          <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(26,22,18,0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  padding: '5px 8px 5px 24px',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                  transition: 'border-color 140ms, background 140ms',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(204,120,92,0.3)'; e.target.style.background = 'rgba(74,126,200,0.04)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'rgba(26,22,18,0.05)'; }}
              />
            </div>
          </div>
        )}

        {/* Nav groups */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0' }}>
          {filteredGroups.map(group => {
            const isOpen = searchQuery.trim() ? true : (openGroups[group.label] ?? false);
            const hasActiveItem = group.items.some(item => location.pathname.startsWith(item.to));

            return (
              <div key={group.label} style={{ marginBottom: 1 }}>

                {/* ── Group header (clickable to toggle) ── */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    title={group.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 16px 4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      userSelect: 'none',
                      gap: 6,
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      color: hasActiveItem ? 'rgba(139,184,232,0.7)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      transition: 'color 140ms ease-out',
                    }}>
                      {group.label}
                    </span>
                    <ChevronDown
                      size={10}
                      style={{
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                        transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1)',
                      }}
                    />
                  </button>
                ) : (
                  /* Collapsed: thin separator instead of group label */
                  <div style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }} />
                )}

                {/* ── Group children (animated collapse) ── */}
                {!collapsed ? (
                  <GroupChildren open={isOpen}>
                    {group.items.map(({ to, label, Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        style={({ isActive }) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          padding: '6px 14px',
                          margin: '1px 6px',
                          borderRadius: 6,
                          textDecoration: 'none',
                          fontFamily: 'var(--font-ui)',
                          fontSize: 13,
                          fontWeight: isActive ? 500 : 400,
                          color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                          background: isActive ? 'rgba(74,126,200,0.10)' : 'transparent',
                          borderLeft: isActive ? '2px solid #4A7EC8' : '2px solid transparent',
                          transition: 'background 140ms ease-out, color 140ms ease-out',
                          cursor: 'pointer',
                        })}
                        onMouseEnter={e => {
                          if (!e.currentTarget.getAttribute('aria-current')) {
                            e.currentTarget.style.background = 'rgba(148,163,184,0.06)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!e.currentTarget.getAttribute('aria-current')) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        {({ isActive }) => (
                          <>
                            <Icon size={15} style={{ flexShrink: 0, color: isActive ? 'var(--accent-light)' : 'var(--text-muted)', transition: 'color 140ms' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {label}
                            </span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </GroupChildren>
                ) : (
                  /* Collapsed: show all icons, no labels, no grouping animation */
                  group.items.map(({ to, label, Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      title={label}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 0',
                        margin: '1px 6px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        background: isActive ? 'rgba(74,126,200,0.10)' : 'transparent',
                        borderLeft: isActive ? '2px solid #4A7EC8' : '2px solid transparent',
                        transition: 'background 140ms ease-out',
                        cursor: 'pointer',
                      })}
                      onMouseEnter={e => {
                        if (!e.currentTarget.getAttribute('aria-current')) {
                          e.currentTarget.style.background = 'rgba(148,163,184,0.06)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!e.currentTarget.getAttribute('aria-current')) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {({ isActive }) => (
                        <Icon size={15} style={{ color: isActive ? 'var(--accent-light)' : 'var(--text-muted)' }} />
                      )}
                    </NavLink>
                  ))
                )}
              </div>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

        {/* User section */}
        <div style={{ padding: collapsed ? '10px 0' : '8px 8px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!collapsed && user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 6,
              background: 'rgba(26,22,18,0.04)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(74,126,200,0.18)',
                border: '1px solid rgba(204,120,92,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'rgba(26,22,18,0.7)',
                fontFamily: 'var(--font-mono)', flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.role}
                </div>
              </div>
            </div>
          )}
          {collapsed && user && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              <div title={user.name} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(26,22,18,0.7)', fontFamily: 'var(--font-mono)' }}>
                {initials}
              </div>
            </div>
          )}

          <button
            onClick={() => { logout(); navigate('/'); }}
            title="Sign out"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', background: 'none', border: 'none',
              borderRadius: 6, padding: collapsed ? '8px 0' : '6px 10px',
              cursor: 'pointer', color: 'var(--text-muted)',
              fontFamily: 'var(--font-ui)', fontSize: 13,
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'all 140ms ease-out',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <LogOut size={13} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Layout spacer */}
      <div style={{
        flexShrink: 0,
        width: collapsed ? 'var(--sidebar-w-collapsed, 56px)' : 'var(--sidebar-w, 240px)',
        transition: 'width 220ms cubic-bezier(0.23,1,0.32,1)',
      }} />
    </>
  );
}
