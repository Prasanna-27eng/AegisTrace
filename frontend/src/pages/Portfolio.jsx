import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Github, Linkedin, Mail, Phone, ArrowRight, Award, Code, Briefcase,
  Shield, Brain, Terminal, GitMerge, Activity, ChevronRight,
  MapPin, GraduationCap, Download, ExternalLink, CheckCircle, Clock
} from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';

/* ─── Mini particle bg for hero ────────────────────────────────────────── */
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

/* ─── Data ──────────────────────────────────────────────────────────────── */
const SKILLS = [
  {
    cat: 'SIEM & Detection Engineering',
    color: '#4A8EDB',
    tags: ['Microsoft Sentinel', 'Splunk SIEM', 'KQL', 'SPL', 'Log Correlation', 'Detection Rules', 'Alert Tuning'],
  },
  {
    cat: 'Endpoint & Identity Security',
    color: '#9C7CFF',
    tags: ['MS Defender for Endpoint', 'Active Directory', 'Identity Protection', 'EDR Response', 'Group Policy', 'AWS Security'],
  },
  {
    cat: 'Offensive Security & PenTest',
    color: '#F5B84B',
    tags: ['Burp Suite', 'Nmap', 'Nessus', 'Metasploit', 'OWASP Top 10', 'Wireshark', 'Gobuster'],
  },
  {
    cat: 'Forensics & Threat Intel',
    color: '#4BE38A',
    tags: ['Email Forensics', 'PCAP Analysis', 'OSINT', 'MITRE ATT&CK', 'VirusTotal', 'Phishing Investigation', 'IOC Hunting'],
  },
  {
    cat: 'Cloud & DevSecOps',
    color: '#4A8EDB',
    tags: ['AWS EC2 / S3 / IAM', 'Docker', 'Terraform', 'Ansible', 'GitHub Actions', 'Python', 'Bash Scripting'],
  },
  {
    cat: 'Frameworks & Compliance',
    color: '#9C7CFF',
    tags: ['GDPR', 'ISO 27001', 'NIST CSF', 'SOC 2', 'DORA', 'Cyber Kill Chain', 'Diamond Model'],
  },
];

const CERTS = [
  { name: 'Microsoft SC-200',            sub: 'Security Operations Associate',  date: 'Apr 2026', status: 'completed', color: '#0078D4' },
  { name: 'CompTIA Security+',           sub: 'SY0-701',                        date: 'Sep 2024', status: 'completed', color: '#EF4444' },
  { name: 'TCM Practical Ethical Hacking', sub: 'TCM Security',                 date: 'Oct 2024', status: 'completed', color: '#4BE38A' },
  { name: 'TCM Practical Help Desk',     sub: 'TCM Security',                   date: 'Oct 2024', status: 'completed', color: '#4BE38A' },
  { name: 'AIG Shield Up',               sub: 'Forage Job Simulation',          date: 'Mar 2025', status: 'completed', color: '#F5B84B' },
  { name: 'BTL1',                        sub: 'Security Blue Team Level 1',     date: '55% — In Progress', status: 'ongoing', color: '#4A8EDB' },
  { name: 'eJPT',                        sub: 'eLearnSecurity Junior PenTester', date: '20% — In Progress', status: 'ongoing', color: '#9C7CFF' },
  { name: 'SC-300',                      sub: 'Microsoft Identity & Access',    date: '15% — In Progress', status: 'ongoing', color: '#0078D4' },
];

const PROJECTS = [
  {
    title: 'AegisTrace — Identity-First SOC Control Plane',
    period: 'Jun 2025 — Present',
    desc: 'Production-grade SOC investigation platform built on identity-first security principles. v4.0 ships ITDR — four real-time detectors (credential stuffing, impossible travel, new device, privilege escalation). Includes a pluggable identity risk engine, Identity Graph, Trust Timeline, Provenance Ledger, Policy Engine, and Terminal Lab. All AI decisions carry full reasoning chains. Deployed on Render free tier.',
    tags: ['React', 'FastAPI', 'Groq AI', 'VirusTotal', 'SQLite', 'Docker', 'Render', 'ITDR'],
    badge: 'Live — v4.0',
    badgeColor: '#4BE38A',
    link: null,
    highlight: true,
    features: [
      'ITDR — credential stuffing, impossible travel, new device, privilege escalation detection',
      'Pluggable identity risk engine with 3 detectors + policy enforcement',
      'Explainable AI — full reasoning chain on every verdict',
      '7-source IOC enrichment + 18 hardware forensic tools',
      'Email forensics (SPF/DKIM/DMARC) + DORA Article 19 compliance',
    ],
  },
  {
    title: 'WebSecGuard — Browser Vulnerability Scanner',
    period: 'Jun–Sep 2025 · MSc Dissertation',
    desc: 'Chrome extension (Manifest V3) for real-time XSS and CSRF detection. Identifies injection points, flags unprotected forms, and surfaces hidden attack surfaces. Detected 25+ injection points on OWASP Juice Shop during testing.',
    tags: ['JavaScript', 'Chrome Extension API', 'Manifest V3', 'OWASP', 'Burp Suite'],
    badge: 'Security Research',
    badgeColor: '#EF4444',
    link: 'https://github.com/prasanna80564/web-scanner-',
    highlight: false,
  },
  {
    title: 'Grand Line SOC Dashboard',
    period: 'May 2026',
    desc: 'Full-featured SOC dashboard with MITRE ATT&CK mapping, VirusTotal IOC enrichment, AI-generated case summaries, role-based access control, and one-click PDF report export. Built with Firebase real-time backend.',
    tags: ['React 18', 'Firebase', 'MITRE ATT&CK', 'VirusTotal API', 'Groq AI', 'RBAC'],
    badge: 'Blue Team',
    badgeColor: '#9C7CFF',
    link: 'https://github.com/Prasanna-27eng/grant-line-soc-',
    highlight: false,
  },
  {
    title: 'Automated Cloud Deployment & CI/CD',
    period: 'Jan–Mar 2025',
    desc: 'End-to-end automated deployment pipeline to AWS EC2. Infrastructure-as-code with Terraform, configuration management via Ansible, CI/CD through GitHub Actions. Reduced deployment time by 70% and eliminated manual configuration drift.',
    tags: ['Terraform', 'Ansible', 'Docker', 'AWS EC2', 'GitHub Actions', 'IaC'],
    badge: 'Cloud/DevOps',
    badgeColor: '#4A8EDB',
    link: 'https://github.com/prasanna80564/networking',
    highlight: false,
  },
];

const FOCUS = [
  { Icon: Shield,   label: 'SOC Operations',        desc: 'Alert triage, incident response, case management, threat investigation in Sentinel and Splunk.' },
  { Icon: Brain,    label: 'AI-Augmented Analysis',  desc: 'Multi-model AI routing for IOC extraction, email classification, case analysis, and YARA generation.' },
  { Icon: GitMerge, label: 'Identity Security',      desc: 'Tracking compromised identities, service accounts, API keys, and agents as first-class security entities.' },
  { Icon: Terminal, label: 'Security Tooling',       desc: 'Building open-source analyst tools that solve real SOC pain points, deployed on free infrastructure.' },
  { Icon: Activity, label: 'Threat Hunting',         desc: 'Cross-case IOC correlation, campaign detection, MITRE heatmaps, and proactive threat pattern discovery.' },
];

const MONO = { fontFamily: 'JetBrains Mono, monospace' };
const SERIF = { fontFamily: 'Instrument Serif, Georgia, serif' };

/* ─── Main ──────────────────────────────────────────────────────────────── */
export default function Portfolio() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_cases: 0, total_iocs: 0, vt_lookups: 0, closed_cases: 0 });
  const [publicCases, setPublicCases] = useState([]);

  useEffect(() => {
    api.get('/api/portfolio/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/api/public/cases').then(r => setPublicCases(r.data)).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#040812', color: '#F5F7FA', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&family=Inter:wght@300;400;500;600;700&display=swap');
        ::selection{background:rgba(74,142,219,0.3);color:#fff}
        .port-nav-link{color:#6F7A8F;text-decoration:none;font-size:0.78rem;transition:color 0.2s;font-family:'JetBrains Mono',monospace;letter-spacing:0.06em;text-transform:uppercase}
        .port-nav-link:hover{color:#F5F7FA}
        .skill-tag{background:rgba(74,142,219,0.06);border:1px solid rgba(74,142,219,0.15);color:#6BABEC;font-size:0.71rem;padding:4px 10px;border-radius:4px;font-family:'JetBrains Mono',monospace}
        .cert-card{background:rgba(12,18,32,0.6);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px;transition:border-color 0.2s}
        .cert-card:hover{border-color:rgba(74,142,219,0.2)}
        .proj-card{background:rgba(12,18,32,0.6);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:22px;transition:border-color 0.2s,transform 0.2s;display:flex;flex-direction:column}
        .proj-card:hover{border-color:rgba(74,142,219,0.2);transform:translateY(-2px)}
        .case-card{background:rgba(12,18,32,0.6);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:18px 20px;border-left:2px solid #4A8EDB;transition:border-color 0.2s}
        .case-card:hover{border-color:rgba(74,142,219,0.4)}
        @media(max-width:767px){.port-section{padding:48px 20px!important}.port-grid-2{grid-template-columns:1fr!important}.port-grid-3{grid-template-columns:1fr!important}.port-stat-grid{grid-template-columns:1fr 1fr!important}}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(4,8,18,0.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size={22} showText />
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="/" className="port-nav-link">Home</a>
          <a href="/mission" className="port-nav-link">Mission</a>
          <a href="/public" className="port-nav-link">Cases</a>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '7px 14px', fontSize: '0.78rem', color: '#D7DCE6', textDecoration: 'none' }}>
            <Github size={13} /> GitHub
          </a>
          <a href="mailto:Prasanna80564@gmail.com"
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#4A8EDB', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: '0.78rem', color: 'white', textDecoration: 'none', fontWeight: 600 }}>
            <Mail size={13} /> Contact
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: 560, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <HeroBg />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1100, margin: '0 auto', padding: '80px 48px', width: '100%', display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center' }}
          className="port-grid-2">
          <div>
            {/* Status badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: 'rgba(74,142,219,0.1)', border: '1px solid rgba(74,142,219,0.22)', borderRadius: 20, marginBottom: 22 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4BE38A', boxShadow: '0 0 6px #4BE38A' }} />
              <span style={{ fontSize: '0.68rem', color: '#6BABEC', ...MONO, letterSpacing: '0.1em' }}>Open to SOC / Blue Team Roles</span>
            </div>

            <h1 style={{ ...SERIF, fontSize: 'clamp(2.4rem,5vw,4rem)', fontWeight: 400, lineHeight: 1.0, letterSpacing: '-0.015em', marginBottom: 16 }}>
              <div style={{ color: '#F5F7FA' }}>Prasanna Kumar</div>
              <div style={{ color: '#4A8EDB', fontStyle: 'italic' }}>Surendran.</div>
            </h1>

            <div style={{ fontSize: '0.95rem', color: '#9C7CFF', ...MONO, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>SOC Analyst · Blue Team L1</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6F7A8F' }}><MapPin size={12} /> Dublin, Ireland</span>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#A6AFBF', lineHeight: 1.85, maxWidth: 580, marginBottom: 24 }}>
              MSc Information Systems & Computing (Dublin Business School, 2025). Hands-on experience across SIEM platforms, Active Directory security, email forensics, vulnerability assessment, and cloud infrastructure automation. Builder of AegisTrace — an open-source SOC control plane benchmarked against commercial platforms.
            </p>

            {/* Key credentials */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {['SC-200 ✓', 'Security+ ✓', 'TCM PEH ✓', 'BTL1 — 55%', 'MITRE ATT&CK', 'KQL · SPL'].map(tag => (
                <span key={tag} style={{ background: 'rgba(74,142,219,0.08)', border: '1px solid rgba(74,142,219,0.18)', color: '#6BABEC', fontSize: '0.72rem', padding: '4px 10px', borderRadius: 4, ...MONO }}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="mailto:Prasanna80564@gmail.com"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#4A8EDB', color: 'white', borderRadius: 7, padding: '11px 22px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                <Mail size={15} /> Get in Touch
              </a>
              <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.05)', color: '#D7DCE6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '11px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>
                <Linkedin size={15} /> LinkedIn
              </a>
              <button onClick={() => navigate('/app/login')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(156,124,255,0.08)', color: '#B9A4FF', border: '1px solid rgba(156,124,255,0.2)', borderRadius: 7, padding: '11px 20px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <Activity size={15} /> Launch AegisTrace
              </button>
            </div>
          </div>

          {/* Avatar block */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(74,142,219,0.1)', border: '2px solid rgba(74,142,219,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 700, color: '#4A8EDB', margin: '0 auto 14px', ...MONO }}>PK</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href="tel:+353899582880" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6F7A8F', textDecoration: 'none', ...MONO, justifyContent: 'center' }}
                onMouseEnter={e=>e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e=>e.currentTarget.style.color='#6F7A8F'}>
                <Phone size={11} /> +353 089 958 2880
              </a>
              <a href="mailto:Prasanna80564@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6F7A8F', textDecoration: 'none', ...MONO, justifyContent: 'center' }}
                onMouseEnter={e=>e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e=>e.currentTarget.style.color='#6F7A8F'}>
                <Mail size={11} /> Prasanna80564@gmail.com
              </a>
              <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6F7A8F', textDecoration: 'none', ...MONO, justifyContent: 'center' }}
                onMouseEnter={e=>e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e=>e.currentTarget.style.color='#6F7A8F'}>
                <Github size={11} /> github.com/Prasanna-27eng
              </a>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%', background: 'linear-gradient(to top,#040812,transparent)' }}/>
      </section>

      {/* ── LIVE STATS ── */}
      <section style={{ padding: '0 48px 60px' }} className="port-section">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: '0.65rem', color: '#3A4556', ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14, textAlign: 'center' }}>Live Platform Activity — AegisTrace</div>
          <div className="port-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { val: stats.total_cases,   label: 'Cases Created',    color: '#4A8EDB' },
              { val: stats.closed_cases,  label: 'Cases Closed',     color: '#4BE38A' },
              { val: stats.total_iocs,    label: 'IOCs Tracked',     color: '#9C7CFF' },
              { val: stats.vt_lookups,    label: 'VT Lookups Run',   color: '#F5B84B' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '20px 16px', background: 'rgba(12,18,32,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                <div style={{ fontSize: '1.9rem', fontWeight: 700, color: s.color, ...MONO, lineHeight: 1 }}>{(s.val||0).toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', color: '#6F7A8F', marginTop: 6, ...MONO }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOCUS AREAS ── */}
      <section className="port-section" style={{ padding: '60px 48px', background: '#060A16', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: '0.65rem', color: '#4A8EDB', ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>◇ Focus Areas</div>
          <h2 style={{ ...SERIF, fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 400, marginBottom: 32, letterSpacing: '-0.015em' }}>
            Where I operate. <span style={{ color: '#4A8EDB', fontStyle: 'italic' }}>What I build.</span>
          </h2>
          <div className="port-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
            {FOCUS.map(({ Icon, label, desc }) => (
              <div key={label} style={{ padding: '20px', background: 'rgba(12,18,32,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, transition: 'border-color 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(74,142,219,0.2)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
                <Icon size={18} style={{ color: '#4A8EDB', marginBottom: 10 }} />
                <div style={{ fontWeight: 600, fontSize: '0.86rem', marginBottom: 7 }}>{label}</div>
                <div style={{ fontSize: '0.74rem', color: '#8A95A8', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SKILLS ── */}
      <section className="port-section" style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: '0.65rem', color: '#4A8EDB', ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Code size={11} /> ◇ Technical Skills
          </div>
          <h2 style={{ ...SERIF, fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', fontWeight: 400, marginBottom: 28, letterSpacing: '-0.015em' }}>
            Full stack of <span style={{ color: '#4A8EDB', fontStyle: 'italic' }}>analyst tooling.</span>
          </h2>
          <div className="port-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
            {SKILLS.map(({ cat, color, tags }) => (
              <div key={cat} style={{ background: 'rgba(12,18,32,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: '0.67rem', color, ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{cat}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map(t => <span key={t} className="skill-tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CERTS ── */}
      <section className="port-section" style={{ padding: '60px 48px', background: '#060A16', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: '0.65px', color: '#4A8EDB', ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Award size={11} style={{ color: '#4A8EDB' }} /> ◇ Certifications
          </div>
          <h2 style={{ ...SERIF, fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', fontWeight: 400, marginBottom: 28, letterSpacing: '-0.015em' }}>
            Proven. <span style={{ color: '#9C7CFF', fontStyle: 'italic' }}>In progress. Growing.</span>
          </h2>
          <div className="port-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
            {CERTS.map(c => (
              <div key={c.name} className="cert-card" style={{ borderLeft: `2px solid ${c.status === 'completed' ? c.color : 'rgba(255,255,255,0.1)'}`, opacity: c.status === 'ongoing' ? 0.75 : 1 }}>
                <div style={{ flexShrink: 0 }}>
                  {c.status === 'completed'
                    ? <CheckCircle size={18} style={{ color: c.color }} />
                    : <Clock size={18} style={{ color: '#6F7A8F' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: c.status==='completed' ? '#F5F7FA' : '#A6AFBF' }}>{c.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6F7A8F', marginTop: 2, ...MONO }}>{c.sub}</div>
                  <div style={{ fontSize: '0.68rem', color: c.status==='completed' ? '#4BE38A' : '#F5B84B', marginTop: 4, ...MONO }}>{c.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROJECTS ── */}
      <section className="port-section" style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: '0.65rem', color: '#4A8EDB', ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Briefcase size={11} /> ◇ Projects
          </div>
          <h2 style={{ ...SERIF, fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', fontWeight: 400, marginBottom: 28, letterSpacing: '-0.015em' }}>
            Things I've <span style={{ color: '#4A8EDB', fontStyle: 'italic' }}>built and shipped.</span>
          </h2>
          <div className="port-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
            {PROJECTS.map(p => (
              <div key={p.title} className="proj-card"
                style={{ borderColor: p.highlight ? 'rgba(74,142,219,0.2)' : 'rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ background: `${p.badgeColor}15`, border: `1px solid ${p.badgeColor}35`, color: p.badgeColor, fontSize: '0.65rem', fontWeight: 600, padding: '3px 9px', borderRadius: 4, ...MONO }}>{p.badge}</span>
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noreferrer" style={{ color: '#6F7A8F', textDecoration: 'none' }}
                      onMouseEnter={e=>e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e=>e.currentTarget.style.color='#6F7A8F'}>
                      <Github size={15} />
                    </a>
                  )}
                  {!p.link && p.highlight && (
                    <span style={{ fontSize: '0.65rem', color: '#4A8EDB', ...MONO }}>aegistrace.io</span>
                  )}
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: '0.68rem', color: '#6F7A8F', ...MONO, marginBottom: 10 }}>{p.period}</div>
                <div style={{ fontSize: '0.8rem', color: '#8A95A8', lineHeight: 1.7, flex: 1, marginBottom: 14 }}>{p.desc}</div>

                {p.features && (
                  <div style={{ marginBottom: 14 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6BABEC', padding: '3px 0' }}>
                        <ChevronRight size={10} style={{ color: '#4A8EDB', flexShrink: 0 }} />{f}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {p.tags.map(t => (
                    <span key={t} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6F7A8F', fontSize: '0.67rem', padding: '2px 7px', borderRadius: 3, ...MONO }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PUBLIC CASES ── */}
      {publicCases.length > 0 && (
        <section className="port-section" style={{ padding: '60px 48px', background: '#060A16', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: '0.65rem', color: '#4A8EDB', ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>◇ Published Investigations</div>
            <h2 style={{ ...SERIF, fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', fontWeight: 400, marginBottom: 28, letterSpacing: '-0.015em' }}>
              Real cases. <span style={{ color: '#4A8EDB', fontStyle: 'italic' }}>Real analysis.</span>
            </h2>
            <div className="port-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
              {publicCases.map(c => (
                <div key={c.id} className="case-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.68rem', color: '#6F7A8F', ...MONO }}>{c.case_number}</span>
                    <span className={`badge sev-${c.severity}`}>{c.severity?.toUpperCase()}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>{c.title}</div>
                  {c.ai_executive_summary && (
                    <div style={{ fontSize: '0.77rem', color: '#8A95A8', lineHeight: 1.7, marginBottom: 14 }}>
                      {c.ai_executive_summary.slice(0, 160)}…
                    </div>
                  )}
                  <button onClick={() => navigate(`/public/${c.share_token}`)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid rgba(74,142,219,0.2)', color: '#4A8EDB', borderRadius: 5, padding: '6px 12px', fontSize: '0.74rem', cursor: 'pointer', ...MONO }}>
                    Read Full Case <ArrowRight size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button onClick={() => navigate('/public')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(74,142,219,0.06)', border: '1px solid rgba(74,142,219,0.15)', color: '#6BABEC', borderRadius: 7, padding: '10px 22px', fontSize: '0.8rem', cursor: 'pointer' }}>
                View All Published Cases <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── EDUCATION ── */}
      <section className="port-section" style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: '0.65rem', color: '#4A8EDB', ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
            <GraduationCap size={11} /> ◇ Education
          </div>
          <div className="port-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
            {[
              { degree: 'MSc Information Systems & Computing', school: 'Dublin Business School (DBS)', year: '2024–2025', note: 'Dissertation: WebSecGuard Chrome Extension — real-time XSS/CSRF detection', color: '#4A8EDB' },
              { degree: 'B.E. Electronics and Communication Engineering', school: 'PSG College of Technology, Coimbatore', year: '2019–2023', note: 'Strong foundation in electronics, embedded systems, signal processing, and hardware-software integration', color: '#9C7CFF' },
            ].map(e => (
              <div key={e.degree} style={{ background: 'rgba(12,18,32,0.5)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '20px', borderLeft: `2px solid ${e.color}` }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{e.degree}</div>
                <div style={{ fontSize: '0.78rem', color: e.color, ...MONO, marginBottom: 4 }}>{e.school}</div>
                <div style={{ fontSize: '0.7rem', color: '#6F7A8F', ...MONO, marginBottom: 10 }}>{e.year}</div>
                <div style={{ fontSize: '0.76rem', color: '#8A95A8', lineHeight: 1.6 }}>{e.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="port-section" style={{ padding: '60px 48px', background: '#060A16', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#4A8EDB', ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>◇ Let's Connect</div>
          <h2 style={{ ...SERIF, fontSize: 'clamp(1.8rem,3vw,2.8rem)', fontWeight: 400, letterSpacing: '-0.015em', marginBottom: 14 }}>
            Actively seeking <span style={{ color: '#4A8EDB', fontStyle: 'italic' }}>the right role.</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#A6AFBF', lineHeight: 1.8, marginBottom: 32, maxWidth: 520, margin: '0 auto 32px' }}>
            Seeking SOC Analyst, Blue Team, or Cybersecurity roles in Dublin and internationally. Available immediately. All enquiries responded to within 24 hours.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360, margin: '0 auto' }}>
            <a href="mailto:Prasanna80564@gmail.com"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#4A8EDB', color: 'white', borderRadius: 8, padding: '13px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              <Mail size={15} /> Prasanna80564@gmail.com
            </a>
            <a href="tel:+353899582880"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#D7DCE6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px', fontSize: '0.85rem', textDecoration: 'none' }}>
              <Phone size={15} /> +353 089 958 2880
            </a>
            <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#D7DCE6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px', fontSize: '0.85rem', textDecoration: 'none' }}>
              <Linkedin size={15} /> LinkedIn Profile
            </a>
            <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#D7DCE6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px', fontSize: '0.85rem', textDecoration: 'none' }}>
              <Github size={15} /> GitHub Profile
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '22px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Logo size={18} showText />
        <div style={{ fontSize: '0.7rem', color: '#3A4556', ...MONO }}>Prasanna Kumar Surendran · Dublin, Ireland · 2025–2026</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/" style={{ fontSize: '0.7rem', color: '#3A4556', textDecoration: 'none', ...MONO }} onMouseEnter={e=>e.currentTarget.style.color='#6F7A8F'} onMouseLeave={e=>e.currentTarget.style.color='#3A4556'}>Home</a>
          <a href="/mission" style={{ fontSize: '0.7rem', color: '#3A4556', textDecoration: 'none', ...MONO }} onMouseEnter={e=>e.currentTarget.style.color='#6F7A8F'} onMouseLeave={e=>e.currentTarget.style.color='#3A4556'}>Mission</a>
          <a href="/app/login" style={{ fontSize: '0.7rem', color: '#3A4556', textDecoration: 'none', ...MONO }} onMouseEnter={e=>e.currentTarget.style.color='#6F7A8F'} onMouseLeave={e=>e.currentTarget.style.color='#3A4556'}>App</a>
        </div>
      </footer>
    </div>
  );
}
