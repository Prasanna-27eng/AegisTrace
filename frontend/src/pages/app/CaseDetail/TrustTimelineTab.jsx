import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Loader2, X, Shield, User, Bot, Zap, Check, AlertTriangle, Lock, Key, Activity } from '../../../components/icons';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const CATEGORY_META = {
  login:           { label: 'Login',            color: '#22C55E',  Icon: User },
  token_use:       { label: 'Token Use',         color: '#EAB308',  Icon: Key },
  privilege_change:{ label: 'Privilege Change',  color: '#F97316',  Icon: Shield },
  agent_action:    { label: 'Agent Action',      color: '#4A7EC8',  Icon: Bot },
  ai_output:       { label: 'AI Output',         color: '#8BB8E8',  Icon: Bot },
  approval:        { label: 'Approved',          color: '#22C55E',  Icon: Check },
  rejection:       { label: 'Rejected',          color: '#EF4444',  Icon: X },
  policy_override: { label: 'Policy Override',   color: '#F97316',  Icon: AlertTriangle },
  response_action: { label: 'Response Action',   color: '#4A7EC8',  Icon: Zap },
  action:          { label: 'Action',            color: '#787878',  Icon: Activity },
};

const TRUST_COLOR = {
  verified:   '#22C55E',
  unverified: '#EAB308',
  suspicious: '#EF4444',
  revoked:    '#888888',
};

const ACTOR_TYPE_COLOR = { human: '#BDD4E8', ai: '#8BB8E8', agent: '#4A7EC8', system: '#787878' };

function timeLabel(d) {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TrustTimelineTab({ caseId }) {
  const { addToast, user } = useStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    event_category: 'action', actor: '', actor_type: 'human',
    description: '', trust_level: 'verified', evidence_ref: '',
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/api/trust/events/case/${caseId}`)
      .then(r => { setEvents(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (caseId && caseId !== 'new') load(); }, [caseId]);

  const addEvent = async () => {
    if (!form.description.trim()) { addToast('Description required', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/api/trust/events', { ...form, case_id: parseInt(caseId) });
      setShowAdd(false);
      setForm({ event_category: 'action', actor: '', actor_type: 'human', description: '', trust_level: 'verified', evidence_ref: '' });
      load(); addToast('Trust event recorded', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
    setSaving(false);
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitBranch size={17} style={{ color: '#8BB8E8' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Trust Timeline</div>
            <div style={{ fontSize: '0.7rem', color: '#787878', marginTop: 1 }}>Chain of trust events — logins, token use, privilege changes, agent actions, approvals</div>
          </div>
        </div>
        <button className="btn-ghost" onClick={() => setShowAdd(p => !p)} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={13} /> Add Event
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="at-card" style={{ padding: 16, marginBottom: 18, borderColor: 'rgba(143,175,192,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="at-label">Event Category</label>
              <select className="at-select" value={form.event_category} onChange={e => setForm(p => ({ ...p, event_category: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="at-label">Trust Level</label>
              <select className="at-select" value={form.trust_level} onChange={e => setForm(p => ({ ...p, trust_level: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                {['verified', 'unverified', 'suspicious', 'revoked'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="at-label">Actor (email / name / agent)</label>
              <input className="at-input" value={form.actor} onChange={e => setForm(p => ({ ...p, actor: e.target.value }))} placeholder={user?.email || 'analyst@company.com'} style={{ fontSize: '0.8rem', ...MONO }} />
            </div>
            <div>
              <label className="at-label">Actor Type</label>
              <select className="at-select" value={form.actor_type} onChange={e => setForm(p => ({ ...p, actor_type: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                {['human', 'ai', 'agent', 'system'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="at-label">Description *</label>
              <input className="at-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What happened? e.g. Admin account logged in from 185.220.101.34 at 02:14 UTC" style={{ fontSize: '0.8rem' }} />
            </div>
            <div>
              <label className="at-label">Evidence Reference (optional)</label>
              <input className="at-input" value={form.evidence_ref} onChange={e => setForm(p => ({ ...p, evidence_ref: e.target.value }))} placeholder="ioc:185.220.101.34 or case:456" style={{ fontSize: '0.75rem', ...MONO }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-accent" onClick={addEvent} disabled={saving} style={{ fontSize: '0.78rem' }}>
              {saving ? <Loader2 size={12} className="spinner" /> : <Plus size={12} />} Record Event
            </button>
            <button className="btn-ghost" onClick={() => setShowAdd(false)} style={{ fontSize: '0.78rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#787878' }}><Loader2 size={18} className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#787878' }}>
          <GitBranch size={28} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <div style={{ fontSize: '0.82rem', marginBottom: 12 }}>No trust events recorded yet.</div>
          <div style={{ fontSize: '0.74rem', ...MONO, color: '#555' }}>Trust events are automatically recorded when AI analysis runs, or you can add them manually.</div>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 1, background: 'rgba(255,255,255,0.08)' }} />

          {events.map((ev, i) => {
            const meta = CATEGORY_META[ev.event_category] || CATEGORY_META.action;
            const { Icon } = meta;
            return (
              <div key={ev.id} style={{ position: 'relative', marginBottom: 18, paddingLeft: 24 }}>
                {/* Node dot */}
                <div style={{
                  position: 'absolute', left: -17, top: 6,
                  width: 14, height: 14, borderRadius: '50%',
                  background: TRUST_COLOR[ev.trust_level] || '#888888',
                  border: `2px solid #111111`,
                  boxShadow: `0 0 8px ${TRUST_COLOR[ev.trust_level] || '#888888'}66`,
                }} />

                <div style={{ background: 'rgba(240,240,248,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon size={13} style={{ color: meta.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: meta.color, ...MONO }}>{meta.label}</span>
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 3, background: `${TRUST_COLOR[ev.trust_level]}18`, color: TRUST_COLOR[ev.trust_level], ...MONO }}>{ev.trust_level}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#787878', ...MONO }}>{timeLabel(ev.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(240,240,248,0.85)', marginBottom: 6, lineHeight: 1.5 }}>{ev.description}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.68rem', color: '#787878', ...MONO }}>
                    {ev.actor && <span>Actor: <span style={{ color: ACTOR_TYPE_COLOR[ev.actor_type] || '#BDD4E8' }}>{ev.actor}</span></span>}
                    {ev.actor_type && <span style={{ color: ACTOR_TYPE_COLOR[ev.actor_type] || '#787878' }}>[{ev.actor_type}]</span>}
                    {ev.evidence_ref && <span>Ref: <span style={{ color: '#8BB8E8' }}>{ev.evidence_ref}</span></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
