import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, Plus, Loader2, RefreshCw,
  MapPin, Smartphone, Key, User, Clock, ChevronRight,
  CheckCircle, X, Zap, FileText, BarChart3, Activity,
  Bot, TrendingUp, Target, AlertCircle, Eye, Bell
} from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

/* ── All detector definitions (ITDR + endpoint agent alerts) ────────────── */
const DETECTOR_META = {
  // Identity detectors
  credential_stuffing:             { label: 'Credential Stuffing',        color: '#EF4444', Icon: Key },
  credential_stuffing_distributed: { label: 'Distributed Stuffing',       color: '#EF4444', Icon: Key },
  impossible_travel:               { label: 'Impossible Travel',          color: '#F97316', Icon: MapPin },
  new_device:                      { label: 'New Device Login',           color: '#EAB308', Icon: Smartphone },
  privilege_escalation:            { label: 'Privilege Escalation',       color: '#EF4444', Icon: Shield },
  token_theft:                     { label: 'Token / Session Theft',      color: '#8BB8E8', Icon: Key },
  shadow_ai:                       { label: 'Shadow AI Usage',            color: '#4A7EC8', Icon: Bot },
  // Endpoint agent alerts
  honey_token_access:              { label: 'Honey Token Accessed',       color: '#EF4444', Icon: AlertTriangle },
  suspicious_process:              { label: 'Suspicious Process',         color: '#F97316', Icon: Activity },
  suspicious_lineage:              { label: 'Suspicious Process Chain',   color: '#F97316', Icon: Activity },
  suspicious_port:                 { label: 'Suspicious Port',            color: '#EAB308', Icon: Zap },
  fim_change:                      { label: 'File Integrity Change',      color: '#EAB308', Icon: Eye },
  failed_login:                    { label: 'Failed Login',               color: '#EF4444', Icon: Key },
  yara_match:                      { label: 'YARA Signature Match',       color: '#EF4444', Icon: Shield },
  dga_domain:                      { label: 'DGA / C2 Domain',           color: '#F97316', Icon: Zap },
  usb_inserted:                    { label: 'USB Device Inserted',        color: '#EAB308', Icon: AlertCircle },
  registry_change:                 { label: 'Registry Persistence',       color: '#EF4444', Icon: AlertTriangle },
  user_management:                 { label: 'User Account Change',        color: '#EF4444', Icon: User },
  new_destination:                 { label: 'New Network Destination',    color: '#8BB8E8', Icon: Activity },
  behavioural_anomaly:             { label: 'Behavioural Anomaly',        color: '#EAB308', Icon: AlertCircle },
  // v6.2 Falco Layer 3 — eBPF / kernel-level alerts (prefix: falco_)
  falco_alert:                     { label: 'Falco eBPF Alert',           color: '#A78BFA', Icon: Zap },
};

const EVENT_TYPE_LABELS = {
  login:            { label: 'Login',           color: '#22C55E' },
  failed_login:     { label: 'Failed Login',    color: '#EF4444' },
  logout:           { label: 'Logout',          color: '#787878' },
  privilege_change: { label: 'Priv. Change',    color: '#F97316' },
  mfa_challenge:    { label: 'MFA Challenge',   color: '#EAB308' },
  password_reset:   { label: 'Pwd Reset',       color: '#8BB8E8' },
  account_lock:     { label: 'Account Lock',    color: '#EF4444' },
};

const SEV_COLOR = { low: '#22C55E', medium: '#EAB308', high: '#F97316', critical: '#EF4444' };
const SEV_ORDER = ['critical', 'high', 'medium', 'low'];

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60)    return `${Math.round(s)}s ago`;
  if (s < 3600)  return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

function preciseTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  const date = dt.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
  const time = dt.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });
  const s = (Date.now() - dt.getTime()) / 1000;
  const ago = s < 60 ? `${Math.round(s)}s ago` : s < 3600 ? `${Math.round(s/60)}m ago` : `${Math.round(s/3600)}h ago`;
  return `${date} ${time} (${ago})`;
}

/* ══════════════════════════════════════════════════════════════════════════
   ADD EVENT PANEL
══════════════════════════════════════════════════════════════════════════ */
function AddEventPanel({ onCreated, onClose }) {
  const { addToast } = useStore();
  const [form, setForm] = useState({
    identity_label: '', event_type: 'login', success: true,
    source_ip: '', country: '', device_id: '', device_name: '',
    privilege_before: '', privilege_after: '', approved: '',
    notes: '', timestamp: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.identity_label.trim()) { addToast('Identity required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        success: form.event_type === 'failed_login' ? false : form.success,
        approved: form.approved === '' ? null : form.approved === 'true',
        timestamp: form.timestamp || undefined,
      };
      ['privilege_before','privilege_after','device_id','device_name',
       'source_ip','country','notes','timestamp'].forEach(k => {
        if (!payload[k]) payload[k] = null;
      });
      await api.post('/api/itdr/events', payload);
      onCreated();
      addToast('Event recorded', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
    setSaving(false);
  };

  const row = { display: 'flex', flexDirection: 'column', gap: 4 };
  const lbl = { fontSize: '0.67rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <div className="at-card" style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(74,126,200,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={14} style={{ color: '#4A7EC8' }} /> Add Auth Event
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={row}>
          <label style={lbl}>Identity *</label>
          <input className="at-input" value={form.identity_label} onChange={e => setForm(p => ({...p, identity_label: e.target.value}))} placeholder="user@corp.io" style={{ fontSize: '0.8rem', ...MONO }} />
        </div>
        <div style={row}>
          <label style={lbl}>Event Type</label>
          <select className="at-select" value={form.event_type} onChange={e => setForm(p => ({...p, event_type: e.target.value}))} style={{ fontSize: '0.8rem' }}>
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={row}>
          <label style={lbl}>Source IP</label>
          <input className="at-input" value={form.source_ip} onChange={e => setForm(p => ({...p, source_ip: e.target.value}))} placeholder="203.0.113.42" style={{ fontSize: '0.8rem', ...MONO }} />
        </div>
        <div style={row}>
          <label style={lbl}>Country (ISO)</label>
          <input className="at-input" value={form.country} onChange={e => setForm(p => ({...p, country: e.target.value}))} placeholder="CN" style={{ fontSize: '0.8rem', ...MONO }} />
        </div>
        <div style={row}>
          <label style={lbl}>Device ID / Name</label>
          <input className="at-input" value={form.device_name} onChange={e => setForm(p => ({...p, device_name: e.target.value}))} placeholder="MacBook-Unknown" style={{ fontSize: '0.8rem', ...MONO }} />
        </div>
        <div style={row}>
          <label style={lbl}>Timestamp (optional)</label>
          <input className="at-input" type="datetime-local" value={form.timestamp} onChange={e => setForm(p => ({...p, timestamp: e.target.value}))} style={{ fontSize: '0.8rem', ...MONO }} />
        </div>
        {form.event_type === 'privilege_change' && <>
          <div style={row}>
            <label style={lbl}>Privilege Before</label>
            <input className="at-input" value={form.privilege_before} onChange={e => setForm(p => ({...p, privilege_before: e.target.value}))} placeholder="user" style={{ fontSize: '0.8rem', ...MONO }} />
          </div>
          <div style={row}>
            <label style={lbl}>Privilege After</label>
            <input className="at-input" value={form.privilege_after} onChange={e => setForm(p => ({...p, privilege_after: e.target.value}))} placeholder="admin" style={{ fontSize: '0.8rem', ...MONO }} />
          </div>
          <div style={row}>
            <label style={lbl}>Approved?</label>
            <select className="at-select" value={form.approved} onChange={e => setForm(p => ({...p, approved: e.target.value}))} style={{ fontSize: '0.8rem' }}>
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: '0.78rem' }}>Cancel</button>
        <button className="btn-accent" onClick={submit} disabled={saving} style={{ fontSize: '0.78rem' }}>
          {saving ? <Loader2 size={12} className="spinner" /> : <Plus size={12} />} Add Event
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PARSE LOG PANEL
══════════════════════════════════════════════════════════════════════════ */
function ParseLogPanel({ onParsed, onClose }) {
  const { addToast } = useStore();
  const [text, setText]     = useState('');
  const [label, setLabel]   = useState('');
  const [loading, setLoad]  = useState(false);
  const [parsed, setParsed] = useState(null);

  const parse = async () => {
    if (!text.trim()) { addToast('Paste some log text first', 'error'); return; }
    setLoad(true);
    try {
      const r = await api.post('/api/itdr/events/parse', { text, identity_label: label });
      setParsed(r.data);
      if (r.data.count > 0) {
        await api.post('/api/itdr/events/bulk', { events: r.data.events });
        addToast(`${r.data.count} events imported`, 'success');
        onParsed();
      } else {
        addToast('No auth events detected in text', 'warning');
      }
    } catch (e) { addToast('Parse failed', 'error'); }
    setLoad(false);
  };

  return (
    <div className="at-card" style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(74,126,200,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7 }}>
          <FileText size={14} style={{ color: '#4A7EC8' }} /> AI Log Parser
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={14} /></button>
      </div>
      <input className="at-input" value={label} onChange={e => setLabel(e.target.value)}
        placeholder="Identity label (optional override)" style={{ marginBottom: 10, fontSize: '0.8rem', ...MONO }} />
      <textarea className="at-textarea" value={text} onChange={e => setText(e.target.value)}
        placeholder="Paste raw auth log text here — AI will extract login events, failures, privilege changes..." rows={6} style={{ fontSize: '0.78rem', ...MONO }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: '0.78rem' }}>Cancel</button>
        <button className="btn-accent" onClick={parse} disabled={loading} style={{ fontSize: '0.78rem' }}>
          {loading ? <Loader2 size={12} className="spinner" /> : <Zap size={12} />} Parse & Import
        </button>
      </div>
      {parsed && (
        <div style={{ marginTop: 12, fontSize: '0.72rem', color: '#787878', ...MONO }}>
          Extracted {parsed.count} event(s): {parsed.events?.slice(0, 4).map(e => `${e.event_type}@${e.identity_label}`).join(', ')}{parsed.count > 4 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DETECTION TAB  (existing auth events + anomalies panel)
══════════════════════════════════════════════════════════════════════════ */
function DetectionTab({ events, anomalies, loading }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      {/* Auth Event Log */}
      <div>
        <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Auth Events ({events.length})
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={18} className="spinner" style={{ color: '#787878' }} /></div>
        ) : events.length === 0 ? (
          <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#787878' }}>
            <User size={28} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <div style={{ fontSize: '0.82rem', marginBottom: 8 }}>No auth events yet</div>
            <div style={{ fontSize: '0.72rem', ...MONO, color: '#404040' }}>Add events manually or paste log text to get started</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {events.map(ev => {
              const meta = EVENT_TYPE_LABELS[ev.event_type] || { label: ev.event_type, color: '#787878' };
              return (
                <div key={ev.id} style={{ background: 'rgba(8,8,8,0.65)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{ev.identity_label || '—'}</span>
                      <span style={{ fontSize: '0.65rem', color: meta.color, background: `${meta.color}18`, padding: '1px 7px', borderRadius: 3, ...MONO, flexShrink: 0 }}>{meta.label}</span>
                      {!ev.success && <span style={{ fontSize: '0.62rem', color: '#EF4444', ...MONO }}>FAILED</span>}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {ev.source_ip && <span>{ev.source_ip}</span>}
                      {ev.country   && <span>{ev.country}</span>}
                      {ev.device_name && <span>{ev.device_name}</span>}
                      <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }}>{preciseTime(ev.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Detections */}
      <div>
        <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Active Detections ({anomalies.length})
        </div>
        {anomalies.length === 0 ? (
          <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#787878' }}>
            <CheckCircle size={28} style={{ margin: '0 auto 12px', color: '#22C55E', opacity: 0.4 }} />
            <div style={{ fontSize: '0.82rem' }}>No active threats detected</div>
            <div style={{ fontSize: '0.72rem', ...MONO, color: '#404040', marginTop: 6 }}>Run Analysis on an identity to check</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {anomalies.map(a => {
              const dm = DETECTOR_META[a.anomaly_type] || { label: a.anomaly_type, color: '#EF4444', Icon: AlertTriangle };
              const { Icon } = dm;
              return (
                <div key={a.id} style={{ background: `${SEV_COLOR[a.severity] || '#EF4444'}06`, border: `1px solid ${SEV_COLOR[a.severity] || '#EF4444'}22`, borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${SEV_COLOR[a.severity] || '#EF4444'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Icon size={14} style={{ color: dm.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: dm.color }}>{dm.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.64rem', color: SEV_COLOR[a.severity], ...MONO }}>{a.severity?.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#909090', lineHeight: 1.6, marginBottom: 8 }}>{a.description}</div>
                  <div style={{ fontSize: '0.64rem', color: '#787878', ...MONO }}>
                    Confidence: {Math.round((a.confidence || 0) * 100)}% · {timeAgo(a.detected_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detector reference */}
        <div className="at-card" style={{ padding: '14px 16px', marginTop: 16 }}>
          <div style={{ fontSize: '0.64rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            6 Detectors Active
          </div>
          {Object.entries(DETECTOR_META).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.72rem' }}>
              <v.Icon size={11} style={{ color: v.color, flexShrink: 0 }} />
              <span style={{ color: '#909090' }}>{v.label}</span>
              <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E55' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ALERTS TAB
══════════════════════════════════════════════════════════════════════════ */
function AlertsTab() {
  const { addToast } = useStore();
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [total, setTotal]         = useState(0);
  const [expanded, setExpanded]   = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [cmdLoading, setCmdLoading] = useState('');
  const [cmdResult, setCmdResult]   = useState({});   // alertId → result text

  const STATUS_FILTERS = ['all', 'open', 'investigating', 'resolved', 'false_positive'];
  const STATUS_COLORS  = { open: '#EF4444', investigating: '#F97316', resolved: '#22C55E', false_positive: '#787878' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const r = await api.get(`/api/itdr/alerts${params}`);
      setAlerts(r.data.items || []);
      setTotal(r.data.total || 0);
    } catch { /* empty */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/api/ingest/endpoints').then(r => setEndpoints(r.data || [])).catch(() => {});
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/api/itdr/alerts/${id}`, { status });
      addToast(`Alert marked as ${status}`, 'success');
      load();
    } catch { addToast('Update failed', 'error'); }
  };

  const dispatch = async (alertId, hostname, command, payload = {}) => {
    const ep = endpoints.find(e => e.hostname === hostname);
    if (!ep) { addToast('Endpoint not found or offline', 'error'); return; }
    const key = `${alertId}-${command}`;
    setCmdLoading(key);
    try {
      await api.post('/api/ingest/agent/command/dispatch', { agent_id: ep.id, command, payload });
      addToast(`✓ Command "${command}" sent — agent will execute within 10s`, 'success');
      setCmdResult(prev => ({ ...prev, [alertId]: `"${command}" dispatched successfully` }));
    } catch (e) {
      addToast(e.response?.data?.detail || 'Dispatch failed', 'error');
    }
    setCmdLoading('');
  };

  /* Parse evidence JSON into readable fields */
  const parseEvidence = (raw) => {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  };

  const EvidenceRow = ({ label, value, mono = true }) => value ? (
    <div style={{ display: 'flex', gap: 10, marginBottom: 5, alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.68rem', color: '#787878', minWidth: 110, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: '0.72rem', color: '#BDD4E8', ...(mono ? MONO : {}), wordBreak: 'break-all', lineHeight: 1.5 }}>{String(value)}</span>
    </div>
  ) : null;

  const ActionBtn = ({ label, color, bg, border, onClick, loading: isLoading }) => (
    <button onClick={onClick} disabled={!!isLoading}
      style={{ fontSize: '0.68rem', background: bg, border: `1px solid ${border}`, color, borderRadius: 5,
        padding: '4px 10px', cursor: isLoading ? 'not-allowed' : 'pointer', ...MONO, opacity: isLoading ? 0.6 : 1,
        display: 'flex', alignItems: 'center', gap: 5, transition: 'opacity 0.15s' }}>
      {isLoading ? <Loader2 size={10} className="spinner"/> : null}{label}
    </button>
  );

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid', fontSize: '0.72rem', cursor: 'pointer', ...MONO, textTransform: 'uppercase', letterSpacing: '0.06em',
              background: filter === f ? 'rgba(74,126,200,0.12)' : 'transparent',
              color: filter === f ? '#8BB8E8' : '#787878',
              borderColor: filter === f ? 'rgba(74,126,200,0.3)' : 'rgba(255,255,255,0.07)',
            }}>
            {f.replace('_', ' ')}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#787878', ...MONO, alignSelf: 'center' }}>
          {total} total
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Loader2 size={20} className="spinner" style={{ color: '#787878' }} /></div>
      ) : alerts.length === 0 ? (
        <div className="at-card" style={{ padding: 60, textAlign: 'center', color: '#787878' }}>
          <CheckCircle size={32} style={{ margin: '0 auto 14px', color: '#22C55E', opacity: 0.3 }} />
          <div style={{ fontSize: '0.85rem' }}>No alerts for this filter</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map(a => {
            // Falco alerts have prefix "falco_<rule>" — map them to the Falco meta
            const isFalco = a.alert_type?.startsWith('falco_');
            const dmKey   = isFalco ? 'falco_alert' : a.alert_type;
            const dm  = DETECTOR_META[dmKey] || { label: a.alert_type?.replace(/_/g, ' ') || 'Alert', color: '#EF4444', Icon: AlertTriangle };
            const { Icon } = dm;
            const sc  = STATUS_COLORS[a.status] || '#787878';
            const ev  = parseEvidence(a.evidence);
            const isOpen = expanded === a.id;
            const hostname = a.identity_label || '';
            const hasPid = ev.process_pid || ev.pid;
            const hasIp  = ev.remote_ip || ev.destination_ip || ev.source_ip;

            return (
              <div key={a.id} className="at-card"
                style={{ padding: 0, borderLeft: `3px solid ${SEV_COLOR[a.severity] || '#EF4444'}`, overflow: 'hidden' }}>

                {/* ── Alert header (always visible, clickable) ── */}
                <div onClick={() => setExpanded(isOpen ? null : a.id)}
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Icon size={15} style={{ color: dm.color, marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#BDD4E8' }}>{dm.label}</span>
                      <span style={{ fontSize: '0.64rem', color: SEV_COLOR[a.severity], background: `${SEV_COLOR[a.severity]}14`, padding: '1px 7px', borderRadius: 3, ...MONO }}>
                        {(a.severity || 'low').toUpperCase()}
                      </span>
                      {hostname && <span style={{ fontSize: '0.7rem', color: '#787878', ...MONO }}>🖥 {hostname}</span>}
                      <span style={{ marginLeft: 'auto', fontSize: '0.64rem', color: sc, background: `${sc}14`, padding: '1px 8px', borderRadius: 3, ...MONO, textTransform: 'uppercase' }}>
                        {(a.status || 'open').replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#5A5A5A' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                    {a.description && (
                      <div style={{ fontSize: '0.76rem', color: '#909090', lineHeight: 1.5 }}>{a.description}</div>
                    )}
                    <div style={{ marginTop: 6, fontSize: '0.64rem', color: '#787878', ...MONO }}>🕐 {preciseTime(a.detected_at)}</div>
                  </div>
                </div>

                {/* ── Expanded detail + actions ── */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 18px', background: 'rgba(0,0,0,0.25)' }}>

                    {/* Evidence fields */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: '0.65rem', color: '#4A7EC8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, ...MONO }}>
                        ◇ Evidence
                      </div>
                      <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <EvidenceRow label="Process"     value={ev.process_name ? `${ev.process_name} (PID ${ev.process_pid || '?'})` : null} />
                        <EvidenceRow label="User"        value={ev.username} />
                        <EvidenceRow label="Cmdline"     value={ev.cmdline} />
                        <EvidenceRow label="Parent"      value={ev.parent_name} />
                        <EvidenceRow label="Honey File"  value={ev.honey_file} />
                        <EvidenceRow label="Path"        value={ev.path} />
                        <EvidenceRow label="Old Hash"    value={ev.old_hash} />
                        <EvidenceRow label="New Hash"    value={ev.new_hash} />
                        <EvidenceRow label="Remote IP"   value={ev.remote_ip || ev.destination_ip} />
                        <EvidenceRow label="Remote Port" value={ev.remote_port} />
                        <EvidenceRow label="Domain"      value={ev.domain} />
                        <EvidenceRow label="Severity"    value={ev.severity} />
                        {Object.keys(ev).length === 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#555' }}>No evidence data</div>
                        )}
                      </div>
                    </div>

                    {/* Response actions */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.65rem', color: '#4A7EC8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, ...MONO }}>
                        ◇ Response Actions
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {hasPid && (
                          <ActionBtn label={`⚡ Kill Process (PID ${hasPid})`}
                            color="#EF4444" bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.25)"
                            loading={cmdLoading === `${a.id}-kill_process`}
                            onClick={() => dispatch(a.id, hostname, 'kill_process', { pid: hasPid })} />
                        )}
                        {hasPid && (
                          <ActionBtn label="🌲 Process Tree"
                            color="#8BB8E8" bg="rgba(139,184,232,0.08)" border="rgba(139,184,232,0.2)"
                            loading={cmdLoading === `${a.id}-get_process_tree`}
                            onClick={() => dispatch(a.id, hostname, 'get_process_tree', { pid: hasPid })} />
                        )}
                        {hasIp && (
                          <ActionBtn label={`🚫 Block IP (${hasIp})`}
                            color="#F97316" bg="rgba(249,115,22,0.08)" border="rgba(249,115,22,0.25)"
                            loading={cmdLoading === `${a.id}-block_ip`}
                            onClick={() => dispatch(a.id, hostname, 'block_ip', { ip: hasIp })} />
                        )}
                        <ActionBtn label="⚡ Collect Now"
                          color="#22C55E" bg="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.2)"
                          loading={cmdLoading === `${a.id}-collect_now`}
                          onClick={() => dispatch(a.id, hostname, 'collect_now')} />
                        <ActionBtn label="🔒 Isolate Device"
                          color="#EF4444" bg="rgba(239,68,68,0.05)" border="rgba(239,68,68,0.15)"
                          loading={cmdLoading === `${a.id}-isolate_device`}
                          onClick={() => { if (window.confirm(`Isolate ${hostname}? This blocks ALL outbound traffic.`)) dispatch(a.id, hostname, 'isolate_device'); }} />
                      </div>

                      {/* Command result feedback */}
                      {cmdResult[a.id] && (
                        <div style={{ marginTop: 10, fontSize: '0.7rem', color: '#22C55E', ...MONO, padding: '6px 10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 5 }}>
                          ✓ {cmdResult[a.id]}
                        </div>
                      )}
                    </div>

                    {/* Status actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      {a.status === 'open' && <>
                        <button onClick={() => updateStatus(a.id, 'investigating')}
                          style={{ fontSize: '0.65rem', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#F97316', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', ...MONO }}>
                          Investigate
                        </button>
                        <button onClick={() => updateStatus(a.id, 'false_positive')}
                          style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#787878', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', ...MONO }}>
                          False Positive
                        </button>
                      </>}
                      {a.status === 'investigating' && (
                        <button onClick={() => updateStatus(a.id, 'resolved')}
                          style={{ fontSize: '0.65rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', ...MONO }}>
                          ✓ Resolve
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ANALYTICS TAB
══════════════════════════════════════════════════════════════════════════ */
function AnalyticsTab() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [period, setPeriod] = useState(30);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const r = await api.get(`/api/itdr/analytics?days=${period}`);
      setData(r.data);
    } catch { /* empty */ }
    setLoad(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <Loader2 size={22} className="spinner" style={{ color: '#4A7EC8' }} />
      <div style={{ fontSize: '0.72rem', color: '#787878', marginTop: 12, ...MONO }}>Loading analytics…</div>
    </div>
  );

  if (!data) return (
    <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#787878' }}>
      <AlertCircle size={28} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
      <div>Could not load analytics</div>
    </div>
  );

  const maxDetector = Math.max(1, ...data.detector_fire_rates.map(d => d.count));
  const maxIdentity = Math.max(1, ...(data.top_targeted_identities.map(d => d.count) || [1]));
  const maxTrend    = Math.max(1, ...data.daily_trend.map(d => d.count));
  const sevTotal    = Object.values(data.severity_distribution).reduce((a, b) => a + b, 0) || 1;

  const KPICard = ({ label, value, sub, color = '#BDD4E8', icon: Icon }) => (
    <div className="at-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      {Icon && <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} style={{ color: '#4A7EC8' }} />
      </div>}
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1.1, ...MONO }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: '#BDD4E8', fontWeight: 500, marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.64rem', color: '#787878', marginTop: 2, ...MONO }}>{sub}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Showing last {period} days
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              style={{ padding: '4px 11px', borderRadius: 5, border: '1px solid', fontSize: '0.7rem', cursor: 'pointer', ...MONO,
                background: period === d ? 'rgba(74,126,200,0.12)' : 'transparent',
                color: period === d ? '#8BB8E8' : '#787878',
                borderColor: period === d ? 'rgba(74,126,200,0.3)' : 'rgba(255,255,255,0.07)',
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Total Detections"  value={data.total_detections}  sub={`${period}d window`}          icon={Activity}   />
        <KPICard label="Active Threats"    value={data.active_threats}    sub="unresolved now"               icon={AlertTriangle} color={data.active_threats > 0 ? '#EF4444' : '#22C55E'} />
        <KPICard label="Total Alerts"      value={data.total_alerts}      sub="from agents + analysis"       icon={Bell ?? Eye} />
        <KPICard label="False Positive Rate" value={`${data.fp_rate}%`}  sub={`${data.fp_count} FP alerts`} icon={Target}      color={data.fp_rate > 20 ? '#F97316' : '#BDD4E8'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>

        {/* Detector fire rates */}
        <div className="at-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Detector Fire Rates
          </div>
          {data.detector_fire_rates.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#787878', fontSize: '0.8rem' }}>
              No detections in this period
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.detector_fire_rates.map(d => {
                const dm = DETECTOR_META[d.detector] || { label: d.detector, color: '#4A7EC8', Icon: Shield };
                const pct = Math.round((d.count / maxDetector) * 100);
                return (
                  <div key={d.detector}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <dm.Icon size={12} style={{ color: dm.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.76rem', color: '#7A9DB8' }}>{dm.label}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#BDD4E8', fontWeight: 600, ...MONO }}>{d.count}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: dm.color, borderRadius: 3, transition: 'width 0.6s ease', opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Severity distribution + Status breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Severity */}
          <div className="at-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Severity Distribution
            </div>
            {/* Stacked bar */}
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 14, gap: 1 }}>
              {SEV_ORDER.map(s => {
                const pct = (data.severity_distribution[s] / sevTotal) * 100;
                if (pct === 0) return null;
                return <div key={s} style={{ width: `${pct}%`, background: SEV_COLOR[s], transition: 'width 0.6s ease' }} />;
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SEV_ORDER.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: SEV_COLOR[s], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', color: '#7A9DB8', textTransform: 'capitalize' }}>{s}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, color: '#BDD4E8', ...MONO }}>{data.severity_distribution[s]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="at-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Alert Status
            </div>
            {Object.keys(data.status_breakdown).length === 0 ? (
              <div style={{ fontSize: '0.76rem', color: '#787878' }}>No alerts recorded yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(data.status_breakdown).map(([st, count]) => {
                  const c = { open: '#EF4444', investigating: '#F97316', resolved: '#22C55E', false_positive: '#787878' }[st] || '#4A7EC8';
                  const pct = Math.round((count / Math.max(1, data.total_alerts)) * 100);
                  return (
                    <div key={st}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.72rem', color: '#7A9DB8', textTransform: 'capitalize' }}>{st.replace('_', ' ')}</span>
                        <span style={{ fontSize: '0.72rem', color: '#BDD4E8', fontWeight: 600, ...MONO }}>{count} <span style={{ color: '#787878', fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 2, opacity: 0.75 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 30-day trend */}
      <div className="at-card" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Daily Detection Trend — last {Math.min(period, 30)} days
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, overflowX: 'auto' }}>
          {data.daily_trend.map((d, i) => {
            const h = maxTrend === 0 ? 4 : Math.max(4, Math.round((d.count / maxTrend) * 68));
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            return (
              <div key={i} title={`${d.date}: ${d.count} detection(s)`}
                style={{ flex: 1, minWidth: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'default' }}>
                <div style={{
                  width: '100%', height: h,
                  background: d.count > 0 ? (isToday ? '#4A7EC8' : 'rgba(74,126,200,0.4)') : 'rgba(74,126,200,0.05)',
                  borderRadius: '2px 2px 0 0',
                  transition: 'height 0.4s ease',
                }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.6rem', color: '#555', ...MONO }}>
          <span>{data.daily_trend[0]?.date}</span>
          <span>{data.daily_trend[Math.floor(data.daily_trend.length / 2)]?.date}</span>
          <span>{data.daily_trend[data.daily_trend.length - 1]?.date}</span>
        </div>
      </div>

      {/* Top targeted identities */}
      {data.top_targeted_identities.length > 0 && (
        <div className="at-card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Top Targeted Identities
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {data.top_targeted_identities.map((item, i) => {
              const pct = Math.round((item.count / maxIdentity) * 100);
              return (
                <div key={item.identity}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: '0.68rem', color: '#787878', ...MONO, width: 16, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                    <span style={{ fontSize: '0.78rem', color: '#BDD4E8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...MONO }}>{item.identity}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: i === 0 ? '#EF4444' : '#7A9DB8', ...MONO, flexShrink: 0 }}>{item.count} alert{item.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginLeft: 26, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#EF4444' : '#4A7EC8', borderRadius: 2, opacity: 0.7 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function ITDRPage() {
  const { addToast }   = useStore();
  const [tab, setTab]  = useState('detection');
  const [events, setEvents]       = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [showParse, setShowParse] = useState(false);
  const [analyseForm, setAnalyseForm] = useState({ identity_label: '', node_id: '' });

  const loadDetection = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/itdr/events?limit=50'),
      api.get('/api/itdr/anomalies'),
    ]).then(([evRes, anRes]) => {
      setEvents(evRes.data);
      setAnomalies(anRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadDetection(); }, [loadDetection]);

  const runAnalysis = async () => {
    const identity_label = analyseForm.identity_label.trim();
    const node_id = analyseForm.node_id ? parseInt(analyseForm.node_id) : undefined;
    if (!identity_label && !node_id) { addToast('Enter an identity label or node ID', 'error'); return; }
    setAnalysing(true);
    try {
      const res = await api.post('/api/itdr/analyse', { identity_label, node_id });
      loadDetection();
      if (res.data.detections.length === 0) {
        addToast('No threats detected for this identity', 'success');
      } else {
        addToast(`${res.data.detections.length} threat(s) detected!`, 'error');
      }
    } catch (e) { addToast(e.response?.data?.detail || 'Analysis failed', 'error'); }
    setAnalysing(false);
  };

  const TABS = [
    { key: 'detection', label: 'Detection',  icon: Shield },
    { key: 'alerts',    label: 'Alerts',     icon: AlertTriangle },
    { key: 'analytics', label: 'Analytics',  icon: BarChart3 },
  ];

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Shield size={20} style={{ color: '#4A7EC8' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Identity Threat Detection & Response</h1>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#787878', ...MONO }}>
            6 identity detectors · credential stuffing · impossible travel · new device · privilege escalation · token theft · shadow AI
            {' · '}
            <span style={{ color: '#A78BFA', fontWeight: 600 }}>Layer 3: Falco eBPF</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'detection' && <>
            <button className="btn-ghost" onClick={() => { setShowParse(!showParse); setShowAdd(false); }} style={{ fontSize: '0.78rem' }}>
              <FileText size={13} /> Parse Logs
            </button>
            <button className="btn-ghost" onClick={() => { setShowAdd(!showAdd); setShowParse(false); }} style={{ fontSize: '0.78rem' }}>
              <Plus size={13} /> Add Event
            </button>
            <button className="btn-ghost" onClick={loadDetection} style={{ fontSize: '0.78rem' }}>
              <RefreshCw size={13} />
            </button>
          </>}
        </div>
      </div>

      {/* Forms (Detection tab only) */}
      {tab === 'detection' && showAdd   && <AddEventPanel onCreated={() => { loadDetection(); setShowAdd(false); }} onClose={() => setShowAdd(false)} />}
      {tab === 'detection' && showParse && <ParseLogPanel onParsed={() => { loadDetection(); setShowParse(false); }} onClose={() => setShowParse(false)} />}

      {/* Run Analysis bar (Detection tab only) */}
      {tab === 'detection' && (
        <div className="at-card" style={{ padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <AlertTriangle size={14} style={{ color: '#4A7EC8', flexShrink: 0 }} />
          <div style={{ fontSize: '0.76rem', color: '#909090', flex: 1 }}>Run all 6 ITDR detectors for a specific identity</div>
          <input className="at-input" value={analyseForm.identity_label}
            onChange={e => setAnalyseForm(p => ({...p, identity_label: e.target.value}))}
            onKeyDown={e => e.key === 'Enter' && runAnalysis()}
            placeholder="user@company.com" style={{ width: 220, fontSize: '0.78rem', ...MONO }} />
          <button className="btn-accent" onClick={runAnalysis} disabled={analysing} style={{ fontSize: '0.78rem' }}>
            {analysing ? <Loader2 size={13} className="spinner" /> : <Zap size={13} />}
            {analysing ? 'Analysing…' : 'Run Analysis'}
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 24, gap: 0 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} className="tab-btn" onClick={() => setTab(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            data-active={tab === key}>
            <Icon size={13} />
            {label}
            {key === 'alerts' && anomalies.length > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', fontSize: '0.58rem', padding: '0 5px', borderRadius: 10, ...MONO, fontWeight: 700, marginLeft: 2 }}>
                {anomalies.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'detection' && <DetectionTab events={events} anomalies={anomalies} loading={loading} />}
      {tab === 'alerts'    && <AlertsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}
