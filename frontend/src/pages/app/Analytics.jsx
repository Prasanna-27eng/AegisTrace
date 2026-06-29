import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, Clock, AlertTriangle, Shield,
  CheckCircle, Users, RefreshCw, Loader2, Activity,
  Target, Zap, DollarSign, FileText, Download
} from '../../components/icons';
import api from '../../api/client';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };
const SEV_COLOR = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#22C55E', info:'rgba(26,22,18,0.5)' };

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  return s < 3600 ? `${Math.round(s/60)}m ago` : s < 86400 ? `${Math.round(s/3600)}h ago` : `${Math.round(s/86400)}d ago`;
}

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
function KPICard({ label, value, sub, color, Icon, trend }) {
  return (
    <div style={{ background: 'rgba(232,224,212,0.95)', border: '1px solid rgba(26,22,18,0.096)', borderRadius: 12, padding: '18px 20px', backdropFilter: 'blur(8px)', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${color}30`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(26,22,18,0.096)'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', ...MONO }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color, ...MONO, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, ...MONO }}>{sub}</div>}
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
        <span style={{ fontSize: '0.74rem', color: 'rgba(26,22,18,0.55)', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color, ...MONO, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(26,22,18,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

/* ── Section header ───────────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, label, color = '#2563EB' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <Icon size={14} style={{ color }} />
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', ...MONO }}>{label}</span>
    </div>
  );
}

/* ── Panel ────────────────────────────────────────────────────────────────── */
function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(232,224,212,0.95)', border: '1px solid rgba(26,22,18,0.096)',
      borderRadius: 12, padding: 20, backdropFilter: 'blur(8px)',
      ...style
    }}>
      {children}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function Analytics() {
  useEffect(() => { document.title = 'Analytics | AegisTrace'; }, []);
  const [overview, setOverview]       = useState(null);
  const [severity, setSeverity]       = useState([]);
  const [sla, setSla]                 = useState([]);
  const [mitre, setMitre]             = useState([]);
  const [throughput, setThroughput]   = useState([]);
  const [ttc, setTtc]                 = useState([]);
  const [trend, setTrend]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [costData, setCostData]       = useState(null);
  const [complianceGenerating, setComplianceGenerating] = useState(false);
  const [complianceMsg, setComplianceMsg] = useState(null);

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
      // Feature 5: cost data
      api.get('/api/analytics/cost').then(r => setCostData(r.data)).catch(() => {});
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
            <BarChart2 size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Analytics</h1>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', ...MONO }}>
            SOC performance metrics — severity trends, SLA health, MITRE coverage
            {lastRefresh && <span style={{ marginLeft: 10 }}>· Last refreshed {timeAgo(lastRefresh)}</span>}
          </div>
        </div>
        <button className="btn-ghost" onClick={load} disabled={loading} style={{ fontSize: '0.78rem' }}>
          {loading ? <Loader2 size={13} className="spinner" /> : <RefreshCw size={13} />} Refresh
        </button>
      </div>

      {loading && !overview ? (
        <div>
          {/* KPI skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ background: 'rgba(232,224,212,0.95)', border: '1px solid rgba(26,22,18,0.096)', borderRadius: 12, padding: '18px 20px' }}>
                <div className="skeleton" style={{ height: 9, width: 90, marginBottom: 14 }} />
                <div className="skeleton" style={{ height: 30, width: 56, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 8, width: 110 }} />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[160, 180, 160].map((h, i) => (
              <div key={i} style={{ background: 'rgba(232,224,212,0.95)', border: '1px solid rgba(26,22,18,0.096)', borderRadius: 12, padding: 20 }}>
                <div className="skeleton" style={{ height: 9, width: 100, marginBottom: 16 }} />
                {[0,1,2,3,4].map(j => (
                  <div key={j} style={{ marginBottom: 10 }}>
                    <div className="skeleton" style={{ height: 8, width: `${50 + j * 12}%`, marginBottom: 5 }} />
                    <div className="skeleton" style={{ height: 4, width: '100%' }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KPICard label="Total Cases"    value={overview?.total_cases}    Icon={Activity}      color="#2563EB"  sub="All time" />
            <KPICard label="Open Cases"     value={overview?.open_cases}     Icon={AlertTriangle} color="#EAB308"  sub="Needs attention" />
            <KPICard label="Critical Open"  value={overview?.critical_open}  Icon={Zap}           color="#EF4444"  sub="Immediate action" />
            <KPICard label="SLA Breached"   value={slaBreached}              Icon={Clock}         color="#F97316"  sub={`${slaAtRisk} at risk`} />
            <KPICard label="Closed Cases"   value={overview?.closed_cases}   Icon={CheckCircle}   color="#22C55E"  sub="All time" />
            <KPICard label="Avg Close Time" value={overview?.avg_time_to_close_hours ? `${overview.avg_time_to_close_hours}h` : '—'} Icon={Target} color="rgba(26,22,18,0.7)" sub="Mean resolution" />
          </div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Severity Breakdown */}
            <Panel>
              <SectionHeader icon={Shield} label="Open by Severity" />
              {severity.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', ...MONO }}>No open cases</div>
              ) : (
                severity.map(s => (
                  <HBar key={s.severity} label={s.severity} value={s.count} max={maxSev} color={SEV_COLOR[s.severity] || 'rgba(26,22,18,0.35)'} />
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
                    <span style={{ fontSize: '0.82rem', color: 'rgba(26,22,18,0.55)' }}>{s.label}</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color, ...MONO }}>{s.count}</span>
                  </div>
                ))}
                {sla.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', ...MONO, marginBottom: 6 }}>Top priority</div>
                    {sla.filter(c => c.sla_status !== 'on_track').slice(0, 3).map(c => (
                      <div key={c.case_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(26,22,18,0.05)', fontSize: '0.72rem' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.sla_status === 'breached' ? '#EF4444' : '#EAB308', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(26,22,18,0.55)' }}>{c.title}</span>
                        <span style={{ ...MONO, color: 'var(--text-muted)', flexShrink: 0 }}>{c.pct_used}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            {/* Time to Close */}
            <Panel>
              <SectionHeader icon={TrendingUp} label="Avg Close Time" color="rgba(26,22,18,0.7)" />
              {ttc.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', ...MONO }}>No closed cases</div>
              ) : (
                ttc.map(t => (
                  <div key={t.severity} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(26,22,18,0.05)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR[t.severity] || 'rgba(26,22,18,0.35)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'rgba(26,22,18,0.55)', textTransform: 'capitalize' }}>{t.severity}</span>
                    <span style={{ fontSize: '0.78rem', color: SEV_COLOR[t.severity] || 'rgba(26,22,18,0.5)', ...MONO, fontWeight: 600 }}>
                      {t.avg_hours ? `${t.avg_hours}h` : '—'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', ...MONO }}>{t.count} cases</span>
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
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', ...MONO }}>No trend data</div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 2 }} /> Created
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <div style={{ width: 8, height: 8, background: '#22C55E', borderRadius: 2 }} /> Closed
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90 }}>
                    {trend.map((t, i) => (
                      <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ width: '100%', height: 78, display: 'flex', alignItems: 'flex-end', gap: 1, justifyContent: 'center' }}>
                          <div
                            title={`Created: ${t.created}`}
                            style={{ flex: 1, height: `${(t.created / trendMax) * 100}%`, background: 'var(--accent)', borderRadius: '2px 2px 0 0', minHeight: t.created > 0 ? 3 : 0, opacity: 0.85, transition: 'height 0.4s ease' }}
                          />
                          <div
                            title={`Closed: ${t.closed}`}
                            style={{ flex: 1, height: `${(t.closed / trendMax) * 100}%`, background: '#22C55E', borderRadius: '2px 2px 0 0', minHeight: t.closed > 0 ? 3 : 0, opacity: 0.75, transition: 'height 0.4s ease' }}
                          />
                        </div>
                        {i % 3 === 0 && (
                          <div style={{ fontSize: '0.52rem', color: '#404040', ...MONO, textAlign: 'center', whiteSpace: 'nowrap' }}>{t.date.slice(5)}</div>
                        )}
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
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', ...MONO }}>No data</div>
              ) : (
                throughput.slice(0, 6).map(a => (
                  <HBar key={a.analyst} label={a.analyst || 'Unassigned'} value={a.created} max={maxThroughput} color="#2563EB" />
                ))
              )}
            </Panel>
          </div>

          {/* MITRE Heatmap */}
          {mitre.length > 0 && (
            <Panel style={{ marginBottom: 16 }}>
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
                      <div style={{ fontSize: '0.73rem', color: 'rgba(26,22,18,0.55)', lineHeight: 1.3, marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', ...MONO }}>{m.count} {m.count === 1 ? 'case' : 'cases'}</div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* ── Feature 5: Cost Intelligence ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <Panel>
              <SectionHeader icon={DollarSign} label="AI Cost Intelligence (30 days)" color="#F59E0B" />
              {!costData || costData.total_cost_usd_30d === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', ...MONO, textAlign: 'center', padding: '16px 0' }}>
                  No AI usage logged yet. Cost tracking activates on first LLM call.
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[
                      { label: 'Total (30d)', value: `$${costData.total_cost_usd_30d?.toFixed(4)}`, color: '#F59E0B' },
                      { label: 'Per Case', value: `$${costData.cost_per_case_avg?.toFixed(5)}`, color: 'rgba(26,22,18,0.7)' },
                      { label: 'Per Alert', value: `$${costData.cost_per_alert_avg?.toFixed(6)}`, color: '#22C55E' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20`, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{stat.label}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: stat.color, ...MONO }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>By Operation</div>
                  {(costData.breakdown_by_operation || []).slice(0, 6).map(op => {
                    const maxCost = Math.max(...costData.breakdown_by_operation.map(o => o.total_cost_usd));
                    return (
                      <div key={op.operation} style={{ marginBottom: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(26,22,18,0.55)', textTransform: 'capitalize' }}>{op.operation}</span>
                          <span style={{ fontSize: '0.68rem', color: '#F59E0B', ...MONO }}>${op.total_cost_usd.toFixed(4)} ({op.count})</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(26,22,18,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${maxCost > 0 ? (op.total_cost_usd / maxCost) * 100 : 0}%`, background: '#F59E0B', borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </Panel>

            {/* ── Feature 8: Compliance Evidence Export ─────────────────── */}
            <Panel>
              <SectionHeader icon={FileText} label="Compliance Evidence Export" color="#8B5CF6" />
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 16, lineHeight: 1.5 }}>
                Generate audit-ready PDF evidence packages for regulatory frameworks. Includes case summaries, MITRE mappings, SLA metrics, and response timelines.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { id: 'soc2',     label: 'SOC 2 Type II',    desc: 'Access controls, incident response, monitoring' },
                  { id: 'iso27001', label: 'ISO 27001',         desc: 'ISMS evidence package' },
                  { id: 'nist',     label: 'NIST CSF',          desc: 'Identify/Protect/Detect/Respond/Recover' },
                  { id: 'dora',     label: 'DORA',              desc: 'Digital Operational Resilience Act (EU)' },
                ].map(framework => (
                  <div key={framework.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#E8E8F0', marginBottom: 2 }}>{framework.label}</div>
                      <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>{framework.desc}</div>
                    </div>
                    <button
                      disabled={complianceGenerating}
                      onClick={async () => {
                        setComplianceGenerating(true);
                        setComplianceMsg(null);
                        try {
                          const res = await fetch('/api/reports/compliance-evidence', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                            body: JSON.stringify({ framework: framework.id }),
                          });
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `aegistrace-${framework.id}-evidence.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            setComplianceMsg({ type: 'success', text: `${framework.label} package downloaded.` });
                          } else {
                            const err = await res.json();
                            setComplianceMsg({ type: 'error', text: err.detail || 'Generation failed.' });
                          }
                        } catch {
                          setComplianceMsg({ type: 'error', text: 'Request failed.' });
                        } finally {
                          setComplianceGenerating(false);
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                        background: complianceGenerating ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.12)',
                        border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6,
                        color: '#A78BFA', fontSize: '0.7rem', fontWeight: 600, cursor: complianceGenerating ? 'wait' : 'pointer',
                      }}
                    >
                      {complianceGenerating ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={11} />}
                      PDF
                    </button>
                  </div>
                ))}
              </div>
              {complianceMsg && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: complianceMsg.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${complianceMsg.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 6, fontSize: '0.72rem', color: complianceMsg.type === 'success' ? '#22C55E' : '#EF4444' }}>
                  {complianceMsg.text}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
