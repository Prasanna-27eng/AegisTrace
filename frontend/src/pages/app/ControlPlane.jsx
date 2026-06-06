import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Shield, AlertTriangle, Monitor, Users,
  CheckCircle, XCircle, Clock, RefreshCw, Zap, Eye,
  TrendingUp, Bot, Fingerprint, Server, Wifi, WifiOff,
  ChevronRight, Circle
} from 'lucide-react';
import api from '../../api/client';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };
const REFRESH_INTERVAL = 30; // seconds

const SEV  = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#22C55E' };
const NODE_COLORS = {
  user: '#5A8A9F', service_account: '#8FAFC0', api_key: '#EAB308',
  token: '#F97316', device: '#22C55E', agent: '#2EE6D6', prompt: '#EC4899',
};

function timeAgo(d) {
  if (!d) return 'never';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60)    return `${Math.round(s)}s ago`;
  if (s < 3600)  return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000; // 5 min
}

/* ══════════════════════════════════════════════════════════════════════════
   KPI CARD
══════════════════════════════════════════════════════════════════════════ */
function KPICard({ label, value, sub, icon: Icon, color = '#5A8A9F', alert = false, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        background: alert ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${alert ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12, padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, background 0.2s',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = 'rgba(78,122,142,0.35)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = alert ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)')}
    >
      <div style={{ width: 38, height: 38, borderRadius: 9, background: `${color}14`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: alert ? '#EF4444' : '#EBEBEB', lineHeight: 1, ...MONO }}>{value}</div>
        <div style={{ fontSize: '0.74rem', color: '#EBEBEB', fontWeight: 500, marginTop: 5 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.64rem', color: '#686868', marginTop: 2, ...MONO }}>{sub}</div>}
      </div>
      {onClick && <ChevronRight size={14} style={{ color: '#686868', marginTop: 4, flexShrink: 0 }} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANEL WRAPPER
══════════════════════════════════════════════════════════════════════════ */
function Panel({ title, icon: Icon, count, children, onNavigate, accentColor = '#5A8A9F', style = {} }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...style,
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Icon size={14} style={{ color: accentColor }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#EBEBEB', letterSpacing: '0.03em' }}>{title}</span>
        {count !== undefined && (
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}28`, padding: '1px 8px', borderRadius: 10, ...MONO, fontWeight: 700 }}>
            {count}
          </span>
        )}
        {onNavigate && (
          <button onClick={onNavigate}
            style={{ marginLeft: count !== undefined ? 6 : 'auto', background: 'none', border: 'none', color: '#686868', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={13} />
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ padding: '28px 0', textAlign: 'center', color: '#505050' }}>
      <Icon size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
      <div style={{ fontSize: '0.78rem' }}>{text}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HIGH-RISK IDENTITIES PANEL
══════════════════════════════════════════════════════════════════════════ */
function IdentityPanel({ nodes, navigate }) {
  const high = nodes.filter(n => n.risk_score >= 40 || n.is_compromised).slice(0, 12);
  return (
    <Panel title="High-Risk Identities" icon={Fingerprint} count={high.length}
      onNavigate={() => navigate('/app/identity-graph')} accentColor="#8FAFC0">
      {high.length === 0
        ? <EmptyState icon={CheckCircle} text="All identities within normal risk range" />
        : high.map(n => {
          const c = NODE_COLORS[n.node_type] || '#5A8A9F';
          const riskColor = n.risk_score >= 80 ? '#EF4444' : n.risk_score >= 60 ? '#F97316' : n.risk_score >= 40 ? '#EAB308' : '#A8A8A8';
          return (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, background: n.is_compromised ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${n.is_compromised ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)'}` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', color: '#EBEBEB', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.label}</div>
                <div style={{ fontSize: '0.62rem', color: '#686868', ...MONO, display: 'flex', gap: 8 }}>
                  <span>{n.node_type?.replace('_',' ')}</span>
                  {n.is_compromised && <span style={{ color: '#EF4444' }}>COMPROMISED</span>}
                </div>
              </div>
              {/* Risk score bar */}
              <div style={{ width: 60, flexShrink: 0 }}>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, n.risk_score || 0)}%`, background: riskColor, borderRadius: 2, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: '0.6rem', color: riskColor, ...MONO, textAlign: 'right', fontWeight: 600 }}>{n.risk_score || 0}</div>
              </div>
            </div>
          );
        })
      }
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AI ACTION QUEUE PANEL
══════════════════════════════════════════════════════════════════════════ */
function ActionQueuePanel({ actions, navigate }) {
  const pending = actions.filter(a => a.approval_status === 'pending').slice(0, 8);
  return (
    <Panel title="AI Action Queue" icon={Bot} count={pending.length}
      onNavigate={() => navigate('/app/agent-security')}
      accentColor={pending.length > 0 ? '#EAB308' : '#5A8A9F'}>
      {pending.length === 0
        ? <EmptyState icon={CheckCircle} text="No actions awaiting approval" />
        : pending.map(a => (
          <div key={a.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.14)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#EAB308', ...MONO }}>{a.action_type || 'Action'}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#686868', ...MONO }}>{timeAgo(a.timestamp)}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#A8A8A8', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.actor || 'AI Agent'} · {a.model_used || 'model'}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#686868', ...MONO, marginTop: 3 }}>
              Confidence: {Math.round((a.confidence_score || 0) * 100)}%
            </div>
          </div>
        ))
      }
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ITDR THREAT FEED PANEL
══════════════════════════════════════════════════════════════════════════ */
function ThreatFeedPanel({ alerts, navigate }) {
  const open = alerts.slice(0, 10);
  return (
    <Panel title="Active Threat Alerts" icon={AlertTriangle} count={open.length}
      onNavigate={() => navigate('/app/itdr')}
      accentColor={open.length > 0 ? '#EF4444' : '#22C55E'}>
      {open.length === 0
        ? <EmptyState icon={Shield} text="No active threats detected" />
        : open.map(a => {
          const sc = SEV[a.severity] || '#787878';
          return (
            <div key={a.id} style={{ padding: '9px 12px', borderRadius: 8, background: `${sc}05`, border: `1px solid ${sc}18`, borderLeft: `2px solid ${sc}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: sc, ...MONO }}>{(a.alert_type || 'alert').replace(/_/g,' ')}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#686868', ...MONO }}>{timeAgo(a.detected_at)}</span>
              </div>
              {a.identity_label && (
                <div style={{ fontSize: '0.68rem', color: '#A8A8A8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...MONO }}>
                  {a.identity_label}
                </div>
              )}
            </div>
          );
        })
      }
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ENDPOINT HEARTBEAT PANEL
══════════════════════════════════════════════════════════════════════════ */
function EndpointPanel({ endpoints, navigate }) {
  const sorted = [...endpoints].sort((a, b) => (isOnline(b.last_seen) ? 1 : 0) - (isOnline(a.last_seen) ? 1 : 0));
  const online = endpoints.filter(e => isOnline(e.last_seen)).length;

  return (
    <Panel title="Endpoint Heartbeats" icon={Monitor} count={`${online}/${endpoints.length}`}
      onNavigate={() => navigate('/app/endpoints')} accentColor="#22C55E">
      {endpoints.length === 0
        ? <EmptyState icon={Server} text="No agents registered yet" />
        : sorted.slice(0, 10).map(ep => {
          const online = isOnline(ep.last_seen);
          const ts = ep.threat_score_avg || 0;
          const tsColor = ts >= 70 ? '#EF4444' : ts >= 40 ? '#F97316' : '#22C55E';
          return (
            <div key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {online
                ? <Wifi size={13} style={{ color: '#22C55E', flexShrink: 0 }} />
                : <WifiOff size={13} style={{ color: '#505050', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.76rem', color: online ? '#EBEBEB' : '#686868', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...MONO }}>
                  {ep.hostname || ep.ip_address || `ep-${ep.id}`}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#686868', ...MONO }}>
                  {ep.os_type || 'unknown'} · {timeAgo(ep.last_seen)}
                </div>
              </div>
              {ts > 0 && (
                <div style={{ fontSize: '0.62rem', color: tsColor, ...MONO, fontWeight: 600, flexShrink: 0 }}>
                  {ts}
                </div>
              )}
            </div>
          );
        })
      }
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LIVE ACTIVITY TICKER
══════════════════════════════════════════════════════════════════════════ */
function ActivityTicker({ nodes, alerts, actions, endpoints }) {
  const events = [
    ...alerts.slice(0, 3).map(a => ({ type: 'threat',    text: `${(a.alert_type||'alert').replace(/_/g,' ')} — ${a.identity_label || 'unknown'}`, color: SEV[a.severity] || '#EF4444', ts: a.detected_at })),
    ...actions.filter(a => a.approval_status === 'pending').slice(0, 2).map(a => ({ type: 'action', text: `AI action pending: ${a.action_type || 'action'} by ${a.actor || 'agent'}`, color: '#EAB308', ts: a.timestamp })),
    ...nodes.filter(n => n.is_compromised).slice(0, 2).map(n => ({ type: 'identity', text: `Compromised identity: ${n.label}`, color: '#EF4444', ts: n.last_active })),
    ...endpoints.filter(e => !isOnline(e.last_seen) && e.last_seen).slice(0, 2).map(e => ({ type: 'endpoint', text: `Agent offline: ${e.hostname || e.ip_address}`, color: '#F97316', ts: e.last_seen })),
  ].sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0)).slice(0, 6);

  if (events.length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 0 0', display: 'flex', gap: 0, flexWrap: 'nowrap', overflowX: 'auto' }}>
      <div style={{ fontSize: '0.58rem', color: '#505050', ...MONO, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '2px 12px', flexShrink: 0, alignSelf: 'center' }}>LIVE</div>
      {events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 14px', borderLeft: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <Circle size={5} style={{ color: ev.color, fill: ev.color, flexShrink: 0 }} />
          <span style={{ fontSize: '0.65rem', color: '#A8A8A8', ...MONO, whiteSpace: 'nowrap' }}>{ev.text}</span>
          <span style={{ fontSize: '0.6rem', color: '#505050', ...MONO, whiteSpace: 'nowrap' }}>{timeAgo(ev.ts)}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function ControlPlane() {
  const navigate = useNavigate();
  const [data, setData] = useState({ overview: null, nodes: [], actions: [], alerts: [], endpoints: [] });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const timerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ov, nd, ac, al, ep] = await Promise.allSettled([
        api.get('/api/analytics/overview'),
        api.get('/api/identity/nodes'),
        api.get('/api/agent-security/actions?status=pending&limit=20'),
        api.get('/api/itdr/alerts?status=open&limit=20'),
        api.get('/api/ingest/endpoints'),
      ]);
      setData({
        overview:  ov.status === 'fulfilled' ? ov.value.data : null,
        nodes:     nd.status === 'fulfilled' ? (nd.value.data || []) : [],
        actions:   ac.status === 'fulfilled' ? (ac.value.data || []) : [],
        alerts:    al.status === 'fulfilled' ? (al.value.data?.items || al.value.data || []) : [],
        endpoints: ep.status === 'fulfilled' ? (ep.value.data || []) : [],
      });
      setLastRefresh(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Countdown ticker
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(c => c <= 1 ? REFRESH_INTERVAL : c - 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const { overview, nodes, actions, alerts, endpoints } = data;

  // Computed KPIs
  const highRiskNodes   = nodes.filter(n => n.risk_score >= 40 || n.is_compromised).length;
  const compromised     = nodes.filter(n => n.is_compromised).length;
  const pendingActions  = actions.filter(a => a.approval_status === 'pending').length;
  const onlineEndpoints = endpoints.filter(e => isOnline(e.last_seen)).length;
  const openAlerts      = alerts.length;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Activity size={20} style={{ color: '#5A8A9F' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Control Plane</h1>
            <span style={{ fontSize: '0.6rem', color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: 10, ...MONO, fontWeight: 700 }}>LIVE</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#686868', ...MONO }}>
            Trust operating surface · real-time identity, threat, and agent state
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRefresh && (
            <div style={{ fontSize: '0.64rem', color: '#505050', ...MONO }}>
              refreshed {timeAgo(lastRefresh)} · next in {countdown}s
            </div>
          )}
          <button onClick={fetchAll}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', color: '#686868', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem' }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <KPICard label="Total Identities"   value={nodes.length}       sub={`${highRiskNodes} high-risk`}     icon={Fingerprint} color="#8FAFC0"  onClick={() => navigate('/app/identity-graph')} />
        <KPICard label="Compromised"         value={compromised}        sub="identity nodes"                   icon={XCircle}     color="#EF4444"  alert={compromised > 0} onClick={() => navigate('/app/identity-graph')} />
        <KPICard label="Open Threats"        value={openAlerts}         sub="ITDR alerts"                      icon={AlertTriangle} color={openAlerts > 0 ? '#EF4444' : '#22C55E'} alert={openAlerts > 0} onClick={() => navigate('/app/itdr')} />
        <KPICard label="Pending AI Actions"  value={pendingActions}     sub="awaiting approval"                icon={Bot}         color={pendingActions > 0 ? '#EAB308' : '#5A8A9F'} alert={pendingActions > 0} onClick={() => navigate('/app/agent-security')} />
        <KPICard label="Endpoints Online"    value={`${onlineEndpoints}/${endpoints.length}`} sub="last 5 min" icon={Monitor}    color="#22C55E"  onClick={() => navigate('/app/endpoints')} />
      </div>

      {/* ── Case KPIs (from overview) ── */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Open Cases',    value: overview.open_cases || 0,    color: '#5A8A9F', icon: Eye },
            { label: 'SLA Breached',  value: overview.sla_breached || 0,  color: '#EF4444', icon: AlertTriangle, alert: (overview.sla_breached || 0) > 0 },
            { label: 'Critical Cases',value: overview.critical_open || 0, color: '#EF4444', icon: Zap, alert: (overview.critical_open || 0) > 0 },
            { label: 'Avg Close Time',value: overview.avg_time_to_close ? `${overview.avg_time_to_close}h` : '—', color: '#8FAFC0', icon: Clock },
          ].map(k => (
            <div key={k.label} style={{ background: k.alert ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.015)', border: `1px solid ${k.alert ? 'rgba(239,68,68,0.16)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <k.icon size={15} style={{ color: k.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: k.alert ? '#EF4444' : '#EBEBEB', ...MONO }}>{k.value}</div>
                <div style={{ fontSize: '0.68rem', color: '#686868' }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main panels grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#686868', fontSize: '0.8rem', ...MONO }}>
          Loading control plane data…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
          <IdentityPanel   nodes={nodes}     navigate={navigate} />
          <ThreatFeedPanel alerts={alerts}   navigate={navigate} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ActionQueuePanel actions={actions} navigate={navigate} />
            <EndpointPanel endpoints={endpoints} navigate={navigate} />
          </div>
        </div>
      )}

      {/* ── Live activity ticker ── */}
      <ActivityTicker nodes={nodes} alerts={alerts} actions={actions} endpoints={endpoints} />
    </div>
  );
}
