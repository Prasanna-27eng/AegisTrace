import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Eye,
  CheckCircle, XCircle, Clock, RefreshCw, Zap, Terminal,
  Activity, ChevronDown, ChevronRight, Target, Cpu, Radio,
  Lock, Unlock, Ban, BookOpen
} from 'lucide-react';
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
  auto_handled:   '#4DA3FF',
  approved:       '#22C55E',
  dismissed:      '#686868',
  detecting:      '#EAB308',
};

const ACTION_COLOR = {
  block:      '#EF4444',
  rate_limit: '#F97316',
  watchlist:  '#EAB308',
  escalate:   '#A78BFA',
  dismiss:    '#686868',
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
function KPICard({ label, value, sub, icon: Icon, color = '#4DA3FF', alert = false, pulse = false }) {
  return (
    <div style={{
      background:   alert ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
      border:       `1px solid ${alert ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
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
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: alert ? '#EF4444' : '#EBEBEB', lineHeight: 1, ...MONO }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: '#EBEBEB', fontWeight: 500, marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.63rem', color: '#686868', marginTop: 2, ...MONO }}>{sub}</div>}
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
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
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
  const sevColor  = SEV_COLOR[event.severity] || '#686868';
  const statColor = STATUS_COLOR[event.status] || '#686868';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!action) return;
    onAction(event.id, action, notes);
    setShowForm(false);
  };

  const indicators = event.request_pattern?.indicators || [];

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       `1px solid ${isPending ? `${sevColor}30` : 'rgba(255,255,255,0.06)'}`,
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
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#EBEBEB', display: 'flex', alignItems: 'center', gap: 8 }}>
            {ATTACK_LABEL[event.attack_type] || event.attack_type}
            {isPending && (
              <span style={{ fontSize: '0.6rem', background: 'rgba(249,115,22,0.15)', color: '#F97316', padding: '1px 6px', borderRadius: 4, ...MONO }}>
                NEEDS REVIEW
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#686868', ...MONO, marginTop: 2 }}>
            {event.attacker_ip} · {event.endpoint_hit} · {timeAgo(event.detected_at)}
          </div>
        </div>

        {/* AI threat type */}
        {event.ai_threat_type && (
          <div style={{ fontSize: '0.68rem', color: '#9C7CFF', ...MONO, flexShrink: 0 }}>
            {event.ai_threat_type}
          </div>
        )}

        {/* Status */}
        <div style={{ fontSize: '0.65rem', color: statColor, ...MONO, flexShrink: 0 }}>
          [{event.status?.replace(/_/g, ' ').toUpperCase()}]
        </div>

        {expanded ? <ChevronDown size={13} style={{ color: '#686868', flexShrink: 0 }} />
                  : <ChevronRight size={13} style={{ color: '#686868', flexShrink: 0 }} />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 0 }}>

          {/* AI confidence + reasoning */}
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#686868', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AI Confidence
              </div>
              <ConfBar value={event.ai_confidence} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#686868', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Recommended Action
              </div>
              <span style={{
                fontSize: '0.72rem', ...MONO, fontWeight: 700,
                color: ACTION_COLOR[event.ai_recommended_action] || '#A8A8A8',
              }}>
                {(event.ai_recommended_action || '—').toUpperCase()}
              </span>
            </div>
          </div>

          {/* AI Reasoning */}
          {event.ai_reasoning && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#000', border: '1px solid #1A1A1A', borderRadius: 6 }}>
              <div style={{ fontSize: '0.62rem', color: '#686868', ...MONO, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AI Reasoning Chain
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#A8A8A8', lineHeight: 1.6 }}>{event.ai_reasoning}</p>
            </div>
          )}

          {/* Indicators */}
          {indicators.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '0.62rem', color: '#686868', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Key Indicators
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {indicators.map((ind, i) => (
                  <span key={i} style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(74,142,219,0.1)', border: '1px solid rgba(74,142,219,0.2)',
                    color: '#4DA3FF', ...MONO,
                  }}>
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Request context */}
          <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.67rem', color: '#686868', ...MONO }}>
              Requests: <span style={{ color: '#EBEBEB' }}>{event.request_count}</span>
            </span>
            <span style={{ fontSize: '0.67rem', color: '#686868', ...MONO }}>
              Unique endpoints: <span style={{ color: '#EBEBEB' }}>{event.request_pattern?.unique_endpoints || '—'}</span>
            </span>
            {event.user_agent && (
              <span style={{ fontSize: '0.67rem', color: '#686868', ...MONO }}>
                UA: <span style={{ color: '#A8A8A8' }}>{event.user_agent.slice(0, 60)}{event.user_agent.length > 60 ? '…' : ''}</span>
              </span>
            )}
          </div>

          {/* Reviewed info */}
          {event.reviewed_by && (
            <div style={{ marginTop: 10, fontSize: '0.68rem', color: '#686868', ...MONO }}>
              Reviewed by <span style={{ color: '#4DA3FF' }}>{event.reviewed_by}</span>
              {event.review_notes && <span> · "{event.review_notes}"</span>}
            </div>
          )}

          {/* HITL Action Panel */}
          {isPending && !showForm && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { act: 'block',     label: 'Block IP',    col: '#EF4444', Icon: Ban        },
                { act: 'watchlist', label: 'Watchlist',   col: '#EAB308', Icon: Eye        },
                { act: 'escalate',  label: 'Escalate',    col: '#A78BFA', Icon: ShieldAlert},
                { act: 'dismiss',   label: 'Dismiss',     col: '#686868', Icon: XCircle    },
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
              <div style={{ fontSize: '0.68rem', color: '#686868', ...MONO, marginBottom: 6 }}>
                Action: <span style={{ color: ACTION_COLOR[action] || '#EBEBEB', fontWeight: 700 }}>{action.toUpperCase()}</span>
                <span style={{ marginLeft: 12, cursor: 'pointer', color: '#686868' }} onClick={() => setShowForm(false)}>[cancel]</span>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes for audit trail..."
                style={{
                  width: '100%', height: 60, background: '#000', color: '#EBEBEB',
                  border: '1px solid #1A1A1A', borderRadius: 4, padding: '8px 10px',
                  fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={processing}
                style={{
                  marginTop: 8, padding: '7px 20px', background: '#EBEBEB', color: '#000',
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

// ══════════════════════════════════════════════════════════════════════════════
// DEFENSE CONSOLE — main page
// ══════════════════════════════════════════════════════════════════════════════
export default function DefenseConsole() {
  const [events, setEvents]       = useState([]);
  const [stats, setStats]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter]       = useState('all');   // all | pending_review | auto_handled | approved | dismissed
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [testLoading, setTestLoading] = useState(false);
  const timerRef = useRef(null);

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
    } catch (err) {
      console.error('Review error', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      await api.post('/api/defense/test');
      await load();
    } catch (err) {
      console.error('Test error', err);
    } finally {
      setTestLoading(false);
    }
  };

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.status === filter);

  const pendingCount = events.filter(e => e.status === 'pending_review').length;

  return (
    <div style={{ background: '#000000', minHeight: '100vh', padding: '28px 32px', color: '#EBEBEB' }}>

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
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #101010', paddingBottom: 14, marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#686868', ...MONO, letterSpacing: '0.15em', marginBottom: 4 }}>
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
          <div style={{ fontSize: '0.65rem', color: '#686868', ...MONO }}>
            refresh in {countdown}s
          </div>

          {/* Test trigger button */}
          <button
            onClick={handleTest}
            disabled={testLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#A8A8A8', fontSize: '0.68rem', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', opacity: testLoading ? 0.5 : 1,
            }}
          >
            <Zap size={11} /> {testLoading ? 'Firing…' : 'Test Event'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={() => { load(); setCountdown(REFRESH_INTERVAL); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#A8A8A8', fontSize: '0.68rem', borderRadius: 5, cursor: 'pointer',
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
          color="#4DA3FF"
        />
        <KPICard
          label="Honeypot Hits"
          value={stats.honeypot_hits ?? 0}
          sub="scanner traps triggered"
          icon={Target}
          color="#A78BFA"
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

      {/* ── Filter Tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #101010', paddingBottom: 12 }}>
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
              borderColor: filter === tab.key ? 'rgba(77,163,255,0.4)' : 'rgba(255,255,255,0.07)',
              background:  filter === tab.key ? 'rgba(77,163,255,0.1)' : 'transparent',
              color:       filter === tab.key ? '#4DA3FF' : '#686868',
              fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: filter === tab.key ? 'rgba(77,163,255,0.2)' : 'rgba(255,255,255,0.06)',
                color: filter === tab.key ? '#4DA3FF' : '#A8A8A8',
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
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#686868', fontSize: '0.8rem', ...MONO }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #4DA3FF', borderTopColor: 'transparent', animation: 'aegis-pulse 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading defense events…
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          background: 'rgba(255,255,255,0.01)', border: '1px solid #101010', borderRadius: 8,
        }}>
          <ShieldCheck size={36} style={{ color: '#22C55E', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ color: '#EBEBEB', fontSize: '0.9rem', marginBottom: 6 }}>
            {filter === 'pending_review' ? 'No pending decisions — you\'re clear.' : 'No events found for this filter.'}
          </div>
          <div style={{ color: '#686868', fontSize: '0.75rem', ...MONO }}>
            Defense engine is active and monitoring all incoming traffic.
          </div>
          <button
            onClick={handleTest}
            disabled={testLoading}
            style={{
              marginTop: 16, padding: '7px 18px', background: 'rgba(77,163,255,0.1)',
              border: '1px solid rgba(77,163,255,0.3)', color: '#4DA3FF', borderRadius: 5,
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
        marginTop: 32, paddingTop: 16, borderTop: '1px solid #101010',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ fontSize: '0.63rem', color: '#686868', ...MONO }}>
          Engine: Request Fingerprinter · Honeypot Trap · Groq Triage (llama-3.1-8b-instant)
        </div>
        <div style={{ fontSize: '0.63rem', color: '#686868', ...MONO }}>
          All approvals logged to Provenance Ledger · Auto-handles at ≥92% confidence
        </div>
      </div>
    </div>
  );
}
