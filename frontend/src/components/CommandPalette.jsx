import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, FolderOpen, Shield, Mail, Bug, Wrench,
  Monitor, FileSearch, Crosshair, ScrollText, Globe, Settings,
  Plus, ArrowRight, BookOpen, Terminal, X, Fingerprint, Network, Rss, Cpu,
  BarChart2, ShieldCheck, ShieldAlert, Bot, Keyboard, LogOut
} from './icons';

const NAV_ITEMS = [
  { label: 'Dashboard',         path: '/app/dashboard',      Icon: LayoutDashboard, group: 'Navigate', hint: 'G D' },
  { label: 'Cases',             path: '/app/cases',          Icon: FolderOpen,      group: 'Navigate', hint: 'G C' },
  { label: 'Threat Hunt',       path: '/app/hunt',           Icon: Crosshair,       group: 'Navigate' },
  { label: 'Endpoints',         path: '/app/endpoints',      Icon: Monitor,         group: 'Navigate' },

  { label: 'Analytics',         path: '/app/analytics',      Icon: BarChart2,       group: 'Navigate' },
  { label: 'Terminal Lab',      path: '/app/terminal-lab',   Icon: Terminal,        group: 'Lab'      },
  { label: 'Identity Graph',    path: '/app/identity-graph', Icon: Fingerprint,     group: 'Lab'      },
  { label: 'ITDR',              path: '/app/itdr',           Icon: ShieldAlert,     group: 'Lab'      },
  { label: 'Policies',          path: '/app/policies',       Icon: ShieldCheck,     group: 'Lab'      },
  { label: 'VT Lookup',         path: '/app/vt-lookup',      Icon: Shield,          group: 'Tools'    },
  { label: 'Email Analysis',    path: '/app/email',          Icon: Mail,            group: 'Tools'    },
  { label: 'PCAP Analysis',     path: '/app/pcap',           Icon: Network,         group: 'Tools'    },
  { label: 'Threat Feeds',      path: '/app/feeds',          Icon: Rss,             group: 'Tools'    },
  { label: 'AI Agent Security', path: '/app/agent-security', Icon: Bot,             group: 'Lab'      },
  { label: 'Tools Hub',         path: '/app/tools',          Icon: Wrench,          group: 'Tools'    },
  { label: 'Hardware Tools',    path: '/app/hardware/tools', Icon: Cpu,             group: 'Tools'    },
  { label: 'Audit Log',         path: '/app/audit',          Icon: ScrollText,      group: 'System'   },
  { label: 'Admin',             path: '/app/admin',          Icon: Settings,        group: 'System'   },
  { label: 'Integrations',      path: '/app/admin?tab=integrations', Icon: Settings, group: 'System'  },
  { label: 'Public Cases',      path: '/public',             Icon: Globe,           group: 'Public'   },
  { label: 'Portfolio',         path: '/portfolio',          Icon: BookOpen,        group: 'Public'   },
  { label: 'Agent Setup',       path: '/agent-setup',        Icon: Terminal,        group: 'Public'   },
];

const ACTIONS = [
  { label: 'New Case',              action: 'new-case',   Icon: Plus,     group: 'Actions', hint: 'N'  },
  { label: 'Keyboard Shortcuts',    action: 'shortcuts',  Icon: Keyboard, group: 'Actions', hint: '?'  },
];

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(74,126,200,0.35)', color: '#BDD4E8', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const KBD = ({ children }) => (
  <kbd style={{ fontSize: '0.58rem', color: '#4A6A8A', background: 'rgba(74,126,200,0.07)', border: '1px solid rgba(74,126,200,0.14)', borderRadius: 3, padding: '1px 5px', fontFamily: 'JetBrains Mono', letterSpacing: '0.04em', flexShrink: 0 }}>
    {children}
  </kbd>
);

export default function CommandPalette({ open, onClose, recentCases = [], onOpenShortcuts }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const allItems = [
    ...ACTIONS,
    ...NAV_ITEMS,
    ...recentCases.slice(0, 5).map(c => ({
      label: c.title,
      sub: c.case_number,
      path: `/app/cases/${c.id}`,
      Icon: FolderOpen,
      group: 'Recent Cases',
      severity: c.severity,
    })),
  ];

  const filtered = q.trim()
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(q.toLowerCase()) ||
        item.sub?.toLowerCase().includes(q.toLowerCase()) ||
        item.group.toLowerCase().includes(q.toLowerCase())
      )
    : allItems;

  const groups = filtered.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const flat = Object.values(groups).flat();

  useEffect(() => {
    if (open) {
      setQ('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [q]);

  const execute = useCallback((item) => {
    if (item.action === 'new-case') {
      onClose();
      navigate('/app/cases');
    } else if (item.action === 'shortcuts') {
      onClose();
      onOpenShortcuts?.();
    } else if (item.path) {
      onClose();
      navigate(item.path);
    }
  }, [navigate, onClose, onOpenShortcuts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, flat.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter' && flat[selected]) {
        e.preventDefault();
        execute(flat[selected]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flat, selected, execute, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const SEV_COLOR = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#8BB8E8', info: '#4A6A8A' };

  let globalIdx = 0;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="dropdown-pop"
        style={{ width: '100%', maxWidth: 580, background: '#0E0E16', border: '1px solid rgba(74,126,200,0.2)', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.8)', overflow: 'hidden' }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(74,126,200,0.12)' }}>
          <Search size={16} style={{ color: '#4A6A8A', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search pages, cases, tools…"
            aria-label="Command palette search"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#BDD4E8', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: '#4A6A8A', cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          )}
          <KBD>ESC</KBD>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 0' }}>
          {flat.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#4A6A8A', fontSize: '0.82rem' }}>
              No results for "<span style={{ color: '#BDD4E8' }}>{q}</span>"
            </div>
          ) : (
            Object.entries(groups).map(([groupName, items]) => (
              <div key={groupName}>
                <div style={{ padding: '6px 16px 3px', fontSize: '0.6rem', color: '#4A6A8A', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {groupName}
                </div>
                {items.map((item) => {
                  const idx = globalIdx++;
                  const isSelected = idx === selected;
                  return (
                    <div
                      key={`${item.group}-${item.label}`}
                      data-idx={idx}
                      onClick={() => execute(item)}
                      onMouseEnter={() => setSelected(idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                        cursor: 'pointer', transition: 'background 0.08s',
                        background: isSelected ? 'rgba(74,126,200,0.15)' : 'transparent',
                        borderLeft: isSelected ? '2px solid #4A7EC8' : '2px solid transparent',
                      }}
                    >
                      <item.Icon size={15} style={{ color: isSelected ? '#8BB8E8' : '#4A6A8A', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', color: isSelected ? '#BDD4E8' : '#7A9DB8' }}>{highlight(item.label, q)}</div>
                        {item.sub && (
                          <div style={{ fontSize: '0.68rem', color: '#4A6A8A', fontFamily: 'JetBrains Mono', marginTop: 1 }}>{item.sub}</div>
                        )}
                      </div>
                      {item.severity && (
                        <span style={{ fontSize: '0.62rem', color: SEV_COLOR[item.severity] || '#4A6A8A', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
                          {item.severity}
                        </span>
                      )}
                      {item.hint && !isSelected && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {item.hint.split(' ').map(k => <KBD key={k}>{k}</KBD>)}
                        </div>
                      )}
                      {isSelected && <ArrowRight size={13} style={{ color: '#4A7EC8', flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(74,126,200,0.1)', display: 'flex', gap: 16, fontSize: '0.62rem', color: '#4A6A8A', fontFamily: 'JetBrains Mono' }}>
          <span><KBD>↑↓</KBD> navigate</span>
          <span><KBD>↵</KBD> open</span>
          <span><KBD>esc</KBD> close</span>
          <span style={{ marginLeft: 'auto' }}><KBD>?</KBD> shortcuts</span>
        </div>
      </div>
    </div>
  );
}
