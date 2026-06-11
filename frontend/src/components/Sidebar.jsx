import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Shield, Mail,
  Wrench, Globe, Settings, LogOut, ChevronLeft, ChevronRight,
  Crosshair, ScrollText, Monitor, Network, Rss, Cpu,
  Terminal, Fingerprint, BarChart2, ShieldAlert, ShieldCheck, Bot,
  Plug, Activity, Brain, Radio, Swords, Shield as ShieldIcon, Workflow
} from 'lucide-react';
import Logo from './Logo';
import useStore from '../store/useStore';

const NAV_GROUPS = [
  {
    label: 'Control',
    items: [
      { to: '/app/defense-console', label: 'Defense Console',   Icon: ShieldAlert },
      { to: '/app/control-plane',   label: 'Control Plane',     Icon: Radio },
      { to: '/app/playbooks',       label: 'Playbooks',         Icon: Workflow },
      { to: '/app/dashboard',       label: 'Dashboard',         Icon: LayoutDashboard },
    ],
  },
  {
    label: 'Investigation',
    items: [
      { to: '/app/cases',          label: 'Cases',             Icon: FolderOpen },
      { to: '/app/analytics',      label: 'Analytics',         Icon: BarChart2 },
      { to: '/app/hunt',           label: 'Threat Hunt',       Icon: Crosshair },
      { to: '/app/endpoints',      label: 'Endpoints',         Icon: Monitor },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/app/vt-lookup',      label: 'VT Lookup',         Icon: Shield },
      { to: '/app/feeds',          label: 'Threat Feeds',      Icon: Rss },
      { to: '/app/email',          label: 'Email Analysis',    Icon: Mail },
      { to: '/app/pcap',           label: 'PCAP Analysis',     Icon: Network },
      { to: '/app/tools',          label: 'Tools Hub',         Icon: Wrench },
    ],
  },
  {
    label: 'Identity & Trust',
    items: [
      { to: '/app/identity-graph',   label: 'Identity Graph',    Icon: Fingerprint },
      { to: '/app/itdr',             label: 'ITDR',              Icon: ShieldAlert },
      { to: '/app/nhi-health',       label: 'NHI Health',        Icon: Activity },
      { to: '/app/connectors',       label: 'Connectors',        Icon: Plug },
      { to: '/app/policies',         label: 'Policies',          Icon: ShieldCheck },
      { to: '/app/agent-security',   label: 'AI Agent Security', Icon: Bot },
      { to: '/app/shadow-ai',        label: 'Shadow AI',         Icon: Brain },
    ],
  },
  {
    label: 'Lab',
    items: [
      { to: '/app/terminal-lab',   label: 'Terminal Lab',      Icon: Terminal },
      { to: '/app/simulation',     label: 'ATT&CK Simulation', Icon: Swords   },
    ],
  },
  {
    label: 'Hardware',
    items: [
      { to: '/app/hardware/tools', label: 'Hardware Tools',    Icon: Cpu },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/app/audit',          label: 'Audit Log',         Icon: ScrollText },
      { to: '/app/public',         label: 'Public View',       Icon: Globe },
      { to: '/app/admin',          label: 'Admin',             Icon: Settings },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { logout, user } = useStore();
  const navigate = useNavigate();

  return (
    <aside style={{
      width: collapsed ? 56 : 220,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Logo + collapse */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 12px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid var(--border)',
        marginBottom: 4, flexShrink: 0,
      }}>
        <div
          onClick={() => navigate('/')}
          title="Back to home"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', borderRadius: 6, padding: '2px 4px', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(90,138,159,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {collapsed ? <Logo size={22} showText={false} /> : <Logo size={22} showText />}
        </div>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer', padding: 4 }}
          title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div style={{ fontSize: '0.58rem', fontWeight: 600, color: 'rgba(136,136,136,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 12px 4px', fontFamily: 'JetBrains Mono' }}>
                {group.label}
              </div>
            )}
            {group.items.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                title={collapsed ? label : ''}
                style={collapsed ? { justifyContent: 'center', padding: '8px 0' } : {}}>
                <Icon size={15} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ fontSize: '0.8rem' }}>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {!collapsed && user && (
          <div style={{ padding: '6px 10px', marginBottom: 3 }}>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 1 }}>{user.role}</div>
          </div>
        )}
        <button onClick={() => { logout(); navigate('/'); }}
          className="sidebar-item"
          style={collapsed ? { justifyContent: 'center', padding: '8px 0', width: '100%' } : { width: '100%' }}
          title="Logout">
          <LogOut size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ fontSize: '0.8rem' }}>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
