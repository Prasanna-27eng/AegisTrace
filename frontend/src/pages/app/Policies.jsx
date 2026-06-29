import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Trash2, Edit, X, Check, Loader2,
  RefreshCw, Clock, MapPin, Key, AlertTriangle, Zap
} from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const EMPTY_FORM = {
  name: '', description: '', identity_type: '',
  allowed_actions: '', denied_actions: '', allowed_ips: '',
  allowed_hours_start: '', allowed_hours_end: '', is_active: true,
};

function parseTags(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

/* ── Policy Card ─────────────────────────────────────────────────────────── */
function PolicyCard({ policy, onEdit, onDelete, onToggle }) {
  const allowed = (() => { try { return JSON.parse(policy.allowed_actions || '[]'); } catch { return []; } })();
  const denied  = (() => { try { return JSON.parse(policy.denied_actions  || '[]'); } catch { return []; } })();
  const ips     = (() => { try { return JSON.parse(policy.allowed_ips     || '[]'); } catch { return []; } })();

  return (
    <div style={{
      background: 'rgba(232,224,212,0.95)', border: `1px solid ${policy.is_active ? 'rgba(26,22,18,0.083)' : 'rgba(26,22,18,0.072)'}`,
      borderRadius: 12, padding: '16px 18px', backdropFilter: 'blur(8px)',
      opacity: policy.is_active ? 1 : 0.65, transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: policy.is_active ? '#22C55E' : 'rgba(26,22,18,0.35)', boxShadow: policy.is_active ? '0 0 6px #22C55E' : 'none' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{policy.name}</span>
            {policy.identity_type && (
              <span style={{ fontSize: '0.62rem', ...MONO, background: 'rgba(26,22,18,0.060)', color: 'var(--accent)', padding: '1px 7px', borderRadius: 3 }}>
                {policy.identity_type}
              </span>
            )}
          </div>
          {policy.description && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{policy.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={() => onToggle(policy)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
            {policy.is_active ? 'Disable' : 'Enable'}
          </button>
          <button onClick={() => onEdit(policy)} className="btn-ghost" style={{ padding: '4px 8px' }}><Edit size={12} /></button>
          <button onClick={() => onDelete(policy.id)} className="btn-ghost" style={{ padding: '4px 8px', color: '#EF4444' }}><Trash2 size={12} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {allowed.length > 0 && allowed.map(a => (
          <span key={a} style={{ fontSize: '0.65rem', ...MONO, background: 'rgba(34,197,94,0.08)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)', padding: '2px 7px', borderRadius: 3 }}>✓ {a}</span>
        ))}
        {denied.length > 0 && denied.map(d => (
          <span key={d} style={{ fontSize: '0.65rem', ...MONO, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 7px', borderRadius: 3 }}>✗ {d}</span>
        ))}
        {ips.length > 0 && (
          <span style={{ fontSize: '0.65rem', ...MONO, background: 'rgba(26,22,18,0.08)', color: 'var(--accent)', border: '1px solid rgba(26,22,18,0.14)', padding: '2px 7px', borderRadius: 3 }}>
            <MapPin size={9} style={{ display: 'inline', marginRight: 3 }} />{ips.length} IP{ips.length !== 1 ? 's' : ''}
          </span>
        )}
        {policy.allowed_hours_start && (
          <span style={{ fontSize: '0.65rem', ...MONO, background: 'rgba(234,179,8,0.08)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.2)', padding: '2px 7px', borderRadius: 3 }}>
            <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />{policy.allowed_hours_start}–{policy.allowed_hours_end}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Policy Form ─────────────────────────────────────────────────────────── */
function PolicyForm({ initial, onSave, onClose }) {
  const { addToast } = useStore();
  const [form, setForm] = useState({
    ...EMPTY_FORM, ...initial,
    allowed_actions: initial?.allowed_actions ? JSON.parse(initial.allowed_actions || '[]').join(', ') : '',
    denied_actions:  initial?.denied_actions  ? JSON.parse(initial.denied_actions  || '[]').join(', ') : '',
    allowed_ips:     initial?.allowed_ips     ? JSON.parse(initial.allowed_ips     || '[]').join(', ') : '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) { addToast('Name required', 'error'); return; }
    setSaving(true);
    const payload = {
      ...form,
      allowed_actions: parseTags(form.allowed_actions),
      denied_actions:  parseTags(form.denied_actions),
      allowed_ips:     parseTags(form.allowed_ips),
    };
    try {
      if (initial?.id) {
        await api.patch(`/api/policies/${initial.id}`, payload);
        addToast('Policy updated', 'success');
      } else {
        await api.post('/api/policies', payload);
        addToast('Policy created', 'success');
      }
      onSave();
    } catch (e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
    setSaving(false);
  };

  return (
    <div className="at-card" style={{ padding: 20, borderColor: 'rgba(26,22,18,0.14)', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{initial?.id ? 'Edit Policy' : 'New Policy'}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={15} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="at-label">Name *</label>
          <input className="at-input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Analyst Read-Only Access" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="at-label">Description</label>
          <input className="at-input" value={form.description || ''} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="What this policy enforces" />
        </div>
        <div>
          <label className="at-label">Identity Type (optional)</label>
          <select className="at-select" value={form.identity_type || ''} onChange={e => setForm(p => ({...p, identity_type: e.target.value}))} style={{ width: '100%' }}>
            <option value="">All identities</option>
            <option value="user">User</option>
            <option value="service_account">Service Account</option>
            <option value="agent">AI Agent</option>
            <option value="api_key">API Key</option>
          </select>
        </div>
        <div>
          <label className="at-label">Status</label>
          <select className="at-select" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(p => ({...p, is_active: e.target.value === 'active'}))} style={{ width: '100%' }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="at-label">Allowed Actions (comma-separated)</label>
          <input className="at-input" value={form.allowed_actions} onChange={e => setForm(p => ({...p, allowed_actions: e.target.value}))} placeholder="read, write, triage" style={{ ...MONO, fontSize: '0.8rem' }} />
        </div>
        <div>
          <label className="at-label">Denied Actions (comma-separated)</label>
          <input className="at-input" value={form.denied_actions} onChange={e => setForm(p => ({...p, denied_actions: e.target.value}))} placeholder="delete, admin, export" style={{ ...MONO, fontSize: '0.8rem' }} />
        </div>
        <div>
          <label className="at-label">Allowed IPs (comma-separated)</label>
          <input className="at-input" value={form.allowed_ips} onChange={e => setForm(p => ({...p, allowed_ips: e.target.value}))} placeholder="192.168.1.0/24, 10.0.0.1" style={{ ...MONO, fontSize: '0.8rem' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="at-label">Allowed Hours Start (UTC)</label>
            <input className="at-input" value={form.allowed_hours_start || ''} onChange={e => setForm(p => ({...p, allowed_hours_start: e.target.value}))} placeholder="09:00" style={{ ...MONO, fontSize: '0.8rem' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="at-label">Allowed Hours End (UTC)</label>
            <input className="at-input" value={form.allowed_hours_end || ''} onChange={e => setForm(p => ({...p, allowed_hours_end: e.target.value}))} placeholder="17:00" style={{ ...MONO, fontSize: '0.8rem' }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn-accent" onClick={submit} disabled={saving} style={{ fontSize: '0.8rem' }}>
          {saving ? <Loader2 size={13} className="spinner" /> : <Check size={13} />}
          {initial?.id ? 'Update Policy' : 'Create Policy'}
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: '0.8rem' }}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Validation Panel ────────────────────────────────────────────────────── */
function ValidationPanel() {
  const { addToast } = useStore();
  const [form, setForm] = useState({ node_id: '', action: '', ip_address: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    if (!form.action.trim()) { addToast('Action required', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/policies/validate', {
        node_id: form.node_id ? parseInt(form.node_id) : undefined,
        action: form.action,
        ip_address: form.ip_address || undefined,
      });
      setResult(res.data);
    } catch (e) { addToast(e.response?.data?.detail || 'Validation failed', 'error'); }
    setLoading(false);
  };

  return (
    <div style={{ background: 'rgba(232,224,212,0.95)', border: '1px solid rgba(26,22,18,0.096)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Zap size={14} style={{ color: '#EAB308' }} />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', ...MONO }}>Test Policy Validation</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label className="at-label">Node ID (optional)</label>
          <input className="at-input" value={form.node_id} onChange={e => setForm(p => ({...p, node_id: e.target.value}))} placeholder="42" style={{ ...MONO, fontSize: '0.8rem' }} />
        </div>
        <div>
          <label className="at-label">Action *</label>
          <input className="at-input" value={form.action} onChange={e => setForm(p => ({...p, action: e.target.value}))} placeholder="delete" style={{ ...MONO, fontSize: '0.8rem' }} />
        </div>
        <div>
          <label className="at-label">IP Address (optional)</label>
          <input className="at-input" value={form.ip_address} onChange={e => setForm(p => ({...p, ip_address: e.target.value}))} placeholder="10.0.0.1" style={{ ...MONO, fontSize: '0.8rem' }} />
        </div>
      </div>
      <button className="btn-ghost" onClick={validate} disabled={loading} style={{ fontSize: '0.8rem' }}>
        {loading ? <Loader2 size={12} className="spinner" /> : <Zap size={12} />} Validate
      </button>
      {result && (
        <div style={{ marginTop: 14, padding: '14px 16px', background: result.allowed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${result.allowed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: result.violations?.length ? 10 : 0 }}>
            {result.allowed
              ? <Check size={15} style={{ color: '#22C55E' }} />
              : <AlertTriangle size={15} style={{ color: '#EF4444' }} />}
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: result.allowed ? '#22C55E' : '#EF4444' }}>
              {result.allowed ? 'Action Permitted' : 'Action Denied'}
            </span>
            {result.node_risk_score != null && (
              <span style={{ ...MONO, fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Node risk: {result.node_risk_score}</span>
            )}
          </div>
          {result.violations?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {result.violations.map((v, i) => (
                <div key={i} style={{ fontSize: '0.76rem', color: '#F5B84B', ...MONO, padding: '4px 8px', background: 'rgba(245,184,75,0.06)', borderRadius: 4 }}>
                  [{v.policy}] {v.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function Policies() {
  const { addToast } = useStore();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/policies?active_only=false')
      .then(r => { setPolicies(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this policy?')) return;
    try { await api.delete(`/api/policies/${id}`); load(); addToast('Deleted', 'success'); }
    catch { addToast('Delete failed', 'error'); }
  };

  const handleToggle = async (policy) => {
    try {
      await api.patch(`/api/policies/${policy.id}`, { is_active: !policy.is_active });
      load();
      addToast(policy.is_active ? 'Policy disabled' : 'Policy enabled', 'success');
    } catch { addToast('Update failed', 'error'); }
  };

  const handleEdit = (policy) => { setEditing(policy); setShowForm(true); };
  const handleNewClick = () => { setEditing(null); setShowForm(true); };
  const handleSaved = () => { load(); setShowForm(false); setEditing(null); };

  const active   = policies.filter(p => p.is_active).length;
  const inactive = policies.filter(p => !p.is_active).length;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Shield size={20} style={{ color: 'var(--accent)' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Policy Engine</h1>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', ...MONO }}>
            {active} active · {inactive} inactive · Define access control rules per identity type
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={load} style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={13} />
          </button>
          <button className="btn-accent" onClick={handleNewClick} style={{ fontSize: '0.8rem' }}>
            <Plus size={13} /> New Policy
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <PolicyForm
          initial={editing}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Policy list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Loader2 size={20} className="spinner" style={{ color: 'var(--accent)' }} /></div>
      ) : policies.length === 0 ? (
        <div className="at-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Shield size={32} style={{ margin: '0 auto 14px', opacity: 0.2 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>No policies yet</div>
          <div style={{ fontSize: '0.78rem', ...MONO, marginBottom: 20, color: '#404040' }}>
            Create policies to enforce access control rules for your identity nodes.
          </div>
          <button className="btn-accent" onClick={handleNewClick} style={{ fontSize: '0.8rem' }}><Plus size={13} /> Create First Policy</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {policies.map(p => (
            <PolicyCard key={p.id} policy={p} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Validation panel */}
      <ValidationPanel />
    </div>
  );
}
