import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Shield, Bug, Mail,
  Wrench, Globe, Settings, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import Logo from './Logo';
import useStore from '../store/useStore';

const NAV = [
  { to: '/app/dashboard',  label: 'Dashboard',       Icon: LayoutDashboard },
  { to: '/app/cases',      label: 'Cases',            Icon: FolderOpen },
  { to: '/app/vt-lookup',  label: 'VT Lookup',        Icon: Shield },
  { to: '/app/malware',    label: 'Malware Tools',    Icon: Bug },
  { to: '/app/email',      label: 'Email Analysis',   Icon: Mail },
  { to: '/app/tools',      label: 'Tools Hub',        Icon: Wrench },
  { to: '/app/public',     label: 'Public View',      Icon: Globe },
  { to: '/app/admin',      label: 'Admin',            Icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { logout, user } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <aside
      style={{
        width: collapsed ? 56 : 200,
        background: '#0F1018',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 14px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        marginBottom: 8,
      }}>
        {!collapsed && <Logo size={22} showText />}
        {collapsed && <Logo size={22} showText={false} />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 4 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            title={collapsed ? label : ''}
            style={collapsed ? { justifyContent: 'center', padding: '8px 0' } : {}}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {!collapsed && user && (
          <div style={{ padding: '8px 12px', marginBottom: 4 }}>
            <div style={{ fontSize: '0.75rem', color: '#F0F0F8', fontWeight: 500 }}>{user.name}</div>
            <div style={{ fontSize: '0.65rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{user.role}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-item"
          style={collapsed ? { justifyContent: 'center', padding: '8px 0', width: '100%' } : { width: '100%' }}
          title="Logout"
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
