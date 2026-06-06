import React, { useState } from 'react';
import { Plus, Copy, Shield, X, RefreshCw } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const IOC_TYPES = ['ip','domain','url','hash','email','sha256','md5'];

export default function IOCsTab({ caseData, updateCase, caseId }) {
  const { addToast } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newIOC, setNewIOC] = useState({ ioc: '', type: 'ip', verdict: '', confidence: 70 });
  const [defanged, setDefanged] = useState({});
  const [correlations, setCorrelations] = useState({});

  const iocs = (() => { try { return JSON.parse(caseData?.iocs || '[]'); } catch { return []; } })();

  const addIOC = () => {
  if (!caseData) return null;
    if (!newIOC.ioc.trim()) return;
    const updated = [...iocs, { ...newIOC, ioc: newIOC.ioc.trim() }];
    updateCase({ iocs: JSON.stringify(updated) });
    setNewIOC({ ioc: '', type: 'ip', verdict: '', confidence: 70 });
    setShowAdd(false);
    addToast('IOC added', 'success');
  };

  const removeIOC = (index) => {
    const updated = iocs.filter((_, i) => i !== index);
    updateCase({ iocs: JSON.stringify(updated) });
  };

  const copyIOC = (ioc) => {
    navigator.clipboard.writeText(ioc);
    addToast('Copied!', 'success');
  };

  const toggleDefang = async (ioc, index) => {
    if (defanged[index]) {
      setDefanged(p => ({ ...p, [index]: null }));
    } else {
      try {
        const res = await api.post('/api/malware/defang', { input: ioc });
        setDefanged(p => ({ ...p, [index]: res.data.defanged }));
      } catch {}
    }
  };

  const checkCorrelation = async (ioc) => {
    try {
      const res = await api.get(`/api/ioc/correlate/${encodeURIComponent(ioc)}`);
      setCorrelations(p => ({ ...p, [ioc]: res.data }));
    } catch {}
  };

  const vtLookup = async (ioc) => {
    try {
      addToast('Looking up in VirusTotal…', 'info');
      const res = await api.post('/api/vt/lookup', { ioc });
      addToast(`VT: ${ioc} → ${res.data.verdict?.toUpperCase()} (${res.data.malicious_count}/${res.data.total_engines})`, res.data.verdict === 'malicious' ? 'error' : 'success');
      // Update verdict in iocs list
      const updated = iocs.map((item, i) => item.ioc === ioc ? { ...item, verdict: res.data.verdict } : item);
      updateCase({ iocs: JSON.stringify(updated) });
    } catch (e) { addToast(e.response?.data?.detail || 'VT lookup failed', 'error'); }
  };

  const verdictColor = { malicious: '#EF4444', suspicious: '#EAB308', clean: '#22C55E', '': '#787878' };

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Indicators of Compromise</h3>
          <div style={{ fontSize: '0.72rem', color: '#787878', marginTop: 2 }}>{iocs.length} IOC{iocs.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 12px' }} onClick={() => {
            const text = iocs.map(i => i.ioc).join('\n');
            navigator.clipboard.writeText(text);
            addToast('All IOCs copied!', 'success');
          }}>Copy All</button>
          <button className="btn-accent" style={{ fontSize: '0.78rem', padding: '6px 12px' }} onClick={() => setShowAdd(true)}><Plus size={13} /> Add IOC</button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="at-card" style={{ padding: 14, marginBottom: 16, borderColor: 'rgba(90,138,159,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="section-label" style={{ margin: 0 }}>Add IOC</div>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="at-input" placeholder="IOC value…" value={newIOC.ioc} onChange={e => setNewIOC(p => ({ ...p, ioc: e.target.value }))} style={{ flex: 2, fontSize: '0.8rem', fontFamily: 'JetBrains Mono' }} onKeyDown={e => e.key === 'Enter' && addIOC()} />
            <select className="at-select" value={newIOC.type} onChange={e => setNewIOC(p => ({ ...p, type: e.target.value }))} style={{ flex: '0 1 100px', fontSize: '0.8rem' }}>
              {IOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="at-select" value={newIOC.verdict} onChange={e => setNewIOC(p => ({ ...p, verdict: e.target.value }))} style={{ flex: '0 1 120px', fontSize: '0.8rem' }}>
              <option value="">No verdict</option>
              <option value="malicious">Malicious</option>
              <option value="suspicious">Suspicious</option>
              <option value="clean">Clean</option>
            </select>
            <button className="btn-accent" onClick={addIOC} style={{ fontSize: '0.78rem' }}><Plus size={12} /> Add</button>
          </div>
        </div>
      )}

      {/* IOC table */}
      {iocs.length === 0 ? (
        <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#787878', fontSize: '0.85rem' }}>
          No IOCs yet. Add your first indicator.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {iocs.map((item, i) => (
            <div key={i}>
              <div className="at-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#787878', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 3, flexShrink: 0 }}>{item.type}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: defanged[i] ? '#EAB308' : '#8FAFC0' }}>
                  {defanged[i] || item.ioc}
                </span>
                {item.verdict && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: verdictColor[item.verdict] || verdictColor[''], fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{item.verdict?.toUpperCase()}</span>
                )}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => copyIOC(defanged[i] || item.ioc)} className="btn-ghost" style={{ padding: '3px 7px' }} title="Copy"><Copy size={11} /></button>
                  <button onClick={() => vtLookup(item.ioc)} className="btn-ghost" style={{ padding: '3px 7px' }} title="VT Lookup"><Shield size={11} /></button>
                  <button onClick={() => toggleDefang(item.ioc, i)} className="btn-ghost" style={{ padding: '3px 7px', fontSize: '0.65rem' }} title="Toggle defang">{defanged[i] ? 'Refang' : 'Defang'}</button>
                  <button onClick={() => checkCorrelation(item.ioc)} className="btn-ghost" style={{ padding: '3px 7px' }} title="Correlate"><RefreshCw size={11} /></button>
                  <button onClick={() => removeIOC(i)} className="btn-ghost" style={{ padding: '3px 7px', color: '#EF4444' }} title="Remove"><X size={11} /></button>
                </div>
              </div>
              {correlations[item.ioc]?.found && correlations[item.ioc].case_count > 1 && (
                <div style={{ marginTop: 3, marginLeft: 8, padding: '6px 10px', background: 'rgba(90,138,159,0.06)', border: '1px solid rgba(90,138,159,0.15)', borderRadius: 5, fontSize: '0.72rem', color: '#5A8A9F' }}>
                  ⚠ Campaign alert: this IOC appears in {correlations[item.ioc].case_count} cases (IDs: {correlations[item.ioc].case_ids?.join(', ')})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
