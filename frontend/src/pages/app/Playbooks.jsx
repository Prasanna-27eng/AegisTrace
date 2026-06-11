import React, { useState, useEffect, useCallback } from 'react';
import {
  Workflow, Plus, Trash2, Edit, X, Check, Loader2, RefreshCw,
  Play, ChevronDown, ChevronRight, ShieldAlert, Sparkles, History,
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const TRIGGER_TYPES = [
  { value: 'itdr_alert',    label: 'ITDR Alert' },
  { value: 'shadow_ai',     label: 'Shadow AI Detection' },
  { value: 'mcp_event',     label: 'MCP Event (mcp-aegis)' },
  { value: 'defense_event', label: 'Defense Engine Event' },
  { value: 'case_created',  label: 'Case Created' },
  { value: 'endpoint_alert',label: 'Endpoint Alert' },
];

const ACTION_TYPES = [
  { value: 'create_case',      label: 'Create Case',          approval: false },
  { value: 'isolate_endpoint',  label: 'Isolate Endpoint',     approval: true  },
  { value: 'send_webhook',      label: 'Send Webhook',         approval: false },
  { value: 'enrich_ioc',        label: 'Enrich IOC',           approval: false },
  { value: 'page_oncall',       label: 'Page On-Call',         approval: false },
  { value: 'add_case_comment',  label: 'Add Case Comment',     approval: false },
  { value: 'generate_rules',    label: 'Generate Detection Rules', approval: false },
];

const EMPTY_FORM = {
  name: '', description: '', trigger_event_type: 'itdr_alert',
  is_active: true, requires_approval: true,
  conditions: [{ key: '', value: '' }],
  actions: [{ type: 'create_case', requires_approval: false, params: '{}' }],
};

function fmtTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

function actionLabel(type) {
  return ACTION_TYPES.find(a => a.value === type)?.label || type;
}

/* ── Playbook Form ────────────────────────────────────────────────────────── */
function PlaybookForm({ initial, onSave, onClose }) {
  const { addToast } = useStore();
  const [form, setForm] = useState(() => {
    if (!initial) return EMPTY_FORM;
    let conditions = [];
    try {
      const c = JSON.parse(initial.trigger_conditions || '{}');
      conditions = Object.entries(c).map(([key, value]) => ({ key, value: String(value) }));
    } catch { /* ignore */ }
    if (conditions.length === 0) conditions = [{ key: '', value: '' }];
    let actions = [];
    try {
      actions = JSON.parse(initial.actions || '[]').map(a => ({
        type: a.type, requires_approval: !!a.requires_approval,
        params: JSON.stringify(a.params || {}, null, 0),
      }));
    } catch { /* ignore */ }
    if (actions.length === 0) actions = EMPTY_FORM.actions;
    return {
      name: initial.name, description: initial.description || '',
      trigger_event_type: initial.trigger_event_type,
      is_active: initial.is_active, requires_approval: initial.requires_approval,
      conditions, actions,
    };
  });
  const [saving, setSaving] = useState(false);

  const updateCondition = (i, field, val) => {
    setForm(p => {
      const conditions = [...p.conditions];
      conditions[i] = { ...conditions[i], [field]: val };
      return { ...p, conditions };
    });
  };
  const addCondition = () => setForm(p => ({ ...p, conditions: [...p.conditions, { key: '', value: '' }] }));
  const removeCondition = (i) => setForm(p => ({ ...p, conditions: p.conditions.filter((_, idx) => idx !== i) }));

  const updateAction = (i, field, val) => {
    setForm(p => {
      const actions = [...p.actions];
      actions[i] = { ...actions[i], [field]: val };
      return { ...p, actions };
    });
  };
  const addAction = () => setForm(p => ({ ...p, actions: [...p.actions, { type: 'send_webhook', requires_approval: false, params: '{}' }] }));
  const removeAction = (i) => setForm(p => ({ ...p, actions: p.actions.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    if (!form.name.trim()) { addToast('Name required', 'error'); return; }

    const trigger_conditions = {};
    for (const { key, value } of form.conditions) {
      if (!key.trim()) continue;
      const num = Number(value);
      trigger_conditions[key.trim()] = (value !== '' && !isNaN(num) && /^-?[\d.]+$/.test(value.trim())) ? num : value;
    }

    let actions;
    try {
      actions = form.actions.map(a => ({
        type: a.type,
        requires_approval: a.requires_approval,
        params: JSON.parse(a.params || '{}'),
      }));
    } catch {
      addToast('One or more action params are not valid JSON', 'error');
      return;
    }

    const payload = {
      name: form.name, description: form.description,
      trigger_event_type: form.trigger_event_type,
      trigger_conditions, actions,
      is_active: form.is_active, requires_approval: form.requires_approval,
    };

    setSaving(true);
    try {
      if (initial?.id) {
        await api.patch(`/api/orchestration/playbooks/${initial.id}`, payload);
        addToast('Playbook updated', 'success');
      } else {
        await api.post('/api/orchestration/playbooks', payload);
        addToast('Playbook created', 'success');
      }
      onSave();
    } catch (e) { addToast(e.response?.data?.detail || 'Save failed', 'error'); }
    setSaving(false);
  };

  return (
    <div className="at-card" style={{ padding: 20, borderColor: 'rgba(77,163,255,0.2)', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{initial?.id ? 'Edit Playbook' : 'New Playbook'}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={15} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="at-label">Name *</label>
          <input className="at-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Critical MCP Block -> Contain" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="at-label">Description</label>
          <input className="at-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What this automation does" />
        </div>
        <div>
          <label className="at-label">Trigger Event</label>
          <select className="at-select" value={form.trigger_event_type} onChange={e => setForm(p => ({ ...p, trigger_event_type: e.target.value }))} style={{ width: '100%' }}>
            {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="at-label">Status</label>
          <select className="at-select" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))} style={{ width: '100%' }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="pb-requires-approval" checked={form.requires_approval} onChange={e => setForm(p => ({ ...p, requires_approval: e.target.checked }))} />
          <label htmlFor="pb-requires-approval" style={{ fontSize: '0.78rem', color: '#A8A8A8', cursor: 'pointer' }}>
            Global approval gate — when off, no actions in this playbook require approval (overrides per-action settings)
          </label>
        </div>
      </div>

      {/* Conditions */}
      <div style={{ marginBottom: 16 }}>
        <label className="at-label">Trigger Conditions</label>
        <div style={{ fontSize: '0.7rem', color: '#555', marginBottom: 8 }}>
          Use <span style={MONO}>min_*</span> / <span style={MONO}>max_*</span> prefixes for numeric thresholds (e.g. <span style={MONO}>min_confidence = 0.9</span>), exact keys for string match (e.g. <span style={MONO}>severity = critical</span>).
        </div>
        {form.conditions.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input className="at-input" style={{ flex: 1, ...MONO, fontSize: '0.78rem' }} value={c.key} onChange={e => updateCondition(i, 'key', e.target.value)} placeholder="key (e.g. min_confidence)" />
            <input className="at-input" style={{ flex: 1, ...MONO, fontSize: '0.78rem' }} value={c.value} onChange={e => updateCondition(i, 'value', e.target.value)} placeholder="value (e.g. 0.9)" />
            <button className="btn-ghost" onClick={() => removeCondition(i)} style={{ padding: '4px 8px', color: '#EF4444' }}><Trash2 size={12} /></button>
          </div>
        ))}
        <button className="btn-ghost" onClick={addCondition} style={{ fontSize: '0.74rem' }}><Plus size={11} /> Add Condition</button>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: 8 }}>
        <label className="at-label">Actions (executed in order)</label>
        {form.actions.map((a, i) => (
          <div key={i} className="at-card" style={{ padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.7rem', color: '#555', ...MONO, width: 18 }}>{i + 1}.</span>
              <select className="at-select" value={a.type} onChange={e => updateAction(i, 'type', e.target.value)} style={{ flex: 1 }}>
                {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#A8A8A8', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                <input type="checkbox" checked={a.requires_approval} onChange={e => updateAction(i, 'requires_approval', e.target.checked)} />
                Requires approval
              </label>
              <button className="btn-ghost" onClick={() => removeAction(i)} style={{ padding: '4px 8px', color: '#EF4444' }}><Trash2 size={12} /></button>
            </div>
            <input className="at-input" style={{ width: '100%', ...MONO, fontSize: '0.74rem' }} value={a.params} onChange={e => updateAction(i, 'params', e.target.value)} placeholder='{"severity": "critical"}' />
          </div>
        ))}
        <button className="btn-ghost" onClick={addAction} style={{ fontSize: '0.74rem' }}><Plus size={11} /> Add Action</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn-accent" onClick={submit} disabled={saving} style={{ fontSize: '0.8rem' }}>
          {saving ? <Loader2 size={13} className="spinner" /> : <Check size={13} />}
          {initial?.id ? 'Update Playbook' : 'Create Playbook'}
        </button>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: '0.8rem' }}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Run History ──────────────────────────────────────────────────────────── */
function RunHistory({ playbookId }) {
  const [runs, setRuns] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/orchestration/playbooks/${playbookId}/runs`)
      .then(r => { setRuns(r.data); setLoading(false); })
      .catch(() => { setRuns([]); setLoading(false); });
  }, [playbookId]);

  if (loading) return <div style={{ padding: 14, textAlign: 'center' }}><Loader2 size={14} className="spinner" style={{ color: '#4DA3FF' }} /></div>;
  if (!runs.length) return <div style={{ padding: '10px 14px', fontSize: '0.76rem', color: '#555' }}>No runs yet.</div>;

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {runs.map(r => {
        let taken = [], pending = [];
        try { taken = JSON.parse(r.actions_taken || '[]'); } catch {}
        try { pending = JSON.parse(r.actions_pending || '[]'); } catch {}
        return (
          <div key={r.id} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: '#555', ...MONO }}>{fmtTime(r.run_at)}</span>
              <span style={{
                fontSize: '0.65rem', ...MONO, padding: '1px 7px', borderRadius: 3,
                background: r.status === 'completed' ? 'rgba(34,197,94,0.08)' : r.status === 'failed' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
                color: r.status === 'completed' ? '#22C55E' : r.status === 'failed' ? '#EF4444' : '#EAB308',
                border: `1px solid ${r.status === 'completed' ? 'rgba(34,197,94,0.2)' : r.status === 'failed' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)'}`,
              }}>
                {r.status}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#787878' }}>{r.result_summary}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {taken.map((a, i) => (
                <span key={`t${i}`} style={{ fontSize: '0.65rem', ...MONO, background: 'rgba(34,197,94,0.06)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.15)', padding: '1px 7px', borderRadius: 3 }}>
                  ✓ {actionLabel(a.type)}{a.status === 'error' ? ' (error)' : ''}
                </span>
              ))}
              {pending.map((a, i) => (
                <span key={`p${i}`} style={{ fontSize: '0.65rem', ...MONO, background: 'rgba(234,179,8,0.06)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.15)', padding: '1px 7px', borderRadius: 3 }}>
                  ⏳ {actionLabel(a.type)} (pending approval)
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Playbook Card ────────────────────────────────────────────────────────── */
function PlaybookCard({ pb, onEdit, onDelete, onToggle, onTest }) {
  const [showRuns, setShowRuns] = useState(false);
  let conditions = {}, actions = [];
  try { conditions = JSON.parse(pb.trigger_conditions || '{}'); } catch {}
  try { actions = JSON.parse(pb.actions || '[]'); } catch {}

  return (
    <div className="at-card" style={{ padding: 0, opacity: pb.is_active ? 1 : 0.6 }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: pb.is_active ? '#22C55E' : '#888888', boxShadow: pb.is_active ? '0 0 6px #22C55E' : 'none' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pb.name}</span>
              {pb.requires_approval && (
                <span style={{ fontSize: '0.6rem', ...MONO, background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', padding: '1px 6px', borderRadius: 3 }}>
                  <ShieldAlert size={9} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />approval-gated
                </span>
              )}
            </div>
            {pb.description && <div style={{ fontSize: '0.76rem', color: '#787878', lineHeight: 1.5 }}>{pb.description}</div>}
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button onClick={() => onTest(pb)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }} title="Dry-run test"><Play size={12} /></button>
            <button onClick={() => onToggle(pb)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
              {pb.is_active ? 'Disable' : 'Enable'}
            </button>
            <button onClick={() => onEdit(pb)} className="btn-ghost" style={{ padding: '4px 8px' }}><Edit size={12} /></button>
            <button onClick={() => onDelete(pb.id)} className="btn-ghost" style={{ padding: '4px 8px', color: '#EF4444' }}><Trash2 size={12} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: '0.66rem', ...MONO, background: 'rgba(77,163,255,0.08)', color: '#4DA3FF', border: '1px solid rgba(77,163,255,0.2)', padding: '2px 7px', borderRadius: 3 }}>
            IF {TRIGGER_TYPES.find(t => t.value === pb.trigger_event_type)?.label || pb.trigger_event_type}
          </span>
          {Object.entries(conditions).map(([k, v]) => (
            <span key={k} style={{ fontSize: '0.66rem', ...MONO, background: 'rgba(255,255,255,0.04)', color: '#A8A8A8', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: 3 }}>
              {k} = {String(v)}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#555' }}>THEN</span>
          {actions.map((a, i) => (
            <span key={i} style={{
              fontSize: '0.66rem', ...MONO, padding: '2px 7px', borderRadius: 3,
              background: a.requires_approval ? 'rgba(245,158,11,0.08)' : 'rgba(156,124,255,0.08)',
              color: a.requires_approval ? '#F59E0B' : '#9C7CFF',
              border: `1px solid ${a.requires_approval ? 'rgba(245,158,11,0.2)' : 'rgba(156,124,255,0.2)'}`,
            }}>
              {actionLabel(a.type)}{a.requires_approval ? ' 🔒' : ''}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, fontSize: '0.7rem', color: '#555', ...MONO }}>
          <span>{pb.run_count || 0} run{pb.run_count === 1 ? '' : 's'}</span>
          <span>last run: {fmtTime(pb.last_run_at)}</span>
        </div>
      </div>

      <div onClick={() => setShowRuns(s => !s)} style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.74rem', color: '#787878' }}>
        {showRuns ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <History size={12} /> Run history
      </div>
      {showRuns && <RunHistory playbookId={pb.id} />}
    </div>
  );
}

/* ── Test (Dry-Run) Modal ─────────────────────────────────────────────────── */
function TestModal({ pb, onClose }) {
  const { addToast } = useStore();
  const [eventData, setEventData] = useState('{\n  "severity": "critical",\n  "confidence": 0.95\n}');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    let parsed;
    try { parsed = JSON.parse(eventData); } catch { addToast('Event data must be valid JSON', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/orchestration/evaluate', {
        trigger_event_type: pb.trigger_event_type,
        event_data: parsed,
        dry_run: true,
      });
      setResult(res.data);
    } catch (e) { addToast(e.response?.data?.detail || 'Evaluation failed', 'error'); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div className="at-card" style={{ padding: 20, width: 480, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dry-Run: {pb.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={15} /></button>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#787878', marginBottom: 8 }}>
          Synthetic <span style={MONO}>{pb.trigger_event_type}</span> event data — no actions are executed.
        </div>
        <textarea
          className="at-input" style={{ width: '100%', height: 100, ...MONO, fontSize: '0.76rem', resize: 'vertical' }}
          value={eventData} onChange={e => setEventData(e.target.value)}
        />
        <button className="btn-accent" onClick={run} disabled={loading} style={{ fontSize: '0.8rem', marginTop: 10 }}>
          {loading ? <Loader2 size={13} className="spinner" /> : <Sparkles size={13} />} Evaluate
        </button>

        {result && (
          <div style={{ marginTop: 14 }}>
            {result.results.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: '#787878' }}>Conditions did not match — no actions would run.</div>
            ) : result.results.map((r, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {r.actions_taken.map((a, j) => (
                    <span key={`t${j}`} style={{ fontSize: '0.66rem', ...MONO, background: 'rgba(34,197,94,0.06)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.15)', padding: '1px 7px', borderRadius: 3 }}>
                      ✓ {actionLabel(a.type)}
                    </span>
                  ))}
                  {r.actions_pending.map((a, j) => (
                    <span key={`p${j}`} style={{ fontSize: '0.66rem', ...MONO, background: 'rgba(234,179,8,0.06)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.15)', padding: '1px 7px', borderRadius: 3 }}>
                      ⏳ {actionLabel(a.type)} (would queue for approval)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function Playbooks() {
  const { addToast } = useStore();
  const [playbooks, setPlaybooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [testing, setTesting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/orchestration/playbooks')
      .then(r => { setPlaybooks(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this playbook?')) return;
    try { await api.delete(`/api/orchestration/playbooks/${id}`); load(); addToast('Deleted', 'success'); }
    catch (e) { addToast(e.response?.data?.detail || 'Delete failed', 'error'); }
  };

  const handleToggle = async (pb) => {
    try {
      await api.patch(`/api/orchestration/playbooks/${pb.id}`, { is_active: !pb.is_active });
      load();
      addToast(pb.is_active ? 'Playbook disabled' : 'Playbook enabled', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Update failed', 'error'); }
  };

  const handleSeed = async () => {
    try {
      const res = await api.post('/api/orchestration/seed');
      addToast(res.data.created ? 'Built-in playbook seeded' : 'Built-in playbook already exists', 'success');
      load();
    } catch (e) { addToast(e.response?.data?.detail || 'Seed failed', 'error'); }
  };

  const handleEdit = (pb) => { setEditing(pb); setShowForm(true); };
  const handleNewClick = () => { setEditing(null); setShowForm(true); };
  const handleSaved = () => { load(); setShowForm(false); setEditing(null); };

  const active = playbooks.filter(p => p.is_active).length;
  const totalRuns = playbooks.reduce((sum, p) => sum + (p.run_count || 0), 0);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Workflow size={20} style={{ color: '#9C7CFF' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Playbook Engine</h1>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#787878', ...MONO }}>
            {active} active · {playbooks.length - active} inactive · {totalRuns} total runs · Automated SOAR response rules
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={load} style={{ fontSize: '0.78rem' }}><RefreshCw size={13} /></button>
          <button className="btn-ghost" onClick={handleSeed} style={{ fontSize: '0.78rem' }}><Sparkles size={13} /> Seed Built-in</button>
          <button className="btn-accent" onClick={handleNewClick} style={{ fontSize: '0.8rem' }}><Plus size={13} /> New Playbook</button>
        </div>
      </div>

      {showForm && (
        <PlaybookForm initial={editing} onSave={handleSaved} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Loader2 size={20} className="spinner" style={{ color: '#9C7CFF' }} /></div>
      ) : playbooks.length === 0 ? (
        <div className="at-card" style={{ padding: 60, textAlign: 'center', color: '#787878' }}>
          <Workflow size={32} style={{ margin: '0 auto 14px', opacity: 0.2 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>No playbooks yet</div>
          <div style={{ fontSize: '0.78rem', ...MONO, marginBottom: 20, color: '#404040' }}>
            Define "if trigger then actions" automation rules to respond to alerts automatically.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn-accent" onClick={handleNewClick} style={{ fontSize: '0.8rem' }}><Plus size={13} /> Create First Playbook</button>
            <button className="btn-ghost" onClick={handleSeed} style={{ fontSize: '0.8rem' }}><Sparkles size={13} /> Seed Built-in</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {playbooks.map(pb => (
            <PlaybookCard key={pb.id} pb={pb} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} onTest={setTesting} />
          ))}
        </div>
      )}

      {testing && <TestModal pb={testing} onClose={() => setTesting(null)} />}
    </div>
  );
}
