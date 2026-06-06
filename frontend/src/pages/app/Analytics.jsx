import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, Clock, AlertTriangle, Shield,
  CheckCircle, Users, RefreshCw, Loader2, Activity,
  Target, Zap
} from 'lucide-react';
import api from '../../api/client';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };
const SEV_COLOR = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#22C55E', info:'#787878' };

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  return s < 3600 ? `${Math.round(s/60)}m ago` : s < 86400 ? `${Math.round(s/3600)}h ago` : `${Math.round(s/86400)}d ago`;
}

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
function KPICard({ label, value, sub, color, Icon, trend }) {
  return (
    <div style={{ background: 'rgba(8,8,8,0.7)', border: '1px solid rgba(148,163,184,0.08)', borderRadius: 12, padding: '18px 20px', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${color}30`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.08)'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '0.65rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.1em', ...MONO }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color, ...MONO, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#787878', marginTop: 6, ...MONO }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: '0.68rem', color: trend >= 0 ? '#22C55E' : '#EF4444', marginTop: 4, ...MONO }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}

/* ── Horizontal bar ───────────────────────────────────────────────────────── */
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.74rem', color: '#A8A8A8', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color, ...MONO, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

/* ── Section header ───────────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, label, color = '#4E7A8E' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <Icon size={14} style={{ color }} />
      <span style={{ fontSize: '0.68rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.1em', ...MONO }}>{label}</span>
    </div>
  );
}

/* ── Panel ────────────────────────────────────────────────────────────────── */
function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(8,8,8,0.7)', border: '1px solid rgba(148,163,184,0.08)',
      borderRadius: 12, padding: 20, backdropFilter: 'blur(8px)',
      ...style
    }}>
      {children}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function Analytics() {
  const [overview, setOverview]       = useState(null);
  const [severity, setSeverity]       = useState([]);
  const [sla, setSla]                 = useState([]);
  const [mitre, setMitre]             = useState([]);
  const [throughput, setThroughput]   = useState([]);
  const [ttc, setTtc]                 = useState([]);
  const [trend, setTrend]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, sevRes, slaRes, mitRes, thrRes, ttcRes, trendRes] = await Promise.allSettled([
        api.get('/api/analytics/overview'),
        api.get('/api/analytics/severity-breakdown'),
        api.get('/api/analytics/sla-status'),
        api.get('/api/analytics/mitre-heatmap'),
        api.get('/api/analytics/analyst-throughput'),
        api.get('/api/analytics/time-to-close'),
        api.get('/api/analytics/cases-over-time?days=14'),
      ]);
      if (ovRes.status === 'fulfilled')    setOverview(ovRes.value.data);
      if (sevRes.status === 'fulfilled')   setSeverity(sevRes.value.data);
      if (slaRes.status === 'fulfilled')   setSla(slaRes.value.data);
      if (mitRes.status === 'fulfilled')   setMitre(mitRes.value.data.slice(0, 12));
      if (thrRes.status === 'fulfilled')   setThroughput(thrRes.value.data);
      if (ttcRes.status === 'fulfilled')   setTtc(ttcRes.value.data);
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Analytics load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const slaBreached  = sla.filter(c => c.sla_status === 'breached').length;
  const slaAtRisk    = sla.filter(c => c.sla_status === 'at_risk').length;
  const slaOnTrack   = sla.filter(c => c.sla_status === 'on_track').length;
  const maxSev       = Math.max(...severity.map(s => s.count), 1);
  const maxThroughput = Math.max(...throughput.map(t => t.created), 1);
  const maxMitre     = Math.max(...mitre.map(m => m.count), 1);
  const trendMax     = Math.max(...trend.map(t => Math.max(t.created, t.closed)), 1);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <BarChart2 size={20} style={{ color: '#4E7A8E' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Analytics</h1>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#787878', ...MONO }}>
            SOC performance metrics — severity trends, SLA health, MITRE coverage
            {lastRefresh && <span style={{ marginLeft: 10 }}>· Last refreshed {timeAgo(lastRefresh)}</span>}
          </div>
        </div>
        <button className="btn-ghost" onClick={load} disabled={loading} style={{ fontSize: '0.78rem' }}>
          {loading ? <Loader2 size={13} className="spinner" /> : <RefreshCw size={13} />} Refresh
        </button>
      </div>

      {loading && !overview ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
          <Loader2 size={20} className="spinner" style={{ color: '#4E7A8E' }} />
          <span style={{ color: '#787878', ...MONO, fontSize: '0.82rem' }}>Loading analytics…</span>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KPICard label="Total Cases"    value={overview?.total_cases}    Icon={Activity}      color="#4E7A8E"  sub="All time" />
            <KPICard label="Open Cases"     value={overview?.open_cases}     Icon={AlertTriangle} color="#EAB308"  sub="Needs attention" />
            <KPICard label="Critical Open"  value={overview?.critical_open}  Icon={Zap}           color="#EF4444"  sub="Immediate action" />
            <KPICard label="SLA Breached"   value={slaBreached}              Icon={Clock}         color="#F97316"  sub={`${slaAtRisk} at risk`} />
            <KPICard label="Closed Cases"   value={overview?.closed_cases}   Icon={CheckCircle}   color="#22C55E"  sub="All time" />
            <KPICard label="Avg Close Time" value={overview?.avg_time_to_close_hours ? `${overview.avg_time_to_close_hours}h` : '—'} Icon={Target} color="#8FAFC0" sub="Mean resolution" />
          </div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Severity Breakdown */}
            <Panel>
              <SectionHeader icon={Shield} label="Open by Severity" />
              {severity.length === 0 ? (
                <div style={{ color: '#787878', fontSize: '0.78rem', ...MONO }}>No open cases</div>
              ) : (
                severity.map(s => (
                  <HBar key={s.severity} label={s.severity} value={s.count} max={maxSev} color={SEV_COLOR[s.severity] || '#888888'} />
                ))
              )}
            </Panel>

            {/* SLA Status */}
            <Panel>
              <SectionHeader icon={Clock} label="SLA Status" color="#EAB308" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'On Track', count: slaOnTrack,   color: '#22C55E' },
                  { label: 'At Risk',  count: slaAtRisk,    color: '#EAB308' },
                  { label: 'Breached', count: slaBreached,  color: '#EF4444' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: `${s.color}08`, border: `1px solid ${s.color}20`, borderRadius: 8 }}>
                    <span style={{ fontSize: '0.82rem', color: '#A8A8A8' }}>{s.label}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color, ...MONO }}>{s.count}</span>
                  </div>
                ))}
                {sla.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: '0.62rem', color: '#787878', ...MONO, marginBottom: 6 }}>Top priority</div>
                    {sla.filter(c => c.sla_status !== 'on_track').slice(0, 3).map(c => (
                      <div key={c.case_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.72rem' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.sla_status === 'breached' ? '#EF4444' : '#EAB308', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#A8A8A8' }}>{c.title}</span>
                        <span style={{ ...MONO, color: '#787878', flexShrink: 0 }}>{c.pct_used}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            {/* Time to Close */}
            <Panel>
              <SectionHeader icon={TrendingUp} label="Avg Close Time" color="#8FAFC0" />
              {ttc.length === 0 ? (
                <div style={{ color: '#787878', fontSize: '0.78rem', ...MONO }}>No closed cases</div>
              ) : (
                ttc.map(t => (
                  <div key={t.severity} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR[t.severity] || '#888888', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.8rem', color: '#A8A8A8', textTransform: 'capitalize' }}>{t.severity}</span>
                    <span style={{ fontSize: '0.78rem', color: SEV_COLOR[t.severity] || '#787878', ...MONO, fontWeight: 600 }}>
                      {t.avg_hours ? `${t.avg_hours}h` : '—'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#787878', ...MONO }}>{t.count} cases</span>
                  </div>
                ))
              )}
            </Panel>
          </div>

          {/* Second row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Case Trend */}
            <Panel>
              <SectionHeader icon={Activity} label="Case Volume (14 days)" />
              {trend.length === 0 ? (
                <div style={{ color: '#787878', fontSize: '0.78rem', ...MONO }}>No trend data</div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#787878' }}>
                      <div style={{ width: 10, height: 3, background: '#4E7A8E', borderRadius: 2 }} /> Created
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#787878' }}>
                      <div style={{ width: 10, height: 3, background: '#22C55E', borderRadius: 2 }} /> Closed
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                    {trend.map((t, i) => (
                      <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, height: 70, justifyContent: 'flex-end' }}>
                          <div title={`Created: ${t.created}`} style={{ width: '100%', height: `${(t.created / trendMax) * 100}%`, background: '#4E7A8E', borderRadius: '3px 3px 0 0', minHeight: t.created > 0 ? 3 : 0, opacity: 0.8 }} />
                        </div>
                        {i % 3 === 0 && <div style={{ fontSize: '0.55rem', color: '#404040', ...MONO, textAlign: 'center' }}>{t.date.slice(5)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            {/* Analyst Throughput */}
            <Panel>
              <SectionHeader icon={Users} label="Analyst Throughput" color="#22C55E" />
              {throughput.length === 0 ? (
                <div style={{ color: '#787878', fontSize: '0.78rem', ...MONO }}>No data</div>
              ) : (
                throughput.slice(0, 6).map(a => (
                  <HBar key={a.analyst} label={a.analyst || 'Unassigned'} value={a.created} max={maxThroughput} color="#4E7A8E" />
                ))
              )}
            </Panel>
          </div>

          {/* MITRE Heatmap */}
          {mitre.length > 0 && (
            <Panel>
              <SectionHeader icon={Target} label="MITRE ATT&CK — Top Techniques" color="#EF4444" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {mitre.map(m => {
                  const intensity = m.count / maxMitre;
                  return (
                    <div key={m.id} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: `rgba(239,68,68,${0.05 + intensity * 0.2})`,
                      border: `1px solid rgba(239,68,68,${0.1 + intensity * 0.3})`,
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ fontSize: '0.65rem', color: '#EF4444', ...MONO, marginBottom: 3 }}>{m.id}</div>
                      <div style={{ fontSize: '0.73rem', color: '#A8A8A8', lineHeight: 1.3, marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: '0.62rem', color: '#787878', ...MONO }}>{m.count} {m.count === 1 ? 'case' : 'cases'}</div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
