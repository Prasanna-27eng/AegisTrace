import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Shield, Eye, Zap, Radio, Activity, Target, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════════════════
   AEGISTRACE — Mission Page
   ───────────────────────────────────────────────────────────────────────────
   Cyberpunk command-center aesthetic
   GSAP ScrollTrigger for cinematic text reveals
   AI agent status indicators + mission control dashboard
   Emil / Impeccable: intentional motion, OKLCH tints, no ease-in
   ═══════════════════════════════════════════════════════════════════════════ */

const EASE_OUT = [0.23, 1, 0.32, 1];

/* ─── Animated noise background ─────────────────────────────────────────── */
function NoiseBg({ opacity = 0.06 }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px',
        opacity,
      }}
    />
  );
}

/* ─── Scan line overlay ──────────────────────────────────────────────────── */
function ScanLines() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.035) 2px, rgba(0,0,0,0.035) 4px)',
    }} />
  );
}

/* ─── Glitch text ────────────────────────────────────────────────────────── */
function GlitchText({ text, style }) {
  const [glitching, setGlitch] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <span style={{ position: 'relative', display: 'inline-block', ...style }}>
      {text}
      {glitching && (
        <>
          <span style={{ position:'absolute', top:0, left:0, color:'#ff2222', clipPath:'inset(30% 0 50% 0)', transform:'translateX(-2px)', opacity:0.8, pointerEvents:'none', ...style }}>{text}</span>
          <span style={{ position:'absolute', top:0, left:0, color:'#00ffe5', clipPath:'inset(60% 0 10% 0)', transform:'translateX(2px)', opacity:0.8, pointerEvents:'none', ...style }}>{text}</span>
        </>
      )}
    </span>
  );
}

/* ─── Agent status card ──────────────────────────────────────────────────── */
function AgentCard({ name, status, task, uptime, index }) {
  const colors = { ACTIVE: '#00ff88', INVESTIGATING: '#ff8c00', IDLE: '#555' };
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ x: -20, opacity: 0 }}
      animate={inView ? { x: 0, opacity: 1 } : {}}
      transition={{ duration: 0.4, delay: index * 0.07, ease: EASE_OUT }}
      style={{
        background: 'rgba(8,8,8,0.9)',
        border: `1px solid ${status === 'INVESTIGATING' ? 'rgba(255,140,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        fontFamily: 'JetBrains Mono, monospace',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colors[status] || '#555',
        flexShrink: 0,
        boxShadow: status === 'ACTIVE' ? `0 0 8px ${colors[status]}` : 'none',
        animation: status === 'ACTIVE' ? 'pulse-green 2s ease infinite' : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#E1E0CC', fontWeight: 600, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 10, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: colors[status] || '#555', letterSpacing: '0.08em' }}>{status}</div>
        <div style={{ fontSize: 9, color: '#333', marginTop: 2 }}>UP {uptime}</div>
      </div>
    </motion.div>
  );
}

/* ─── Timeline entry ─────────────────────────────────────────────────────── */
function TimelineItem({ time, event, severity, index }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const sevColor = { CRITICAL: '#ff2222', HIGH: '#ff8c00', MEDIUM: '#ffd700', INFO: '#00ffe5' };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -24 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE_OUT }}
      style={{ display: 'flex', gap: 16, alignItems: 'flex-start', paddingBottom: 20 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor[severity], boxShadow: `0 0 6px ${sevColor[severity]}` }} />
        <div style={{ width: 1, height: 'calc(100% - 8px)', background: 'rgba(255,255,255,0.06)', marginTop: 6, flexGrow: 1 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>{time}</span>
          <span style={{ fontSize: 9, color: sevColor[severity], letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>{severity}</span>
        </div>
        <p style={{ fontSize: 13, color: '#999', lineHeight: 1.4, margin: 0, fontWeight: 300 }}>{event}</p>
      </div>
    </motion.div>
  );
}

/* ─── GSAP scroll-triggered headline ────────────────────────────────────── */
function ScrollHeadline({ id, text, color = '#E1E0CC' }) {
  const ref = useRef(null);
  useEffect(() => {
    const chars = ref.current.querySelectorAll('.at-char');
    gsap.from(chars, {
      y: 60, opacity: 0, stagger: 0.025, duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
    });
  }, []);

  return (
    <div ref={ref} aria-label={text} style={{ overflow: 'hidden' }}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="at-char"
          style={{
            display: 'inline-block',
            color,
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════════ */
export default function Mission() {
  const mono = { fontFamily: 'JetBrains Mono, monospace' };

  const AGENTS = [
    { name: 'SIGMA-7', status: 'INVESTIGATING', task: 'Lateral movement detected — AD forest srv-prod-01', uptime: '2h 14m' },
    { name: 'GHOST-3', status: 'ACTIVE', task: 'Correlating 847 events from SIEM ingestion queue', uptime: '18h 42m' },
    { name: 'RAVEN-1', status: 'ACTIVE', task: 'Monitoring 12 identity anomalies — zero false positives', uptime: '4d 06h' },
    { name: 'ARGUS-9', status: 'IDLE', task: 'Standby — last scan completed 4 min ago', uptime: '11d 20h' },
    { name: 'BLADE-2', status: 'ACTIVE', task: 'Hunting Cobalt Strike beacon callbacks — 3 hits', uptime: '6h 33m' },
    { name: 'APEX-5', status: 'INVESTIGATING', task: 'Cloud IAM exfiltration pattern — AWS us-east-1', uptime: '41m' },
  ];

  const TIMELINE = [
    { time: '14:32:07', event: 'SIGMA-7 detected lateral movement on srv-prod-01 via pass-the-hash', severity: 'CRITICAL' },
    { time: '14:29:44', event: 'Anomalous login from IP 185.220.x.x — Tor exit node — blocked by policy', severity: 'HIGH' },
    { time: '14:18:02', event: 'DNS tunneling signatures matched on workstation WS-047 — quarantined', severity: 'HIGH' },
    { time: '13:55:11', event: 'GHOST-3 completed correlation sweep — 847 events processed, 3 escalated', severity: 'INFO' },
    { time: '13:40:28', event: 'Cloud storage exfiltration attempt blocked — 4.2 GB prevented', severity: 'CRITICAL' },
    { time: '13:12:55', event: 'Certificate transparency alert — suspicious subdomain registered', severity: 'MEDIUM' },
  ];

  return (
    <div style={{ background: '#000', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');
        body,*{font-family:'Almarai',-apple-system,sans-serif;}

        @keyframes pulse-green { 0%,100%{box-shadow:0 0 4px #00ff88} 50%{box-shadow:0 0 14px #00ff88} }
        @keyframes scan-v { 0%{transform:translateX(-100%)} 100%{transform:translateX(100vw)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes rotate-slow { to{transform:rotate(360deg)} }

        .at-blink { animation: blink 1.2s step-end infinite; }
        .at-rotate { animation: rotate-slow 8s linear infinite; }

        .at-mission-btn {
          display:inline-flex;align-items:center;gap:10px;
          border:1px solid rgba(255,34,34,0.4);color:#ff2222;
          background:transparent;padding:12px 28px;
          font-size:12px;font-weight:700;letter-spacing:0.18em;
          text-transform:uppercase;text-decoration:none;
          transition:all 200ms cubic-bezier(0.23,1,0.32,1);
          cursor:pointer;font-family:inherit;
        }
        .at-mission-btn:active{transform:scale(0.97);}
        @media(hover:hover)and(pointer:fine){
          .at-mission-btn:hover{background:rgba(255,34,34,0.1);border-color:#ff2222;}
        }

        /* Vertical scan line */
        .at-vscan {
          position:fixed;top:0;width:1px;height:100vh;
          background:linear-gradient(to bottom,transparent,rgba(255,34,34,0.4),transparent);
          animation:scan-v 6s linear infinite;
          pointer-events:none;z-index:2;
        }
      `}</style>

      <ScanLines />
      <div className="at-vscan" />

      {/* ─── HERO ──────────────────────────────────────────────────────── */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', padding:'0 24px', overflow:'hidden' }}>
        <NoiseBg opacity={0.08} />

        {/* Rotating ring decoration */}
        <div style={{ position:'absolute', right:'-10%', top:'50%', transform:'translateY(-50%)', opacity:0.06, pointerEvents:'none' }}>
          <div className="at-rotate" style={{ width:600, height:600, border:'1px solid #ff2222', borderRadius:'50%' }} />
        </div>
        <div style={{ position:'absolute', right:'-5%', top:'50%', transform:'translateY(-50%)', opacity:0.04, pointerEvents:'none' }}>
          <div className="at-rotate" style={{ width:400, height:400, border:'1px solid #00ffe5', borderRadius:'50%', animationDirection:'reverse' }} />
        </div>

        <div style={{ position:'relative', zIndex:3, maxWidth:900 }}>
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ duration:0.5, ease:EASE_OUT }}
            style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.3em', ...mono, marginBottom:28, display:'flex', gap:16 }}
          >
            <span>AEGISTRACE MISSION BRIEF</span>
            <span className="at-blink">█</span>
            <span style={{ color:'#333' }}>CLEARANCE: ALPHA-TIER</span>
          </motion.div>

          <h1 style={{ fontSize:'clamp(52px,9vw,120px)', fontWeight:800, lineHeight:0.88, letterSpacing:'-0.04em', margin:'0 0 40px' }}>
            <ScrollHeadline text="We don't" />
            <ScrollHeadline text="wait for" color="#ff2222" />
            <ScrollHeadline text="breaches." />
          </h1>

          <motion.p
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.4, ease:EASE_OUT }}
            style={{ fontSize:18, color:'rgba(225,224,204,0.55)', lineHeight:1.55, maxWidth:560, margin:'0 0 48px', fontWeight:300 }}
          >
            AegisTrace was built on a single conviction: that every breach leaves a trail. Our mission is to find it — before damage is done.
          </motion.p>

          <motion.div
            initial={{ opacity:0, y:16 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.5, delay:0.55, ease:EASE_OUT }}
            style={{ display:'flex', gap:16, flexWrap:'wrap' }}
          >
            <Link to="/login" className="at-mission-btn">Access Platform <ArrowRight size={14} /></Link>
            <a href="#agents" className="at-mission-btn" style={{ borderColor:'rgba(255,255,255,0.1)', color:'rgba(225,224,204,0.4)' }}>View Active Agents</a>
          </motion.div>
        </div>
      </section>

      {/* ─── MANIFESTO ─────────────────────────────────────────────────── */}
      <section style={{ position:'relative', padding:'140px 24px', background:'#000' }}>
        <NoiseBg opacity={0.06} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:2 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'start' }}>
            <div>
              <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.25em', ...mono, marginBottom:24 }}>// THE MISSION</div>
              <h2 style={{ fontSize:'clamp(32px,5vw,64px)', fontWeight:700, color:'#E1E0CC', letterSpacing:'-0.04em', lineHeight:0.92, margin:0 }}>
                <ScrollHeadline text="The threat" />
                <ScrollHeadline text="landscape" color="#ff2222" />
                <ScrollHeadline text="never sleeps." />
              </h2>
            </div>
            <div style={{ paddingTop:16 }}>
              {[
                { stat:'4.7s', label:'Our mean time to detect vs 207 days industry average' },
                { stat:'247', label:'Autonomous AI agents running 24/7 across every customer' },
                { stat:'99.97%', label:'Detection accuracy — verified against MITRE ATT&CK' },
                { stat:'0', label:'False-positive containment actions in the last 90 days' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity:0, x:20 }}
                  whileInView={{ opacity:1, x:0 }}
                  viewport={{ once:true }}
                  transition={{ duration:0.4, delay:i*0.08, ease:EASE_OUT }}
                  style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'20px 0', display:'flex', gap:24, alignItems:'center' }}
                >
                  <div style={{ fontSize:28, fontWeight:800, color:'#E1E0CC', ...mono, flexShrink:0, minWidth:80 }}>{s.stat}</div>
                  <div style={{ fontSize:13, color:'#666', lineHeight:1.4, fontWeight:300 }}>{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── AGENTS LIVE FEED ──────────────────────────────────────────── */}
      <section id="agents" style={{ position:'relative', padding:'120px 24px', background:'#000' }}>
        <NoiseBg opacity={0.07} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:2 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'start' }}>

            {/* Left: Agent feed */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
                <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.25em', ...mono }}>// ACTIVE AGENTS</div>
                <div style={{ fontSize:11, color:'#00ff88', ...mono }}>● LIVE</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {AGENTS.map((agent, i) => (
                  <AgentCard key={agent.name} {...agent} index={i} />
                ))}
              </div>
            </div>

            {/* Right: Incident timeline */}
            <div>
              <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.25em', ...mono, marginBottom:32 }}>// INCIDENT TIMELINE</div>
              <div>
                {TIMELINE.map((item, i) => (
                  <TimelineItem key={i} {...item} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VALUES ────────────────────────────────────────────────────── */}
      <section style={{ position:'relative', padding:'120px 24px', background:'#000' }}>
        <NoiseBg opacity={0.06} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:2, textAlign:'center' }}>
          <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.25em', ...mono, marginBottom:24 }}>// HOW WE OPERATE</div>
          <h2 style={{ fontSize:'clamp(32px,5vw,64px)', fontWeight:700, color:'#E1E0CC', letterSpacing:'-0.04em', lineHeight:0.92, margin:'0 0 72px' }}>
            Principles that<br />
            <span style={{ color:'#ff2222' }}>don't bend</span> under fire.
          </h2>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:2, textAlign:'left' }}>
            {[
              { icon: <Target size={18} />, title:'Precision over speed', body:'Every alert is verified before it reaches an analyst. We eliminate noise, not nuance.' },
              { icon: <Lock size={18} />, title:'Zero trust, always', body:'We assume breach. Every identity, every token, every API call is treated as hostile until proven otherwise.' },
              { icon: <Radio size={18} />, title:'Continuous monitoring', body:'Threats don\'t work banker\'s hours. Neither do our agents. 24/7/365, zero downtime.' },
              { icon: <Shield size={18} />, title:'Transparent operations', body:'Every agent decision is logged, explainable, and auditable. No black boxes in your security stack.' },
            ].map((val, i) => (
              <motion.div
                key={i}
                initial={{ opacity:0, y:24 }}
                whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }}
                transition={{ duration:0.45, delay:i*0.1, ease:EASE_OUT }}
                style={{ background:'rgba(8,8,8,0.9)', border:'1px solid rgba(255,255,255,0.05)', padding:32, backdropFilter:'blur(8px)' }}
              >
                <div style={{ color:'#ff2222', marginBottom:16 }}>{val.icon}</div>
                <h3 style={{ fontSize:17, fontWeight:700, color:'#E1E0CC', margin:'0 0 10px' }}>{val.title}</h3>
                <p style={{ fontSize:13, color:'#555', lineHeight:1.5, margin:0, fontWeight:300 }}>{val.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────── */}
      <section style={{ position:'relative', padding:'120px 24px 160px', textAlign:'center', background:'#000' }}>
        <NoiseBg opacity={0.07} />
        <div style={{ position:'relative', zIndex:2, maxWidth:600, margin:'0 auto' }}>
          <motion.div
            initial={{ opacity:0, y:32 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.6, ease:EASE_OUT }}
          >
            <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.25em', ...mono, marginBottom:24 }}>// JOIN THE MISSION</div>
            <h2 style={{ fontSize:'clamp(36px,7vw,88px)', fontWeight:800, color:'#E1E0CC', letterSpacing:'-0.05em', lineHeight:0.88, margin:'0 0 32px' }}>
              <GlitchText text="Ready to" style={{ color:'#E1E0CC', fontSize:'inherit', fontFamily:'inherit', fontWeight:'inherit' }} />
              <br />
              <span style={{ color:'#ff2222' }}>hunt?</span>
            </h2>
            <p style={{ fontSize:16, color:'rgba(225,224,204,0.45)', lineHeight:1.5, margin:'0 auto 48px', fontWeight:300 }}>
              Deploy your first autonomous agent in under 10 minutes. No configuration. No false starts.
            </p>
            <Link to="/login" className="at-mission-btn" style={{ fontSize:14, padding:'14px 44px' }}>
              Start the Mission <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
