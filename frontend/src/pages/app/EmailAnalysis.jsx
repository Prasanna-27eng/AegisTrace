import React, { useState, useEffect } from 'react';
import { Mail, Loader2, Shield, Copy, Link } from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

export default function EmailAnalysis() {
  const { addToast } = useStore();
  const [tab, setTab] = useState('header');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get('/api/email/history').then(r => setHistory(r.data)).catch(() => {});
  }, []);

  const analyse = async () => {
    if (!headers.trim()) { addToast('Paste email headers', 'error'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/api/email/analyse', { headers, body });
      setResult(res.data);
      setHistory(p => [res.data, ...p]);
      addToast('Analysis complete', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Analysis failed', 'error'); }
    setLoading(false);
  };

  const authColor = (v) => v === 'pass' ? '#22C55E' : v === 'fail' ? '#EF4444' : '#71717A';

  const aiData = (() => { try { return JSON.parse(result?.ai_analysis || '{}'); } catch { return {}; } })();

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Email Analysis</h1>
        <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: 2 }}>Header analysis · SPF/DKIM/DMARC · Phishing detection</div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
        {['header','full','saved'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'header' ? 'Header Analyzer' : t === 'full' ? 'Full Email' : 'Saved Analyses'}
          </button>
        ))}
      </div>

      {(tab === 'header' || tab === 'full') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#71717A', display: 'block', marginBottom: 6 }}>Raw Email Headers</label>
              <textarea className="at-textarea" rows={tab === 'full' ? 8 : 14} value={headers} onChange={e => setHeaders(e.target.value)} placeholder="Received: from mail.evil-domain.com...&#10;From: cfo@company.com&#10;Subject: URGENT: Wire Transfer&#10;..." style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }} />
            </div>
            {tab === 'full' && (
              <div>
                <label style={{ fontSize: '0.75rem', color: '#71717A', display: 'block', marginBottom: 6 }}>Email Body</label>
                <textarea className="at-textarea" rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="Paste email body here…" style={{ fontSize: '0.8rem' }} />
              </div>
            )}
            <button className="btn-accent" onClick={analyse} disabled={loading} style={{ justifyContent: 'center', padding: '10px' }}>
              {loading ? <><Loader2 size={14} className="spinner" /> Analysing…</> : <><Mail size={14} /> Analyse Email</>}
            </button>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!result ? (
              <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#71717A', fontSize: '0.82rem' }}>
                Paste email headers and click "Analyse Email" to extract sender info, auth results, IOCs, and AI verdict.
              </div>
            ) : (
              <>
                {/* AI Verdict */}
                {aiData.verdict && (
                  <div className="at-card" style={{ padding: 14, borderLeft: `2px solid ${aiData.verdict === 'Phishing' || aiData.verdict === 'BEC' ? '#C0392B' : aiData.verdict === 'Legitimate' ? '#22C55E' : '#EAB308'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: aiData.verdict === 'Phishing' || aiData.verdict === 'BEC' ? '#C0392B' : aiData.verdict === 'Legitimate' ? '#22C55E' : '#EAB308' }}>{aiData.verdict}</div>
                      <span className="ai-badge">AI</span>
                      {aiData.confidence && <span style={{ fontSize: '0.75rem', color: '#71717A' }}>{aiData.confidence}% confidence</span>}
                    </div>
                    {aiData.analysis && <p style={{ fontSize: '0.8rem', color: '#B0B0C0', lineHeight: 1.65 }}>{aiData.analysis}</p>}
                    {aiData.indicators?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {aiData.indicators.map((ind, i) => <div key={i} style={{ fontSize: '0.78rem', color: '#EAB308', padding: '2px 0', display: 'flex', gap: 6 }}><span>→</span>{ind}</div>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Auth Results */}
                <div className="at-card" style={{ padding: 14 }}>
                  <div className="section-label">Authentication</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
                    {[['SPF', result.spf_result], ['DKIM', result.dkim_result], ['DMARC', result.dmarc_result]].map(([name, val]) => (
                      <div key={name} style={{ padding: '10px', background: '#0F1018', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.68rem', color: '#71717A', marginBottom: 4 }}>{name}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: authColor(val), fontFamily: 'JetBrains Mono' }}>{val?.toUpperCase() || 'NONE'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sender Info */}
                <div className="at-card" style={{ padding: 14 }}>
                  <div className="section-label">Sender Info</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                    {result.sender_ip && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#71717A', minWidth: 80 }}>Sender IP:</span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: '#F0F0F8' }}>{result.sender_ip}</span>
                        <button onClick={() => navigator.clipboard.writeText(result.sender_ip)} className="btn-ghost" style={{ padding: '2px 6px' }}><Copy size={10} /></button>
                      </div>
                    )}
                    {result.sender_domain && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#71717A', minWidth: 80 }}>Domain:</span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: '#F0F0F8' }}>{result.sender_domain}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* IOCs */}
                {(() => { try { const iocs = JSON.parse(result.extracted_iocs || '[]'); return iocs.length > 0 && (
                  <div className="at-card" style={{ padding: 14 }}>
                    <div className="section-label">Extracted IOCs ({iocs.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {iocs.map((ioc, i) => <span key={i} className="ioc-pill" style={{ cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(ioc.ioc)}>{ioc.ioc}</span>)}
                    </div>
                  </div>
                ); } catch { return null; } })()}

                {/* Routing Hops */}
                {(() => { try { const hops = JSON.parse(result.routing_hops || '[]'); return hops.length > 0 && (
                  <div className="at-card" style={{ padding: 14 }}>
                    <div className="section-label">Routing Hops ({hops.length})</div>
                    {hops.map((h, i) => <div key={i} style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#71717A', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', lineHeight: 1.5 }}>{h.slice(0, 120)}</div>)}
                  </div>
                ); } catch { return null; } })()}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'saved' && (
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#71717A' }}>No saved analyses yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(h => {
                const ai = (() => { try { return JSON.parse(h.ai_analysis || '{}'); } catch { return {}; } })();
                return (
                  <div key={h.id} className="at-card" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{h.sender_ip || 'Unknown sender'}</span>
                        {h.sender_domain && <span style={{ fontSize: '0.75rem', color: '#71717A' }}>{h.sender_domain}</span>}
                      </div>
                      {ai.verdict && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ai.verdict === 'Phishing' || ai.verdict === 'BEC' ? '#EF4444' : ai.verdict === 'Legitimate' ? '#22C55E' : '#EAB308' }}>{ai.verdict}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: '#71717A' }}>
                      <span>SPF: <span style={{ color: authColor(h.spf_result) }}>{h.spf_result?.toUpperCase()}</span></span>
                      <span>DKIM: <span style={{ color: authColor(h.dkim_result) }}>{h.dkim_result?.toUpperCase()}</span></span>
                      <span>DMARC: <span style={{ color: authColor(h.dmarc_result) }}>{h.dmarc_result?.toUpperCase()}</span></span>
                      <span style={{ marginLeft: 'auto' }}>{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
