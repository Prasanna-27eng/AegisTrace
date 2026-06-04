import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, FolderOpen, Shield, Mail, Bug, Wrench,
  Monitor, FileSearch, Crosshair, ScrollText, Globe, Settings,
  Plus, ArrowRight, BookOpen, Terminal, X, Fingerprint, Network, Rss, Cpu
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',         path: '/app/dashboard',      Icon: LayoutDashboard, group: 'Navigate' },
  { label: 'Cases',             path: '/app/cases',          Icon: FolderOpen,      group: 'Navigate' },
  { label: 'Threat Hunt',       path: '/app/hunt',           Icon: Crosshair,       group: 'Navigate' },
  { label: 'Endpoints',         path: '/app/endpoints',      Icon: Monitor,         group: 'Navigate' },
  { label: 'Log Investigation', path: '/app/logs',           Icon: FileSearch,      group: 'Navigate' },
  { label: 'Terminal Lab',      path: '/app/terminal-lab',   Icon: Terminal,        group: 'Lab'      },
  { label: 'Identity Graph',    path: '/app/identity-graph', Icon: Fingerprint,     group: 'Lab'      },
  { label: 'VT Lookup',         path: '/app/vt-lookup',      Icon: Shield,          group: 'Tools'    },
  { label: 'Email Analysis',    path: '/app/email',          Icon: Mail,            group: 'Tools'    },
  { label: 'PCAP Analysis',     path: '/app/pcap',           Icon: Network,         group: 'Tools'    },
  { label: 'Threat Feeds',      path: '/app/feeds',          Icon: Rss,             group: 'Tools'    },
  { label: 'Malware Tools',     path: '/app/malware',        Icon: Bug,             group: 'Tools'    },
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
  { label: 'New Case',      action: 'new-case', Icon: Plus,      group: 'Actions' },
];

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(192,57,43,0.3)', color: '#F0F0F8', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette({ open, onClose, recentCases = [] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // All items — nav + recent cases
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

  // Group filtered items
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
    } else if (item.path) {
      onClose();
      navigate(item.path);
    }
  }, [navigate, onClose]);

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

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const SEV_COLOR = { critical: '#C0392B', high: '#EF4444', medium: '#EAB308', low: '#A78BFA', info: '#71717A' };

  let globalIdx = 0;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#0F1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.7)', overflow: 'hidden' }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <Search size={16} style={{ color: '#71717A', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search pages, cases, tools…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#F0F0F8', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          )}
          <kbd style={{ fontSize: '0.62rem', color: '#71717A', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 6px', fontFamily: 'JetBrains Mono' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 0' }}>
          {flat.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#71717A', fontSize: '0.82rem' }}>
              No results for "<span style={{ color: '#F0F0F8' }}>{q}</span>"
            </div>
          ) : (
            Object.entries(groups).map(([groupName, items]) => (
              <div key={groupName}>
                <div style={{ padding: '6px 16px 3px', fontSize: '0.62rem', color: '#71717A', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
                        cursor: 'pointer', transition: 'background 0.1s',
                        background: isSelected ? 'rgba(192,57,43,0.1)' : 'transparent',
                        borderLeft: isSelected ? '2px solid #C0392B' : '2px solid transparent',
                      }}
                    >
                      <item.Icon size={15} style={{ color: isSelected ? '#C0392B' : '#71717A', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.84rem', color: '#F0F0F8' }}>{highlight(item.label, q)}</div>
                        {item.sub && (
                          <div style={{ fontSize: '0.68rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginTop: 1 }}>{item.sub}</div>
                        )}
                      </div>
                      {item.severity && (
                        <span style={{ fontSize: '0.62rem', color: SEV_COLOR[item.severity] || '#71717A', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
                          {item.severity}
                        </span>
                      )}
                      {isSelected && <ArrowRight size={13} style={{ color: '#C0392B', flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16, fontSize: '0.65rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>
          <span><kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '1px 5px' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '1px 5px' }}>↵</kbd> open</span>
          <span><kbd style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '1px 5px' }}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
