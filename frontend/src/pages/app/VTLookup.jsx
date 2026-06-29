import React, { useState, useEffect } from 'react';
import { Search, Shield, Trash2, Copy, Loader2, ChevronDown, ChevronUp } from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';
import { VerdictBadge } from '../../components/SeverityBadge';

export default function VTLookup() {
  const { addToast } = useStore();
  const [tab, setTab] = useState('single');
  const [ioc, setIoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [histFilter, setHistFilter] = useState('');
  const [histSearch, setHistSearch] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const loadHistory = () => {
    const params = new URLSearchParams();
    if (histFilter) params.set('verdict', histFilter);
    if (histSearch) params.set('q', histSearch);
    api.get(`/api/vt/history?${params}`).then(r => setHistory(r.data)).catch(() => {});
  };

  useEffect(() => { loadHistory(); }, [histFilter, histSearch]);

  const lookup = async () => {
    if (!ioc.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/api/vt/lookup', { ioc: ioc.trim() });
      setResult(res.data);
      addToast(`${res.data.verdict?.toUpperCase()} — ${res.data.malicious_count}/${res.data.total_engines} engines`, res.data.verdict === 'malicious' ? 'error' : 'success');
      loadHistory();
    } catch (e) { addToast(e.response?.data?.detail || 'Lookup failed', 'error'); }
    setLoading(false);
  };

  const deleteHistory = async (id) => {
    await api.delete(`/api/vt/history/${id}`);
    setHistory(p => p.filter(h => h.id !== id));
    addToast('Deleted', 'success');
  };

  const bulkLookup = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setBulkLoading(true); setBulkResults([]);
    try {
      const res = await api.post('/api/vt/bulk', { iocs: lines });
      setBulkResults(res.data);
      addToast(`${res.data.filter(r => r.verdict === 'malicious').length} malicious found`, 'info');
    } catch { addToast('Bulk lookup failed', 'error'); }
    setBulkLoading(false);
  };

  const verdictBg = { malicious: 'rgba(239,68,68,0.06)', suspicious: 'rgba(234,179,8,0.06)', clean: 'rgba(34,197,94,0.06)', unknown: 'transparent' };
  const verdictBorder = { malicious: 'rgba(239,68,68,0.2)', suspicious: 'rgba(234,179,8,0.2)', clean: 'rgba(34,197,94,0.2)', unknown: 'rgba(255,255,255,0.07)' };

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>VirusTotal Lookup</h1>
        <div style={{ fontSize: '0.75rem', color: '#787878', marginTop: 2 }}>IP · Domain · Hash · URL</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
        {['single','history','bulk'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'single' ? 'Single Lookup' : t === 'history' ? 'Saved History' : 'Bulk IOC'}
          </button>
        ))}
      </div>

      {/* Single Lookup */}
      {tab === 'single' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 600 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#787878' }} />
              <input className="at-input" placeholder="Enter IP, domain, hash, or URL…" value={ioc} onChange={e => setIoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()} style={{ paddingLeft: 32, fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }} />
            </div>
            <button className="btn-accent" onClick={lookup} disabled={loading} style={{ flexShrink: 0 }}>
              {loading ? <Loader2 size={14} className="spinner" /> : <><Shield size={14} /> Lookup</>}
            </button>
          </div>

          {result && (
            <div className="at-card" style={{ padding: 20, maxWidth: 700, borderColor: verdictBorder[result.verdict] || verdictBorder.unknown, background: verdictBg[result.verdict] }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem', color: '#BDD4E8', marginBottom: 6 }}>{result.ioc}</div>
                  <div style={{ fontSize: '0.72rem', color: '#787878' }}>{result.ioc_type?.toUpperCase()}</div>
                </div>
                <VerdictBadge verdict={result.verdict} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: result.malicious_count > 0 ? '#EF4444' : '#22C55E' }}>{result.malicious_count}</div>
                  <div style={{ fontSize: '0.68rem', color: '#787878', marginTop: 2 }}>Malicious</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EAB308' }}>{result.suspicious_count || 0}</div>
                  <div style={{ fontSize: '0.68rem', color: '#787878', marginTop: 2 }}>Suspicious</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#BDD4E8' }}>{result.total_engines}</div>
                  <div style={{ fontSize: '0.68rem', color: '#787878', marginTop: 2 }}>Total Engines</div>
                </div>
              </div>

              {result.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                  {result.tags.map(t => <span key={t} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#787878', padding: '2px 8px', borderRadius: 4 }}>{t}</span>)}
                </div>
              )}

              {result.as_owner && <div style={{ fontSize: '0.78rem', color: '#787878', marginBottom: 4 }}>AS: {result.as_owner}</div>}
              {result.country && <div style={{ fontSize: '0.78rem', color: '#787878', marginBottom: 12 }}>Country: {result.country}</div>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(result.ioc)} style={{ fontSize: '0.78rem' }}><Copy size={12} /> Copy IOC</button>
                <a href={`https://www.virustotal.com/gui/${result.ioc_type === 'ip' ? 'ip-address' : result.ioc_type === 'hash' ? 'file' : result.ioc_type}/${result.ioc}`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: '0.78rem', textDecoration: 'none' }}>
                  View on VT ↗
                </a>
              </div>

              {/* Engine list */}
              {Object.keys(result.engines || {}).length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#787878', marginBottom: 8 }}>Flagging Engines</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {Object.entries(result.engines).slice(0, 20).map(([eng, data]) => (
                      <span key={eng} style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', padding: '2px 7px', borderRadius: 3 }}>{eng}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#787878' }} />
              <input className="at-input" placeholder="Search IOC…" value={histSearch} onChange={e => setHistSearch(e.target.value)} style={{ paddingLeft: 30, fontSize: '0.8rem' }} />
            </div>
            <select className="at-select" value={histFilter} onChange={e => setHistFilter(e.target.value)} style={{ flex: '0 1 150px', fontSize: '0.8rem' }}>
              <option value="">All Verdicts</option>
              {['malicious','suspicious','clean','unknown'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#787878', fontSize: '0.85rem' }}>No VT lookups yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map(h => (
                <div key={h.id} className="at-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.65rem', color: '#787878', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{h.ioc_type}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: '#BDD4E8' }}>{h.ioc}</span>
                  <span style={{ fontSize: '0.72rem', color: '#787878', flexShrink: 0 }}>{h.malicious_count}/{h.total_engines}</span>
                  <VerdictBadge verdict={h.verdict} />
                  <span style={{ fontSize: '0.7rem', color: '#787878', flexShrink: 0 }}>{new Date(h.looked_up_at).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => navigator.clipboard.writeText(h.ioc)} className="btn-ghost" style={{ padding: '4px 8px' }}><Copy size={11} /></button>
                    <button onClick={() => deleteHistory(h.id)} className="btn-ghost" style={{ padding: '4px 8px', color: '#EF4444' }}><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk */}
      {tab === 'bulk' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.75rem', color: '#787878', display: 'block', marginBottom: 6 }}>Paste IOCs (one per line or mixed text)</label>
            <textarea className="at-textarea" rows={8} value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="185.220.101.34&#10;evil-domain.com&#10;4a7f2b3cd91e...&#10;&#10;Or paste raw text — IOCs will be extracted automatically." style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem' }} />
          </div>
          <button className="btn-accent" onClick={bulkLookup} disabled={bulkLoading} style={{ marginBottom: 20 }}>
            {bulkLoading ? <><Loader2 size={14} className="spinner" /> Scanning…</> : <><Shield size={14} /> Bulk Lookup</>}
          </button>

          {bulkResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bulkResults.map((r, i) => (
                <div key={i} className="at-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.ioc}</span>
                  {r.error ? <span style={{ fontSize: '0.72rem', color: '#EF4444' }}>Error</span> : (
                    <>
                      <span style={{ fontSize: '0.72rem', color: '#787878' }}>{r.malicious_count}/{r.total_engines}</span>
                      <VerdictBadge verdict={r.verdict} />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
