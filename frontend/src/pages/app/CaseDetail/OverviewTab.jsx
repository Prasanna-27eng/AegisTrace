import React, { useState } from 'react';
import { Copy, Link } from 'lucide-react';
import useStore from '../../../store/useStore';
import api from '../../../api/client';

const SEVERITIES = ['critical','high','medium','low','info'];
const STATUSES   = ['open','in_progress','pending_closure','closed'];
const TYPES      = ['phishing','malware','ransomware','bec','insider_threat','data_breach','dos_ddos','unauthorized_access','vulnerability','other'];

export default function OverviewTab({ caseData, updateCase, caseId, reload }) {
  const { addToast, user } = useStore();
  const [showClose, setShowClose] = useState(false);
  const [closure, setClosure] = useState({ final_findings: '', remediation_steps: '', lessons_learned: '', evidence_complete: false });

  if (!caseData) return null;

  const iocs = (() => { try { return JSON.parse(caseData.iocs || '[]'); } catch { return []; } })();

  const handleClose = async () => {
    try {
      await api.post(`/api/cases/${caseId}/close`, { ...closure, closed_by: user?.name || caseData.analyst_name || 'Analyst' });
      addToast('Case closed successfully', 'success');
      reload();
      setShowClose(false);
    } catch (e) {
      addToast(e.response?.data?.detail || 'Closure failed — fill all required fields', 'error');
    }
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1000 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Core fields */}
          <div className="at-card" style={{ padding: 16 }}>
            <div className="section-label">Case Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Title', key: 'title', full: true },
                { label: 'Analyst', key: 'analyst_name' },
                { label: 'Customer', key: 'customer_name' },
                { label: 'Affected Systems', key: 'affected_systems' },
                { label: 'Classification', key: 'classification' },
              ].map(({ label, key, full }) => (
                <div key={key} style={full ? { gridColumn: '1/-1' } : {}}>
                  <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input className="at-input" value={caseData[key] || ''} onChange={e => updateCase({ [key]: e.target.value })} style={{ fontSize: '0.8rem' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Severity</label>
                <select className="at-select" value={caseData.severity} onChange={e => updateCase({ severity: e.target.value })} style={{ width: '100%', fontSize: '0.8rem' }}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Status</label>
                <select className="at-select" value={caseData.status} onChange={e => updateCase({ status: e.target.value })} style={{ width: '100%', fontSize: '0.8rem' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>Incident Type</label>
                <select className="at-select" value={caseData.incident_type} onChange={e => updateCase({ incident_type: e.target.value })} style={{ width: '100%', fontSize: '0.8rem' }}>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="at-card" style={{ padding: 16 }}>
            <div className="section-label">Description</div>
            <textarea className="at-textarea" rows={5} value={caseData.description || ''} onChange={e => updateCase({ description: e.target.value })} placeholder="Describe what happened…" />
          </div>

          {/* Share link */}
          <div className="at-card" style={{ padding: 16 }}>
            <div className="section-label">Share Link</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="at-input" readOnly value={`${window.location.origin}/public/${caseData.share_token}`} style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#787878' }} />
              <button className="btn-ghost" style={{ flexShrink: 0, padding: '7px 10px' }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/public/${caseData.share_token}`); addToast('Copied!', 'success'); }}>
                <Copy size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI Summary */}
          {caseData.ai_executive_summary && (
            <div className="at-card" style={{ padding: 16, borderLeft: '2px solid rgba(143,175,192,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div className="section-label" style={{ margin: 0 }}>Executive Summary</div>
                <span className="ai-badge">AI</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#909090', lineHeight: 1.7 }}>{caseData.ai_executive_summary}</p>
              {caseData.ai_severity_score && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', color: '#787878' }}>AI Severity Score:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: caseData.ai_severity_score > 70 ? '#EF4444' : caseData.ai_severity_score > 40 ? '#EAB308' : '#22C55E' }}>
                    {caseData.ai_severity_score}/100
                  </span>
                </div>
              )}
            </div>
          )}

          {/* IOCs preview */}
          {iocs.length > 0 && (
            <div className="at-card" style={{ padding: 16 }}>
              <div className="section-label">IOCs ({iocs.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {iocs.slice(0, 12).map((ioc, i) => (
                  <span key={i} className="ioc-pill" onClick={() => navigator.clipboard.writeText(ioc.ioc)} style={{ cursor: 'pointer' }} title="Click to copy">{ioc.ioc}</span>
                ))}
                {iocs.length > 12 && <span style={{ fontSize: '0.72rem', color: '#787878', padding: '2px 6px' }}>+{iocs.length - 12} more</span>}
              </div>
            </div>
          )}

          {/* Shift handoff */}
          <div className="at-card" style={{ padding: 16 }}>
            <div className="section-label">Shift Handoff Notes</div>
            <textarea className="at-textarea" rows={4} value={caseData.shift_handoff || ''} onChange={e => updateCase({ shift_handoff: e.target.value })} placeholder="What was checked, what remains open, what should happen next…" style={{ fontSize: '0.8rem' }} />
          </div>

          {/* Close case */}
          {caseData.status !== 'closed' && (
            <div>
              {!showClose ? (
                <button className="btn-danger" onClick={() => setShowClose(true)} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                  Close Case
                </button>
              ) : (
                <div className="at-card" style={{ padding: 16, borderColor: 'rgba(239,68,68,0.2)' }}>
                  <div className="section-label" style={{ color: '#EF4444' }}>Close Case — Required Fields</div>
                  {[
                    { label: 'Final Findings *', key: 'final_findings', placeholder: 'Summary of investigation findings…' },
                    { label: 'Remediation Steps *', key: 'remediation_steps', placeholder: 'Steps taken to remediate…' },
                    { label: 'Lessons Learned *', key: 'lessons_learned', placeholder: 'What to improve next time…' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: '0.7rem', color: '#787878', display: 'block', marginBottom: 4 }}>{label}</label>
                      <textarea className="at-textarea" rows={3} value={closure[key]} onChange={e => setClosure(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={{ fontSize: '0.78rem' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <input type="checkbox" id="ev-check" checked={closure.evidence_complete} onChange={e => setClosure(p => ({ ...p, evidence_complete: e.target.checked }))} />
                    <label htmlFor="ev-check" style={{ fontSize: '0.78rem', color: '#BDD4E8' }}>Evidence checklist complete</label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-danger" onClick={handleClose} style={{ flex: 1, justifyContent: 'center' }}>Confirm Close</button>
                    <button className="btn-ghost" onClick={() => setShowClose(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
