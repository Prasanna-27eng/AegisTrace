import React, { useState } from 'react';
import { GitBranch, Loader2, Sparkles, Network, Clock, ArrowRight } from 'lucide-react';
import { SeverityBadge } from '../../../components/SeverityBadge';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const SOURCE_LABELS = {
  agent_action:   'Agent Action',
  itdr_alert:     'ITDR Alert',
  shadow_ai:      'Shadow AI',
  hardware_alert: 'Hardware Alert',
  raw_log:        'Endpoint Log',
  defense_event:  'Defense Engine',
};

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return ts; }
}

export default function AttackGraphTab({ caseData, updateCase, caseId }) {
  const { addToast } = useStore();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  const reconstruct = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/graph/reconstruct', { params: { case_id: caseId } });
      setResult(res.data);
      if (res.data.event_count === 0) {
        addToast('No correlated events found for this case yet', 'info');
      } else {
        addToast('Attack chain reconstructed', 'success');
      }
    } catch (e) {
      addToast(e.response?.data?.detail || 'Reconstruction failed', 'error');
    }
    setLoading(false);
  };

  const applyToCase = () => {
    if (!result) return;
    let mitre = [];
    try { mitre = JSON.parse(caseData?.mitre_techniques || '[]'); } catch { mitre = []; }
    const existingIds = new Set(mitre.map(t => t.id));
    for (const tid of (result.mitre_chain || [])) {
      if (!existingIds.has(tid)) { mitre.push({ id: tid, name: '' }); existingIds.add(tid); }
    }

    const narrativeBlock = `\n\n## Attack Graph Reconstruction (${result.model_used || 'AI'})\n${result.narrative || ''}`;
    const description = (caseData?.description || '') + narrativeBlock;

    const updates = { mitre_techniques: JSON.stringify(mitre), description };
    if (!caseData?.title || caseData.title === 'New Case') {
      updates.title = result.suggested_title;
    }
    updateCase(updates);
    addToast('Applied narrative + MITRE techniques to case', 'success');
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 920 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitBranch size={18} style={{ color: '#9C7CFF' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Attack Graph</div>
            <div style={{ fontSize: '0.72rem', color: '#787878', marginTop: 1 }}>
              Temporal Linker · Nemotron-70B · correlates events within 5s windows
            </div>
          </div>
        </div>
        <button className="btn-accent" onClick={reconstruct} disabled={loading} style={{ fontSize: '0.8rem' }}>
          {loading
            ? <><Loader2 size={14} className="spinner"/> Reconstructing…</>
            : <><Sparkles size={14}/> {result ? 'Reconstruct Again' : 'Reconstruct'}</>
          }
        </button>
      </div>

      {/* Empty state */}
      {!result && !loading && (
        <div className="at-card" style={{ padding: 36, textAlign: 'center', color: '#787878' }}>
          <Network size={32} style={{ margin: '0 auto 12px', color: 'rgba(156,124,255,0.25)', display: 'block' }}/>
          <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>Correlates ITDR alerts, Shadow AI events, hardware alerts, agent actions, endpoint logs, and defense events linked to this case.</div>
          <div style={{ fontSize: '0.75rem' }}>Clusters them by time and asks Nemotron-70B to reconstruct the attack chain as a narrative.</div>
        </div>
      )}

      {/* No events found */}
      {result && result.event_count === 0 && (
        <div className="at-card" style={{ padding: 36, textAlign: 'center', color: '#787878' }}>
          <Network size={32} style={{ margin: '0 auto 12px', color: 'rgba(156,124,255,0.2)', display: 'block' }}/>
          <div style={{ fontSize: '0.85rem' }}>{result.narrative}</div>
        </div>
      )}

      {/* Result */}
      {result && result.event_count > 0 && (
        <div>
          {/* Narrative */}
          <div className="at-card" style={{ padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#9C7CFF' }}>{result.suggested_title}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#787878', ...MONO }}>
                  {result.event_count} events · {result.step_count} steps · confidence {result.confidence}%
                </span>
                <button className="btn-ghost" onClick={applyToCase} style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                  Apply to Case
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#EBEBEB', lineHeight: 1.6 }}>{result.narrative}</div>
            {result.mitre_chain?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {result.mitre_chain.map(t => (
                  <span key={t} style={{ background: 'rgba(156,124,255,0.1)', border: '1px solid rgba(156,124,255,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.68rem', color: '#9C7CFF', ...MONO }}>{t}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: '#444', marginTop: 8 }}>
              Generated by {result.model_used || 'AI'} at {fmtTime(result.generated_at)}
            </div>
          </div>

          {/* Steps */}
          {result.steps?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: '#787878', marginBottom: 10, fontWeight: 600 }}>RECONSTRUCTED STEPS</div>
              {result.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(156,124,255,0.12)', border: '1px solid rgba(156,124,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', color: '#9C7CFF', fontWeight: 700 }}>{s.step}</div>
                    {i < result.steps.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.08)', marginTop: 4 }} />}
                  </div>
                  <div className="at-card" style={{ flex: 1, padding: '10px 14px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '0.82rem', color: '#EBEBEB' }}>{s.description}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                        {s.technique && <span style={{ background: 'rgba(156,124,255,0.1)', border: '1px solid rgba(156,124,255,0.3)', borderRadius: 4, padding: '1px 7px', fontSize: '0.66rem', color: '#9C7CFF', ...MONO }}>{s.technique}</span>}
                        {s.severity && <SeverityBadge severity={s.severity} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Raw correlated events */}
          <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div onClick={() => setShowEvents(s => !s)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#787878' }}>Correlated events ({result.events?.length || 0})</span>
              <ArrowRight size={13} style={{ color: '#555', transform: showEvents ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
            </div>
            {showEvents && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {(result.events || []).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < result.events.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: '0.76rem' }}>
                    <Clock size={12} style={{ color: '#444', flexShrink: 0 }} />
                    <span style={{ color: '#555', ...MONO, fontSize: '0.7rem', flexShrink: 0 }}>{fmtTime(e.timestamp)}</span>
                    <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 6px', fontSize: '0.66rem', color: '#8FAFC0', flexShrink: 0, ...MONO }}>{SOURCE_LABELS[e.source] || e.source}</span>
                    {e.hostname && <span style={{ color: '#787878', fontSize: '0.7rem', ...MONO, flexShrink: 0 }}>{e.hostname}</span>}
                    <span style={{ color: '#A8A8A8', flex: 1 }}>{e.description}</span>
                    <SeverityBadge severity={e.severity} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
