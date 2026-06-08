import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, Mail, Github, Shield, Brain, Layers, GitMerge,
         Fingerprint, Database, Cpu, Globe, Zap, ArrowUpRight,
         Eye, Lock, CheckCircle, Clock, Rocket, Code,
         TrendingUp, ShieldCheck, Crosshair, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════════════════
   AEGISTRACE MISSION — Cyberpunk Command Center
   GSAP-style scroll animations via framer-motion · Three.js-inspired bg
   Emil Kowalski easing · Impeccable typographic hierarchy
   ═══════════════════════════════════════════════════════════════════════════ */

const E    = [0.23, 1, 0.32, 1];
const EC   = [0.22, 1, 0.36, 1];
const RED  = '#C0392B';
const TEAL = '#2dd4bf';
const BG   = '#020208';
const MONO = { fontFamily:'JetBrains Mono,monospace' };
const CONTACT_EMAIL = 'prasanna80564@gmail.com';

/* ──────────────────────────────────────────────────────────────────────────
   ANIMATED COMMAND CENTER BACKGROUND
   Particle city + scanning grid + data streams
   ─────────────────────────────────────────────────────────────────────── */
function CmdBg({ accent='red' }) {
  const color  = accent === 'teal' ? TEAL : RED;
  const color2 = accent === 'teal' ? RED  : TEAL;
  return (
    <div aria-hidden style={{ position:'absolute', inset:0, overflow:'hidden', background:BG }}>
      {/* Layered gradients */}
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 80% 60% at 50% 60%,${color}28 0%,${color}0a 50%,transparent 72%)` }}/>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse 40% 30% at 85% 10%,${color2}12 0%,transparent 55%)` }}/>

      {/* Fine grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(${color}14 1px,transparent 1px),linear-gradient(90deg,${color}14 1px,transparent 1px)`, backgroundSize:'56px 56px' }}/>
      {/* Bold grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(${color}28 1px,transparent 1px),linear-gradient(90deg,${color}28 1px,transparent 1px)`, backgroundSize:'280px 280px' }}/>

      {/* Edge darkening */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 130% 130% at 50% 50%,transparent 34%,rgba(2,2,8,0.94) 100%)' }}/>

      {/* Horizontal scan line */}
      <div style={{ position:'absolute', left:0, right:0, height:2, top:0, background:`linear-gradient(90deg,transparent 5%,${color}aa 35%,#fff 50%,${color}aa 65%,transparent 95%)`, boxShadow:`0 0 20px 3px ${color}44`, animation:'scan 8s linear infinite' }}/>

      {/* Vertical accent lines */}
      {[12, 35, 65, 88].map(x => (
        <div key={x} style={{ position:'absolute', top:0, bottom:0, left:`${x}%`, width:1, background:`linear-gradient(to bottom,transparent 0%,${color}18 30%,${color}18 70%,transparent 100%)` }}/>
      ))}

      {/* Data nodes */}
      {[[8,20],[20,55],[35,15],[50,72],[62,35],[78,18],[88,62],[15,82],[45,42],[72,85]].map(([x,y],i) => (
        <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`,
          width: i%3===0 ? 5 : 3, height: i%3===0 ? 5 : 3, borderRadius:'50%',
          background: i%3===0 ? color : `${color}88`,
          boxShadow: i%3===0 ? `0 0 8px 2px ${color}55` : 'none',
          animation:`dot-p ${2.5+(i%3)*0.8}s ease-in-out ${i*0.25}s infinite alternate` }}/>
      ))}

      {/* Floating HUD labels */}
      {[{x:6,y:18,t:'T1078.003'},{x:74,y:8,t:'IDENTITY-RISK'},{x:55,y:78,t:'PROVENANCE-OK'},{x:18,y:65,t:'● LIVE FEED'}].map(({x,y,t},i) => (
        <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, fontSize:8, color:`${color}55`, ...MONO, letterSpacing:'0.1em', whiteSpace:'nowrap', animation:`lbl ${3.5+i}s ease-in-out ${i*0.6}s infinite alternate` }}>{t}</div>
      ))}

      <style>{`
        @keyframes scan{0%{top:-2px}100%{top:100%}}
        @keyframes dot-p{from{opacity:0.3;transform:scale(0.8)}to{opacity:1;transform:scale(1.4)}}
        @keyframes lbl{from{opacity:0.2}to{opacity:0.7}}
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HUD CORNERS
   ─────────────────────────────────────────────────────────────────────── */
function HudCorner({ pos, color=RED }) {
  const corners = {
    tl:{ top:16, left:16, borderTop:`2px solid ${color}`, borderLeft:`2px solid ${color}` },
    tr:{ top:16, right:16, borderTop:`2px solid ${color}`, borderRight:`2px solid ${color}` },
    bl:{ bottom:16, left:16, borderBottom:`2px solid ${color}`, borderLeft:`2px solid ${color}` },
    br:{ bottom:16, right:16, borderBottom:`2px solid ${color}`, borderRight:`2px solid ${color}` },
  };
  return <div aria-hidden style={{ position:'absolute', width:20, height:20, zIndex:10, ...corners[pos] }}/>;
}

/* ──────────────────────────────────────────────────────────────────────────
   SCROLL-DRIVEN COUNTER (GSAP-style with framer-motion)
   ─────────────────────────────────────────────────────────────────────── */
function Counter({ end, suffix='', color=RED }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let frame;
    const duration = 1800;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setVal(Math.round(ease * end));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, end]);
  return <span ref={ref} style={{ color }}>{val}{suffix}</span>;
}

/* ──────────────────────────────────────────────────────────────────────────
   SECTION REVEAL
   ─────────────────────────────────────────────────────────────────────── */
function Reveal({ children, delay=0, style={} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:32 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.78, delay, ease:E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ROADMAP ITEM
   ─────────────────────────────────────────────────────────────────────── */
function RoadmapItem({ text, done=false, inProgress=false, delay=0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true });
  const color = done ? TEAL : inProgress ? '#EAB308' : 'rgba(225,224,204,0.35)';
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, x:-12 }}
      animate={inView ? { opacity:1, x:0 } : {}}
      transition={{ duration:0.55, delay, ease:E }}
      style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
    >
      <div style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow: done||inProgress?`0 0 6px ${color}`:undefined, flexShrink:0, marginTop:5 }}/>
      <span style={{ fontSize:13, color: done ? 'rgba(225,224,204,0.8)' : inProgress ? '#EAB308' : 'rgba(225,224,204,0.38)', lineHeight:1.5 }}>{text}</span>
      {done && <CheckCircle size={11} color={TEAL} style={{ flexShrink:0, marginTop:3, marginLeft:'auto' }}/>}
      {inProgress && <Clock size={11} color='#EAB308' style={{ flexShrink:0, marginTop:3, marginLeft:'auto' }}/>}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PROBLEM CARD (large, high-impact)
   ─────────────────────────────────────────────────────────────────────── */
function ProblemCard({ Icon, num, title, body, color, delay=0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-80px' });
  return (
    <motion.div ref={ref}
      initial={{ scale:0.94, opacity:0 }}
      animate={inView ? { scale:1, opacity:1 } : {}}
      transition={{ duration:0.65, delay, ease:EC }}
      style={{ background:'rgba(2,4,12,0.8)', border:`1px solid rgba(255,255,255,0.06)`, borderRadius:16, padding:28, borderLeft:`3px solid ${color}`, backdropFilter:'blur(8px)', position:'relative', overflow:'hidden' }}
    >
      <div aria-hidden style={{ position:'absolute', top:-20, right:-20, fontSize:88, fontWeight:800, color:`${color}06`, ...MONO, lineHeight:1, pointerEvents:'none', userSelect:'none' }}>{num}</div>
      <Icon size={20} color={color} style={{ marginBottom:16 }}/>
      <div style={{ fontSize:16, fontWeight:700, color:'#E1E0CC', marginBottom:10, lineHeight:1.2, letterSpacing:'-0.01em' }}>{title}</div>
      <div style={{ fontSize:13, color:'rgba(225,224,204,0.52)', lineHeight:1.6 }}>{body}</div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════════════════ */
export default function Mission() {
  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({ target:heroRef, offset:['start start','end start'] });
  const heroY = useTransform(heroScroll, [0,1], [0, -60]);

  const ROADMAP_V1 = [
    { t:'ITDR — Identity Threat Detection (4 detectors)', done:true },
    { t:'Identity Risk Engine (pluggable detectors)', done:true },
    { t:'Case Management (13-tab lifecycle)', done:true },
    { t:'Identity Graph + Trust Timeline', done:true },
    { t:'Explainable AI with full reasoning chain', done:true },
    { t:'7-Source IOC Intelligence Engine', done:true },
    { t:'Email Forensics Engine', done:true },
    { t:'Endpoint Agent v5 (Windows/Linux/Mac)', done:true },
    { t:'Threat Hunting + Campaign Detection', done:true },
    { t:'DORA Article 19 Compliance Reports', done:true },
  ];

  const ROADMAP_V2 = [
    { t:'Shadow AI Detection — unregistered AI agents', inProgress:true },
    { t:'SOAR Playbook Engine', inProgress:true },
    { t:'Control Plane — real-time identity state changes', inProgress:false },
    { t:'Non-human Identity (NHI) vault and lifecycle', inProgress:false },
    { t:'Quantum-Resistant Key Monitoring', inProgress:false },
    { t:'Agent Supervision Layer for AI workflows', inProgress:false },
  ];

  const ROADMAP_V3 = [
    { t:'Attacker Path Emulation (red-team simulation)' },
    { t:'Multi-tenant Architecture (enterprise deployments)' },
    { t:'Federated Identity Graph (cross-org)' },
    { t:'Adversarial AI detection engine' },
    { t:'Regulatory Mapping: NIS2, GDPR, DORA v2' },
  ];

  return (
    <div style={{ background:BG, overflowX:'hidden', color:'#E1E0CC' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Instrument+Serif:ital@1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;font-family:'Almarai',-apple-system,sans-serif;}
        .serif{font-family:'Instrument Serif',serif;font-style:italic;}
        .label{font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(192,57,43,0.75);font-family:'JetBrains Mono',monospace;}

        .cta{display:inline-flex;align-items:center;gap:10px;background:#DEDBC8;border-radius:9999px;padding:10px 14px 10px 22px;border:none;cursor:pointer;font-weight:700;font-size:13px;color:#000;transition:gap 180ms cubic-bezier(0.23,1,0.32,1);}
        .cta .circle{background:#000;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 180ms cubic-bezier(0.23,1,0.32,1);}
        .cta:hover{gap:15px;}.cta:hover .circle{transform:scale(1.1);}
        .ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;border-radius:9999px;padding:10px 22px;border:1px solid rgba(255,255,255,0.13);color:rgba(225,224,204,0.6);font-size:13px;cursor:pointer;text-decoration:none;transition:all 180ms cubic-bezier(0.23,1,0.32,1);}
        .ghost:hover{color:rgba(225,224,204,0.9);border-color:rgba(255,255,255,0.26);}
        .nl{font-size:12px;color:rgba(225,224,204,0.65);text-decoration:none;transition:color 180ms cubic-bezier(0.23,1,0.32,1);}
        .nl:hover{color:#E1E0CC;}

        @media(prefers-reduced-motion:reduce){*[style*="animation"]{animation:none!important;}}
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — "Attackers no longer break in."
          ═════════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{ height:'100vh', padding:16 }}>
        <div style={{ position:'relative', width:'100%', height:'100%', borderRadius:28, overflow:'hidden' }}>
          <CmdBg accent="red"/>
          {['tl','tr','bl','br'].map(p => <HudCorner key={p} pos={p}/>)}

          {/* Navbar */}
          <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', zIndex:20 }}>
            <nav style={{ background:'rgba(2,2,8,0.92)', backdropFilter:'blur(16px)', borderRadius:'0 0 22px 22px', padding:'12px 32px', display:'flex', gap:36, alignItems:'center' }}>
              <Link to="/"          className="nl">← Home</Link>
              <Link to="/portfolio" className="nl">Portfolio</Link>
              <Link to="/app/login" className="nl" style={{ color:'#DEDBC8' }}>Platform →</Link>
            </nav>
          </div>

          <motion.div
            style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20, padding:'0 40px 40px', y:heroY }}
          >
            <motion.div
              initial={{ opacity:0, y:12 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.65, delay:0.2, ease:E }}
              className="label"
              style={{ marginBottom:16 }}
            >
              aegistrace · platform mission · 2026
            </motion.div>

            <motion.h1
              initial={{ opacity:0, y:40 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.88, delay:0.35, ease:E }}
              style={{ fontSize:'clamp(36px,6.5vw,90px)', fontWeight:400, lineHeight:0.92, margin:'0 0 24px', letterSpacing:'-0.05em', maxWidth:900, color:'#E1E0CC' }}
            >
              Attackers no longer break in.<br/>
              <span className="serif" style={{ color:RED }}>They become trusted.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.7, delay:0.65, ease:E }}
              style={{ fontSize:15, color:'rgba(225,224,204,0.62)', maxWidth:600, lineHeight:1.62, margin:'0 0 32px', fontWeight:300 }}
            >
              The future of cybersecurity is identity-centric, provenance-aware, and explainable. AegisTrace is built to stay relevant when quantum threats, machine identities, and AI attackers are the norm.
            </motion.p>

            <motion.div
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.65, delay:0.85, ease:E }}
              style={{ display:'flex', gap:10, flexWrap:'wrap' }}
            >
              <motion.button
                className="cta"
                onClick={() => window.open('/app/login','_blank','noopener,noreferrer')}
                whileTap={{ scale:0.97 }}
              >
                ENTER PLATFORM
                <span className="circle"><ArrowUpRight size={13} color="#DEDBC8"/></span>
              </motion.button>
              <Link to="/portfolio" className="ghost">View Portfolio →</Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          COUNTERS — scroll-triggered numbers
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#04060e', padding:'80px 24px', borderTop:'1px solid rgba(192,57,43,0.12)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:0 }}>
            {[
              { end:83,  suffix:'%',  label:'of 2024 breaches involved a compromised identity or credential',  c:RED   },
              { end:10,  suffix:'yr+',label:'window before AI-native attackers become the dominant threat model', c:TEAL },
              { end:11,  suffix:'',   label:'detection and investigation modules in the platform today',          c:'#EAB308' },
              { end:0,   suffix:'$',  label:'licensing cost — open stack, free-tier Render, no vendor lock-in',  c:'#22C55E' },
            ].map(({ end, suffix, label, c }, i) => (
              <Reveal key={label} delay={i*0.09} style={{ padding:'28px 0 28px 0', borderLeft: i>0 ? '1px solid rgba(255,255,255,0.05)' : undefined, paddingLeft: i>0 ? 28 : 0 }}>
                <div style={{ fontSize:'clamp(40px,5vw,64px)', fontWeight:800, lineHeight:1, marginBottom:10, ...MONO }}>
                  <Counter end={end} suffix={suffix} color={c}/>
                </div>
                <div style={{ fontSize:12, color:'rgba(225,224,204,0.5)', lineHeight:1.55, maxWidth:200 }}>{label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          THE PROBLEM — 4 high-impact cards
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ background:BG, padding:'100px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal>
            <div className="label" style={{ marginBottom:16 }}>Why AegisTrace exists</div>
            <h2 style={{ fontSize:'clamp(26px,4.5vw,54px)', fontWeight:400, lineHeight:0.95, margin:'0 0 12px', letterSpacing:'-0.04em', color:'#E1E0CC' }}>
              Four threats the industry<br/>
              <span className="serif">is not ready for.</span>
            </h2>
            <p style={{ fontSize:14, color:'rgba(225,224,204,0.44)', margin:'0 0 52px', maxWidth:580, lineHeight:1.62, fontWeight:300 }}>
              The breach already happened. The attacker already has credentials. The AI agent is already compromised. The static dashboard is already behind.
            </p>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {[
              { Icon:Shield,       num:'01', c:RED,       t:'Identity is the new perimeter',
                b:'Attackers no longer need to break through firewalls. They log in. With stolen credentials, hijacked tokens, or impersonated service accounts. The breach starts the moment a malicious actor is granted trust.' },
              { Icon:Brain,        num:'02', c:TEAL,      t:'AI agents are invisible attack surfaces',
                b:"The rise of autonomous agents means attackers can hijack a workflow, poison a prompt, or impersonate an API key. Security teams have no visibility into what AI agents are doing or whether they've been compromised." },
              { Icon:AlertTriangle,num:'03', c:'#EAB308', t:'Black-box AI is not security',
                b:"If your SIEM cannot explain why it flagged something — cannot show you the evidence used, the reasoning chain, and the confidence level — then you cannot trust it in production. Black-box verdicts are guesses, not security." },
              { Icon:Layers,       num:'04', c:'#22C55E', t:'Static dashboards miss machine-speed threats',
                b:'Modern identity attacks happen faster than a human analyst can react. The future is a live control plane: identity states, agent actions, trust events, and policy decisions visible and controllable in real time.' },
            ].map(({ Icon, num, c, t, b }, i) => (
              <ProblemCard key={t} Icon={Icon} num={num} title={t} body={b} color={c} delay={i*0.09}/>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          VISION — A trust operating system
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#04060e', padding:'100px 24px', position:'relative', overflow:'hidden' }}>
        <div aria-hidden style={{ position:'absolute', inset:0 }}><CmdBg accent="teal"/></div>
        <div aria-hidden style={{ position:'absolute', inset:0, background:'rgba(4,6,14,0.82)' }}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:2 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:72, alignItems:'center' }}>
            <Reveal>
              <div className="label" style={{ marginBottom:16, color:'rgba(45,212,191,0.75)' }}>Vision</div>
              <h2 style={{ fontSize:'clamp(26px,4vw,50px)', fontWeight:400, lineHeight:0.95, margin:'0 0 20px', letterSpacing:'-0.04em', color:'#E1E0CC' }}>
                A trust operating<br/><span className="serif" style={{ color:TEAL }}>system for the future.</span>
              </h2>
              <p style={{ fontSize:14, color:'rgba(225,224,204,0.55)', lineHeight:1.65, margin:'0 0 32px', fontWeight:300 }}>
                The next evolution of AegisTrace is not adding more tools. It is changing the fundamental model — tracking every identity, every AI agent, every trust relationship, and every action with full provenance across your entire environment.
              </p>
              <p style={{ fontSize:14, color:'rgba(225,224,204,0.55)', lineHeight:1.65, fontWeight:300 }}>
                When an attacker logs in with stolen credentials, you know who they are, where the trust was inherited from, what they did, and how to respond — in seconds, not hours.
              </p>
            </Reveal>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { Icon:Fingerprint, c:TEAL,      l:'Identity',       d:'Every actor — human, service, agent, token — as a first-class entity with risk score and full trust history.' },
                { Icon:Database,    c:RED,        l:'Provenance',     d:'Every AI output and case action carries who acted, what model, what evidence, what confidence.' },
                { Icon:ShieldCheck, c:'#EAB308',  l:'Trust',          d:'Trust is tracked, inherited, challenged, and revocable. A trust timeline beside every incident.' },
                { Icon:Eye,         c:'#8FAFC0',  l:'Explainability', d:'No black boxes. Every AI verdict shows its reasoning chain, evidence, and what could be wrong.' },
                { Icon:Crosshair,   c:'#22C55E',  l:'Control',        d:'Humans remain in control. AI suggests. Every automation has an approval layer and audit trail.' },
                { Icon:TrendingUp,  c:TEAL,       l:'Evolution',      d:'Built to stay relevant when quantum threats, machine identities, and AI attackers are the norm.' },
              ].map(({ Icon, c, l, d }, i) => (
                <Reveal key={l} delay={i*0.06}>
                  <div style={{ display:'flex', gap:14, padding:'14px 16px', background:'rgba(2,4,12,0.7)', borderRadius:12, border:`1px solid rgba(255,255,255,0.05)`, backdropFilter:'blur(8px)' }}>
                    <Icon size={15} color={c} style={{ flexShrink:0, marginTop:2 }}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#E1E0CC', marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:11, color:'rgba(225,224,204,0.48)', lineHeight:1.5 }}>{d}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ROADMAP — 3 phases
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ background:BG, padding:'100px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal>
            <div className="label" style={{ marginBottom:16 }}>Platform Roadmap</div>
            <h2 style={{ fontSize:'clamp(26px,4.5vw,52px)', fontWeight:400, lineHeight:0.95, margin:'0 0 52px', letterSpacing:'-0.04em', color:'#E1E0CC' }}>
              Three phases of evolution.
            </h2>
          </Reveal>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            {/* Phase 1 */}
            <Reveal>
              <div style={{ background:'rgba(2,4,12,0.85)', border:`1px solid rgba(45,212,191,0.14)`, borderRadius:16, padding:24, height:'100%', boxSizing:'border-box' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <CheckCircle size={16} color={TEAL}/>
                  <div>
                    <div style={{ fontSize:9, color:'rgba(45,212,191,0.6)', ...MONO, letterSpacing:'0.12em', textTransform:'uppercase' }}>Phase 1 · Live v2.0 → v4.2</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#E1E0CC', marginTop:2 }}>Foundation</div>
                  </div>
                </div>
                {ROADMAP_V1.map((r, i) => <RoadmapItem key={r.t} {...r} delay={i*0.04}/>)}
              </div>
            </Reveal>

            {/* Phase 2 */}
            <Reveal delay={0.08}>
              <div style={{ background:'rgba(2,4,12,0.85)', border:`1px solid rgba(234,179,8,0.14)`, borderRadius:16, padding:24, height:'100%', boxSizing:'border-box' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <Cpu size={16} color="#EAB308"/>
                  <div>
                    <div style={{ fontSize:9, color:'rgba(234,179,8,0.6)', ...MONO, letterSpacing:'0.12em', textTransform:'uppercase' }}>Phase 2 · Building v4.2 →</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#E1E0CC', marginTop:2 }}>Intelligence</div>
                  </div>
                </div>
                {ROADMAP_V2.map((r, i) => <RoadmapItem key={r.t} {...r} delay={i*0.04}/>)}
              </div>
            </Reveal>

            {/* Phase 3 */}
            <Reveal delay={0.16}>
              <div style={{ background:'rgba(2,4,12,0.85)', border:`1px solid rgba(192,57,43,0.14)`, borderRadius:16, padding:24, height:'100%', boxSizing:'border-box' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <Rocket size={16} color={RED}/>
                  <div>
                    <div style={{ fontSize:9, color:'rgba(192,57,43,0.7)', ...MONO, letterSpacing:'0.12em', textTransform:'uppercase' }}>Phase 3 · Planned v5.0</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#E1E0CC', marginTop:2 }}>Platform</div>
                  </div>
                </div>
                {ROADMAP_V3.map((r, i) => <RoadmapItem key={r.t} text={r.t} delay={i*0.04}/>)}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTRIBUTE + CONTACT
          ═════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#04060e', padding:'100px 24px', borderTop:'1px solid rgba(192,57,43,0.1)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <Reveal>
            <div style={{ background:'rgba(4,4,16,0.9)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:28, padding:'72px 60px', textAlign:'center' }}>
              <div className="label" style={{ marginBottom:20 }}>Contribute · Collaborate · Build</div>
              <h2 style={{ fontSize:'clamp(26px,4.5vw,50px)', fontWeight:400, lineHeight:0.95, margin:'0 0 16px', letterSpacing:'-0.04em', color:'#E1E0CC' }}>
                AegisTrace is open.<br/><span className="serif" style={{ color:TEAL }}>Security should be too.</span>
              </h2>
              <p style={{ fontSize:14, color:'rgba(225,224,204,0.5)', maxWidth:560, margin:'0 auto 40px', lineHeight:1.65, fontWeight:300 }}>
                The platform is open-source, free to deploy, and built for the community. Whether you want to add a detection rule, build a new integration, or just provide feedback — every contribution matters.
              </p>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:40, textAlign:'left' }}>
                {[
                  { Icon:Code,     l:'Add a detection rule',  d:'Build a new ITDR detector or IOC correlation rule. Pluggable architecture, full docs.' },
                  { Icon:Shield,   l:'Report a vulnerability', d:'Found a security issue in AegisTrace? Responsible disclosure, acknowledged publicly.' },
                  { Icon:Brain,    l:'Improve AI prompts',     d:'Better system prompts, new reasoning strategies, evaluation datasets — all welcome.' },
                  { Icon:Globe,    l:'Deploy in your SOC',     d:'Running AegisTrace in production? Tell us. We want to hear what works and what does not.' },
                ].map(({ Icon, l, d }, i) => (
                  <Reveal key={l} delay={i*0.07}>
                    <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:16 }}>
                      <Icon size={14} color={RED} style={{ marginBottom:8 }}/>
                      <div style={{ fontSize:12, fontWeight:700, color:'#E1E0CC', marginBottom:5 }}>{l}</div>
                      <div style={{ fontSize:11, color:'rgba(225,224,204,0.44)', lineHeight:1.5 }}>{d}</div>
                    </div>
                  </Reveal>
                ))}
              </div>

              <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
                <motion.a
                  className="cta"
                  href={`mailto:${CONTACT_EMAIL}`}
                  whileTap={{ scale:0.97 }}
                >
                  {CONTACT_EMAIL}
                  <span className="circle"><Mail size={13} color="#DEDBC8"/></span>
                </motion.a>
                <a className="ghost" href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noopener noreferrer">
                  <Github size={13}/> GitHub
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:BG, borderTop:'1px solid rgba(255,255,255,0.05)', padding:'36px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <p style={{ color:'rgba(225,224,204,0.22)', fontSize:10, margin:0, ...MONO }}>© 2026 AEGISTRACE — TRUST · IDENTITY · PROVENANCE · CONTROL</p>
          <div style={{ display:'flex', gap:24 }}>
            <Link to="/"          className="nl" style={{ fontSize:11 }}>Home</Link>
            <Link to="/portfolio" className="nl" style={{ fontSize:11 }}>Portfolio</Link>
            <Link to="/app/login" className="nl" style={{ fontSize:11, color:'rgba(225,224,204,0.5)' }}>Platform →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
