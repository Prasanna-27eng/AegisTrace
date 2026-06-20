import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  motion, useScroll, useSpring, useTransform,
  useInView, useReducedMotion, useMotionValueEvent,
} from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSceneCamera, PinnedScene, ScrollProgressBar } from '../components/SceneController';

const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050405';
const INK  = '#F5F0E8';

/* ─── mobile hook ───────────────────────────────────────────────────────── */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return m;
}

/* ─── ambient embers (unchanged) ────────────────────────────────────────── */
function AmbientEmbers() {
  const canvasRef = useRef(null);
  const reduced   = useReducedMotion();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 1, raf = 0, t = 0;
    const embers = Array.from({ length: 52 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.5 + Math.random() * 1.8,
      v: 0.06 + Math.random() * 0.2,
      ph: Math.random() * 6.28,
      gold: Math.random() < 0.38,
    }));
    const size = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = still => {
      ctx.clearRect(0, 0, w, h);
      embers.forEach(e => {
        if (!still) { e.y -= e.v / h; if (e.y < -0.01) { e.y = 1.01; e.x = Math.random(); } }
        const x = e.x * w + Math.sin(t * 0.5 + e.ph) * 16;
        const a = still ? 0.2 : 0.08 + 0.15 * (0.5 + 0.5 * Math.sin(t * 1.1 + e.ph));
        ctx.fillStyle = e.gold ? `rgba(245,158,11,${a * 1.3})` : `rgba(245,240,232,${a})`;
        ctx.beginPath(); ctx.arc(x, e.y * h, e.r, 0, Math.PI * 2); ctx.fill();
      });
    };
    size(); window.addEventListener('resize', size);
    if (reduced) { draw(true); } else {
      const loop = () => { t += 0.016; draw(false); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, [reduced]);
  return <canvas ref={canvasRef} aria-hidden style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}/>;
}

/* ─── 3D tilt card hook ─────────────────────────────────────────────────── */
function use3DTilt(strength = 12) {
  const ref      = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    setTilt({ rx: -ny * strength, ry: nx * strength, gx: (nx + 0.5) * 100, gy: (ny + 0.5) * 100 });
  }, [strength]);
  const onLeave = useCallback(() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 }), []);
  return { ref, tilt, onMove, onLeave };
}

/* ─── Split reveal — chars fly in ──────────────────────────────────────── */
function SplitReveal({ text, style = {}, charStyle = {}, stagger = 0.04, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <span ref={ref} style={{ display: 'inline-block', ...style }}>
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 48, rotateX: -40 }}
          animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={{ duration: 0.72, delay: delay + i * stagger, ease: E }}
          style={{ display: 'inline-block', transformOrigin: 'bottom', ...charStyle }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Scroll Reveal (simple) ────────────────────────────────────────────── */
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

/* ─── Animated counter ──────────────────────────────────────────────────── */
function Counter({ end, suffix = '' }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    const dur = 1800, start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / dur, 1);
      setVal(Math.round((1 - Math.pow(1 - t, 4)) * end));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ════════════════════════════════════════════════════════════════════════
   HERO — 3-beat dolly
   Beat 1: Name zooms toward camera + blurs out
   Beat 2: "One analyst. An entire SOC." zooms in from depth
   Beat 3: Floating credential badges materialise
════════════════════════════════════════════════════════════════════════ */
function HeroScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);

  const bgScale = useTransform(p, [0, 1], [1.14, 1.0]);
  const bgY     = useTransform(p, v => v * 70);

  /* beat 1 */
  const b1Op    = useTransform(p, [0.22, 0.44], [1, 0], { clamp: true });
  const b1Scale = useTransform(p, [0, 1], [1, 3.2]);
  const b1BPx   = useTransform(p, [0.20, 0.44], [0, 18], { clamp: true });
  const b1Filt  = useTransform(b1BPx, v => `blur(${v}px)`);

  /* beat 2 */
  const b2Op    = useTransform(p, [0.40, 0.60], [0, 1], { clamp: true });
  const b2Scale = useTransform(p, [0.38, 0.66, 1], [0.45, 1, 1.08], { clamp: true });
  const b2BPx   = useTransform(p, [0.42, 0.62], [14, 0], { clamp: true });
  const b2Filt  = useTransform(b2BPx, v => `blur(${v}px)`);
  const b2Out   = useTransform(p, [0.82, 0.95], [1, 0], { clamp: true });
  const b2CombOp = useTransform(p, v => {
    const fadeIn  = Math.min(1, Math.max(0, (v - 0.40) / 0.20));
    const fadeOut = Math.min(1, Math.max(0, 1 - (v - 0.82) / 0.13));
    return fadeIn * fadeOut;
  });

  /* beat 3 — badge cloud */
  const b3Op    = useTransform(p, [0.80, 0.92], [0, 1], { clamp: true });

  /* kicker */
  const kickOp  = useTransform(p, [0.64, 0.78], [0, 1], { clamp: true });
  const kickY   = useTransform(kickOp, o => (1 - o) * 24);

  const BADGES = [
    { label: 'SC-200', sub: 'Microsoft', x: '-38vw', y: '-12vh', delay: 0 },
    { label: 'Security+', sub: 'CompTIA', x: '34vw', y: '-18vh', delay: 0.08 },
    { label: 'Blue Team', sub: 'SOC Analyst', x: '-30vw', y: '20vh', delay: 0.14 },
    { label: 'TCM PEH', sub: 'Red Team', x: '28vw', y: '22vh', delay: 0.06 },
    { label: 'MSc Computing', sub: 'DBS Dublin', x: '0vw', y: '-28vh', delay: 0.10 },
  ];

  return (
    <PinnedScene vh="340vh" sceneRef={ref}>
      {/* Background */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-10%',
        backgroundImage: "url('/assets/pages/login-bg.jpg')",
        backgroundSize: 'cover', backgroundPosition: 'center 25%',
        scale: bgScale, y: bgY, willChange: 'transform',
      }}/>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,4,5,0.8) 0%, rgba(5,4,5,0.32) 38%, rgba(5,4,5,0.96) 100%)' }}/>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 115%, rgba(245,158,11,0.14) 0%, transparent 52%)' }}/>

      {/* Beat 1 */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: b1Op, scale: b1Scale, filter: b1Filt, willChange: 'transform, opacity, filter',
        textAlign: 'center', padding: '0 clamp(20px,5vw,60px)',
      }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.28em', color: GOLD, marginBottom: 22 }}>
          BLUE TEAM · DUBLIN, IRELAND
        </div>
        <h1 className="cd" style={{
          fontSize: 'clamp(44px,7.5vw,116px)', fontWeight: 600, lineHeight: 1,
          letterSpacing: '-0.02em', color: INK, margin: 0,
        }}>
          Prasanna Kumar<br/>Surendran
        </h1>
      </motion.div>

      {/* Beat 2 */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        opacity: b2CombOp,
        scale: b2Scale, filter: b2Filt, willChange: 'transform, opacity, filter',
        padding: '0 clamp(20px,5vw,60px)',
      }}>
        <h1 className="cd" style={{
          fontSize: 'clamp(44px,7.5vw,116px)', fontWeight: 600, lineHeight: 1,
          letterSpacing: '-0.02em', color: INK, margin: 0,
        }}>
          One analyst.<br/><span style={{ color: GOLD }}>An entire SOC.</span>
        </h1>
      </motion.div>

      {/* Beat 3 — floating badges */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: b3Op, willChange: 'opacity',
      }}>
        {/* Centre label */}
        <div style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.26em', color: GOLD, marginBottom: 10 }}>CREDENTIALS</div>
          <div className="cd" style={{ fontSize: 'clamp(22px,3vw,38px)', fontWeight: 600, color: INK }}>
            Earned in the field.
          </div>
        </div>
        {/* Orbiting badges */}
        {BADGES.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: b.delay, ease: E }}
            style={{
              position: 'absolute',
              left: `calc(50% + ${b.x})`, top: `calc(50% + ${b.y})`,
              transform: 'translate(-50%, -50%)',
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.22)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: '10px 18px',
            }}
          >
            <div className="cd" style={{ fontSize: 13, fontWeight: 600, color: INK }}>{b.label}</div>
            <div className="cg" style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', marginTop: 2 }}>{b.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Kicker */}
      <motion.div style={{
        position: 'absolute', left: 0, right: 0, bottom: '8vh', zIndex: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        opacity: kickOp, y: kickY,
      }}>
        <p className="cg" style={{ fontSize: 17, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 480, textAlign: 'center', margin: 0 }}>
          SOC analyst who builds the tools he wishes existed — a Trust Operating System and four published security tools, solo.
        </p>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(245,240,232,0.35)' }}>SCROLL</span>
      </motion.div>
    </PinnedScene>
  );
}

function MobileHero() {
  return (
    <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', inset: '-6%', backgroundImage: "url('/assets/pages/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 25%', opacity: 0.5 }}/>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,4,5,0.7) 0%, rgba(5,4,5,0.35) 40%, rgba(5,4,5,0.96) 100%)' }}/>
      <Reveal style={{ position: 'relative', zIndex: 2, padding: '0 24px 64px' }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.26em', color: GOLD, marginBottom: 18 }}>BLUE TEAM · DUBLIN, IRELAND</div>
        <h1 className="cd" style={{ fontSize: 'clamp(38px,11vw,60px)', fontWeight: 600, lineHeight: 1.02, letterSpacing: '-0.02em', color: INK, margin: '0 0 16px' }}>
          Prasanna Kumar Surendran
        </h1>
        <p className="cg" style={{ fontSize: 16, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 420, margin: 0 }}>
          One analyst. An entire SOC — a Trust Operating System and four published security tools, built solo.
        </p>
      </Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STATS — each stat is a camera beat: zoom in → hold → push through
════════════════════════════════════════════════════════════════════════ */
const STATS_DATA = [
  { end: 1,  suffix: '',  label: 'full security platform, solo-built' },
  { end: 30, suffix: '+', label: 'console pages shipped' },
  { end: 35, suffix: '',  label: 'backend API routers' },
  { end: 4,  suffix: '',  label: 'security tools on PyPI' },
  { end: 18, suffix: '',  label: 'hardware attack parsers' },
];

/* Ranges: [fadeIn0, fadeIn1, hold, fadeOut0, fadeOut1]
   Last stat stays fully visible (fadeOut0 = fadeOut1 = 1) */
const STAT_RANGES = [
  [0.03, 0.14, 0.18, 0.22, 0.30],
  [0.26, 0.37, 0.41, 0.44, 0.52],
  [0.48, 0.58, 0.62, 0.65, 0.72],
  [0.68, 0.78, 0.81, 0.84, 0.90],
  [0.87, 0.95, 1.00, 1.00, 1.00],
];

function StatBeat({ p, stat, range }) {
  const [i0, i1, , o0, o1] = range;
  const opacity = useTransform(p, [i0, i1, o0, o1], [0, 1, 1, 0], { clamp: true });
  const scale   = useTransform(p, [i0, i1, o0, o1], [0.52, 1, 1, 1.7], { clamp: true });
  const blurPx  = useTransform(p, [o0, o1], [0, 16], { clamp: true });
  const filter  = useTransform(blurPx, v => `blur(${v}px)`);
  const lineW   = useTransform(opacity, v => `${v * 100}%`);

  return (
    <motion.div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity, scale, filter, willChange: 'transform, opacity, filter',
      pointerEvents: 'none',
    }}>
      {/* Underline progress bar */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <div className="mono" style={{ fontSize: 'clamp(72px,14vw,190px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>
          {stat.end}{stat.suffix}
        </div>
        <motion.div aria-hidden style={{
          position: 'absolute', bottom: -8, left: 0, height: 2,
          background: GOLD, opacity: 0.5,
          width: lineW,
        }}/>
      </div>
      <div className="cg" style={{ fontSize: 'clamp(14px,1.6vw,20px)', color: 'rgba(245,240,232,0.6)', marginTop: 16, letterSpacing: '0.01em' }}>
        {stat.label}
      </div>
    </motion.div>
  );
}

function StatsScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);

  /* Background dot grid that zooms with the stat */
  const gridScale = useTransform(p, [0, 1], [1, 1.4]);
  const gridOp    = useTransform(p, [0, 0.05, 0.92, 1], [0, 0.18, 0.18, 0]);

  return (
    <PinnedScene vh="320vh" sceneRef={ref}>
      {/* Radial dot grid */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-80px',
        backgroundImage: 'radial-gradient(circle, rgba(245,240,232,0.14) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        opacity: gridOp, scale: gridScale, willChange: 'transform, opacity',
      }}/>
      {/* Gold glow */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(245,158,11,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
      {/* Beats */}
      {STATS_DATA.map((stat, i) => (
        <StatBeat key={i} p={p} stat={stat} range={STAT_RANGES[i]} />
      ))}
      {/* Section label */}
      <motion.div style={{
        position: 'absolute', top: '6vh', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: useTransform(p, [0, 0.04, 0.94, 1], [0, 1, 1, 0]),
      }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.26em', color: 'rgba(245,240,232,0.35)' }}>BY THE NUMBERS</span>
      </motion.div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   FLAGSHIP — unchanged content, new entrance
════════════════════════════════════════════════════════════════════════ */
const FLAGSHIP_POINTS = [
  'Identity-first detection — 6 real-time ITDR detectors',
  'Explainable AI triage on Groq + NVIDIA NIM',
  'Attack-graph kill-chain reconstruction (Temporal Linker)',
  'SOAR playbooks gated by human approval',
  'Production-grade endpoint agent — honey tokens to auto-block',
  'Deep multi-tenancy security audit shipped in v10.1',
];

/* ─── 3D tilt tool card ─────────────────────────────────────────────────── */
function ToolCard3D({ tool, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const [hov, setHov] = useState(false);

  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    setTilt({ rx: -ny * 10, ry: nx * 10, gx: (nx + 0.5) * 100, gy: (ny + 0.5) * 100 });
  }, []);
  const onLeave = useCallback(() => { setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 }); setHov(false); }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.72, delay, ease: E }}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={onLeave}
      style={{
        perspective: 800,
        height: '100%',
      }}
    >
      <div style={{
        padding: '32px 28px', height: '100%', position: 'relative', overflow: 'hidden',
        background: hov ? 'rgba(10,9,8,0.95)' : '#050405',
        border: `1px solid ${hov ? 'rgba(245,158,11,0.25)' : 'rgba(245,240,232,0.1)'}`,
        transform: `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: 'transform 180ms ease, background 200ms ease, border-color 200ms ease',
        willChange: 'transform',
        boxShadow: hov ? '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(245,158,11,0.06)' : 'none',
      }}>
        {/* Shine layer */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: hov
            ? `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(245,158,11,0.08) 0%, transparent 60%)`
            : 'none',
          transition: 'background 180ms ease',
        }}/>
        <div className="mono" style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)', marginBottom: 16, letterSpacing: '0.18em' }}>{tool.layer}</div>
        <div className="mono" style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, color: INK }}>{tool.name}</div>
        <p className="cg" style={{ fontSize: 14, lineHeight: 1.58, color: 'rgba(245,240,232,0.55)', margin: '0 0 18px' }}>{tool.desc}</p>
        <a className="mono" href={tool.href} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: GOLD, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {tool.cmd} <ArrowUpRight size={11}/>
        </a>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   TOOLS — horizontal dolly pan scene
   Camera pans right through 4 tool cards as you scroll down
════════════════════════════════════════════════════════════════════════ */
const TOOLS = [
  { layer: 'ATTACKS THE TOOLS', name: 'mcp-sploit', desc: 'Metasploit-style exploitation framework for MCP servers — enum, exfil, RCE, prompt-injection and policy-probe modules.', cmd: 'pip install mcp-sploit', href: 'https://pypi.org/project/mcp-sploit/' },
  { layer: 'ATTACKS THE BRAIN', name: 'prompt-fuzz', desc: 'Async fuzzer with 51 curated jailbreak payloads across 10 categories — reports exactly which ones bypass your guardrails.', cmd: 'pip install prompt-fuzz-cli', href: 'https://pypi.org/project/prompt-fuzz-cli/' },
  { layer: 'ATTACKS THE IDENTITY LAYER', name: 'nhi-hunter', desc: 'AWS IAM privilege-escalation pathfinder — builds the graph, finds the role chains that end at Admin.', cmd: 'pip install nhi-hunter', href: 'https://pypi.org/project/nhi-hunter/' },
  { layer: 'WATCHES THE DATA', name: 'shadow-sniffer', desc: 'Offline shadow-AI detector — scans connection logs against a 39-domain AI service catalog and your allowlist.', cmd: 'pip install shadow-sniffer', href: 'https://pypi.org/project/shadow-sniffer/' },
];

function HorizontalToolsScene() {
  const ref     = useRef(null);
  const p       = useSceneCamera(ref, { smooth: false });
  const x       = useTransform(p, [0.05, 0.95], ['0%', '-58%']);
  const labelOp = useTransform(p, [0, 0.06, 0.92, 1], [0, 1, 1, 0]);
  const progressW = useTransform(p, [0.05, 0.95], ['0%', '100%']);

  return (
    <PinnedScene vh="320vh" sceneRef={ref}>
      {/* Header */}
      <motion.div style={{
        position: 'absolute', top: '7vh', left: 'clamp(24px,5vw,72px)', right: 0, zIndex: 4,
        opacity: labelOp,
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.26em', color: 'rgba(245,240,232,0.35)', marginBottom: 6 }}>THE EXPANSION PACK</div>
        <div className="cd" style={{ fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 600, color: INK }}>
          Four tools. Four attack layers.
        </div>
        {/* Progress rail */}
        <div style={{ marginTop: 14, width: 160, height: 1, background: 'rgba(245,240,232,0.1)', position: 'relative' }}>
          <motion.div style={{ position: 'absolute', inset: 0, background: GOLD, width: progressW, transformOrigin: 'left' }}/>
        </div>
      </motion.div>

      {/* Card rail */}
      <motion.div style={{
        display: 'flex', gap: 2,
        x,
        willChange: 'transform',
        position: 'absolute',
        left: 'clamp(24px,5vw,72px)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 'max-content',
        paddingBottom: 4,
      }}>
        {TOOLS.map((tool, i) => (
          <div key={tool.name} style={{ width: 'clamp(280px,28vw,400px)', flexShrink: 0 }}>
            <ToolCard3D tool={tool} delay={0} />
          </div>
        ))}
        {/* Cap label */}
        <div style={{
          width: 'clamp(220px,22vw,320px)', flexShrink: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 32px',
        }}>
          <div className="mono" style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', lineHeight: 1.6 }}>
            + mcp-aegis — the defensive gateway the offensive tools are tested against. Purple team in a box.
          </div>
        </div>
      </motion.div>
    </PinnedScene>
  );
}

/* ─── Editorial row ─────────────────────────────────────────────────────── */
function EditorialRow({ label, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(160px,240px) 1fr',
      gap: 'clamp(24px,4vw,44px)',
      borderTop: '1px solid rgba(245,240,232,0.1)',
      padding: 'clamp(32px,5vw,48px) 0',
    }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)' }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

const CERTS_EARNED  = ['SC-200', 'Security+', 'TCM PEH'];
const CERTS_PENDING = ['BTL1 — in progress', 'eJPT — in progress', 'SC-300 — in progress'];

/* ════════════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════════════ */
export default function Portfolio() {
  const isMobile  = useIsMobile();
  const reduced   = useReducedMotion();
  const useFallback = isMobile || reduced;

  return (
    <div style={{ background: BG, color: INK, overflowX: 'clip', minHeight: '100vh', position: 'relative', isolation: 'isolate' }}>
      <AmbientEmbers/>
      <ScrollProgressBar/>
      <style>{`
        .cd   { font-family: 'Clash Display', sans-serif; }
        .cg   { font-family: 'Cabinet Grotesk', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .gold-btn {
          display: inline-flex; align-items: center; gap: 9px;
          background: ${GOLD}; color: #000; font-weight: 700;
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px;
          padding: 13px 26px; border: none; cursor: pointer;
          text-decoration: none; letter-spacing: 0.03em;
          transition: background 140ms cubic-bezier(0.16,1,0.3,1), transform 90ms, box-shadow 140ms;
        }
        .gold-btn:hover  { background: #FBBF24; box-shadow: 0 0 24px rgba(245,158,11,0.35); transform: translateY(-2px); }
        .gold-btn:active { transform: scale(0.97); }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(245,240,232,0.75);
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          padding: 12px 24px; border: 1px solid rgba(245,240,232,0.2);
          cursor: pointer; text-decoration: none; letter-spacing: 0.03em;
          transition: border-color 140ms, color 140ms, transform 90ms;
        }
        .ghost-btn:hover  { border-color: rgba(245,240,232,0.44); color: #F5F0E8; transform: translateY(-2px); }
        .ghost-btn:active { transform: scale(0.97); }

        .nav-link {
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(245,240,232,0.6); text-decoration: none; letter-spacing: 0.03em;
          transition: color 140ms; position: relative;
        }
        .nav-link:hover { color: #F5F0E8; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -4px;
          height: 1px; background: #F59E0B;
          transition: right 260ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover::after { right: 0; }

        .u-link {
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 15.5px; font-weight: 700;
          color: #F5F0E8; text-decoration: none;
          border-bottom: 1px solid rgba(245,158,11,0.5); padding-bottom: 4px;
          transition: color 140ms, border-color 140ms;
        }
        .u-link:hover { color: ${GOLD}; border-color: ${GOLD}; }

        ::selection { background: rgba(245,158,11,0.35); color: #F5F0E8; }

        @keyframes float-badge {
          0%,100% { transform: translate(-50%,-50%) translateY(0px); }
          50%      { transform: translate(-50%,-50%) translateY(-8px); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,56px)', height: 64,
        background: 'linear-gradient(180deg, rgba(5,4,5,0.88), rgba(5,4,5,0))',
        backdropFilter: 'blur(0px)',
      }}>
        <Link to="/" className="cd" style={{ color: INK, textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.1em' }}>AEGISTRACE</Link>
        <div style={{ display: 'flex', gap: 'clamp(16px,3vw,36px)', alignItems: 'center' }}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/mission" className="nav-link">Mission</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>Platform <ArrowRight size={13}/></Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      {useFallback ? <MobileHero/> : <HeroScene/>}

      {/* ── STATS SCENE ── */}
      {!useFallback && <StatsScene/>}

      {/* Mobile stats fallback */}
      {useFallback && (
        <section style={{ padding: '0 clamp(24px,5vw,72px)' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <Reveal>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))',
                borderTop: '1px solid rgba(245,240,232,0.1)', borderBottom: '1px solid rgba(245,240,232,0.1)',
              }}>
                {STATS_DATA.map(s => (
                  <div key={s.label} style={{ padding: '36px 24px 36px 0' }}>
                    <div className="mono" style={{ fontSize: 40, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
                      <Counter end={s.end} suffix={s.suffix}/>
                    </div>
                    <div className="cg" style={{ fontSize: 13.5, color: 'rgba(245,240,232,0.5)', marginTop: 8 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── FLAGSHIP ── */}
      <section style={{ padding: 'clamp(72px,10vw,110px) clamp(24px,5vw,72px) 0' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 56, alignItems: 'center' }}>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.24em', color: GOLD, marginBottom: 16 }}>FLAGSHIP — v10.1</div>
                <h2 className="cd" style={{ fontSize: 'clamp(34px,4vw,56px)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 16px' }}>AegisTrace</h2>
                <p className="cg" style={{ fontSize: 16.5, lineHeight: 1.65, color: 'rgba(245,240,232,0.6)', maxWidth: 480, margin: '0 0 18px' }}>
                  A free, open Trust Operating System: identity-first detection, explainable AI triage, kill-chain reconstruction, SOAR playbooks with human approval gates, and a production-grade endpoint agent — running entirely on free-tier infrastructure.
                </p>
                <p className="cg" style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(245,240,232,0.45)', maxWidth: 480, margin: '0 0 26px' }}>
                  React 18 · FastAPI · SQLite · Groq · NVIDIA NIM · Docker · Render
                </p>
                <div style={{ display: 'flex', gap: 24 }}>
                  <a className="u-link" href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer">Live <ArrowUpRight size={13} style={{ verticalAlign: -1 }}/></a>
                  <a className="u-link" href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noopener noreferrer">Source <ArrowUpRight size={13} style={{ verticalAlign: -1 }}/></a>
                </div>
              </div>
              <div style={{ background: '#0A0908', border: '1px solid rgba(245,240,232,0.1)', borderRadius: 14, padding: '30px 32px' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(245,240,232,0.45)', marginBottom: 18 }}>WHAT IT SHIPS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {FLAGSHIP_POINTS.map((pt, i) => (
                    <Reveal key={pt} delay={i * 0.06} y={12}>
                      <div className="cg" style={{ display: 'flex', gap: 10, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(245,240,232,0.65)' }}>
                        <span className="mono" style={{ color: GOLD, flexShrink: 0 }}>▸</span><span>{pt}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TOOLS — Horizontal dolly scene (desktop) or grid (mobile) ── */}
      {!useFallback ? (
        <HorizontalToolsScene/>
      ) : (
        <section style={{ padding: 'clamp(72px,10vw,110px) clamp(24px,5vw,72px) 0' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <Reveal>
              <h2 className="cd" style={{ fontSize: 'clamp(32px,4vw,56px)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 14px' }}>The expansion pack.</h2>
              <p className="cg" style={{ fontSize: 16.5, color: 'rgba(245,240,232,0.55)', maxWidth: 560, margin: '0 0 48px', lineHeight: 1.6 }}>
                Four standalone offensive-security tools — each one attacks a different layer of the AI stack.
              </p>
            </Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 1, background: 'rgba(245,240,232,0.1)', border: '1px solid rgba(245,240,232,0.1)' }}>
              {TOOLS.map((tool, i) => (
                <ToolCard3D key={tool.name} tool={tool} delay={i * 0.07}/>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BACKGROUND ── */}
      <section style={{ padding: 'clamp(72px,10vw,110px) clamp(24px,5vw,72px) 0' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <EditorialRow label="EXPERIENCE">
              <div className="cd" style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Blue Team SOC Analyst · Security Tooling Developer</div>
              <p className="cg" style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(245,240,232,0.55)', maxWidth: 720, margin: 0 }}>
                Case triage, threat hunting, identity threat detection and incident response — plus designing, building, red-teaming and shipping the tooling that does it. Every feature in AegisTrace exists because a real shift needed it.
              </p>
            </EditorialRow>
          </Reveal>
          <Reveal>
            <EditorialRow label="CERTIFICATIONS">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {CERTS_EARNED.map(c => (
                  <span key={c} className="mono" style={{ fontSize: 12.5, border: '1px solid rgba(245,158,11,0.4)', color: INK, borderRadius: 100, padding: '9px 18px' }}>{c}</span>
                ))}
                {CERTS_PENDING.map(c => (
                  <span key={c} className="mono" style={{ fontSize: 12.5, border: '1px solid rgba(245,240,232,0.18)', color: 'rgba(245,240,232,0.5)', borderRadius: 100, padding: '9px 18px' }}>{c}</span>
                ))}
              </div>
            </EditorialRow>
          </Reveal>
          <Reveal>
            <EditorialRow label="EDUCATION">
              <div className="cd" style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>MSc Information Systems &amp; Computing</div>
              <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.55)', margin: 0 }}>Dublin Business School · 2025</p>
            </EditorialRow>
          </Reveal>
          <div style={{ borderTop: '1px solid rgba(245,240,232,0.1)' }}/>
        </div>
      </section>

      {/* ── CONTACT CTA ── */}
      <section style={{ padding: 'clamp(96px,12vw,150px) clamp(24px,5vw,72px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Gold bloom */}
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, background: 'radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 68%)', pointerEvents: 'none' }}/>
        <h2 className="cd" style={{ fontSize: 'clamp(40px,6vw,92px)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 34px', lineHeight: 1.02 }}>
          <SplitReveal text="Let's talk shop." stagger={0.03}/>
        </h2>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="gold-btn" href="mailto:Prasanna80564@gmail.com" style={{ fontSize: 14, padding: '15px 34px' }}>Email me <ArrowRight size={16}/></a>
            <a className="ghost-btn" href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, padding: '14px 28px' }}>GitHub</a>
            <a className="ghost-btn" href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, padding: '14px 28px' }}>LinkedIn</a>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '32px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span className="mono" style={{ color: 'rgba(245,240,232,0.4)', fontSize: 12, letterSpacing: '0.18em' }}>PRASANNA KUMAR SURENDRAN — DUBLIN, IRELAND</span>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <Link to="/" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Home</Link>
            <Link to="/mission" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Mission</Link>
            <Link to="/app/login" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Platform</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
