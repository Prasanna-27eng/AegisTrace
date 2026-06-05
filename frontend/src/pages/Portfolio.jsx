import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Github, Linkedin, Mail, Phone, ArrowRight, Award, Code, Briefcase,
  Shield, Brain, Terminal, GitMerge, Activity, ChevronRight,
  MapPin, GraduationCap, Download, ExternalLink, CheckCircle, Clock,
  Menu, XCircle, Zap, User, BookOpen
} from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';

/* ─── Mini particle bg ─────────────────────────────────────────────────── */
function HeroBg() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    let aid;
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random()-0.5)*0.0002, vy: (Math.random()-0.5)*0.0002,
      r: Math.random()*1.4+0.4, a: Math.random()*0.4+0.25,
    }));
    function resize() {
      const d=Math.min(window.devicePixelRatio||1,2);
      cv.width=cv.offsetWidth*d; cv.height=cv.offsetHeight*d; ctx.scale(d,d);
    }
    resize(); window.addEventListener('resize',resize);
    function frame() {
      const W=cv.offsetWidth,H=cv.offsetHeight;
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#040812'; ctx.fillRect(0,0,W,H);
      pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=1;if(p.x>1)p.x=0;if(p.y<0)p.y=1;if(p.y>1)p.y=0;});
      const T=Math.min(W,H)*0.18;
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const a=pts[i],b=pts[j];
        const ax=a.x*W,ay=a.y*H,bx=b.x*W,by=b.y*H;
        const d=Math.sqrt((ax-bx)**2+(ay-by)**2);
        if(d<T){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.strokeStyle=`rgba(74,142,219,${(1-d/T)*0.22})`;ctx.lineWidth=0.6;ctx.stroke();}
      }
      pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x*W,p.y*H,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(74,142,219,${p.a})`;ctx.fill();});
      const vig=ctx.createRadialGradient(W/2,H/2,H*0.1,W/2,H/2,H*0.9);
      vig.addColorStop(0,'transparent');vig.addColorStop(1,'rgba(4,8,18,0.85)');
      ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
      aid=requestAnimationFrame(frame);
    }
    frame();
    return()=>{cancelAnimationFrame(aid);window.removeEventListener('resize',resize);};
  },[]);
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>;
}

/* ─── Animated terminal window ─────────────────────────────────────────── */
function TerminalWindow() {
  const mono = {fontFamily:'JetBrains Mono,monospace'};
  const [lines, setLines] = useState([]);
  const SEQUENCE = [
    {t:200,  text:'$ aegistrace --mode analyst --target "prasanna"', color:'rgba(240,240,248,0.9)'},
    {t:900,  text:'[+] Profile loaded: Prasanna Kumar Surendran', color:'#4DA3FF'},
    {t:1600, text:'[+] Location: Dublin, Ireland', color:'rgba(240,240,248,0.5)'},
    {t:2300, text:'[+] Role: SOC Analyst · Blue Team L1', color:'rgba(240,240,248,0.5)'},
    {t:3000, text:'[*] Scanning certifications...', color:'#EAB308'},
    {t:3700, text:'    ✓ SC-200  Microsoft Security Ops Associate', color:'#22C55E'},
    {t:4200, text:'    ✓ Sec+   CompTIA Security+', color:'#22C55E'},
    {t:4700, text:'    ✓ TCM    Practical Ethical Hacking', color:'#22C55E'},
    {t:5400, text:'[*] Analysing projects...', color:'#EAB308'},
    {t:6100, text:'    → AegisTrace v5.0  LIVE    [Trust OS · EDR]', color:'#4DA3FF'},
    {t:6800, text:'    → WebSecGuard       SHIPPED [XSS/CSRF ext.]', color:'#A78BFA'},
    {t:7500, text:'[+] Threat intel stack: MITRE ATT&CK · KQL · SPL', color:'rgba(240,240,248,0.5)'},
    {t:8200, text:'[✓] Analysis complete. Open to hire.', color:'#22C55E'},
    {t:9000, text:'$ _', color:'rgba(240,240,248,0.5)'},
  ];
  useEffect(()=>{
    const timers = SEQUENCE.map(({t,text,color})=>setTimeout(()=>setLines(l=>[...l,{text,color}]),t));
    return ()=>timers.forEach(clearTimeout);
  },[]);
  return (
    <div style={{background:'rgba(0,0,0,0.6)',border:'1px solid rgba(240,240,248,0.1)',borderRadius:12,overflow:'hidden',backdropFilter:'blur(10px)'}}>
      {/* Terminal titlebar */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',background:'rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:'#EF4444'}}/>
        <div style={{width:10,height:10,borderRadius:'50%',background:'#EAB308'}}/>
        <div style={{width:10,height:10,borderRadius:'50%',background:'#22C55E'}}/>
        <span style={{marginLeft:8,fontSize:11,color:'rgba(240,240,248,0.35)',...mono}}>aegistrace — analyst@soc:~</span>
      </div>
      <div style={{padding:'16px',minHeight:280,maxHeight:340,overflowY:'auto'}}>
        {lines.map((l,i)=>(
          <div key={i} style={{fontSize:12,color:l.color,...mono,lineHeight:1.8,whiteSpace:'pre'}}>{l.text}</div>
        ))}
        {lines.length < SEQUENCE.length && (
          <span style={{fontSize:12,color:'rgba(77,163,255,0.7)',...mono,animation:'blink 1s step-end infinite'}}>▋</span>
        )}
      </div>
    </div>
  );
}

/* ─── Skill bar ────────────────────────────────────────────────────────── */
function SkillBar({ label, pct, color }) {
  const mono = {fontFamily:'JetBrains Mono,monospace'};
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:11,...mono,color:'rgba(240,240,248,0.65)'}}>{label}</span>
        <span style={{fontSize:10,...mono,color}}>{pct}%</span>
      </div>
      <div style={{height:3,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${color}88,${color})`,borderRadius:2,transition:'width 1s ease'}}/>
      </div>
    </div>
  );
}

/* ─── Data ──────────────────────────────────────────────────────────────── */
const SKILLS = [
  { cat:'SIEM & Detection Engineering', color:'#4A8EDB', tags:['Microsoft Sentinel','Splunk SIEM','KQL','SPL','Log Correlation','Detection Rules','Alert Tuning'] },
  { cat:'Endpoint & Identity Security', color:'#9C7CFF', tags:['MS Defender for Endpoint','Active Directory','Identity Protection','EDR Response','Group Policy','AWS Security'] },
  { cat:'Offensive Security & PenTest', color:'#F5B84B', tags:['Burp Suite','Nmap','Nessus','Metasploit','OWASP Top 10','Wireshark','Gobuster'] },
  { cat:'Forensics & Threat Intel',     color:'#4BE38A', tags:['Email Forensics','PCAP Analysis','OSINT','MITRE ATT&CK','VirusTotal','Phishing Investigation','IOC Hunting'] },
  { cat:'Cloud & DevSecOps',            color:'#4A8EDB', tags:['AWS EC2 / S3 / IAM','Docker','Terraform','Ansible','GitHub Actions','Python','Bash Scripting'] },
  { cat:'Frameworks & Compliance',      color:'#9C7CFF', tags:['GDPR','ISO 27001','NIST CSF','SOC 2','DORA','Cyber Kill Chain','Diamond Model'] },
];

const SKILL_BARS = [
  {label:'Microsoft Sentinel / KQL',   pct:88, color:'#4A8EDB'},
  {label:'Incident Response',          pct:84, color:'#EF4444'},
  {label:'MITRE ATT&CK Mapping',       pct:82, color:'#A78BFA'},
  {label:'Threat Intelligence',        pct:80, color:'#4BE38A'},
  {label:'Email Forensics',            pct:85, color:'#F5B84B'},
  {label:'Python / Automation',        pct:78, color:'#4A8EDB'},
  {label:'React / FastAPI (Tooling)',   pct:80, color:'#9C7CFF'},
  {label:'Cloud Security (AWS)',        pct:72, color:'#F5B84B'},
];

const CERTS = [
  { name:'Microsoft SC-200',             sub:'Security Operations Associate',   date:'Apr 2026', status:'completed', color:'#0078D4' },
  { name:'CompTIA Security+',            sub:'SY0-701',                         date:'Sep 2024', status:'completed', color:'#EF4444' },
  { name:'TCM Practical Ethical Hacking',sub:'TCM Security',                    date:'Oct 2024', status:'completed', color:'#4BE38A' },
  { name:'TCM Practical Help Desk',      sub:'TCM Security',                    date:'Oct 2024', status:'completed', color:'#4BE38A' },
  { name:'AIG Shield Up',                sub:'Forage Job Simulation',           date:'Mar 2025', status:'completed', color:'#F5B84B' },
  { name:'BTL1',                         sub:'Security Blue Team Level 1',      date:'55% — In Progress', status:'ongoing', color:'#4A8EDB' },
  { name:'eJPT',                         sub:'eLearnSecurity Junior PenTester', date:'20% — In Progress', status:'ongoing', color:'#9C7CFF' },
  { name:'SC-300',                       sub:'Microsoft Identity & Access',     date:'15% — In Progress', status:'ongoing', color:'#0078D4' },
];

const PROJECTS = [
  { title:'AegisTrace — Trust Operating System · AI-Agent Era', period:'Jun 2025 — Present', desc:'Production-grade SOC control plane with full EDR. v5.0 ships Endpoint Agent with Honey Token Trap, DNS/DGA detection, YARA-lite engine, auto-block, USB + registry monitoring and guardian process alongside ITDR, Identity Graph, Trust Timeline, and Provenance Ledger.', tags:['React','FastAPI','Groq AI','VirusTotal','SQLite','Docker','Render','ITDR','EDR'], badge:'Live — v5.0', badgeColor:'#4BE38A', link:null, highlight:true,
    features:['Endpoint Agent v5.0 — 🍯 Honey Token Trap, DNS/DGA, YARA-lite, auto-block engine, guardian process','ITDR — credential stuffing, impossible travel, new device, privilege escalation (6 detectors)','Pluggable identity risk engine · Identity Graph · Trust Timeline · Provenance Ledger','Explainable AI — full reasoning chain on every verdict · 7-source IOC enrichment','18 hardware forensic tools · Email forensics (SPF/DKIM/DMARC) · DORA Article 19'] },
  { title:'WebSecGuard — Browser Vulnerability Scanner', period:'Jun–Sep 2025 · MSc Dissertation', desc:'Chrome extension (Manifest V3) for real-time XSS and CSRF detection. Detects 25+ injection points on OWASP Juice Shop during testing.', tags:['JavaScript','Chrome Extension API','Manifest V3','OWASP','Burp Suite'], badge:'Security Research', badgeColor:'#EF4444', link:'https://github.com/prasanna80564/web-scanner-', highlight:false },
  { title:'Grand Line SOC Dashboard', period:'May 2026', desc:'Full-featured SOC dashboard with MITRE ATT&CK mapping, VirusTotal IOC enrichment, AI-generated case summaries, role-based access control, and one-click PDF report export.', tags:['React 18','Firebase','MITRE ATT&CK','VirusTotal API','Groq AI','RBAC'], badge:'Blue Team', badgeColor:'#9C7CFF', link:'https://github.com/Prasanna-27eng/grant-line-soc-', highlight:false },
  { title:'Automated Cloud Deployment & CI/CD', period:'Jan–Mar 2025', desc:'End-to-end automated deployment pipeline to AWS EC2. Infrastructure-as-code with Terraform, configuration management via Ansible, CI/CD through GitHub Actions. Reduced deployment time by 70%.', tags:['Terraform','Ansible','Docker','AWS EC2','GitHub Actions','IaC'], badge:'Cloud/DevOps', badgeColor:'#4A8EDB', link:'https://github.com/prasanna80564/networking', highlight:false },
];

const FOCUS = [
  { Icon:Shield,   label:'SOC Operations',       desc:'Alert triage, incident response, case management, threat investigation in Sentinel and Splunk.' },
  { Icon:Brain,    label:'AI-Augmented Analysis', desc:'Multi-model AI routing for IOC extraction, email classification, case analysis, and YARA generation.' },
  { Icon:GitMerge, label:'Identity Security',     desc:'Tracking compromised identities, service accounts, API keys, and agents as first-class security entities.' },
  { Icon:Terminal, label:'Security Tooling',      desc:'Building open-source analyst tools that solve real SOC pain points, deployed on free infrastructure.' },
  { Icon:Activity, label:'Threat Hunting',        desc:'Cross-case IOC correlation, campaign detection, MITRE heatmaps, and proactive threat pattern discovery.' },
];

const MONO = { fontFamily:'JetBrains Mono, monospace' };
const SERIF = { fontFamily:'Instrument Serif, Georgia, serif' };

/* ─── Section heading ──────────────────────────────────────────────────── */
function SectionHead({ label, title, accent }) {
  return (
    <div style={{marginBottom:32}}>
      <div style={{fontSize:10,color:'#4A8EDB',...MONO,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:10}}>◇ {label}</div>
      <h2 style={{...SERIF,fontSize:'clamp(1.7rem,2.8vw,2.4rem)',fontWeight:400,letterSpacing:'-0.015em',lineHeight:1.1}}>
        {title} <span style={{color:'#4A8EDB',fontStyle:'italic'}}>{accent}</span>
      </h2>
    </div>
  );
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_cases:0, total_iocs:0, vt_lookups:0, closed_cases:0 });
  const [publicCases, setPublicCases] = useState([]);
  const [mobileNav, setMobileNav] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    api.get('/api/portfolio/stats').then(r=>setStats(r.data)).catch(()=>{});
    api.get('/api/public/cases').then(r=>setPublicCases(r.data)).catch(()=>{});
  }, []);

  const SECTIONS = [
    {id:'hero',    label:'Overview'},
    {id:'focus',   label:'Focus'},
    {id:'skills',  label:'Skills'},
    {id:'certs',   label:'Certifications'},
    {id:'projects',label:'Projects'},
    {id:'edu',     label:'Education'},
    {id:'contact', label:'Contact'},
  ];

  const scrollTo = id => { document.getElementById(id)?.scrollIntoView({behavior:'smooth'}); setMobileNav(false); };

  return (
    <div style={{minHeight:'100vh',background:'#040812',color:'#F5F7FA',fontFamily:'Inter,system-ui,sans-serif'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&family=Inter:wght@300;400;500;600;700&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        ::selection{background:rgba(74,142,219,0.3);color:#fff}
        .skill-tag{background:rgba(74,142,219,0.06);border:1px solid rgba(74,142,219,0.15);color:#6BABEC;font-size:0.71rem;padding:4px 10px;border-radius:4px;font-family:'JetBrains Mono',monospace}
        .proj-card{background:rgba(12,18,32,0.6);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:22px;transition:border-color 0.2s,transform 0.2s;display:flex;flex-direction:column}
        .proj-card:hover{border-color:rgba(74,142,219,0.2);transform:translateY(-2px)}
        .case-card{background:rgba(12,18,32,0.6);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:18px 20px;border-left:2px solid #4A8EDB;transition:border-color 0.2s}
        .case-card:hover{border-color:rgba(74,142,219,0.4)}
        .focus-card{padding:20px;background:rgba(12,18,32,0.5);border:1px solid rgba(255,255,255,0.07);border-radius:10px;transition:border-color 0.2s,transform 0.2s}
        .focus-card:hover{border-color:rgba(74,142,219,0.2);transform:translateY(-2px)}
        .sidebar-link{display:block;padding:8px 16px;font-size:0.72rem;color:#6F7A8F;text-decoration:none;border-radius:6px;transition:all 0.15s;font-family:'JetBrains Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;background:none;border:none;text-align:left;width:100%}
        .sidebar-link:hover,.sidebar-link.active{color:#4A8EDB;background:rgba(74,142,219,0.07)}
        .mobile-nav-drawer{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(4,8,18,0.97);z-index:200;display:flex;flex-direction:column;padding:24px;backdrop-filter:blur(20px)}
        @media(max-width:900px){
          .port-sidebar{display:none!important}
          .port-main{margin-left:0!important;max-width:100%!important}
          .port-section{padding:48px 20px!important}
          .port-grid-2{grid-template-columns:1fr!important}
          .port-grid-3{grid-template-columns:1fr!important}
          .port-stat-grid{grid-template-columns:1fr 1fr!important}
          .hero-cols{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* ── FIXED TOP NAV ── */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:'rgba(4,8,18,0.92)',backdropFilter:'blur(14px)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Logo size={22} showText/>
        <div style={{display:'flex',gap:20,alignItems:'center'}}>
          {/* Desktop links */}
          <div style={{display:'flex',gap:16}} className="port-desktop-links">
            <a href="/" className="port-nav-link" style={{color:'#6F7A8F',textDecoration:'none',fontSize:'0.78rem',...MONO,letterSpacing:'0.06em',textTransform:'uppercase'}}>Home</a>
            <a href="/mission" className="port-nav-link" style={{color:'#6F7A8F',textDecoration:'none',fontSize:'0.78rem',...MONO,letterSpacing:'0.06em',textTransform:'uppercase'}}>Mission</a>
            <a href="/public" className="port-nav-link" style={{color:'#6F7A8F',textDecoration:'none',fontSize:'0.78rem',...MONO,letterSpacing:'0.06em',textTransform:'uppercase'}}>Cases</a>
          </div>
          <div style={{display:'flex',gap:8}}>
            <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer"
              style={{display:'flex',alignItems:'center',gap:5,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,padding:'7px 14px',fontSize:'0.78rem',color:'#D7DCE6',textDecoration:'none'}}>
              <Github size={13}/> GitHub
            </a>
            <a href="mailto:Prasanna80564@gmail.com"
              style={{display:'flex',alignItems:'center',gap:5,background:'#4A8EDB',border:'none',borderRadius:6,padding:'7px 14px',fontSize:'0.78rem',color:'white',textDecoration:'none',fontWeight:600}}>
              <Mail size={13}/> Contact
            </a>
          </div>
          <button onClick={()=>setMobileNav(true)} style={{display:'none',background:'none',border:'1px solid rgba(240,240,248,0.15)',borderRadius:6,padding:'7px 9px',cursor:'pointer',color:'#F0F0F8'}} className="port-mobile-btn">
            <Menu size={16}/>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="mobile-nav-drawer">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
            <Logo size={22} showText/>
            <button onClick={()=>setMobileNav(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(240,240,248,0.6)'}}><XCircle size={22}/></button>
          </div>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>scrollTo(s.id)}
              style={{display:'block',padding:'14px 0',fontSize:15,color:'rgba(240,240,248,0.75)',textDecoration:'none',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'none',border:'none',cursor:'pointer',textAlign:'left',...MONO,letterSpacing:'0.08em',textTransform:'uppercase',width:'100%'}}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div style={{display:'flex',paddingTop:57}}>

        {/* LEFT SIDEBAR — sticky */}
        <aside className="port-sidebar" style={{width:220,flexShrink:0,position:'sticky',top:57,height:'calc(100vh - 57px)',overflow:'auto',background:'rgba(4,8,18,0.6)',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',padding:'28px 12px'}}>
          {/* Mini profile */}
          <div style={{textAlign:'center',marginBottom:24,padding:'0 8px'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(74,142,219,0.1)',border:'2px solid rgba(74,142,219,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',fontWeight:700,color:'#4A8EDB',margin:'0 auto 10px',...MONO}}>PK</div>
            <div style={{fontSize:'0.8rem',fontWeight:600,color:'#F5F7FA'}}>Prasanna Kumar</div>
            <div style={{fontSize:'0.68rem',color:'#6F7A8F',...MONO,marginTop:3}}>SOC Analyst · Trust OS Builder</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginTop:6}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#4BE38A',boxShadow:'0 0 5px #4BE38A'}}/>
              <span style={{fontSize:'0.62rem',color:'#4BE38A',...MONO}}>Open to roles</span>
            </div>
          </div>
          <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)',marginBottom:16}}/>
          {/* Nav */}
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            {SECTIONS.map(s=>(
              <button key={s.id} className="sidebar-link" onClick={()=>scrollTo(s.id)}>{s.label}</button>
            ))}
          </div>
          <div style={{marginTop:'auto',paddingTop:20,display:'flex',flexDirection:'column',gap:6}}>
            <a href="tel:+353899582880" style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.65rem',color:'#6F7A8F',textDecoration:'none',...MONO}}>
              <Phone size={10}/> +353 089 958 2880
            </a>
            <a href="mailto:Prasanna80564@gmail.com" style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.65rem',color:'#6F7A8F',textDecoration:'none',...MONO}}>
              <Mail size={10}/> Prasanna80564@gmail.com
            </a>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT */}
        <main className="port-main" style={{flex:1,maxWidth:'calc(100% - 220px)'}}>

          {/* ── HERO ── */}
          <section id="hero" style={{position:'relative',minHeight:560,display:'flex',alignItems:'center',overflow:'hidden'}}>
            <HeroBg/>
            <div style={{position:'relative',zIndex:10,padding:'80px 48px',width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,alignItems:'center'}} className="hero-cols">
              <div>
                <div style={{display:'inline-flex',alignItems:'center',gap:7,padding:'5px 12px',background:'rgba(74,142,219,0.1)',border:'1px solid rgba(74,142,219,0.22)',borderRadius:20,marginBottom:22}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'#4Be38A',boxShadow:'0 0 6px #4Be38A'}}/>
                  <span style={{fontSize:'0.68rem',color:'#6BABEC',...MONO,letterSpacing:'0.1em'}}>Open to SOC / Blue Team Roles</span>
                </div>
                <h1 style={{...SERIF,fontSize:'clamp(2.4rem,5vw,4rem)',fontWeight:400,lineHeight:1.0,letterSpacing:'-0.015em',marginBottom:16}}>
                  <div style={{color:'#F5F7FA'}}>Prasanna Kumar</div>
                  <div style={{color:'#4A8EDB',fontStyle:'italic'}}>Surendran.</div>
                </h1>
                <div style={{fontSize:'0.9rem',color:'#9C7CFF',...MONO,marginBottom:14,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <span>SOC Analyst · Blue Team L1</span>
                  <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
                  <span style={{display:'flex',alignItems:'center',gap:4,color:'#6F7A8F'}}><MapPin size={12}/> Dublin, Ireland</span>
                </div>
                <p style={{fontSize:'0.88rem',color:'#A6AFBF',lineHeight:1.85,maxWidth:520,marginBottom:22}}>
                  MSc Information Systems & Computing (Dublin Business School, 2025). Hands-on experience across SIEM platforms, Active Directory security, email forensics, vulnerability assessment, and cloud infrastructure automation. Builder of AegisTrace — a trust operating system for the AI era.
                </p>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:24}}>
                  {['SC-200 ✓','Security+ ✓','TCM PEH ✓','BTL1 — 55%','MITRE ATT&CK','KQL · SPL'].map(tag=>(
                    <span key={tag} style={{background:'rgba(74,142,219,0.08)',border:'1px solid rgba(74,142,219,0.18)',color:'#6BABEC',fontSize:'0.72rem',padding:'4px 10px',borderRadius:4,...MONO}}>{tag}</span>
                  ))}
                </div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <a href="mailto:Prasanna80564@gmail.com" style={{display:'inline-flex',alignItems:'center',gap:7,background:'#4A8EDB',color:'white',borderRadius:7,padding:'11px 22px',fontSize:'0.85rem',fontWeight:600,textDecoration:'none'}}>
                    <Mail size={15}/> Get in Touch
                  </a>
                  <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.05)',color:'#D7DCE6',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,padding:'11px 20px',fontSize:'0.85rem',textDecoration:'none'}}>
                    <Linkedin size={15}/> LinkedIn
                  </a>
                  <button onClick={()=>navigate('/app/login')} style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(156,124,255,0.08)',color:'#B9A4FF',border:'1px solid rgba(156,124,255,0.2)',borderRadius:7,padding:'11px 20px',fontSize:'0.85rem',cursor:'pointer'}}>
                    <Activity size={15}/> Launch AegisTrace
                  </button>
                </div>
              </div>
              {/* Terminal animation */}
              <div>
                <TerminalWindow/>
              </div>
            </div>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:'20%',background:'linear-gradient(to top,#040812,transparent)'}}/>
          </section>

          {/* ── LIVE STATS ── */}
          <section style={{padding:'0 48px 52px'}} className="port-section">
            <div style={{fontSize:'0.65rem',color:'#3A4556',...MONO,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12,textAlign:'center'}}>Live Platform Activity — AegisTrace</div>
            <div className="port-stat-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {[
                {val:stats.total_cases,  label:'Cases Created',  color:'#4A8EDB'},
                {val:stats.closed_cases, label:'Cases Closed',   color:'#4Be38A'},
                {val:stats.total_iocs,   label:'IOCs Tracked',   color:'#9C7CFF'},
                {val:stats.vt_lookups,   label:'VT Lookups Run', color:'#F5B84B'},
              ].map(s=>(
                <div key={s.label} style={{textAlign:'center',padding:'18px 14px',background:'rgba(12,18,32,0.6)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,borderTop:`2px solid ${s.color}`}}>
                  <div style={{fontSize:'1.8rem',fontWeight:700,color:s.color,...MONO,lineHeight:1}}>{(s.val||0).toLocaleString()}</div>
                  <div style={{fontSize:'0.7rem',color:'#6F7A8F',marginTop:6,...MONO}}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── FOCUS AREAS ── */}
          <section id="focus" className="port-section" style={{padding:'52px 48px',background:'#060A16',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <SectionHead label="Focus Areas" title="Where I operate." accent="What I build."/>
            <div className="port-grid-3" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
              {FOCUS.map(({Icon,label,desc})=>(
                <div key={label} className="focus-card">
                  <Icon size={18} style={{color:'#4A8EDB',marginBottom:10}}/>
                  <div style={{fontWeight:600,fontSize:'0.86rem',marginBottom:7}}>{label}</div>
                  <div style={{fontSize:'0.74rem',color:'#8A95A8',lineHeight:1.65}}>{desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── SKILLS ── */}
          <section id="skills" className="port-section" style={{padding:'52px 48px'}}>
            <SectionHead label="Technical Skills" title="Full stack of" accent="analyst tooling."/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}} className="port-grid-2">
              {/* Skill tags */}
              <div>
                <div style={{fontSize:'0.72rem',color:'#4A8EDB',...MONO,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Skill Areas</div>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {SKILLS.map(({cat,color,tags})=>(
                    <div key={cat} style={{background:'rgba(12,18,32,0.5)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'16px 18px'}}>
                      <div style={{fontSize:'0.67rem',color,...MONO,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>{cat}
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                        {tags.map(t=><span key={t} className="skill-tag">{t}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Skill bars */}
              <div>
                <div style={{fontSize:'0.72rem',color:'#4A8EDB',...MONO,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Proficiency</div>
                <div style={{background:'rgba(12,18,32,0.5)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'20px'}}>
                  {SKILL_BARS.map(s=><SkillBar key={s.label} {...s}/>)}
                </div>
              </div>
            </div>
          </section>

          {/* ── CERTS ── */}
          <section id="certs" className="port-section" style={{padding:'52px 48px',background:'#060A16',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <SectionHead label="Certifications" title="Proven." accent="In progress. Growing."/>
            <div className="port-grid-2" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
              {CERTS.map(c=>(
                <div key={c.name} style={{background:'rgba(12,18,32,0.6)',border:`1px solid ${c.status==='completed'?`${c.color}30`:'rgba(255,255,255,0.07)'}`,borderRadius:10,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,transition:'border-color 0.2s',borderLeft:`2px solid ${c.status==='completed'?c.color:'rgba(255,255,255,0.1)'}`,opacity:c.status==='ongoing'?0.75:1}}>
                  <div style={{flexShrink:0}}>
                    {c.status==='completed'?<CheckCircle size={18} style={{color:c.color}}/>:<Clock size={18} style={{color:'#6F7A8F'}}/>}
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:'0.86rem',color:c.status==='completed'?'#F5F7FA':'#A6AFBF'}}>{c.name}</div>
                    <div style={{fontSize:'0.72rem',color:'#6F7A8F',marginTop:2,...MONO}}>{c.sub}</div>
                    <div style={{fontSize:'0.68rem',color:c.status==='completed'?'#4Be38A':'#F5B84B',marginTop:4,...MONO}}>{c.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── PROJECTS ── */}
          <section id="projects" className="port-section" style={{padding:'52px 48px'}}>
            <SectionHead label="Projects" title="Things I've" accent="built and shipped."/>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {PROJECTS.map(p=>(
                <div key={p.title} className="proj-card" style={{borderColor:p.highlight?'rgba(74,142,219,0.2)':'rgba(255,255,255,0.07)'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,marginBottom:12,alignItems:'flex-start'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                        <span style={{background:`${p.badgeColor}15`,border:`1px solid ${p.badgeColor}35`,color:p.badgeColor,fontSize:'0.65rem',fontWeight:600,padding:'3px 9px',borderRadius:4,...MONO}}>{p.badge}</span>
                        <span style={{fontSize:'0.68rem',color:'#6F7A8F',...MONO}}>{p.period}</span>
                      </div>
                      <div style={{fontWeight:700,fontSize:'0.95rem'}}>{p.title}</div>
                    </div>
                    {p.link&&<a href={p.link} target="_blank" rel="noreferrer" style={{color:'#6F7A8F',textDecoration:'none'}} onMouseEnter={e=>e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e=>e.currentTarget.style.color='#6F7A8F'}><Github size={15}/></a>}
                    {!p.link&&p.highlight&&<span style={{fontSize:'0.65rem',color:'#4A8EDB',...MONO}}>aegistrace.io</span>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:p.features?'1fr 1fr':'1fr',gap:16,alignItems:'start'}}>
                    <div>
                      <div style={{fontSize:'0.8rem',color:'#8A95A8',lineHeight:1.7,marginBottom:12}}>{p.desc}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                        {p.tags.map(t=>(
                          <span key={t} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',color:'#6F7A8F',fontSize:'0.67rem',padding:'2px 7px',borderRadius:3,...MONO}}>{t}</span>
                        ))}
                      </div>
                    </div>
                    {p.features&&(
                      <div style={{background:'rgba(74,142,219,0.04)',border:'1px solid rgba(74,142,219,0.1)',borderRadius:8,padding:'14px 16px'}}>
                        {p.features.map(f=>(
                          <div key={f} style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.72rem',color:'#6BABEC',padding:'3px 0'}}>
                            <ChevronRight size={10} style={{color:'#4A8EDB',flexShrink:0}}/>{f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── PUBLIC CASES ── */}
          {publicCases.length>0&&(
            <section className="port-section" style={{padding:'52px 48px',background:'#060A16',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
              <SectionHead label="Published Investigations" title="Real cases." accent="Real analysis."/>
              <div className="port-grid-2" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
                {publicCases.map(c=>(
                  <div key={c.id} className="case-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                      <span style={{fontSize:'0.68rem',color:'#6F7A8F',...MONO}}>{c.case_number}</span>
                    </div>
                    <div style={{fontWeight:600,fontSize:'0.9rem',marginBottom:8}}>{c.title}</div>
                    {c.ai_executive_summary&&<div style={{fontSize:'0.77rem',color:'#8A95A8',lineHeight:1.7,marginBottom:14}}>{c.ai_executive_summary.slice(0,160)}…</div>}
                    <button onClick={()=>navigate(`/public/${c.share_token}`)} style={{display:'inline-flex',alignItems:'center',gap:5,background:'none',border:'1px solid rgba(74,142,219,0.2)',color:'#4A8EDB',borderRadius:5,padding:'6px 12px',fontSize:'0.74rem',cursor:'pointer',...MONO}}>
                      Read Full Case <ArrowRight size={11}/>
                    </button>
                  </div>
                ))}
              </div>
              <div style={{marginTop:20,textAlign:'center'}}>
                <button onClick={()=>navigate('/public')} style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(74,142,219,0.06)',border:'1px solid rgba(74,142,219,0.15)',color:'#6BABEC',borderRadius:7,padding:'10px 22px',fontSize:'0.8rem',cursor:'pointer'}}>
                  View All Published Cases <ArrowRight size={13}/>
                </button>
              </div>
            </section>
          )}

          {/* ── EDUCATION ── */}
          <section id="edu" className="port-section" style={{padding:'52px 48px'}}>
            <SectionHead label="Education" title="Academic" accent="foundation."/>
            <div className="port-grid-2" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
              {[
                {degree:'MSc Information Systems & Computing',school:'Dublin Business School (DBS)',year:'2024–2025',note:'Dissertation: WebSecGuard Chrome Extension — real-time XSS/CSRF detection',color:'#4A8EDB'},
                {degree:'B.E. Electronics and Communication Engineering',school:'PSG College of Technology, Coimbatore',year:'2019–2023',note:'Strong foundation in electronics, embedded systems, signal processing, and hardware-software integration',color:'#9C7CFF'},
              ].map(e=>(
                <div key={e.degree} style={{background:'rgba(12,18,32,0.5)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'22px',borderLeft:`2px solid ${e.color}`}}>
                  <div style={{fontWeight:600,fontSize:'0.9rem',marginBottom:5}}>{e.degree}</div>
                  <div style={{fontSize:'0.78rem',color:e.color,...MONO,marginBottom:4}}>{e.school}</div>
                  <div style={{fontSize:'0.7rem',color:'#6F7A8F',...MONO,marginBottom:10}}>{e.year}</div>
                  <div style={{fontSize:'0.76rem',color:'#8A95A8',lineHeight:1.6}}>{e.note}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CONTACT ── */}
          <section id="contact" className="port-section" style={{padding:'52px 48px',background:'#060A16',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{maxWidth:680,margin:'0 auto',textAlign:'center'}}>
              <SectionHead label="Let's Connect" title="Actively seeking" accent="the right role."/>
              <p style={{fontSize:'0.88rem',color:'#A6AFBF',lineHeight:1.8,marginBottom:32}}>
                Seeking SOC Analyst, Blue Team, or Cybersecurity roles in Dublin and internationally. Available immediately. All enquiries responded to within 24 hours.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:10,maxWidth:360,margin:'0 auto'}}>
                <a href="mailto:Prasanna80564@gmail.com" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'#4A8EDB',color:'white',borderRadius:8,padding:'13px',fontSize:'0.85rem',fontWeight:600,textDecoration:'none'}}><Mail size={15}/> Prasanna80564@gmail.com</a>
                <a href="tel:+353899582880" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'rgba(255,255,255,0.05)',color:'#D7DCE6',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'12px',fontSize:'0.85rem',textDecoration:'none'}}><Phone size={15}/> +353 089 958 2880</a>
                <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'rgba(255,255,255,0.05)',color:'#D7DCE6',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'12px',fontSize:'0.85rem',textDecoration:'none'}}><Linkedin size={15}/> LinkedIn Profile</a>
                <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'rgba(255,255,255,0.05)',color:'#D7DCE6',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'12px',fontSize:'0.85rem',textDecoration:'none'}}><Github size={15}/> GitHub Profile</a>
              </div>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'22px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <Logo size={18} showText/>
            <div style={{fontSize:'0.7rem',color:'#3A4556',...MONO}}>Prasanna Kumar Surendran · Dublin, Ireland · 2025–2026</div>
            <div style={{display:'flex',gap:16}}>
              <a href="/" style={{fontSize:'0.7rem',color:'#3A4556',textDecoration:'none',...MONO}} onMouseEnter={e=>e.currentTarget.style.color='#6F7A8F'} onMouseLeave={e=>e.currentTarget.style.color='#3A4556'}>Home</a>
              <a href="/mission" style={{fontSize:'0.7rem',color:'#3A4556',textDecoration:'none',...MONO}} onMouseEnter={e=>e.currentTarget.style.color='#6F7A8F'} onMouseLeave={e=>e.currentTarget.style.color='#3A4556'}>Mission</a>
              <a href="/app/login" style={{fontSize:'0.7rem',color:'#3A4556',textDecoration:'none',...MONO}} onMouseEnter={e=>e.currentTarget.style.color='#6F7A8F'} onMouseLeave={e=>e.currentTarget.style.color='#3A4556'}>App</a>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
