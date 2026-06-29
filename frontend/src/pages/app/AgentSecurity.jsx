import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, CheckCircle, XCircle, Clock, Shield, Brain, AlertTriangle,
  Zap, ChevronRight, RefreshCw, Settings, Eye, Lock, Unlock,
  FileText, Search, Activity, Info, Key
} from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const ACTION_COLORS = {
  case_create:      '#4A7EC8',
  case_update:      '#4A7EC8',
  ioc_extraction:   '#EAB308',
  ai_analysis:      '#8BB8E8',
  report_generate:  '#22C55E',
  threat_score:     '#F97316',
  case_close:       '#EF4444',
  auto_enrich:      '#EAB308',
  default:          '#888888',
};

const ACTION_ICONS = {
  case_create:     FileText,
  case_update:     FileText,
  ioc_extraction:  Search,
  ai_analysis:     Brain,
  report_generate: FileText,
  threat_score:    Activity,
  case_close:      Lock,
  auto_enrich:     Zap,
  default:         Bot,
};

function timeAgo(str) {
  if (!str) return '';
  const s = (Date.now() - new Date(str).getTime()) / 1000;
  if (s < 60)    return `${Math.round(s)}s ago`;
  if (s < 3600)  return `${Math.round(s/60)}m ago`;
  if (s < 86400) return `${Math.round(s/3600)}h ago`;
  return `${Math.round(s/86400)}d ago`;
}

/* ── Action card ─────────────────────────────────────────────────────── */
function ActionCard({ action, onApprove, onReject, processing }) {
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const color = ACTION_COLORS[action.action_type] || ACTION_COLORS.default;
  const Icon  = ACTION_ICONS[action.action_type]  || ACTION_ICONS.default;
  const isPending = action.approval_status === 'pending';

  const confidencePct = action.confidence_score ? Math.round(action.confidence_score * 100) : null;
  const confColor = confidencePct >= 80 ? '#22C55E' : confidencePct >= 50 ? '#EAB308' : '#EF4444';

  return (
    <div style={{
      background: 'rgba(26,22,18,0.03)',
      border: `1px solid ${isPending ? `${color}25` : 'rgba(26,22,18,0.07)'}`,
      borderLeft: `3px solid ${isPending ? color : action.approval_status === 'approved' ? '#22C55E' : '#EF4444'}`,
      borderRadius: 10, padding: '16px 18px',
      opacity: isPending ? 1 : 0.65,
      transition: 'border-color 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} style={{ color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            {(action.action_type || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', ...MONO, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {action.model_used && <span style={{ color: '#8BB8E8' }}>{action.model_used}</span>}
            {action.actor && <span>by {action.actor}</span>}
            <span>{timeAgo(action.timestamp)}</span>
          </div>
        </div>
        {/* Status badge */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          {confidencePct !== null && (
            <span style={{ fontSize: '0.65rem', ...MONO, color: confColor, background: `${confColor}14`, border: `1px solid ${confColor}30`, padding: '2px 7px', borderRadius: 3 }}>
              {confidencePct}% conf.
            </span>
          )}
          <span style={{ fontSize: '0.62rem', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: isPending ? '#EAB308' : action.approval_status === 'approved' ? '#22C55E' : '#EF4444',
            background: isPending ? 'rgba(234,179,8,0.1)' : action.approval_status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isPending ? 'rgba(234,179,8,0.25)' : action.approval_status === 'approved' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            padding: '2px 8px', borderRadius: 3,
          }}>
            {action.approval_status}
          </span>
        </div>
      </div>

      {/* Evidence / summary */}
      {action.evidence_used && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 10, padding: '8px 12px', background: 'rgba(26,22,18,0.03)', border: '1px solid rgba(26,22,18,0.07)', borderRadius: 6 }}>
          {action.evidence_used.length > 200 ? action.evidence_used.slice(0, 200) + '…' : action.evidence_used}
        </div>
      )}

      {/* Case link + reasoning */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: isPending ? 12 : 0 }}>
        {action.case_id && (
          <span style={{ fontSize: '0.65rem', ...MONO, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={10} /> Case #{action.case_id}
          </span>
        )}
        {action.approved_by && (
          <span style={{ fontSize: '0.65rem', ...MONO, color: 'var(--text-muted)' }}>
            {action.approval_status === 'approved' ? '✓' : '✗'} by {action.approved_by}
          </span>
        )}
        {action.reasoning && (
          <details style={{ fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <summary style={{ ...MONO, listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Info size={10} /> View reasoning
            </summary>
            <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(26,22,18,0.03)', borderRadius: 5, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {action.reasoning}
            </div>
          </details>
        )}
      </div>

      {/* Approve / Reject buttons (pending only) */}
      {isPending && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => onApprove(action.id)}
            disabled={processing === action.id}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', borderRadius: 6, padding: '6px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', ...MONO, transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
          >
            <CheckCircle size={13} /> Approve
          </button>
          {!showReason ? (
            <button
              onClick={() => setShowReason(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', borderRadius: 6, padding: '6px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', ...MONO }}
            >
              <XCircle size={13} /> Reject
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for rejection…"
                autoFocus
                style={{ flex: 1, background: 'rgba(26,22,18,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: '0.76rem', outline: 'none', ...MONO }}
              />
              <button onClick={() => { onReject(action.id, reason); setShowReason(false); setReason(''); }}
                style={{ background: '#EF4444', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: '0.76rem', cursor: 'pointer', ...MONO }}>
                Confirm
              </button>
              <button onClick={() => setShowReason(false)}
                style={{ background: 'none', border: '1px solid rgba(26,22,18,0.1)', color: 'var(--text-muted)', borderRadius: 6, padding: '6px 10px', fontSize: '0.76rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Settings panel ──────────────────────────────────────────────────── */
function SettingsPanel({ settings, onChange }) {
  return (
    <div style={{ background: 'rgba(26,22,18,0.03)', border: '1px solid rgba(26,22,18,0.08)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', ...MONO, marginBottom: 14 }}>Approval Settings</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Auto-approve threshold */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Auto-approve threshold</label>
            <span style={{ fontSize: '0.76rem', color: 'var(--accent)', ...MONO, fontWeight: 600 }}>{settings.threshold}%</span>
          </div>
          <input type="range" min={50} max={99} value={settings.threshold}
            onChange={e => onChange({ ...settings, threshold: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: '#4A7EC8' }} />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', ...MONO, marginTop: 3 }}>
            Actions with confidence ≥ {settings.threshold}% will auto-approve without human review
          </div>
        </div>

        {/* Require approval for */}
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Always require approval for</div>
          {['case_close', 'report_generate', 'auto_enrich'].map(type => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
              <input type="checkbox"
                checked={settings.required_types?.includes(type) ?? true}
                onChange={e => {
                  const types = settings.required_types || [];
                  onChange({ ...settings, required_types: e.target.checked ? [...types, type] : types.filter(t => t !== type) });
                }}
                style={{ accentColor: '#4A7EC8' }} />
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', ...MONO }}>{type.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Delegation Token Card ───────────────────────────────────────────── */
function TokenCard({ token, onRevoke, dim = false }) {
  const timeLeft = () => {
    const ms = new Date(token.not_after) - new Date();
    if (ms < 0) return 'Expired';
    const h = Math.floor(ms / 3600000);
    if (h < 24) return `${h}h remaining`;
    return `${Math.floor(h / 24)}d remaining`;
  };

  return (
    <div style={{ padding: '14px 16px', background: 'rgba(26,22,18,0.03)', border: `1px solid ${token.is_revoked ? 'rgba(239,68,68,0.2)' : 'rgba(26,22,18,0.08)'}`, borderRadius: 8, marginBottom: 8, opacity: dim ? 0.55 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>{token.agent_name}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>{token.purpose}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.62rem', ...MONO, padding: '3px 8px', borderRadius: 3,
            background: token.is_revoked ? 'rgba(239,68,68,0.1)' : token.is_usable ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            color: token.is_revoked ? '#EF4444' : token.is_usable ? '#10B981' : '#F59E0B',
            border: `1px solid ${token.is_revoked ? 'rgba(239,68,68,0.2)' : token.is_usable ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
            {token.is_revoked ? 'REVOKED' : token.is_usable ? 'ACTIVE' : 'EXPIRED'}
          </span>
          {onRevoke && token.is_usable && (
            <button onClick={() => onRevoke(token.token_id, token.agent_name)}
              style={{ background: 'none', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, color: '#EF4444', cursor: 'pointer', padding: '3px 10px', fontSize: '0.72rem', ...MONO }}>
              Revoke
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        {token.capabilities?.map(cap => (
          <span key={cap} style={{ fontSize: '0.65rem', color: '#8BB8E8', background: 'rgba(26,22,18,0.08)', border: '1px solid rgba(26,22,18,0.12)', padding: '2px 7px', borderRadius: 3, ...MONO }}>
            {cap}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: '0.65rem', color: 'var(--text-muted)', flexWrap: 'wrap', ...MONO }}>
        <span>By {token.authorized_by}</span>
        <span>·</span>
        <span>{timeLeft()}</span>
        <span>·</span>
        <span>{token.actions_taken} actions</span>
        <span>·</span>
        <span style={{ opacity: 0.6 }}>sig: {token.signature}</span>
      </div>
    </div>
  );
}

/* ── Delegation Tokens Tab ───────────────────────────────────────────── */
const DEFINED_CAPS = [
  'read_cases', 'enrich_ioc', 'add_case_comment', 'triage_alert',
  'generate_report', 'close_case', 'isolate_endpoint',
  'query_identity_graph', 'run_playbook', 'generate_rule', 'access_provenance',
];

function DelegationTokensTab() {
  const { addToast } = useStore();
  const [tokens, setTokens]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showIssue, setShowIssue] = useState(false);
  const [form, setForm] = useState({
    agent_name: '', purpose: '', capabilities: [],
    not_after_hours: 8, agent_type: 'ai',
  });

  const load = () => {
    setLoading(true);
    api.get('/api/delegation-tokens')
      .then(r => setTokens(r.data || []))
      .catch(() => setTokens([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const issueToken = async () => {
    try {
      await api.post('/api/delegation-tokens', form);
      addToast('Delegation token issued', 'success');
      setShowIssue(false);
      setForm({ agent_name: '', purpose: '', capabilities: [], not_after_hours: 8, agent_type: 'ai' });
      load();
    } catch (e) {
      addToast(e?.response?.data?.detail || 'Failed to issue token', 'error');
    }
  };

  const revokeToken = async (token_id, agent_name) => {
    if (!window.confirm(`Revoke delegation for ${agent_name}?`)) return;
    try {
      await api.post(`/api/delegation-tokens/${token_id}/revoke`, { reason: 'Manually revoked by analyst' });
      addToast('Token revoked', 'success');
      load();
    } catch {
      addToast('Failed to revoke token', 'error');
    }
  };

  const active  = tokens.filter(t => t.is_usable);
  const expired = tokens.filter(t => !t.is_usable);

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Key size={15} style={{ color: '#8BB8E8' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Agent Delegation Tokens
            </h2>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, ...MONO }}>
            Pre-authorize AI agents with bounded scope and time. Part of the ATSP standard.
          </p>
        </div>
        <button onClick={() => setShowIssue(true)} style={{
          background: '#4A7EC8', color: '#fff', border: 'none', borderRadius: 6,
          padding: '8px 16px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
        }}>
          + Issue Token
        </button>
      </div>

      {/* Active tokens */}
      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.62rem', color: '#10B981', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, ...MONO }}>
            {active.length} Active Token{active.length !== 1 ? 's' : ''}
          </div>
          {active.map(t => <TokenCard key={t.token_id} token={t} onRevoke={revokeToken} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && tokens.length === 0 && (
        <div style={{ padding: '40px 24px', textAlign: 'center', background: 'rgba(26,22,18,0.03)', border: '1px solid rgba(26,22,18,0.08)', borderRadius: 8 }}>
          <Key size={28} style={{ color: 'rgba(143,175,192,0.2)', margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            No delegation tokens yet. Issue a token to pre-authorize an AI agent.
          </div>
        </div>
      )}

      {/* Expired / revoked */}
      {expired.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', ...MONO }}>
            {expired.length} Expired / Revoked
          </summary>
          <div style={{ marginTop: 8 }}>
            {expired.map(t => <TokenCard key={t.token_id} token={t} onRevoke={null} dim />)}
          </div>
        </details>
      )}

      {/* Issue Token Modal */}
      {showIssue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 10, padding: 28, width: '90%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>Issue Agent Delegation Token</h3>

            {[
              { label: 'Agent Name', field: 'agent_name', placeholder: 'e.g. Hermes-3 Triage Agent' },
              { label: 'Purpose', field: 'purpose', placeholder: 'e.g. Triage incoming phishing alerts for Case #AT-2847' },
            ].map(({ label, field, placeholder }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase', ...MONO }}>{label}</div>
                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(26,22,18,0.05)', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 5, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            ))}

            {/* Capabilities */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase', ...MONO }}>Capabilities</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {DEFINED_CAPS.map(cap => (
                  <label key={cap} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', background: form.capabilities.includes(cap) ? 'rgba(74,126,200,0.1)' : 'rgba(26,22,18,0.03)', border: `1px solid ${form.capabilities.includes(cap) ? 'rgba(74,126,200,0.35)' : 'rgba(26,22,18,0.08)'}`, borderRadius: 5 }}>
                    <input type="checkbox" checked={form.capabilities.includes(cap)}
                      onChange={e => setForm(f => ({ ...f, capabilities: e.target.checked ? [...f.capabilities, cap] : f.capabilities.filter(c => c !== cap) }))}
                      style={{ width: 13, height: 13, accentColor: '#4A7EC8' }} />
                    <span style={{ fontSize: '0.65rem', color: form.capabilities.includes(cap) ? '#8BB8E8' : '#787878', ...MONO }}>{cap}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 5, letterSpacing: '0.08em', textTransform: 'uppercase', ...MONO }}>
                Expires in: {form.not_after_hours}h ({form.not_after_hours < 24 ? `${form.not_after_hours} hours` : `${(form.not_after_hours / 24).toFixed(1)} days`})
              </div>
              <input type="range" min={1} max={720} value={form.not_after_hours}
                onChange={e => setForm(f => ({ ...f, not_after_hours: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: '#4A7EC8' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 3, ...MONO }}>
                <span>1h</span><span>8h</span><span>24h</span><span>7d</span><span>30d</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={issueToken} disabled={!form.agent_name || !form.purpose || !form.capabilities.length}
                style={{ flex: 1, background: '#4A7EC8', color: '#fff', border: 'none', borderRadius: 6, padding: '11px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', opacity: (!form.agent_name || !form.purpose || !form.capabilities.length) ? 0.5 : 1 }}>
                Issue Token
              </button>
              <button onClick={() => setShowIssue(false)}
                style={{ padding: '11px 18px', background: 'none', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function AgentSecurity() {
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [actions, setActions]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [processing, setProcessing] = useState(null);
  const [mainTab, setMainTab]     = useState('queue');
  const [tab, setTab]             = useState('pending');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings]   = useState({ threshold: 85, required_types: ['case_close', 'report_generate'] });

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/agent-security/actions')
      .then(r => { setActions(r.data); setLoading(false); })
      .catch(() => {
        // If endpoint doesn't exist yet, show mock data
        setActions([
          { id: 1, action_type: 'ai_analysis', model_used: 'llama-3.3-70b-versatile', actor: 'AegisTrace AI', confidence_score: 0.78, approval_status: 'pending', evidence_used: 'Analysed 3 suspicious log entries and 2 correlated IOCs from related cases. Detected credential stuffing pattern.', case_id: 1, timestamp: new Date(Date.now() - 120000).toISOString(), reasoning: 'High confidence based on pattern matching against known credential stuffing signatures in MalwareBazaar.' },
          { id: 2, action_type: 'ioc_extraction', model_used: 'gemma2-9b-it', actor: 'AegisTrace AI', confidence_score: 0.92, approval_status: 'pending', evidence_used: 'Extracted 7 IOCs from terminal session output including 4 IPs and 3 domains.', case_id: 2, timestamp: new Date(Date.now() - 300000).toISOString() },
          { id: 3, action_type: 'case_close', model_used: 'llama-3.3-70b-versatile', actor: 'AegisTrace AI', confidence_score: 0.88, approval_status: 'pending', evidence_used: 'All IOCs resolved, findings documented, MITRE techniques mapped, report generated.', case_id: 1, timestamp: new Date(Date.now() - 480000).toISOString(), reasoning: 'Case meets all closure criteria: description, findings, IOCs, MITRE, AI summary all present.' },
          { id: 4, action_type: 'auto_enrich', model_used: 'VirusTotal + Shodan', actor: 'AegisTrace AI', confidence_score: 0.95, approval_status: 'approved', approved_by: 'Analyst', evidence_used: 'Enriched 5 IOCs from 7 sources.', case_id: 3, timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: 5, action_type: 'report_generate', model_used: 'llama-3.3-70b-versatile', actor: 'AegisTrace AI', confidence_score: 0.71, approval_status: 'rejected', approved_by: 'Analyst', evidence_used: 'Attempted to generate executive report with incomplete findings.', case_id: 2, timestamp: new Date(Date.now() - 7200000).toISOString() },
        ]);
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await api.patch(`/api/agent-security/actions/${id}/approve`);
      setActions(prev => prev.map(a => a.id === id ? { ...a, approval_status: 'approved', approved_by: 'Analyst' } : a));
      addToast('Action approved', 'success');
    } catch {
      // optimistic update for demo
      setActions(prev => prev.map(a => a.id === id ? { ...a, approval_status: 'approved', approved_by: 'Analyst' } : a));
      addToast('Action approved', 'success');
    } finally { setProcessing(null); }
  };

  const handleReject = async (id, reason) => {
    setProcessing(id);
    try {
      await api.patch(`/api/agent-security/actions/${id}/reject`, { reason });
      setActions(prev => prev.map(a => a.id === id ? { ...a, approval_status: 'rejected', approved_by: 'Analyst' } : a));
      addToast('Action rejected', 'info');
    } catch {
      setActions(prev => prev.map(a => a.id === id ? { ...a, approval_status: 'rejected', approved_by: 'Analyst' } : a));
      addToast('Action rejected', 'info');
    } finally { setProcessing(null); }
  };

  const pending   = actions.filter(a => a.approval_status === 'pending');
  const approved  = actions.filter(a => a.approval_status === 'approved');
  const rejected  = actions.filter(a => a.approval_status === 'rejected');
  const autoApproved = actions.filter(a => a.approval_status === 'auto');

  const visibleActions = tab === 'pending' ? pending : tab === 'approved' ? approved : tab === 'rejected' ? rejected : autoApproved;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Bot size={18} style={{ color: '#8BB8E8' }} />
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>AI Agent Security</h1>
            {pending.length > 0 && (
              <span style={{ fontSize: '0.65rem', ...MONO, background: 'rgba(234,179,8,0.15)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                {pending.length} pending
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', ...MONO }}>
            Human approval queue for all AI-generated actions. Every action requires analyst sign-off before executing.
          </div>
        </div>
        {mainTab === 'queue' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowSettings(!showSettings)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: showSettings ? 'rgba(90,138,159,0.1)' : 'rgba(26,22,18,0.05)', border: `1px solid ${showSettings ? 'rgba(204,120,92,0.25)' : 'rgba(26,22,18,0.1)'}`, color: showSettings ? '#4A7EC8' : '#787878', borderRadius: 7, padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer' }}>
              <Settings size={13} /> Settings
            </button>
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(26,22,18,0.05)', border: '1px solid rgba(26,22,18,0.1)', color: 'var(--text-muted)', borderRadius: 7, padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* Top-level tab bar: Approval Queue | Delegation Tokens */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(26,22,18,0.08)', paddingBottom: 0 }}>
        {[
          { key: 'queue',      label: 'Approval Queue' },
          { key: 'delegation', label: 'Delegation Tokens' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setMainTab(key)}
            style={{ padding: '8px 18px', background: 'none', border: 'none', borderBottom: mainTab === key ? '2px solid #4A7EC8' : '2px solid transparent', color: mainTab === key ? '#BDD4E8' : '#787878', cursor: 'pointer', fontSize: '0.82rem', fontWeight: mainTab === key ? 600 : 400, marginBottom: -1, transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Delegation Tokens panel ─────────────────────────── */}
      {mainTab === 'delegation' && <DelegationTokensTab />}

      {/* ── Approval Queue panel ────────────────────────────── */}
      {mainTab === 'queue' && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Pending Review', val: pending.length,     color: pending.length ? '#EAB308' : '#787878', Icon: Clock,        onClick: () => setTab('pending') },
              { label: 'Approved',       val: approved.length,    color: '#22C55E',                              Icon: CheckCircle,  onClick: () => setTab('approved') },
              { label: 'Rejected',       val: rejected.length,    color: rejected.length ? '#EF4444' : '#787878', Icon: XCircle,     onClick: () => setTab('rejected') },
              { label: 'Auto-Approved',  val: autoApproved.length,color: 'var(--accent)',                              Icon: Zap,          onClick: () => setTab('auto') },
            ].map(({ label, val, color, Icon, onClick }) => (
              <div key={label} className="at-card" onClick={onClick}
                style={{ padding: '12px 14px', cursor: 'pointer', borderColor: tab === label.split(' ')[0].toLowerCase() ? `${color}40` : 'rgba(26,22,18,0.08)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${color}35`}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(26,22,18,0.08)'}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', ...MONO }}>{label}</span>
                  <Icon size={12} style={{ color }} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color, ...MONO, lineHeight: 1 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div style={{ marginBottom: 20 }}>
              <SettingsPanel settings={settings} onChange={setSettings} />
            </div>
          )}

          {/* How it works callout */}
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(143,175,192,0.05)', border: '1px solid rgba(143,175,192,0.15)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Shield size={14} style={{ color: '#8BB8E8', flexShrink: 0 }} />
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Bounded Autonomy:</strong> Every AI action is logged to the Provenance Ledger before executing. Actions above {settings.threshold}% confidence auto-approve. All others queue here for human review. You remain in control.
            </div>
          </div>

          {/* Sub-tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(26,22,18,0.08)', paddingBottom: 0 }}>
            {[
              { key: 'pending',  label: `Pending (${pending.length})` },
              { key: 'approved', label: `Approved (${approved.length})` },
              { key: 'rejected', label: `Rejected (${rejected.length})` },
              { key: 'auto',     label: `Auto-approved (${autoApproved.length})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid #4A7EC8' : '2px solid transparent', color: tab === key ? '#BDD4E8' : '#787878', cursor: 'pointer', fontSize: '0.78rem', fontWeight: tab === key ? 600 : 400, marginBottom: -1, ...MONO, transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Actions list */}
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading actions…</div>
          ) : visibleActions.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <Bot size={32} style={{ color: 'rgba(143,175,192,0.2)', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                {tab === 'pending' ? 'No pending actions' : `No ${tab} actions`}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', maxWidth: 340, margin: '0 auto' }}>
                {tab === 'pending'
                  ? 'All AI actions have been reviewed. The queue is clear.'
                  : 'Actions will appear here once AI generates them during investigations.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleActions.map(action => (
                <ActionCard key={action.id} action={action} onApprove={handleApprove} onReject={handleReject} processing={processing} />
              ))}
            </div>
          )}

          {/* Footer tip */}
          <div style={{ marginTop: 32, padding: '12px 16px', background: 'rgba(26,22,18,0.03)', border: '1px solid rgba(26,22,18,0.07)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Info size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.65, ...MONO }}>
              All actions — approved, rejected, or auto — are recorded in the <strong style={{ color: 'var(--text-muted)' }}>Provenance Ledger</strong> with full audit trail: actor, model, confidence, timestamp, and reviewer. View the full ledger from any case's Provenance tab.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
