import React, { useEffect, useState } from 'react';
import { Monitor, RefreshCw, Loader2, AlertTriangle, CheckCircle, Clock, Shield, FileText, ChevronRight, Copy, X, Download, Terminal, Settings, Database, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

const OS_ICON = { windows: '🪟', linux: '🐧', mac: '🍎', unknown: '💻' };
const SCORE_COLOR = (s) => s >= 80 ? '#EF4444' : s >= 60 ? '#6366F1' : s >= 40 ? '#EAB308' : s >= 20 ? '#A78BFA' : '#22C55E';
const VERDICT_COLOR = { Malicious:'#EF4444', Suspicious:'#EAB308', Clean:'#22C55E', Unknown:'#71717A' };

const AEGISTRACE_URL = 'https://aegistrace-7qvn.onrender.com';

function ScoreBar({ score }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${score}%`, background:SCORE_COLOR(score), borderRadius:2, transition:'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize:'0.72rem', fontWeight:700, color:SCORE_COLOR(score), fontFamily:'JetBrains Mono', minWidth:28 }}>{score}</span>
    </div>
  );
}

function BatchRow({ batch, epId, navigate }) {
  return (
    <div className="at-card" style={{ padding:'10px 14px', cursor:'pointer', transition:'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(99,102,241,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}
      onClick={() => navigate(`/app/endpoints/${epId}/batch/${batch.id}`)}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{batch.log_file}</div>
          <div style={{ fontSize:'0.68rem', color:'#71717A', marginTop:2, fontFamily:'JetBrains Mono' }}>{batch.log_type} · {batch.line_count} lines</div>
        </div>
        <div style={{ flexShrink:0, textAlign:'right' }}>
          <div style={{ fontSize:'0.72rem', fontWeight:700, color:VERDICT_COLOR[batch.ai_verdict]||'#71717A' }}>{batch.ai_verdict}</div>
          <div style={{ fontSize:'0.65rem', color:'#71717A', marginTop:2 }}>{new Date(batch.created_at).toLocaleTimeString()}</div>
        </div>
        <ScoreBar score={batch.threat_score} />
        {batch.case_id && <span style={{ fontSize:'0.65rem', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', color:'#6366F1', padding:'1px 6px', borderRadius:3, fontFamily:'JetBrains Mono', flexShrink:0 }}>CASE</span>}
      </div>
      {batch.ai_summary && <div style={{ fontSize:'0.72rem', color:'#71717A', marginTop:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{batch.ai_summary}</div>}
    </div>
  );
}

function CodeBlock({ code, onCopy, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy && onCopy();
  };
  return (
    <div style={{ position:'relative', marginTop:8 }}>
      {label && <div style={{ fontSize:'0.65rem', color:'#71717A', marginBottom:4, fontFamily:'JetBrains Mono', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>}
      <pre style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'12px 40px 12px 14px', margin:0, fontFamily:'JetBrains Mono', fontSize:'0.76rem', color:'#e2e8f0', overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{code}</pre>
      <button onClick={handleCopy} style={{ position:'absolute', top:8, right:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:4, padding:'3px 6px', cursor:'pointer', color: copied ? '#22C55E' : '#71717A', fontSize:'0.65rem', display:'flex', alignItems:'center', gap:4 }}>
        {copied ? <CheckCircle size={11}/> : <Copy size={11}/>}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Collapsible({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, overflow:'hidden', marginBottom:10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width:'100%', background:'rgba(255,255,255,0.03)', border:'none', padding:'12px 16px', display:'flex', alignItems:'center', gap:8, cursor:'pointer', color:'inherit', textAlign:'left' }}>
        {icon}
        <span style={{ flex:1, fontWeight:600, fontSize:'0.86rem' }}>{title}</span>
        {open ? <ChevronUp size={14} style={{ color:'#71717A' }}/> : <ChevronDown size={14} style={{ color:'#71717A' }}/>}
      </button>
      {open && <div style={{ padding:'14px 16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>{children}</div>}
    </div>
  );
}

function SetupGuideModal({ onClose, ingestKey, onFetchKey }) {
  const [activeTab, setActiveTab] = useState('quick');
  const tabs = [
    { id:'quick', label:'Quick Start' },
    { id:'service', label:'Background Service' },
    { id:'collects', label:'What It Collects' },
    { id:'config', label:'Config Options' },
  ];

  const agentUrl = `https://raw.githubusercontent.com/Prasanna-27eng/AegisTrace/main/agent/aegistrace_agent.py`;

  const configSnippet = `AEGISTRACE_URL = "${AEGISTRACE_URL}"
INGEST_KEY     = "${ingestKey || 'paste-your-key-here'}"`;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', padding:20 }}
      onClick={e => { if(e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#0f1117', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, width:'100%', maxWidth:680, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 25px 60px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <div style={{ width:36, height:36, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Terminal size={18} style={{ color:'#6366F1' }}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'1rem' }}>Endpoint Agent Setup Guide</div>
            <div style={{ fontSize:'0.72rem', color:'#71717A', marginTop:1 }}>Install the agent on any machine to ship logs to AegisTrace</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#71717A' }}><X size={14}/></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 20px', flexShrink:0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:'10px 14px', background:'none', border:'none', borderBottom: activeTab===t.id ? '2px solid #C0392B' : '2px solid transparent', color: activeTab===t.id ? '#fff' : '#71717A', cursor:'pointer', fontSize:'0.8rem', fontWeight: activeTab===t.id ? 600 : 400, marginBottom:-1, transition:'color 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>

          {/* ── QUICK START ── */}
          {activeTab === 'quick' && (
            <div>
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:'#6366F1', flexShrink:0 }}>1</div>
                  <div style={{ fontWeight:600 }}>Get your Ingest Key</div>
                </div>
                {ingestKey ? (
                  <CodeBlock code={ingestKey} label="Your ingest key" />
                ) : (
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ fontSize:'0.8rem', color:'#71717A' }}>Go to <strong style={{color:'#e2e8f0'}}>Admin → System</strong> tab, or click:</div>
                    <button onClick={onFetchKey} className="btn-ghost" style={{ fontSize:'0.75rem' }}><Shield size={12}/> Fetch Key</button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:'#6366F1', flexShrink:0 }}>2</div>
                  <div style={{ fontWeight:600 }}>Download &amp; configure the agent</div>
                </div>
                <div style={{ fontSize:'0.8rem', color:'#71717A', marginBottom:8 }}>Download <code style={{color:'#A78BFA', fontFamily:'JetBrains Mono', fontSize:'0.78rem'}}>aegistrace_agent.py</code> then open it and set these two lines:</div>
                <CodeBlock code={configSnippet} label="aegistrace_agent.py — edit these lines" />
                <div style={{ marginTop:10 }}>
                  <a href={agentUrl} target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration:'none', fontSize:'0.75rem', display:'inline-flex', alignItems:'center', gap:6 }}>
                    <Download size={12}/> Download aegistrace_agent.py
                  </a>
                </div>
              </div>

              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:'#6366F1', flexShrink:0 }}>3</div>
                  <div style={{ fontWeight:600 }}>Run it</div>
                </div>
                <CodeBlock code="python3 aegistrace_agent.py" label="Terminal" />
                <div style={{ fontSize:'0.78rem', color:'#71717A', marginTop:10, padding:'10px 12px', background:'rgba(34,197,94,0.05)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:6 }}>
                  <CheckCircle size={12} style={{ color:'#22C55E', display:'inline', marginRight:6, verticalAlign:'middle' }}/>
                  Logs appear in this <strong style={{color:'#e2e8f0'}}>Endpoints</strong> page within 5 minutes.
                </div>
              </div>

              <div style={{ padding:'12px 14px', background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:6, fontSize:'0.78rem', color:'#A78BFA' }}>
                <strong>Note:</strong> Requires Python 3.7+ with no extra packages. Ships only new log lines on each run — no duplicates.
              </div>
            </div>
          )}

          {/* ── BACKGROUND SERVICE ── */}
          {activeTab === 'service' && (
            <div>
              <div style={{ fontSize:'0.82rem', color:'#71717A', marginBottom:16 }}>Install the agent as a persistent background service so it runs automatically.</div>

              <Collapsible title="Linux — systemd" icon={<span style={{fontSize:16}}>🐧</span>} defaultOpen>
                <div style={{ fontSize:'0.8rem', color:'#71717A', marginBottom:8 }}>One command installs and starts the systemd service:</div>
                <CodeBlock code="sudo python3 aegistrace_agent.py --install-service" />
                <div style={{ fontSize:'0.78rem', color:'#71717A', marginTop:10, marginBottom:4 }}>Check status:</div>
                <CodeBlock code="systemctl status aegistrace-agent" />
              </Collapsible>

              <Collapsible title="Mac — LaunchAgent (auto-starts on login)" icon={<span style={{fontSize:16}}>🍎</span>}>
                <CodeBlock code="python3 aegistrace_agent.py --install-launchd" />
                <div style={{ fontSize:'0.75rem', color:'#71717A', marginTop:8 }}>The agent will start automatically each time you log in.</div>
              </Collapsible>

              <Collapsible title="Windows — Task Scheduler" icon={<span style={{fontSize:16}}>🪟</span>}>
                <ol style={{ paddingLeft:18, margin:0, fontSize:'0.8rem', color:'#a1a1aa', lineHeight:1.9 }}>
                  <li>Open <strong style={{color:'#e2e8f0'}}>Task Scheduler</strong> → Create Basic Task</li>
                  <li>Name: <code style={{color:'#A78BFA', fontFamily:'JetBrains Mono', fontSize:'0.76rem'}}>AegisTrace Agent</code></li>
                  <li>Trigger: <strong style={{color:'#e2e8f0'}}>At startup</strong> + repeat every <strong style={{color:'#e2e8f0'}}>5 minutes</strong></li>
                  <li>Action: <code style={{color:'#A78BFA', fontFamily:'JetBrains Mono', fontSize:'0.76rem'}}>python.exe "C:\path\to\aegistrace_agent.py"</code></li>
                  <li>Run whether user is logged on or not: ✓</li>
                  <li>Run with highest privileges: ✓</li>
                </ol>
              </Collapsible>
            </div>
          )}

          {/* ── WHAT IT COLLECTS ── */}
          {activeTab === 'collects' && (
            <div>
              <div style={{ fontSize:'0.82rem', color:'#71717A', marginBottom:16 }}>The agent auto-detects your OS and collects the relevant sources.</div>

              <Collapsible title="Linux / Mac" icon={<span>🐧🍎</span>} defaultOpen>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ textAlign:'left', padding:'6px 8px', color:'#71717A', fontWeight:500 }}>Source</th>
                      <th style={{ textAlign:'left', padding:'6px 8px', color:'#71717A', fontWeight:500 }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['/var/log/auth.log', 'SSH logins, sudo, su'],
                      ['/var/log/syslog', 'System events'],
                      ['journalctl', 'Systemd service events'],
                      ['/var/log/nginx/access.log', 'Web access'],
                      ['/var/log/apache2/access.log', 'Web access'],
                      ['ps aux', 'Running processes snapshot'],
                      ['ss -tunp', 'Active network connections'],
                    ].map(([src, type]) => (
                      <tr key={src} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding:'7px 8px', fontFamily:'JetBrains Mono', fontSize:'0.72rem', color:'#A78BFA' }}>{src}</td>
                        <td style={{ padding:'7px 8px', color:'#a1a1aa' }}>{type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Collapsible>

              <Collapsible title="Windows" icon={<span style={{fontSize:16}}>🪟</span>}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ textAlign:'left', padding:'6px 8px', color:'#71717A', fontWeight:500 }}>Source</th>
                      <th style={{ textAlign:'left', padding:'6px 8px', color:'#71717A', fontWeight:500 }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Windows Security Events', '4624 login · 4625 failed · 4720 new user · 4726 deleted · 4698 task'],
                      ['Windows System Events', '7045 new service · 7040 service changed'],
                      ['PowerShell History', 'All commands typed in PS'],
                      ['Process list', 'Get-Process snapshot'],
                      ['Network connections', 'Get-NetTCPConnection'],
                    ].map(([src, type]) => (
                      <tr key={src} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding:'7px 8px', fontFamily:'JetBrains Mono', fontSize:'0.72rem', color:'#A78BFA' }}>{src}</td>
                        <td style={{ padding:'7px 8px', color:'#a1a1aa' }}>{type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Collapsible>
            </div>
          )}

          {/* ── CONFIG OPTIONS ── */}
          {activeTab === 'config' && (
            <div>
              <div style={{ fontSize:'0.82rem', color:'#71717A', marginBottom:14 }}>Open <code style={{color:'#A78BFA', fontFamily:'JetBrains Mono', fontSize:'0.78rem'}}>aegistrace_agent.py</code> and adjust these variables near the top:</div>
              <CodeBlock code={`INTERVAL_SECONDS = 300     # How often to ship (default: 5 min)
MAX_LINES        = 500     # Lines per log file per run
AUTO_ANALYSE     = True    # AI analysis on arrival
AUTO_CASE        = True    # Create case if threat score > threshold
THREAT_THRESHOLD = 60      # Score 0–100 (default: 60)
TAGS             = ["prod", "finance"]  # Optional labels`} label="Configuration variables" />

              <div style={{ marginTop:20, marginBottom:10, fontWeight:600, fontSize:'0.86rem' }}>Troubleshooting</div>
              {[
                ['Agent runs but no data appears', 'Check the ingest key matches Admin → System. Verify the URL includes https://. Check aegistrace_agent.log for errors.'],
                ['Permission denied on log files', 'Linux: run as root or add your user to the adm group (sudo usermod -aG adm $USER). Windows: run as Administrator in Task Scheduler.'],
                ['AI analysis not running', 'Check GROQ_API_KEY is set in your Render dashboard. Verify /api/health returns {"groq": true}.'],
              ].map(([q, a]) => (
                <div key={q} style={{ marginBottom:10, padding:'12px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6 }}>
                  <div style={{ fontWeight:600, fontSize:'0.8rem', marginBottom:4 }}>⚠ {q}</div>
                  <div style={{ fontSize:'0.77rem', color:'#71717A', lineHeight:1.6 }}>{a}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:'0.72rem', color:'#71717A' }}>Agent ships via HTTPS · Key sent as <code style={{fontFamily:'JetBrains Mono', fontSize:'0.7rem'}}>X-AegisTrace-Key</code> header</div>
          <button onClick={onClose} className="btn-ghost" style={{ fontSize:'0.78rem' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function Endpoints() {
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [ingestKey, setIngestKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const loadEndpoints = () => {
    setLoading(true);
    api.get('/api/ingest/endpoints').then(r => { setEndpoints(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadEndpoints(); }, []);

  const loadBatches = (ep) => {
    setSelected(ep);
    setLoadingBatches(true);
    api.get(`/api/ingest/endpoints/${ep.id}/batches`).then(r => { setBatches(r.data); setLoadingBatches(false); }).catch(() => setLoadingBatches(false));
  };

  const fetchKey = () => {
    api.get('/api/ingest/key').then(r => { setIngestKey(r.data.ingest_key); setShowKey(true); }).catch(() => addToast('Could not fetch key','error'));
  };

  const isOnline = (ep) => {
    const diff = (Date.now() - new Date(ep.last_seen).getTime()) / 1000;
    return diff < 600;
  };

  const online  = endpoints.filter(isOnline).length;
  const offline = endpoints.length - online;

  return (
    <div style={{ padding:'24px 28px' }}>
      {showGuide && (
        <SetupGuideModal
          onClose={() => setShowGuide(false)}
          ingestKey={ingestKey}
          onFetchKey={() => { fetchKey(); }}
        />
      )}

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:'1.3rem', fontWeight:600 }}>Endpoints</h1>
          <div style={{ fontSize:'0.72rem', color:'#71717A', marginTop:2 }}>
            {online} online · {offline} offline · {endpoints.length} total
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-ghost" onClick={() => setShowGuide(true)} style={{ fontSize:'0.78rem' }}><FileText size={13}/> Setup Guide</button>
          <button className="btn-ghost" onClick={fetchKey} style={{ fontSize:'0.78rem' }}><Shield size={13}/> Get Ingest Key</button>
          <button className="btn-ghost" onClick={loadEndpoints} style={{ fontSize:'0.78rem' }}><RefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Ingest key panel */}
      {showKey && ingestKey && (
        <div className="at-card" style={{ padding:14, marginBottom:16, borderColor:'rgba(99,102,241,0.2)' }}>
          <div className="section-label">Ingest API Key — paste into agent config</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ flex:1, fontFamily:'JetBrains Mono', fontSize:'0.78rem', color:'#A78BFA', background:'rgba(255,255,255,0.04)', padding:'8px 12px', borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ingestKey}</code>
            <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(ingestKey); addToast('Key copied!','success'); }} style={{ padding:'6px 10px', flexShrink:0 }}><Copy size={13}/></button>
          </div>
          <div style={{ fontSize:'0.68rem', color:'#71717A', marginTop:8, fontFamily:'JetBrains Mono' }}>
            Set as INGEST_KEY in aegistrace_agent.py · Agent ships to POST /api/ingest/logs
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#71717A' }}><Loader2 size={20} className="spinner" style={{ margin:'0 auto 8px' }}/><div>Loading endpoints…</div></div>
      ) : endpoints.length === 0 ? (
        <div className="at-card" style={{ padding:40, textAlign:'center' }}>
          <Monitor size={32} style={{ color:'rgba(99,102,241,0.3)', margin:'0 auto 12px' }}/>
          <div style={{ fontWeight:600, marginBottom:8 }}>No endpoints connected yet</div>
          <div style={{ fontSize:'0.82rem', color:'#71717A', marginBottom:16 }}>Install the agent on any machine to start collecting logs.</div>
          <button onClick={() => setShowGuide(true)} className="btn-ghost" style={{ fontSize:'0.8rem' }}><FileText size={13}/> Setup Guide</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap:16 }}>
          {/* Endpoint list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {endpoints.map(ep => (
              <div key={ep.id} className="at-card" style={{ padding:'14px 16px', cursor:'pointer', transition:'border-color 0.15s', borderColor: selected?.id === ep.id ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { if(selected?.id!==ep.id) e.currentTarget.style.borderColor='rgba(99,102,241,0.2)'; }}
                onMouseLeave={e => { if(selected?.id!==ep.id) e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
                onClick={() => loadBatches(ep)}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:18 }}>{OS_ICON[ep.os_type]||OS_ICON.unknown}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'0.86rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ep.hostname}</div>
                    <div style={{ fontSize:'0.68rem', color:'#71717A', fontFamily:'JetBrains Mono', marginTop:1 }}>{ep.ip_address || 'IP unknown'}</div>
                  </div>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:isOnline(ep)?'#22C55E':'#71717A', flexShrink:0 }} title={isOnline(ep)?'Online':'Offline'}/>
                </div>
                <div style={{ marginBottom:6 }}>
                  <ScoreBar score={Math.round(ep.threat_score_avg)} />
                </div>
                <div style={{ display:'flex', gap:8, fontSize:'0.68rem', color:'#71717A', flexWrap:'wrap' }}>
                  <span>{ep.total_batches} batch{ep.total_batches!==1?'es':''}</span>
                  {ep.last_verdict && <span style={{ color:VERDICT_COLOR[ep.last_verdict]||'#71717A' }}>{ep.last_verdict}</span>}
                  <span style={{ marginLeft:'auto' }}>{new Date(ep.last_seen).toLocaleString()}</span>
                </div>
                {ep.tags?.length > 0 && (
                  <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                    {ep.tags.map(t => <span key={t} style={{ fontSize:'0.62rem', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', color:'#A78BFA', padding:'1px 6px', borderRadius:3, fontFamily:'JetBrains Mono' }}>{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Batch detail */}
          {selected && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.92rem' }}>{selected.hostname} — Log Batches</div>
                  <div style={{ fontSize:'0.68rem', color:'#71717A', fontFamily:'JetBrains Mono' }}>Avg threat score: {Math.round(selected.threat_score_avg)}/100</div>
                </div>
                <button className="btn-ghost" onClick={() => setSelected(null)} style={{ fontSize:'0.75rem' }}>Close</button>
              </div>
              {loadingBatches ? (
                <div style={{ textAlign:'center', padding:40, color:'#71717A' }}><Loader2 size={16} className="spinner" style={{ margin:'0 auto 8px' }}/></div>
              ) : batches.length === 0 ? (
                <div className="at-card" style={{ padding:30, textAlign:'center', color:'#71717A' }}>No batches received yet.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {batches.map(b => <BatchRow key={b.id} batch={b} epId={selected.id} navigate={navigate}/>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
