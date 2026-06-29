import React, { useState, useEffect } from 'react';
import { Upload, Play, Loader2, AlertTriangle, Shield, Brain, Copy, Plus, History, X } from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

const LOG_TYPES = ['auto','syslog','windows_event','apache_access','nginx_access','firewall','cloudtrail','auth_log','generic'];
const SEVERITY_COLOR = { high:'#EF4444', medium:'#EAB308', low:'#8BB8E8' };
const VERDICT_COLOR  = { Malicious:'#EF4444', Suspicious:'#EAB308', Clean:'#22C55E', Unknown:'#888888' };

const EXAMPLES = {
  syslog: `Jun  2 14:32:01 server01 sshd[12345]: Failed password for root from 185.220.101.34 port 22 ssh2
Jun  2 14:32:03 server01 sshd[12346]: Failed password for admin from 185.220.101.34 port 22 ssh2
Jun  2 14:32:05 server01 sshd[12347]: Accepted publickey for prasanna from 192.168.1.5 port 54321 ssh2
Jun  2 14:32:08 server01 sudo: prasanna : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash`,
  apache_access: `185.220.101.34 - - [02/Jun/2025:14:22:01 +0000] "GET /admin/config.php HTTP/1.1" 404 512
10.0.0.5 - admin [02/Jun/2025:14:22:15 +0000] "POST /wp-login.php HTTP/1.1" 200 4823
91.234.99.1 - - [02/Jun/2025:14:23:44 +0000] "GET /etc/passwd HTTP/1.1" 403 287`,
  windows_event: `TimeCreated: 2025-06-02T14:32:01Z | EventId: 4625 | Level: Warning
An account failed to log on. Account: admin. Workstation: DESKTOP-WIN11
Logon Type: 3. Source IP: 185.220.101.34

TimeCreated: 2025-06-02T14:35:22Z | EventId: 4720 | Level: Information
A user account was created. New Account: svc_backdoor. Created By: Administrator`,
};

export default function LogInvestigation() {
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [tab, setTab] = useState('analyse');
  const [content, setContent] = useState('');
  const [logType, setLogType] = useState('auto');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [pushCaseId, setPushCaseId] = useState('');
  const [cases, setCases] = useState([]);

  useEffect(() => {
    api.get('/api/ingest/analyses').then(r => setHistory(r.data)).catch(() => {});
    api.get('/api/cases?status=open').then(r => setCases(r.data)).catch(() => {});
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setContent(ev.target.result); setLabel(file.name); };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setContent(ev.target.result); setLabel(file.name); };
    reader.readAsText(file);
  };

  const analyse = async () => {
    if (!content.trim()) { addToast('Paste or upload a log first','error'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/api/ingest/analyse', {
        content, log_type: logType,
        source_label: label || 'Manual paste',
      });
      setResult(res.data);
      setHistory(h => [res.data, ...h]);
      addToast(`Analysis complete — Threat score: ${res.data.threat_score}/100`, res.data.threat_score > 60 ? 'error' : 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Analysis failed','error'); }
    setLoading(false);
  };

  const pushToCase = async () => {
    if (!result || !pushCaseId) return;
    try {
      const iocList = result.iocs.map(i => i.ioc).join('\n');
      await api.patch(`/api/cases/${pushCaseId}`, {
        findings: `\n\n## Log Investigation — ${result.log_type}\n${result.summary}\n\n**Key Findings:**\n${result.key_findings.map(f=>`- ${f}`).join('\n')}`,
        iocs: result.iocs,
      });
      addToast('Pushed to case','success');
      navigate(`/app/cases/${pushCaseId}`);
    } catch { addToast('Push failed','error'); }
  };

  const createCase = async () => {
    if (!result) return;
    try {
      const res = await api.post('/api/cases', {
        title: `Log Investigation: ${result.attack_type?.replace(/_/g,' ')} — ${result.log_type}`,
        severity: result.threat_score >= 80 ? 'high' : result.threat_score >= 50 ? 'medium' : 'low',
        incident_type: result.attack_type || 'unknown',
        description: result.summary,
        findings: result.key_findings.join('\n'),
        iocs: result.iocs,
      });
      addToast('Case created!','success');
      navigate(`/app/cases/${res.data.id}`);
    } catch { addToast('Failed to create case','error'); }
  };

  return (
    <div style={{ padding:'24px 28px' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:'1.3rem', fontWeight:600 }}>Log Investigation</h1>
        <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>Paste any log — AI parses, extracts IOCs, maps to MITRE</div>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid rgba(26,22,18,0.08)', marginBottom:20 }}>
        <button className={`tab-btn ${tab==='analyse'?'active':''}`} onClick={() => setTab('analyse')}>Analyse Log</button>
        <button className={`tab-btn ${tab==='history'?'active':''}`} onClick={() => setTab('history')}>
          History {history.length > 0 && <span style={{ marginLeft:5, background:'rgba(26,22,18,0.12)', color:'#4A7EC8', borderRadius:10, fontSize:'0.6rem', fontWeight:700, padding:'1px 5px', fontFamily:'JetBrains Mono' }}>{history.length}</span>}
        </button>
      </div>

      {tab === 'analyse' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Input */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Drop zone */}
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              style={{ border:'2px dashed rgba(26,22,18,0.1)', borderRadius:8, padding:'16px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(204,120,92,0.25)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(26,22,18,0.1)'}>
              <Upload size={20} style={{ color:'var(--text-muted)', margin:'0 auto 8px' }}/>
              <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:6 }}>Drop a log file or <label style={{ color:'#4A7EC8', cursor:'pointer' }}>browse<input type="file" accept=".log,.txt,.json,.csv" style={{ display:'none' }} onChange={handleFile}/></label></div>
              <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontFamily:'JetBrains Mono' }}>.log .txt .json .csv</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div>
                <label className="at-label">Log Type</label>
                <select className="at-select" value={logType} onChange={e => setLogType(e.target.value)} style={{ width:'100%', fontSize:'0.8rem' }}>
                  {LOG_TYPES.map(t => <option key={t} value={t}>{t === 'auto' ? 'Auto-detect' : t}</option>)}
                </select>
              </div>
              <div>
                <label className="at-label">Label (optional)</label>
                <input className="at-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. web-server-01" style={{ fontSize:'0.8rem' }}/>
              </div>
            </div>

            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <label className="at-label" style={{ margin:0 }}>Paste Log Content</label>
                <div style={{ display:'flex', gap:6 }}>
                  {Object.keys(EXAMPLES).map(k => (
                    <button key={k} onClick={() => { setContent(EXAMPLES[k]); setLogType(k); setLabel(`example_${k}`); }} style={{ fontSize:'0.62rem', color:'var(--text-muted)', background:'none', border:'1px solid rgba(26,22,18,0.09)', borderRadius:3, padding:'2px 6px', cursor:'pointer', fontFamily:'JetBrains Mono' }}>{k}</button>
                  ))}
                </div>
              </div>
              <textarea className="at-textarea" rows={14} value={content} onChange={e => setContent(e.target.value)}
                placeholder={`Paste raw log content here...\n\nSupported: Syslog, Windows Event, Apache/Nginx, Firewall, CloudTrail, any text`}
                style={{ fontFamily:'JetBrains Mono', fontSize:'0.75rem', lineHeight:1.5 }}/>
            </div>

            <button className="btn-accent" onClick={analyse} disabled={loading || !content.trim()} style={{ justifyContent:'center', padding:10 }}>
              {loading ? <><Loader2 size={14} className="spinner"/> Analysing with AI…</> : <><Play size={14}/> Analyse Log</>}
            </button>
          </div>

          {/* Results */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {!result && !loading && (
              <div className="at-card" style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                <Brain size={28} style={{ margin:'0 auto 12px', color:'rgba(143,175,192,0.3)' }}/>
                <div>Paste a log and click Analyse.</div>
                <div style={{ fontSize:'0.78rem', marginTop:6 }}>AI detects the format, extracts IOCs, maps MITRE techniques, and scores the threat level.</div>
              </div>
            )}

            {result && (
              <>
                {/* Verdict */}
                <div className="at-card" style={{ padding:16, borderLeft:`2px solid ${VERDICT_COLOR[result.verdict]||'#888888'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:'1.1rem', fontWeight:700, color:VERDICT_COLOR[result.verdict]||'#787878' }}>{result.verdict}</span>
                        <span className="ai-badge">AI</span>
                        <span style={{ fontSize:'0.72rem', color:VERDICT_COLOR[result.verdict]||'#787878', fontFamily:'JetBrains Mono', background:`${VERDICT_COLOR[result.verdict]||'#787878'}18`, padding:'1px 8px', borderRadius:4 }}>{result.threat_score}/100</span>
                      </div>
                      <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontFamily:'JetBrains Mono' }}>
                        {result.log_type} · {result.total_entries} lines · {result.suspicious_entries} suspicious
                        {result.attack_type && ` · ${result.attack_type.replace(/_/g,' ')}`}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize:'0.82rem', color:'#909090', lineHeight:1.65 }}>{result.summary}</p>
                </div>

                {/* Key Findings */}
                {result.key_findings?.length > 0 && (
                  <div className="at-card" style={{ padding:14 }}>
                    <div className="section-label">Key Findings</div>
                    {result.key_findings.map((f,i) => (
                      <div key={i} style={{ fontSize:'0.8rem', padding:'4px 0', display:'flex', gap:8, borderBottom:'1px solid rgba(26,22,18,0.05)' }}>
                        <span style={{ color:'#4A7EC8', flexShrink:0 }}>→</span><span style={{ color:'var(--text-primary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suspicious entries */}
                {result.suspicious_entries?.length > 0 && (
                  <div className="at-card" style={{ padding:14 }}>
                    <div className="section-label">Suspicious Log Lines</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto' }}>
                      {result.suspicious_entries.map((e,i) => (
                        <div key={i} style={{ background:var(--surface), borderRadius:5, padding:'7px 10px', borderLeft:`2px solid ${SEVERITY_COLOR[e.severity]||'#888888'}` }}>
                          <code style={{ fontSize:'0.7rem', color:'#909090', fontFamily:'JetBrains Mono', display:'block', marginBottom:3 }}>{e.line?.slice(0,100)}</code>
                          <div style={{ fontSize:'0.68rem', color:SEVERITY_COLOR[e.severity]||'#787878' }}>{e.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* IOCs */}
                {result.iocs?.length > 0 && (
                  <div className="at-card" style={{ padding:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <div className="section-label" style={{ margin:0 }}>IOCs Extracted ({result.iocs.length})</div>
                      <button onClick={() => { navigator.clipboard.writeText(result.iocs.map(i=>i.ioc).join('\n')); addToast('Copied!','success'); }} className="btn-ghost" style={{ padding:'3px 8px', fontSize:'0.7rem' }}><Copy size={11}/> Copy All</button>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {result.iocs.slice(0,20).map((ioc,i) => (
                        <span key={i} className="ioc-pill" style={{ cursor:'pointer' }} title={ioc.type} onClick={() => { navigator.clipboard.writeText(ioc.ioc); addToast('Copied!','success'); }}>{ioc.ioc}</span>
                      ))}
                      {result.iocs.length > 20 && <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', padding:'2px 6px' }}>+{result.iocs.length-20} more</span>}
                    </div>
                  </div>
                )}

                {/* MITRE */}
                {result.mitre_techniques?.length > 0 && (
                  <div className="at-card" style={{ padding:14 }}>
                    <div className="section-label">MITRE ATT&CK</div>
                    {result.mitre_techniques.map((m,i) => (
                      <div key={i} style={{ display:'flex', gap:10, padding:'5px 0', borderBottom:'1px solid rgba(26,22,18,0.05)' }}>
                        <span style={{ fontSize:'0.72rem', color:'#8BB8E8', fontFamily:'JetBrains Mono', minWidth:80 }}>{m.id}</span>
                        <span style={{ fontSize:'0.78rem' }}>{m.name}</span>
                        <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginLeft:'auto' }}>{m.tactic}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="at-card" style={{ padding:14 }}>
                  <div className="section-label">Actions</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button className="btn-accent" onClick={createCase} style={{ fontSize:'0.78rem' }}><Plus size={12}/> Create Case</button>
                    <select className="at-select" value={pushCaseId} onChange={e => setPushCaseId(e.target.value)} style={{ fontSize:'0.78rem', flex:'1 1 150px' }}>
                      <option value="">Push to existing case…</option>
                      {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} — {c.title.slice(0,30)}</option>)}
                    </select>
                    {pushCaseId && <button className="btn-ghost" onClick={pushToCase} style={{ fontSize:'0.78rem' }}>Push</button>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {history.length === 0 ? (
            <div className="at-card" style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No log analyses yet.</div>
          ) : history.map(h => (
            <div key={h.id} className="at-card" style={{ padding:'12px 16px', cursor:'pointer', transition:'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(74,126,200,0.25)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(26,22,18,0.08)'}
              onClick={() => { api.get(`/api/ingest/analyses`); setTab('analyse'); }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, fontSize:'0.84rem' }}>{h.source_label}</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontFamily:'JetBrains Mono', marginTop:2 }}>{h.log_type} · {h.total_entries} lines</div>
                  {h.ai_summary && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.ai_summary}</div>}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:VERDICT_COLOR[h.ai_verdict]||'#787878' }}>{h.ai_verdict}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontFamily:'JetBrains Mono', marginTop:2 }}>{h.threat_score}/100</div>
                  <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', marginTop:2 }}>{new Date(h.created_at).toLocaleDateString()}</div>
                </div>
                {h.case_id && <span style={{ fontSize:'0.65rem', background:'rgba(74,126,200,0.1)', border:'1px solid rgba(74,126,200,0.25)', color:'#4A7EC8', padding:'2px 6px', borderRadius:3, fontFamily:'JetBrains Mono' }}>CASE</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
