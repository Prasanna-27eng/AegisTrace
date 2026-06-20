import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, Search } from 'lucide-react';
import useStore from '../store/useStore';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/app/dashboard',       label: 'Dashboard',         icon: '📊' },
      { to: '/app/control-plane',   label: 'Control Plane',     icon: '🛡️' },
      { to: '/app/analytics',       label: 'Analytics',         icon: '📈' },
    ],
  },
  {
    label: 'Threat Management',
    items: [
      { to: '/app/cases',           label: 'Cases',             icon: '📁' },
      { to: '/app/hunt',            label: 'Threat Hunt',       icon: '🔍' },
      { to: '/app/identity-graph',  label: 'Identity',          icon: '🕸️' },
      { to: '/app/endpoints',       label: 'Endpoints',         icon: '💻' },
      { to: '/app/email',           label: 'Email Analysis',    icon: '📧' },
      { to: '/app/feeds',           label: 'Threat Feeds',      icon: '📡' },
    ],
  },
  {
    label: 'Detection',
    items: [
      { to: '/app/itdr',            label: 'ITDR',              icon: '⚡' },
      { to: '/app/defense-console', label: 'AI Defense',        icon: '🤖' },
      { to: '/app/shadow-ai',       label: 'Shadow AI',         icon: '👁️' },
      { to: '/app/playbooks',       label: 'Playbooks',         icon: '📋' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/app/connectors',      label: 'Connectors',        icon: '🔌' },
      { to: '/app/nhi-health',      label: 'NHI Health',        icon: '🔑' },
      { to: '/app/simulation',      label: 'Simulation',        icon: '🔬' },
      { to: '/app/tools',           label: 'Tools Hub',         icon: '🛠️' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/app/admin',           label: 'Admin',             icon: '⚙️' },
      { to: '/app/policies',        label: 'Policies',          icon: '📋' },
      { to: '/app/agent-security',  label: 'Agent Security',    icon: '🔒' },
      { to: '/app/audit',           label: 'Audit Log',         icon: '📜' },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { logout, user } = useStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

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
        background: 'var(--sidebar-bg, #070B14)',
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
          {!collapsed && (
            <div
              onClick={() => navigate('/')}
              title="Back to home"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 6,
                padding: '3px 6px',
                transition: 'background 140ms ease-out',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>🛡️</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--text-primary)',
                letterSpacing: '0.06em',
              }}>
                AEGISTRACE
              </span>
            </div>
          )}
          {collapsed && (
            <span style={{ fontSize: 17, lineHeight: 1 }} title="AegisTrace">🛡️</span>
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
              e.currentTarget.style.background = 'rgba(37,99,235,0.10)';
              e.currentTarget.style.color = 'var(--accent-light)';
              e.currentTarget.style.borderColor = 'var(--accent-border)';
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
          <div style={{
            padding: '7px 10px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={11}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  padding: '5px 8px 5px 24px',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                  transition: 'border-color 140ms ease-out, background 140ms ease-out',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(37,99,235,0.4)';
                  e.target.style.background = 'rgba(37,99,235,0.04)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.background = 'rgba(255,255,255,0.04)';
                }}
              />
            </div>
          </div>
        )}

        {/* Nav groups */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '4px 0',
        }}>
          {filteredGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 2 }}>
              {/* Group header */}
              {!collapsed && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  padding: '10px 14px 3px',
                  userSelect: 'none',
                }}>
                  {group.label}
                </div>
              )}
              {collapsed && <div style={{ height: 6 }} />}

              {group.items.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: collapsed ? '9px 0' : '7px 12px',
                    margin: '1px 6px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(37,99,235,0.10)' : 'transparent',
                    borderLeft: isActive ? '2px solid #2563EB' : '2px solid transparent',
                    transition: 'background 140ms ease-out, color 140ms ease-out',
                    cursor: 'pointer',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  })}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    if (!el.style.background.includes('37,99,235')) {
                      el.style.background = 'rgba(148,163,184,0.06)';
                      el.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    if (!el.style.background.includes('37,99,235')) {
                      el.style.background = 'transparent';
                      el.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{
                        fontSize: collapsed ? 16 : 14,
                        flexShrink: 0,
                        lineHeight: 1,
                        opacity: isActive ? 1 : 0.75,
                      }}>
                        {icon}
                      </span>
                      {!collapsed && (
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom divider */}
        <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

        {/* User section */}
        <div style={{
          padding: collapsed ? '10px 0' : '8px 8px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
          {!collapsed && user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'rgba(37,99,235,0.18)',
                border: '1px solid rgba(37,99,235,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--accent-light)',
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.role}
                </div>
              </div>
            </div>
          )}
          {collapsed && user && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              <div
                title={user.name}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'rgba(37,99,235,0.18)',
                  border: '1px solid rgba(37,99,235,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--accent-light)',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'default',
                }}
              >
                {initials}
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => { logout(); navigate('/'); }}
            title="Sign out"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'none',
              border: 'none',
              borderRadius: 6,
              padding: collapsed ? '8px 0' : '6px 10px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'all 140ms ease-out',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.color = '#EF4444';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <LogOut size={13} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Layout spacer: pushes content right of the fixed sidebar */}
      <div style={{
        flexShrink: 0,
        width: collapsed ? 'var(--sidebar-w-collapsed, 56px)' : 'var(--sidebar-w, 240px)',
        transition: 'width 220ms cubic-bezier(0.23,1,0.32,1)',
      }} />
    </>
  );
}
