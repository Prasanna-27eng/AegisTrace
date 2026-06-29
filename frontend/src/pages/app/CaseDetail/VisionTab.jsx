import React, { useState, useRef } from 'react';
import { Eye, Upload, Loader2, AlertTriangle, CheckCircle, ShieldAlert, X, ExternalLink } from '../../../components/icons';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const SEVERITY_COLOR = {
  Malicious: '#EF4444',
  Phishing:  '#EF4444',
  Malware:   '#EF4444',
  Suspicious:'#EAB308',
  Benign:    '#22C55E',
  Unknown:   'rgba(26,22,18,0.5)',
};

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

export default function VisionTab({ caseData, caseId, reload }) {
  const { addToast } = useStore();
  const fileRef    = useRef(null);
  const [result,   setResult]   = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [context,  setContext]  = useState('');
  const [file,     setFile]     = useState(null);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { addToast('Image must be under 5 MB', 'error'); return; }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const clearFile = () => { setFile(null); setPreview(null); setResult(null); fileRef.current.value = ''; };

  const analyse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('context', context);
      const res = await api.post(`/api/vision/cases/${caseId}/analyze`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      if (res.data.verdict !== 'Benign' && res.data.verdict !== 'Unknown') {
        await reload();
        addToast('Vision findings appended to case', 'success');
      } else {
        addToast('Vision analysis complete', 'success');
      }
    } catch (e) {
      addToast(e.response?.data?.detail || 'Vision analysis failed', 'error');
    }
    setLoading(false);
  };

  const verdictColor = result ? (SEVERITY_COLOR[result.verdict] || 'rgba(26,22,18,0.5)') : 'rgba(26,22,18,0.5)';

  return (
    <div style={{ padding: '20px 24px', maxWidth: 920 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Eye size={18} style={{ color: 'rgba(26,22,18,0.7)' }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Vision Analysis</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(26,22,18,0.5)', marginTop: 1 }}>
            Llama 3.2 Vision 11B · NVIDIA NIM
          </div>
        </div>
      </div>

      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${preview ? 'rgba(143,175,192,0.4)' : 'rgba(26,22,18,0.1)'}`,
          borderRadius: 8,
          padding: preview ? 12 : 40,
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: 16,
          background: preview ? 'transparent' : 'rgba(26,22,18,0.02)',
          transition: 'border-color 200ms',
          position: 'relative',
        }}
      >
        {preview ? (
          <>
            <button
              onClick={e => { e.stopPropagation(); clearFile(); }}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', padding: '2px 6px' }}
            ><X size={13}/></button>
            <img src={preview} alt="preview" style={{ maxHeight: 220, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }}/>
          </>
        ) : (
          <>
            <Upload size={28} style={{ color: 'rgba(26,22,18,0.2)', margin: '0 auto 12px', display: 'block' }}/>
            <div style={{ fontSize: '0.85rem', color: 'rgba(26,22,18,0.5)' }}>Drop a screenshot or click to upload</div>
            <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 6 }}>JPEG, PNG, WebP — max 5 MB</div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} style={{ display: 'none' }}/>

      {/* Context input */}
      <textarea
        value={context}
        onChange={e => setContext(e.target.value)}
        placeholder="Optional: add context about what this screenshot shows (e.g. 'from infected host', 'phishing email body')"
        style={{ width: '100%', background: 'var(--card)', border: '1px solid rgba(26,22,18,0.08)', borderRadius: 6, color: 'rgba(26,22,18,0.6)', padding: '10px 12px', fontSize: '0.82rem', resize: 'vertical', minHeight: 56, marginBottom: 14, boxSizing: 'border-box' }}
      />

      <button
        onClick={analyse}
        disabled={!file || loading}
        className="btn-accent"
        style={{ fontSize: '0.82rem', opacity: (!file || loading) ? 0.5 : 1 }}
      >
        {loading ? <><Loader2 size={14} className="spinner"/> Analysing…</> : <><Eye size={14}/> Analyse Screenshot</>}
      </button>

      {/* Result */}
      {result && (
        <div className="at-card" style={{ marginTop: 24, padding: 20 }}>
          {/* Verdict header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {result.verdict === 'Benign'
                ? <CheckCircle size={18} color="#22C55E"/>
                : <ShieldAlert size={18} color={verdictColor}/>
              }
              <span style={{ fontSize: '1rem', fontWeight: 700, color: verdictColor }}>{result.verdict}</span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(26,22,18,0.5)' }}>{result.confidence}% confidence</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#555', ...MONO }}>{result.model}</span>
          </div>

          {/* Summary */}
          <p style={{ fontSize: '0.85rem', color: 'rgba(26,22,18,0.55)', lineHeight: 1.65, marginBottom: 16 }}>{result.summary}</p>

          {/* Key indicators */}
          {result.key_indicators?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Key Indicators</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.key_indicators.map((ind, i) => (
                  <span key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '3px 8px', fontSize: '0.75rem', color: '#EF9090', ...MONO }}>{ind}</span>
                ))}
              </div>
            </div>
          )}

          {/* IOCs detected */}
          {result.iocs_detected?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>IOCs Detected in Image</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.iocs_detected.map((ioc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                    <span style={{ background: 'rgba(139,184,232,0.1)', borderRadius: 3, padding: '2px 6px', color: 'rgba(26,22,18,0.7)', ...MONO, textTransform: 'uppercase', fontSize: '0.65rem' }}>{ioc.type}</span>
                    <span style={{ color: 'rgba(26,22,18,0.6)', ...MONO }}>{ioc.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MITRE */}
          {result.mitre_techniques?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>MITRE ATT&CK</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.mitre_techniques.map((t, i) => (
                  <span key={i} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 4, padding: '3px 8px', fontSize: '0.72rem', color: '#F59E0B', ...MONO }}>{t.id} — {t.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended actions */}
          {result.recommended_actions?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recommended Actions</div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {result.recommended_actions.map((a, i) => (
                  <li key={i} style={{ fontSize: '0.82rem', color: 'rgba(26,22,18,0.55)', lineHeight: 1.65, marginBottom: 4 }}>{a}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
