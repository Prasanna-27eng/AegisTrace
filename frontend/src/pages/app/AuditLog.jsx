import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, RefreshCw, Pause, Play, Filter, Download, Circle } from 'lucide-react';
import api from '../../api/client';

/* ── Category config ─────────────────────────────────────────────────────── */
const CAT_COLOR = {
  auth:     '#22C55E',
  case:     '#A78BFA',
  ai:       '#EAB308',
  evidence: '#4DA3FF',
  intel:    '#06B6D4',
  import:   '#F97316',
  admin:    '#EC4899',
  system:   '#71717A',
};

const CAT_LABELS = {
  auth:'Auth', case:'Cases', ai:'AI', evidence:'Evidence',
  intel:'Intel', import:'Import', admin:'Admin', system:'System',
};

const ACTION_ICON = {
  login:'→', case_created:'＋', case_closed:'✓', case_deleted:'✕',
  ai_generated:'⚡', vt_lookup:'🔍', email_analysed:'📧',
  alert_imported:'📥', user_created:'👤', status_changed:'↻',
  evidence_added:'📎', terminal_analysed:'⌨', share_toggled:'🌐',
};

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, color = '#F0F0F8', sub }) {
  return (
    <div className="at-card" style={{ padding: '14px 16px', flex: '1 1 120px' }}>
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color, fontFamily: 'JetBrains Mono' }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.68rem', color: '#71717A', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.65rem', color: '#71717A', marginTop: 2, fontFamily: 'JetBrains Mono' }}>{sub}</div>}
    </div>
  );
}

/* ── Activity bar chart (7-day sparkline) ────────────────────────────────── */
function ActivityChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="at-card" style={{ padding: '14px 16px' }}>
      <div className="section-label" style={{ marginBottom: 10 }}>Activity — Last 7 Days</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{
              width: '100%', background: `rgba(77,163,255,${0.3 + (d.count / max) * 0.7})`,
              borderRadius: '3px 3px 0 0',
              height: `${Math.max(4, (d.count / max) * 56)}px`,
              transition: 'height 0.4s ease',
            }} />
            <div style={{ fontSize: 8, color: '#71717A', fontFamily: 'JetBrains Mono' }}>
              {new Date(d.date).toLocaleDateString('en-IE', { weekday: 'short' })[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Log entry row ───────────────────────────────────────────────────────── */
function LogRow({ log, isNew }) {
  const color = CAT_COLOR[log.category] || '#71717A';
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '9px 14px',
      background: isNew ? 'rgba(77,163,255,0.06)' : '#0D111C',
      borderRadius: 6,
      borderLeft: `2px solid ${color}`,
      transition: 'background 1s ease',
      animation: isNew ? 'slideIn 0.25s ease' : undefined,
    }}>
      <div style={{ fontSize: 14, flexShrink: 0, width: 20, textAlign: 'center', marginTop: 1 }}>
        {ACTION_ICON[log.action] || '·'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#F0F0F8' }}>{log.label}</span>
          <span style={{ fontSize: '0.65rem', color, fontFamily: 'JetBrains Mono', background: `${color}15`, padding: '1px 6px', borderRadius: 3 }}>
            {CAT_LABELS[log.category] || log.category}
          </span>
          {log.entity_id && (
            <span style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>{log.entity_id}</span>
          )}
        </div>
        {log.detail && (
          <div style={{ fontSize: '0.72rem', color: '#71717A', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {String(log.detail).slice(0, 90)}
          </div>
        )}
        {log.user_email && (
          <div style={{ fontSize: '0.68rem', color: '#71717A', marginTop: 2, fontFamily: 'JetBrains Mono' }}>
            by {log.user_email}
          </div>
        )}
      </div>
      <div style={{ fontSize: '0.68rem', color: '#71717A', fontFamily: 'JetBrains Mono', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {new Date(log.timestamp).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        <div style={{ fontSize: '0.6rem', color: '#4a4a55' }}>
          {new Date(log.timestamp).toLocaleDateString('en-IE', { day: '2-digit', month: 'short' })}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function AuditLog() {
  const [logs, setLogs]           = useState([]);
  const [stats, setStats]         = useState(null);
  const [paused, setPaused]       = useState(false);
  const [category, setCategory]   = useState('');
  const [days, setDays]           = useState(7);
  const [newIds, setNewIds]       = useState(new Set());
  const [lastFetch, setLastFetch] = useState(new Date().toISOString());
  const [liveCount, setLiveCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const intervalRef               = useRef(null);
  const listRef                   = useRef(null);

  /* Initial load */
  const loadLogs = useCallback(() => {
    const catParam = category ? `&category=${category}` : '';
    api.get(`/api/audit?days=${days}&limit=150${catParam}`)
      .then(r => { setLogs(r.data); setConnected(true); })
      .catch(() => setConnected(false));
  }, [days, category]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  /* Load stats */
  useEffect(() => {
    api.get('/api/audit/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  /* Live polling — every 4 seconds */
  useEffect(() => {
    if (paused) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/audit/since/${lastFetch}`);
        const newLogs = res.data;
        if (newLogs.length > 0) {
          const ids = new Set(newLogs.map(l => l.id));
          setNewIds(ids);
          setLogs(prev => [...newLogs, ...prev].slice(0, 200));
          setLiveCount(c => c + newLogs.length);
          setLastFetch(newLogs[newLogs.length - 1].timestamp);
          // Clear "new" highlight after 3 seconds
          setTimeout(() => setNewIds(new Set()), 3000);
        }
      } catch { setConnected(false); }
    }, 4000);
    setConnected(true);
    return () => clearInterval(intervalRef.current);
  }, [paused, lastFetch]);

  /* Export to CSV */
  const exportCSV = () => {
    const filtered = category ? logs.filter(l => l.category === category) : logs;
    const rows = [
      ['Timestamp', 'Action', 'Category', 'Entity', 'User', 'Detail'],
      ...filtered.map(l => [
        l.timestamp, l.action, l.category, l.entity_id || '', l.user_email || '', l.detail || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'aegistrace_audit.csv'; a.click();
  };

  const filteredLogs = category ? logs.filter(l => l.category === category) : logs;

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Live Audit Log</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: connected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${connected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <Circle size={6} style={{ fill: connected ? '#22C55E' : '#EF4444', color: connected ? '#22C55E' : '#EF4444' }}
                className={connected && !paused ? 'spinner' : ''} />
              <span style={{ fontSize: '0.65rem', color: connected ? '#22C55E' : '#EF4444', fontFamily: 'JetBrains Mono' }}>
                {connected ? (paused ? 'PAUSED' : 'LIVE') : 'OFFLINE'}
              </span>
            </div>
            {liveCount > 0 && (
              <span style={{ fontSize: '0.65rem', color: '#4DA3FF', fontFamily: 'JetBrains Mono', background: 'rgba(77,163,255,0.1)', padding: '2px 8px', borderRadius: 10 }}>
                +{liveCount} new
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#71717A' }}>
            Every action in AegisTrace — updated every 4 seconds
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={() => setPaused(p => !p)} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
            {paused ? <><Play size={13}/> Resume</> : <><Pause size={13}/> Pause</>}
          </button>
          <button className="btn-ghost" onClick={loadLogs} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
            <RefreshCw size={13}/> Refresh
          </button>
          <button className="btn-ghost" onClick={exportCSV} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
            <Download size={13}/> Export CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <StatCard label="Total Cases"   value={stats.total_cases}    color="#F0F0F8" />
          <StatCard label="Logins (24h)"  value={stats.logins_24h}     color="#22C55E" />
          <StatCard label="Cases (7d)"    value={stats.cases_7d}       color="#A78BFA" />
          <StatCard label="AI Calls (7d)" value={stats.ai_calls_7d}    color="#EAB308" />
          <StatCard label="VT Lookups (7d)" value={stats.vt_lookups_7d} color="#06B6D4" />
          <StatCard label="Imports (7d)"  value={stats.alerts_7d}      color="#F97316" />
          {stats.activity_by_day && <div style={{ flex: '2 1 200px' }}><ActivityChart data={stats.activity_by_day} /></div>}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['', 'auth', 'case', 'ai', 'intel', 'evidence', 'import', 'admin'].map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{
                fontSize: '0.72rem', padding: '5px 12px', borderRadius: 5, cursor: 'pointer',
                fontFamily: 'JetBrains Mono', border: '1px solid',
                background: category === cat ? `${CAT_COLOR[cat] || 'rgba(77,163,255,1)'}18` : 'transparent',
                borderColor: category === cat ? `${CAT_COLOR[cat] || '#4DA3FF'}50` : 'rgba(255,255,255,0.08)',
                color: category === cat ? (CAT_COLOR[cat] || '#4DA3FF') : '#71717A',
              }}>
              {cat === '' ? 'All' : CAT_LABELS[cat]}
            </button>
          ))}
        </div>
        <select className="at-select" value={days} onChange={e => setDays(Number(e.target.value))} style={{ fontSize: '0.78rem', marginLeft: 'auto' }}>
          <option value={1}>Last 24h</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Count */}
      <div style={{ fontSize: '0.72rem', color: '#71717A', marginBottom: 10, fontFamily: 'JetBrains Mono' }}>
        {filteredLogs.length} event{filteredLogs.length !== 1 ? 's' : ''}
        {category ? ` · filtered by ${CAT_LABELS[category]}` : ''}
        {!paused && <span style={{ color: '#4DA3FF' }}> · auto-refreshing</span>}
      </div>

      {/* Log list */}
      <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filteredLogs.length === 0 ? (
          <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#71717A' }}>
            No events in this period.
          </div>
        ) : (
          filteredLogs.map(log => (
            <LogRow key={log.id} log={log} isNew={newIds.has(log.id)} />
          ))
        )}
      </div>
    </div>
  );
}
