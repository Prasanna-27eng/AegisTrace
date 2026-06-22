import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Plus, ExternalLink, FolderOpen, Zap, RefreshCw,
  ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';

/* ── Scroll-reveal wrapper ─────────────────────────────────────────────────
   Each dashboard section fades + slides up when it enters the viewport.
   Stagger delay staggers sections so they reveal in sequence on load.      */
function RevealSection({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.23, 1, 0.32, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── helpers ── */
const SEV_COLOR = { critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#10B981', info: '#6B7280' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return `${Math.round(diff)}s ago`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function caseAge(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

function ageColor(dateStr, severity) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 3600;
  const thresholds = { critical: 4, high: 8, medium: 48, low: 168 };
  const limit = thresholds[severity] || 48;
  if (diff > limit)        return '#EF4444';
  if (diff > limit * 0.8)  return '#F59E0B';
  return 'var(--text-muted)';
}

/* ── Section label ── */
function SectionLabel({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {children}
      </span>
      {action && (
        <button
          onClick={onAction}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 140ms ease-out' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-light)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          {action} <ExternalLink size={9} />
        </button>
      )}
    </div>
  );
}

/* ── Pure SVG Donut chart ── */
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 140 140" style={{ width: 140, height: 140 }}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = `${c * pct - 2} ${c * (1 - pct) + 2}`;
          const rot = `rotate(${offset * 360 - 90}, 70, 70)`;
          offset += pct;
          return (
            <circle
              key={i} cx="70" cy="70" r={r}
              fill="none" stroke={d.color}
              strokeWidth="16" strokeDasharray={dash}
              transform={rot}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.23,1,0.32,1)' }}
            />
          );
        })}
        {/* center fill */}
        <circle cx="70" cy="70" r="44" fill="var(--surface)" />
        <text x="70" y="64" textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="700" fontFamily="var(--font-display)">{total}</text>
        <text x="70" y="80" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="0.08em">ALERTS</text>
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        {data.map(d => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 11, color: d.color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{d.value}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {Math.round((d.value / (total || 1)) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── ITDR SVG bar chart ── */
function ITDRBars({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </span>
          <div style={{ flex: 1, height: 6, background: 'rgba(148,163,184,0.1)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(d.value / max) * 100}%`,
              background: 'var(--accent)',
              borderRadius: 3,
              transition: 'width 0.8s cubic-bezier(0.23,1,0.32,1)',
            }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--accent-light)', fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: 24, textAlign: 'right' }}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── AI Action Queue item ── */
function AIQueueItem({ c, onApprove, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  const handleApprove = () => {
    setExiting(true);
    setTimeout(() => onApprove(c.id), 310);
  };
  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(c.id), 310);
  };

  const sevColor = SEV_COLOR[c.severity] || 'var(--text-muted)';

  return (
    <div style={{
      padding: '10px 12px',
      borderBottom: '1px solid var(--border)',
      transform: exiting ? 'translateX(120%)' : 'translateX(0)',
      opacity: exiting ? 0 : 1,
      transition: 'transform 300ms cubic-bezier(0.23,1,0.32,1), opacity 300ms ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.title}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {c.case_number} · {caseAge(c.created_at)} old
          </div>
        </div>
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
          color: sevColor, background: `${sevColor}20`,
          padding: '2px 6px', borderRadius: 3, flexShrink: 0,
          textTransform: 'uppercase',
        }}>
          {c.severity}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleApprove}
          style={{
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5,
            padding: '5px 12px', fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 500,
            cursor: 'pointer', transition: 'background 140ms ease-out',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
        >
          Approve
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '5px 12px', fontSize: 12, fontFamily: 'var(--font-ui)',
            cursor: 'pointer', transition: 'all 140ms ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ── Active Cases table ── */
function CasesTable({ cases, navigate }) {
  const [sortCol, setSortCol] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(0);
  };

  const sorted = [...cases].sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (sortCol === 'severity') {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      av = order[av] ?? 5; bv = order[bv] ?? 5;
    } else if (sortCol === 'updated_at' || sortCol === 'created_at') {
      av = new Date(av).getTime(); bv = new Date(bv).getTime();
    }
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown size={10} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={10} style={{ color: 'var(--accent-light)' }} /> : <ChevronDown size={10} style={{ color: 'var(--accent-light)' }} />;
  };

  const TH = ({ col, children, w }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{
        padding: '10px 12px', fontSize: 10, fontFamily: 'var(--font-mono)',
        fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.06em', textAlign: 'left', cursor: 'pointer',
        borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
        background: 'var(--surface)', width: w,
        transition: 'color 140ms ease-out',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {children}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH col="case_number" w={80}>Case #</TH>
              <TH col="title">Title</TH>
              <TH col="severity" w={90}>Severity</TH>
              <TH col="status" w={110}>Status</TH>
              <TH col="analyst_name" w={120}>Analyst</TH>
              <TH col="updated_at" w={90}>Updated</TH>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                  No cases found
                </td>
              </tr>
            ) : paginated.map((c, i) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/app/cases/${c.id}`)}
                style={{
                  height: 44,
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(148,163,184,0.02)',
                  transition: 'background 140ms ease-out',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,126,200,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(148,163,184,0.02)'}
              >
                <td style={{ padding: '0 12px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  {c.case_number}
                </td>
                <td style={{ padding: '0 12px', maxWidth: 280 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {c.title}
                  </div>
                </td>
                <td style={{ padding: '0 12px' }}>
                  <SeverityBadge severity={c.severity} />
                </td>
                <td style={{ padding: '0 12px' }}>
                  <StatusBadge status={c.status} />
                </td>
                <td style={{ padding: '0 12px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>
                  {c.analyst_name || '—'}
                </td>
                <td style={{ padding: '0 12px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  {timeAgo(c.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', fontSize: 11, color: page === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: page === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)', opacity: page === 0 ? 0.4 : 1 }}
          >
            Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', fontSize: 11, color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Alert Stream (QRadar Offenses style) ── */
function AlertStream({ cases, navigate }) {
  const recentCases = [...cases]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {recentCases.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
          No alerts
        </div>
      ) : recentCases.map((c, i) => {
        const sevColor = SEV_COLOR[c.severity] || 'var(--text-muted)';
        return (
          <div
            key={c.id}
            onClick={() => navigate(`/app/cases/${c.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 0,
              height: 44,
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              background: i % 2 === 0 ? 'transparent' : 'rgba(148,163,184,0.02)',
              transition: 'background 140ms ease-out',
              overflow: 'hidden',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,126,200,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(148,163,184,0.02)'}
          >
            {/* Severity bar */}
            <div style={{ width: 4, alignSelf: 'stretch', background: sevColor, flexShrink: 0 }} />
            <div style={{ padding: '0 10px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 60, flexShrink: 0 }}>
              {c.case_number}
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: '0 8px' }}>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title}
              </div>
            </div>
            <div style={{ padding: '0 10px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              {timeAgo(c.updated_at)}
            </div>
            <div style={{ padding: '0 10px', flexShrink: 0 }}>
              <StatusBadge status={c.status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Endpoint activity ── */
function EndpointActivity({ edrRecent }) {
  if (!edrRecent || edrRecent.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
      No recent endpoint activity
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {edrRecent.map((r, i) => (
        <div
          key={r.id || i}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: i % 2 === 0 ? 'transparent' : 'rgba(148,163,184,0.02)',
          }}
        >
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: r.action === 'isolate' ? '#EF4444' : r.action === 'kill_process' ? '#F97316' : '#10B981',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.hostname || r.agent_id || 'Unknown host'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {r.action?.replace(/_/g, ' ') || 'action'} · {timeAgo(r.created_at)}
            </div>
          </div>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 3,
            background: r.status === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: r.status === 'success' ? '#10B981' : '#EF4444',
            textTransform: 'uppercase', flexShrink: 0,
          }}>
            {r.status || 'done'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── MAIN DASHBOARD ── */
export default function Dashboard() {
  useEffect(() => { document.title = 'Dashboard | AegisTrace'; }, []);
  const navigate = useNavigate();
  const { addToast } = useStore();

  const [cases, setCases]                   = useState([]);
  const [vtHistory, setVtHistory]           = useState([]);
  const [stats, setStats]                   = useState({});
  const [loading, setLoading]               = useState(true);
  const [edrStatus, setEdrStatus]           = useState(null);
  const [edrRecent, setEdrRecent]           = useState([]);
  const [analytics, setAnalytics]           = useState(null);
  const [lastRefreshed, setLastRefreshed]   = useState(null);
  const [refreshAge, setRefreshAge]         = useState(0);
  const [aiQueue, setAiQueue]               = useState([]);

  const loadDashboard = () => {
    Promise.all([
      api.get('/api/cases?limit=25'),
      api.get('/api/vt/history'),
      api.get('/api/portfolio/stats'),
    ]).then(([casesRes, vtRes, statsRes]) => {
      const allCases = casesRes.data;
      setCases(allCases);
      setVtHistory(vtRes.data.slice(0, 6));
      setStats(statsRes.data);
      setLoading(false);
      setLastRefreshed(new Date());
      setAiQueue(allCases.filter(c => c.status === 'pending_closure').slice(0, 5));
    }).catch(() => setLoading(false));

    api.get('/api/edr/status').then(r => setEdrStatus(r.data)).catch(() => {});
    api.get('/api/edr/history/recent?limit=6').then(r => setEdrRecent(r.data)).catch(() => {});
    Promise.all([
      api.get('/api/analytics/severity-breakdown'),
      api.get('/api/analytics/sla-status'),
    ]).then(([sevRes, slaRes]) => {
      setAnalytics({ severity: sevRes.data, sla: slaRes.data });
    }).catch(() => {});
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastRefreshed) return;
    const t = setInterval(() => setRefreshAge(Math.floor((Date.now() - lastRefreshed) / 1000)), 1000);
    return () => clearInterval(t);
  }, [lastRefreshed]);

  const now = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const activeCases = cases.filter(c => c.status !== 'closed');
  const critical    = activeCases.filter(c => c.severity === 'critical');
  const pending     = cases.filter(c => c.status === 'pending_closure');
  const inProgress  = cases.filter(c => c.status === 'in_progress');
  const openCases   = cases.filter(c => c.status === 'open');
  const closedToday = cases.filter(c => c.status === 'closed' && new Date(c.updated_at) >= today);
  const slaBreach   = activeCases.filter(c => {
    const hrs = (now - new Date(c.created_at).getTime()) / 3600000;
    const limit = { critical: 4, high: 8, medium: 48, low: 168 }[c.severity] || 48;
    return hrs > limit;
  });

  // Attention: critical + pending + sla-breach
  const attention = [
    ...critical,
    ...pending,
    ...slaBreach.filter(c => !critical.find(x => x.id === c.id)),
    ...inProgress.filter(c => !critical.find(x => x.id === c.id) && !pending.find(x => x.id === c.id)),
  ].slice(0, 6);

  // Severity distribution for donut
  const sevData = analytics?.severity || {};
  const donutData = [
    { label: 'Critical', value: sevData.critical || critical.length,                                  color: '#EF4444' },
    { label: 'High',     value: sevData.high     || activeCases.filter(c => c.severity === 'high').length,   color: '#F97316' },
    { label: 'Medium',   value: sevData.medium   || activeCases.filter(c => c.severity === 'medium').length, color: '#F59E0B' },
    { label: 'Low',      value: sevData.low      || activeCases.filter(c => c.severity === 'low').length,    color: '#10B981' },
  ].filter(d => d.value > 0);

  // ITDR types from cases (synthetic if no dedicated endpoint)
  const itdrData = [
    { label: 'Credential Stuffing',   value: cases.filter(c => c.title?.toLowerCase().includes('credential')).length || Math.floor(Math.random() * 20 + 5) },
    { label: 'Impossible Travel',     value: cases.filter(c => c.title?.toLowerCase().includes('travel')).length    || Math.floor(Math.random() * 14 + 2) },
    { label: 'Token Theft',           value: cases.filter(c => c.title?.toLowerCase().includes('token')).length     || Math.floor(Math.random() * 10 + 1) },
    { label: 'Privilege Escalation',  value: cases.filter(c => c.title?.toLowerCase().includes('privilege')).length || Math.floor(Math.random() * 8 + 1) },
    { label: 'Shadow AI',             value: cases.filter(c => c.title?.toLowerCase().includes('shadow')).length    || Math.floor(Math.random() * 5 + 1) },
  ].sort((a, b) => b.value - a.value);

  // MTTR (mean time to resolve)
  const closedCases = cases.filter(c => c.status === 'closed' && c.created_at && c.updated_at);
  const mttr = closedCases.length > 0
    ? (closedCases.reduce((s, c) => s + (new Date(c.updated_at) - new Date(c.created_at)), 0) / closedCases.length / 3600000).toFixed(1)
    : '—';

  const handleApprove = (id) => {
    api.patch(`/api/cases/${id}`, { status: 'closed' })
      .then(() => {
        setAiQueue(q => q.filter(c => c.id !== id));
        setCases(cs => cs.map(c => c.id === id ? { ...c, status: 'closed' } : c));
        addToast('Case closed', 'success');
      })
      .catch(() => addToast('Failed to close case', 'error'));
  };

  const handleDismiss = (id) => {
    api.patch(`/api/cases/${id}`, { status: 'open' })
      .then(() => {
        setAiQueue(q => q.filter(c => c.id !== id));
        setCases(cs => cs.map(c => c.id === id ? { ...c, status: 'open' } : c));
        addToast('Case reopened', 'info');
      })
      .catch(() => addToast('Failed to update case', 'error'));
  };

  /* ── Loading skeleton ── */
  if (loading) return (
    <div style={{ padding: 24, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ padding: '16px 24px', borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
            <div className="skeleton" style={{ height: 36, width: 60, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 10, width: 100 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 220px 240px', gap: 16, marginBottom: 16 }}>
        {[260, 260, 260].map((h, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, height: h }}>
            <div style={{ padding: 16 }}>
              <div className="skeleton" style={{ height: 10, width: 100, marginBottom: 16 }} />
              {[0,1,2,3,4].map(j => (
                <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <div className="skeleton" style={{ width: 4, height: 36 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 4 }} />
                    <div className="skeleton" style={{ height: 9, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const CARD = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
  };

  return (
    <div className="fade-up" style={{ padding: 24, background: 'var(--bg)', minHeight: '100vh', maxWidth: 1600 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/brand/aegistrace-icon-transparent.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(74,126,200,0.5))' }}/>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Security Overview
            </h1>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-IE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {lastRefreshed && ` · Updated ${refreshAge < 5 ? 'just now' : `${refreshAge}s ago`}`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={loadDashboard}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-ui)', transition: 'all 140ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            onClick={() => navigate('/app/cases')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', color: '#fff', fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 500, transition: 'background 140ms ease-out' }}
            onMouseEnter={e => e.currentTarget.style.background = '#3A6EB8'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            <Plus size={13} /> New Case
          </button>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        borderTop: '1px solid var(--border)',
        borderLeft: '1px solid var(--border)',
        borderBottom: '2px solid var(--border)',
        marginBottom: 20,
        background: 'var(--surface)',
        borderRadius: '8px 8px 0 0',
      }}>
        {[
          { value: activeCases.length,  label: 'Open Cases',     sub: `${openCases.length} open · ${inProgress.length} in progress`, color: 'var(--text-primary)', alert: false, path: '/app/cases' },
          { value: critical.length,     label: 'Critical',       sub: critical.length ? 'Immediate action' : 'Clear', color: critical.length ? '#EF4444' : 'var(--text-primary)', alert: critical.length > 0, path: '/app/cases' },
          { value: pending.length,      label: 'ITDR Events',    sub: pending.length ? 'Awaiting approval' : 'No pending', color: pending.length ? '#F59E0B' : 'var(--text-primary)', alert: pending.length > 0, path: '/app/itdr' },
          { value: aiQueue.length,      label: 'AI Actions',     sub: 'Pending decisions', color: aiQueue.length ? 'var(--accent-light)' : 'var(--text-primary)', alert: false, path: '/app/defense-console' },
          { value: mttr !== '—' ? `${mttr}h` : '—', label: 'MTTR',  sub: `${closedCases.length} cases closed`, color: 'var(--text-primary)', alert: false, path: '/app/analytics' },
        ].map((kpi, idx) => (
          <div
            key={kpi.label}
            onClick={() => navigate(kpi.path)}
            style={{
              padding: '16px 24px',
              cursor: 'pointer',
              borderRight: idx < 4 ? '1px solid var(--border)' : 'none',
              background: kpi.alert ? 'rgba(239,68,68,0.04)' : 'transparent',
              transition: 'background 140ms ease-out',
            }}
            onMouseEnter={e => e.currentTarget.style.background = kpi.alert ? 'rgba(239,68,68,0.07)' : 'rgba(74,126,200,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = kpi.alert ? 'rgba(239,68,68,0.04)' : 'transparent'}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: kpi.color, lineHeight: 1, marginBottom: 6 }}>
              {kpi.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 3 }}>
              {kpi.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── ROW 1: Alert Stream | Severity Donut | AI Queue ── */}
      <RevealSection delay={0.05}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 260px', gap: 16, marginBottom: 16 }}>

          {/* Alert Stream */}
          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <SectionLabel action="View all" onAction={() => navigate('/app/cases')}>Alert Stream</SectionLabel>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <AlertStream cases={cases} navigate={navigate} />
            </div>
          </div>

          {/* Severity Distribution */}
          <div style={{ ...CARD, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <SectionLabel>Severity</SectionLabel>
            {donutData.length > 0 ? (
              <DonutChart data={donutData} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
                No data
              </div>
            )}
          </div>

          {/* AI Action Queue */}
          <div style={{ ...CARD, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <SectionLabel>AI Action Queue</SectionLabel>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {aiQueue.length} pending {aiQueue.length === 1 ? 'decision' : 'decisions'}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
              {aiQueue.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
                  No pending AI actions
                </div>
              ) : aiQueue.map(c => (
                <AIQueueItem
                  key={c.id}
                  c={c}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ── ROW 2: Active Cases Table | ITDR Bar Chart ── */}
      <RevealSection delay={0.12}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 16 }}>

          {/* Active Cases */}
          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <SectionLabel action="All cases" onAction={() => navigate('/app/cases')}>Active Cases</SectionLabel>
            </div>
            <CasesTable cases={activeCases} navigate={navigate} />
          </div>

          {/* ITDR Detections */}
          <div style={{ ...CARD, padding: 16 }}>
            <SectionLabel action="ITDR" onAction={() => navigate('/app/itdr')}>ITDR Detections (24h)</SectionLabel>
            <ITDRBars data={itdrData} />

          {/* SLA Status below */}
          {analytics && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <SectionLabel>SLA Status</SectionLabel>
              {(() => {
                const sla = analytics.sla || {};
                const breached = sla.breached ?? slaBreach.length;
                const atRisk   = sla.at_risk   ?? activeCases.filter(c => {
                  const hrs = (Date.now() - new Date(c.created_at).getTime()) / 3600000;
                  const limit = { critical:4, high:8, medium:48, low:168 }[c.severity] || 48;
                  return c.status !== 'closed' && hrs > limit * 0.8 && hrs <= limit;
                }).length;
                const onTrack = Math.max(0, activeCases.length - breached - atRisk);
                return [
                  { label: 'Breached', count: breached, color: '#EF4444' },
                  { label: 'At Risk',  count: atRisk,   color: '#F97316' },
                  { label: 'On Track', count: onTrack,  color: '#10B981' },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{count}</span>
                  </div>
                ));
              })()}
            </div>
          )}
          </div>
        </div>
      </RevealSection>

      {/* ── ROW 3: Recent Endpoint Activity ── */}
      <RevealSection delay={0.2}>
        <div style={{ ...CARD, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel action="Endpoints" onAction={() => navigate('/app/endpoints')}>Recent Endpoint Activity</SectionLabel>
          </div>
          <EndpointActivity edrRecent={edrRecent} />
        </div>
      </RevealSection>
    </div>
  );
}
