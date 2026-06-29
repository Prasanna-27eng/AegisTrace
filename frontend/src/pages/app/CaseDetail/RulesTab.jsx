import React, { useState } from 'react';
import { Code2, Loader2, Copy, Check, Zap, FileCode } from '../../../components/icons';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const RULE_TYPES = [
  { key: 'yara',       label: 'YARA',        color: 'rgba(26,22,18,0.7)', note: 'Malware detection' },
  { key: 'sigma',      label: 'Sigma',        color: '#F59E0B', note: 'SIEM universal format' },
  { key: 'kql',        label: 'KQL',          color: '#A78BFA', note: 'Microsoft Sentinel' },
  { key: 'splunk_spl', label: 'Splunk SPL',   color: '#22C55E', note: 'Splunk query' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{ background: 'none', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 4, color: 'rgba(26,22,18,0.5)', cursor: 'pointer', padding: '3px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
      {copied ? <><Check size={11} style={{ color: '#22C55E' }}/> Copied</> : <><Copy size={11}/> Copy</>}
    </button>
  );
}

function RuleBlock({ label, code, color, note }) {
  const [open, setOpen] = useState(true);
  if (!code || code.startsWith('//')) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem', color, ...MONO, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: '0.72rem', color: '#555' }}>{note}</span>
        </div>
        <CopyButton text={code}/>
      </div>
      {open && (
        <pre style={{
          background: 'var(--surface)',
          border: '1px solid rgba(26,22,18,0.07)',
          borderRadius: 6,
          padding: '14px 16px',
          fontSize: '0.72rem',
          color: 'rgba(26,22,18,0.55)',
          overflowX: 'auto',
          margin: 0,
          lineHeight: 1.6,
          maxHeight: 300,
          overflowY: 'auto',
          ...MONO,
        }}>{code}</pre>
      )}
    </div>
  );
}

export default function RulesTab({ caseData, caseId }) {
  const { addToast }     = useStore();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasContent = caseData?.iocs || caseData?.mitre_techniques || caseData?.description;

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/api/rules/cases/${caseId}/generate`);
      setResult(res.data);
      addToast('Detection rules generated', 'success');
    } catch (e) {
      addToast(e.response?.data?.detail || 'Rule generation failed', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 920 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileCode size={18} style={{ color: 'rgba(26,22,18,0.7)' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Detection Rule Generator</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(26,22,18,0.5)', marginTop: 1 }}>
              Codestral 22B · NVIDIA NIM · YARA + Sigma + KQL + Splunk
            </div>
          </div>
        </div>
        <button className="btn-accent" onClick={generate} disabled={loading || !hasContent} style={{ fontSize: '0.8rem', opacity: !hasContent ? 0.5 : 1 }}>
          {loading
            ? <><Loader2 size={14} className="spinner"/> Generating…</>
            : <><Zap size={14}/> {result ? 'Regenerate Rules' : 'Generate Rules'}</>
          }
        </button>
      </div>

      {/* Pre-conditions notice */}
      {!hasContent && (
        <div className="at-card" style={{ padding: 24, textAlign: 'center', color: 'rgba(26,22,18,0.5)', fontSize: '0.85rem' }}>
          <Code2 size={28} style={{ margin: '0 auto 10px', color: 'rgba(26,22,18,0.12)', display: 'block' }}/>
          Add IOCs, MITRE techniques, or a description to the case first — the rule generator uses those as its input.
        </div>
      )}

      {/* Empty state */}
      {hasContent && !result && !loading && (
        <div className="at-card" style={{ padding: 36, textAlign: 'center', color: 'rgba(26,22,18,0.5)' }}>
          <FileCode size={32} style={{ margin: '0 auto 12px', color: 'rgba(143,175,192,0.25)', display: 'block' }}/>
          <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>Generates 4 rule types from case IOCs and MITRE techniques.</div>
          <div style={{ fontSize: '0.75rem' }}>YARA · Sigma (SIEM-universal) · Microsoft Sentinel KQL · Splunk SPL</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div>
          {/* Rule meta */}
          <div className="at-card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, ...MONO, color: '#F59E0B' }}>{result.rule_name}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(26,22,18,0.5)', marginTop: 3 }}>{result.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(result.platforms || []).map(p => (
                <span key={p} style={{ background: 'rgba(26,22,18,0.04)', border: '1px solid rgba(26,22,18,0.08)', borderRadius: 4, padding: '2px 8px', fontSize: '0.68rem', color: '#555', ...MONO }}>{p}</span>
              ))}
            </div>
          </div>

          {/* Rule blocks */}
          {RULE_TYPES.map(({ key, label, color, note }) => (
            result[key] && !result[key].startsWith('//') ? (
              <RuleBlock key={key} label={label} code={result[key]} color={color} note={note}/>
            ) : null
          ))}

          <div style={{ fontSize: '0.72rem', color: '#444', marginTop: 8 }}>
            Generated by {result.model} — review before deploying to production.
          </div>
        </div>
      )}
    </div>
  );
}
