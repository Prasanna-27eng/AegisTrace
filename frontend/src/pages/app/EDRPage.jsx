import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';
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
    <div style={{ padding: 40, color: '#71717A', textAlign: 'center' }}>Loading…</div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#07080E', color: '#F0F0F8' }}>

      {/* Header */}
      <div style={{
        background: '#0D111C', borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => window.close()}
          style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}
        >
          <ChevronLeft size={14} /> Close
        </button>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <Shield size={15} style={{ color: '#22C55E' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>EDR Response Console</span>
        {caseData && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
            <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono', color: '#A78BFA' }}>{caseData.case_number}</span>
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
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#71717A' }}>
            {caseId ? 'Case not found.' : 'No case context. Use the EDR tab from inside a case.'}
          </div>
        )}
      </div>
    </div>
  );
}
