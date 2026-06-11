import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight, Shield, Brain, Fingerprint, FolderSearch,
  Mail, Monitor, Activity, ArrowUpRight, Zap, Eye, CheckCircle,
  ShieldCheck, Lock, GitMerge, Users, Server, ChevronDown,
  GitBranch, Workflow, Radar, ShieldAlert, Gauge, Key,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050405';

/* ─── Particle network canvas ──────────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 72 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - .5) * .00035, vy: (Math.random() - .5) * .00035,
      r: Math.random() * 1.3 + .4, o: Math.random() * .32 + .1,
    }));
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1;
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,158,11,${p.o})`; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = (pts[i].x - pts[j].x) * W, dy = (pts[i].y - pts[j].y) * H;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath(); ctx.moveTo(pts[i].x*W, pts[i].y*H);
            ctx.lineTo(pts[j].x*W, pts[j].y*H);
            ctx.strokeStyle = `rgba(245,158,11,${(1 - d / 130) * .055})`;
            ctx.lineWidth = .5; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: .65, pointerEvents: 'none' }}/>;
}

/* ─── 3D tilt ───────────────────────────────────────────────────────────── */
function TiltCard({ children, style = {} }) {
  const ref  = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [live, setLive] = useState(false);
  const onMove = e => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top)  / r.height - 0.5) * -10;
    const ry = ((e.clientX - r.left) / r.width  - 0.5) *  10;
    setTilt({ rx, ry });
  };
  return (
    <div ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setLive(true)}
      onMouseLeave={() => { setTilt({ rx: 0, ry: 0 }); setLive(false); }}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)${live ? ' translateZ(6px)' : ''}`,
        transition: live ? 'transform 0.1s linear' : 'transform 0.65s cubic-bezier(0.16,1,0.3,1)',
        ...style,
      }}
    >{children}</div>
  );
}

/* ─── Scroll reveal ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 36, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-70px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.88, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Module card ───────────────────────────────────────────────────────── */
function ModuleCard({ icon: Icon, label, desc, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal key={label} delay={delay}>
      <TiltCard style={{ height: '100%' }}>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            background: hov ? 'rgba(245,158,11,0.06)' : 'rgba(245,240,232,0.02)',
            border: `1px solid ${hov ? 'rgba(245,158,11,0.22)' : 'rgba(245,240,232,0.07)'}`,
            backdropFilter: hov ? 'blur(8px)' : 'blur(0px)',
            WebkitBackdropFilter: hov ? 'blur(8px)' : 'blur(0px)',
            boxShadow: hov ? '0 0 40px rgba(245,158,11,0.06), inset 0 0 30px rgba(245,158,11,0.03)' : 'none',
            padding: '30px 26px', height: '100%',
            transition: 'background 240ms, border-color 240ms, box-shadow 240ms, backdrop-filter 240ms',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Corner accent */}
          {hov && <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: 'radial-gradient(circle at top right, rgba(245,158,11,0.12), transparent 70%)', pointerEvents: 'none' }}/>}
          <div style={{
            width: 38, height: 38,
            background: hov ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            transition: 'background 240ms',
            boxShadow: hov ? '0 0 16px rgba(245,158,11,0.2)' : 'none',
          }}>
            <Icon size={17} color={GOLD}/>
          </div>
          <div className="cd" style={{ fontSize: 15, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{label}</div>
          <div className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.46)', lineHeight: 1.68 }}>{desc}</div>
        </div>
      </TiltCard>
    </Reveal>
  );
}

/* ─── Animated counter ──────────────────────────────────────────────────── */
function Counter({ end, suffix = '' }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    const dur   = 2000;
    const start = performance.now();
    const tick  = now => {
      const t    = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(ease * end));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ════════════════════════════════════════════════════════════════════════════
   LANDING
════════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const MODULES = [
    { icon: Fingerprint,  label: 'Identity Threat Detection', desc: 'Real-time ITDR across human, machine, and AI agent identities — 4 detection engines running in parallel.' },
    { icon: FolderSearch, label: 'Case Management',           desc: '15-tab investigation workspace. Evidence chain, AI analysis, timeline, IOC pivot, vision analysis, detection rules, and DORA Article 19 compliance reporting.' },
    { icon: Mail,         label: 'Email Forensics',           desc: 'RFC header parsing, DKIM/SPF/DMARC analysis, AI phishing verdict with full MITRE ATT&CK technique mapping.' },
    { icon: Monitor,      label: 'Endpoint Detection',        desc: 'EDR telemetry, Sysmon integration, process tree analysis, and lateral movement detection across Windows, Linux, macOS.' },
    { icon: Activity,     label: 'Threat Intelligence',       desc: '7-source IOC engine: VirusTotal, AbuseIPDB, OTX, Shodan, GreyNoise, MISP, and MalwareBazaar — one query, unified result.' },
    { icon: Brain,        label: 'Agentic AI Triage',         desc: 'Hermes-3 70B function-calling agent on NVIDIA NIM. Autonomous tool use: IOC enrichment, case correlation, endpoint data, threat intel — parallel specialist agents in one pipeline.' },
    { icon: Eye,          label: 'Vision Analysis',           desc: 'Llama 3.2 Vision 11B analyses screenshots for phishing indicators, malware artifacts, IOCs, and MITRE techniques — verdict in seconds.' },
    { icon: Zap,          label: 'Detection Rule Generator',  desc: 'Codestral 22B generates deployable YARA, Sigma, KQL, and Splunk SPL rules from case IOCs and MITRE techniques — ready to paste into your SIEM.' },
    { icon: GitMerge,     label: 'Identity Graph',            desc: 'Visual map of every identity relationship — accounts, devices, sessions, and service principals — in a single graph.' },
    { icon: Shield,       label: 'ITDR Engine',               desc: 'Pluggable detection framework: impossible travel, credential stuffing, token replay, privilege escalation, and more.' },
    { icon: Server,       label: 'Endpoint Agent',            desc: 'Lightweight v5 agent for Windows, Linux, and macOS. Real-time telemetry, file integrity, and process monitoring.' },
    { icon: GitBranch,    label: 'Attack Graph Reconstruction', desc: 'Temporal Linker correlates alerts, endpoint logs, and defense events within seconds of each other, then asks Nemotron-70B to reconstruct the full attack chain as a narrative with MITRE technique mapping.' },
    { icon: Workflow,     label: 'Playbook Engine (SOAR)',    desc: 'If-this-then-that automation: trigger on ITDR alerts, Shadow AI detections, or blocked MCP tool calls — auto-create cases, enrich IOCs, page on-call, and queue endpoint isolation for one-click approval.' },
    { icon: Radar,        label: 'Shadow AI Detection',       desc: 'Cross-references endpoint and network telemetry against 14+ known AI API domains and your approved-services allowlist — flags unsanctioned ChatGPT, Copilot, and agent traffic, with ITDR escalation on repeat hits.' },
    { icon: ShieldAlert,  label: 'AI Defense Console',        desc: 'Live attack feed with human-in-the-loop control. Every automated containment suggestion — block, isolate, escalate, dismiss — surfaces for a one-click analyst decision before it executes.' },
    { icon: Gauge,        label: 'Control Plane',             desc: 'Real-time SOC command view: 5 KPI cards, high-risk identity panel, AI action queue, ITDR threat feed, and endpoint heartbeats — auto-refreshing every 30 seconds.' },
    { icon: Key,          label: 'NHI Lifecycle & Connectors', desc: 'Tracks service accounts, API keys, and tokens through sprawl scoring and trust decay, and connects identity providers plus approved AI services into one allowlist.' },
  ];

  const STEPS = [
    { n: '01', title: 'Alert arrives',        body: 'An alert fires from your SIEM, EDR, or identity provider. AegisTrace ingests it automatically and opens a new case.' },
    { n: '02', title: 'AI triage begins',     body: 'Hermes-3 on NVIDIA NIM runs a function-calling loop: IOC enrichment, similar case retrieval, endpoint queries, specialist agents — all in parallel. Verdict in seconds.' },
    { n: '03', title: 'Analyst investigates', body: 'You open the 15-tab workspace: timeline, identity graph, endpoint data, email forensics, vision analysis, AI reasoning, detection rules, and the full evidence chain.' },
    { n: '04', title: 'Case resolved',        body: 'Containment actions, DORA Article 19 report, and full audit trail are generated automatically. The case closes with provenance intact.' },
  ];

  const FOR_WHOM = [
    { icon: Users,      title: 'SOC Analysts',        body: 'Tier 1 and Tier 2 analysts who need faster triage, cleaner evidence chains, and AI-assisted investigation without the hallucinations.' },
    { icon: ShieldCheck,title: 'Security Engineers',  body: 'Engineers building detection rules, running threat hunts, and integrating new telemetry sources into the security stack.' },
    { icon: Eye,        title: 'Compliance Officers', body: 'Teams responsible for DORA Article 19, NIS2, and GDPR incident reporting — AegisTrace generates the reports automatically.' },
  ];

  return (
    <div style={{ background: BG, color: '#F5F0E8', overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        .cd { font-family: 'Clash Display', sans-serif; }
        .cg { font-family: 'Cabinet Grotesk', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .gold-btn {
          display: inline-flex; align-items: center; gap: 9px;
          background: ${GOLD}; color: #000; font-weight: 700;
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px;
          padding: 13px 26px; border: none; cursor: pointer;
          text-decoration: none; letter-spacing: 0.03em;
          transition: background 140ms cubic-bezier(0.16,1,0.3,1), transform 90ms, box-shadow 140ms;
        }
        .gold-btn:hover  { background: #FBBF24; box-shadow: 0 0 24px rgba(245,158,11,0.35); }
        .gold-btn:active { transform: scale(0.97); }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(245,240,232,0.75);
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          padding: 12px 24px; border: 1px solid rgba(245,240,232,0.2);
          cursor: pointer; text-decoration: none; letter-spacing: 0.03em;
          transition: border-color 140ms, color 140ms, transform 90ms;
        }
        .ghost-btn:hover  { border-color: rgba(245,240,232,0.44); color: #F5F0E8; }
        .ghost-btn:active { transform: scale(0.97); }

        .nav-link {
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(245,240,232,0.6); text-decoration: none; letter-spacing: 0.03em;
          transition: color 140ms;
        }
        .nav-link:hover { color: #F5F0E8; }

        @keyframes kenburns { from { transform: scale(1.06); } to { transform: scale(1.0); } }
        @keyframes scrollPulse { 0%,100%{opacity:.22} 50%{opacity:1} }
        @keyframes bounce-y { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }

        @keyframes glow-pulse {
          0%,100% { text-shadow: 0 0 20px rgba(245,158,11,.28), 0 0 40px rgba(245,158,11,.1); }
          50%     { text-shadow: 0 0 36px rgba(245,158,11,.52), 0 0 72px rgba(245,158,11,.2); }
        }
        @keyframes scan-sweep {
          from { transform: translateY(-4px); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          to   { transform: translateY(calc(100vh + 4px)); opacity: 0; }
        }
        @keyframes ripple-ring {
          from { transform: translate(-50%,-50%) scale(.04); opacity: .65; }
          to   { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <motion.nav
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: E }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(20px,4vw,56px)', height: 64,
          background: scrolled ? 'rgba(5,4,5,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(245,240,232,0.06)' : 'none',
          transition: 'background 300ms, backdrop-filter 300ms, border-color 300ms',
        }}
      >
        <Link to="/" className="cd" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.1em' }}>
          AEGISTRACE
        </Link>
        <div style={{ display: 'flex', gap: 'clamp(16px,3vw,36px)', alignItems: 'center' }}>
          <Link to="/mission"   className="nav-link">Mission</Link>
          <Link to="/portfolio" className="nav-link">Portfolio</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>
            Sign In <ArrowRight size={13}/>
          </Link>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 640, overflow: 'hidden' }}>
        {/* Kenburns background image */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url('/assets/pages/mainwebpage.jpg')`,
          backgroundSize: 'cover', backgroundPosition: 'center 30%',
          animation: 'kenburns 20s ease-out forwards',
        }}/>

        {/* Particle network */}
        <ParticleCanvas/>

        {/* Depth gradient overlays */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(5,4,5,0.28) 0%, rgba(5,4,5,0.05) 30%, rgba(5,4,5,0.9) 100%)', zIndex: 2 }}/>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(105deg, rgba(5,4,5,0.82) 0%, rgba(5,4,5,0.3) 55%, transparent 100%)', zIndex: 2 }}/>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 55% 45% at 2% 95%, rgba(245,158,11,0.16) 0%, transparent 65%)', zIndex: 2 }}/>

        {/* Scanline sweep */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, height: 2, zIndex: 6, pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.3) 30%, rgba(245,158,11,0.5) 50%, rgba(245,158,11,0.3) 70%, transparent 100%)',
          animation: 'scan-sweep 8s cubic-bezier(0.4,0,0.6,1) infinite',
          boxShadow: '0 0 12px rgba(245,158,11,0.3)',
        }}/>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 clamp(24px,5vw,72px) clamp(56px,8vh,88px)', maxWidth: 960 }}>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: E }}
            className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 600 }}>
            AI-Powered Security Operations Platform
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.95, delay: 0.38, ease: E }}
            className="cd" style={{ fontSize: 'clamp(46px,7.5vw,92px)', fontWeight: 700, lineHeight: 0.94, letterSpacing: '-0.03em', color: '#F5F0E8', margin: '0 0 26px' }}>
            Detect. Trace.<br/><span style={{ color: GOLD, textShadow: '0 0 40px rgba(245,158,11,0.3)' }}>Neutralize.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.56, ease: E }}
            className="cg" style={{ fontSize: 'clamp(14px,1.5vw,17px)', color: 'rgba(245,240,232,0.62)', lineHeight: 1.72, marginBottom: 36, maxWidth: 480 }}>
            AegisTrace is a full-stack security operations platform with NVIDIA NIM-powered agentic AI. From alert ingestion to closed case — every step is provenance-backed.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.72, ease: E }} style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/app/login" className="gold-btn">Access Platform <ArrowRight size={15}/></Link>
            <Link to="/mission"   className="ghost-btn">See the Mission</Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div aria-hidden style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span className="cg" style={{ fontSize: 9, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>scroll</span>
          <ChevronDown size={14} color="rgba(245,240,232,0.3)" style={{ animation: 'bounce-y 2s ease-in-out infinite' }}/>
        </div>
      </section>

      {/* ── TRUST TICKER ── */}
      <section style={{ padding: '20px 0', background: 'rgba(245,158,11,0.06)', borderTop: '1px solid rgba(245,158,11,0.15)', borderBottom: '1px solid rgba(245,158,11,0.15)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', animation: 'ticker 28s linear infinite', width: 'max-content', whiteSpace: 'nowrap' }}>
          {[...Array(2)].map((_, pass) => (
            <div key={pass} style={{ display: 'flex', gap: 'clamp(28px,4vw,56px)', alignItems: 'center', paddingRight: 'clamp(28px,4vw,56px)' }}>
              {[
                { icon: ShieldCheck, text: 'MITRE ATT&CK aligned' },
                { icon: CheckCircle, text: 'DORA Article 19 ready' },
                { icon: Lock,        text: 'End-to-end encrypted' },
                { icon: Zap,         text: 'Sub-second alert triage' },
                { icon: Eye,         text: 'Full audit provenance' },
                { icon: GitMerge,    text: 'Identity-first detection' },
                { icon: Brain,       text: 'NVIDIA NIM inference' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Icon size={13} color={GOLD}/>
                  <span className="cg" style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)', letterSpacing: '0.04em' }}>{text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── MODULES ── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', background: '#060507' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 64 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.0 }}>
                  One platform.<br/>Every threat surface.
                </h2>
                <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.44)', margin: 0, maxWidth: 380, lineHeight: 1.6 }}>
                  Purpose-built modules share one investigation timeline — no pivot tables, no tool switching.
                </p>
              </div>
              <Link to="/app/login" className="ghost-btn" style={{ flexShrink: 0 }}>
                Explore Platform <ArrowUpRight size={14}/>
              </Link>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 2 }}>
            {MODULES.map(({ icon, label, desc }, i) => (
              <ModuleCard key={label} icon={icon} label={label} desc={desc} delay={i * 0.05}/>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 64 }}>
            <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 12px', letterSpacing: '-0.03em' }}>
              From alert to resolved — <span style={{ color: GOLD }}>in four steps.</span>
            </h2>
            <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.44)', maxWidth: 480, lineHeight: 1.65 }}>
              AegisTrace handles the heavy lifting so analysts focus on decisions, not data collection.
            </p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0 }}>
            {STEPS.map(({ n, title, body }, i) => (
              <Reveal key={n} delay={i * 0.08} y={24}>
                <div style={{ padding: '36px 32px', borderRight: i < STEPS.length - 1 ? '1px solid rgba(245,240,232,0.06)' : 'none', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 32, right: 32, height: 2, background: i === 0 ? GOLD : 'rgba(245,240,232,0.08)', boxShadow: i === 0 ? '0 0 12px rgba(245,158,11,0.4)' : 'none' }}/>
                  <div className="mono" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.12em', marginBottom: 18 }}>{n}</div>
                  <div className="cd" style={{ fontSize: 18, fontWeight: 600, color: '#F5F0E8', marginBottom: 12, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</div>
                  <div className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.46)', lineHeight: 1.68 }}>{body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', background: '#060507', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(40px,6vw,64px)' }}>
          {[
            { end: 15,  suffix: '',   label: 'Investigation tabs per case — including Vision, Rules, and Attack Graph' },
            { end: 7,   suffix: '',   label: 'IOC intelligence sources queried per alert' },
            { end: 8,   suffix: '',   label: 'NVIDIA NIM models integrated across the platform' },
            { end: 100, suffix: '%',  label: 'DORA Article 19 report coverage' },
            { end: 6,   suffix: '',   label: 'Identity (ITDR) detection engines running in parallel' },
            { end: 4,   suffix: '',   label: 'Rule formats generated: YARA, Sigma, KQL, Splunk SPL' },
            { end: 7,   suffix: '',   label: 'Automated SOAR playbook actions, from case creation to endpoint isolation' },
          ].map(({ end, suffix, label }, i) => (
            <Reveal key={label} delay={i * 0.06} y={24}>
              <div style={{ position: 'relative' }}>
                {/* Glow bloom behind number */}
                <div aria-hidden style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-60%)', width: 80, height: 80, background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)', pointerEvents: 'none' }}/>
                <div className="cd" style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 700, color: GOLD, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 12, position: 'relative', animation: 'glow-pulse 4s ease-in-out infinite' }}>
                  <Counter end={end} suffix={suffix}/>
                </div>
                <div className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.4)', lineHeight: 1.55, maxWidth: 200 }}>{label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── BUILT FOR ── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.03em' }}>
              Built for the people who<br/><span style={{ color: GOLD }}>actually work incidents.</span>
            </h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {FOR_WHOM.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.08} y={24}>
                <div style={{ padding: '36px 32px', background: 'rgba(245,240,232,0.02)', border: '1px solid rgba(245,240,232,0.07)' }}>
                  <Icon size={22} color={GOLD} style={{ marginBottom: 20 }}/>
                  <div className="cd" style={{ fontSize: 18, fontWeight: 600, color: '#F5F0E8', marginBottom: 12, letterSpacing: '-0.01em' }}>{title}</div>
                  <div className="cg" style={{ fontSize: 14, color: 'rgba(245,240,232,0.48)', lineHeight: 1.7 }}>{body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: 'clamp(96px,12vw,160px) clamp(24px,5vw,72px)', position: 'relative', overflow: 'hidden', background: '#060507', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        {/* Radial glow */}
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(245,158,11,0.09) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        {/* Ripple rings */}
        {[0, 1, 2].map(i => (
          <div key={i} aria-hidden style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 500, height: 500, border: '1px solid rgba(245,158,11,0.07)',
            borderRadius: '50%', pointerEvents: 'none',
            animation: `ripple-ring ${4 + i * 1.6}s cubic-bezier(0,0,.8,1) ${i * 1.4}s infinite`,
          }}/>
        ))}
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <Reveal>
            <h2 className="cd" style={{ fontSize: 'clamp(30px,5vw,64px)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.03em', lineHeight: 0.94, marginBottom: 22 }}>
              Ready to see inside<br/>your threat landscape?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.46)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 44px' }}>
              AegisTrace is built for analysts who need answers, not more dashboards.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/app/login" className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>
                Request Access <ArrowRight size={16}/>
              </Link>
              <Link to="/portfolio" className="ghost-btn" style={{ fontSize: 14, padding: '14px 28px' }}>
                About the Builder
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '40px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 48 }}>
            <div>
              <div className="cd" style={{ fontSize: 16, fontWeight: 700, color: '#F5F0E8', letterSpacing: '0.08em', marginBottom: 12 }}>AEGISTRACE</div>
              <p className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.35)', lineHeight: 1.65, margin: 0, maxWidth: 220 }}>
                AI-powered security operations platform for identity-first threat detection.
              </p>
            </div>
            <div>
              <div className="cg" style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Platform</div>
              {[{ l: 'Sign In', to: '/app/login' }, { l: 'Mission', to: '/mission' }, { l: 'Portfolio', to: '/portfolio' }].map(({ l, to }) => (
                <div key={l} style={{ marginBottom: 10 }}><Link to={to} className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none', transition: 'color 140ms' }}
                  onMouseEnter={e => (e.target.style.color = GOLD)} onMouseLeave={e => (e.target.style.color = 'rgba(245,240,232,0.42)')}
                >{l}</Link></div>
              ))}
            </div>
            <div>
              <div className="cg" style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Contact</div>
              <a href="mailto:prasanna80564@gmail.com" className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none', display: 'block', marginBottom: 10 }}>prasanna80564@gmail.com</a>
              <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none' }}>github.com/Prasanna-27eng</a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(245,240,232,0.05)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span className="cd" style={{ color: 'rgba(245,240,232,0.2)', fontSize: 12, letterSpacing: '0.06em' }}>AEGISTRACE</span>
            <span className="cg" style={{ color: 'rgba(245,240,232,0.16)', fontSize: 11 }}>© 2026 Prasanna Kumar Surendran · Dublin, Ireland</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
