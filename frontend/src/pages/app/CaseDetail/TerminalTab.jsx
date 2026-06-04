import React, { useState, useEffect } from 'react';
import { Play, Plus, Copy, Loader2 } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const TOOLS = ['nmap','whois','dig','host','curl','netstat','ss','volatility','strings','file','xxd','tshark','custom'];

export default function TerminalTab({ caseData, caseId, updateCase }) {
  const { addToast } = useStore();
  const [tool, setTool] = useState('custom');
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
  if (!caseData) return null;
    if (caseId && caseId !== 'new') {
      api.get(`/api/terminal/history?case_id=${caseId}`).then(r => setHistory(r.data)).catch(() => {});
    }
  }, [caseId]);

  const analyse = async () => {
    if (!output.trim()) { addToast('Paste tool output first', 'error'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/api/terminal/analyse', { case_id: parseInt(caseId) || null, tool_name: tool, command, output });
      setResult(res.data.ai_parsed);
      setHistory(p => [res.data, ...p]);
      addToast('Output analysed by AI', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Analysis failed', 'error'); }
    setLoading(false);
  };

  const addToFindings = () => {
    if (!result) return;
    const text = `\n\n## Terminal Analysis — ${tool}\n\n**Command:** \`${command}\`\n\n**Key Findings:**\n${result.key_findings?.map(f => `- ${f}`).join('\n')}\n\n**Summary:** ${result.summary}`;
    updateCase({ findings: (caseData?.findings || '') + text });
    addToast('Added to findings', 'success');
  };

  const iocColor = { malicious: '#EF4444', suspicious: '#EAB308' };

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Tool</label>
              <select className="at-select" value={tool} onChange={e => setTool(e.target.value)} style={{ width: '100%', fontSize: '0.8rem' }}>
                {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Command (optional)</label>
              <input className="at-input" placeholder="e.g. nmap -sV 185.220.101.34" value={command} onChange={e => setCommand(e.target.value)} style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Paste Tool Output</label>
            <textarea className="at-textarea" rows={14} value={output} onChange={e => setOutput(e.target.value)} placeholder="Paste raw terminal output here…&#10;&#10;$ nmap -sV 185.220.101.34&#10;Starting Nmap 7.94&#10;..." style={{ fontFamily: 'JetBrains Mono', fontSize: '0.77rem' }} />
          </div>

          <button className="btn-accent" onClick={analyse} disabled={loading} style={{ justifyContent: 'center', padding: '10px' }}>
            {loading ? <><Loader2 size={14} className="spinner" /> Analysing…</> : <><Play size={14} /> Analyse with AI</>}
          </button>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result ? (
            <>
              <div className="at-card" style={{ padding: 14, borderLeft: '2px solid rgba(167,139,250,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div className="section-label" style={{ margin: 0 }}>AI Parsed Result</div>
                  <span className="ai-badge">AI</span>
                </div>

                {result.summary && <p style={{ fontSize: '0.82rem', color: '#B0B0C0', lineHeight: 1.65, marginBottom: 12 }}>{result.summary}</p>}

                {result.key_findings?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.68rem', color: '#71717A', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', marginBottom: 6 }}>Key Findings</div>
                    {result.key_findings.map((f, i) => <div key={i} style={{ fontSize: '0.8rem', color: '#F0F0F8', padding: '3px 0', display: 'flex', gap: 8 }}><span style={{ color: '#4DA3FF' }}>→</span>{f}</div>)}
                  </div>
                )}

                {result.iocs_found?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.68rem', color: '#71717A', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', marginBottom: 6 }}>IOCs Found</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {result.iocs_found.map((ioc, i) => <span key={i} className="ioc-pill">{ioc.ioc}</span>)}
                    </div>
                  </div>
                )}

                {result.mitre_techniques?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.68rem', color: '#71717A', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', marginBottom: 6 }}>MITRE Techniques</div>
                    {result.mitre_techniques.map((m, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: '#A78BFA', fontFamily: 'JetBrains Mono', padding: '2px 0' }}>{m.id} — {m.name}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn-accent" onClick={addToFindings} style={{ fontSize: '0.78rem', padding: '6px 12px' }}><Plus size={12} /> Add to Findings</button>
                  <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))} style={{ fontSize: '0.78rem', padding: '6px 12px' }}><Copy size={12} /> Copy JSON</button>
                </div>
              </div>
            </>
          ) : (
            <div className="at-card" style={{ padding: 20, textAlign: 'center', color: '#71717A', fontSize: '0.82rem' }}>
              Paste tool output and click "Analyse with AI" to extract IOCs, findings, and MITRE techniques.
            </div>
          )}

          {/* Run history */}
          {history.length > 0 && (
            <div className="at-card" style={{ padding: 14 }}>
              <div className="section-label">Run History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {history.map((run, i) => (
                  <div key={run.id || i} style={{ padding: '7px 10px', background: '#0D111C', borderRadius: 5, cursor: 'pointer', fontSize: '0.78rem' }}
                    onClick={() => { setTool(run.tool_name); setCommand(run.command); setOutput(run.output); const p = JSON.parse(run.ai_parsed_result || '{}'); setResult(p); }}>
                    <div style={{ fontWeight: 500, color: '#F0F0F8' }}>{run.tool_name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{new Date(run.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
