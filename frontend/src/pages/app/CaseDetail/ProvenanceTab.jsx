import React, { useState, useEffect } from 'react';
import { Database, Loader2, Check, X, ChevronDown, ChevronRight, Brain, Wrench } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const ACTION_META = {
  ai_analysis:  { color: '#A78BFA', label: 'AI Analysis',  Icon: Brain },
  ai_summary:   { color: '#A78BFA', label: 'AI Summary',   Icon: Brain },
  tool_run:     { color: '#EAB308', label: 'Tool Run',      Icon: Wrench },
  evidence_add: { color: '#22C55E', label: 'Evidence Added', Icon: Database },
  ioc_enrich:   { color: '#4DA3FF', label: 'IOC Enrich',   Icon: Database },
  manual:       { color: '#787878', label: 'Manual',        Icon: Database },
};

const APPROVAL_COLOR = {
  auto:     { color: '#787878', label: 'Auto' },
  approved: { color: '#22C55E', label: 'Approved' },
  rejected: { color: '#EF4444', label: 'Rejected' },
  pending:  { color: '#EAB308', label: 'Pending Review' },
};

function timeLabel(d) {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function confidenceBar(score) {
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#EAB308' : '#EF4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: '0.65rem', color, ...MONO }}>{score}%</span>
    </div>
  );
}

function ProvenanceRow({ record, onApprove }) {
  const [open, setOpen] = useState(false);
  const meta = ACTION_META[record.action_type] || ACTION_META.manual;
  const { Icon } = meta;
  const approval = APPROVAL_COLOR[record.approval_status] || APPROVAL_COLOR.auto;

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
      <div
        onClick={() => setOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: 'rgba(240,240,248,0.02)', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(240,240,248,0.02)'}
      >
        <Icon size={13} style={{ color: meta.color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', color: meta.color, fontWeight: 600, ...MONO, minWidth: 90 }}>{meta.label}</span>
        <span style={{ flex: 1, fontSize: '0.78rem', color: 'rgba(240,240,248,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.output_summary || '(no summary)'}
        </span>
        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 3, background: `${approval.color}18`, color: approval.color, ...MONO, flexShrink: 0 }}>
          {approval.label}
        </span>
        {record.model_used && (
          <span style={{ fontSize: '0.62rem', color: '#787878', ...MONO, flexShrink: 0 }}>{record.model_used.split('-').slice(0, 2).join('-')}</span>
        )}
        {confidenceBar(record.confidence)}
        <span style={{ fontSize: '0.62rem', color: '#787878', ...MONO, flexShrink: 0 }}>{timeLabel(record.timestamp)}</span>
        {open ? <ChevronDown size={12} style={{ color: '#787878', flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: '#787878', flexShrink: 0 }} />}
      </div>

      {open && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0A0A0A', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              ['Actor', record.actor || '—'],
              ['Model', record.model_used || '—'],
              ['Tool', record.tool_name || '—'],
              ['Confidence', `${record.confidence}%`],
              ['Approval', record.approval_status],
              ['Approved by', record.approved_by || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: '0.6rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2, ...MONO }}>{k}</div>
                <div style={{ fontSize: '0.75rem', color: '#EBEBEB', ...MONO }}>{v}</div>
              </div>
            ))}
          </div>

          {record.input_context && (
            <div>
              <div style={{ fontSize: '0.62rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, ...MONO }}>Input Context (truncated)</div>
              <pre style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(240,240,248,0.55)', ...MONO, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto', background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4 }}>
                {record.input_context.slice(0, 400)}{record.input_context.length > 400 ? '…' : ''}
              </pre>
            </div>
          )}

          {record.approval_status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-accent" onClick={() => onApprove(record.id, true)} style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Check size={11} /> Approve
              </button>
              <button className="btn-ghost" onClick={() => onApprove(record.id, false)} style={{ fontSize: '0.72rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                <X size={11} /> Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProvenanceTab({ caseId }) {
  const { addToast } = useStore();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get(`/api/provenance/case/${caseId}`)
      .then(r => { setRecords(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (caseId && caseId !== 'new') load(); }, [caseId]);

  const handleApprove = async (id, approved) => {
    try {
      await api.patch(`/api/provenance/${id}/approve`, { approved });
      load();
      addToast(approved ? 'Action approved' : 'Action rejected', 'success');
    } catch { addToast('Update failed', 'error'); }
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Database size={17} style={{ color: '#A78BFA' }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Provenance Ledger</div>
          <div style={{ fontSize: '0.7rem', color: '#787878', marginTop: 1 }}>
            Every AI-generated and tool-generated action — actor, model, confidence, approval status
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#787878', ...MONO }}>{records.length} records</span>
          {records.filter(r => r.approval_status === 'pending').length > 0 && (
            <span style={{ fontSize: '0.68rem', background: 'rgba(234,179,8,0.15)', color: '#EAB308', padding: '2px 8px', borderRadius: 4, ...MONO }}>
              {records.filter(r => r.approval_status === 'pending').length} pending review
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#787878' }}><Loader2 size={18} className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#787878' }}>
          <Database size={28} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <div style={{ fontSize: '0.82rem', marginBottom: 8 }}>No provenance records yet.</div>
          <div style={{ fontSize: '0.74rem', ...MONO, color: '#555', maxWidth: 400, margin: '0 auto' }}>
            Records are automatically created when AI analysis runs, IOCs are enriched, or tool outputs are processed.
          </div>
        </div>
      ) : (
        records.map(r => <ProvenanceRow key={r.id} record={r} onApprove={handleApprove} />)
      )}
    </div>
  );
}
