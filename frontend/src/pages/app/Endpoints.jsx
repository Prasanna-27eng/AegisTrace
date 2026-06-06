import React, { useEffect, useState } from 'react';
import { Monitor, RefreshCw, Loader2, AlertTriangle, CheckCircle, Clock, Shield, FileText, ChevronRight, Copy, X, Download, Terminal, Settings, Database, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

const OS_ICON = { windows: '🪟', linux: '🐧', mac: '🍎', unknown: '💻' };
const SCORE_COLOR = (s) => s >= 80 ? '#EF4444' : s >= 60 ? '#5A8A9F' : s >= 40 ? '#EAB308' : s >= 20 ? '#8FAFC0' : '#22C55E';
const VERDICT_COLOR = { Malicious:'#EF4444', Suspicious:'#EAB308', Clean:'#22C55E', Unknown:'#787878' };

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
      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(90,138,159,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}
      onClick={() => navigate(`/app/endpoints/${epId}/batch/${batch.id}`)}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{batch.log_file}</div>
          <div style={{ fontSize:'0.68rem', color:'#787878', marginTop:2, fontFamily:'JetBrains Mono' }}>{batch.log_type} · {batch.line_count} lines</div>
        </div>
        <div style={{ flexShrink:0, textAlign:'right' }}>
          <div style={{ fontSize:'0.72rem', fontWeight:700, color:VERDICT_COLOR[batch.ai_verdict]||'#787878' }}>{batch.ai_verdict}</div>
          <div style={{ fontSize:'0.65rem', color:'#787878', marginTop:2 }}>{new Date(batch.created_at).toLocaleTimeString()}</div>
        </div>
        <ScoreBar score={batch.threat_score} />
        {batch.case_id && <span style={{ fontSize:'0.65rem', background:'rgba(90,138,159,0.1)', border:'1px solid rgba(90,138,159,0.25)', color:'#5A8A9F', padding:'1px 6px', borderRadius:3, fontFamily:'JetBrains Mono', flexShrink:0 }}>CASE</span>}
      </div>
      {batch.ai_summary && <div style={{ fontSize:'0.72rem', color:'#787878', marginTop:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{batch.ai_summary}</div>}
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
      {label && <div style={{ fontSize:'0.65rem', color:'#787878', marginBottom:4, fontFamily:'JetBrains Mono', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>}
      <pre style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'12px 40px 12px 14px', margin:0, fontFamily:'JetBrains Mono', fontSize:'0.76rem', color:'#A8A8A8', overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{code}</pre>
      <button onClick={handleCopy} style={{ position:'absolute', top:8, right:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:4, padding:'3px 6px', cursor:'pointer', color: copied ? '#22C55E' : '#787878', fontSize:'0.65rem', display:'flex', alignItems:'center', gap:4 }}>
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
        {open ? <ChevronUp size={14} style={{ color:'#787878' }}/> : <ChevronDown size={14} style={{ color:'#787878' }}/>}
      </button>
      {open && <div style={{ padding:'14px 16px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>{children}</div>}
    </div>
  );
}

function SetupGuideModal({ onClose, ingestKey, onFetchKey }) {
  const [activeTab, setActiveTab] = useState('deploy');
  const [os, setOs]               = useState('linux');
  const tabs = [
    { id:'deploy',  label:'🚀 One-Click Deploy' },
    { id:'service', label:'Background Service' },
    { id:'collects',label:'What It Collects' },
    { id:'config',  label:'Config Options' },
  ];

  const agentUrl = `${AEGISTRACE_URL}/agent/aegistrace_agent.py`;
  const token    = ingestKey || 'YOUR_TOKEN_HERE';

  const oneLiner = {
    linux: `pip3 install psutil -q --break-system-packages 2>/dev/null || pip3 install psutil -q; python3 -c "import urllib.request; open('/tmp/at_agent.py','wb').write(urllib.request.urlopen('${agentUrl}').read())" && AEGISTRACE_TOKEN=${token} AEGISTRACE_AGENT_ID=$(hostname) AEGISTRACE_SERVER=${AEGISTRACE_URL} nohup python3 /tmp/at_agent.py > ~/aegistrace.log 2>&1 & echo "✓ AegisTrace Agent started (PID: $!)"`,
    mac:   `pip3 install psutil -q 2>/dev/null; python3 -c "import urllib.request; open('/tmp/at_agent.py','wb').write(urllib.request.urlopen('${agentUrl}').read())" && AEGISTRACE_TOKEN=${token} AEGISTRACE_AGENT_ID=$(hostname) AEGISTRACE_SERVER=${AEGISTRACE_URL} nohup python3 /tmp/at_agent.py > ~/aegistrace.log 2>&1 & echo "✓ AegisTrace Agent started (PID: $!)"`,
    windows: `pip install psutil -q; python -c "import urllib.request; open('C:/Windows/Temp/at_agent.py','wb').write(urllib.request.urlopen('${agentUrl}').read())"; $env:AEGISTRACE_TOKEN='${token}'; $env:AEGISTRACE_AGENT_ID=$env:COMPUTERNAME; $env:AEGISTRACE_SERVER='${AEGISTRACE_URL}'; Start-Process python -ArgumentList 'C:\\Windows\\Temp\\at_agent.py' -NoNewWindow`,
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', padding:20 }}
      onClick={e => { if(e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#111111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, width:'100%', maxWidth:700, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 25px 60px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <div style={{ width:36, height:36, background:'rgba(90,138,159,0.15)', border:'1px solid rgba(90,138,159,0.3)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Terminal size={18} style={{ color:'#5A8A9F' }}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'1rem' }}>Deploy Endpoint Agent</div>
            <div style={{ fontSize:'0.72rem', color:'#787878', marginTop:1 }}>One command — installs, configures, and starts the agent</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#787878' }}><X size={14}/></button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 20px', flexShrink:0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:'10px 14px', background:'none', border:'none', borderBottom: activeTab===t.id ? '2px solid #5A8A9F' : '2px solid transparent', color: activeTab===t.id ? '#fff' : '#787878', cursor:'pointer', fontSize:'0.8rem', fontWeight: activeTab===t.id ? 600 : 400, marginBottom:-1, transition:'color 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>

          {/* ── QUICK START ── */}
          {activeTab === 'deploy' && (
            <div>
              {/* Step 1 — fetch key if missing */}
              {!ingestKey && (
                <div style={{ marginBottom:20, padding:'14px 16px', background:'rgba(234,179,8,0.06)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:8, display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:'0.82rem', color:'#EAB308' }}>⚠ Fetch your token first to auto-fill the command</span>
                  <button onClick={onFetchKey} className="btn-ghost" style={{ fontSize:'0.75rem', marginLeft:'auto', flexShrink:0 }}>
                    <Shield size={12}/> Fetch Token
                  </button>
                </div>
              )}

              {ingestKey && (
                <div style={{ marginBottom:16, padding:'10px 14px', background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.18)', borderRadius:8, fontSize:'0.78rem', color:'#22C55E', display:'flex', alignItems:'center', gap:8 }}>
                  <CheckCircle size={13}/> Token loaded — command below is ready to copy &amp; run
                </div>
              )}

              {/* OS selector */}
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                {[['linux','🐧 Linux'],['mac','🍎 macOS'],['windows','🪟 Windows']].map(([id,label]) => (
                  <button key={id} onClick={() => setOs(id)}
                    style={{ padding:'7px 14px', borderRadius:7, border:'1px solid', fontSize:'0.76rem', cursor:'pointer', fontFamily:'JetBrains Mono,monospace',
                      background: os===id ? 'rgba(90,138,159,0.12)' : 'transparent',
                      color: os===id ? '#5A8A9F' : '#787878',
                      borderColor: os===id ? 'rgba(90,138,159,0.35)' : 'rgba(255,255,255,0.08)',
                    }}>{label}</button>
                ))}
              </div>

              {/* The one-liner */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:'0.68rem', color:'#787878', marginBottom:6, fontFamily:'JetBrains Mono,monospace', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Paste this in your {os === 'windows' ? 'PowerShell (Admin)' : 'terminal'} — does everything automatically
                </div>
                <CodeBlock code={oneLiner[os]} label={null} />
              </div>

              {/* What it does */}
              <div style={{ padding:'12px 16px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, fontSize:'0.76rem', color:'#787878', lineHeight:1.8 }}>
                <div style={{ fontWeight:600, color:'#A8A8A8', marginBottom:6 }}>This command:</div>
                {os === 'windows' ? (
                  <div>① Installs psutil &nbsp;② Downloads agent to Temp &nbsp;③ Sets env vars &nbsp;④ Starts agent in background</div>
                ) : (
                  <div>① Installs psutil &nbsp;② Downloads agent to /tmp &nbsp;③ Runs with your token pre-filled &nbsp;④ Detaches so closing terminal is safe &nbsp;⑤ Prints the PID</div>
                )}
              </div>

              <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(34,197,94,0.04)', border:'1px solid rgba(34,197,94,0.12)', borderRadius:7, fontSize:'0.76rem', color:'#787878' }}>
                <CheckCircle size={12} style={{ color:'#22C55E', display:'inline', marginRight:6, verticalAlign:'middle' }}/>
                Endpoint appears in this page within 60 seconds. Requires Python 3.8+.
              </div>
            </div>
          )}

          {/* ── BACKGROUND SERVICE ── */}
          {activeTab === 'service' && (
            <div>
              <div style={{ fontSize:'0.82rem', color:'#787878', marginBottom:16 }}>Install the agent as a persistent background service so it runs automatically.</div>

              <Collapsible title="Linux — systemd" icon={<span style={{fontSize:16}}>🐧</span>} defaultOpen>
                <div style={{ fontSize:'0.8rem', color:'#787878', marginBottom:8 }}>One command installs and starts the systemd service:</div>
                <CodeBlock code="sudo python3 aegistrace_agent.py --install-service" />
                <div style={{ fontSize:'0.78rem', color:'#787878', marginTop:10, marginBottom:4 }}>Check status:</div>
                <CodeBlock code="systemctl status aegistrace-agent" />
              </Collapsible>

              <Collapsible title="Mac — LaunchAgent (auto-starts on login)" icon={<span style={{fontSize:16}}>🍎</span>}>
                <CodeBlock code="python3 aegistrace_agent.py --install-launchd" />
                <div style={{ fontSize:'0.75rem', color:'#787878', marginTop:8 }}>The agent will start automatically each time you log in.</div>
              </Collapsible>

              <Collapsible title="Windows — Task Scheduler" icon={<span style={{fontSize:16}}>🪟</span>}>
                <ol style={{ paddingLeft:18, margin:0, fontSize:'0.8rem', color:'#787878', lineHeight:1.9 }}>
                  <li>Open <strong style={{color:'#A8A8A8'}}>Task Scheduler</strong> → Create Basic Task</li>
                  <li>Name: <code style={{color:'#8FAFC0', fontFamily:'JetBrains Mono', fontSize:'0.76rem'}}>AegisTrace Agent</code></li>
                  <li>Trigger: <strong style={{color:'#A8A8A8'}}>At startup</strong> + repeat every <strong style={{color:'#A8A8A8'}}>5 minutes</strong></li>
                  <li>Action: <code style={{color:'#8FAFC0', fontFamily:'JetBrains Mono', fontSize:'0.76rem'}}>python.exe "C:\path\to\aegistrace_agent.py"</code></li>
                  <li>Run whether user is logged on or not: ✓</li>
                  <li>Run with highest privileges: ✓</li>
                </ol>
              </Collapsible>
            </div>
          )}

          {/* ── WHAT IT COLLECTS ── */}
          {activeTab === 'collects' && (
            <div>
              <div style={{ fontSize:'0.82rem', color:'#787878', marginBottom:16 }}>The agent auto-detects your OS and collects the relevant sources.</div>

              <Collapsible title="Linux / Mac" icon={<span>🐧🍎</span>} defaultOpen>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ textAlign:'left', padding:'6px 8px', color:'#787878', fontWeight:500 }}>Source</th>
                      <th style={{ textAlign:'left', padding:'6px 8px', color:'#787878', fontWeight:500 }}>Type</th>
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
                        <td style={{ padding:'7px 8px', fontFamily:'JetBrains Mono', fontSize:'0.72rem', color:'#8FAFC0' }}>{src}</td>
                        <td style={{ padding:'7px 8px', color:'#787878' }}>{type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Collapsible>

              <Collapsible title="Windows" icon={<span style={{fontSize:16}}>🪟</span>}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ textAlign:'left', padding:'6px 8px', color:'#787878', fontWeight:500 }}>Source</th>
                      <th style={{ textAlign:'left', padding:'6px 8px', color:'#787878', fontWeight:500 }}>Type</th>
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
                        <td style={{ padding:'7px 8px', fontFamily:'JetBrains Mono', fontSize:'0.72rem', color:'#8FAFC0' }}>{src}</td>
                        <td style={{ padding:'7px 8px', color:'#787878' }}>{type}</td>
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
              <div style={{ fontSize:'0.82rem', color:'#787878', marginBottom:14 }}>Open <code style={{color:'#8FAFC0', fontFamily:'JetBrains Mono', fontSize:'0.78rem'}}>aegistrace_agent.py</code> and adjust these variables near the top:</div>
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
                  <div style={{ fontSize:'0.77rem', color:'#787878', lineHeight:1.6 }}>{a}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:'0.72rem', color:'#787878' }}>Agent ships via HTTPS · Key sent as <code style={{fontFamily:'JetBrains Mono', fontSize:'0.7rem'}}>X-AegisTrace-Key</code> header</div>
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
          <div style={{ fontSize:'0.72rem', color:'#787878', marginTop:2 }}>
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
        <div className="at-card" style={{ padding:14, marginBottom:16, borderColor:'rgba(90,138,159,0.2)' }}>
          <div className="section-label">Ingest API Key — paste into agent config</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ flex:1, fontFamily:'JetBrains Mono', fontSize:'0.78rem', color:'#8FAFC0', background:'rgba(255,255,255,0.04)', padding:'8px 12px', borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ingestKey}</code>
            <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(ingestKey); addToast('Key copied!','success'); }} style={{ padding:'6px 10px', flexShrink:0 }}><Copy size={13}/></button>
          </div>
          <div style={{ fontSize:'0.68rem', color:'#787878', marginTop:8, fontFamily:'JetBrains Mono' }}>
            Set as INGEST_KEY in aegistrace_agent.py · Agent ships to POST /api/ingest/logs
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#787878' }}><Loader2 size={20} className="spinner" style={{ margin:'0 auto 8px' }}/><div>Loading endpoints…</div></div>
      ) : endpoints.length === 0 ? (
        <div className="at-card" style={{ padding:40, textAlign:'center' }}>
          <Monitor size={32} style={{ color:'rgba(90,138,159,0.3)', margin:'0 auto 12px' }}/>
          <div style={{ fontWeight:600, marginBottom:8 }}>No endpoints connected yet</div>
          <div style={{ fontSize:'0.82rem', color:'#787878', marginBottom:16 }}>Install the agent on any machine to start collecting logs.</div>
          <button onClick={() => setShowGuide(true)} className="btn-ghost" style={{ fontSize:'0.8rem' }}><FileText size={13}/> Setup Guide</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap:16 }}>
          {/* Endpoint list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {endpoints.map(ep => (
              <div key={ep.id} className="at-card" style={{ padding:'14px 16px', cursor:'pointer', transition:'border-color 0.15s', borderColor: selected?.id === ep.id ? 'rgba(90,138,159,0.4)' : 'rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { if(selected?.id!==ep.id) e.currentTarget.style.borderColor='rgba(90,138,159,0.2)'; }}
                onMouseLeave={e => { if(selected?.id!==ep.id) e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
                onClick={() => loadBatches(ep)}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:18 }}>{OS_ICON[ep.os_type]||OS_ICON.unknown}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'0.86rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ep.hostname}</div>
                    <div style={{ fontSize:'0.68rem', color:'#787878', fontFamily:'JetBrains Mono', marginTop:1 }}>{ep.ip_address || 'IP unknown'}</div>
                  </div>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:isOnline(ep)?'#22C55E':'#888888', flexShrink:0 }} title={isOnline(ep)?'Online':'Offline'}/>
                </div>
                <div style={{ marginBottom:6 }}>
                  <ScoreBar score={Math.round(ep.threat_score_avg)} />
                </div>
                <div style={{ display:'flex', gap:8, fontSize:'0.68rem', color:'#787878', flexWrap:'wrap' }}>
                  <span>{ep.total_batches} batch{ep.total_batches!==1?'es':''}</span>
                  {ep.last_verdict && <span style={{ color:VERDICT_COLOR[ep.last_verdict]||'#787878' }}>{ep.last_verdict}</span>}
                  <span style={{ marginLeft:'auto' }}>{new Date(ep.last_seen).toLocaleString()}</span>
                </div>
                {ep.tags?.length > 0 && (
                  <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                    {ep.tags.map(t => <span key={t} style={{ fontSize:'0.62rem', background:'rgba(143,175,192,0.08)', border:'1px solid rgba(143,175,192,0.2)', color:'#8FAFC0', padding:'1px 6px', borderRadius:3, fontFamily:'JetBrains Mono' }}>{t}</span>)}
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
                  <div style={{ fontSize:'0.68rem', color:'#787878', fontFamily:'JetBrains Mono' }}>Avg threat score: {Math.round(selected.threat_score_avg)}/100</div>
                </div>
                <button className="btn-ghost" onClick={() => setSelected(null)} style={{ fontSize:'0.75rem' }}>Close</button>
              </div>
              {loadingBatches ? (
                <div style={{ textAlign:'center', padding:40, color:'#787878' }}><Loader2 size={16} className="spinner" style={{ margin:'0 auto 8px' }}/></div>
              ) : batches.length === 0 ? (
                <div className="at-card" style={{ padding:30, textAlign:'center', color:'#787878' }}>No batches received yet.</div>
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
