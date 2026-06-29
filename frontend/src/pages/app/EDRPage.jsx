import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield } from '../../components/icons';
import { SeverityBadge, StatusBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';
import EDRTab from './CaseDetail/EDRTab';

export default function EDRPage() {
  const { caseId } = useParams();
  const navigate   = useNavigate();
  const { addToast } = useStore();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!caseId) { setLoading(false); return; }
    api.get(`/api/cases/${caseId}`)
      .then(r => setCaseData(r.data))
      .catch(() => addToast('Failed to load case', 'error'))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: var(--card), padding: '20px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 10, width: 200, marginBottom: 20 }} />
        {[0,1,2].map(i => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: var(--card), color: 'var(--text-primary)' }}>

      {/* Header */}
      <div style={{
        background: var(--surface), borderBottom: '1px solid rgba(26,22,18,0.08)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => window.close()}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}
        >
          <ChevronLeft size={14} /> Close
        </button>
        <span style={{ color: 'rgba(26,22,18,0.2)' }}>|</span>
        <Shield size={15} style={{ color: '#22C55E' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>EDR Response Console</span>
        {caseData && (
          <>
            <span style={{ color: 'rgba(26,22,18,0.2)' }}>—</span>
            <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono', color: '#8BB8E8' }}>{caseData.case_number}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{caseData.title}</span>
            <SeverityBadge severity={caseData.severity} />
            <StatusBadge   status={caseData.status} />
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px' }}>
        {caseData ? (
          <EDRTab caseData={caseData} />
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            {caseId ? 'Case not found.' : 'No case context. Use the EDR tab from inside a case.'}
          </div>
        )}
      </div>
    </div>
  );
}
