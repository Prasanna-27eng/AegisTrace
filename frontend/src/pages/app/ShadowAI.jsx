import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, AlertTriangle, Eye, EyeOff, CheckCircle, RefreshCw,
  ExternalLink, Shield, Clock, Cpu, Globe, ChevronDown, ChevronRight,
  FolderOpen, Filter, XCircle, AlertCircle
} from '../../components/icons';
import api from '../../api/client';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const MONO  = { fontFamily: 'JetBrains Mono, monospace' };
const COLOR = '#8BB8E8'; // purple — Shadow AI brand accent

// Known AI services with display labels
const AI_SERVICE = {
  'api.openai.com':                       { label: 'OpenAI',       color: '#10a37f' },
  'api.anthropic.com':                    { label: 'Anthropic',    color: '#D97706' },
  'generativelanguage.googleapis.com':    { label: 'Google Gemini',color: '#4285F4' },
  'api.groq.com':                         { label: 'Groq',         color: '#F97316' },
  'api.mistral.ai':                       { label: 'Mistral',      color: '#FF6B35' },
  'api.cohere.ai':                        { label: 'Cohere',       color: '#22C55E' },
  'huggingface.co':                       { label: 'HuggingFace',  color: '#EAB308' },
  'api.together.xyz':                     { label: 'Together AI',  color: '#8BB8E8' },
  'api.perplexity.ai':                    { label: 'Perplexity',   color: '#06B6D4' },
  'api.replicate.com':                    { label: 'Replicate',    color: '#6366F1' },
  'inference.cerebras.ai':                { label: 'Cerebras',     color: '#0EA5E9' },
  'api.deepseek.com':                     { label: 'DeepSeek',     color: '#4A7EC8' },
  'openrouter.ai':                        { label: 'OpenRouter',   color: '#A855F7' },
  'api.x.ai':                             { label: 'Grok (xAI)',   color: '#1DA1F2' },
};

function getService(domain) {
  return AI_SERVICE[domain] ?? { label: domain, color: '#787878' };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)         return `${s}s ago`;
  if (s < 3600)       return `${Math.floor(s/60)}m ago`;
  if (s < 86400)      return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function StatCard({ label, value, accent, sub }) {
  const c = accent || COLOR;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderTop: `2px solid ${c}`, borderRadius: 10, padding: '16px 18px',
    }}>
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color: c, ...MONO, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.65rem', color: 'rgba(136,136,136,0.6)', marginTop: 2, ...MONO }}>{sub}</div>}
    </div>
  );
}

function ServiceBadge({ domain }) {
  const { label, color } = getService(domain);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `${color}15`, border: `1px solid ${color}35`,
      color, borderRadius: 5, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600,
      ...MONO,
    }}>
      <Brain size={9} /> {label}
    </span>
  );
}

function FilterTab({ label, active, count, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: active ? `${COLOR}12` : 'transparent',
      border: `1px solid ${active ? COLOR + '40' : 'var(--border)'}`,
      color: active ? COLOR : 'var(--text-muted)',
      borderRadius: 7, padding: '7px 14px', fontSize: '0.78rem',
      fontWeight: active ? 600 : 400, cursor: 'pointer',
      transition: 'all 0.15s', ...MONO,
    }}>
      {label}
      {count != null && (
        <span style={{
          background: active ? COLOR : 'rgba(136,136,136,0.25)',
          color: active ? '#fff' : 'var(--text-muted)',
          borderRadius: 10, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Event row card ─────────────────────────────────────────────────────── */
function EventRow({ ev, onReview, onCreateCase }) {
  const [expanded, setExpanded] = useState(false);
  const { label: svcLabel, color: svcColor } = getService(ev.destination_domain);
  const isNew = !ev.is_reviewed;

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isNew ? 'rgba(239,68,68,0.22)' : 'var(--border)'}`,
      borderLeft: `3px solid ${isNew ? '#EF4444' : 'rgba(136,136,136,0.25)'}`,
      borderRadius: 9, overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Main row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 200px 160px 100px 90px',
          alignItems: 'center', gap: 12,
          padding: '12px 16px', cursor: 'pointer',
        }}
      >
        {/* Expand toggle */}
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {/* Process */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Cpu size={12} style={{ color: COLOR, flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {ev.process_name || 'unknown'}
            </span>
            {isNew && (
              <span style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#EF4444', borderRadius: 4, padding: '1px 6px', fontSize: '0.6rem',
                fontWeight: 700, ...MONO,
              }}>UNREVIEWED</span>
            )}
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', ...MONO }}>
            PID {ev.process_pid || '?'}
          </span>
        </div>

        {/* AI service + domain */}
        <div>
          <ServiceBadge domain={ev.destination_domain} />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, ...MONO }}>
            {ev.destination_domain}
          </div>
        </div>

        {/* Destination IP */}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', ...MONO }}>
          {ev.destination_ip || '—'}
        </div>

        {/* Time */}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', ...MONO }}>
          {timeAgo(ev.detected_at)}
        </div>

        {/* Reviewed status */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {ev.is_reviewed
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#22C55E', ...MONO }}>
                <CheckCircle size={11} /> Reviewed
              </span>
            : <AlertCircle size={14} style={{ color: '#EF4444' }} />
          }
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 18px',
          background: 'rgba(0,0,0,0.15)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        }}>
          {/* Detail fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Event ID',     `#${ev.id}`],
              ['Process',      ev.process_name || '—'],
              ['PID',          ev.process_pid  || '—'],
              ['Destination',  ev.destination_domain],
              ['IP Address',   ev.destination_ip || '—'],
              ['Detected',     fmtDate(ev.detected_at)],
              ['Reviewed',     ev.is_reviewed ? 'Yes' : 'No'],
              ['Linked Case',  ev.case_id ? `Case #${ev.case_id}` : 'None'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', ...MONO, minWidth: 100, paddingTop: 1 }}>
                  {k}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', ...MONO }}>
                  {v}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Actions
            </div>

            {!ev.is_reviewed && (
              <button onClick={() => onReview(ev.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                color: '#22C55E', borderRadius: 7, padding: '8px 14px',
                fontSize: '0.78rem', cursor: 'pointer', ...MONO, transition: 'all 0.15s',
              }}>
                <CheckCircle size={13} /> Mark Reviewed
              </button>
            )}

            <button onClick={() => onCreateCase(ev)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: `${COLOR}10`, border: `1px solid ${COLOR}30`,
              color: COLOR, borderRadius: 7, padding: '8px 14px',
              fontSize: '0.78rem', cursor: 'pointer', ...MONO, transition: 'all 0.15s',
            }}>
              <FolderOpen size={13} /> Create Case
            </button>

            <a
              href={`https://${ev.destination_domain}`}
              target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', borderRadius: 7, padding: '8px 14px',
                fontSize: '0.78rem', cursor: 'pointer', ...MONO, textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} /> Open Domain
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ShadowAI() {
  const navigate = useNavigate();

  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [filter,   setFilter]   = useState('all');   // all | unreviewed | reviewed
  const [refreshN, setRefreshN] = useState(0);
  const [toast,    setToast]    = useState(null);

  /* ── Fetch ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'all' ? {} : { reviewed: filter === 'reviewed' };
      const res = await api.get('/api/ingest/shadow-ai', { params: { ...params, limit: 100 } });
      setEvents(res.data.items || []);
      setTotal(res.data.total ?? (res.data.items?.length ?? 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, refreshN]);

  useEffect(() => { load(); }, [load]);

  /* ── Actions ── */
  async function handleReview(id) {
    try {
      await api.patch(`/api/ingest/shadow-ai/${id}/review`);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, is_reviewed: true } : e));
      showToast('Marked as reviewed', 'green');
    } catch { showToast('Failed to mark reviewed', 'red'); }
  }

  function handleCreateCase(ev) {
    // Navigate to new case creation with pre-filled details
    const title = encodeURIComponent(`Shadow AI: ${ev.process_name} → ${getService(ev.destination_domain).label}`);
    navigate(`/app/cases?new=1&title=${title}&type=shadow_ai`);
  }

  function showToast(msg, color) {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Derived stats (from all-filter data; recompute from raw) ── */
  const unreviewed = events.filter(e => !e.is_reviewed).length;
  const reviewed   = events.filter(e =>  e.is_reviewed).length;
  const uniqueDomains   = new Set(events.map(e => e.destination_domain)).size;
  const uniqueProcesses = new Set(events.map(e => e.process_name)).size;

  // Top domain
  const domainCounts = {};
  events.forEach(e => { domainCounts[e.destination_domain] = (domainCounts[e.destination_domain] || 0) + 1; });
  const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0];

  /* ── Render ── */
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 72, right: 24, zIndex: 999,
          background: toast.color === 'green' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.color === 'green' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.color === 'green' ? '#22C55E' : '#EF4444',
          borderRadius: 8, padding: '10px 16px', fontSize: '0.82rem', ...MONO,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle size={13} /> {toast.msg}
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.65rem', color: COLOR, letterSpacing: '0.18em', textTransform: 'uppercase', ...MONO, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={10} /> Shadow AI Detection
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, marginBottom: 4 }}>
              Shadow AI Events
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, ...MONO }}>
              Processes on your endpoints accessing unapproved AI APIs
            </p>
          </div>
          <button
            onClick={() => setRefreshN(n => n + 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', borderRadius: 7, padding: '8px 14px',
              fontSize: '0.78rem', cursor: 'pointer', ...MONO,
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Events"      value={total}           accent={COLOR} />
        <StatCard label="Unreviewed"        value={unreviewed}      accent={unreviewed > 0 ? '#EF4444' : '#22C55E'} />
        <StatCard label="Reviewed"          value={reviewed}        accent="#22C55E" />
        <StatCard label="Unique Domains"    value={uniqueDomains}   />
        <StatCard
          label="Top Service"
          value={topDomain ? getService(topDomain[0]).label : '—'}
          accent={topDomain ? getService(topDomain[0]).color : undefined}
          sub={topDomain ? `${topDomain[1]} event${topDomain[1] > 1 ? 's' : ''}` : undefined}
        />
        <StatCard label="Unique Processes"  value={uniqueProcesses} />
      </div>

      {/* ── Filter tabs + summary ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <FilterTab label="All"        active={filter === 'all'}        count={total}      onClick={() => setFilter('all')} />
        <FilterTab label="Unreviewed" active={filter === 'unreviewed'} count={unreviewed} onClick={() => setFilter('unreviewed')} />
        <FilterTab label="Reviewed"   active={filter === 'reviewed'}   count={reviewed}   onClick={() => setFilter('reviewed')} />

        {unreviewed > 0 && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#EF4444', borderRadius: 7, padding: '6px 12px', fontSize: '0.72rem', ...MONO,
          }}>
            <AlertTriangle size={11} /> {unreviewed} event{unreviewed > 1 ? 's' : ''} need review
          </div>
        )}
      </div>

      {/* ── Event list ─────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.82rem', ...MONO }}>
          Loading events…
        </div>
      ) : events.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          border: '1px dashed var(--border)', borderRadius: 12,
        }}>
          <Brain size={36} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            {filter === 'unreviewed' ? 'No unreviewed events' : filter === 'reviewed' ? 'No reviewed events yet' : 'No shadow AI events detected'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(136,136,136,0.6)', ...MONO }}>
            {filter === 'all'
              ? 'Events appear here when the endpoint agent detects a process contacting an unapproved AI API'
              : 'Switch to "All" to see every event'}
          </div>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 200px 160px 100px 90px',
            gap: 12, padding: '6px 16px 8px',
            fontSize: '0.62rem', color: 'var(--text-muted)', ...MONO,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            <div />
            <div>Process</div>
            <div>AI Service</div>
            <div>IP Address</div>
            <div>Detected</div>
            <div style={{ textAlign: 'right' }}>Status</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events.map(ev => (
              <EventRow
                key={ev.id}
                ev={ev}
                onReview={handleReview}
                onCreateCase={handleCreateCase}
              />
            ))}
          </div>

          <div style={{ marginTop: 16, fontSize: '0.72rem', color: 'var(--text-muted)', ...MONO }}>
            Showing {events.length} of {total} event{total !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {/* ── Explainer ──────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 36, padding: '18px 20px',
        background: `${COLOR}08`, border: `1px solid ${COLOR}20`, borderRadius: 10,
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: COLOR, ...MONO, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={11} /> What is Shadow AI?
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.7, ...MONO }}>
          Shadow AI is when employees or processes access AI APIs (OpenAI, Anthropic, Gemini, etc.) without
          authorisation. This risks data leakage — prompts may contain sensitive company data sent to third-party
          services. The AegisTrace endpoint agent watches outbound network connections and flags any process
          contacting an AI API not on your approved list. Review each event, create a case to investigate further,
          or add the domain to your approved list in{' '}
          <span
            onClick={() => window.open('/app/connectors', '_self')}
            style={{ color: COLOR, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Connectors → Approved AI Services
          </span>.
        </p>
      </div>
    </div>
  );
}
