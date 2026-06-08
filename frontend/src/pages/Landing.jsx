import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check, Shield, Brain, GitMerge, Fingerprint, FolderSearch,
         Mail, Monitor, Activity, Globe, Bell, UserX, Bot, ShieldAlert, Boxes,
         GitBranch, Layers, ShieldCheck, Crosshair, TrendingUp, Wifi, Cpu,
         Zap, Lock, ArrowUpRight, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

/* ═══════════════════════════════════════════════════════════════════════════
   AEGISTRACE LANDING  ·  Prisma Visual Language × Emil Kowalski × Impeccable
   ───────────────────────────────────────────────────────────────────────────
   Emil easing:      [0.23, 1, 0.32, 1] — no ease-in, only ease-out
   Typography scale: 200px hero → 60px h2 → 16px body → 11px label
   Spacing:          8px base unit · 16 · 24 · 40 · 64 · 100 · 120
   Contrast:         #E1E0CC on black ≥ 11:1 · subtext ≥ 4.5:1
   Motion:           scale(0.97) :active · stagger 60ms · prefers-reduced
   Color:            #E1E0CC cream · #DEDBC8 primary · #C0392B accent
   Fonts:            Almarai 300–800 + Instrument Serif italic
   ═══════════════════════════════════════════════════════════════════════════ */

const E   = [0.23, 1, 0.32, 1];          // Emil EASE_OUT (no ease-in)
const EC  = [0.22, 1, 0.36, 1];          // card entrance
const MONO = { fontFamily: 'JetBrains Mono,monospace' };

/* ─── SVG noise textures (Prisma spec) ─────────────────────────────────── */
const NOISE_HERO    = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const NOISE_SECTION = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ─── CSS fallback when video fails ────────────────────────────────────── */
function CyberBg() {
  return (
    <div aria-hidden style={{ position:'absolute',inset:0,overflow:'hidden',background:'#03010a' }}>
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 60% at 50% 60%,rgba(192,57,43,0.44) 0%,rgba(100,10,5,0.22) 45%,transparent 72%)' }}/>
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 44% 36% at 90% 7%,rgba(0,200,175,0.14) 0%,transparent 55%)' }}/>
      <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(192,57,43,0.22) 1px,transparent 1px),linear-gradient(90deg,rgba(192,57,43,0.22) 1px,transparent 1px)',backgroundSize:'72px 72px' }}/>
      <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(192,57,43,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(192,57,43,0.4) 1px,transparent 1px)',backgroundSize:'360px 360px' }}/>
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 130% 130% at 50% 50%,transparent 36%,rgba(0,0,0,0.92) 100%)' }}/>
      <div style={{ position:'absolute',left:0,right:0,height:2,top:0,background:'linear-gradient(90deg,transparent 5%,rgba(192,57,43,0.75) 35%,#fff 50%,rgba(192,57,43,0.75) 65%,transparent 95%)',boxShadow:'0 0 24px 4px rgba(200,60,40,0.55)',animation:'scan 7s linear infinite' }}/>
      <style>{`
        @keyframes scan{0%{top:-2px}100%{top:100%}}
      `}</style>
    </div>
  );
}

/* ─── WordsPullUp ───────────────────────────────────────────────────────── */
function WordsPullUp({ text, showAsterisk=false, style={} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-80px' });
  const words = text.split(' ');
  return (
    <span ref={ref} style={{ display:'inline-flex', flexWrap:'wrap', gap:'0 0.26em', ...style }}>
      {words.map((w, i) => (
        <span key={i} style={{ overflow:'hidden', display:'inline-flex' }}>
          <motion.span
            style={{ display:'inline-block', position:'relative' }}
            initial={{ y:'108%', opacity:0 }}
            animate={inView ? { y:0, opacity:1 } : {}}
            transition={{ duration:0.78, delay:i*0.07, ease:E }}
          >
            {w}
            {showAsterisk && i===words.length-1 && (
              <sup style={{ position:'absolute', top:'0.65em', right:'-0.35em', fontSize:'0.31em', fontWeight:300, letterSpacing:0 }}>*</sup>
            )}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ─── Scroll-linked character opacity (Prisma About) ───────────────────── */
function CharReveal({ text, scrollYProgress }) {
  return (
    <>
      {text.split('').map((char, i) => {
        const total = text.length;
        const start = i/total - 0.1;
        const end   = i/total + 0.05;
        const opacity = useTransform(scrollYProgress, [Math.max(0,start), Math.min(1,end)], [0.18, 1]);
        return <motion.span key={i} style={{ opacity }}>{char}</motion.span>;
      })}
    </>
  );
}

/* ─── Section reveal ────────────────────────────────────────────────────── */
function Reveal({ children, delay=0, style={} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:28 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.75, delay, ease:E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Live ingestion stream ─────────────────────────────────────────────── */
const STREAM = [
  { c:'#EF4444', t:'CRITICAL', m:'CrowdStrike — PowerShell lateral movement · host win-dc-03' },
  { c:'#EAB308', t:'HIGH',     m:'Sentinel — Impossible travel detected · user j.chen@corp' },
  { c:'#22C55E', t:'BLOCKED',  m:'AegisTrace — Auto-block · endpoint isolated · case AT-2847' },
  { c:'#5A8A9F', t:'INFO',     m:'VirusTotal — IOC 185.220.101.47 matched · ThreatFox C2' },
  { c:'#EF4444', t:'CRITICAL', m:'EDR — Credential dump attempt · lsass.exe · win-ws-11' },
  { c:'#8FAFC0', t:'MEDIUM',   m:'Email forensics — Phishing 97% confidence · SPF fail' },
  { c:'#22C55E', t:'CLOSED',   m:'Case AT-2845 — MITRE T1078.003 confirmed · report done' },
  { c:'#EAB308', t:'HIGH',     m:'ITDR — New device login · admin@corp · geo: Unknown' },
];
function LiveStream() {
  const [n, setN] = useState(4);
  useEffect(() => {
    const id = setInterval(() => setN(v => v<STREAM.length ? v+1 : 1), 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden', backdropFilter:'blur(12px)' }}>
      <div style={{ padding:'9px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 6px #22C55E', animation:'blink 1.4s step-end infinite' }}/>
        <span style={{ fontSize:9, color:'rgba(225,224,204,0.38)', ...MONO, letterSpacing:'0.14em' }}>LIVE INGESTION STREAM</span>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      </div>
      {STREAM.slice(0,n).map((item,i) => (
        <motion.div key={i}
          initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
          transition={{ duration:0.4, ease:E }}
          style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:11 }}
        >
          <span style={{ ...MONO, color:item.c, fontSize:9, fontWeight:700, letterSpacing:'0.07em', flexShrink:0, marginTop:1 }}>[{item.t}]</span>
          <span style={{ color:'rgba(225,224,204,0.52)', lineHeight:1.45 }}>{item.m}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Feature card ──────────────────────────────────────────────────────── */
function FCard({ Icon, num, title, desc, checks, color='#5A8A9F', delay=0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-80px' });
  return (
    <motion.div ref={ref}
      initial={{ scale:0.95, opacity:0 }}
      animate={inView ? { scale:1, opacity:1 } : {}}
      transition={{ duration:0.62, delay, ease:EC }}
      style={{ background:'#141414', borderRadius:16, padding:24, display:'flex', flexDirection:'column', gap:14 }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <Icon size={16} color={color}/>
        <span style={{ ...MONO, fontSize:10, color:'rgba(225,224,204,0.22)' }}>{num}</span>
      </div>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:'#E1E0CC', marginBottom:8, lineHeight:1.25 }}>{title}</div>
        <div style={{ fontSize:12, color:'rgba(225,224,204,0.48)', lineHeight:1.58 }}>{desc}</div>
      </div>
      {checks && (
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:'auto', paddingTop:8 }}>
          {checks.map(c => (
            <div key={c} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
              <Check size={11} color="#DEDBC8" style={{ flexShrink:0, marginTop:2 }}/>
              <span style={{ fontSize:11, color:'rgba(225,224,204,0.46)', lineHeight:1.45 }}>{c}</span>
            </div>
          ))}
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'rgba(225,224,204,0.4)', cursor:'pointer', marginTop:4 }}>
            Learn more <ArrowRight size={10} style={{ transform:'rotate(-45deg)' }}/>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   DATA
   ─────────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { Icon:ShieldAlert, num:'01', color:'#EF4444', title:'ITDR — Identity Threat Detection',
    checks:['Credential stuffing (5+ failed logins)','Impossible travel (continents < 4h)','New device login alerts','Privilege escalation detection'],
    desc:'Four real-time identity threat detectors. Auto-scored. Auto-mapped to MITRE ATT&CK. Auto-cased.' },
  { Icon:Brain, num:'02', color:'#22C55E', title:'Explainable AI Analysis',
    checks:['Full reasoning chain per verdict','Evidence + what-could-be-wrong','Multi-model Groq routing','Provenance ledger for every AI action'],
    desc:'No black boxes. Every verdict shows the evidence, reasoning steps, and confidence.' },
  { Icon:FolderSearch, num:'03', color:'#8FAFC0', title:'Case Management — 13 tabs',
    desc:'Overview, investigation, IOCs, terminal, timeline, trust timeline, playbook, AI analysis, AI chat, comments, provenance, report, EDR. Full lifecycle per case.' },
  { Icon:GitMerge, num:'04', color:'#EAB308', title:'Identity Graph + Trust Timeline',
    desc:'Force-directed canvas: users, service accounts, API keys, tokens, devices, AI agents. Add anomalies, recalculate risk scores, track trust events.' },
  { Icon:Shield, num:'05', color:'#5A8A9F', title:'7-Source IOC Intelligence',
    checks:['VirusTotal v3 + Shodan','MalwareBazaar, URLhaus, ThreatFox','GreyNoise + IPInfo parallel queries','Results correlated cross-case'],
    desc:'Seven threat intel sources queried in parallel. Results saved to history, correlated to detect campaigns.' },
  { Icon:Mail, num:'06', color:'#8FAFC0', title:'Email Forensics Engine',
    desc:'Full RFC header parsing, SPF/DKIM/DMARC validation, routing hop extraction, AI phishing verdict with MITRE ATT&CK mapping.' },
  { Icon:Monitor, num:'07', color:'#EAB308', title:'Endpoint Agent v5',
    checks:['Honey Token Trap (zero false positives)','DNS/DGA detection + auto-block','YARA-lite + USB monitoring','Multi-backend failover'],
    desc:'Production-grade Python EDR for Windows, Linux, Mac. Collect, correlate, auto-respond.' },
  { Icon:Globe, num:'08', color:'#EF4444', title:'DORA Compliance',
    desc:'One-click Article 19 Major ICT Incident Report PDF. Maps 5 DORA pillars to live case data. Built for EU financial services.' },
  { Icon:Activity, num:'09', color:'#5A8A9F', title:'Threat Hunting + Campaigns',
    desc:'Cross-case IOC correlation, MITRE heatmap, campaign detection. Spots attacker infrastructure reuse across all investigations.' },
  { Icon:Fingerprint, num:'10', color:'#22C55E', title:'Identity Risk Engine',
    desc:'Pluggable detector architecture. AnomalyCountDetector, LastSeenDetector, CompromisedFlagDetector. Every recalculation logged.' },
  { Icon:Bell, num:'11', color:'#8FAFC0', title:'Policy Engine + Webhooks',
    desc:'Access-control policies per identity. Validate against allow/deny lists, IP restrictions, time windows. HMAC-signed webhooks.' },
];

const PROBLEMS = [
  { Icon:UserX,       c:'#5A8A9F', h:'Attackers become trusted', b:'They log in with stolen credentials, abuse hijacked tokens, impersonate service accounts. The breach starts when malicious actors are granted trust — not when they break in.' },
  { Icon:Bot,         c:'#8FAFC0', h:'AI agents are the new attack surface', b:'Autonomous agents can be hijacked, prompts poisoned, API keys impersonated. Security teams must supervise non-human identities or remain completely blind.' },
  { Icon:ShieldAlert, c:'#EAB308', h:'Black-box AI is unacceptable in security', b:"If your SIEM cannot show the evidence and reasoning chain behind a flag, you cannot trust it in production. Black-box verdicts are guesses, not security." },
  { Icon:Boxes,       c:'#22C55E', h:'Static dashboards miss machine-speed attacks', b:'Modern attacks move faster than analyst reaction. The future of SecOps is a live control plane: identity states, agent actions, trust events, policies in real time.' },
];

const PILLARS = [
  { Icon:Fingerprint, l:'Identity',       d:'Every actor — human, service, agent, token — modelled as a first-class entity with risk score and trust history.' },
  { Icon:GitBranch,   l:'Provenance',     d:'Every AI output and case action carries full provenance: who acted, what model, what evidence, what confidence.' },
  { Icon:Layers,      l:'Trust',          d:'Trust is tracked, inherited, challenged, and revocable. A trust timeline sits beside every incident.' },
  { Icon:ShieldCheck, l:'Explainability', d:'No black boxes. Every AI verdict shows reasoning chain, supporting evidence, and what could be wrong.' },
  { Icon:Crosshair,   l:'Control',        d:'Humans remain in control. AI suggests. Humans confirm. Every automation has an approval layer and audit trail.' },
  { Icon:TrendingUp,  l:'Evolution',      d:'Built to stay relevant 10–15 years from now — when quantum threats and AI attackers are the norm.' },
];

/* ═════════════════════════════════════════════════════════════════════════
   MAIN
═════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const aboutRef = useRef(null);
  const [videoOk, setVideoOk] = useState(true);
  const [stats, setStats] = useState({ total_cases:12, total_iocs:847, critical_cases:3, vt_lookups:234 });
  const { scrollYProgress } = useScroll({ target:aboutRef, offset:['start 0.8','end 0.2'] });

  useEffect(() => {
    api.get('/api/portfolio/stats').then(r => setStats(s=>({...s,...r.data}))).catch(()=>{});
  }, []);

  /* Emil active-state press: scale(0.97) */
  const pressProps = { whileTap:{ scale:0.97 }, transition:{ duration:0.12, ease:E } };

  return (
    <div style={{ background:'#000', overflowX:'hidden', color:'#E1E0CC' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Instrument+Serif:ital@1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;font-family:'Almarai',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
        .serif{font-family:'Instrument Serif',serif;font-style:italic;}

        /* label micro-text */
        .label{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(192,57,43,0.82);}

        /* CTA pill */
        .cta{display:inline-flex;align-items:center;gap:10px;background:#DEDBC8;border-radius:9999px;padding:10px 14px 10px 22px;border:none;cursor:pointer;font-weight:700;font-size:14px;color:#000;transition:gap 180ms cubic-bezier(0.23,1,0.32,1);}
        .cta .circle{background:#000;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 180ms cubic-bezier(0.23,1,0.32,1);}
        .cta:hover{gap:16px;}.cta:hover .circle{transform:scale(1.1);}

        /* ghost button */
        .ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;border-radius:9999px;padding:10px 22px;border:1px solid rgba(255,255,255,0.14);color:rgba(225,224,204,0.62);font-size:13px;cursor:pointer;text-decoration:none;transition:color 180ms cubic-bezier(0.23,1,0.32,1),border-color 180ms cubic-bezier(0.23,1,0.32,1);}
        .ghost:hover{color:rgba(225,224,204,0.92);border-color:rgba(255,255,255,0.28);}

        /* nav link */
        .nl{font-size:12px;color:rgba(225,224,204,0.72);text-decoration:none;transition:color 180ms cubic-bezier(0.23,1,0.32,1);}
        .nl:hover{color:#E1E0CC;}

        /* feature card grid */
        .fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr));gap:12px;}

        /* divider line */
        .rule{border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;}

        @media(prefers-reduced-motion:reduce){
          .cta,.ghost{transition:opacity 150ms;}
          *[style*="animation"]{animation:none!important;}
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          §1 HERO — video bg · giant heading · 8/4 grid
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ height:'100vh', padding:16 }}>
        <div style={{ position:'relative', width:'100%', height:'100%', borderRadius:28, overflow:'hidden' }}>

          {/* Background: video → CSS fallback */}
          {videoOk ? (
            <video autoPlay loop muted playsInline
              onError={() => setVideoOk(false)}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
            />
          ) : <CyberBg />}

          {/* Noise + gradient overlays */}
          <div aria-hidden style={{ position:'absolute', inset:0, backgroundImage:NOISE_HERO, opacity:0.7, mixBlendMode:'overlay', pointerEvents:'none' }}/>
          <div aria-hidden style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.28) 0%,transparent 35%,rgba(0,0,0,0.62) 100%)' }}/>

          {/* Navbar */}
          <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', zIndex:20 }}>
            <nav style={{ background:'rgba(0,0,0,0.9)', backdropFilter:'blur(16px)', borderRadius:'0 0 22px 22px', padding:'12px 32px', display:'flex', gap:36, alignItems:'center' }}>
              <Link to="/mission"   className="nl">Mission</Link>
              <Link to="/portfolio" className="nl">Portfolio</Link>
              <a href="#problem"    className="nl">Problem</a>
              <a href="#features"   className="nl">Features</a>
              <a href="#how"        className="nl">How it works</a>
              <Link to="/app/login" className="nl" style={{ color:'#DEDBC8' }}>Login →</Link>
            </nav>
          </div>

          {/* Hero content — bottom-aligned 8/4 grid */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20, padding:'0 28px 28px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'8fr 4fr', gap:32, alignItems:'flex-end' }}>

              <h1 style={{ margin:0, fontSize:'clamp(80px,13vw,200px)', fontWeight:500, lineHeight:0.85, letterSpacing:'-0.07em', color:'#E1E0CC' }}>
                <WordsPullUp text="AegisTrace" showAsterisk />
              </h1>

              <div style={{ display:'flex', flexDirection:'column', gap:18, paddingBottom:8 }}>
                <motion.p
                  initial={{ y:20, opacity:0 }}
                  animate={{ y:0, opacity:1 }}
                  transition={{ duration:0.68, delay:0.5, ease:E }}
                  style={{ color:'rgba(222,219,200,0.7)', fontSize:13, lineHeight:1.32, margin:0, fontWeight:300 }}
                >
                  Not just a SOC dashboard — a security control plane for the AI-agent era. Identity-centric. Provenance-aware. Fully explainable.
                </motion.p>
                <motion.div
                  initial={{ y:20, opacity:0 }}
                  animate={{ y:0, opacity:1 }}
                  transition={{ duration:0.68, delay:0.72, ease:E }}
                  style={{ display:'flex', gap:10, flexWrap:'wrap' }}
                >
                  <motion.button
                    className="cta" onClick={() => window.open('/app/login','_blank','noopener,noreferrer')}
                    {...pressProps}
                  >
                    INITIALIZE TERMINAL
                    <span className="circle"><ArrowUpRight size={13} color="#DEDBC8"/></span>
                  </motion.button>
                  <motion.button
                    className="ghost" onClick={() => navigate('/portfolio')}
                    {...pressProps}
                  >
                    View Portfolio →
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §2 ABOUT — scroll-linked char opacity · dark card
          ════════════════════════════════════════════════════════════════ */}
      <section ref={aboutRef} style={{ background:'#000', padding:'120px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ background:'#0f0f0f', borderRadius:28, padding:'72px 60px', backdropFilter:'blur(0)' }}>
            <div style={{ textAlign:'center' }}>
              <Reveal>
                <div className="label" style={{ marginBottom:28, ...MONO }}>Security platform</div>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 style={{ fontSize:'clamp(28px,5vw,58px)', fontWeight:400, lineHeight:0.94, margin:'0 auto 40px', letterSpacing:'-0.04em', maxWidth:760, textAlign:'center', color:'#E1E0CC' }}>
                  <WordsPullUp text="Built for the era" />{' '}
                  <span className="serif"><WordsPullUp text="when trust breaks." /></span>
                </h2>
              </Reveal>
              <Reveal delay={0.12}>
                {/* Scroll-linked character opacity reveal */}
                <p style={{ fontSize:'clamp(13px,1.4vw,16px)', color:'#DEDBC8', lineHeight:1.58, maxWidth:700, margin:'0 auto', textAlign:'center' }}>
                  <CharReveal
                    text="AegisTrace is not just a SOC dashboard — it is a security control plane built for the AI-agent era. Every identity is tracked. Every AI action is recorded with full provenance. Every threat correlation is explainable. Built in Dublin. Deployed globally. Zero licensing cost."
                    scrollYProgress={scrollYProgress}
                  />
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §3 LIVE STREAM + STATS
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#000', padding:'0 24px 100px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:52 }}>
          <Reveal>
            <div className="label" style={{ marginBottom:16, ...MONO }}>Live ingestion stream</div>
            <LiveStream />
          </Reveal>
          <Reveal delay={0.14}>
            <div className="label" style={{ marginBottom:16, ...MONO }}>Platform stats</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:28 }}>
              {[
                { v:stats.total_cases,    l:'Cases',      c:'#E1E0CC' },
                { v:stats.total_iocs,     l:'IOCs',       c:'#5A8A9F' },
                { v:stats.critical_cases, l:'Critical',   c:'#EAB308' },
                { v:stats.vt_lookups,     l:'VT Lookups', c:'#8FAFC0' },
              ].map(({ v,l,c }) => (
                <div key={l} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:18 }}>
                  <div style={{ fontSize:28, fontWeight:800, color:c, ...MONO, lineHeight:1 }}>{v||'—'}</div>
                  <div style={{ fontSize:10, color:'rgba(225,224,204,0.34)', ...MONO, marginTop:6, letterSpacing:'0.1em' }}>{l}</div>
                </div>
              ))}
            </div>
            {[
              { s:'83%',     l:'of 2024 breaches involved a compromised identity, credential, or token — not a technical exploit.', c:'#5A8A9F' },
              { s:'10-15yr', l:'window before AI-native attackers and quantum-harvested keys become the dominant threat model.', c:'#8FAFC0' },
              { s:'$0',      l:'cost to deploy. No license. No vendor lock-in. Full SOC platform, open stack, free-tier Render.', c:'#EAB308' },
            ].map(({ s,l,c }) => (
              <div key={s} style={{ display:'flex', gap:16, padding:'14px 0', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize:22, fontWeight:800, color:c, ...MONO, flexShrink:0, minWidth:72 }}>{s}</span>
                <span style={{ fontSize:12, color:'rgba(225,224,204,0.48)', lineHeight:1.5 }}>{l}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §4 THE PROBLEM
          ════════════════════════════════════════════════════════════════ */}
      <section id="problem" style={{ background:'#07080f', padding:'100px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal>
            <div className="label" style={{ marginBottom:16, ...MONO }}>The Problem</div>
            <h2 style={{ fontSize:'clamp(26px,4.5vw,56px)', fontWeight:400, lineHeight:0.95, margin:'0 0 48px', letterSpacing:'-0.03em', color:'#E1E0CC' }}>
              Cybersecurity is changing faster<br/>than the tools defending it.
            </h2>
          </Reveal>
          <div className="fgrid">
            {PROBLEMS.map(({ Icon,c,h,b }, i) => (
              <Reveal key={h} delay={i*0.07}>
                <div style={{ background:'rgba(0,0,0,0.7)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:24, borderLeft:`3px solid ${c}28`, height:'100%' }}>
                  <Icon size={17} color={c} style={{ marginBottom:14 }}/>
                  <div style={{ fontSize:14, fontWeight:700, color:'#E1E0CC', marginBottom:8, lineHeight:1.25 }}>{h}</div>
                  <div style={{ fontSize:12, color:'rgba(225,224,204,0.48)', lineHeight:1.58 }}>{b}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §5 VISION — 6 pillars
          ════════════════════════════════════════════════════════════════ */}
      <section id="vision" style={{ background:'#000', padding:'100px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal>
            <div className="label" style={{ marginBottom:16, ...MONO }}>Our Vision</div>
            <h2 style={{ fontSize:'clamp(26px,4.5vw,56px)', fontWeight:400, lineHeight:0.95, margin:'0 0 12px', letterSpacing:'-0.03em', color:'#E1E0CC' }}>
              The next evolution of security.
            </h2>
            <p style={{ fontSize:14, color:'rgba(225,224,204,0.44)', margin:'0 0 48px', maxWidth:600, lineHeight:1.62, fontWeight:300 }}>
              Not more tools — a different model. A live control plane that tracks identities, trust relationships, agent actions, and provenance chains across your entire environment.
            </p>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(192px,1fr))', gap:10 }}>
            {PILLARS.map(({ Icon,l,d }, i) => (
              <Reveal key={l} delay={i*0.06}>
                <div style={{ background:'#0f0f0f', borderRadius:14, padding:22, height:'100%', boxSizing:'border-box' }}>
                  <Icon size={16} color="#C0392B" style={{ marginBottom:12 }}/>
                  <div style={{ fontSize:13, fontWeight:700, color:'#E1E0CC', marginBottom:7 }}>{l}</div>
                  <div style={{ fontSize:12, color:'rgba(225,224,204,0.47)', lineHeight:1.55 }}>{d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §6 FEATURES — Prisma bento grid · noise bg
          ════════════════════════════════════════════════════════════════ */}
      <section id="features" style={{ background:'#07080f', padding:'100px 24px', minHeight:'80vh', position:'relative' }}>
        <div aria-hidden style={{ position:'absolute', inset:0, backgroundImage:NOISE_SECTION, opacity:0.11, pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <Reveal>
            <div className="label" style={{ marginBottom:16, ...MONO }}>Platform Features</div>
            <h2 style={{ fontSize:'clamp(22px,4vw,48px)', fontWeight:400, lineHeight:0.96, margin:'0 0 8px', letterSpacing:'-0.03em', color:'#E1E0CC' }}>
              Detection workflows<br/><span className="serif">for teams that move fast.</span>
            </h2>
            <p style={{ fontSize:13, color:'rgba(225,224,204,0.38)', margin:'0 0 48px', letterSpacing:'-0.01em' }}>Autonomous by design. Precise by necessity.</p>
          </Reveal>
          <div className="fgrid">
            {FEATURES.map((f, i) => <FCard key={f.title} {...f} delay={i*0.05}/>)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §7 HARDWARE PLATFORM
          ════════════════════════════════════════════════════════════════ */}
      <section id="hardware" style={{ background:'#000', padding:'100px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
            <Reveal>
              <div className="label" style={{ marginBottom:16, ...MONO }}>Hardware Platform</div>
              <h2 style={{ fontSize:'clamp(22px,3.8vw,44px)', fontWeight:400, lineHeight:1, margin:'0 0 18px', letterSpacing:'-0.03em', color:'#E1E0CC' }}>
                Physical tools.<br/><span className="serif">One unified timeline.</span>
              </h2>
              <p style={{ fontSize:13, color:'rgba(225,224,204,0.52)', lineHeight:1.62, margin:'0 0 28px', fontWeight:300 }}>
                The only free SOC platform that ingests logs from physical hardware attack tools alongside endpoint and network telemetry — all correlated in a single case timeline.
              </p>
              {[
                { Icon:Wifi,   l:'WiFi/RF attacks visible alongside endpoint events' },
                { Icon:Cpu,    l:'AI auto-parses unknown log formats — no parser needed' },
                { Icon:Shield, l:'Every event auto-mapped to MITRE ATT&CK technique' },
                { Icon:Zap,    l:'One-click case creation from any hardware alert' },
              ].map(({ Icon, l }) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <Icon size={13} color="#C0392B" style={{ flexShrink:0 }}/>
                  <span style={{ fontSize:13, color:'rgba(225,224,204,0.58)' }}>{l}</span>
                </div>
              ))}
            </Reveal>
            <Reveal delay={0.14}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:9 }}>
                {['WiFi Pineapple','HackRF','Flipper Zero','Rubber Ducky','Proxmark 3','Suricata','Sysmon','Zeek/PCAP','Netflow'].map(tool => (
                  <div key={tool} style={{ background:'#0f0f0f', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'14px 10px', textAlign:'center', fontSize:11, color:'rgba(225,224,204,0.52)', ...MONO }}>
                    {tool}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §8 HOW IT WORKS
          ════════════════════════════════════════════════════════════════ */}
      <section id="how" style={{ background:'#07080f', padding:'100px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal>
            <div className="label" style={{ marginBottom:16, ...MONO }}>How It Works</div>
            <h2 style={{ fontSize:'clamp(22px,3.8vw,44px)', fontWeight:400, lineHeight:1, margin:'0 0 48px', letterSpacing:'-0.03em', color:'#E1E0CC' }}>
              From deploy to closed case in four steps.
            </h2>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:0 }}>
            {[
              { n:'01', h:'Deploy the Agent',     b:'Drop aegistrace_agent.py on any machine. Python 3.8+, zero dependencies. Collects Sysmon events, auth logs, process trees, persistence — ships every 5 minutes.' },
              { n:'02', h:'Import + Investigate', b:'Open a case. Import emails, paste hardware device logs, run VT lookups. AI scores every artifact and maps it to MITRE ATT&CK automatically.' },
              { n:'03', h:'Correlate + Hunt',     b:'IOC engine links cases sharing infrastructure. Cross-case heatmaps detect campaigns. Hardware tool alerts link to cases directly.' },
              { n:'04', h:'Report + Close',       b:'AI writes executive summary and technical analysis with full reasoning chain. Generate PDF, DOCX, or DORA Article 19 report.' },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i*0.1} style={{ padding:'24px 24px 24px 0', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize:11, color:'#C0392B', ...MONO, marginBottom:12, letterSpacing:'0.12em' }}>{s.n}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#E1E0CC', marginBottom:8 }}>{s.h}</div>
                <div style={{ fontSize:12, color:'rgba(225,224,204,0.52)', lineHeight:1.58 }}>{s.b}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §9 CTA
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#000', padding:'100px 24px' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <Reveal>
            <div style={{ background:'#0f0f0f', borderRadius:28, padding:'72px 60px', textAlign:'center', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="label" style={{ marginBottom:20, ...MONO }}>Enterprise-grade · Zero cost</div>
              <h2 style={{ fontSize:'clamp(26px,4.5vw,50px)', fontWeight:400, lineHeight:0.95, margin:'0 0 16px', letterSpacing:'-0.04em', color:'#E1E0CC' }}>
                Enterprise-grade.<br/><span className="serif" style={{ color:'#5A8A9F' }}>Zero licensing cost.</span>
              </h2>
              <p style={{ fontSize:14, color:'rgba(225,224,204,0.48)', maxWidth:480, margin:'0 auto 40px', lineHeight:1.62, fontWeight:300 }}>
                No fees. No lock-in. Full SOC platform running on open-source stack. Deploy to Render free tier in under 5 minutes.
              </p>
              <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
                <motion.button className="cta" onClick={() => window.open('/app/login','_blank','noopener,noreferrer')} {...pressProps}>
                  Enter the platform
                  <span className="circle"><ArrowRight size={14} color="#DEDBC8"/></span>
                </motion.button>
                <Link to="/portfolio" className="ghost">View Portfolio</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#000', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'40px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <p style={{ color:'rgba(225,224,204,0.25)', fontSize:11, margin:0, ...MONO }}>© 2026 AegisTrace — All threats traced.</p>
          <div style={{ display:'flex', gap:28 }}>
            {[['Mission','/mission'],['Portfolio','/portfolio'],['Login','/app/login']].map(([l,h]) => (
              <Link key={l} to={h} style={{ color:'rgba(225,224,204,0.38)', textDecoration:'none', fontSize:12 }}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
