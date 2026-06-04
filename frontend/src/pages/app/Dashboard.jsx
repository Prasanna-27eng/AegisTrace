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

const SEV_COLOR  = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#A78BFA', info:'#71717A' };
const STAT_COLOR = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#A78BFA', info:'#71717A' };

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
  return '#71717A';
}

function AttentionRow({ c, navigate }) {
  const age = caseAge(c.created_at);
  const color = ageColor(c.created_at, c.severity);
  return (
    <div
      onClick={() => navigate(`/app/cases/${c.id}`)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 6, cursor: 'pointer', background: '#0D111C', transition: 'background 0.15s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = '#0D111C'}
    >
      {c.severity === 'critical' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#4DA3FF' }} />}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: c.severity === 'critical' ? 6 : 0 }}>
        <div style={{ fontSize: '0.83rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
        <div style={{ fontSize: '0.67rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginTop: 1 }}>
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
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'rgba(77,163,255,0.3)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.68rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <Icon size={13} style={{ color: color || '#71717A' }} />
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color: color || '#F0F0F8', fontFamily: 'JetBrains Mono', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.68rem', marginTop: 5, color: subColor || '#71717A' }}>{sub}</div>}
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
    <div style={{ padding: 40, color: '#71717A', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <Activity size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: '0.82rem' }}>Loading dashboard…</div>
    </div>
  );

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Dashboard</h1>
          <div style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-IE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <button className="btn-accent" onClick={() => navigate('/app/cases')} style={{ fontSize: '0.8rem' }}>
          <Plus size={13} /> New Case
        </button>
      </div>

      {/* ── ATTENTION ZONE ── */}
      {attention.length > 0 && (
        <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(77,163,255,0.04)', border: '1px solid rgba(77,163,255,0.15)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <Zap size={13} style={{ color: '#4DA3FF' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4DA3FF', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono' }}>
              Needs attention now
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#71717A', cursor: 'pointer' }} onClick={() => navigate('/app/cases')}>
              View all →
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {attention.map(c => <AttentionRow key={c.id} c={c} navigate={navigate} />)}
          </div>
        </div>
      )}

      {/* ── PRIMARY STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        <StatTile icon={AlertTriangle} label="Critical Open"   value={critical.length}     color="#4DA3FF"  sub={critical.length ? 'Act now' : 'None active'} subColor={critical.length ? '#EF4444' : '#22C55E'} onClick={() => navigate('/app/cases?severity=critical&status=open')} />
        <StatTile icon={Clock}        label="Pending Closure"  value={pending.length}      color="#EAB308"  sub={pending.length ? 'Awaiting review' : 'Queue clear'} subColor={pending.length ? '#EAB308' : '#22C55E'} onClick={() => navigate('/app/cases?status=pending_closure')} />
        <StatTile icon={Activity}     label="In Progress"      value={inProgress.length}   color="#A78BFA"  sub={`${openCases.length} open`} subColor="#71717A" onClick={() => navigate('/app/cases?status=in_progress')} />
        <StatTile icon={TrendingUp}   label="SLA Breach"       value={slaBreach.length}    color={slaBreach.length ? '#EF4444' : '#22C55E'} sub={slaBreach.length ? 'Overdue' : 'All within SLA'} subColor={slaBreach.length ? '#EF4444' : '#22C55E'} />
        <StatTile icon={CheckCircle}  label="Closed Today"     value={closedToday.length}  color="#22C55E"  sub="Cases resolved" />
        <StatTile icon={Shield}       label="VT Today"         value={vtHistory.length}    color="#A78BFA"  sub={maliciousVt ? `${maliciousVt} malicious` : 'None malicious'} subColor={maliciousVt ? '#EF4444' : '#71717A'} onClick={() => navigate('/app/vt-lookup')} />
        <StatTile icon={GitMerge}     label="Total IOCs"       value={stats.total_iocs || 0} color="#22C55E" sub="Correlated" />
        <StatTile icon={BarChart2}    label="Total Cases"      value={stats.total_cases || cases.length} color="#F0F0F8" sub={`${stats.closed_cases || closedToday.length} closed`} subColor="#71717A" />
      </div>

      {/* ── ANALYTICS TRENDS ── */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>

          {/* Severity breakdown bar chart */}
          <div className="at-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-label" style={{ margin: 0 }}>Severity Breakdown</div>
              <button onClick={() => navigate('/app/analytics')} style={{ fontSize: '0.68rem', color: '#71717A', background: 'none', border: 'none', cursor: 'pointer' }}>Full analytics →</button>
            </div>
            {(() => {
              const sevData = analytics.severity || {};
              const order = ['critical', 'high', 'medium', 'low', 'info'];
              const colors = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#A78BFA', info: '#71717A' };
              const total = order.reduce((s, k) => s + (sevData[k] || 0), 0) || 1;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {order.map(sev => {
                    const count = sevData[sev] || 0;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.62rem', fontFamily: 'JetBrains Mono', color: colors[sev], textTransform: 'uppercase', letterSpacing: '0.05em', width: 50, flexShrink: 0 }}>{sev}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: colors[sev], borderRadius: 3, transition: 'width 0.6s ease', opacity: count ? 1 : 0 }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: count ? colors[sev] : '#71717A', width: 20, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* SLA status */}
          <div className="at-card" style={{ padding: '14px 16px' }}>
            <div className="section-label" style={{ marginBottom: 12 }}>SLA Status</div>
            {(() => {
              const sla = analytics.sla || {};
              const breached   = sla.breached   || slaBreach.length;
              const atRisk     = sla.at_risk    || activeCases.filter(c => {
                const hrs = (Date.now() - new Date(c.created_at).getTime()) / 3600000;
                const limit = { critical:4, high:8, medium:48, low:168 }[c.severity] || 48;
                return c.status !== 'closed' && hrs > limit * 0.8 && hrs <= limit;
              }).length;
              const onTrack = Math.max(0, activeCases.length - breached - atRisk);
              const items = [
                { label: 'Breached',  count: breached, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
                { label: 'At Risk',   count: atRisk,   color: '#EAB308', bg: 'rgba(234,179,8,0.08)'  },
                { label: 'On Track',  count: onTrack,  color: '#22C55E', bg: 'rgba(34,197,94,0.08)'  },
              ];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {items.map(({ label, count, color, bg }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 6, background: bg, border: `1px solid ${color}22` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}66` }} />
                        <span style={{ fontSize: '0.76rem', color: '#B0B0C0' }}>{label}</span>
                      </div>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color, fontFamily: 'JetBrains Mono' }}>{count}</span>
                    </div>
                  ))}
                  <div style={{ paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem', color: '#71717A', fontFamily: 'JetBrains Mono', textAlign: 'right' }}>
                    {activeCases.length} active cases total
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>

        {/* Case Queue */}
        <div className="at-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-label" style={{ margin: 0 }}>Case Queue</div>
            <button onClick={() => navigate('/app/cases')} style={{ fontSize: '0.7rem', color: '#4DA3FF', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              All cases <ExternalLink size={10} />
            </button>
          </div>

          {recentCases.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <FolderOpen size={28} style={{ color: 'rgba(77,163,255,0.2)', margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.84rem', fontWeight: 500, marginBottom: 6 }}>No cases yet</div>
              <div style={{ fontSize: '0.76rem', color: '#71717A', marginBottom: 14 }}>Start your first investigation to build your SOC queue.</div>
              <button className="btn-accent" onClick={() => navigate('/app/cases')} style={{ fontSize: '0.78rem' }}>
                <Plus size={13} /> Create First Case
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {recentCases.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/app/cases/${c.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#0D111C', borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0D111C'}
                >
                  {c.severity === 'critical' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#4DA3FF' }} />}
                  <div style={{ flex: 1, minWidth: 0, paddingLeft: c.severity === 'critical' ? 6 : 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize: '0.67rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginTop: 1, display: 'flex', gap: 8 }}>
                      <span>{c.case_number}</span>
                      {c.analyst_name && <span>· {c.analyst_name}</span>}
                      <span style={{ color: ageColor(c.created_at, c.severity) }}>· {caseAge(c.created_at)} old</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                    <SeverityBadge severity={c.severity} />
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#71717A', fontFamily: 'JetBrains Mono', flexShrink: 0, minWidth: 40, textAlign: 'right' }}>
                    {timeAgo(c.updated_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Pending closure alert */}
          {pending.length > 0 && (
            <div style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.18)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#EAB308', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={12} /> {pending.length} case{pending.length > 1 ? 's' : ''} pending closure
              </div>
              {pending.slice(0, 3).map(c => (
                <div key={c.id} onClick={() => navigate(`/app/cases/${c.id}`)} style={{ fontSize: '0.76rem', color: '#71717A', cursor: 'pointer', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{c.title}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', flexShrink: 0 }}>{caseAge(c.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent VT lookups */}
          <div className="at-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="section-label" style={{ margin: 0 }}>Recent VT Lookups</div>
              <button onClick={() => navigate('/app/vt-lookup')} style={{ fontSize: '0.68rem', color: '#71717A', background: 'none', border: 'none', cursor: 'pointer' }}>All →</button>
            </div>
            {vtHistory.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', color: '#71717A', fontSize: '0.78rem' }}>
                No lookups yet.{' '}
                <span style={{ color: '#A78BFA', cursor: 'pointer' }} onClick={() => navigate('/app/vt-lookup')}>Run one →</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {vtHistory.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', padding: '3px 0' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', color: '#B0B0C0', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150, fontSize: '0.72rem' }}>{v.ioc}</span>
                    <span className={`verdict-${v.verdict}`} style={{ fontSize: '0.65rem', fontWeight: 600, fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{v.verdict?.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── EDR Status Widget ── */}
          <div className="at-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} style={{ color: '#22C55E' }} />
                <div className="section-label" style={{ margin: 0 }}>EDR Platforms</div>
              </div>
            </div>

            {/* Platform dots */}
            {edrStatus ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: edrRecent.length ? 10 : 0 }}>
                {Object.entries(edrStatus.platforms).map(([name, info]) => (
                  <div key={name} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 8px', borderRadius: 4, fontSize: '0.68rem',
                    background: info.configured ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    opacity: info.configured ? 1 : 0.45,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: info.connected ? '#22C55E' : (info.configured ? '#EF4444' : '#71717A'),
                      boxShadow: info.connected ? '0 0 5px #22C55E44' : 'none',
                    }} />
                    <span style={{ fontFamily: 'JetBrains Mono', textTransform: 'uppercase', fontSize: '0.62rem' }}>{name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: '#71717A', marginBottom: 8 }}>Loading EDR status…</div>
            )}

            {/* Recent EDR Actions */}
            {edrRecent.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Recent Actions</div>
                {edrRecent.map(a => {
                  const ActionIcon = { isolate: Lock, un_isolate: Unlock, kill_process: XCircle, run_command: Terminal, list_processes: Cpu }[a.action] || Shield;
                  return (
                    <div
                      key={a.id}
                      onClick={() => a.case_id && navigate(`/app/cases/${a.case_id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.7rem',
                        padding: '3px 0', cursor: a.case_id ? 'pointer' : 'default',
                      }}
                    >
                      <ActionIcon size={11} style={{ color: a.status === 'success' ? '#22C55E' : a.status === 'failed' ? '#EF4444' : '#EAB308', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'JetBrains Mono', color: '#71717A', fontSize: '0.62rem', flexShrink: 0, textTransform: 'uppercase' }}>{a.platform}</span>
                      <span style={{ color: '#F0F0F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.hostname || a.endpoint_id}</span>
                      <span style={{ marginLeft: 'auto', color: '#71717A', fontSize: '0.62rem', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
                        {a.action.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {edrStatus && !edrStatus.any_configured && (
              <div style={{ fontSize: '0.7rem', color: '#71717A', marginTop: 4 }}>
                No EDR configured.{' '}
                <span style={{ color: '#A78BFA', cursor: 'pointer' }} onClick={() => navigate('/app/admin?tab=integrations')}>Configure integrations →</span>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="at-card" style={{ padding: '14px 16px' }}>
            <div className="section-label">Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { label: 'New Case',       path: '/app/cases',         color: '#4DA3FF' },
                { label: 'VT Lookup',      path: '/app/vt-lookup',     color: '#A78BFA' },
                { label: 'Email Analysis', path: '/app/email',          color: '#22C55E' },
                { label: 'Terminal Lab',   path: '/app/terminal-lab',   color: '#22C55E' },
                { label: 'Identity Graph', path: '/app/identity-graph', color: '#A78BFA' },
                { label: 'Threat Hunt',    path: '/app/hunt',           color: '#4DA3FF' },
                { label: 'Log Invest.',    path: '/app/logs',           color: '#EAB308' },
                { label: 'Tools Hub',      path: '/app/tools',          color: '#71717A' },
              ].map(({ label, path, color }) => (
                <button key={path} onClick={() => navigate(path)} className="btn-ghost"
                  style={{ fontSize: '0.76rem', padding: '7px 10px', justifyContent: 'flex-start', gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
