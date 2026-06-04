import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Github, Linkedin, Shield, Brain, Mail, Bug, GitMerge,
  Wrench, FolderSearch, ChevronRight, Loader2, Monitor, Activity, Globe,
  Terminal, Bell, Wifi, Radio, HardDrive, Network, Tag, Cpu, Check, X,
  Zap, Lock, Eye, BarChart3, BookOpen, Users
} from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';

const openApp = () => window.open('/app/login', '_blank', 'noopener,noreferrer');

/* ─── Tunnel canvas ─────────────────────────────────────────────────────── */
function TunnelCanvas() {
  const ref   = useRef(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    let aid, last = 0;
    const RING_COUNT = 26, SPACING = 0.55, Z_MIN = 0.18, DRIFT = 0.014;
    const rings = Array.from({ length: RING_COUNT }, (_, i) => ({ z: Z_MIN + i * SPACING, accent: i % 6 === 0 }));
    function resize() { const dpr = Math.min(window.devicePixelRatio||1,2); cv.width=cv.offsetWidth*dpr; cv.height=cv.offsetHeight*dpr; ctx.scale(dpr,dpr); }
    resize(); window.addEventListener('resize', resize);
    const onMouse = e => { mouse.current = { x: e.clientX/window.innerWidth, y: e.clientY/window.innerHeight }; };
    window.addEventListener('mousemove', onMouse);
    let vpLerpX=0.5, vpLerpY=0.5;
    function frame(ts) {
      const dt = Math.min((ts-last)/(1000/60),3); last=ts;
      const W=cv.offsetWidth, H=cv.offsetHeight, minDim=Math.min(W,H);
      vpLerpX+=(mouse.current.x-vpLerpX)*0.04; vpLerpY+=(mouse.current.y-vpLerpY)*0.04;
      const vpx=W/2+(vpLerpX-0.5)*minDim*0.16, vpy=H/2+(vpLerpY-0.5)*minDim*0.16;
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#07080F'; ctx.fillRect(0,0,W,H);
      ctx.save(); ctx.strokeStyle='rgba(240,240,248,0.06)'; ctx.lineWidth=0.5;
      [[0,0],[W,0],[W,H],[0,H]].forEach(([x,y])=>{ ctx.beginPath(); ctx.moveTo(vpx,vpy); ctx.lineTo(x,y); ctx.stroke(); });
      ctx.restore();
      const maxZ=Z_MIN+RING_COUNT*SPACING;
      rings.forEach(r=>{ r.z-=DRIFT*dt; if(r.z<Z_MIN) r.z+=RING_COUNT*SPACING; });
      [...rings].sort((a,b)=>b.z-a.z).forEach(r=>{
        const size=(minDim*0.62)/r.z, fade=Math.pow(1-r.z/maxZ,1.4);
        const x=vpx-size/2, y=vpy-size/2;
        if(r.accent){ctx.save();ctx.shadowColor='#C0392B';ctx.shadowBlur=14;ctx.strokeStyle=`rgba(192,57,43,${fade*0.75})`;ctx.lineWidth=Math.max(0.4,fade*1.2);}
        else{ctx.strokeStyle=`rgba(240,240,248,${fade*0.28})`;ctx.lineWidth=Math.max(0.3,fade*0.7);}
        ctx.strokeRect(x,y,size,size);
        if(r.accent) ctx.restore();
      });
      const grd=ctx.createRadialGradient(vpx,vpy,0,vpx,vpy,minDim*0.35);
      grd.addColorStop(0,'rgba(192,57,43,0.1)'); grd.addColorStop(1,'transparent');
      ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
      const vig=ctx.createRadialGradient(W/2,H/2,minDim*0.3,W/2,H/2,minDim*0.85);
      vig.addColorStop(0,'transparent'); vig.addColorStop(1,'rgba(7,8,15,0.8)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
      aid=requestAnimationFrame(frame);
    }
    aid=requestAnimationFrame(frame);
    return ()=>{ cancelAnimationFrame(aid); window.removeEventListener('resize',resize); window.removeEventListener('mousemove',onMouse); };
  }, []);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />;
}

function Clock() {
  const [t,setT]=useState('');
  useEffect(()=>{ const tick=()=>setT(new Date().toUTCString().slice(17,25)+' UTC'); tick(); const id=setInterval(tick,1000); return()=>clearInterval(id); },[]);
  return <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'rgba(240,240,248,0.45)',letterSpacing:'0.06em'}}>{t}</span>;
}

/* ─── AI Demo ───────────────────────────────────────────────────────────── */
function AIDemo() {
  const [input,setInput]=useState(''); const [result,setResult]=useState(null); const [loading,setLoading]=useState(false);
  const EXAMPLES=['185.220.101.34','evil-invoice.com','http://phish-acme.ru/login','4a7f2b3cd91e8f05a6c2d3b4e5f67890abcd1234ef5678901234567890abcdef'];
  const analyse=async(val)=>{
    const v=(val||input).trim(); if(!v) return;
    setLoading(true); setResult(null);
    try{ const r=await api.post('/api/public/demo-analyse',{input:v}); setResult(r.data); setInput(v); }
    catch(e){ setResult({error:true,summary:e.response?.data?.detail||'Analysis failed'}); }
    setLoading(false);
  };
  const riskColor={Critical:'#EF4444',High:'#C0392B',Medium:'#EAB308',Low:'#22C55E',Clean:'#22C55E',Unknown:'#71717A'};
  const verdictColor={Malicious:'#EF4444',Suspicious:'#EAB308',Clean:'#22C55E',Unknown:'#71717A'};
  const mono={fontFamily:'JetBrains Mono,monospace'};
  return (
    <div style={{background:'rgba(240,240,248,0.02)',border:'1px solid rgba(240,240,248,0.08)',borderRadius:10,padding:24}}>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {EXAMPLES.map(e=>(
          <button key={e} onClick={()=>analyse(e)} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:4,padding:'4px 10px',fontSize:11,color:'rgba(240,240,248,0.6)',cursor:'pointer',...mono}}>{e.slice(0,28)}{e.length>28?'…':''}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:10}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyse()} placeholder="Paste any IOC — IP, domain, URL, hash…" style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'10px 14px',color:'#F0F0F8',outline:'none',fontSize:13,...mono}} />
        <button onClick={()=>analyse()} disabled={loading} style={{background:'#C0392B',color:'#fff',border:'none',borderRadius:6,padding:'10px 20px',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,...mono,whiteSpace:'nowrap'}}>
          {loading?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Zap size={14}/>}
          {loading?'Analysing…':'Analyse'}
        </button>
      </div>
      {result&&!result.error&&(
        <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:16}}>
            <div style={{fontSize:10,color:'rgba(240,240,248,0.4)',letterSpacing:'0.12em',textTransform:'uppercase',...mono,marginBottom:8}}>Verdict</div>
            <div style={{fontSize:'1.4rem',fontWeight:700,color:verdictColor[result.verdict]||'#71717A',...mono}}>{result.verdict}</div>
            <div style={{marginTop:4,fontSize:11,color:'rgba(240,240,248,0.5)',...mono}}>{result.type}</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:16}}>
            <div style={{fontSize:10,color:'rgba(240,240,248,0.4)',letterSpacing:'0.12em',textTransform:'uppercase',...mono,marginBottom:8}}>Risk Level</div>
            <div style={{fontSize:'1.4rem',fontWeight:700,color:riskColor[result.risk_level]||'#71717A',...mono}}>{result.risk_level}</div>
            <div style={{marginTop:4,fontSize:11,color:'rgba(240,240,248,0.5)',...mono}}>Confidence: {result.confidence}%</div>
          </div>
          <div style={{gridColumn:'1/-1',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:16}}>
            <div style={{fontSize:12,color:'rgba(240,240,248,0.8)',lineHeight:1.7,...mono}}>{result.summary}</div>
            {result.recommendation&&<div style={{marginTop:8,fontSize:11,color:'rgba(240,240,248,0.5)',borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:8,...mono}}><strong style={{color:'#C0392B'}}>Next step:</strong> {result.recommendation}</div>}
          </div>
        </div>
      )}
      {result?.error&&<div style={{marginTop:12,padding:'10px 14px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,fontSize:12,color:'#EF4444',...mono}}>{result.summary}</div>}
    </div>
  );
}

function Ticker() {
  const items='◇ Endpoint Agent v2 · Sysmon Collection · Process Tree Analysis · ◇ 18 Hardware Analysis Tools · WiFi Pineapple · HackRF One · Flipper Zero · Rubber Ducky · Proxmark3 · Suricata · ◇ AI Case Analysis · MITRE ATT&CK · IOC Correlation · ◇ VirusTotal v3 · Shodan · MalwareBazaar · URLhaus · ThreatFox · GreyNoise · ◇ Email Forensics · DORA Compliance · Webhook Alerting · ◇ YARA Generator · PCAP Analysis · Threat Feeds · ◇ Evil Twin Detector · Deauth Timeline · Spectrum Analyser · Replay Detector · ◇ ARP Poison · DNS Tunnelling · Lateral Movement · ◇ Card Clone · RFID Brute Force · ◇ Free. Open. Deployable. · ';
  return (
    <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:10,height:32,overflow:'hidden',background:'rgba(7,8,15,0.7)',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center'}}>
      <div style={{display:'flex',animation:'marquee 60s linear infinite',whiteSpace:'nowrap'}}>
        {[items,items].map((s,i)=><span key={i} style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'rgba(240,240,248,0.3)',letterSpacing:'0.1em',paddingRight:0}}>{s}</span>)}
      </div>
    </div>
  );
}

/* ─── FEATURES ──────────────────────────────────────────────────────────── */
const FEATURES = [
  { Icon:FolderSearch, title:'Case Management',     desc:'10-tab lifecycle with IOC tracking, MITRE mapping, AI analysis, AI chat, evidence vault, playbook, and timeline. Playbook state persists across sessions.',  color:'#C0392B' },
  { Icon:Shield,       title:'7-Source IOC Intel',  desc:'VirusTotal v3 + Shodan, MalwareBazaar, URLhaus, ThreatFox, GreyNoise, IPInfo — all queried in parallel. Results saved to history and correlated cross-case.', color:'#A78BFA' },
  { Icon:Brain,        title:'Multi-Model AI',      desc:'Groq LLM routing — llama-3.3-70b for deep analysis, mixtral-8x7b for phishing classification, gemma2-9b for fast IOC extraction. Zero AI vendor lock-in.',     color:'#EAB308' },
  { Icon:Mail,         title:'Email Forensics',     desc:'Full RFC header parsing, SPF/DKIM/DMARC validation, routing hop extraction, AI phishing verdict with confidence scoring and MITRE ATT&CK technique mapping.',   color:'#22C55E' },
  { Icon:Monitor,      title:'Endpoint Agent v2',   desc:'Zero-dependency Python agent for Windows/Linux/Mac. Collects Sysmon events, process trees, persistence, auth logs. Heartbeat every 60s. Retry queue.',            color:'#C0392B' },
  { Icon:Terminal,     title:'Log Investigation',   desc:'Paste any raw log — syslog, Windows Event XML, Apache, CloudTrail, Suricata. AI auto-detects format, extracts IOCs, maps MITRE, pushes to a case.',              color:'#A78BFA' },
  { Icon:GitMerge,     title:'IOC Correlation',     desc:'Cross-case correlation engine. Same IOC in 3+ cases triggers campaign webhook. Detects shared threat actor infrastructure across investigations.',               color:'#EAB308' },
  { Icon:Activity,     title:'Threat Hunting',      desc:'IOC frequency heatmap, MITRE ATT&CK visualisation, campaign detection, saved hunt queries. Spot patterns across your full investigation history.',               color:'#22C55E' },
  { Icon:Bug,          title:'Malware Tools',       desc:'Base64/URL encode/decode, MD5/SHA1/SHA256/SHA512 hash generator, defang/refang, and AI-powered YARA rule generation from sample description.',                  color:'#C0392B' },
  { Icon:Network,      title:'PCAP Analysis',       desc:'Upload .pcap files for automated protocol analysis, top-talker identification, DNS query extraction, suspicious flow detection, and AI threat scoring.',         color:'#A78BFA' },
  { Icon:Globe,        title:'DORA Compliance',     desc:'One-click Article 19 Major ICT Incident Report PDF. Maps 5 DORA pillars to live case data. Built for EU financial services. Export PDF or DOCX.',               color:'#EAB308' },
  { Icon:Bell,         title:'Webhook Alerting',    desc:'HTTP POST webhooks fire on case events, critical detections, and malicious IOC campaigns. Slack-compatible payload format, HMAC-SHA256 signed.',                color:'#22C55E' },
];

const HARDWARE_TOOLS = [
  { cat:'WiFi Attack', color:'#C0392B', tools:['Probe Request Analyser','Evil Twin Detector','Deauth Attack Timeline','Handshake Inspector'] },
  { cat:'RF / Radio',  color:'#A78BFA', tools:['Spectrum Analyser','Replay Attack Detector','Jamming Detector'] },
  { cat:'USB / HID',   color:'#EAB308', tools:['Keystroke Injection Analyser','Payload Decoder','Encoded Command Decoder'] },
  { cat:'Network',     color:'#22C55E', tools:['Suricata IDS Parser','ARP Poison Detector','DNS Query Analyser','Lateral Movement Tracer'] },
  { cat:'RFID / NFC',  color:'#00bfff', tools:['Card Clone Detector','RFID Brute Force Detector'] },
  { cat:'Endpoint',    color:'#C0392B', tools:['Sysmon Event Parser','Process Tree Analyser'] },
  { cat:'Universal',   color:'#A78BFA', tools:['AI Universal Parser'] },
];

const COMPARE = [
  { feature:'Case management lifecycle',       at:true,   cs:true,  sp:true },
  { feature:'Multi-model AI analysis',         at:true,   cs:true,  sp:true },
  { feature:'7-source IOC enrichment',         at:true,   cs:false, sp:true },
  { feature:'Email forensics (SPF/DKIM/DMARC)',at:true,   cs:false, sp:false },
  { feature:'DORA Article 19 compliance report',at:true,  cs:false, sp:false },
  { feature:'Hardware tool log ingestion',     at:true,   cs:false, sp:false },
  { feature:'AI auto-parse any log format',    at:true,   cs:false, sp:false },
  { feature:'18 hardware forensic tools',      at:true,   cs:false, sp:false },
  { feature:'Physical layer visibility (RF/WiFi/RFID)',at:true,cs:false,sp:false },
  { feature:'PCAP analysis',                   at:true,   cs:true,  sp:true },
  { feature:'Webhook alerting',                at:true,   cs:true,  sp:true },
  { feature:'Public case library',             at:true,   cs:false, sp:false },
  { feature:'Free / self-hosted',              at:true,   cs:false, sp:false },
];

const CERTS = [
  { name:'SC-200', full:'Microsoft Security Operations Analyst', color:'#0078D4', done:true },
  { name:'Sec+',   full:'CompTIA Security+', color:'#C8102E', done:true },
  { name:'TCM PEH',full:'TCM Practical Ethical Hacking', color:'#22C55E', done:true },
  { name:'BTL1',   full:'Blue Team Level 1 (55%)', color:'#F97316', done:false },
  { name:'eJPT',   full:'eLearnSecurity Junior Penetration Tester (20%)', color:'#A78BFA', done:false },
  { name:'SC-300', full:'Microsoft Identity & Access Administrator (15%)', color:'#0078D4', done:false },
];

export default function Landing() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_cases:12, total_iocs:847, critical_cases:3, vt_lookups:234 });
  const [coord, setCoord] = useState({ x:'0.0', y:'0.0' });
  useEffect(()=>{
    api.get('/api/portfolio/stats').then(r=>setStats(s=>({...s,...r.data}))).catch(()=>{});
    const onMouse=e=>setCoord({x:(e.clientX/window.innerWidth*100).toFixed(1),y:(e.clientY/window.innerHeight*100).toFixed(1)});
    window.addEventListener('mousemove',onMouse);
    return()=>window.removeEventListener('mousemove',onMouse);
  },[]);
  const mono={fontFamily:'JetBrains Mono,monospace'};

  return (
    <div style={{background:'#07080F',color:'#F0F0F8',minHeight:'100vh',cursor:'crosshair',overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.85);opacity:0.4}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        ::selection{background:rgba(192,57,43,0.4);color:#fff}
        .fade-1{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.05s both}
        .fade-2{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.2s both}
        .fade-4{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.65s both}
        .nav-link{color:rgba(240,240,248,0.5);text-decoration:none;transition:color 0.2s;font-size:11px;letter-spacing:0.12em;text-transform:uppercase}
        .nav-link:hover{color:#C0392B}
        .cta-box{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border:1px solid rgba(240,240,248,0.25);transition:all 0.2s;cursor:pointer;background:none}
        .cta-box:hover{border-color:#C0392B}
        .cta-box:hover svg{transform:translate(4px,-4px)}
        .cta-box svg{transition:transform 0.2s}
        .feat-card{background:rgba(240,240,248,0.02);border:1px solid rgba(240,240,248,0.07);border-radius:10px;padding:22px;transition:border-color 0.2s,background 0.2s,transform 0.2s;cursor:default}
        .feat-card:hover{border-color:rgba(192,57,43,0.35);background:rgba(192,57,43,0.03);transform:translateY(-2px)}
        .hw-cat-card{background:rgba(240,240,248,0.02);border:1px solid rgba(240,240,248,0.07);border-radius:10px;padding:20px;transition:all 0.2s}
        .hw-cat-card:hover{border-color:rgba(192,57,43,0.3);background:rgba(192,57,43,0.025)}
        .compare-row:hover td{background:rgba(255,255,255,0.02)}
        @media(max-width:767px){
          .lp-nav-links{display:none!important}.lp-rails{display:none!important}
          .lp-hero{bottom:80px!important;left:20px!important;right:20px!important;max-width:100%!important}
          .lp-section{padding:48px 20px!important}
          .lp-grid-4{grid-template-columns:1fr 1fr!important}
          .lp-grid-auto{grid-template-columns:1fr!important}
          .lp-how{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:480px){.lp-grid-4{grid-template-columns:1fr!important}.lp-how{grid-template-columns:1fr!important}}
      `}</style>

      {/* ══ HERO ══ */}
      <section style={{position:'relative',width:'100%',height:'100vh',overflow:'hidden'}}>
        <TunnelCanvas/>
        <header className="fade-1" style={{position:'absolute',top:0,left:0,right:0,zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 48px',borderBottom:'1px solid rgba(240,240,248,0.06)'}}>
          <Logo size={24} showText/>
          <nav className="lp-nav-links" style={{display:'flex',gap:32,alignItems:'center'}}>
            {[['#features','Features'],['#hardware','Hardware Platform'],['#demo','Live Demo'],['#compare','vs Competitors'],['#certs','About']].map(([href,label])=>(
              <a key={href} href={href} className="nav-link" onClick={e=>{e.preventDefault();document.querySelector(href)?.scrollIntoView({behavior:'smooth'});}}>{label}</a>
            ))}
            <a href="/portfolio" className="nav-link">Portfolio</a>
            <a href="/agent-setup" className="nav-link">Agent Setup</a>
          </nav>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#C0392B',animation:'pulse-dot 1.8s ease-in-out infinite'}}/>
            <Clock/>
            <button onClick={openApp} style={{background:'#C0392B',color:'white',border:'none',borderRadius:6,padding:'8px 18px',fontSize:11,fontWeight:600,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>Launch App</button>
          </div>
        </header>
        <div className="fade-2 lp-rails" style={{position:'absolute',left:20,top:'50%',transform:'translateY(-50%)',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <span style={{writingMode:'vertical-rl',fontSize:10,color:'rgba(240,240,248,0.3)',letterSpacing:'0.15em',textTransform:'uppercase',...mono}}>Transmission № 01</span>
          <div style={{width:1,height:48,background:'rgba(192,57,43,0.3)'}}/>
          <span style={{writingMode:'vertical-rl',fontSize:10,color:'rgba(240,240,248,0.25)',letterSpacing:'0.12em',...mono}}>SOC · Intel · Trace</span>
        </div>
        <div className="fade-2 lp-rails" style={{position:'absolute',right:20,top:'50%',transform:'translateY(-50%)',zIndex:10,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
          <span style={{writingMode:'vertical-rl',transform:'rotate(180deg)',fontSize:10,color:'rgba(240,240,248,0.3)',letterSpacing:'0.12em',...mono}}>Vanishing pt.</span>
          <div style={{width:1,height:36,background:'rgba(192,57,43,0.3)'}}/>
          <span style={{writingMode:'vertical-rl',transform:'rotate(180deg)',fontSize:10,color:'rgba(192,57,43,0.5)',letterSpacing:'0.1em',...mono}}>x{coord.x} · y{coord.y}</span>
        </div>
        <div className="fade-4 lp-hero" style={{position:'absolute',bottom:80,left:48,zIndex:10,maxWidth:820}}>
          <div style={{fontSize:10,letterSpacing:'0.45em',textTransform:'uppercase',color:'#C0392B',...mono,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <span style={{border:'1px solid rgba(192,57,43,0.4)',width:12,height:12,display:'inline-block'}}/>
            Universal Hardware Security Analysis Platform
          </div>
          <h1 style={{fontFamily:'Instrument Serif,Georgia,serif',lineHeight:0.92,letterSpacing:'-0.015em',marginBottom:28}}>
            <div style={{fontSize:'clamp(3rem,8vw,9rem)',color:'#F0F0F8',fontWeight:400}}>When threats rise,</div>
            <div style={{fontSize:'clamp(3rem,8vw,9rem)',color:'#C0392B',fontStyle:'italic',fontWeight:400}}>we trace the storm.</div>
          </h1>
          <div style={{display:'flex',alignItems:'flex-end',gap:48,flexWrap:'wrap'}}>
            <p style={{maxWidth:480,fontSize:13,color:'rgba(240,240,248,0.5)',lineHeight:1.8,...mono,fontWeight:300}}>
              Production-grade SOC platform with endpoint telemetry, hardware attack tool log ingestion, 18 purpose-built forensic analysis tools, multi-AI investigation, IOC correlation across 7 threat intel sources, email forensics, and DORA compliance reporting. The only free platform with physical-layer attack visibility.
            </p>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:6}}>
              <span style={{fontSize:10,color:'rgba(240,240,248,0.35)',letterSpacing:'0.2em',textTransform:'uppercase',...mono}}>Enter the platform</span>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <button onClick={openApp} className="cta-box"><ArrowUpRight size={20} color="#F0F0F8"/></button>
                <button onClick={()=>navigate('/portfolio')} style={{fontSize:11,color:'rgba(240,240,248,0.4)',background:'none',border:'none',cursor:'pointer',...mono,letterSpacing:'0.1em',textTransform:'uppercase'}}>View Portfolio →</button>
              </div>
            </div>
          </div>
        </div>
        <Ticker/>
      </section>

      {/* ══ LIVE STATS ══ */}
      <section style={{background:'#0F1018',borderTop:'1px solid rgba(240,240,248,0.06)',borderBottom:'1px solid rgba(240,240,248,0.06)'}}>
        <div className="lp-grid-4" style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
          {[
            {val:stats.total_cases,   label:'Cases Investigated', color:'#F0F0F8'},
            {val:stats.total_iocs,    label:'IOCs Correlated',    color:'#C0392B'},
            {val:stats.critical_cases,label:'Critical Incidents', color:'#EAB308'},
            {val:stats.vt_lookups,    label:'VT Lookups Run',     color:'#A78BFA'},
          ].map(({val,label,color},i)=>(
            <div key={label} style={{padding:'28px 24px',textAlign:'center',borderRight:i<3?'1px solid rgba(240,240,248,0.06)':'none'}}>
              <div style={{fontSize:'2.2rem',fontWeight:700,color,...mono}}>{(val||0).toLocaleString()}</div>
              <div style={{fontSize:11,color:'rgba(240,240,248,0.35)',marginTop:4,letterSpacing:'0.06em',textTransform:'uppercase',...mono}}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HARDWARE PLATFORM ══ */}
      <section id="hardware" className="lp-section" style={{padding:'90px 48px',background:'#07080F',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:32,flexWrap:'wrap',marginBottom:52}}>
            <div style={{maxWidth:560}}>
              <div style={{fontSize:10,color:'#C0392B',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Session 6 — New</div>
              <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,color:'#F0F0F8',letterSpacing:'-0.02em',lineHeight:1.1}}>
                Hardware attack tools.<br/><span style={{color:'#C0392B',fontStyle:'italic'}}>Analysed by AI.</span>
              </h2>
              <p style={{marginTop:18,fontSize:13,color:'rgba(240,240,248,0.5)',lineHeight:1.8,...mono,fontWeight:300}}>
                The only free SOC tool that ingests logs from physical hardware attack tools — WiFi Pineapple, HackRF, Flipper Zero, Rubber Ducky, Proxmark 3, Suricata, Sysmon, and more. AI parses any format automatically. Everything maps to MITRE ATT&CK.
              </p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10,padding:'20px 24px',background:'rgba(192,57,43,0.05)',border:'1px solid rgba(192,57,43,0.15)',borderRadius:10}}>
              {[
                {Icon:Wifi,  label:'WiFi/RF attacks visible alongside endpoint events'},
                {Icon:Cpu,   label:'AI auto-parses unknown log formats — no parser needed'},
                {Icon:Shield,label:'Every event auto-mapped to MITRE ATT&CK technique'},
                {Icon:Zap,   label:'One-click case creation from any hardware alert'},
              ].map(({Icon,label})=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'rgba(240,240,248,0.7)',...mono}}>
                  <Icon size={14} style={{color:'#C0392B',flexShrink:0}}/>{label}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
            {HARDWARE_TOOLS.map(({cat,color,tools})=>(
              <div key={cat} className="hw-cat-card">
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
                  <div style={{fontWeight:700,fontSize:'0.88rem',color:'#F0F0F8'}}>{cat}</div>
                  <div style={{marginLeft:'auto',fontSize:10,color:'rgba(240,240,248,0.35)',...mono}}>{tools.length} tools</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {tools.map(t=>(
                    <div key={t} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'rgba(240,240,248,0.6)',...mono}}>
                      <ChevronRight size={10} style={{color,flexShrink:0}}/>{t}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:28,textAlign:'center'}}>
            <button onClick={openApp} style={{background:'#C0392B',color:'#fff',border:'none',borderRadius:6,padding:'12px 32px',fontSize:12,fontWeight:600,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>
              Open Hardware Tools →
            </button>
          </div>
        </div>
      </section>

      {/* ══ LIVE DEMO ══ */}
      <section id="demo" className="lp-section" style={{padding:'80px 48px',background:'#0F1018',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{marginBottom:40,display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <div style={{fontSize:10,color:'#C0392B',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Live Intelligence Demo</div>
              <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,color:'#F0F0F8',letterSpacing:'-0.02em',lineHeight:1.1}}>Try the AI<br/><span style={{color:'#C0392B',fontStyle:'italic'}}>right now.</span></h2>
            </div>
            <p style={{maxWidth:360,fontSize:13,color:'rgba(240,240,248,0.45)',lineHeight:1.75,...mono,fontWeight:300}}>Paste any IOC — IP address, domain, URL, or hash. AegisTrace AI returns a real threat assessment in under 2 seconds using Groq's inference engine.</p>
          </div>
          <AIDemo/>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" className="lp-section" style={{padding:'80px 48px',background:'#07080F',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{marginBottom:48}}>
            <div style={{fontSize:10,color:'#C0392B',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Platform Capabilities</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,color:'#F0F0F8',letterSpacing:'-0.02em'}}>Everything a SOC analyst needs.<br/><span style={{color:'rgba(240,240,248,0.3)'}}>Nothing you don't.</span></h2>
          </div>
          <div className="lp-grid-auto" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:14}}>
            {FEATURES.map(({Icon,title,desc,color})=>(
              <div key={title} className="feat-card">
                <Icon size={20} style={{color,marginBottom:14}}/>
                <div style={{fontWeight:600,fontSize:14,marginBottom:8,color:'#F0F0F8'}}>{title}</div>
                <div style={{fontSize:12,color:'rgba(240,240,248,0.45)',lineHeight:1.75,...mono,fontWeight:300}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPETITIVE COMPARISON ══ */}
      <section id="compare" style={{padding:'80px 48px',background:'#0F1018',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1000,margin:'0 auto'}}>
          <div style={{marginBottom:44}}>
            <div style={{fontSize:10,color:'#C0392B',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Competitive Benchmark</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em'}}>Free beats<br/><span style={{color:'#C0392B',fontStyle:'italic'}}>$50,000/year.</span></h2>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',padding:'12px 16px',fontSize:12,color:'rgba(240,240,248,0.4)',fontWeight:400,borderBottom:'1px solid rgba(255,255,255,0.08)',...mono}}>Feature</th>
                  {[{name:'AegisTrace',sub:'Free',color:'#C0392B'},{name:'CrowdStrike',sub:'$~15k/yr',color:'#A78BFA'},{name:'Splunk',sub:'$~25k/yr',color:'#F97316'}].map(h=>(
                    <th key={h.name} style={{textAlign:'center',padding:'12px 24px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                      <div style={{fontWeight:700,fontSize:14,color:h.color}}>{h.name}</div>
                      <div style={{fontSize:10,color:'rgba(240,240,248,0.4)',...mono,marginTop:2}}>{h.sub}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(({feature,at,cs,sp})=>(
                  <tr key={feature} className="compare-row" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'10px 16px',fontSize:13,color:'rgba(240,240,248,0.7)',...mono}}>{feature}</td>
                    {[at,cs,sp].map((v,i)=>(
                      <td key={i} style={{textAlign:'center',padding:'10px 24px'}}>
                        {v ? <Check size={15} style={{color:'#22C55E'}}/> : <X size={14} style={{color:'rgba(113,113,122,0.4)'}}/>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══ AI MODELS ══ */}
      <section style={{padding:'80px 48px',background:'#07080F',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{marginBottom:40}}>
            <div style={{fontSize:10,color:'#C0392B',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ AI Engine</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em'}}>Right model.<br/><span style={{color:'#C0392B',fontStyle:'italic'}}>Right task.</span></h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
            {[
              {model:'llama-3.3-70b-versatile',task:'Case Analysis & Chat',    why:'Best reasoning for complex incident investigation and executive report writing'},
              {model:'mixtral-8x7b-32768',     task:'Email Classification',    why:'Large 32K context window for full header + body phishing analysis'},
              {model:'gemma2-9b-it',           task:'IOC Extraction',          why:'3× faster than 70b for structured JSON extraction from terminal output'},
              {model:'llama-3.1-8b-instant',   task:'Quick Security Q&A',      why:'Sub-200ms for simple binary security questions and quick classification'},
            ].map(({model,task,why})=>(
              <div key={model} style={{background:'rgba(240,240,248,0.02)',border:'1px solid rgba(240,240,248,0.07)',borderRadius:8,padding:'16px 18px'}}>
                <div style={{fontSize:11,color:'#C0392B',...mono,marginBottom:8}}>{model}</div>
                <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>{task}</div>
                <div style={{fontSize:11,color:'rgba(240,240,248,0.4)',...mono,lineHeight:1.6,fontWeight:300}}>{why}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how" style={{padding:'80px 48px',background:'#0F1018',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{marginBottom:48}}>
            <div style={{fontSize:10,color:'#C0392B',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Investigation Workflow</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em'}}>Four steps.<br/><span style={{color:'#C0392B',fontStyle:'italic'}}>One investigation.</span></h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:32}}>
            {[
              {n:'01',title:'Deploy the Agent',    desc:'Drop aegistrace_agent.py on any machine. Python 3.8+, zero dependencies. Collects Sysmon events, auth logs, process trees, and persistence — ships every 5 minutes.'},
              {n:'02',title:'Import + Investigate', desc:'Open a case. Import emails, paste hardware device logs, run VT lookups. AI scores every artifact and maps it to MITRE ATT&CK automatically.'},
              {n:'03',title:'Correlate + Hunt',    desc:'The IOC engine links cases sharing the same infrastructure. Cross-case heatmaps spot campaigns. Hardware tool alerts link to cases directly.'},
              {n:'04',title:'Report + Close',      desc:'AI writes executive summary and technical analysis. Generate PDF, DOCX, or DORA Article 19 report. Closure checklist enforced before case is sealed.'},
            ].map(({n,title,desc})=>(
              <div key={n}>
                <div style={{fontSize:'3.5rem',fontWeight:700,color:'rgba(192,57,43,0.12)',...mono,lineHeight:1,marginBottom:14}}>{n}</div>
                <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>{title}</div>
                <div style={{fontSize:12,color:'rgba(240,240,248,0.45)',lineHeight:1.75,...mono,fontWeight:300}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT / CERTS ══ */}
      <section id="certs" style={{padding:'80px 48px',background:'#07080F',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'start'}}>
          <div>
            <div style={{fontSize:10,color:'#C0392B',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:16}}>◇ About the Builder</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(1.8rem,3.5vw,2.8rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.2,marginBottom:20}}>SOC Analyst.<br/><span style={{color:'#C0392B',fontStyle:'italic'}}>Dublin, Ireland.</span></h2>
            <p style={{fontSize:13,color:'rgba(240,240,248,0.55)',lineHeight:1.85,...mono,fontWeight:300,marginBottom:24}}>
              Prasanna Kumar Surendran — Blue Team L1 analyst and security tooling developer. AegisTrace started as a personal investigation platform and grew into a full SOC solution benchmarked against CrowdStrike. Every feature is built from real analyst pain points.
            </p>
            <div style={{display:'flex',gap:12}}>
              <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:6,color:'rgba(240,240,248,0.5)',textDecoration:'none',fontSize:12,...mono,transition:'color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.5)'}><Github size={14}/> GitHub</a>
              <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:6,color:'rgba(240,240,248,0.5)',textDecoration:'none',fontSize:12,...mono,transition:'color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.5)'}><Linkedin size={14}/> LinkedIn</a>
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#A78BFA',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:16}}>◇ Certifications</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {CERTS.map(({name,full,color,done})=>(
                <div key={name} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:'rgba(255,255,255,0.02)',border:`1px solid ${done?`${color}30`:'rgba(255,255,255,0.06)'}`,borderRadius:8,opacity:done?1:0.65}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:done?color:'rgba(113,113,122,0.4)',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:done?color:'rgba(240,240,248,0.4)',...mono}}>{name}</div>
                    <div style={{fontSize:11,color:'rgba(240,240,248,0.4)',marginTop:2,...mono}}>{full}</div>
                  </div>
                  {done && <Check size={14} style={{color,flexShrink:0}}/>}
                  {!done && <span style={{fontSize:10,color:'rgba(240,240,248,0.3)',...mono}}>In progress</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA + FOOTER ══ */}
      <section style={{padding:'80px 48px 48px',borderTop:'1px solid rgba(240,240,248,0.05)',background:'#0F1018'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:32,marginBottom:64}}>
            <div>
              <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.5rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.05}}>Start your first<br/><span style={{color:'#C0392B',fontStyle:'italic'}}>investigation.</span></h2>
            </div>
            <div style={{display:'flex',gap:12}}>
              <button onClick={openApp} style={{background:'#C0392B',color:'#fff',border:'none',borderRadius:6,padding:'12px 28px',fontSize:12,fontWeight:600,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>Launch App →</button>
              <button onClick={()=>navigate('/public')} style={{background:'transparent',color:'rgba(240,240,248,0.6)',border:'1px solid rgba(240,240,248,0.15)',borderRadius:6,padding:'12px 24px',fontSize:12,cursor:'pointer',...mono,letterSpacing:'0.06em',textTransform:'uppercase'}}>Case Library</button>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16,paddingTop:24,borderTop:'1px solid rgba(240,240,248,0.06)'}}>
            <Logo size={20} showText/>
            <div style={{fontSize:11,color:'rgba(240,240,248,0.25)',...mono}}>Prasanna Kumar Surendran · Dublin, Ireland · 2025–2026</div>
            <div style={{fontSize:10,color:'rgba(240,240,248,0.2)',...mono,letterSpacing:'0.06em'}}>React · FastAPI · Groq · VirusTotal · Shodan · SQLite · Docker · Render</div>
          </div>
        </div>
      </section>
    </div>
  );
}
