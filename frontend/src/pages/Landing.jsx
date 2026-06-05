import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Github, Linkedin, Shield, Brain, Mail, Bug, GitMerge,
  Wrench, FolderSearch, ChevronRight, Loader2, Monitor, Activity, Globe,
  Terminal, Bell, Wifi, Radio, HardDrive, Network, Rss, Cpu, Check, X,
  Zap, Lock, Eye, BarChart3, BookOpen, Users, AlertTriangle, Layers,
  Key, Fingerprint, GitBranch, Database, Search, TrendingUp,
  ShieldCheck, ShieldAlert, UserX, Bot, Crosshair, FileSearch, Boxes,
  Menu, XCircle
} from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';

const openApp = () => window.open('/app/login', '_blank', 'noopener,noreferrer');

/* ═══════════════════════════════════════════════════════════════════════════
   HEX FORTRESS
   ────────────
   A living tessellated shield — the visual metaphor for layered security.

   · Full-screen hexagonal armour grid. Cells nearest the center glow brightest.
   · Defense pulse waves radiate outward from center every ~3.5 s, lighting
     each hex ring as the wave passes — like a sonar ping across the shield.
   · Attack events: every ~8 s, a cluster of red hexes erupts at a random
     screen edge and cascades inward. The "threat front" advances ~3 rows
     before being absorbed — cells return to blue, then calm.
   · Mouse cursor creates an instant bright protective zone on nearby hexes.
   · No dots. No random particles. Pure geometric strength.
═══════════════════════════════════════════════════════════════════════════ */

function HexFortress() {
  const cvRef = useRef(null);
  const mRef  = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, raf, last = 0;

    // ── Hex geometry ─────────────────────────────────────────────────────
    const HS = 34;                           // hex flat-to-flat half-width
    const HW = HS * 1.5;                     // col step
    const HH = HS * Math.sqrt(3);            // row step

    let hexes = [];

    function buildGrid() {
      hexes = [];
      const cols = Math.ceil(W / HW) + 4;
      const rows = Math.ceil(H / HH) + 4;
      for (let c = -2; c < cols; c++) {
        for (let r = -2; r < rows; r++) {
          const x = c * HW;
          const y = r * HH + (c % 2 === 0 ? 0 : HH / 2);
          hexes.push({ x, y, heat: 0, alert: 0 });
        }
      }
    }

    function resize() {
      W = cv.offsetWidth; H = cv.offsetHeight;
      cv.width = W; cv.height = H;
      buildGrid();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const onMouse = e => { mRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMouse);

    // ── Pulse waves ───────────────────────────────────────────────────────
    const pulses = [];
    let pulseCD  = 3200;
    let attackCD = 7500 + Math.random() * 5000;

    function drawHex(hx, hy, size) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a  = (i * Math.PI / 3) - Math.PI / 6;
        const px = hx + size * Math.cos(a);
        const py = hy + size * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    function frame(ts) {
      const dt = Math.min(ts - last, 40);
      last = ts;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const maxD = Math.hypot(cx, cy);
      const { x: mx, y: my } = mRef.current;

      // ── Timers ────────────────────────────────────────────────────────
      pulseCD  -= dt;
      attackCD -= dt;

      if (pulseCD <= 0) {
        pulses.push({ r: 0, alpha: 0.85, speed: 0.095 });
        pulseCD = 3000 + Math.random() * 2200;
      }

      if (attackCD <= 0) {
        // Pick a random edge cluster
        const edge = Math.floor(Math.random() * 4);
        let ex, ey;
        if (edge === 0) { ex = Math.random() * W; ey = -HS * 2; }
        else if (edge === 1) { ex = W + HS * 2; ey = Math.random() * H; }
        else if (edge === 2) { ex = Math.random() * W; ey = H + HS * 2; }
        else               { ex = -HS * 2; ey = Math.random() * H; }
        // Mark nearby hexes as alert
        hexes.forEach(h => {
          const d = Math.hypot(h.x - ex, h.y - ey);
          if (d < HS * 5) h.alert = 1.0 + (1 - d / (HS * 5)) * 0.5;
        });
        attackCD = 7000 + Math.random() * 6000;
      }

      // ── Update pulses ─────────────────────────────────────────────────
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].r     += pulses[i].speed * dt;
        pulses[i].alpha -= 0.00085 * dt;
        if (pulses[i].alpha <= 0 || pulses[i].r > maxD * 1.1) pulses.splice(i, 1);
      }

      // ── Draw hexes ────────────────────────────────────────────────────
      hexes.forEach(h => {
        const dCenter = Math.hypot(h.x - cx, h.y - cy);
        const dMouse  = Math.hypot(h.x - mx, h.y - my);

        // Alert decay (red threats fade out)
        if (h.alert > 0) h.alert = Math.max(0, h.alert - dt * 0.00088);

        // Base: center cells glow brighter
        const baseBright = Math.max(0.018, (1 - dCenter / (maxD * 1.1)) * 0.11);

        // Pulse heat: ring of brightness from each wave
        let pulseHeat = 0;
        pulses.forEach(p => {
          const diff = Math.abs(dCenter - p.r);
          const band = HS * 3.2;
          if (diff < band) {
            pulseHeat = Math.max(pulseHeat, (1 - diff / band) * p.alpha * 0.55);
          }
        });

        // Mouse proximity glow
        const mouseGlow = dMouse < 90 ? (1 - dMouse / 90) * 0.72 : 0;

        const totalBright = baseBright + pulseHeat + mouseGlow;
        const isAlert = h.alert > 0.05;

        // Fill
        drawHex(h.x, h.y, HS - 2.5);
        if (isAlert) {
          ctx.fillStyle = `rgba(239,68,68,${h.alert * 0.13})`;
        } else {
          ctx.fillStyle = `rgba(77,163,255,${totalBright * 0.55})`;
        }
        ctx.fill();

        // Stroke
        drawHex(h.x, h.y, HS - 1.5);
        if (isAlert) {
          ctx.strokeStyle = `rgba(239,68,68,${Math.min(0.75, h.alert * 0.65)})`;
          ctx.lineWidth   = h.alert > 0.55 ? 1.2 : 0.65;
        } else {
          ctx.strokeStyle = `rgba(77,163,255,${Math.min(0.28, totalBright * 2.8)})`;
          ctx.lineWidth   = mouseGlow > 0.1 ? 0.9 : 0.45;
        }
        ctx.stroke();
      });

      // ── Radial vignette ───────────────────────────────────────────────
      const vig = ctx.createRadialGradient(cx, cy, H * 0.08, cx, cy, H * 0.88);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0,0,0,0.86)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return <canvas ref={cvRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

function Clock() {
  const [t,setT]=useState('');
  useEffect(()=>{ const tick=()=>setT(new Date().toUTCString().slice(17,25)+' UTC'); tick(); const id=setInterval(tick,1000); return()=>clearInterval(id); },[]);
  return <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'rgba(240,240,248,0.45)',letterSpacing:'0.06em'}}>{t}</span>;
}

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
  const riskColor={Critical:'#EF4444',High:'#4DA3FF',Medium:'#EAB308',Low:'#22C55E',Clean:'#22C55E',Unknown:'#888888'};
  const verdictColor={Malicious:'#EF4444',Suspicious:'#EAB308',Clean:'#22C55E',Unknown:'#888888'};
  const mono={fontFamily:'JetBrains Mono,monospace'};
  return (
    <div style={{background:'rgba(240,240,248,0.02)',border:'1px solid rgba(240,240,248,0.08)',borderRadius:10,padding:24}}>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {EXAMPLES.map(e=>(
          <button key={e} onClick={()=>analyse(e)} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:4,padding:'4px 10px',fontSize:11,color:'rgba(240,240,248,0.6)',cursor:'pointer',...mono}}>{e.slice(0,28)}{e.length>28?'…':''}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:10}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyse()} placeholder="Paste any IOC — IP, domain, URL, hash…" style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'10px 14px',color:'#EBEBEB',outline:'none',fontSize:13,...mono}} />
        <button onClick={()=>analyse()} disabled={loading} style={{background:'#4DA3FF',color:'#fff',border:'none',borderRadius:6,padding:'10px 20px',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:8,...mono,whiteSpace:'nowrap'}}>
          {loading?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<Zap size={14}/>}
          {loading?'Analysing…':'Analyse'}
        </button>
      </div>
      {result&&!result.error&&(
        <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:16}}>
            <div style={{fontSize:10,color:'rgba(240,240,248,0.4)',letterSpacing:'0.12em',textTransform:'uppercase',...mono,marginBottom:8}}>Verdict</div>
            <div style={{fontSize:'1.4rem',fontWeight:700,color:verdictColor[result.verdict]||'#787878',...mono}}>{result.verdict}</div>
            <div style={{marginTop:4,fontSize:11,color:'rgba(240,240,248,0.5)',...mono}}>{result.type}</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:16}}>
            <div style={{fontSize:10,color:'rgba(240,240,248,0.4)',letterSpacing:'0.12em',textTransform:'uppercase',...mono,marginBottom:8}}>Risk Level</div>
            <div style={{fontSize:'1.4rem',fontWeight:700,color:riskColor[result.risk_level]||'#787878',...mono}}>{result.risk_level}</div>
            <div style={{marginTop:4,fontSize:11,color:'rgba(240,240,248,0.5)',...mono}}>Confidence: {result.confidence}%</div>
          </div>
          <div style={{gridColumn:'1/-1',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:8,padding:16}}>
            <div style={{fontSize:12,color:'rgba(240,240,248,0.8)',lineHeight:1.7,...mono}}>{result.summary}</div>
            {result.recommendation&&<div style={{marginTop:8,fontSize:11,color:'rgba(240,240,248,0.5)',borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:8,...mono}}><strong style={{color:'#4DA3FF'}}>Next step:</strong> {result.recommendation}</div>}
          </div>
        </div>
      )}
      {result?.error&&<div style={{marginTop:12,padding:'10px 14px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:6,fontSize:12,color:'#EF4444',...mono}}>{result.summary}</div>}
    </div>
  );
}

function Ticker() {
  const items='◇ Trust Operating System · Identity · Provenance · Control · ◇ ITDR — Credential Stuffing · Impossible Travel · Privilege Escalation · ◇ Identity Graph · Trust Timeline · Provenance Ledger · Pluggable Risk Engine · ◇ Endpoint Agent v5 · Honey Token Trap · DNS/DGA Detection · Auto-Block · YARA-lite · Guardian Process · ◇ 18 Hardware Analysis Tools · WiFi Pineapple · HackRF One · Flipper Zero · Proxmark3 · ◇ AI Case Analysis · MITRE ATT&CK · IOC Correlation · Explainable AI · ◇ VirusTotal v3 · Shodan · MalwareBazaar · URLhaus · ThreatFox · GreyNoise · ◇ Email Forensics · DORA Article 19 · Webhook Alerting · ◇ Terminal Lab · Log Parsing · IOC Extraction · ◇ AI Agent Security · Bounded Autonomy · Human Approval Queue · ◇ Policy Engine · Trust Validation · Anomaly Detection · ◇ Free. Open. Deployable. · ';
  return (
    <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:10,height:32,overflow:'hidden',background:'rgba(5,5,5,0.7)',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center'}}>
      <div style={{display:'flex',animation:'marquee 60s linear infinite',whiteSpace:'nowrap'}}>
        {[items,items].map((s,i)=><span key={i} style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'rgba(240,240,248,0.3)',letterSpacing:'0.1em',paddingRight:0}}>{s}</span>)}
      </div>
    </div>
  );
}

/* ─── DATA ──────────────────────────────────────────────────────────────── */
const FEATURES = [
  { Icon:ShieldAlert,  title:'ITDR — Identity Threat Detection', desc:'Four real-time detectors: credential stuffing (5+ failed logins), impossible travel (different continents < 4h), new device login, unapproved privilege escalation. Paste auth logs or enter events manually.', color:'#EF4444' },
  { Icon:Fingerprint,  title:'Identity Risk Engine',  desc:'Pluggable detector architecture: register new risk detectors without touching the core. Ships with AnomalyCountDetector, LastSeenDetector, CompromisedFlagDetector. Every recalculation is logged to audit trail.', color:'#4DA3FF' },
  { Icon:FolderSearch, title:'Case Management',       desc:'13-tab lifecycle: overview, investigation, IOCs, terminal, timeline, trust timeline, playbook, AI analysis, AI chat, comments, provenance, report, EDR. Autosave, MITRE mapping, SLA breach badges.', color:'#A78BFA' },
  { Icon:GitMerge,     title:'Identity Graph + Trust', desc:'Force-directed canvas graph of users, service accounts, API keys, tokens, devices, AI agents. Add anomalies per node, recalculate risk scores, track trust events per investigation.', color:'#EAB308' },
  { Icon:Brain,        title:'Explainable AI',        desc:'Multi-model Groq routing with full reasoning chain. Every verdict shows evidence used, reasoning steps, what-could-be-wrong, and confidence. No black boxes. Provenance ledger records every AI action.', color:'#22C55E' },
  { Icon:Shield,       title:'7-Source IOC Intel',    desc:'VirusTotal v3 + Shodan, MalwareBazaar, URLhaus, ThreatFox, GreyNoise, IPInfo — all queried in parallel. Results saved to history and correlated cross-case to detect campaigns.', color:'#4DA3FF' },
  { Icon:Mail,         title:'Email Forensics',       desc:'Full RFC header parsing, SPF/DKIM/DMARC validation, routing hop extraction, AI phishing verdict with confidence scoring and MITRE ATT&CK technique mapping.', color:'#A78BFA' },
  { Icon:Monitor,      title:'Endpoint Agent v5',     desc:'Production-grade Python EDR for Windows/Linux/Mac. Honey Token Trap (canary files, zero false positives), DNS/DGA detection, auto-block engine, YARA-lite, USB + registry monitoring. Multi-backend failover. Guardian process.', color:'#EAB308' },
  { Icon:Terminal,     title:'Terminal Lab',          desc:'Private Linux-style analyst workspace. Simulated mode for 20+ commands. AI parses every output, extracts IOCs, maps to MITRE. Save sessions to cases.', color:'#22C55E' },
  { Icon:Activity,     title:'Threat Hunting',        desc:'Cross-case IOC correlation, MITRE heatmap, campaign detection, saved queries. Spots attacker infrastructure reuse across all your investigations.', color:'#4DA3FF' },
  { Icon:Globe,        title:'DORA Compliance',       desc:'One-click Article 19 Major ICT Incident Report PDF. Maps 5 DORA pillars to live case data. Built for EU financial services regulated firms.', color:'#A78BFA' },
  { Icon:Bell,         title:'Policy Engine + Alerts', desc:'Create access-control policies per identity type. Validate actions against allow/deny lists, IP restrictions, time windows. Slack-compatible HMAC-signed webhooks.', color:'#EAB308' },
];

const HARDWARE_TOOLS = [
  { cat:'WiFi Attack', color:'#4DA3FF', tools:['Probe Request Analyser','Evil Twin Detector','Deauth Attack Timeline','Handshake Inspector'] },
  { cat:'RF / Radio',  color:'#A78BFA', tools:['Spectrum Analyser','Replay Attack Detector','Jamming Detector'] },
  { cat:'USB / HID',   color:'#EAB308', tools:['Keystroke Injection Analyser','Payload Decoder','Encoded Command Decoder'] },
  { cat:'Network',     color:'#22C55E', tools:['Suricata IDS Parser','ARP Poison Detector','DNS Query Analyser','Lateral Movement Tracer'] },
  { cat:'RFID / NFC',  color:'#00bfff', tools:['Card Clone Detector','RFID Brute Force Detector'] },
  { cat:'Endpoint',    color:'#4DA3FF', tools:['Sysmon Event Parser','Process Tree Analyser'] },
  { cat:'Universal',   color:'#A78BFA', tools:['AI Universal Parser'] },
];

const COMPARE = [
  { feature:'Case management lifecycle',        at:true, cs:true,  sp:true  },
  { feature:'Multi-model AI analysis',          at:true, cs:true,  sp:true  },
  { feature:'7-source IOC enrichment',          at:true, cs:false, sp:true  },
  { feature:'Email forensics (SPF/DKIM/DMARC)', at:true, cs:false, sp:false },
  { feature:'DORA Article 19 compliance report', at:true, cs:false, sp:false },
  { feature:'Hardware tool log ingestion',      at:true, cs:false, sp:false },
  { feature:'AI auto-parse any log format',     at:true, cs:false, sp:false },
  { feature:'18 hardware forensic tools',       at:true, cs:false, sp:false },
  { feature:'Physical layer (RF/WiFi/RFID)',    at:true, cs:false, sp:false },
  { feature:'Identity graph + trust timeline',  at:true, cs:false, sp:false },
  { feature:'Provenance ledger for AI actions', at:true, cs:false, sp:false },
  { feature:'Private terminal lab + sandbox',   at:true, cs:false, sp:false },
  { feature:'PCAP analysis',                    at:true, cs:true,  sp:true  },
  { feature:'Webhook alerting',                 at:true, cs:true,  sp:true  },
  { feature:'Public case library',              at:true, cs:false, sp:false },
  { feature:'Free / self-hosted',               at:true, cs:false, sp:false },
];

const CERTS = [
  { name:'SC-200', full:'Microsoft Security Operations Analyst', color:'#0078D4', done:true },
  { name:'Sec+',   full:'CompTIA Security+', color:'#C8102E', done:true },
  { name:'TCM PEH',full:'TCM Practical Ethical Hacking', color:'#22C55E', done:true },
  { name:'BTL1',   full:'Blue Team Level 1 (55%)', color:'#F97316', done:false },
  { name:'eJPT',   full:'eLearnSecurity Junior Penetration Tester (20%)', color:'#A78BFA', done:false },
  { name:'SC-300', full:'Microsoft Identity & Access Administrator (15%)', color:'#0078D4', done:false },
];

const ROADMAP = [
  {
    phase:'Live — v2.0 → v4.3', status:'live', color:'#22C55E',
    items:['SOC case management — 13-tab lifecycle, autosave, MITRE mapping','Explainable multi-model AI (Groq) — reasoning chain, evidence, confidence','7-source IOC enrichment + cross-case correlation + campaign detection','ITDR — credential stuffing, impossible travel, new device, privilege escalation','Identity Graph + Pluggable Risk Engine + 3 detectors','Trust Timeline + Provenance Ledger — every AI action audited','Policy Engine — allow/deny per identity type, IP + time restrictions','Terminal Lab — 20+ commands, AI parsing, IOC extraction, save to case','Endpoint agent v2 — Sysmon, process trees, persistence, auth logs','18 hardware forensic tools (WiFi/RF/RFID/HID/Suricata)','Email forensics — SPF/DKIM/DMARC, AI phishing verdict','DORA Article 19 compliance + PCAP analysis + webhook alerting','Dashboard analytics — severity breakdown chart + SLA status panel','Investigation templates — 6 pre-built scaffolds (phishing, brute force, malware…)','Report completeness preview — 7-section checklist before export','Public case narrative — story format: Trigger → Investigation → Findings → Outcome']
  },
  {
    phase:'In Progress — v4.3', status:'building', color:'#EAB308',
    items:['AI Agent Security ✓ — human approval queue for all AI actions (shipped)','Shadow AI Detection — detect data sent to unauthorized AI services','SOAR Playbooks — automated response sequences per incident type','Control Plane view — live trust, policy, and agent health dashboard']
  },
  {
    phase:'Planned — v5.0', status:'planned', color:'#A78BFA',
    items:['Agent Supervision Console — supervise AI agents with kill switches','Attacker Path Reconstruction — visual kill-chain across human + machine actors','AI Memory across cases — pattern recognition from investigation history','Crypto + Quantum Readiness — certificate inventory, post-quantum flags','Machine Identity incidents — rogue API keys, service accounts','Future-narrative reporting — board-level attacker stories']
  }
];

const PROBLEMS = [
  { Icon:UserX,       title:'Attackers no longer break in — they become trusted', desc:'They log in with stolen credentials, abuse hijacked tokens, or impersonate service accounts. The breach starts the moment a malicious actor is granted trust. Traditional SOC tools track machines. AegisTrace tracks trust.', color:'#4DA3FF' },
  { Icon:Bot,         title:'AI agents are becoming attack surfaces',   desc:'The rise of autonomous agents means attackers can hijack a workflow, poison an AI prompt, or impersonate an API key. Security teams need to supervise non-human identities the same way they supervise people.', color:'#A78BFA' },
  { Icon:ShieldAlert, title:'Black-box AI is unacceptable in security', desc:'If your SIEM or AI tool cannot explain why it flagged something — cannot show you the evidence, the reasoning chain, and the confidence — then you cannot trust it in production. AegisTrace shows its work.', color:'#EAB308' },
  { Icon:Boxes,       title:'Static dashboards cannot handle machine-speed threats', desc:'Modern attacks happen faster than analysts can react. The future of security operations is a live control plane: identity states, agent actions, trust events, and policy decisions visible in real time.', color:'#22C55E' },
];

const PILLARS = [
  { Icon:Fingerprint, label:'Identity',        desc:'Every actor — human, service, agent, or token — modelled as a first-class entity with risk score and trust history.' },
  { Icon:GitBranch,   label:'Provenance',      desc:'Every AI output, tool result, and case action carries full provenance: who, what model, what evidence, what confidence.' },
  { Icon:Layers,      label:'Trust',           desc:'Trust is not assumed. It is tracked, inherited, challenged, and revocable. A trust timeline sits beside every incident.' },
  { Icon:ShieldCheck, label:'Explainability',  desc:'No black boxes. Every AI verdict shows its reasoning chain, the evidence that supports it, and what could be wrong.' },
  { Icon:Crosshair,   label:'Control',         desc:'Human analysts remain in control. AI suggests. Humans confirm. Every automation has an approval layer and an audit trail.' },
  { Icon:TrendingUp,  label:'Evolution',       desc:'Built to remain relevant 10–15 years from now — when quantum threats, machine identities, and AI attackers are normal.' },
];

/* ─── Bento Feature Grid ─────────────────────────────────────────────────── */
function BentoFeatures({ mono }) {
  return (
    <div className='bento-grid-inner' style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:12,maxWidth:1200,margin:'0 auto'}}>
      {/* ITDR — tall card */}
      <div className="bento-card" style={{gridColumn:'span 5',gridRow:'span 2',background:'rgba(239,68,68,0.04)',border:'1px solid rgba(239,68,68,0.18)',borderRadius:14,padding:26,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(239,68,68,0.07)',filter:'blur(20px)'}}/>
        <ShieldAlert size={26} style={{color:'#EF4444',marginBottom:14}}/>
        <div style={{fontWeight:700,fontSize:'1rem',marginBottom:8,color:'#EBEBEB'}}>ITDR — Identity Threat Detection</div>
        <div style={{fontSize:12,color:'rgba(240,240,248,0.5)',lineHeight:1.75,...mono,fontWeight:300,marginBottom:18}}>Four real-time detectors: credential stuffing, impossible travel, new device login, unapproved privilege escalation. Paste auth logs or enter events manually.</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {['Credential stuffing detector','Impossible travel (continents < 4h)','New device login alert','Privilege escalation detector'].map(d=>(
            <div key={d} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,...mono,color:'rgba(240,240,248,0.55)'}}>
              <div style={{width:4,height:4,borderRadius:'50%',background:'#EF4444',flexShrink:0}}/>
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Explainable AI — wide */}
      <div className="bento-card" style={{gridColumn:'span 7',background:'rgba(34,197,94,0.04)',border:'1px solid rgba(34,197,94,0.14)',borderRadius:14,padding:22,display:'flex',gap:18,alignItems:'center'}}>
        <Brain size={26} style={{color:'#22C55E',flexShrink:0}}/>
        <div>
          <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>Explainable AI — No Black Boxes</div>
          <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>Multi-model Groq routing. Every verdict shows evidence used, reasoning steps, what-could-be-wrong, and confidence. Provenance ledger records every AI action.</div>
        </div>
      </div>

      {/* Case Management */}
      <div className="bento-card" style={{gridColumn:'span 4',background:'rgba(167,139,250,0.04)',border:'1px solid rgba(167,139,250,0.14)',borderRadius:14,padding:22}}>
        <FolderSearch size={20} style={{color:'#A78BFA',marginBottom:10}}/>
        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>Case Management</div>
        <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>13-tab lifecycle: IOCs, terminal, timeline, trust timeline, playbook, AI analysis, AI chat, provenance, report, EDR. Autosave + MITRE mapping.</div>
      </div>

      {/* Identity Graph */}
      <div className="bento-card" style={{gridColumn:'span 3',background:'rgba(234,179,8,0.04)',border:'1px solid rgba(234,179,8,0.16)',borderRadius:14,padding:22}}>
        <GitMerge size={20} style={{color:'#EAB308',marginBottom:10}}/>
        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>Identity Graph</div>
        <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>Force-directed canvas of users, service accounts, API keys, tokens, devices, AI agents.</div>
      </div>

      {/* IOC Intel */}
      <div className="bento-card" style={{gridColumn:'span 4',background:'rgba(77,163,255,0.04)',border:'1px solid rgba(77,163,255,0.16)',borderRadius:14,padding:22}}>
        <Shield size={20} style={{color:'#4DA3FF',marginBottom:10}}/>
        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>7-Source IOC Intel</div>
        <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>VirusTotal v3 · Shodan · MalwareBazaar · URLhaus · ThreatFox · GreyNoise · IPInfo — all in parallel.</div>
      </div>

      {/* Terminal Lab */}
      <div className="bento-card" style={{gridColumn:'span 3',background:'rgba(34,197,94,0.03)',border:'1px solid rgba(34,197,94,0.12)',borderRadius:14,padding:22}}>
        <Terminal size={20} style={{color:'#22C55E',marginBottom:10}}/>
        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>Terminal Lab</div>
        <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>Private analyst workspace. 20+ commands. AI parses every output + saves to cases.</div>
      </div>

      {/* Email Forensics */}
      <div className="bento-card" style={{gridColumn:'span 5',background:'rgba(167,139,250,0.03)',border:'1px solid rgba(167,139,250,0.1)',borderRadius:14,padding:22}}>
        <Mail size={20} style={{color:'#A78BFA',marginBottom:10}}/>
        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>Email Forensics</div>
        <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>Full RFC header parsing, SPF/DKIM/DMARC validation, routing hop extraction, AI phishing verdict with MITRE ATT&CK mapping.</div>
      </div>

      {/* Endpoint Agent */}
      <div className="bento-card" style={{gridColumn:'span 4',background:'rgba(234,179,8,0.03)',border:'1px solid rgba(234,179,8,0.1)',borderRadius:14,padding:22}}>
        <Monitor size={20} style={{color:'#EAB308',marginBottom:10}}/>
        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>Endpoint Agent v5 <span style={{fontSize:9,background:'rgba(234,179,8,0.15)',border:'1px solid rgba(234,179,8,0.3)',color:'#EAB308',borderRadius:3,padding:'1px 5px',marginLeft:4,verticalAlign:'middle'}}>NEW</span></div>
        <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>🍯 Honey Token Trap · DNS/DGA · Auto-Block · YARA-lite · USB + Registry · Guardian Process · Multi-backend failover. Linux/macOS/Windows.</div>
      </div>

      {/* Identity Auto-Discovery — v4.3 new */}
      <div className="bento-card" style={{gridColumn:'span 4',background:'rgba(77,163,255,0.04)',border:'1px solid rgba(77,163,255,0.18)',borderRadius:14,padding:22}}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#4DA3FF" strokeWidth={2} style={{marginBottom:10}}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>Identity Auto-Discovery</div>
        <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>Connect Azure AD, Okta, or Google. Your entire identity surface discovered in 5 minutes. No spreadsheets.</div>
      </div>

      {/* NHI Health Monitor — v4.3 new */}
      <div className="bento-card" style={{gridColumn:'span 4',background:'rgba(167,139,250,0.04)',border:'1px solid rgba(167,139,250,0.16)',borderRadius:14,padding:22}}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth={2} style={{marginBottom:10}}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:6,color:'#EBEBEB'}}>NHI Health Monitor</div>
        <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>Stale tokens. Orphaned accounts. Over-privileged service accounts. Surfaced automatically before attackers find them.</div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_cases:12, total_iocs:847, critical_cases:3, vt_lookups:234 });
  const [coord, setCoord] = useState({ x:'0.0', y:'0.0' });
  const [scrolled, setScrolled] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(()=>{
    api.get('/api/portfolio/stats').then(r=>setStats(s=>({...s,...r.data}))).catch(()=>{});
    const onMouse=e=>setCoord({x:(e.clientX/window.innerWidth*100).toFixed(1),y:(e.clientY/window.innerHeight*100).toFixed(1)});
    const onScroll=()=>setScrolled(window.scrollY>40);
    window.addEventListener('mousemove',onMouse);
    window.addEventListener('scroll',onScroll);
    return()=>{window.removeEventListener('mousemove',onMouse);window.removeEventListener('scroll',onScroll);}
  },[]);
  const mono={fontFamily:'JetBrains Mono,monospace'};

  const NAV_LINKS = [['#problem','Problem'],['#vision','Vision'],['#features','Features'],['#hardware','Hardware'],['#demo','Demo'],['#roadmap','Roadmap'],['#certs','About']];

  return (
    <div style={{background:'#0A0A0A',color:'#EBEBEB',minHeight:'100vh',cursor:'default',overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-40px) scale(1.06)}66%{transform:translate(-20px,25px) scale(0.94)}}
        @keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.85);opacity:0.4}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes shimmer{0%{opacity:0.4}50%{opacity:1}100%{opacity:0.4}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        ::selection{background:rgba(77,163,255,0.4);color:#fff}
        .fade-1{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.05s both}
        .fade-2{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.2s both}
        .fade-4{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.65s both}
        .nav-link{color:rgba(240,240,248,0.5);text-decoration:none;transition:color 0.2s;font-size:11px;letter-spacing:0.12em;text-transform:uppercase}
        .nav-link:hover{color:#4DA3FF}
        .bento-card{transition:transform 0.2s,border-color 0.2s;cursor:default}
        .bento-card:hover{transform:translateY(-3px)}
        .feat-card{background:rgba(240,240,248,0.02);border:1px solid rgba(240,240,248,0.07);border-radius:10px;padding:22px;transition:border-color 0.2s,background 0.2s,transform 0.2s;cursor:default}
        .feat-card:hover{border-color:rgba(77,163,255,0.35);background:rgba(77,163,255,0.03);transform:translateY(-2px)}
        .hw-cat-card{background:rgba(240,240,248,0.02);border:1px solid rgba(240,240,248,0.07);border-radius:10px;padding:20px;transition:all 0.2s}
        .hw-cat-card:hover{border-color:rgba(77,163,255,0.3);background:rgba(77,163,255,0.025)}
        .compare-row:hover td{background:rgba(255,255,255,0.02)}
        .pillar-card{background:rgba(240,240,248,0.02);border:1px solid rgba(240,240,248,0.06);border-radius:10px;padding:24px;transition:all 0.25s}
        .pillar-card:hover{border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.03);transform:translateY(-2px)}
        .problem-card{background:rgba(240,240,248,0.02);border:1px solid rgba(240,240,248,0.07);border-radius:10px;padding:28px;transition:all 0.2s}
        .problem-card:hover{transform:translateY(-2px)}
        .stat-float{animation:floatY 3s ease-in-out infinite}
        /* Mobile nav drawer */
        .mobile-nav-drawer{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.97);z-index:200;display:flex;flex-direction:column;padding:24px;backdrop-filter:blur(20px)}
        @media(max-width:900px){
          .lp-rails{display:none!important}
          .desktop-nav{display:none!important}
          .lp-section{padding:48px 20px!important}
          .lp-grid-4{grid-template-columns:1fr 1fr!important}
          .lp-2col{grid-template-columns:1fr!important;gap:28px!important}
          .hero-grid{grid-template-columns:1fr!important;gap:24px!important;padding:0 20px!important}
          .bento-grid-inner>div{grid-column:span 12!important;grid-row:span 1!important}
          .stat-float{animation:none!important}
        }
        @media(min-width:901px){.mobile-menu-btn{display:none!important}}
        @media(max-width:600px){
          .lp-grid-4{grid-template-columns:1fr!important}
          .lp-section{padding:36px 16px!important}
        }
      `}</style>

      {/* ══ STICKY NAV ══ */}
      <header className="fade-1" style={{position:'fixed',top:0,left:0,right:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 32px',background:scrolled?'rgba(8,12,20,0.95)':'transparent',backdropFilter:scrolled?'blur(16px)':'none',borderBottom:`1px solid ${scrolled?'rgba(240,240,248,0.08)':'rgba(240,240,248,0.04)'}`,transition:'all 0.3s'}}>
        <Logo size={24} showText/>

        {/* Desktop nav */}
        <nav className="desktop-nav" style={{display:'flex',gap:22,alignItems:'center'}}>
          {NAV_LINKS.map(([href,label])=>(
            <a key={href} href={href} className="nav-link" onClick={e=>{e.preventDefault();document.querySelector(href)?.scrollIntoView({behavior:'smooth'});}}>{label}</a>
          ))}
          <a href="/mission" className="nav-link" style={{color:'#4A8EDB'}}>Mission</a>
          <a href="/portfolio" className="nav-link">Portfolio</a>
          <a href="/agent-setup" className="nav-link">Agent</a>
        </nav>

        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#4DA3FF',animation:'pulse-dot 1.8s ease-in-out infinite'}}/>
          <Clock/>
          <button onClick={openApp} style={{background:'#4DA3FF',color:'white',border:'none',borderRadius:6,padding:'8px 18px',fontSize:11,fontWeight:600,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>Launch App</button>
          {/* Mobile menu toggle */}
          <button className="mobile-menu-btn" onClick={()=>setMobileNav(true)} style={{background:'none',border:'1px solid rgba(240,240,248,0.15)',borderRadius:6,padding:'7px 9px',cursor:'pointer',color:'#EBEBEB',display:'flex',alignItems:'center'}}>
            <Menu size={16}/>
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileNav && (
        <div className="mobile-nav-drawer">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:32}}>
            <Logo size={22} showText/>
            <button onClick={()=>setMobileNav(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(240,240,248,0.6)'}}><XCircle size={22}/></button>
          </div>
          {[...NAV_LINKS.map(([href,label])=>[href,label,false]),
            ['/mission','Mission',true],['/portfolio','Portfolio',false],['/agent-setup','Agent Setup',false]
          ].map(([href,label,accent])=>(
            <a key={href} href={href}
              onClick={e=>{if(href.startsWith('#')){e.preventDefault();setMobileNav(false);document.querySelector(href)?.scrollIntoView({behavior:'smooth'});}else{setMobileNav(false);}}}
              style={{display:'block',padding:'14px 0',fontSize:16,color:accent?'#4DA3FF':'rgba(240,240,248,0.75)',textDecoration:'none',borderBottom:'1px solid rgba(255,255,255,0.05)',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>{label}</a>
          ))}
          <button onClick={()=>{openApp();setMobileNav(false);}} style={{marginTop:24,background:'#4DA3FF',color:'#fff',border:'none',borderRadius:8,padding:'14px',fontSize:13,fontWeight:700,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>Launch App →</button>
        </div>
      )}

      {/* ══ HERO — SPLIT LAYOUT ══ */}
      <section style={{position:'relative',width:'100%',height:'100vh',overflow:'hidden'}}>
        <HexFortress/>
        <div className="lp-rails" style={{position:'absolute',left:20,top:'50%',transform:'translateY(-50%)',zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <span style={{writingMode:'vertical-rl',fontSize:10,color:'rgba(240,240,248,0.3)',letterSpacing:'0.15em',textTransform:'uppercase',...mono}}>Transmission № 01</span>
          <div style={{width:1,height:48,background:'rgba(77,163,255,0.3)'}}/>
          <span style={{writingMode:'vertical-rl',fontSize:10,color:'rgba(240,240,248,0.25)',letterSpacing:'0.12em',...mono}}>SOC · Intel · Trace</span>
        </div>
        <div className="lp-rails" style={{position:'absolute',right:20,top:'50%',transform:'translateY(-50%)',zIndex:10,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
          <span style={{writingMode:'vertical-rl',transform:'rotate(180deg)',fontSize:10,color:'rgba(240,240,248,0.3)',letterSpacing:'0.12em',...mono}}>Vanishing pt.</span>
          <div style={{width:1,height:36,background:'rgba(77,163,255,0.3)'}}/>
          <span style={{writingMode:'vertical-rl',transform:'rotate(180deg)',fontSize:10,color:'rgba(77,163,255,0.5)',letterSpacing:'0.1em',...mono}}>x{coord.x} · y{coord.y}</span>
        </div>

        {/* Split hero content */}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',zIndex:10,paddingTop:64}}>
          <div className="fade-4 hero-grid" style={{maxWidth:1200,margin:'0 auto',padding:'0 56px',width:'100%',display:'grid',gridTemplateColumns:'1.2fr 0.8fr',gap:56,alignItems:'center'}}>
            {/* Left: headline */}
            <div>
              <div style={{fontSize:10,letterSpacing:'0.45em',textTransform:'uppercase',color:'#4DA3FF',...mono,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                <span style={{border:'1px solid rgba(77,163,255,0.4)',width:12,height:12,display:'inline-block'}}/>
                Trust · Identity · Provenance · Control Plane
              </div>
              <h1 style={{fontFamily:'Instrument Serif,Georgia,serif',lineHeight:0.92,letterSpacing:'-0.015em',marginBottom:28}}>
                <div style={{fontSize:'clamp(2.8rem,7vw,8.5rem)',color:'#EBEBEB',fontWeight:400}}>Attackers no longer break in.</div>
                <div style={{fontSize:'clamp(2.8rem,7vw,8.5rem)',color:'#4DA3FF',fontStyle:'italic',fontWeight:400}}>They become trusted.</div>
              </h1>
              <p style={{maxWidth:520,fontSize:13,color:'rgba(240,240,248,0.5)',lineHeight:1.8,...mono,fontWeight:300,marginBottom:14}}>
                AegisTrace is not just a SOC dashboard — it is a security control plane built for the AI-agent era. Identity-centric. Provenance-aware. Explainable.
              </p>
              <p style={{maxWidth:520,fontSize:12,color:'rgba(77,163,255,0.7)',lineHeight:1.7,...mono,fontWeight:300,marginBottom:28,borderLeft:'2px solid rgba(77,163,255,0.3)',paddingLeft:12}}>
                The average enterprise has <strong style={{color:'#4DA3FF'}}>144 machine identities</strong> for every human. Most are unmonitored.
              </p>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <button onClick={openApp} style={{background:'#4DA3FF',color:'#fff',border:'none',borderRadius:6,padding:'12px 28px',fontSize:12,fontWeight:600,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase',display:'flex',alignItems:'center',gap:8}}>
                  <ArrowUpRight size={14}/>Launch Platform
                </button>
                <button onClick={()=>navigate('/portfolio')} style={{background:'transparent',color:'rgba(240,240,248,0.5)',border:'1px solid rgba(240,240,248,0.15)',borderRadius:6,padding:'12px 22px',fontSize:12,cursor:'pointer',...mono,letterSpacing:'0.06em',textTransform:'uppercase'}}>View Portfolio →</button>
              </div>
            </div>

            {/* Right: floating stat cards */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[
                {val:stats.total_cases,    label:'Cases Investigated', color:'#EBEBEB', sub:'Platform data', delay:'0s'},
                {val:stats.total_iocs,     label:'IOCs Correlated',    color:'#4DA3FF',  sub:'Cross-case intel', delay:'0.4s'},
                {val:stats.critical_cases, label:'Critical Incidents', color:'#EAB308',  sub:'High-severity', delay:'0.8s'},
                {val:stats.vt_lookups,     label:'VT Lookups Run',     color:'#A78BFA',  sub:'Enrichment queries', delay:'1.2s'},
              ].map(({val,label,color,sub,delay})=>(
                <div key={label} className="stat-float" style={{animationDelay:delay,padding:'20px',background:'rgba(8,12,20,0.8)',border:'1px solid rgba(240,240,248,0.08)',borderRadius:12,backdropFilter:'blur(12px)'}}>
                  <div style={{fontSize:'1.9rem',fontWeight:700,color,...mono,lineHeight:1}}>{(val||0).toLocaleString()}</div>
                  <div style={{fontSize:12,color:'rgba(240,240,248,0.65)',marginTop:6,fontWeight:500}}>{label}</div>
                  <div style={{fontSize:10,color:'rgba(240,240,248,0.25)',marginTop:3,...mono}}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Ticker/>
      </section>

      {/* ══ THE PROBLEM ══ */}
      <section id="problem" className="lp-section" style={{padding:'90px 48px',background:'#0A0A0A',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:56,alignItems:'start',marginBottom:52}} className="lp-2col">
            <div>
              <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:12}}>◇ The Problem</div>
              <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.4rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1,maxWidth:600}}>
                Cybersecurity is changing faster<br/>
                <span style={{color:'#4DA3FF',fontStyle:'italic'}}>than most platforms can follow.</span>
              </h2>
              <p style={{marginTop:18,fontSize:13,color:'rgba(240,240,248,0.5)',lineHeight:1.85,...mono,fontWeight:300,maxWidth:540}}>
                The SOC tools built in 2015 were designed for a world of firewalls, malware, and network anomalies. That world still exists — but it is now layered on top of AI agents, machine identities, stolen tokens, and automated attacks that move faster than any human analyst.
              </p>
            </div>
            {/* Stats panel */}
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[
                {stat:'83%',label:'of breaches in 2024 involved a compromised identity, credential, or token — not a technical exploit.',color:'#4DA3FF'},
                {stat:'10–15yr',label:'window before AI-native attackers, quantum-harvested keys, and autonomous agent exploits become the dominant threat model.',color:'#A78BFA'},
                {stat:'$0',label:'cost to deploy AegisTrace. No license. No vendor lock-in. Full SOC platform, open stack, runs on free-tier Render.',color:'#EAB308'},
              ].map(({stat,label,color})=>(
                <div key={stat} style={{display:'flex',gap:18,alignItems:'flex-start',padding:'18px 20px',background:'rgba(240,240,248,0.02)',border:`1px solid rgba(240,240,248,0.07)`,borderLeft:`3px solid ${color}`,borderRadius:'0 8px 8px 0'}}>
                  <div style={{fontFamily:'Instrument Serif,serif',fontSize:'2.2rem',fontWeight:400,color,fontStyle:'italic',lineHeight:1,flexShrink:0,minWidth:80}}>{stat}</div>
                  <div style={{fontSize:12,color:'rgba(240,240,248,0.5)',lineHeight:1.75,...mono,fontWeight:300,marginTop:4}}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
            {PROBLEMS.map(({Icon,title,desc,color})=>(
              <div key={title} className="problem-card" style={{borderLeft:`2px solid ${color}`,borderTop:'1px solid rgba(255,255,255,0.07)',borderRight:'1px solid rgba(255,255,255,0.07)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                <Icon size={22} style={{color,marginBottom:14}}/>
                <div style={{fontWeight:600,fontSize:'0.92rem',marginBottom:10,color:'#EBEBEB'}}>{title}</div>
                <div style={{fontSize:12,color:'rgba(240,240,248,0.5)',lineHeight:1.8,...mono,fontWeight:300}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FUTURE VISION ══ */}
      <section id="vision" className="lp-section" style={{padding:'90px 48px',background:'#111111',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'start',marginBottom:56}} className="lp-2col">
            <div>
              <div style={{fontSize:10,color:'#A78BFA',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:12}}>◇ Future Vision</div>
              <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.4rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1}}>
                From SOC dashboard<br/>to <span style={{color:'#A78BFA',fontStyle:'italic'}}>Trust Operating System.</span>
              </h2>
              <p style={{marginTop:18,fontSize:13,color:'rgba(240,240,248,0.5)',lineHeight:1.85,...mono,fontWeight:300}}>
                The next evolution of AegisTrace is not adding more tools. It is changing the fundamental model of how the platform thinks about security — tracking identities, trust relationships, agent actions, and provenance chains.
              </p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {[
                {from:'Case manager',          to:'Trust orchestration platform',    color:'#4DA3FF'},
                {from:'IOC dashboard',         to:'Identity investigation platform', color:'#A78BFA'},
                {from:'Alert viewer',          to:'Agent supervision console',       color:'#EAB308'},
                {from:'Static reports',        to:'Future-narrative intelligence',   color:'#22C55E'},
                {from:'Manual triage',         to:'Autonomous + human-approved',     color:'#4DA3FF'},
                {from:'Black-box AI verdicts', to:'Explainable provenance chains',   color:'#A78BFA'},
              ].map(({from,to,color})=>(
                <div key={from} style={{display:'flex',alignItems:'center',gap:0,padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{flex:1,fontSize:12,color:'rgba(240,240,248,0.3)',...mono,textDecoration:'line-through'}}>{from}</div>
                  <ChevronRight size={14} style={{color,flexShrink:0,margin:'0 10px'}}/>
                  <div style={{flex:1,fontSize:12,color:'rgba(240,240,248,0.85)',...mono,fontWeight:500}}>{to}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14}}>
            {PILLARS.map(({Icon,label,desc})=>(
              <div key={label} className="pillar-card">
                <Icon size={20} style={{color:'#A78BFA',marginBottom:12}}/>
                <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#EBEBEB'}}>{label}</div>
                <div style={{fontSize:11,color:'rgba(240,240,248,0.45)',lineHeight:1.7,...mono,fontWeight:300}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HARDWARE PLATFORM ══ */}
      <section id="hardware" className="lp-section" style={{padding:'90px 48px',background:'#111111',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:56,alignItems:'center',marginBottom:52}} className="lp-2col">
            <div>
              <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Session 6 — Live Now</div>
              <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1}}>
                Hardware attack tools.<br/><span style={{color:'#4DA3FF',fontStyle:'italic'}}>Analysed by AI.</span>
              </h2>
              <p style={{marginTop:18,fontSize:13,color:'rgba(240,240,248,0.5)',lineHeight:1.8,...mono,fontWeight:300}}>
                The only free SOC tool that ingests logs from physical hardware attack tools — WiFi Pineapple, HackRF, Flipper Zero, Rubber Ducky, Proxmark 3, Suricata, Sysmon, and more.
              </p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[{Icon:Wifi,label:'WiFi/RF attacks visible alongside endpoint events'},{Icon:Cpu,label:'AI auto-parses unknown log formats — no parser needed'},{Icon:Shield,label:'Every event auto-mapped to MITRE ATT&CK technique'},{Icon:Zap,label:'One-click case creation from any hardware alert'}].map(({Icon,label})=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'rgba(240,240,248,0.7)',...mono,padding:'10px 14px',background:'rgba(77,163,255,0.05)',border:'1px solid rgba(77,163,255,0.12)',borderRadius:8}}>
                  <Icon size={14} style={{color:'#4DA3FF',flexShrink:0}}/>{label}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
            {HARDWARE_TOOLS.map(({cat,color,tools})=>(
              <div key={cat} className="hw-cat-card">
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
                  <div style={{fontWeight:700,fontSize:'0.88rem',color:'#EBEBEB'}}>{cat}</div>
                  <div style={{marginLeft:'auto',fontSize:10,color:'rgba(240,240,248,0.35)',...mono}}>{tools.length} tools</div>
                </div>
                {tools.map(t=>(
                  <div key={t} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'rgba(240,240,248,0.6)',...mono,padding:'3px 0'}}>
                    <ChevronRight size={10} style={{color,flexShrink:0}}/>{t}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{marginTop:28,textAlign:'center'}}>
            <button onClick={openApp} style={{background:'#4DA3FF',color:'#fff',border:'none',borderRadius:6,padding:'12px 32px',fontSize:12,fontWeight:600,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>Open Hardware Tools →</button>
          </div>
        </div>
      </section>

      {/* ══ BENTO FEATURES ══ */}
      <section id="features" className="lp-section" style={{padding:'80px 48px',background:'#0A0A0A',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{marginBottom:48}}>
            <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Platform Capabilities</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em'}}>Everything a SOC analyst needs.<br/><span style={{color:'rgba(240,240,248,0.3)'}}>Nothing you don't.</span></h2>
          </div>
          <BentoFeatures mono={mono}/>
        </div>
      </section>

      {/* ══ LIVE DEMO ══ */}
      <section id="demo" className="lp-section" style={{padding:'80px 48px',background:'#111111',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{marginBottom:40,display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,alignItems:'flex-end'}} className="lp-2col">
            <div>
              <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Live Intelligence Demo</div>
              <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1}}>Try the AI<br/><span style={{color:'#4DA3FF',fontStyle:'italic'}}>right now.</span></h2>
            </div>
            <p style={{fontSize:13,color:'rgba(240,240,248,0.45)',lineHeight:1.75,...mono,fontWeight:300}}>Paste any IOC — IP address, domain, URL, or hash. AegisTrace AI returns a real threat assessment in under 2 seconds using Groq's inference engine.</p>
          </div>
          <AIDemo/>
        </div>
      </section>

      {/* ══ ROADMAP ══ */}
      <section id="roadmap" className="lp-section" style={{padding:'90px 48px',background:'#0A0A0A',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{marginBottom:52}}>
            <div style={{fontSize:10,color:'#A78BFA',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:12}}>◇ Product Roadmap</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.4rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1}}>
              Where we are.<br/><span style={{color:'#A78BFA',fontStyle:'italic'}}>Where we're going.</span>
            </h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20}}>
            {ROADMAP.map(({phase,status,color,items})=>(
              <div key={phase} style={{background:'rgba(240,240,248,0.02)',border:`1px solid ${color}22`,borderRadius:10,padding:24,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color}88,transparent)`}}/>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:color,animation:status==='live'?'pulse-dot 2s ease-in-out infinite':status==='building'?'shimmer 2s ease-in-out infinite':undefined}}/>
                  <div style={{fontWeight:700,fontSize:'0.88rem',color:'#EBEBEB'}}>{phase}</div>
                  <div style={{marginLeft:'auto',fontSize:10,...mono,padding:'2px 8px',borderRadius:3,background:`${color}18`,color,border:`1px solid ${color}30`,textTransform:'uppercase',letterSpacing:'0.08em'}}>
                    {status==='live'?'Live':status==='building'?'In Progress':'Planned'}
                  </div>
                </div>
                {items.map(item=>(
                  <div key={item} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:status==='live'?color:'rgba(255,255,255,0.2)',flexShrink:0,marginTop:5}}/>
                    <div style={{fontSize:12,color:status==='live'?'rgba(240,240,248,0.75)':status==='building'?'rgba(240,240,248,0.65)':'rgba(240,240,248,0.4)',...mono,lineHeight:1.5}}>{item}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPETITIVE COMPARISON ══ */}
      <section style={{padding:'80px 48px',background:'#111111',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{marginBottom:44}}>
            <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Competitive Benchmark</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em'}}>Free beats<br/><span style={{color:'#4DA3FF',fontStyle:'italic'}}>$50,000/year.</span></h2>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',padding:'12px 16px',fontSize:12,color:'rgba(240,240,248,0.4)',fontWeight:400,borderBottom:'1px solid rgba(255,255,255,0.08)',...mono}}>Feature</th>
                  {[{name:'AegisTrace',sub:'Free',color:'#4DA3FF'},{name:'CrowdStrike',sub:'$~15k/yr',color:'#A78BFA'},{name:'Splunk',sub:'$~25k/yr',color:'#F97316'}].map(h=>(
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
                        {v?<Check size={15} style={{color:'#22C55E'}}/>:<X size={14} style={{color:'rgba(136,136,136,0.4)'}}/>}
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
      <section style={{padding:'80px 48px',background:'#0A0A0A',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{marginBottom:40}}>
            <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ AI Engine — 100% Free via Groq</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em'}}>Right model.<br/><span style={{color:'#4DA3FF',fontStyle:'italic'}}>Right task.</span></h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
            {[
              {model:'llama-3.3-70b-versatile',task:'Case Analysis & Chat',  why:'Best reasoning for complex incident investigation and executive report writing',color:'#4DA3FF'},
              {model:'mixtral-8x7b-32768',     task:'Email Classification',  why:'Large 32K context window for full header + body phishing analysis',color:'#A78BFA'},
              {model:'gemma2-9b-it',           task:'IOC Extraction',        why:'3× faster than 70b for structured JSON extraction from terminal output',color:'#EAB308'},
              {model:'llama-3.1-8b-instant',   task:'Quick Security Q&A',    why:'Sub-200ms for simple binary security questions and quick classification',color:'#22C55E'},
            ].map(({model,task,why,color})=>(
              <div key={model} style={{background:'rgba(240,240,248,0.02)',border:'1px solid rgba(240,240,248,0.07)',borderTop:`2px solid ${color}`,borderRadius:8,padding:'18px 20px',transition:'transform 0.2s'}}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                <div style={{fontSize:11,color,...mono,marginBottom:8}}>{model}</div>
                <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>{task}</div>
                <div style={{fontSize:11,color:'rgba(240,240,248,0.4)',...mono,lineHeight:1.6,fontWeight:300}}>{why}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section style={{padding:'80px 48px',background:'#111111',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{marginBottom:48}}>
            <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Investigation Workflow</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em'}}>Four steps.<br/><span style={{color:'#4DA3FF',fontStyle:'italic'}}>One investigation.</span></h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:0,position:'relative'}}>
            {/* Connector line */}
            <div style={{position:'absolute',top:28,left:'12.5%',right:'12.5%',height:1,background:'linear-gradient(90deg,transparent,rgba(77,163,255,0.3),rgba(77,163,255,0.3),rgba(77,163,255,0.3),transparent)',zIndex:0,display:'block'}}/>
            {[
              {n:'01',title:'Deploy the Agent',     desc:'Drop aegistrace_agent.py on any machine. Python 3.8+, zero dependencies. Collects Sysmon events, auth logs, process trees, and persistence — ships every 5 minutes.'},
              {n:'02',title:'Import + Investigate',  desc:'Open a case. Import emails, paste hardware device logs, run VT lookups. AI scores every artifact and maps it to MITRE ATT&CK automatically.'},
              {n:'03',title:'Correlate + Hunt',     desc:'The IOC engine links cases sharing the same infrastructure. Cross-case heatmaps spot campaigns. Hardware tool alerts link to cases directly.'},
              {n:'04',title:'Report + Close',       desc:'AI writes executive summary and technical analysis with a full reasoning chain. Generate PDF, DOCX, or DORA Article 19 report. Closure checklist enforced before sealing.'},
            ].map(({n,title,desc},i)=>(
              <div key={n} style={{padding:'0 24px 0',position:'relative',zIndex:1}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:'#0A0A0A',border:'2px solid rgba(77,163,255,0.4)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,...mono,fontSize:13,fontWeight:700,color:'#4DA3FF'}}>{n}</div>
                <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>{title}</div>
                <div style={{fontSize:12,color:'rgba(240,240,248,0.45)',lineHeight:1.75,...mono,fontWeight:300}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TECH STACK ══ */}
      <section style={{padding:'72px 48px',background:'#0A0A0A',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{marginBottom:40}}>
            <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:10}}>◇ Technology Stack — All Free Tier</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3rem)',fontWeight:400,letterSpacing:'-0.02em'}}>Enterprise-grade.<br/><span style={{color:'#4DA3FF',fontStyle:'italic'}}>Zero cost.</span></h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
            {[
              {name:'React 18',          role:'Frontend SPA',        note:'Vite build, deployed to Render'},
              {name:'FastAPI',           role:'Backend API',          note:'Python, async, OpenAPI docs'},
              {name:'SQLite + SQLModel', role:'Database + ORM',       note:'File-based, no server needed'},
              {name:'Groq API',          role:'AI inference',         note:'Free tier, 4 models in rotation'},
              {name:'VirusTotal v3',     role:'IOC enrichment',       note:'Free tier, 4 req/min'},
              {name:'Render.com',        role:'Hosting + Deploy',     note:'Free tier, auto-deploy on push'},
              {name:'Docker',            role:'Container + sandbox',  note:'Terminal Lab sandbox isolation'},
              {name:'JetBrains Mono',    role:'Terminal typography',  note:'All code, output, IOC values'},
            ].map(({name,role,note})=>(
              <div key={name} style={{background:'rgba(240,240,248,0.02)',border:'1px solid rgba(240,240,248,0.07)',borderRadius:8,padding:'14px 16px'}}>
                <div style={{fontWeight:700,fontSize:13,color:'#EBEBEB',...mono,marginBottom:4}}>{name}</div>
                <div style={{fontSize:11,color:'#4DA3FF',...mono,marginBottom:4}}>{role}</div>
                <div style={{fontSize:10,color:'rgba(240,240,248,0.35)',...mono}}>{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT / CERTS ══ */}
      <section id="certs" style={{padding:'80px 48px',background:'#111111',borderTop:'1px solid rgba(240,240,248,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,alignItems:'start'}} className="lp-2col">
          <div>
            <div style={{fontSize:10,color:'#4DA3FF',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:16}}>◇ About the Builder</div>
            <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(1.8rem,3.5vw,2.8rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.2,marginBottom:20}}>SOC Analyst.<br/><span style={{color:'#4DA3FF',fontStyle:'italic'}}>Dublin, Ireland.</span></h2>
            <p style={{fontSize:13,color:'rgba(240,240,248,0.55)',lineHeight:1.85,...mono,fontWeight:300,marginBottom:16}}>
              Prasanna Kumar Surendran — Blue Team analyst and security tooling developer. AegisTrace started as a personal investigation platform and grew into a full SOC control plane benchmarked against enterprise tools.
            </p>
            <p style={{fontSize:13,color:'rgba(240,240,248,0.55)',lineHeight:1.85,...mono,fontWeight:300,marginBottom:24}}>
              The platform is entirely self-funded, free to use, and open in philosophy. The goal is to prove that a solo analyst can build SOC tooling that rivals commercial products — built around identity, trust, and explainability from the ground up.
            </p>
            <div style={{display:'flex',gap:12}}>
              <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:6,color:'rgba(240,240,248,0.5)',textDecoration:'none',fontSize:12,...mono,transition:'color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.color='#EBEBEB'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.5)'}><Github size={14}/> GitHub</a>
              <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:6,color:'rgba(240,240,248,0.5)',textDecoration:'none',fontSize:12,...mono,transition:'color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.color='#EBEBEB'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.5)'}><Linkedin size={14}/> LinkedIn</a>
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#A78BFA',letterSpacing:'0.2em',textTransform:'uppercase',...mono,marginBottom:16}}>◇ Certifications</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {CERTS.map(({name,full,color,done})=>(
                <div key={name} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:'rgba(255,255,255,0.02)',border:`1px solid ${done?`${color}30`:'rgba(255,255,255,0.06)'}`,borderRadius:8,opacity:done?1:0.65}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:done?color:'rgba(136,136,136,0.4)',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:done?color:'rgba(240,240,248,0.4)',...mono}}>{name}</div>
                    <div style={{fontSize:11,color:'rgba(240,240,248,0.4)',marginTop:2,...mono}}>{full}</div>
                  </div>
                  {done?<Check size={14} style={{color,flexShrink:0}}/>:<span style={{fontSize:10,color:'rgba(240,240,248,0.3)',...mono}}>In progress</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA + FOOTER ══ */}
      <section style={{padding:'80px 48px 48px',borderTop:'1px solid rgba(240,240,248,0.05)',background:'#0A0A0A'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:32,marginBottom:64}}>
            <div>
              <h2 style={{fontFamily:'Instrument Serif,serif',fontSize:'clamp(2rem,4vw,3.5rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.05}}>Start your first<br/><span style={{color:'#4DA3FF',fontStyle:'italic'}}>investigation.</span></h2>
              <p style={{marginTop:14,fontSize:13,color:'rgba(240,240,248,0.4)',...mono,maxWidth:420,lineHeight:1.7}}>No license. No credit card. Deploy in 5 minutes on Render or run locally. AegisTrace is free now and will stay free.</p>
            </div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <button onClick={openApp} style={{background:'#4DA3FF',color:'#fff',border:'none',borderRadius:6,padding:'12px 28px',fontSize:12,fontWeight:600,cursor:'pointer',...mono,letterSpacing:'0.08em',textTransform:'uppercase'}}>Launch App →</button>
              <button onClick={()=>navigate('/public')} style={{background:'transparent',color:'rgba(240,240,248,0.6)',border:'1px solid rgba(240,240,248,0.15)',borderRadius:6,padding:'12px 24px',fontSize:12,cursor:'pointer',...mono,letterSpacing:'0.06em',textTransform:'uppercase'}}>Case Library</button>
              <a href="/agent-setup" style={{display:'flex',alignItems:'center',background:'transparent',color:'rgba(240,240,248,0.6)',border:'1px solid rgba(240,240,248,0.12)',borderRadius:6,padding:'12px 24px',fontSize:12,cursor:'pointer',...mono,letterSpacing:'0.06em',textTransform:'uppercase',textDecoration:'none'}}>Agent Setup</a>
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
