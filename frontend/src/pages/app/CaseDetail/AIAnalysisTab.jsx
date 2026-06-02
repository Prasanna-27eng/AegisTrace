import React, { useState } from 'react';
import { Brain, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

export default function AIAnalysisTab({ caseData, updateCase, caseId, reload }) {
  const { addToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [confirmed, setConfirmed] = useState(!!caseData?.ai_executive_summary);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/api/cases/${caseId}/generate-ai`);
      await reload();
      setConfirmed(false);
      addToast('AI analysis generated', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'AI generation failed', 'error'); }
    setLoading(false);
  };

  const confirmAnalysis = () => {
    setConfirmed(true);
    addToast('AI analysis confirmed by analyst', 'success');
  };

  const mitre = (() => { try { return JSON.parse(caseData?.mitre_techniques || '[]'); } catch { return []; } })();

  const severityColor = (score) => {
  if (!caseData) return null;
    if (!score) return '#71717A';
    if (score >= 80) return '#EF4444';
    if (score >= 60) return '#EAB308';
    if (score >= 40) return '#A78BFA';
    return '#22C55E';
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={18} style={{ color: '#A78BFA' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>AI-Powered Analysis</div>
            <div style={{ fontSize: '0.72rem', color: '#71717A', marginTop: 1 }}>Groq · llama-3.3-70b-versatile</div>
          </div>
        </div>
        <button className="btn-accent" onClick={generate} disabled={loading} style={{ fontSize: '0.8rem' }}>
          {loading ? <><Loader2 size={14} className="spinner" /> Generating…</> : <><Brain size={14} /> {caseData?.ai_executive_summary ? 'Regenerate' : 'Generate Analysis'}</>}
        </button>
      </div>

      {!caseData?.ai_executive_summary && !loading && (
        <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#71717A' }}>
          <Brain size={32} style={{ margin: '0 auto 12px', color: 'rgba(167,139,250,0.3)' }} />
          <div>Click "Generate Analysis" to have AI analyse the case evidence.</div>
          <div style={{ fontSize: '0.78rem', marginTop: 6 }}>Requires: description, findings, or IOCs to be present.</div>
        </div>
      )}

      {caseData?.ai_executive_summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Confirmation bar */}
          {!confirmed ? (
            <div style={{ padding: '12px 16px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="ai-badge" style={{ marginRight: 8 }}>AI SUGGESTED</span>
                <span style={{ fontSize: '0.8rem', color: '#EAB308' }}>Review and confirm this AI analysis</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" onClick={() => setShowExplain(!showExplain)} style={{ fontSize: '0.75rem' }}>
                  {showExplain ? <><ChevronUp size={12} /> Hide Reasoning</> : <><ChevronDown size={12} /> Explain Why</>}
                </button>
                <button className="btn-accent" onClick={confirmAnalysis} style={{ fontSize: '0.75rem' }}><Check size={12} /> Confirm</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#22C55E' }}>
              <Check size={13} /> Analyst confirmed · Override by regenerating
            </div>
          )}

          {/* Explain why */}
          {showExplain && caseData.ai_severity_reasoning && (
            <div style={{ padding: '12px 16px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>// EXPLAIN WHY — AI Reasoning</div>
              <p style={{ fontSize: '0.82rem', color: '#B0B0C0', lineHeight: 1.7 }}>{caseData.ai_severity_reasoning}</p>
            </div>
          )}

          {/* Executive Summary */}
          <div className="at-card" style={{ padding: 16, borderLeft: '2px solid rgba(167,139,250,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div className="section-label" style={{ margin: 0 }}>Executive Summary</div>
              <span className="ai-badge">AI</span>
            </div>
            <textarea className="at-textarea" rows={4} value={caseData.ai_executive_summary || ''} onChange={e => updateCase({ ai_executive_summary: e.target.value })} style={{ fontSize: '0.85rem', fontFamily: 'Inter' }} />
          </div>

          {/* Technical Analysis */}
          {caseData.ai_technical_summary && (
            <div className="at-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div className="section-label" style={{ margin: 0 }}>Technical Analysis</div>
                <span className="ai-badge">AI</span>
              </div>
              <textarea className="at-textarea" rows={5} value={caseData.ai_technical_summary || ''} onChange={e => updateCase({ ai_technical_summary: e.target.value })} style={{ fontSize: '0.83rem', fontFamily: 'Inter' }} />
            </div>
          )}

          {/* Severity Score */}
          {caseData.ai_severity_score != null && (
            <div className="at-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div className="section-label" style={{ margin: 0 }}>AI Severity Score</div>
                <span className="ai-badge">AI</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: '3rem', fontWeight: 700, color: severityColor(caseData.ai_severity_score) }}>{caseData.ai_severity_score}</div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#71717A' }}>out of 100</div>
                  <div style={{ height: 6, width: 200, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${caseData.ai_severity_score}%`, background: severityColor(caseData.ai_severity_score), borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MITRE */}
          {mitre.length > 0 && (
            <div className="at-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div className="section-label" style={{ margin: 0 }}>MITRE ATT&CK Mapping</div>
                <span className="ai-badge">AI</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mitre.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#0F1018', borderRadius: 6 }}>
                    <span style={{ fontSize: '0.75rem', color: '#A78BFA', fontFamily: 'JetBrains Mono', minWidth: 80 }}>{m.id}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, flex: 1 }}>{m.name}</span>
                    <span style={{ fontSize: '0.7rem', color: '#71717A' }}>{m.tactic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
