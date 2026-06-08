import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, Activity, Shield, Mail, BarChart2, ExternalLink,
  Clock, TrendingUp, CheckCircle, Zap, GitMerge, Eye, FolderOpen,
  Lock, Unlock, XCircle, Terminal, Cpu
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';

const SEV_COLOR  = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#8FAFC0', info:'#888888' };
const STAT_COLOR = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#8FAFC0', info:'#787878' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff/60)}m ago`;
  if (diff < 86400)return `${Math.round(diff/3600)}h ago`;
  return `${Math.round(diff/86400)}d ago`;
}

function caseAge(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff/60)}m`;
  if (diff < 86400)return `${Math.round(diff/3600)}h`;
  return `${Math.round(diff/86400)}d`;
}

function ageColor(dateStr, severity) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 3600; // hours
  const thresholds = { critical: 4, high: 8, medium: 48, low: 168 };
  const limit = thresholds[severity] || 48;
  if (diff > limit) return '#EF4444';
  if (diff > limit * 0.8) return '#EAB308';
  return '#888888';
}

function AttentionRow({ c, navigate }) {
  const age = caseAge(c.created_at);
  const color = ageColor(c.created_at, c.severity);
  return (
    <div
      onClick={() => navigate(`/app/cases/${c.id}`)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 6, cursor: 'pointer', background: '#111111', transition: 'background 0.15s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = '#111111'}
    >
      {c.severity === 'critical' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#5A8A9F' }} />}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: c.severity === 'critical' ? 6 : 0 }}>
        <div style={{ fontSize: '0.83rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
        <div style={{ fontSize: '0.67rem', color: '#787878', fontFamily: 'JetBrains Mono', marginTop: 1 }}>
          {c.case_number} · {c.analyst_name || 'Unassigned'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <SeverityBadge severity={c.severity} />
        <span style={{ fontSize: '0.67rem', color: color, fontFamily: 'JetBrains Mono', minWidth: 26, textAlign: 'right' }}>{age}</span>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, subColor, color, onClick }) {
  return (
    <div
      className="at-card"
      onClick={onClick}
      style={{ padding: '14px 16px', cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'rgba(90,138,159,0.3)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.68rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <Icon size={13} style={{ color: color || '#787878' }} />
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color: color || '#EBEBEB', fontFamily: 'JetBrains Mono', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.68rem', marginTop: 5, color: subColor || '#787878' }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [cases, setCases]           = useState([]);
  const [vtHistory, setVtHistory]   = useState([]);
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [edrStatus, setEdrStatus]   = useState(null);
  const [edrRecent, setEdrRecent]   = useState([]);
  const [analytics, setAnalytics]   = useState(null);

  const loadDashboard = () => {
    Promise.all([
      api.get('/api/cases?limit=25'),
      api.get('/api/vt/history'),
      api.get('/api/portfolio/stats'),
    ]).then(([casesRes, vtRes, statsRes]) => {
      setCases(casesRes.data);
      setVtHistory(vtRes.data.slice(0, 6));
      setStats(statsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));

    // EDR status + recent actions (non-blocking)
    api.get('/api/edr/status').then(r => setEdrStatus(r.data)).catch(() => {});
    api.get('/api/edr/history/recent?limit=6').then(r => setEdrRecent(r.data)).catch(() => {});
    // Analytics trends (non-blocking)
    Promise.all([
      api.get('/api/analytics/severity-breakdown'),
      api.get('/api/analytics/sla-status'),
    ]).then(([sevRes, slaRes]) => {
      setAnalytics({ severity: sevRes.data, sla: slaRes.data });
    }).catch(() => {});
  };

  useEffect(() => {
    loadDashboard();
    // Live refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const now = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const activeCases     = cases.filter(c => c.status !== 'closed');
  const critical        = activeCases.filter(c => c.severity === 'critical');
  const pending         = cases.filter(c => c.status === 'pending_closure');
  const inProgress      = cases.filter(c => c.status === 'in_progress');
  const openCases       = cases.filter(c => c.status === 'open');
  const closedToday     = cases.filter(c => c.status === 'closed' && new Date(c.updated_at) >= today);
  const recentCases     = [...cases].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6);
  const maliciousVt     = vtHistory.filter(v => v.verdict === 'malicious').length;
  const slaBreach       = activeCases.filter(c => {
    const hrs = (now - new Date(c.created_at).getTime()) / 3600000;
    const limit = { critical: 4, high: 8, medium: 48, low: 168 }[c.severity] || 48;
    return hrs > limit;
  });

  // What needs attention — sorted by urgency
  const attention = [
    ...critical,
    ...pending,
    ...slaBreach.filter(c => !critical.find(x => x.id === c.id)),
    ...inProgress.filter(c => !critical.find(x => x.id === c.id) && !pending.find(x => x.id === c.id)),
  ].slice(0, 6);

  if (loading) return (
    <div style={{ padding: '28px 32px', maxWidth: 1440, background: '#000000', minHeight: '100vh' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <div className="skeleton" style={{ height: 10, width: 180, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 30, width: 140, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 9, width: 220 }} />
        </div>
        <div className="skeleton" style={{ height: 36, width: 110, borderRadius: 0 }} />
      </div>
      {/* KPI grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 32, background: 'rgba(255,255,255,0.06)' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: '#080808', padding: '28px 24px' }}>
            <div className="skeleton" style={{ height: 44, width: 56, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 9, width: 90, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 8, width: 130 }} />
          </div>
        ))}
      </div>
      {/* Main grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#080808' }}>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 12, width: '62%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 9, width: '38%' }} />
              </div>
              <div className="skeleton" style={{ height: 20, width: 54 }} />
              <div className="skeleton" style={{ height: 20, width: 72 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[120, 100, 96].map((h, i) => (
            <div key={i} style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', padding: 20 }}>
              <div className="skeleton" style={{ height: 9, width: 110, marginBottom: 16 }} />
              {[0, 1, 2, 3].map(j => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div className="skeleton" style={{ height: 8, width: 46 }} />
                  <div className="skeleton" style={{ flex: 1, height: 3 }} />
                  <div className="skeleton" style={{ height: 12, width: 16 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const MONO = { fontFamily: 'JetBrains Mono, monospace' };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440, background: '#000000', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <div style={{ fontSize: '0.62rem', color: '#505050', letterSpacing: '0.2em', textTransform: 'uppercase', ...MONO, marginBottom: 8 }}>
            AEGISTRACE // CONTROL PLANE
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 300, letterSpacing: '-0.04em', color: '#EBEBEB', lineHeight: 1, marginBottom: 6 }}>
            Dashboard
          </h1>
          <div style={{ fontSize: '0.68rem', color: '#505050', ...MONO }}>
            {new Date().toLocaleDateString('en-IE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}{new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })} UTC
          </div>
        </div>
        <button onClick={() => navigate('/app/cases')}
          style={{ background: '#FFFFFF', color: '#000000', border: 'none', padding: '10px 22px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', ...MONO, display: 'flex', alignItems: 'center', gap: 7, transition: 'opacity 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <Plus size={12} /> NEW CASE
        </button>
      </div>

      {/* ── BIG KPI ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 32, background: 'rgba(255,255,255,0.06)' }}>
        {[
          { value: activeCases.length,    label: 'Active Cases',    sub: `${openCases.length} open · ${inProgress.length} in progress`, color: '#EBEBEB', alert: false, path: '/app/cases' },
          { value: critical.length,        label: 'Critical',        sub: critical.length ? 'Immediate action required' : 'No critical cases', color: critical.length ? '#EF4444' : '#EBEBEB', alert: critical.length > 0, path: '/app/cases' },
          { value: slaBreach.length,       label: 'SLA Breached',    sub: slaBreach.length ? 'Overdue right now' : 'All within SLA', color: slaBreach.length ? '#F97316' : '#EBEBEB', alert: slaBreach.length > 0, path: '/app/cases' },
          { value: closedToday.length,     label: 'Closed Today',    sub: `${stats.total_cases || cases.length} total cases`, color: '#22C55E', alert: false, path: '/app/cases' },
        ].map(kpi => (
          <div key={kpi.label} onClick={() => navigate(kpi.path)}
            style={{ background: kpi.alert ? 'rgba(239,68,68,0.04)' : '#080808', padding: '28px 24px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = kpi.alert ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = kpi.alert ? 'rgba(239,68,68,0.04)' : '#080808'}>
            <div style={{ fontSize: '3rem', fontWeight: 300, color: kpi.color, lineHeight: 1, letterSpacing: '-0.04em', ...MONO, marginBottom: 10 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#EBEBEB', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{kpi.label}</div>
            <div style={{ fontSize: '0.65rem', color: '#505050', ...MONO }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ATTENTION ZONE ── */}
      {attention.length > 0 && (
        <div style={{ marginBottom: 24, padding: '16px 20px', background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderLeft: '2px solid #5A8A9F' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={12} style={{ color: '#5A8A9F' }} />
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#5A8A9F', textTransform: 'uppercase', letterSpacing: '0.14em', ...MONO }}>
              Needs Attention
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: '#505050', cursor: 'pointer', ...MONO }} onClick={() => navigate('/app/cases')}>
              VIEW ALL →
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {attention.map(c => <AttentionRow key={c.id} c={c} navigate={navigate} />)}
          </div>
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>

        {/* ── LEFT: Case Queue ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: '0.62rem', color: '#505050', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO }}>
              Case Queue
            </div>
            <button onClick={() => navigate('/app/cases')}
              style={{ background: 'none', border: 'none', color: '#505050', cursor: 'pointer', fontSize: '0.62rem', ...MONO, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 4 }}>
              ALL CASES <ExternalLink size={10} />
            </button>
          </div>

          {recentCases.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)', background: '#080808' }}>
              <FolderOpen size={24} style={{ color: 'rgba(255,255,255,0.08)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.82rem', color: '#505050', marginBottom: 6 }}>No cases yet</div>
              <div style={{ fontSize: '0.7rem', color: '#383838', marginBottom: 20, ...MONO }}>Start your first investigation</div>
              <button onClick={() => navigate('/app/cases')}
                style={{ background: '#FFFFFF', color: '#000000', border: 'none', padding: '9px 20px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', ...MONO, letterSpacing: '0.1em' }}>
                + NEW CASE
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
              {recentCases.map((c, i) => {
                const sevColors = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#22C55E', info: '#505050' };
                const sc = sevColors[c.severity] || '#505050';
                return (
                  <div key={c.id} onClick={() => navigate(`/app/cases/${c.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#080808', cursor: 'pointer', transition: 'background 0.15s', borderLeft: `2px solid ${sc}` }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = '#080808'}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#EBEBEB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{c.title}</div>
                      <div style={{ fontSize: '0.64rem', color: '#505050', ...MONO, display: 'flex', gap: 10 }}>
                        <span>{c.case_number}</span>
                        {c.analyst_name && <span>{c.analyst_name}</span>}
                        <span style={{ color: ageColor(c.created_at, c.severity) }}>{caseAge(c.created_at)} old</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <SeverityBadge severity={c.severity} />
                      <StatusBadge status={c.status} />
                      <span style={{ fontSize: '0.62rem', color: '#383838', ...MONO, minWidth: 38, textAlign: 'right' }}>{timeAgo(c.updated_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Stats column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Severity breakdown */}
          {analytics && (
            <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: '0.62rem', color: '#505050', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO }}>Severity Breakdown</div>
                <button onClick={() => navigate('/app/analytics')} style={{ background: 'none', border: 'none', color: '#383838', cursor: 'pointer', fontSize: '0.6rem', ...MONO }}>ANALYTICS →</button>
              </div>
              {(() => {
                const sevData = analytics.severity || {};
                const order = ['critical', 'high', 'medium', 'low', 'info'];
                const colors = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#22C55E', info: '#505050' };
                const total = order.reduce((s, k) => s + (sevData[k] || 0), 0) || 1;
                return order.map(sev => {
                  const count = sevData[sev] || 0;
                  const pct   = Math.round((count / total) * 100);
                  return (
                    <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                      <span style={{ fontSize: '0.6rem', color: colors[sev], textTransform: 'uppercase', letterSpacing: '0.08em', width: 48, flexShrink: 0, ...MONO }}>{sev}</span>
                      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors[sev], opacity: count ? 0.9 : 0 }} />
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: count ? colors[sev] : '#383838', width: 18, textAlign: 'right', flexShrink: 0, ...MONO }}>{count}</span>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* SLA Status */}
          {analytics && (
            <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
              <div style={{ fontSize: '0.62rem', color: '#505050', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO, marginBottom: 16 }}>SLA Status</div>
              {(() => {
                const sla = analytics.sla || {};
                const breached = sla.breached || slaBreach.length;
                const atRisk   = sla.at_risk  || activeCases.filter(c => {
                  const hrs = (Date.now() - new Date(c.created_at).getTime()) / 3600000;
                  const limit = { critical:4, high:8, medium:48, low:168 }[c.severity] || 48;
                  return c.status !== 'closed' && hrs > limit * 0.8 && hrs <= limit;
                }).length;
                const onTrack = Math.max(0, activeCases.length - breached - atRisk);
                return [
                  { label: 'Breached', count: breached, color: '#EF4444' },
                  { label: 'At Risk',  count: atRisk,   color: '#F97316' },
                  { label: 'On Track', count: onTrack,  color: '#22C55E' },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: '0.74rem', color: '#787878' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 300, color, ...MONO }}>{count}</span>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
            <div style={{ fontSize: '0.62rem', color: '#505050', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO, marginBottom: 14 }}>Quick Access</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
              {[
                { label: 'VT Lookup',      path: '/app/vt-lookup'     },
                { label: 'Email Forensics',path: '/app/email'          },
                { label: 'Terminal Lab',   path: '/app/terminal-lab'   },
                { label: 'Threat Hunt',    path: '/app/hunt'           },
                { label: 'Identity Graph', path: '/app/identity-graph' },
                { label: 'Tools Hub',      path: '/app/tools'          },
              ].map(({ label, path }) => (
                <button key={path} onClick={() => navigate(path)}
                  style={{ background: '#080808', border: 'none', color: '#787878', padding: '11px 12px', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left', ...MONO, transition: 'color 0.15s, background 0.15s', letterSpacing: '0.02em' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#EBEBEB'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#787878'; e.currentTarget.style.background = '#080808'; }}>
                  {label} →
                </button>
              ))}
            </div>
          </div>

          {/* Recent VT */}
          {vtHistory.length > 0 && (
            <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.06)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: '0.62rem', color: '#505050', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO }}>Recent VT Lookups</div>
                <button onClick={() => navigate('/app/vt-lookup')} style={{ background: 'none', border: 'none', color: '#383838', cursor: 'pointer', fontSize: '0.6rem', ...MONO }}>ALL →</button>
              </div>
              {vtHistory.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#505050', ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{v.ioc}</span>
                  <span className={`verdict-${v.verdict}`} style={{ fontSize: '0.6rem', fontWeight: 700, ...MONO, flexShrink: 0 }}>{v.verdict?.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
