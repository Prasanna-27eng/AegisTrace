import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent, useInView, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Shield, Brain, Fingerprint, FolderSearch,
  Mail, Monitor, Activity, CheckCircle, Clock, ArrowUpRight,
  Zap, Eye, Lock, GitMerge, Layers, ShieldCheck, User,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050405';

/* ─── Scroll reveal ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 36, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.88, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Ambient ember field ───────────────────────────────────────────────
   Fixed full-viewport canvas behind the content: 44 slow-drifting warm
   particles (40% gold), twinkling via phase-offset sine. Renders a single
   static frame under prefers-reduced-motion.                             */
function AmbientEmbers() {
  const canvasRef = useRef(null);
  const reduced   = useReducedMotion();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 1, raf = 0, t = 0;
    const embers = Array.from({ length: 44 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random() * 1.7,
      v: 0.08 + Math.random() * 0.22,
      ph: Math.random() * 6.28,
      gold: Math.random() < 0.4,
    }));
    const size = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (still) => {
      ctx.clearRect(0, 0, w, h);
      embers.forEach(e => {
        if (!still) {
          e.y -= e.v / h;
          if (e.y < -0.01) { e.y = 1.01; e.x = Math.random(); }
        }
        const x = e.x * w + Math.sin(t * 0.5 + e.ph) * 14;
        const a = still ? 0.22 : 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.2 + e.ph));
        ctx.fillStyle = e.gold ? `rgba(245,158,11,${a * 1.25})` : `rgba(245,240,232,${a})`;
        ctx.beginPath();
        ctx.arc(x, e.y * h, e.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    size();
    window.addEventListener('resize', size);
    if (reduced) {
      draw(true);
    } else {
      const loop = () => { t += 0.016; draw(false); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, [reduced]);
  return (
    <canvas ref={canvasRef} aria-hidden style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      zIndex: -1, pointerEvents: 'none',
    }}/>
  );
}

/* ─── Roadmap item ──────────────────────────────────────────────────────── */
function RoadItem({ text, why, done = false, active = false, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  const color  = done ? GOLD : active ? '#FBBF24' : 'rgba(245,240,232,0.22)';
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: -10 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: E }}
      style={{ padding: '14px 0', borderBottom: '1px solid rgba(245,240,232,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flexShrink: 0, marginTop: 4 }}>
          {done   ? <CheckCircle size={14} color={GOLD} style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' }}/>
          : active ? <Clock size={14} color="#FBBF24"/>
          : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(245,240,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(245,240,232,0.2)' }}/></div>
          }
        </div>
        <div>
          <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 14, color, lineHeight: 1.6, display: 'block' }}>
            {text}
          </span>
          {why && (
            <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 12, color: 'rgba(245,240,232,0.28)', lineHeight: 1.55, display: 'block', marginTop: 4 }}>
              {why}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Principle card ────────────────────────────────────────────────────── */
function PrincipleCard({ icon: Icon, title, body, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? 'rgba(245,158,11,0.05)' : 'rgba(245,240,232,0.02)',
          border: `1px solid ${hov ? 'rgba(245,158,11,0.2)' : 'rgba(245,240,232,0.07)'}`,
          backdropFilter: hov ? 'blur(10px)' : 'blur(0px)',
          WebkitBackdropFilter: hov ? 'blur(10px)' : 'blur(0px)',
          boxShadow: hov ? '0 0 32px rgba(245,158,11,0.07), inset 0 0 20px rgba(245,158,11,0.03)' : 'none',
          padding: '28px 24px',
          transition: 'background 240ms cubic-bezier(0.16,1,0.3,1), border-color 240ms, box-shadow 240ms, backdrop-filter 240ms',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {hov && <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'radial-gradient(circle at top right, rgba(245,158,11,0.1), transparent 70%)', pointerEvents: 'none' }}/>}
        <Icon size={20} color={GOLD} style={{
          marginBottom: 18,
          opacity: hov ? 1 : 0.7,
          transition: 'opacity 220ms, filter 220ms',
          filter: hov ? 'drop-shadow(0 0 6px rgba(245,158,11,0.5))' : 'none',
        }}/>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 16, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 13, color: 'rgba(245,240,232,0.46)', lineHeight: 1.68 }}>{body}</div>
      </div>
    </Reveal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MISSION
════════════════════════════════════════════════════════════════════════════ */
/* ─── Scroll progress hairline — gold thread across the top ───────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 170, damping: 30, mass: 0.3 });
  return (
    <motion.div aria-hidden style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2,
      background: GOLD, transformOrigin: '0 50%', scaleX, zIndex: 300,
    }}/>
  );
}

/* ─── Pinned 83% stat scene — scroll storytelling, Landing scene pattern ── */
function Stat83Scene() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const { scrollYProgress: raw } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(raw, { stiffness: 170, damping: 30, mass: 0.3, restDelta: 0.0001 });
  const [count, setCount] = useState(0);
  useMotionValueEvent(p, 'change', v => setCount(Math.round(Math.max(0, Math.min(1, (v - 0.08) / 0.45)) * 83)));

  const exitOpacity    = useTransform(raw, [0.93, 1], [1, 0], { clamp: true });
  const statOpacity    = useTransform(p, [0.02, 0.22], [0, 1], { clamp: true });
  const statY          = useTransform(statOpacity, o => (1 - o) * 70);
  const captionOpacity = useTransform(p, [0.42, 0.6], [0, 1], { clamp: true });
  const dotsOpacity    = useTransform(p, [0.05, 0.3], [0, 0.22], { clamp: true });
  const dotsY          = useTransform(p, v => -v * 150);

  if (isMobile || reduced) {
    return (
      <section style={{ padding: 'clamp(56px,10vw,96px) clamp(24px,5vw,72px)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 'clamp(80px,20vw,160px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>83</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 'clamp(40px,9vw,72px)', fontWeight: 700, color: 'rgba(245,240,232,0.4)', lineHeight: 1 }}>%</span>
        </div>
        <p className="cg" style={{ fontSize: 18, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 460, margin: '24px auto 0' }}>
          of breaches involve <strong style={{ color: '#F5F0E8' }}>stolen credentials or identity abuse.</strong> The perimeter is whoever you trust.
        </p>
      </section>
    );
  }

  return (
    <section ref={ref} style={{ height: '230vh', position: 'relative' }}>
      <motion.div style={{
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: exitOpacity, willChange: 'opacity',
      }}>
        <motion.div aria-hidden style={{
          position: 'absolute', inset: '-160px 0',
          backgroundImage: 'radial-gradient(circle, rgba(245,240,232,0.18) 1.5px, transparent 1.5px)',
          backgroundSize: '30px 30px',
          opacity: dotsOpacity, y: dotsY, willChange: 'transform, opacity',
        }}/>
        <motion.div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', opacity: statOpacity, y: statY, willChange: 'transform, opacity' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 'clamp(110px,17vw,250px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>{count}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 'clamp(50px,7vw,110px)', fontWeight: 700, color: 'rgba(245,240,232,0.4)', lineHeight: 1 }}>%</span>
          </div>
          <motion.p className="cg" style={{ fontSize: 20, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 520, margin: '24px auto 0', opacity: captionOpacity }}>
            of breaches involve <strong style={{ color: '#F5F0E8' }}>stolen credentials or identity abuse.</strong> The perimeter is whoever you trust.
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default function Mission() {
  const heroRef = useRef(null);
  const { scrollYProgress: heroRaw } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  /* Damped camera — same spring as the landing scenes */
  const scrollYProgress = useSpring(heroRaw, { stiffness: 170, damping: 30, mass: 0.3, restDelta: 0.0001 });
  const heroY       = useTransform(scrollYProgress, [0, 1], ['0%', '28%']);
  const heroScale   = useTransform(scrollYProgress, [0, 1], [1.06, 1.0]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const overlayY    = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

  /* Hero dolly (Scene 1 pattern, ported from Landing) — the headline scales
     up and blurs away as the camera "passes through" it on scroll. */
  const heroContentScale = useTransform(scrollYProgress, [0, 0.6], [1, 1.6]);
  const heroBlurPx       = useTransform(scrollYProgress, [0, 0.5], [0, 14], { clamp: true });
  const heroBlur         = useTransform(heroBlurPx, v => `blur(${v}px)`);

  const V1 = [
    { text: 'ITDR — Identity Threat Detection (4 detectors)',          why: 'Credential stuffing, impossible travel, privilege escalation, token theft — all built in.' },
    { text: 'Identity Risk Engine with pluggable detectors',           why: 'Each detector contributes to a unified risk score. Swap or add detectors without touching the core.' },
    { text: 'Case Management — 15-tab investigation lifecycle',        why: 'From detection to report, the full SOC workflow is in one place.' },
    { text: 'Identity Graph + Trust Timeline',                         why: 'See exactly how an identity moved through your environment over time.' },
    { text: 'Explainable AI with full reasoning chain',                why: 'Every AI verdict includes the evidence it used. No black-box verdicts.' },
    { text: '7-Source IOC Intelligence Engine',                        why: 'VirusTotal, GreyNoise, threat feeds — all merged into one IOC verdict.' },
    { text: 'Email Forensics Engine',                                  why: 'Header analysis, link extraction, attachment hashing. Phishing triage in under 60 seconds.' },
    { text: 'Endpoint Agent v5 (Windows / Linux / macOS)',             why: 'One command deploys. Ships telemetry every 3 seconds. No config files.' },
    { text: 'Threat Hunting + Campaign Detection',                     why: 'Cross-case IOC correlation surfaces campaigns you would otherwise miss.' },
    { text: 'DORA Article 19 Compliance Reports',                      why: 'Generated from investigation data automatically. No manual assembly.' },
    { text: 'NVIDIA NIM: Hermes-3 Agentic Triage (Phase 6)',          why: 'Function-calling loop with 5 tools — IOC enrichment, case correlation, endpoint data, threat intel. Replaces single-shot prompting with autonomous multi-step reasoning.' },
    { text: 'NVIDIA NIM: Semantic Search + NV-RerankQA (Phase 7)',     why: 'NV-EmbedQA-E5-v5 embeddings with NV-RerankQA-Mistral-4B reranker. Similar case retrieval with precision you cannot get from keyword search.' },
    { text: 'NVIDIA NIM: Vision Analysis — Llama 3.2 Vision (Phase 8)', why: 'Drop a screenshot; get a verdict. Detects phishing pages, malware artifacts, and IOCs embedded in images. Findings append to case automatically.' },
    { text: 'NVIDIA NIM: Detection Rule Generator — Codestral 22B (Phase 9)', why: 'Generates deployable YARA, Sigma, KQL, and Splunk SPL from case IOCs and MITRE techniques. No manual rule authoring.' },
    { text: 'Temporal Linker — Attack Graph Reconstruction (v10.0)',         why: 'Correlates alerts, endpoint logs, and defense events within seconds of each other across a case, then asks Nemotron-70B to reconstruct the full attack chain as a narrative with MITRE technique mapping.' },
    { text: 'SOAR Playbook Engine (v10.0)',                                  why: 'If-this-then-that automation rules trigger on ITDR alerts, Shadow AI detections, or blocked MCP tool calls — auto-creating cases, enriching IOCs, and queuing high-impact actions like endpoint isolation for one-click approval.' },
    { text: 'Shadow AI Detection Dashboard (v4.3)',                          why: 'Cross-references endpoint and network telemetry against 14+ known AI API domains and an approved-services allowlist. 3+ hits in 24h auto-escalates into ITDR.' },
    { text: 'AI Defense Console (v5.3)',                                     why: 'Live attack feed with human-in-the-loop block / isolate / escalate / dismiss — every automated containment suggestion needs a one-click analyst decision before it runs.' },
    { text: 'Control Plane — live SOC command view',                        why: '5 KPI cards, high-risk identity panel, AI action queue, ITDR threat feed, and endpoint heartbeats, auto-refreshing every 30 seconds.' },
    { text: 'NHI Lifecycle Health Dashboard',                                why: 'Service accounts, API keys, and tokens get sprawl scores and trust-decay tracking — the identities most tools never look at.' },
    { text: 'Connector Hub — identity providers + approved AI services',    why: 'One place to register identity provider connections and the AI services your org has actually approved, feeding the Shadow AI allowlist.' },
  ];

  const V2 = [
    { text: 'Adaptive Thresholds Agent',                               why: 'Nemotron reviews detector false-positive/false-negative rates on a 4-hour cycle and adjusts thresholds within safe bounds — without touching permissions or data.', active: true },
    { text: 'Auto-Rule Generation Trigger',                            why: 'When the same MITRE technique appears in 3+ cases within 7 days, Codestral 22B auto-generates YARA/Sigma/KQL/Splunk rules into a pending-review queue — the detection library grows without analyst effort.' },
    { text: 'Non-human Identity (NHI) vault + credential rotation',    why: 'The lifecycle health dashboard already scores sprawl and trust decay — next is a vault that actually rotates and revokes the credentials it flags.' },
    { text: 'Quantum-Resistant Key Monitoring',                        why: 'Flags RSA/EC keys in environments migrating toward post-quantum cryptography.' },
    { text: 'Agent Supervision Layer for AI workflows',                why: 'Governs what actions AI agents can take. Logs everything. Flags deviations.' },
  ];

  const V3 = [
    { text: 'Attacker Path Emulation (red-team simulation)',           why: 'Simulate attack paths from a given identity to critical assets before real attackers find them.' },
    { text: 'Multi-tenant Architecture for enterprise deployments',    why: 'Run one AegisTrace instance across multiple client environments or business units.' },
    { text: 'Federated Identity Graph across organisations',           why: 'Detect lateral movement that crosses organisational boundaries via shared identities or vendors.' },
    { text: 'Adversarial AI detection engine',                         why: 'Detect prompt injection, model exfiltration, and AI supply chain attacks.' },
    { text: 'Regulatory Mapping: NIS2, GDPR, DORA v2',                why: 'Map every incident to its regulatory obligation automatically. Export-ready for auditors.' },
  ];

  const PRINCIPLES = [
    { icon: Eye,        title: 'Full provenance',     body: 'Every alert, every verdict, every AI recommendation carries a full chain of custody — not a black-box score.' },
    { icon: Fingerprint,title: 'Identity-first',      body: 'In 80% of breaches, identity is the attack path. AegisTrace treats identity as the primary telemetry source, not an afterthought.' },
    { icon: Brain,      title: 'Explainable AI',      body: 'AI that cannot show its reasoning cannot be trusted in a legal or regulatory context. Every inference is grounded in evidence the analyst can verify.' },
    { icon: Layers,     title: 'Unified timeline',    body: 'Identity events, endpoint telemetry, email forensics, and threat intelligence all share one timeline — no pivot tables, no tab switching.' },
    { icon: ShieldCheck,title: 'Built-in compliance', body: 'DORA Article 19 reports are generated automatically from investigation data — not filled in manually after the fact.' },
    { icon: Zap,        title: 'Speed of response',   body: 'Mean time to respond is the metric that matters. AegisTrace is designed to cut that number, not add to the analyst\'s queue.' },
  ];

  return (
    <div style={{ background: BG, color: '#F5F0E8', overflowX: 'hidden', position: 'relative', isolation: 'isolate' }}>
      <AmbientEmbers/>
      <ScrollProgress/>
      <style>{`
        .cd { font-family: 'Clash Display', sans-serif; }
        .cg { font-family: 'Cabinet Grotesk', sans-serif; }

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
          padding: 12px 24px; border: 1px solid rgba(245,240,232,0.18);
          cursor: pointer; text-decoration: none; letter-spacing: 0.03em;
          transition: border-color 140ms, color 140ms, transform 90ms;
        }
        .ghost-btn:hover  { border-color: rgba(245,240,232,0.42); color: #F5F0E8; }
        .ghost-btn:active { transform: scale(0.97); }

        .nav-link {
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(245,240,232,0.6); text-decoration: none;
          transition: color 140ms;
        }
        .nav-link:hover { color: #F5F0E8; }

        ::selection { background: rgba(245,158,11,0.35); color: #F5F0E8; }

        .nav-link { position: relative; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -4px;
          height: 1px; background: #F59E0B;
          transition: right 260ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover::after { right: 0; }

        .gold-btn:hover  { transform: translateY(-2px); }
        .ghost-btn:hover { transform: translateY(-2px); }
        .gold-btn:active, .ghost-btn:active { transform: translateY(0) scale(0.97); }

        @keyframes kenburns-m { from { transform: scale(1.08); } to { transform: scale(1.0); } }

        @keyframes ripple-ring {
          from { transform: translate(-50%,-50%) scale(.04); opacity: .65; }
          to   { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
        }

        @keyframes data-flow {
          0%   { opacity: 0; transform: translateY(-20px); }
          20%  { opacity: 0.6; }
          80%  { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(20px); }
        }

        @keyframes pulse-dot {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50%     { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,48px)', height: 64,
        background: 'rgba(5,4,5,0.0)',
      }}>
        <Link to="/" className="cd" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.1em' }}>
          AEGISTRACE
        </Link>
        <div style={{ display: 'flex', gap: 'clamp(20px,3vw,36px)', alignItems: 'center' }}>
          <Link to="/portfolio" className="nav-link">Portfolio</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>
            Platform <ArrowRight size={13}/>
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden' }}>
        {/* Background — layer 1 (deepest, moves slowest) */}
        <motion.div
          aria-hidden
          style={{
            position: 'absolute', inset: '-20%',
            backgroundImage: `url('/assets/pages/mission-bg.jpg')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            y: heroY,
            scale: heroScale,
          }}
        />

        {/* Atmospheric gradient layer — layer 2 */}
        <motion.div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.03) 50%, transparent 100%)',
            y: overlayY,
          }}
        />

        {/* Dark overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,4,5,0.22) 0%, rgba(5,4,5,0.05) 35%, rgba(5,4,5,0.94) 100%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(5,4,5,0.72) 0%, rgba(5,4,5,0.25) 55%, transparent 100%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 8% 92%, rgba(245,158,11,0.14) 0%, transparent 65%)' }}/>

        <motion.div style={{ opacity: heroOpacity, scale: heroContentScale, filter: heroBlur, willChange: 'transform, opacity, filter' }}>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end', zIndex: 10,
            padding: '0 clamp(24px,5vw,72px) clamp(56px,8vh,96px)',
          }}>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: E }}
              className="cg"
              style={{ fontSize: 11, color: GOLD, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 22, fontWeight: 600 }}
            >
              Our Mission
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 52 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.95, delay: 0.38, ease: E }}
              className="cd"
              style={{ fontSize: 'clamp(44px,7vw,88px)', fontWeight: 700, lineHeight: 0.93, letterSpacing: '-0.03em', color: '#F5F0E8', margin: '0 0 28px', maxWidth: 760, textWrap: 'balance' }}
            >
              Attackers no longer<br/>
              break in —<br/>
              <span style={{ color: GOLD, textShadow: '0 0 40px rgba(245,158,11,0.28)' }}>they sign in.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.58, ease: E }}
              className="cg"
              style={{ fontSize: 'clamp(14px,1.6vw,17px)', color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, maxWidth: 480 }}
            >
              AegisTrace was built because the identity threat surface changed faster than the tools designed to monitor it — and because working inside a SOC made the gaps impossible to ignore.
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* ── ORIGIN STORY ─────────────────────────────────────────────────── */}
      <Stat83Scene/>

      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', background: '#060507' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }}>
            <Reveal>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 8, display: 'block' }}>Why it exists</span>
            </Reveal>
            <div>
              <Reveal>
                <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 28px', letterSpacing: '-0.03em', lineHeight: 1.0, textWrap: 'balance' }}>
                  Built from the inside out.
                </h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="cg" style={{ fontSize: 'clamp(15px,1.4vw,17px)', color: 'rgba(245,240,232,0.58)', lineHeight: 1.76, marginBottom: 24, maxWidth: 620 }}>
                  Working as a security analyst with Microsoft Sentinel and real incident pipelines, the same pattern kept appearing: the tools existed, but they didn't talk to each other. SIEM gave you alerts. A separate tool gave you endpoint data. A third gave you identity events. Connecting them meant pivot tables, copy-paste, and waiting for escalations that never came with full context.
                </p>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="cg" style={{ fontSize: 'clamp(15px,1.4vw,17px)', color: 'rgba(245,240,232,0.58)', lineHeight: 1.76, marginBottom: 32, maxWidth: 620 }}>
                  AegisTrace is the tool that should have existed. Not a commercial platform with a 6-month procurement cycle. A focused, deployable SOC in one place — built by someone who uses this kind of tooling every day and knows exactly where it fails.
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {[
                    { label: 'SC-200', sub: 'Microsoft Security Analyst' },
                    { label: 'Security+', sub: 'CompTIA' },
                    { label: 'MSc Computing', sub: 'Dublin Business School' },
                    { label: 'Practical ETH', sub: 'TCM Security' },
                  ].map(({ label, sub }) => (
                    <div key={label} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)', padding: '10px 16px' }}>
                      <div className="cd" style={{ fontSize: 13, fontWeight: 600, color: '#F5F0E8', marginBottom: 3 }}>{label}</div>
                      <div className="cg" style={{ fontSize: 11, color: 'rgba(245,240,232,0.34)' }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 64 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 8 }}>The Problem</span>
              <div>
                <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 20px', letterSpacing: '-0.03em', lineHeight: 1.0, textWrap: 'balance' }}>
                  Modern attacks are an identity problem first.
                </h2>
                <p className="cg" style={{ fontSize: 'clamp(15px,1.6vw,18px)', color: 'rgba(245,240,232,0.58)', lineHeight: 1.72, margin: 0, maxWidth: 600 }}>
                  Perimeter security assumes attackers need to break through a wall. They don't. Compromised credentials, stolen tokens, and misconfigured service accounts hand them the keys. Most SIEM tools were not built for this shift — they were built to aggregate logs, not to reason about identity.
                </p>
              </div>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
              {[
                { n: '01', title: 'Credential theft is the leading initial access vector', body: 'Over 80% of breaches involve stolen or misused credentials. Traditional IDS tools are blind to normal-looking logins from stolen identities.' },
                { n: '02', title: 'Alert fatigue hides real threats in noise', body: 'SOC analysts spend more time dismissing false positives than investigating real incidents. Signal is buried in volume, and the same alert fires five times before anyone acts.' },
                { n: '03', title: 'AI agent sprawl creates invisible attack surfaces', body: 'Every unregistered AI agent is an identity without oversight. Shadow AI runs with service-account privileges nobody audited and nobody is monitoring.' },
                { n: '04', title: 'Compliance reporting is still manual', body: 'DORA, NIS2, and GDPR reporting is assembled manually from scattered logs long after incidents close. Deadlines are missed and coverage is always partial.' },
              ].map(({ n, title, body }, i) => (
                <Reveal key={n} delay={i * 0.07} y={24}>
                  <div style={{ background: 'rgba(245,240,232,0.025)', border: '1px solid rgba(245,240,232,0.07)', padding: '28px 24px', height: '100%' }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: GOLD, letterSpacing: '0.12em', marginBottom: 16 }}>{n}</div>
                    <div className="cd" style={{ fontSize: 15, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{title}</div>
                    <div className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.44)', lineHeight: 1.68 }}>{body}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT'S DIFFERENT ───────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', background: '#060507', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>What makes it different</span>
              <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.03em', textWrap: 'balance' }}>
                Not another SIEM dashboard.
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
              {[
                { title: 'No sales process',         body: 'One command deploys. No trial requests, no procurement, no vendor call. Access it now.' },
                { title: 'Full case lifecycle',       body: 'Detection, investigation, evidence, IOC analysis, report — one platform, not five tools stitched together with scripts.' },
                { title: 'Every AI verdict is open', body: 'The AI shows the evidence it used and the reasoning it followed. You can challenge it. It cannot surprise you in a post-incident review.' },
                { title: 'Compliance built in',      body: 'DORA Article 19 reports generate from investigation data automatically. Not a separate template you fill in after the fact.' },
                { title: 'Identity, not just logs',  body: 'AegisTrace reasons about identities across events — not individual log lines. The graph shows you how an identity moved, not just what happened.' },
                { title: 'One analyst can run it',   body: 'Designed for small, capable teams. One person can deploy the agent, investigate an incident, and close a DORA report the same day.' },
              ].map(({ title, body }, i) => (
                <Reveal key={title} delay={i * 0.06} y={24}>
                  <div style={{ background: 'rgba(245,240,232,0.025)', border: '1px solid rgba(245,240,232,0.07)', padding: '26px 24px', height: '100%' }}>
                    <div className="cd" style={{ fontSize: 15, fontWeight: 600, color: GOLD, marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</div>
                    <div className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.46)', lineHeight: 1.68 }}>{body}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO IS IT FOR ────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }}>
            <Reveal>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 8, display: 'block' }}>Who it's for</span>
            </Reveal>
            <div>
              <Reveal>
                <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 40px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
                  The analyst who builds<br/>as well as defends.
                </h2>
              </Reveal>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
                {[
                  { icon: Shield, title: 'SOC analysts', body: 'Working in an environment where multiple tools need to be correlated manually. AegisTrace replaces the pivot — everything shares one timeline.' },
                  { icon: User,   title: 'Security engineers', body: "Building detection capabilities on top of a stack that wasn't designed for identity threats. AegisTrace gives you a working base to extend." },
                  { icon: Brain,  title: 'Students and researchers', body: 'Learning incident response with access to a realistic, deployable platform — not a sandboxed demo with no real telemetry.' },
                ].map(({ icon: Icon, title, body }, i) => (
                  <Reveal key={title} delay={i * 0.08} y={24}>
                    <div style={{ background: 'rgba(245,240,232,0.02)', border: '1px solid rgba(245,240,232,0.07)', padding: '28px 24px', height: '100%' }}>
                      <Icon size={18} color={GOLD} style={{ marginBottom: 16, opacity: 0.8 }}/>
                      <div className="cd" style={{ fontSize: 15, fontWeight: 600, color: '#F5F0E8', marginBottom: 10 }}>{title}</div>
                      <div className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.44)', lineHeight: 1.68 }}>{body}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRINCIPLES ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', background: '#060507', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>How we build</span>
              <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.03em', textWrap: 'balance' }}>
                Six principles behind every decision.
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
              {PRINCIPLES.map(({ icon, title, body }, i) => (
                <PrincipleCard key={title} icon={icon} title={title} body={body} delay={i * 0.06}/>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ──────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Roadmap</span>
              <div>
                <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 12px', letterSpacing: '-0.03em' }}>
                  Where we are.
                </h2>
                <p className="cg" style={{ fontSize: 14, color: 'rgba(245,240,232,0.36)', margin: 0 }}>
                  Each item includes the reason it was built — because a roadmap without context is just a list.
                </p>
              </div>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(40px,5vw,64px)' }}>
              {/* v1 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
                  <div style={{ width: 28, height: 28, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(245,158,11,0.15)' }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: GOLD, fontWeight: 700 }}>v1</span>
                  </div>
                  <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: '#F5F0E8', letterSpacing: '-0.01em' }}>Foundation — Shipped</span>
                </div>
                {V1.map((item, i) => <RoadItem key={item.text} text={item.text} why={item.why} done delay={i * 0.04}/>)}
              </div>
              {/* v2 + v3 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
                    <div style={{ width: 28, height: 28, background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-dot 2.5s ease-in-out infinite' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(245,240,232,0.5)', fontWeight: 700 }}>v2</span>
                    </div>
                    <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: '#F5F0E8', letterSpacing: '-0.01em' }}>Scale — In Progress</span>
                  </div>
                  {V2.map((item, i) => <RoadItem key={item.text} text={item.text} why={item.why} active={item.active} delay={i * 0.04}/>)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
                    <div style={{ width: 28, height: 28, background: 'rgba(245,240,232,0.02)', border: '1px solid rgba(245,240,232,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(245,240,232,0.28)', fontWeight: 700 }}>v3</span>
                    </div>
                    <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(245,240,232,0.4)', letterSpacing: '-0.01em' }}>Enterprise — Planned</span>
                  </div>
                  {V3.map((item, i) => <RoadItem key={item.text} text={item.text} why={item.why} delay={i * 0.04}/>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(96px,12vw,160px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        {/* Ripple rings */}
        {[0, 1, 2].map(i => (
          <div key={i} aria-hidden style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 500, height: 500, border: '1px solid rgba(245,158,11,0.06)',
            borderRadius: '50%', pointerEvents: 'none',
            animation: `ripple-ring ${4.5 + i * 1.8}s cubic-bezier(0,0,.8,1) ${i * 1.5}s infinite`,
          }}/>
        ))}
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <Reveal>
            <h2 className="cd" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.03em', lineHeight: 0.94, marginBottom: 22, textWrap: 'balance' }}>
              Built by a practitioner,<br/>for practitioners.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.46)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 44px' }}>
              AegisTrace is not a commercial product. It is a proof of concept and a statement about what security tooling should be — accessible, auditable, and built by someone who works in this field.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/app/login" className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>
                Access Platform <ArrowRight size={16}/>
              </Link>
              <Link to="/portfolio" className="ghost-btn" style={{ fontSize: 14, padding: '14px 26px' }}>
                About the Builder
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '32px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span className="cd" style={{ color: 'rgba(245,240,232,0.22)', fontSize: 13, letterSpacing: '0.08em' }}>AEGISTRACE</span>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <Link to="/"          className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Home</Link>
            <Link to="/portfolio" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Portfolio</Link>
            <Link to="/app/login" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Platform</Link>
          </div>
          <span className="cg" style={{ color: 'rgba(245,240,232,0.16)', fontSize: 11 }}>© 2026 Prasanna Kumar</span>
        </div>
      </footer>
    </div>
  );
}
