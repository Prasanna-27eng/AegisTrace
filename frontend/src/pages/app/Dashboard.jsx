import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, Activity, Shield, Mail, BarChart2, ExternalLink,
  Clock, TrendingUp, CheckCircle, Zap, GitMerge, Eye
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';

const SEV_COLOR  = { critical:'#C0392B', high:'#EF4444', medium:'#EAB308', low:'#A78BFA', info:'#71717A' };
const STAT_COLOR = { critical:'#C0392B', high:'#EF4444', medium:'#EAB308', low:'#A78BFA', info:'#71717A' };

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
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 6, cursor: 'pointer', background: '#0F1018', transition: 'background 0.15s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = '#0F1018'}
    >
      {c.severity === 'critical' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#C0392B' }} />}
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
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)')}
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
  const [cases, setCases]       = useState([]);
  const [vtHistory, setVtHistory] = useState([]);
  const [stats, setStats]       = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/cases?limit=100'),
      api.get('/api/vt/history'),
      api.get('/api/portfolio/stats'),
    ]).then(([casesRes, vtRes, statsRes]) => {
      setCases(casesRes.data);
      setVtHistory(vtRes.data.slice(0, 6));
      setStats(statsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
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
        <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(192,57,43,0.04)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <Zap size={13} style={{ color: '#C0392B' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono' }}>
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
        <StatTile icon={AlertTriangle} label="Critical Open"   value={critical.length}     color="#C0392B"  sub={critical.length ? 'Act now' : 'None active'} subColor={critical.length ? '#EF4444' : '#22C55E'} onClick={() => navigate('/app/cases?severity=critical&status=open')} />
        <StatTile icon={Clock}        label="Pending Closure"  value={pending.length}      color="#EAB308"  sub={pending.length ? 'Awaiting review' : 'Queue clear'} subColor={pending.length ? '#EAB308' : '#22C55E'} onClick={() => navigate('/app/cases?status=pending_closure')} />
        <StatTile icon={Activity}     label="In Progress"      value={inProgress.length}   color="#A78BFA"  sub={`${openCases.length} open`} subColor="#71717A" onClick={() => navigate('/app/cases?status=in_progress')} />
        <StatTile icon={TrendingUp}   label="SLA Breach"       value={slaBreach.length}    color={slaBreach.length ? '#EF4444' : '#22C55E'} sub={slaBreach.length ? 'Overdue' : 'All within SLA'} subColor={slaBreach.length ? '#EF4444' : '#22C55E'} />
        <StatTile icon={CheckCircle}  label="Closed Today"     value={closedToday.length}  color="#22C55E"  sub="Cases resolved" />
        <StatTile icon={Shield}       label="VT Today"         value={vtHistory.length}    color="#A78BFA"  sub={maliciousVt ? `${maliciousVt} malicious` : 'None malicious'} subColor={maliciousVt ? '#EF4444' : '#71717A'} onClick={() => navigate('/app/vt-lookup')} />
        <StatTile icon={GitMerge}     label="Total IOCs"       value={stats.total_iocs || 0} color="#22C55E" sub="Correlated" />
        <StatTile icon={BarChart2}    label="Total Cases"      value={stats.total_cases || cases.length} color="#F0F0F8" sub={`${stats.closed_cases || closedToday.length} closed`} subColor="#71717A" />
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>

        {/* Case Queue */}
        <div className="at-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-label" style={{ margin: 0 }}>Case Queue</div>
            <button onClick={() => navigate('/app/cases')} style={{ fontSize: '0.7rem', color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              All cases <ExternalLink size={10} />
            </button>
          </div>

          {recentCases.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <FolderOpen size={28} style={{ color: 'rgba(192,57,43,0.2)', margin: '0 auto 10px' }} />
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
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#0F1018', borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0F1018'}
                >
                  {c.severity === 'critical' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#C0392B' }} />}
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

          {/* Quick actions */}
          <div className="at-card" style={{ padding: '14px 16px' }}>
            <div className="section-label">Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { label: 'New Case',       path: '/app/cases',      color: '#C0392B' },
                { label: 'VT Lookup',      path: '/app/vt-lookup',  color: '#A78BFA' },
                { label: 'Email Analysis', path: '/app/email',       color: '#22C55E' },
                { label: 'Log Invest.',    path: '/app/logs',        color: '#EAB308' },
                { label: 'Threat Hunt',    path: '/app/hunt',        color: '#A78BFA' },
                { label: 'Tools Hub',      path: '/app/tools',       color: '#71717A' },
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
