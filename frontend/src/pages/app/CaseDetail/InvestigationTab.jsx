import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const EVIDENCE_SCORES = ['confirmed','strong','weak','hypothesis'];

export default function InvestigationTab({ caseData, updateCase, caseId }) {
  const { addToast } = useStore();
  const [evidence, setEvidence] = useState([]);
  const [showAddEv, setShowAddEv] = useState(false);
  const [newEv, setNewEv] = useState({ artifact_type: 'manual', source_module: '', raw_input: '', normalized_output: '', verdict: '', evidence_score: 'hypothesis', confidence: 50, ai_analysis: '' });

  useEffect(() => {
  if (!caseData) return null;
    if (caseId && caseId !== 'new') {
      api.get(`/api/cases/${caseId}/evidence`).then(r => setEvidence(r.data)).catch(() => {});
    }
  }, [caseId]);

  const addEvidence = async () => {
    try {
      const res = await api.post(`/api/cases/${caseId}/evidence`, newEv);
      setEvidence(p => [...p, res.data]);
      setShowAddEv(false);
      setNewEv({ artifact_type: 'manual', source_module: '', raw_input: '', normalized_output: '', verdict: '', evidence_score: 'hypothesis', confidence: 50, ai_analysis: '' });
      addToast('Evidence added', 'success');
    } catch { addToast('Failed to add evidence', 'error'); }
  };

  const confirmEvidence = async (ev) => {
    try {
      const res = await api.patch(`/api/cases/${caseId}/evidence/${ev.id}`, { analyst_confirmed: !ev.analyst_confirmed });
      setEvidence(p => p.map(e => e.id === ev.id ? res.data : e));
    } catch {}
  };

  const scoreColor = { confirmed: '#22C55E', strong: '#8BB8E8', weak: '#EAB308', hypothesis: '#787878' };

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Commands */}
          <div className="at-card" style={{ padding: 16 }}>
            <div className="section-label">Commands Run</div>
            <textarea className="at-textarea" rows={10} value={caseData?.commands_run || ''} onChange={e => updateCase({ commands_run: e.target.value })} placeholder="# Commands run during investigation&#10;$ nmap -sV 185.220.101.34&#10;..." style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem' }} />
          </div>

          {/* Findings */}
          <div className="at-card" style={{ padding: 16 }}>
            <div className="section-label">Analyst Findings</div>
            <textarea className="at-textarea" rows={8} value={caseData?.findings || ''} onChange={e => updateCase({ findings: e.target.value })} placeholder="Document your investigation findings…" style={{ fontSize: '0.82rem' }} />
          </div>

          {/* Recommendations */}
          <div className="at-card" style={{ padding: 16 }}>
            <div className="section-label">Recommendations</div>
            <textarea className="at-textarea" rows={5} value={caseData?.recommendations || ''} onChange={e => updateCase({ recommendations: e.target.value })} placeholder="Remediation and hardening recommendations…" style={{ fontSize: '0.82rem' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Evidence list */}
          <div className="at-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="section-label" style={{ margin: 0 }}>Evidence ({evidence.length})</div>
              <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={() => setShowAddEv(true)}><Plus size={12} /> Add</button>
            </div>

            {evidence.length === 0 ? (
              <div style={{ color: '#787878', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>No evidence yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {evidence.map(ev => (
                  <div key={ev.id} style={{ background: '#0E0E16', borderRadius: 6, padding: '10px 12px', border: `1px solid ${ev.analyst_confirmed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#BDD4E8' }}>{ev.artifact_type}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: scoreColor[ev.evidence_score], fontFamily: 'JetBrains Mono', padding: '1px 6px', background: `${scoreColor[ev.evidence_score]}18`, borderRadius: 3 }}>{ev.evidence_score}</span>
                        <span style={{ fontSize: '0.65rem', color: '#787878' }}>{ev.confidence}%</span>
                        <button onClick={() => confirmEvidence(ev)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ev.analyst_confirmed ? '#22C55E' : '#787878', padding: 2 }} title={ev.analyst_confirmed ? 'Confirmed' : 'Confirm'}>
                          {ev.analyst_confirmed ? <Check size={12} /> : <Check size={12} />}
                        </button>
                      </div>
                    </div>
                    {ev.verdict && <div style={{ fontSize: '0.72rem', color: '#787878' }}>Verdict: <span style={{ color: ev.verdict === 'malicious' ? '#EF4444' : '#EAB308' }}>{ev.verdict}</span></div>}
                    {ev.normalized_output && <div style={{ fontSize: '0.72rem', color: '#787878', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.normalized_output.slice(0,80)}</div>}
                    {ev.ai_analysis && (
                      <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(143,175,192,0.06)', borderRadius: 4, borderLeft: '2px solid rgba(143,175,192,0.3)' }}>
                        <span className="ai-badge" style={{ marginBottom: 4, display: 'inline-block' }}>AI</span>
                        <div style={{ fontSize: '0.72rem', color: '#909090', marginTop: 2 }}>{ev.ai_analysis.slice(0, 120)}…</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shift handoff */}
          <div className="at-card" style={{ padding: 16 }}>
            <div className="section-label">Shift Handoff</div>
            <textarea className="at-textarea" rows={4} value={caseData?.shift_handoff || ''} onChange={e => updateCase({ shift_handoff: e.target.value })} placeholder="What was checked, what's open, what's next…" style={{ fontSize: '0.8rem' }} />
          </div>

          {/* Add evidence modal */}
          {showAddEv && (
            <div className="at-card" style={{ padding: 16, borderColor: 'rgba(90,138,159,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="section-label" style={{ margin: 0 }}>Add Evidence</div>
                <button onClick={() => setShowAddEv(false)} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Type</label>
                    <select className="at-select" value={newEv.artifact_type} onChange={e => setNewEv(p => ({ ...p, artifact_type: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                      {['email','network','file','log','manual','tool_output'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Score</label>
                    <select className="at-select" value={newEv.evidence_score} onChange={e => setNewEv(p => ({ ...p, evidence_score: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                      {EVIDENCE_SCORES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Raw Input</label>
                  <textarea className="at-textarea" rows={3} value={newEv.raw_input} onChange={e => setNewEv(p => ({ ...p, raw_input: e.target.value }))} placeholder="Paste raw evidence…" style={{ fontSize: '0.78rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Normalized Output / Notes</label>
                  <input className="at-input" value={newEv.normalized_output} onChange={e => setNewEv(p => ({ ...p, normalized_output: e.target.value }))} placeholder="Summarised finding…" style={{ fontSize: '0.8rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Verdict</label>
                    <input className="at-input" value={newEv.verdict} onChange={e => setNewEv(p => ({ ...p, verdict: e.target.value }))} placeholder="malicious / suspicious / clean" style={{ fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Confidence %</label>
                    <input type="number" min="0" max="100" className="at-input" value={newEv.confidence} onChange={e => setNewEv(p => ({ ...p, confidence: parseInt(e.target.value) }))} style={{ fontSize: '0.8rem' }} />
                  </div>
                </div>
                <button className="btn-accent" onClick={addEvidence} style={{ justifyContent: 'center' }}>Add Evidence</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
