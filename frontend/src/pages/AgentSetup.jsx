import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Copy, CheckCircle, Terminal, Shield, ExternalLink,
  Monitor, Apple, Server, Settings, ChevronRight, Menu, XCircle,
  AlertTriangle, Cpu, Wifi, Check, ArrowLeft
} from 'lucide-react';
import Logo from '../components/Logo';

const AEGISTRACE_URL = 'https://aegistrace-7qvn.onrender.com';
const AGENT_RAW_URL  = 'https://raw.githubusercontent.com/Prasanna-27eng/AegisTrace/main/agent/aegistrace_agent.py';

const mono = { fontFamily:"'JetBrains Mono', 'Fira Mono', monospace" };

/* ── Copy block ── */
function CopyBlock({ code, label, lang = 'shell' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{position:'relative',marginTop:10,marginBottom:16}}>
      {label&&<div style={{fontSize:10,color:'rgba(240,240,248,0.4)',marginBottom:6,...mono,textTransform:'uppercase',letterSpacing:'0.08em',display:'flex',alignItems:'center',gap:6}}>
        <div style={{width:2,height:10,background:'#4DA3FF',borderRadius:1}}/>{label}
      </div>}
      <pre style={{background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:10,padding:'16px 48px 16px 18px',margin:0,...mono,fontSize:13,color:'#e2e8f0',overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-all',lineHeight:1.7}}>{code}</pre>
      <button onClick={copy} style={{position:'absolute',top:label?44:10,right:10,background:copied?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.07)',border:`1px solid ${copied?'rgba(34,197,94,0.3)':'rgba(255,255,255,0.12)'}`,borderRadius:6,padding:'5px 10px',cursor:'pointer',color:copied?'#22C55E':'rgba(240,240,248,0.55)',fontSize:11,display:'flex',alignItems:'center',gap:4,...mono,transition:'all 0.15s'}}>
        {copied?<><Check size={10}/>Copied</>:<><Copy size={10}/>Copy</>}
      </button>
    </div>
  );
}

/* ── Step component ── */
function Step({ n, title, status = 'default', children }) {
  const statusStyle = {
    default: {bg:'rgba(77,163,255,0.12)',border:'rgba(77,163,255,0.35)',color:'#4DA3FF'},
    done:    {bg:'rgba(34,197,94,0.12)',border:'rgba(34,197,94,0.35)',color:'#22C55E'},
  }[status];
  return (
    <div style={{display:'flex',gap:20,marginBottom:36}}>
      {/* Step number + line */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:statusStyle.bg,border:`1px solid ${statusStyle.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:statusStyle.color,...mono,flexShrink:0}}>{n}</div>
        <div style={{width:1,flex:1,background:'rgba(255,255,255,0.06)',marginTop:8,minHeight:20}}/>
      </div>
      {/* Content */}
      <div style={{flex:1,paddingBottom:0}}>
        <div style={{fontWeight:700,fontSize:15,color:'#F0F0F8',marginBottom:12,paddingTop:6}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

/* ── OS Tab ── */
function OsTab({ label, icon: Icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 16px',background:active?'rgba(77,163,255,0.08)':'transparent',border:`1px solid ${active?'rgba(77,163,255,0.3)':'rgba(255,255,255,0.07)'}`,borderRadius:8,color:active?'#4DA3FF':'rgba(240,240,248,0.5)',fontSize:12,fontWeight:active?600:400,cursor:'pointer',...mono,transition:'all 0.15s'}}>
      <Icon size={14}/>{label}
    </button>
  );
}

/* ── Info pill ── */
function InfoPill({ color='#4DA3FF', children }) {
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:12,color,background:`${color}10`,border:`1px solid ${color}25`,borderRadius:7,padding:'8px 14px',...mono,marginTop:8}}>
      {children}
    </div>
  );
}

const SIDEBAR_SECTIONS = [
  {id:'overview',  label:'Overview',         icon:Terminal},
  {id:'quickstart',label:'Quick Start',       icon:Cpu},
  {id:'service',   label:'Background Service',icon:Server},
  {id:'collects',  label:'What It Collects',  icon:Shield},
  {id:'config',    label:'Config & Options',  icon:Settings},
  {id:'troubleshoot',label:'Troubleshooting', icon:AlertTriangle},
];

export default function AgentSetup() {
  const navigate = useNavigate();
  const [os, setOs] = useState('linux');
  const [activeSection, setActiveSection] = useState('overview');
  const [mobileNav, setMobileNav] = useState(false);

  const configSnippet = `AEGISTRACE_URL = "${AEGISTRACE_URL}"
INGEST_KEY     = "paste-your-ingest-key-here"`;

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
    setActiveSection(id);
    setMobileNav(false);
  };

  useEffect(()=>{
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting) setActiveSection(e.target.id); });
    },{threshold:0.3,rootMargin:'-60px 0px -60% 0px'});
    SIDEBAR_SECTIONS.forEach(s=>{ const el=document.getElementById(s.id); if(el) observer.observe(el); });
    return()=>observer.disconnect();
  },[]);

  return (
    <div style={{minHeight:'100vh',background:'#07080F',color:'#F0F0F8'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');
        ::selection{background:rgba(77,163,255,0.3);color:#fff}
        .agent-sidebar-link{display:flex;align-items:center;gap:8px;padding:8px 14px;font-size:0.72rem;color:#71717A;text-decoration:none;border-radius:7px;transition:all 0.15s;font-family:'JetBrains Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;background:none;border:none;text-align:left;width:100%}
        .agent-sidebar-link:hover{color:#F0F0F8;background:rgba(255,255,255,0.05)}
        .agent-sidebar-link.active{color:#4DA3FF;background:rgba(77,163,255,0.08);border-left:2px solid #4DA3FF;padding-left:12px}
        .mobile-nav-drawer{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(3,4,10,0.97);z-index:200;display:flex;flex-direction:column;padding:24px;backdrop-filter:blur(20px)}
        @media(max-width:860px){
          .agent-sidebar{display:none!important}
          .agent-main{margin-left:0!important;max-width:100%!important}
          .agent-content{padding:28px 20px!important}
        }
        @media(min-width:861px){.mobile-menu-btn{display:none!important}}
      `}</style>

      {/* ── TOP NAV ── */}
      <nav style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 28px',display:'flex',alignItems:'center',height:56,gap:16,position:'sticky',top:0,zIndex:100,background:'rgba(7,8,15,0.95)',backdropFilter:'blur(12px)'}}>
        <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',color:'inherit'}}>
          <Logo size={22}/>
          <span style={{fontWeight:700,fontSize:13,...mono,letterSpacing:'0.06em'}}>AEGISTRACE</span>
        </a>
        <div style={{width:1,height:20,background:'rgba(255,255,255,0.1)',margin:'0 4px'}}/>
        <span style={{fontSize:11,color:'rgba(240,240,248,0.35)',...mono,textTransform:'uppercase',letterSpacing:'0.1em'}}>Endpoint Agent Docs</span>
        <div style={{flex:1}}/>
        <a href="/public" style={{fontSize:12,color:'rgba(240,240,248,0.4)',textDecoration:'none',...mono,letterSpacing:'0.06em',textTransform:'uppercase'}}>Case Library</a>
        <button onClick={()=>navigate('/app/login')} style={{background:'#4DA3FF',color:'#fff',border:'none',borderRadius:6,padding:'7px 16px',fontSize:11,fontWeight:600,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>
          Sign In
        </button>
        <button className="mobile-menu-btn" onClick={()=>setMobileNav(true)} style={{background:'none',border:'1px solid rgba(240,240,248,0.15)',borderRadius:6,padding:'7px 9px',cursor:'pointer',color:'#F0F0F8',display:'flex',alignItems:'center'}}>
          <Menu size={16}/>
        </button>
      </nav>

      {/* Mobile sidebar drawer */}
      {mobileNav&&(
        <div className="mobile-nav-drawer">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
            <span style={{fontSize:13,fontWeight:700,...mono}}>Docs Navigation</span>
            <button onClick={()=>setMobileNav(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(240,240,248,0.6)'}}><XCircle size={20}/></button>
          </div>
          {SIDEBAR_SECTIONS.map(({id,label,icon:Icon})=>(
            <button key={id} onClick={()=>scrollTo(id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'14px 0',fontSize:14,color:'rgba(240,240,248,0.75)',background:'none',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,0.05)'},width:'100%',...mono,letterSpacing:'0.06em',textTransform:'uppercase'}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>
      )}

      {/* ── TWO-COLUMN: sidebar + content ── */}
      <div style={{display:'flex'}}>

        {/* LEFT SIDEBAR */}
        <aside className="agent-sidebar" style={{width:230,flexShrink:0,position:'sticky',top:56,height:'calc(100vh - 56px)',overflow:'auto',borderRight:'1px solid rgba(255,255,255,0.06)',padding:'24px 12px',background:'rgba(3,4,10,0.5)'}}>
          {/* Download card */}
          <div style={{margin:'0 0 20px',padding:'14px',background:'rgba(77,163,255,0.06)',border:'1px solid rgba(77,163,255,0.2)',borderRadius:10}}>
            <div style={{fontSize:11,color:'rgba(240,240,248,0.6)',...mono,marginBottom:8}}>aegistrace_agent.py</div>
            <div style={{fontSize:9,color:'#71717A',...mono,marginBottom:12}}>Python 3.7+ · Zero deps</div>
            <a href={AGENT_RAW_URL} download="aegistrace_agent.py" target="_blank" rel="noreferrer"
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,background:'#4DA3FF',color:'#fff',textDecoration:'none',padding:'8px',borderRadius:6,fontSize:11,fontWeight:700,...mono,letterSpacing:'0.06em',textTransform:'uppercase'}}>
              <Download size={12}/> Download
            </a>
          </div>

          {/* Nav */}
          <div style={{fontSize:9,color:'rgba(240,240,248,0.3)',letterSpacing:'0.15em',textTransform:'uppercase',...mono,marginBottom:8,paddingLeft:14}}>On This Page</div>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            {SIDEBAR_SECTIONS.map(({id,label,icon:Icon})=>(
              <button key={id} onClick={()=>scrollTo(id)}
                className={`agent-sidebar-link ${activeSection===id?'active':''}`}>
                <Icon size={12}/>{label}
              </button>
            ))}
          </div>

          <div style={{marginTop:24,padding:'12px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8}}>
            <div style={{fontSize:9,color:'rgba(240,240,248,0.3)',letterSpacing:'0.12em',textTransform:'uppercase',...mono,marginBottom:8}}>Quick Links</div>
            {[['/',<ArrowLeft size={9}/>,'Home'],['https://github.com/Prasanna-27eng/AegisTrace',<ExternalLink size={9}/>,'GitHub']].map(([href,icon,label])=>(
              <a key={label} href={href} style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:'rgba(240,240,248,0.35)',textDecoration:'none',...mono,padding:'3px 0',transition:'color 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.35)'}>
                {icon}{label}
              </a>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="agent-main" style={{flex:1,maxWidth:'calc(100% - 230px)'}}>
          <div className="agent-content" style={{maxWidth:780,margin:'0 auto',padding:'40px 48px 80px'}}>

            {/* ── OVERVIEW ── */}
            <section id="overview" style={{marginBottom:56}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                <div style={{width:44,height:44,background:'rgba(77,163,255,0.1)',border:'1px solid rgba(77,163,255,0.3)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Terminal size={22} style={{color:'#4DA3FF'}}/>
                </div>
                <div>
                  <div style={{fontSize:10,...mono,color:'#4DA3FF',textTransform:'uppercase',letterSpacing:'0.12em'}}>Endpoint Agent · v2</div>
                  <h1 style={{fontSize:26,fontWeight:800,margin:0,lineHeight:1.2}}>Setup Guide</h1>
                </div>
              </div>
              <p style={{fontSize:14,color:'rgba(240,240,248,0.6)',lineHeight:1.8,maxWidth:620,margin:'0 0 24px',...mono,fontWeight:300}}>
                Install the AegisTrace agent on any machine — Windows, Linux, or Mac — to automatically collect and ship security logs to your AegisTrace dashboard. Zero dependencies required beyond Python 3.7+.
              </p>

              {/* Download card */}
              <div style={{display:'flex',gap:16,alignItems:'center',padding:'20px 24px',background:'rgba(77,163,255,0.05)',border:'1px solid rgba(77,163,255,0.2)',borderRadius:12,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:3,...mono,color:'#F0F0F8'}}>aegistrace_agent.py</div>
                  <div style={{fontSize:11,color:'#71717A',...mono}}>Python 3.7+ · Zero dependencies · Windows / Linux / Mac</div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <a href={AGENT_RAW_URL} download="aegistrace_agent.py" target="_blank" rel="noreferrer"
                    style={{display:'inline-flex',alignItems:'center',gap:7,background:'#4DA3FF',color:'#fff',textDecoration:'none',padding:'10px 20px',borderRadius:8,fontSize:12,fontWeight:700,...mono,letterSpacing:'0.06em',textTransform:'uppercase'}}>
                    <Download size={14}/> Download Agent
                  </a>
                  <a href={`https://github.com/Prasanna-27eng/AegisTrace`} target="_blank" rel="noreferrer"
                    style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.05)',color:'rgba(240,240,248,0.7)',border:'1px solid rgba(255,255,255,0.1)',textDecoration:'none',padding:'10px 18px',borderRadius:8,fontSize:12,...mono}}>
                    <ExternalLink size={13}/> GitHub
                  </a>
                </div>
              </div>

              {/* Feature highlights */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10,marginTop:16}}>
                {[
                  {Icon:Cpu,   label:'Auto-detects OS',    sub:'Windows, Linux, macOS'},
                  {Icon:Shield,label:'Ships over HTTPS',   sub:'Encrypted telemetry'},
                  {Icon:Wifi,  label:'Retry queue',        sub:'Offline-resilient'},
                  {Icon:CheckCircle,label:'No duplicates', sub:'Tracks log position'},
                ].map(({Icon,label,sub})=>(
                  <div key={label} style={{display:'flex',gap:10,alignItems:'center',padding:'12px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:9}}>
                    <Icon size={14} style={{color:'#4DA3FF',flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:'#F0F0F8'}}>{label}</div>
                      <div style={{fontSize:10,color:'#71717A',...mono,marginTop:1}}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)',marginBottom:48}}/>

            {/* ── QUICK START ── */}
            <section id="quickstart" style={{marginBottom:56}}>
              <div style={{marginBottom:28}}>
                <div style={{fontSize:9,color:'#4DA3FF',letterSpacing:'0.18em',textTransform:'uppercase',...mono,marginBottom:8}}>◇ Quick Start</div>
                <h2 style={{fontSize:22,fontWeight:700,margin:0}}>Up and running in 3 steps</h2>
              </div>

              <Step n="1" title="Get your Ingest Key">
                <p style={{fontSize:13,color:'rgba(240,240,248,0.6)',margin:'0 0 12px',lineHeight:1.7,...mono,fontWeight:300}}>
                  Log into AegisTrace, go to <strong style={{color:'#F0F0F8'}}>Endpoints</strong> and click <strong style={{color:'#F0F0F8'}}>Get Ingest Key</strong>. Copy the key — you'll paste it in the next step.
                </p>
                <InfoPill color="#A78BFA">
                  <Shield size={12}/> Admin → Endpoints → Get Ingest Key
                </InfoPill>
              </Step>

              <Step n="2" title="Download & configure the agent">
                <p style={{fontSize:13,color:'rgba(240,240,248,0.6)',margin:'0 0 10px',lineHeight:1.7,...mono,fontWeight:300}}>
                  Download the agent file, open it in any text editor, and update these two lines near the top:
                </p>
                <CopyBlock code={configSnippet} label="aegistrace_agent.py — edit these two lines"/>
                <a href={AGENT_RAW_URL} download="aegistrace_agent.py" target="_blank" rel="noreferrer"
                  style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,color:'rgba(240,240,248,0.45)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'6px 12px',textDecoration:'none',...mono,transition:'color 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.45)'}>
                  <Download size={12}/> Download aegistrace_agent.py
                </a>
              </Step>

              <Step n="3" title="Run it">
                <CopyBlock code="python3 aegistrace_agent.py" label="Terminal"/>
                <div style={{padding:'12px 16px',background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.18)',borderRadius:8,fontSize:13,color:'rgba(240,240,248,0.7)',display:'flex',alignItems:'center',gap:9,...mono}}>
                  <CheckCircle size={13} style={{color:'#22C55E',flexShrink:0}}/>
                  Logs appear in your <strong style={{color:'#F0F0F8',margin:'0 4px'}}>Endpoints</strong> page within 5 minutes.
                </div>
              </Step>

              <div style={{padding:'14px 18px',background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.18)',borderRadius:9,fontSize:13,color:'#A78BFA',lineHeight:1.6,...mono}}>
                <strong>Requirements:</strong> Python 3.7 or newer. No extra packages needed. The agent tracks its position in each log file so it never ships duplicate lines.
              </div>
            </section>

            <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)',marginBottom:48}}/>

            {/* ── BACKGROUND SERVICE ── */}
            <section id="service" style={{marginBottom:56}}>
              <div style={{marginBottom:28}}>
                <div style={{fontSize:9,color:'#4DA3FF',letterSpacing:'0.18em',textTransform:'uppercase',...mono,marginBottom:8}}>◇ Background Service</div>
                <h2 style={{fontSize:22,fontWeight:700,margin:0}}>Run as a persistent service</h2>
                <p style={{fontSize:13,color:'rgba(240,240,248,0.5)',marginTop:8,...mono,fontWeight:300}}>Install the agent so it starts automatically and keeps running in the background.</p>
              </div>

              {/* OS tabs */}
              <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
                <OsTab label="Linux" icon={Server} active={os==='linux'} onClick={()=>setOs('linux')}/>
                <OsTab label="macOS" icon={Apple} active={os==='mac'} onClick={()=>setOs('mac')}/>
                <OsTab label="Windows" icon={Monitor} active={os==='windows'} onClick={()=>setOs('windows')}/>
              </div>

              {os==='linux'&&(
                <div>
                  <p style={{fontSize:13,color:'rgba(240,240,248,0.6)',margin:'0 0 10px',lineHeight:1.7,...mono,fontWeight:300}}>One command installs and starts the systemd service:</p>
                  <CopyBlock code="sudo python3 aegistrace_agent.py --install-service"/>
                  <p style={{fontSize:13,color:'rgba(240,240,248,0.6)',margin:'14px 0 8px',...mono,fontWeight:300}}>Check status:</p>
                  <CopyBlock code="systemctl status aegistrace-agent"/>
                  <p style={{fontSize:13,color:'rgba(240,240,248,0.6)',margin:'14px 0 8px',...mono,fontWeight:300}}>View logs:</p>
                  <CopyBlock code="journalctl -u aegistrace-agent -f"/>
                </div>
              )}

              {os==='mac'&&(
                <div>
                  <p style={{fontSize:13,color:'rgba(240,240,248,0.6)',margin:'0 0 10px',lineHeight:1.7,...mono,fontWeight:300}}>Installs as a LaunchAgent — auto-starts on every login:</p>
                  <CopyBlock code="python3 aegistrace_agent.py --install-launchd"/>
                  <p style={{fontSize:13,color:'rgba(240,240,248,0.55)',margin:'10px 0 0',lineHeight:1.6,...mono,fontWeight:300}}>The agent will launch automatically each time you log in to macOS.</p>
                </div>
              )}

              {os==='windows'&&(
                <div>
                  <p style={{fontSize:13,color:'rgba(240,240,248,0.6)',margin:'0 0 14px',lineHeight:1.7,...mono,fontWeight:300}}>Configure via Windows Task Scheduler:</p>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {[
                      {n:'1',t:'Open Task Scheduler',d:'Search for "Task Scheduler" in the Start menu → Create Basic Task'},
                      {n:'2',t:'Name the task',d:'Enter: AegisTrace Agent'},
                      {n:'3',t:'Set trigger',d:'At startup + repeat every 5 minutes indefinitely'},
                      {n:'4',t:'Set action',d:'Start a program: python.exe with argument "C:\\path\\to\\aegistrace_agent.py"'},
                      {n:'5',t:'Advanced settings',d:'Check "Run whether user is logged on or not" + "Run with highest privileges"'},
                    ].map(({n,t,d})=>(
                      <div key={n} style={{display:'flex',gap:14,padding:'12px 16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,alignItems:'flex-start'}}>
                        <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(77,163,255,0.12)',border:'1px solid rgba(77,163,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#4DA3FF',flexShrink:0,...mono}}>{n}</div>
                        <div>
                          <div style={{fontWeight:600,fontSize:13,color:'#F0F0F8',marginBottom:3}}>{t}</div>
                          <div style={{fontSize:12,color:'rgba(240,240,248,0.5)',...mono,fontWeight:300}}>{d}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)',marginBottom:48}}/>

            {/* ── WHAT IT COLLECTS ── */}
            <section id="collects" style={{marginBottom:56}}>
              <div style={{marginBottom:28}}>
                <div style={{fontSize:9,color:'#4DA3FF',letterSpacing:'0.18em',textTransform:'uppercase',...mono,marginBottom:8}}>◇ Data Collection</div>
                <h2 style={{fontSize:22,fontWeight:700,margin:0}}>What it collects</h2>
                <p style={{fontSize:13,color:'rgba(240,240,248,0.5)',marginTop:8,...mono,fontWeight:300}}>The agent auto-detects your OS and collects the relevant log sources. All data is sent over HTTPS.</p>
              </div>

              {/* OS tabs */}
              <div style={{display:'flex',gap:8,marginBottom:22,flexWrap:'wrap'}}>
                <OsTab label="Linux / Mac" icon={Server} active={os==='linux'||os==='mac'} onClick={()=>setOs('linux')}/>
                <OsTab label="Windows" icon={Monitor} active={os==='windows'} onClick={()=>setOs('windows')}/>
              </div>

              {(os==='linux'||os==='mac')&&(
                <div style={{border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead>
                      <tr style={{background:'rgba(255,255,255,0.03)'}}>
                        <th style={{textAlign:'left',padding:'10px 16px',color:'rgba(240,240,248,0.4)',fontWeight:500,borderBottom:'1px solid rgba(255,255,255,0.07)',...mono,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em'}}>Source</th>
                        <th style={{textAlign:'left',padding:'10px 16px',color:'rgba(240,240,248,0.4)',fontWeight:500,borderBottom:'1px solid rgba(255,255,255,0.07)',...mono,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em'}}>What it captures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[['/var/log/auth.log','SSH logins, sudo, su'],['/var/log/syslog','System events'],['journalctl','Systemd service events'],['/var/log/nginx/access.log','Web access logs'],['/var/log/apache2/access.log','Web access logs'],['ps aux','Running processes snapshot'],['ss -tunp','Active network connections']].map(([src,desc],i)=>(
                        <tr key={src} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',background:i%2===0?'rgba(255,255,255,0.01)':'transparent'}}>
                          <td style={{padding:'9px 16px',...mono,fontSize:12,color:'#A78BFA'}}>{src}</td>
                          <td style={{padding:'9px 16px',color:'rgba(240,240,248,0.65)',fontSize:12}}>{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {os==='windows'&&(
                <div style={{border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead>
                      <tr style={{background:'rgba(255,255,255,0.03)'}}>
                        <th style={{textAlign:'left',padding:'10px 16px',color:'rgba(240,240,248,0.4)',fontWeight:500,borderBottom:'1px solid rgba(255,255,255,0.07)',...mono,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em'}}>Source</th>
                        <th style={{textAlign:'left',padding:'10px 16px',color:'rgba(240,240,248,0.4)',fontWeight:500,borderBottom:'1px solid rgba(255,255,255,0.07)',...mono,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em'}}>What it captures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[['Windows Security Events','4624 login · 4625 failed · 4720 new user · 4726 deleted · 4698 task'],['Windows System Events','7045 new service · 7040 service changed'],['PowerShell History','All commands typed in PS'],['Process list','Get-Process snapshot'],['Network connections','Get-NetTCPConnection']].map(([src,desc],i)=>(
                        <tr key={src} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',background:i%2===0?'rgba(255,255,255,0.01)':'transparent'}}>
                          <td style={{padding:'9px 16px',...mono,fontSize:12,color:'#A78BFA'}}>{src}</td>
                          <td style={{padding:'9px 16px',color:'rgba(240,240,248,0.65)',fontSize:12}}>{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)',marginBottom:48}}/>

            {/* ── CONFIG OPTIONS ── */}
            <section id="config" style={{marginBottom:56}}>
              <div style={{marginBottom:24}}>
                <div style={{fontSize:9,color:'#4DA3FF',letterSpacing:'0.18em',textTransform:'uppercase',...mono,marginBottom:8}}>◇ Configuration</div>
                <h2 style={{fontSize:22,fontWeight:700,margin:0}}>Config options</h2>
                <p style={{fontSize:13,color:'rgba(240,240,248,0.5)',marginTop:8,...mono,fontWeight:300}}>Open <code style={{color:'#A78BFA',fontSize:12}}>aegistrace_agent.py</code> and adjust these variables near the top:</p>
              </div>
              <CopyBlock label="Configuration variables" code={`INTERVAL_SECONDS = 300     # How often to ship logs (default: 5 min)
MAX_LINES        = 500     # Max lines per log file per run
AUTO_ANALYSE     = True    # Run AI analysis on arrival
AUTO_CASE        = True    # Auto-create a case if threat score > threshold
THREAT_THRESHOLD = 60      # Score 0–100 (default: 60)
TAGS             = ["prod", "finance"]  # Optional labels for this machine`}/>

              {/* Config reference table */}
              <div style={{border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden',marginTop:8}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr style={{background:'rgba(255,255,255,0.03)'}}>
                      {['Variable','Default','Description'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'9px 14px',color:'rgba(240,240,248,0.35)',fontWeight:500,borderBottom:'1px solid rgba(255,255,255,0.07)',...mono,fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[['INTERVAL_SECONDS','300','Seconds between each collection run'],['MAX_LINES','500','Max log lines shipped per file per run'],['AUTO_ANALYSE','True','Trigger AI analysis on log batch arrival'],['AUTO_CASE','True','Auto-create case if threat score exceeds threshold'],['THREAT_THRESHOLD','60','Minimum score (0–100) to trigger auto-case'],['TAGS','[]','Label this machine for filtering in the dashboard']].map(([v,d,desc],i)=>(
                      <tr key={v} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',background:i%2===0?'rgba(255,255,255,0.01)':'transparent'}}>
                        <td style={{padding:'8px 14px',...mono,fontSize:11,color:'#A78BFA'}}>{v}</td>
                        <td style={{padding:'8px 14px',...mono,fontSize:11,color:'#EAB308'}}>{d}</td>
                        <td style={{padding:'8px 14px',color:'rgba(240,240,248,0.55)',fontSize:12}}>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)',marginBottom:48}}/>

            {/* ── TROUBLESHOOTING ── */}
            <section id="troubleshoot" style={{marginBottom:56}}>
              <div style={{marginBottom:24}}>
                <div style={{fontSize:9,color:'#EAB308',letterSpacing:'0.18em',textTransform:'uppercase',...mono,marginBottom:8}}>◇ Troubleshooting</div>
                <h2 style={{fontSize:22,fontWeight:700,margin:0}}>Common issues</h2>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {[
                  {q:'Agent runs but no data appears in AegisTrace',a:'Check that the INGEST_KEY matches the key shown in Endpoints → Get Ingest Key. Make sure AEGISTRACE_URL includes https://. Check aegistrace_agent.log in the same folder for error details.',icon:'⚠'},
                  {q:'Permission denied on log files',a:'Linux/Mac: run as root, or add your user to the adm group: sudo usermod -aG adm $USER (then log out and back in). Windows: run as Administrator, or set the Task Scheduler task to run as SYSTEM.',icon:'🔒'},
                  {q:'AI analysis not running on new batches',a:'Verify that GROQ_API_KEY is set as an environment variable in your Render dashboard. Check with GET /api/health — it should return {"groq": true}.',icon:'🤖'},
                ].map(({q,a,icon})=>(
                  <div key={q} style={{padding:'16px 18px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,borderLeft:'2px solid rgba(234,179,8,0.4)'}}>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:6,color:'#F0F0F8',display:'flex',alignItems:'center',gap:7}}><span>{icon}</span>{q}</div>
                    <div style={{fontSize:12,color:'rgba(240,240,248,0.55)',lineHeight:1.7,...mono,fontWeight:300}}>{a}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CTA ── */}
            <div style={{padding:'24px',background:'rgba(77,163,255,0.05)',border:'1px solid rgba(77,163,255,0.18)',borderRadius:12,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontWeight:700,fontSize:15,marginBottom:5}}>Ready to monitor your endpoints?</div>
                <div style={{fontSize:12,color:'rgba(240,240,248,0.5)',...mono}}>Sign in to AegisTrace to get your ingest key and start collecting logs.</div>
              </div>
              <button onClick={()=>navigate('/app/login')} style={{background:'#4DA3FF',color:'#fff',border:'none',borderRadius:8,padding:'11px 24px',fontSize:12,fontWeight:700,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase',flexShrink:0}}>
                Sign In →
              </button>
            </div>

            {/* Footer nav */}
            <div style={{marginTop:36,paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:16,flexWrap:'wrap',fontSize:11,color:'rgba(240,240,248,0.3)',...mono}}>
              <a href="/" style={{color:'inherit',textDecoration:'none'}} onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.3)'}>← Home</a>
              <a href="/public" style={{color:'inherit',textDecoration:'none'}} onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.3)'}>Case Library</a>
              <a href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noreferrer" style={{color:'inherit',textDecoration:'none',display:'flex',alignItems:'center',gap:4}} onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.3)'}>GitHub <ExternalLink size={10}/></a>
              <a href={AGENT_RAW_URL} target="_blank" rel="noreferrer" download="aegistrace_agent.py" style={{color:'inherit',textDecoration:'none',display:'flex',alignItems:'center',gap:4}} onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.3)'}>Download Agent <Download size={10}/></a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
