import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import Logo from '../../components/Logo';

// Re-use the same renderer from HardwareTools inline (lightweight version)
function ResultRenderer({ toolKey, result }) {
  if (!result) return null;
  if (result.error) return (
    <div style={{ padding: 24, color: '#EF4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
      <AlertTriangle size={16} style={{ marginRight: 8 }} />{result.error}
    </div>
  );
  const summary = result.summary || result.ai_summary;
  const verdict = result.verdict || result.overall_threat_level || result.overall_risk_level;
  const isBAD = verdict && !['clean','low','info'].includes(verdict) && !verdict.includes('none');
  const MITRE_COLOR = '#A78BFA';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {verdict && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 6, background: isBAD ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.06)', border: `1px solid ${isBAD ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}` }}>
          <Shield size={15} style={{ color: isBAD ? '#EF4444' : '#22C55E' }} />
          <strong style={{ color: isBAD ? '#EF4444' : '#22C55E', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', fontSize: '0.82rem' }}>Verdict: {verdict}</strong>
        </div>
      )}
      {summary && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, fontSize: '0.85rem', lineHeight: 1.7 }}>{summary}</div>
      )}
      {result.mitre_techniques?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {result.mitre_techniques.map(t => (
            <span key={t} style={{ background: `${MITRE_COLOR}12`, border: `1px solid ${MITRE_COLOR}30`, color: MITRE_COLOR, fontFamily: 'JetBrains Mono', fontSize: '0.7rem', padding: '3px 10px', borderRadius: 4 }}>{t}</span>
          ))}
        </div>
      )}
      <div style={{ background: '#0a0b12', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 16, fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#b8c1cc', overflow: 'auto', maxHeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7 }}>
        {JSON.stringify(result, null, 2)}
      </div>
    </div>
  );
}

export default function ToolResult() {
  const { runId } = useParams();
  const navigate  = useNavigate();
  const [run, setRun]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem('at_token');
    if (!token) {
      window.location.href = `/app/login?returnUrl=/app/hardware/tools/${runId}`;
      return;
    }
    api.get(`/api/hardware/tools/${runId}`)
      .then(r => setRun(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Tool run not found'))
      .finally(() => setLoading(false));
  }, [runId]);

  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: '#F0F0F8' }}>
      {/* Header */}
      <header style={{ background: '#1F2937', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 20, position: 'sticky', top: 0, zIndex: 10 }}>
        <Logo size={20} showText />
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono' }}>Hardware Tools</span>
        <span style={{ color: '#3B82F6' }}>/</span>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{run?.tool_name?.replace(/_/g,' ')}</span>
        {run && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginLeft: 4 }}>Run #{runId}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {run && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{new Date(run.executed_at).toLocaleString()}</span>}
          <button onClick={() => navigate('/app/hardware/tools')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#F0F0F8', padding: '7px 14px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'JetBrains Mono' }}>
            <ChevronLeft size={13} />Back to Tools
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'rgba(255,255,255,0.4)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>Loading result…</span>
          </div>
        )}
        {error && (
          <div style={{ padding: 24, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={16} />{error}
          </div>
        )}
        {run && !loading && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>{run.tool_name?.replace(/_/g, ' ')}</h1>
              {run.case_id && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3B82F6', padding: '2px 8px', borderRadius: 3 }}>Linked to Case #{run.case_id}</span>}
            </div>
            <ResultRenderer toolKey={run.tool_name} result={run.result} />
          </>
        )}
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
