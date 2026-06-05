import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, Plus, Loader2, RefreshCw,
  MapPin, Smartphone, Key, User, Clock, ChevronRight,
  CheckCircle, X, Zap, FileText
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const DETECTOR_META = {
  credential_stuffing:    { label: 'Credential Stuffing',   color: '#EF4444', Icon: Key },
  impossible_travel:      { label: 'Impossible Travel',     color: '#F97316', Icon: MapPin },
  new_device:             { label: 'New Device',            color: '#EAB308', Icon: Smartphone },
  privilege_escalation:   { label: 'Privilege Escalation',  color: '#EF4444', Icon: Shield },
};

const EVENT_TYPE_LABELS = {
  login:            { label: 'Login',             color: '#22C55E' },
  failed_login:     { label: 'Failed Login',      color: '#EF4444' },
  logout:           { label: 'Logout',            color: '#787878' },
  privilege_change: { label: 'Privilege Change',  color: '#F97316' },
  mfa_challenge:    { label: 'MFA Challenge',     color: '#EAB308' },
  password_reset:   { label: 'Password Reset',    color: '#A78BFA' },
  account_lock:     { label: 'Account Lock',      color: '#EF4444' },
};

const SEV = { low: '#22C55E', medium: '#EAB308', high: '#F97316', critical: '#EF4444' };

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60)    return `${Math.round(s)}s ago`;
  if (s < 3600)  return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

/* ── Add Event Form ──────────────────────────────────────────────────────── */
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
        success: form.event_type === 'login' ? form.success : form.event_type !== 'failed_login',
        approved: form.approved === '' ? null : form.approved === 'true',
        timestamp: form.timestamp || undefined,
      };
      ['privilege_before', 'privilege_after', 'device_id', 'device_name',
       'source_ip', 'country', 'notes', 'timestamp'].forEach(k => {
        if (!payload[k]) payload[k] = null;
      });
      await api.post('/api/itdr/events', payload);
      onCreated();
      addToast('Event recorded', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
    setSaving(false);
  };

  return (
    <div className="at-card" style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(74,142,219,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={14} style={{ color: '#4A8EDB' }} /> Add Auth Event
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label className="at-label">Identity *</label>
          <input className="at-input" value={form.identity_label} onChange={e => setForm(p => ({...p, identity_label: e.target.value}))} placeholder="user@company.com" style={{ fontSize: '0.8rem', ...MONO }} />
        </div>
        <div>
          <label className="at-label">Event Type</label>
          <select className="at-select" value={form.event_type} onChange={e => setForm(p => ({...p, event_type: e.target.value}))} style={{ width: '100%', fontSize: '0.8rem' }}>
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="at-label">Timestamp (optional)</label>
          <input className="at-input" type="datetime-local" value={form.timestamp} onChange={e => setForm(p => ({...p, timestamp: e.target.value}))} style={{ fontSize: '0.78rem' }} />
        </div>
        <div>
          <label className="at-label">Source IP</label>
          <input className="at-input" value={form.source_ip} onChange={e => setForm(p => ({...p, source_ip: e.target.value}))} placeholder="185.220.101.34" style={{ fontSize: '0.8rem', ...MONO }} />
        </div>
        <div>
          <label className="at-label">Country (2-letter code)</label>
          <input className="at-input" value={form.country} onChange={e => setForm(p => ({...p, country: e.target.value.toUpperCase()}))} placeholder="IE" maxLength={2} style={{ fontSize: '0.8rem', ...MONO }} />
        </div>
        <div>
          <label className="at-label">Device Name</label>
          <input className="at-input" value={form.device_name} onChange={e => setForm(p => ({...p, device_name: e.target.value}))} placeholder="MacBook Pro" style={{ fontSize: '0.8rem' }} />
        </div>
        {form.event_type === 'privilege_change' && (
          <>
            <div>
              <label className="at-label">Privilege Before</label>
              <input className="at-input" value={form.privilege_before} onChange={e => setForm(p => ({...p, privilege_before: e.target.value}))} placeholder="user" style={{ fontSize: '0.8rem', ...MONO }} />
            </div>
            <div>
              <label className="at-label">Privilege After</label>
              <input className="at-input" value={form.privilege_after} onChange={e => setForm(p => ({...p, privilege_after: e.target.value}))} placeholder="admin" style={{ fontSize: '0.8rem', ...MONO }} />
            </div>
            <div>
              <label className="at-label">Approved?</label>
              <select className="at-select" value={form.approved} onChange={e => setForm(p => ({...p, approved: e.target.value}))} style={{ width: '100%', fontSize: '0.8rem' }}>
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </>
        )}
        <div style={{ gridColumn: '1/-1' }}>
          <label className="at-label">Notes</label>
          <input className="at-input" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Optional context..." style={{ fontSize: '0.8rem' }} />
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button className="btn-accent" onClick={submit} disabled={saving} style={{ fontSize: '0.8rem' }}>
          {saving ? <Loader2 size={13} className="spinner" /> : <Plus size={13} />} Record Event
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: '0.8rem' }}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Parse Log Panel ─────────────────────────────────────────────────────── */
function ParseLogPanel({ onParsed, onClose }) {
  const { addToast } = useStore();
  const [logText, setLogText] = useState('');
  const [identity, setIdentity] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);

  const parse = async () => {
    if (!logText.trim()) { addToast('Paste log text first', 'error'); return; }
    setParsing(true);
    try {
      const res = await api.post('/api/itdr/events/parse', {
        text: logText, identity_label: identity,
      });
      setParsed(res.data);
    } catch { addToast('Parse failed', 'error'); }
    setParsing(false);
  };

  const importAll = async () => {
    if (!parsed?.events?.length) return;
    setSaving(true);
    try {
      await api.post('/api/itdr/events/bulk', { events: parsed.events });
      onParsed();
      addToast(`${parsed.events.length} events imported`, 'success');
    } catch { addToast('Import failed', 'error'); }
    setSaving(false);
  };

  return (
    <div className="at-card" style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(167,139,250,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7 }}>
          <FileText size={14} style={{ color: '#A78BFA' }} /> Parse Log Text
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={14} /></button>
      </div>
      <input className="at-input" value={identity} onChange={e => setIdentity(e.target.value)} placeholder="Default identity label (optional)" style={{ fontSize: '0.8rem', marginBottom: 10, ...MONO }} />
      <textarea value={logText} onChange={e => setLogText(e.target.value)}
        placeholder="Paste auth log lines here — AI will extract structured events..."
        rows={6} style={{ width: '100%', background: '#080808', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#22C55E', fontSize: '0.75rem', padding: '10px 12px', resize: 'vertical', outline: 'none', lineHeight: 1.6, ...MONO, boxSizing: 'border-box', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-accent" onClick={parse} disabled={parsing} style={{ fontSize: '0.8rem' }}>
          {parsing ? <Loader2 size={13} className="spinner" /> : <Zap size={13} />}
          {parsing ? 'Parsing…' : 'Parse with AI'}
        </button>
        {parsed?.events?.length > 0 && (
          <button className="btn-ghost" onClick={importAll} disabled={saving} style={{ fontSize: '0.8rem', color: '#22C55E' }}>
            {saving ? <Loader2 size={12} className="spinner" /> : <CheckCircle size={12} />}
            Import {parsed.events.length} events
          </button>
        )}
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: '0.8rem' }}>Cancel</button>
      </div>
      {parsed?.events?.length > 0 && (
        <div style={{ marginTop: 12, fontSize: '0.72rem', color: '#787878', ...MONO }}>
          Extracted: {parsed.events.map(e => `${e.event_type}@${e.identity_label}`).slice(0, 5).join(', ')}{parsed.events.length > 5 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function ITDRPage() {
  const { addToast } = useStore();
  const [events, setEvents]     = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [showParse, setShowParse] = useState(false);
  const [analyseForm, setAnalyseForm] = useState({ identity_label: '', node_id: '' });

  const load = useCallback(() => {
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

  useEffect(() => { load(); }, [load]);

  const runAnalysis = async () => {
    const identity_label = analyseForm.identity_label.trim();
    const node_id = analyseForm.node_id ? parseInt(analyseForm.node_id) : undefined;
    if (!identity_label && !node_id) { addToast('Enter an identity label or node ID', 'error'); return; }
    setAnalysing(true);
    try {
      const res = await api.post('/api/itdr/analyse', { identity_label, node_id });
      load();
      if (res.data.detections.length === 0) {
        addToast('No threats detected for this identity', 'success');
      } else {
        addToast(`${res.data.detections.length} threat(s) detected!`, 'error');
      }
    } catch (e) { addToast(e.response?.data?.detail || 'Analysis failed', 'error'); }
    setAnalysing(false);
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Shield size={20} style={{ color: '#4A8EDB' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Identity Threat Detection & Response</h1>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#787878', ...MONO }}>
            4 detectors: credential stuffing · impossible travel · new device · privilege escalation
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => { setShowParse(!showParse); setShowAdd(false); }} style={{ fontSize: '0.78rem' }}>
            <FileText size={13} /> Parse Logs
          </button>
          <button className="btn-ghost" onClick={() => { setShowAdd(!showAdd); setShowParse(false); }} style={{ fontSize: '0.78rem' }}>
            <Plus size={13} /> Add Event
          </button>
          <button className="btn-ghost" onClick={load} style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Forms */}
      {showAdd    && <AddEventPanel onCreated={() => { load(); setShowAdd(false); }} onClose={() => setShowAdd(false)} />}
      {showParse  && <ParseLogPanel onParsed={() => { load(); setShowParse(false); }} onClose={() => setShowParse(false)} />}

      {/* Run Analysis */}
      <div className="at-card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <AlertTriangle size={15} style={{ color: '#4A8EDB', flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', color: '#909090', flex: 1 }}>Run all 4 ITDR detectors for a specific identity</div>
        <input className="at-input" value={analyseForm.identity_label} onChange={e => setAnalyseForm(p => ({...p, identity_label: e.target.value}))}
          placeholder="user@company.com" style={{ width: 220, fontSize: '0.78rem', ...MONO }} />
        <button className="btn-accent" onClick={runAnalysis} disabled={analysing} style={{ fontSize: '0.8rem' }}>
          {analysing ? <Loader2 size={13} className="spinner" /> : <Zap size={13} />}
          {analysing ? 'Analysing…' : 'Run Analysis'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>

        {/* Auth Event Log */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: '0.7rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Auth Events ({events.length})
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={18} className="spinner" style={{ color: '#787878' }} /></div>
          ) : events.length === 0 ? (
            <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#787878' }}>
              <User size={28} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <div style={{ fontSize: '0.82rem', marginBottom: 8 }}>No auth events yet</div>
              <div style={{ fontSize: '0.74rem', ...MONO, color: '#404040' }}>Add events manually or paste log text to get started</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {events.map(ev => {
                const meta = EVENT_TYPE_LABELS[ev.event_type] || { label: ev.event_type, color: '#787878' };
                return (
                  <div key={ev.id} style={{ background: 'rgba(8,8,8,0.65)', border: '1px solid rgba(148,163,184,0.08)', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{ev.identity_label || '—'}</span>
                        <span style={{ fontSize: '0.65rem', color: meta.color, background: `${meta.color}15`, padding: '1px 7px', borderRadius: 3, ...MONO, flexShrink: 0 }}>{meta.label}</span>
                        {!ev.success && <span style={{ fontSize: '0.62rem', color: '#EF4444', ...MONO }}>FAILED</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {ev.source_ip && <span>{ev.source_ip}</span>}
                        {ev.country && <span>{ev.country}</span>}
                        {ev.device_name && <span>{ev.device_name}</span>}
                        <span style={{ marginLeft: 'auto' }}>{timeAgo(ev.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detections */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
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
                  <div key={a.id} style={{ background: `${SEV[a.severity] || '#EF4444'}06`, border: `1px solid ${SEV[a.severity] || '#EF4444'}22`, borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${SEV[a.severity] || '#EF4444'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Icon size={15} style={{ color: dm.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.84rem', color: dm.color }}>{dm.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: SEV[a.severity], ...MONO }}>{a.severity?.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#909090', lineHeight: 1.6, marginBottom: 8 }}>{a.description}</div>
                    <div style={{ fontSize: '0.65rem', color: '#787878', ...MONO }}>
                      Confidence: {Math.round(a.confidence * 100)}% · {timeAgo(a.detected_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detector reference */}
          <div className="at-card" style={{ padding: '14px 16px', marginTop: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#787878', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Detectors Active</div>
            {Object.entries(DETECTOR_META).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.74rem' }}>
                <v.Icon size={12} style={{ color: v.color, flexShrink: 0 }} />
                <span style={{ color: '#909090' }}>{v.label}</span>
                <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
