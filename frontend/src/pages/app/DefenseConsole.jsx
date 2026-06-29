import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Eye,
  CheckCircle, XCircle, Clock, RefreshCw, Zap, Terminal,
  Activity, ChevronDown, ChevronRight, Target, Cpu, Radio,
  Lock, Unlock, Ban, BookOpen, SlidersHorizontal, History
} from '../../components/icons';
import api from '../../api/client';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };
const REFRESH_INTERVAL = 15; // seconds

// ── Colour maps ───────────────────────────────────────────────────────────────
const SEV_COLOR = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#EAB308',
  low:      '#22C55E',
};

const STATUS_COLOR = {
  pending_review: '#F97316',
  auto_handled:   '#2563EB',
  approved:       '#22C55E',
  dismissed:      '#4A6A8A',
  detecting:      '#EAB308',
};

const ACTION_COLOR = {
  block:      '#EF4444',
  rate_limit: '#F97316',
  watchlist:  '#EAB308',
  escalate:   'rgba(26,22,18,0.7)',
  dismiss:    '#4A6A8A',
};

const ATTACK_LABEL = {
  ai_agent_scan:     'AI Agent Scan',
  honeypot_trigger:  'Honeypot Trigger',
  brute_force:       'Brute Force',
  rate_abuse:        'Rate Abuse',
  api_abuse:         'API Abuse',
  prompt_injection:  'Prompt Injection',
};

function timeAgo(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.round(s)}s ago`;
  if (s < 3600)  return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, color = '#2563EB', alert = false, pulse = false }) {
  return (
    <div style={{
      background:   alert ? 'rgba(239,68,68,0.05)' : 'rgba(26,22,18,0.018)',
      border:       `1px solid ${alert ? 'rgba(239,68,68,0.2)' : 'rgba(26,22,18,0.060)'}`,
      borderRadius: 10, padding: '16px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `${color}14`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        animation: pulse ? 'aegis-pulse 2s ease-in-out infinite' : 'none',
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: alert ? '#EF4444' : 'rgba(26,22,18,0.6)', lineHeight: 1, ...MONO }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.63rem', color: '#4A6A8A', marginTop: 2, ...MONO }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Confidence bar ────────────────────────────────────────────────────────────
function ConfBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const col = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F97316' : '#EAB308';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(26,22,18,0.08)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: '0.7rem', color: col, ...MONO, minWidth: 32 }}>{pct}%</span>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, onAction, processing }) {
  const [expanded, setExpanded]   = useState(false);
  const [action, setAction]       = useState('');
  const [notes, setNotes]         = useState('');
  const [showForm, setShowForm]   = useState(false);
  const isPending = event.status === 'pending_review';
  const sevColor  = SEV_COLOR[event.severity] || '#4A6A8A';
  const statColor = STATUS_COLOR[event.status] || '#4A6A8A';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!action) return;
    onAction(event.id, action, notes);
    setShowForm(false);
  };

  const indicators = event.request_pattern?.indicators || [];

  return (
    <div style={{
      background:   'rgba(26,22,18,0.018)',
      border:       `1px solid ${isPending ? `${sevColor}30` : 'rgba(26,22,18,0.08)'}`,
      borderLeft:   `3px solid ${isPending ? sevColor : statColor}`,
      borderRadius: 8,
      marginBottom: 8,
      transition:   'border-color 0.2s',
    }}>
      {/* Header row */}
      <div
        style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        onClick={() => setExpanded(x => !x)}
      >
        {/* Severity badge */}
        <div style={{
          padding: '2px 8px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700,
          background: `${sevColor}18`, color: sevColor, ...MONO, flexShrink: 0,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {event.severity}
        </div>

        {/* Attack type + IP */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {ATTACK_LABEL[event.attack_type] || event.attack_type}
            {isPending && (
              <span style={{ fontSize: '0.6rem', background: 'rgba(249,115,22,0.15)', color: '#F97316', padding: '1px 6px', borderRadius: 4, ...MONO }}>
                NEEDS REVIEW
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#4A6A8A', ...MONO, marginTop: 2 }}>
            {event.attacker_ip} · {event.endpoint_hit} · {timeAgo(event.detected_at)}
          </div>
        </div>

        {/* AI threat type */}
        {event.ai_threat_type && (
          <div style={{ fontSize: '0.68rem', color: 'rgba(26,22,18,0.7)', ...MONO, flexShrink: 0 }}>
            {event.ai_threat_type}
          </div>
        )}

        {/* Status */}
        <div style={{ fontSize: '0.65rem', color: statColor, ...MONO, flexShrink: 0 }}>
          [{event.status?.replace(/_/g, ' ').toUpperCase()}]
        </div>

        {expanded ? <ChevronDown size={13} style={{ color: '#4A6A8A', flexShrink: 0 }} />
                  : <ChevronRight size={13} style={{ color: '#4A6A8A', flexShrink: 0 }} />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(26,22,18,0.042)', marginTop: 0 }}>

          {/* AI confidence + reasoning */}
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#4A6A8A', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AI Confidence
              </div>
              <ConfBar value={event.ai_confidence} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#4A6A8A', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Recommended Action
              </div>
              <span style={{
                fontSize: '0.72rem', ...MONO, fontWeight: 700,
                color: ACTION_COLOR[event.ai_recommended_action] || 'rgba(26,22,18,0.55)',
              }}>
                {(event.ai_recommended_action || '—').toUpperCase()}
              </span>
            </div>
          </div>

          {/* AI Reasoning */}
          {event.ai_reasoning && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--card)', border: '1px solid #1C1C24', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#4A6A8A', ...MONO, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AI Reasoning Chain
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(26,22,18,0.55)', lineHeight: 1.6 }}>{event.ai_reasoning}</p>
            </div>
          )}

          {/* Indicators */}
          {indicators.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '0.62rem', color: '#4A6A8A', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Key Indicators
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {indicators.map((ind, i) => (
                  <span key={i} style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(26,22,18,0.055)', border: '1px solid rgba(26,22,18,0.110)',
                    color: 'var(--accent)', ...MONO,
                  }}>
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Request context */}
          <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.67rem', color: '#4A6A8A', ...MONO }}>
              Requests: <span style={{ color: 'var(--text-primary)' }}>{event.request_count}</span>
            </span>
            <span style={{ fontSize: '0.67rem', color: '#4A6A8A', ...MONO }}>
              Unique endpoints: <span style={{ color: 'var(--text-primary)' }}>{event.request_pattern?.unique_endpoints || '—'}</span>
            </span>
            {event.user_agent && (
              <span style={{ fontSize: '0.67rem', color: '#4A6A8A', ...MONO }}>
                UA: <span style={{ color: 'rgba(26,22,18,0.55)' }}>{event.user_agent.slice(0, 60)}{event.user_agent.length > 60 ? '…' : ''}</span>
              </span>
            )}
          </div>

          {/* Reviewed info */}
          {event.reviewed_by && (
            <div style={{ marginTop: 10, fontSize: '0.68rem', color: '#4A6A8A', ...MONO }}>
              Reviewed by <span style={{ color: 'var(--accent)' }}>{event.reviewed_by}</span>
              {event.review_notes && <span> · "{event.review_notes}"</span>}
            </div>
          )}

          {/* HITL Action Panel */}
          {isPending && !showForm && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { act: 'block',     label: 'Block IP',    col: '#EF4444', Icon: Ban        },
                { act: 'watchlist', label: 'Watchlist',   col: '#EAB308', Icon: Eye        },
                { act: 'escalate',  label: 'Escalate',    col: 'rgba(26,22,18,0.7)', Icon: ShieldAlert},
                { act: 'dismiss',   label: 'Dismiss',     col: '#4A6A8A', Icon: XCircle    },
              ].map(({ act, label, col, Icon: I }) => (
                <button
                  key={act}
                  disabled={processing}
                  onClick={() => { setAction(act); setShowForm(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 5, border: `1px solid ${col}40`,
                    background: `${col}12`, color: col, fontSize: '0.72rem', fontWeight: 600,
                    fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
                    opacity: processing ? 0.5 : 1,
                  }}
                >
                  <I size={12} /> {label}
                </button>
              ))}
            </div>
          )}

          {/* Notes form */}
          {isPending && showForm && (
            <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
              <div style={{ fontSize: '0.68rem', color: '#4A6A8A', ...MONO, marginBottom: 6 }}>
                Action: <span style={{ color: ACTION_COLOR[action] || 'rgba(26,22,18,0.6)', fontWeight: 700 }}>{action.toUpperCase()}</span>
                <span style={{ marginLeft: 12, cursor: 'pointer', color: '#4A6A8A' }} onClick={() => setShowForm(false)}>[cancel]</span>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes for audit trail..."
                style={{
                  width: '100%', height: 60, background: 'var(--card)', color: 'var(--text-primary)',
                  border: '1px solid #1C1C24', borderRadius: 4, padding: '8px 10px',
                  fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={processing}
                style={{
                  marginTop: 8, padding: '7px 20px', background: 'rgba(26,22,18,0.6)', color: 'var(--card)',
                  border: 'none', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
                  opacity: processing ? 0.5 : 1,
                }}
              >
                {processing ? 'Applying…' : 'Apply Decision'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ── Adaptive Thresholds panel ──────────────────────────────────────────────────
const THRESHOLD_META = {
  anomaly_score_threshold:          { label: 'Anomaly Score',          scale: 1,   suffix: '',  fmt: v => Math.round(v) },
  behavioral_similarity_threshold:  { label: 'Auto-Block Confidence',  scale: 100, suffix: '%', fmt: v => Math.round(v * 100) },
  itdr_confidence_threshold:        { label: 'HITL Review Confidence', scale: 100, suffix: '%', fmt: v => Math.round(v * 100) },
  defense_fp_tolerance:             { label: 'FP Tolerance Target',    scale: 100, suffix: '%', fmt: v => Math.round(v * 100) },
};

function AdaptivePanel({ adaptive }) {
  if (!adaptive) return null;
  const { current = {}, bounds = {}, log = [] } = adaptive;
  const lastChange = log[0];

  return (
    <div style={{
      background: 'rgba(26,22,18,0.018)', border: '1px solid rgba(26,22,18,0.060)',
      borderRadius: 10, padding: '16px 18px', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlidersHorizontal size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Adaptive Thresholds Agent</span>
          <span style={{ fontSize: '0.62rem', color: '#4A6A8A', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            self-tunes every 4h · Nemotron-70B
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Object.entries(THRESHOLD_META).map(([key, meta]) => {
          const val = current[key];
          const b = bounds[key];
          if (val === undefined) return null;
          return (
            <div key={key} style={{ background: 'rgba(26,22,18,0.015)', border: '1px solid rgba(26,22,18,0.042)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: '0.62rem', color: '#4A6A8A', ...MONO, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {meta.label}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)', ...MONO }}>
                {meta.fmt(val)}{meta.suffix}
              </div>
              {b && (
                <div style={{ fontSize: '0.6rem', color: '#4A6A8A', ...MONO, marginTop: 2 }}>
                  range: {meta.fmt(b[0])}{meta.suffix}–{meta.fmt(b[1])}{meta.suffix}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(26,22,18,0.042)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <History size={12} style={{ color: '#4A6A8A', marginTop: 2, flexShrink: 0 }} />
        {lastChange ? (
          <div style={{ fontSize: '0.68rem', color: 'rgba(26,22,18,0.55)', ...MONO, lineHeight: 1.6 }}>
            Last change: <span style={{ color: 'var(--text-primary)' }}>{lastChange.threshold_name}</span>{' '}
            {THRESHOLD_META[lastChange.threshold_name]?.fmt(lastChange.old_value) ?? lastChange.old_value}
            {' → '}
            {THRESHOLD_META[lastChange.threshold_name]?.fmt(lastChange.new_value) ?? lastChange.new_value}
            {' via '}<span style={{ color: 'rgba(26,22,18,0.7)' }}>{lastChange.agent_model}</span>
            {' · '}{timeAgo(lastChange.applied_at)}
            {lastChange.reason && <div style={{ color: '#4A6A8A', marginTop: 2 }}>"{lastChange.reason}"</div>}
          </div>
        ) : (
          <div style={{ fontSize: '0.68rem', color: '#4A6A8A', ...MONO }}>
            No adjustments yet — agent reviews FP/FN rates every 4 hours and only adjusts when targets drift.
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFENSE CONSOLE — main page
// ══════════════════════════════════════════════════════════════════════════════
export default function DefenseConsole() {
  const [events, setEvents]         = useState([]);
  const [stats, setStats]           = useState({});
  const [adaptive, setAdaptive]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter]         = useState('all');
  const [countdown, setCountdown]   = useState(REFRESH_INTERVAL);
  const [testLoading, setTestLoading]   = useState(false);
  const [demoLoading, setDemoLoading]   = useState(false);
  const [toast, setToast]               = useState(null);
  const timerRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [evRes, stRes] = await Promise.all([
        api.get('/api/defense/events?limit=100'),
        api.get('/api/defense/stats'),
      ]);
      setEvents(evRes.data || []);
      setStats(stRes.data || {});
    } catch (err) {
      console.error('Defense load error', err);
    } finally {
      setLoading(false);
    }
    try {
      const adRes = await api.get('/api/analytics/adaptive-thresholds');
      setAdaptive(adRes.data || null);
    } catch (err) {
      console.error('Adaptive thresholds load error', err);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    load();
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { load(); return REFRESH_INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const handleAction = async (eventId, action, notes) => {
    setProcessing(true);
    try {
      await api.post(`/api/defense/events/${eventId}/review`, { action, notes });
      await load();
      showToast(`Action applied: ${action.toUpperCase()}`, 'success');
    } catch (err) {
      console.error('Review error', err);
      const msg = err?.response?.data?.detail || 'Action failed — check console';
      showToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      await api.post('/api/defense/test');
      await load();
      showToast('Test event fired — check the feed below', 'success');
    } catch (err) {
      console.error('Test error', err);
      showToast('Failed to fire test event', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.status === filter);

  const pendingCount = events.filter(e => e.status === 'pending_review').length;

  return (
    <div style={{ background: 'var(--card)', minHeight: '100vh', padding: '28px 32px', color: 'var(--text-primary)' }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${toast.type === 'success' ? '#22C55E' : '#EF4444'}`,
          color: toast.type === 'success' ? '#22C55E' : '#EF4444',
          padding: '10px 18px', borderRadius: 6, fontSize: '0.78rem',
          fontFamily: 'JetBrains Mono, monospace',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          animation: 'aegis-slide-in 0.2s ease',
        }}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes aegis-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes aegis-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes aegis-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(26,22,18,0.1)', paddingBottom: 14, marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#4A6A8A', ...MONO, letterSpacing: '0.15em', marginBottom: 4 }}>
            AEGISTRACE // AI DEFENSE ENGINE v5.3
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 300, letterSpacing: '-0.03em' }}>
            Defense Console
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Engine status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: '#22C55E', ...MONO }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'aegis-pulse 2s ease-in-out infinite' }} />
            ENGINE ACTIVE
          </div>

          {/* Refresh countdown */}
          <div style={{ fontSize: '0.65rem', color: '#4A6A8A', ...MONO }}>
            refresh in {countdown}s
          </div>

          {/* Test trigger button */}
          <button
            onClick={handleTest}
            disabled={testLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              background: 'rgba(26,22,18,0.036)', border: '1px solid rgba(26,22,18,0.1)',
              color: 'rgba(26,22,18,0.55)', fontSize: '0.68rem', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', opacity: testLoading ? 0.5 : 1,
            }}
          >
            <Zap size={11} /> {testLoading ? 'Firing…' : 'Test Event'}
          </button>

          {/* Load demo data */}
          <button
            onClick={async () => {
              setDemoLoading(true);
              try {
                await api.post('/api/demo/seed/defense');
                await load();
                showToast('Demo data loaded — 5 realistic attack scenarios ready', 'success');
              } catch (e) {
                showToast('Failed to load demo data', 'error');
              } finally { setDemoLoading(false); }
            }}
            disabled={demoLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              background: 'rgba(26,22,18,0.08)', border: '1px solid rgba(26,22,18,0.150)',
              color: 'rgba(26,22,18,0.7)', fontSize: '0.68rem', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', opacity: demoLoading ? 0.5 : 1,
            }}
          >
            <Activity size={11} /> {demoLoading ? 'Loading…' : 'Load Demo'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={() => { load(); setCountdown(REFRESH_INTERVAL); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              background: 'rgba(26,22,18,0.036)', border: '1px solid rgba(26,22,18,0.1)',
              color: 'rgba(26,22,18,0.55)', fontSize: '0.68rem', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KPICard
          label="Pending Review"
          value={stats.pending_review ?? 0}
          sub="needs your decision"
          icon={Clock}
          color="#F97316"
          alert={(stats.pending_review ?? 0) > 0}
          pulse={(stats.pending_review ?? 0) > 0}
        />
        <KPICard
          label="Auto-Handled"
          value={stats.auto_handled ?? 0}
          sub="AI managed automatically"
          icon={Cpu}
          color="#2563EB"
        />
        <KPICard
          label="Honeypot Hits"
          value={stats.honeypot_hits ?? 0}
          sub="scanner traps triggered"
          icon={Target}
          color="rgba(26,22,18,0.7)"
          alert={(stats.honeypot_hits ?? 0) > 0}
        />
        <KPICard
          label="AI Agent Scans"
          value={stats.ai_scan_events ?? 0}
          sub={`${stats.watchlisted ?? 0} IPs watchlisted`}
          icon={Radio}
          color="#EAB308"
        />
      </div>

      {/* ── Adaptive Thresholds Agent ───────────────────────────────────────── */}
      <AdaptivePanel adaptive={adaptive} />

      {/* ── Filter Tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid rgba(26,22,18,0.1)', paddingBottom: 12 }}>
        {[
          { key: 'all',           label: 'All Events',       count: events.length },
          { key: 'pending_review',label: 'Pending Review',   count: stats.pending_review ?? 0 },
          { key: 'auto_handled',  label: 'Auto-Handled',     count: stats.auto_handled ?? 0 },
          { key: 'approved',      label: 'Approved',         count: events.filter(e => e.status === 'approved').length },
          { key: 'dismissed',     label: 'Dismissed',        count: events.filter(e => e.status === 'dismissed').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '5px 14px', borderRadius: 5, border: '1px solid',
              borderColor: filter === tab.key ? 'rgba(204,120,92,0.3)' : 'rgba(26,22,18,0.060)',
              background:  filter === tab.key ? 'rgba(26,22,18,0.060)' : 'transparent',
              color:       filter === tab.key ? '#2563EB' : '#4A6A8A',
              fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: filter === tab.key ? 'rgba(26,22,18,0.14)' : 'rgba(26,22,18,0.08)',
                color: filter === tab.key ? '#2563EB' : 'rgba(26,22,18,0.55)',
                fontSize: '0.62rem', padding: '0 5px', borderRadius: 3, ...MONO,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Event Feed ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#4A6A8A', fontSize: '0.8rem', ...MONO }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #4A7EC8', borderTopColor: 'transparent', animation: 'aegis-pulse 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading defense events…
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          background: 'rgba(26,22,18,0.012)', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 8,
        }}>
          <ShieldCheck size={36} style={{ color: '#22C55E', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: 6 }}>
            {filter === 'pending_review' ? 'No pending decisions — you\'re clear.' : 'No events found for this filter.'}
          </div>
          <div style={{ color: '#4A6A8A', fontSize: '0.75rem', ...MONO }}>
            Defense engine is active and monitoring all incoming traffic.
          </div>
          <button
            onClick={handleTest}
            disabled={testLoading}
            style={{
              marginTop: 16, padding: '7px 18px', background: 'rgba(26,22,18,0.060)',
              border: '1px solid rgba(204,120,92,0.25)', color: 'var(--accent)', borderRadius: 5,
              fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
            }}
          >
            Fire a test event →
          </button>
        </div>
      ) : (
        <div>
          {pendingCount > 0 && filter === 'all' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 6, marginBottom: 12, fontSize: '0.75rem', color: '#F97316', ...MONO,
            }}>
              <AlertTriangle size={13} />
              {pendingCount} event{pendingCount !== 1 ? 's' : ''} need your review
            </div>
          )}
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onAction={handleAction}
              processing={processing}
            />
          ))}
        </div>
      )}

      {/* ── Footer info ──────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(26,22,18,0.1)',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ fontSize: '0.63rem', color: '#4A6A8A', ...MONO }}>
          Engine: Request Fingerprinter · Honeypot Trap · Groq Triage (llama-3.1-8b-instant)
        </div>
        <div style={{ fontSize: '0.63rem', color: '#4A6A8A', ...MONO }}>
          All approvals logged to Provenance Ledger · Auto-handles at ≥92% confidence
        </div>
      </div>
    </div>
  );
}
