import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  motion, useScroll, useSpring, useTransform,
  useInView, useReducedMotion, useMotionValue,
} from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useSceneCamera, useSectionParallax,
  PinnedScene, RackFocus, ScrollProgressBar,
} from '../components/SceneController';
import CardNav from '../components/CardNav';

const E    = [0.16, 1, 0.3, 1];
const EOUT = [0.23, 1, 0.32, 1];
const GOLD = '#F59E0B';
const BG   = '#050505';
const INK  = '#BDD4E8';


/* ─── Helpers ───────────────────────────────────────────────────────────── */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return m;
}

function Reveal({ children, delay = 0, y = 28, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.76, delay, ease: E }} style={style}
    >{children}</motion.div>
  );
}

/* ─── Ambient embers ─────────────────────────────────────────────────────── */
function AmbientEmbers() {
  const canvasRef = useRef(null);
  const reduced   = useReducedMotion();
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 1, raf = 0, t = 0;
    const embers = Array.from({ length: 48 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.6,
      v: 0.06 + Math.random() * 0.18, ph: Math.random() * 6.28, gold: Math.random() < 0.38,
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
        const x = e.x * w + Math.sin(t * 0.5 + e.ph) * 14;
        const a = still ? 0.18 : 0.06 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.1 + e.ph));
        ctx.fillStyle = e.gold ? `rgba(245,158,11,${a * 1.3})` : `rgba(189,212,232,${a})`;
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

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 1 — HERO  (4 beats, dolly zoom, mouse parallax)
════════════════════════════════════════════════════════════════════════════ */
function HeroScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);

  /* Mouse-driven background parallax */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgMouseX = useSpring(mouseX, { stiffness: 40, damping: 14 });
  const bgMouseY = useSpring(mouseY, { stiffness: 40, damping: 14 });
  const bgDriftX = useTransform(bgMouseX, v => v * 12);
  const bgDriftY = useTransform(bgMouseY, v => v * 8);

  useEffect(() => {
    const fn = e => {
      mouseX.set((e.clientX / window.innerWidth)  - 0.5);
      mouseY.set((e.clientY / window.innerHeight) - 0.5);
    };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, [mouseX, mouseY]);

  /* Beat 1: name */
  const b1Op    = useTransform(p, [0.20, 0.42], [1, 0], { clamp: true });
  const b1BPx   = useTransform(p, [0.22, 0.42], [0, 14], { clamp: true });
  const b1Filt  = useTransform(b1BPx, v => `blur(${v}px)`);

  /* Beat 2: tagline fades in from below */
  const b2CombOp = useTransform(p, v => {
    const i = Math.min(1, Math.max(0, (v - 0.40) / 0.18));
    const o = Math.min(1, Math.max(0, 1 - (v - 0.80) / 0.14));
    return i * o;
  });
  const b2Y     = useTransform(p, [0.38, 0.64], [30, 0], { clamp: true });
  const b2BPx   = useTransform(p, [0.40, 0.60], [16, 0], { clamp: true });
  const b2Filt  = useTransform(b2BPx, v => `blur(${v}px)`);

  /* Beat 3: rack-focus credential badges materialise */
  const b3Op    = useTransform(p, [0.78, 0.90], [0, 1], { clamp: true });

  /* Kicker */
  const kickOp  = useTransform(p, [0.62, 0.76], [0, 1], { clamp: true });
  const kickY   = useTransform(kickOp, o => (1 - o) * 20);

  const BADGES = [
    { label: 'SC-200', sub: 'Microsoft', x: '-34vw', y: '-14vh', delay: 0.0 },
    { label: 'Security+', sub: 'CompTIA', x: '32vw', y: '-20vh', delay: 0.1 },
    { label: 'Blue Team', sub: 'SOC Analyst', x: '-26vw', y: '18vh', delay: 0.18 },
    { label: 'TCM PEH', sub: 'Red Team', x: '26vw', y: '22vh', delay: 0.08 },
    { label: 'MSc Computing', sub: 'Dublin', x: '4vw', y: '-30vh', delay: 0.14 },
  ];

  return (
    <PinnedScene vh="360vh" sceneRef={ref}>
      {/* Background */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #050505 0%, #080818 35%, #0A1428 65%, #0F1E3E 100%)',
        x: bgDriftX, y: bgDriftY,
        willChange: 'transform',
      }}/>
      {/* Mid depth layer — slightly different rate for parallax */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(74,126,200,0.15) 0%, transparent 70%)',
        x: useTransform(bgDriftX, v => v * 0.4),
        y: useTransform(bgDriftY, v => v * 0.4),
      }}/>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 50% 105%, rgba(245,158,11,0.12) 0%, transparent 60%)' }}/>

      {/* Beat 1 — name fades out */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 clamp(20px,5vw,60px)',
        opacity: b1Op, filter: b1Filt, willChange: 'opacity, filter',
      }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.28em', color: GOLD, marginBottom: 22 }}>
          BLUE TEAM · DUBLIN, IRELAND
        </div>
        <h1 className="cd" style={{
          fontSize: 'clamp(44px,7.5vw,116px)', fontWeight: 600, lineHeight: 1,
          letterSpacing: '-0.025em', color: INK, margin: 0,
        }}>
          Prasanna Kumar<br/>Surendran
        </h1>
      </motion.div>

      {/* Beat 2 — tagline rises in */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        opacity: b2CombOp, y: b2Y, filter: b2Filt, willChange: 'transform, opacity, filter',
        padding: '0 clamp(20px,5vw,60px)',
      }}>
        <h1 className="cd" style={{
          fontSize: 'clamp(44px,7.5vw,116px)', fontWeight: 600, lineHeight: 1,
          letterSpacing: '-0.025em', color: INK, margin: 0,
        }}>
          One analyst.<br/><span style={{ color: GOLD }}>An entire SOC.</span>
        </h1>
      </motion.div>

      {/* Beat 3 — rack-focus credential cloud */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: b3Op, willChange: 'opacity',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(189,212,232,0.4)', marginBottom: 8 }}>CREDENTIALS</div>
          <div className="cd" style={{ fontSize: 'clamp(20px,2.5vw,32px)', fontWeight: 600, color: INK }}>Earned in the field.</div>
        </div>
        {BADGES.map((b, i) => (
          <motion.div key={b.label}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.56, delay: b.delay, ease: EOUT }}
            style={{
              position: 'absolute',
              left: `calc(50% + ${b.x})`, top: `calc(50% + ${b.y})`,
              transform: 'translate(-50%, -50%)',
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              padding: '10px 18px',
              animation: `float-badge ${3 + i * 0.4}s ease-in-out ${i * 0.4}s infinite`,
            }}>
            <div className="cd" style={{ fontSize: 13, fontWeight: 600, color: INK }}>{b.label}</div>
            <div className="cg" style={{ fontSize: 10, color: 'rgba(189,212,232,0.4)', marginTop: 2 }}>{b.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Kicker */}
      <motion.div style={{
        position: 'absolute', left: 0, right: 0, bottom: '8vh', zIndex: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        opacity: kickOp, y: kickY,
      }}>
        <p className="cg" style={{ fontSize: 17, fontWeight: 500, color: 'rgba(189,212,232,0.56)', maxWidth: 460, textAlign: 'center', margin: 0 }}>
          SOC analyst who builds the tools he wishes existed.
        </p>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.32em', color: 'rgba(189,212,232,0.3)' }}>SCROLL</span>
      </motion.div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 2 — FLYTHROUGH STATS
   Camera flies through 5 stat "monoliths" positioned at different Z depths.
   Each stat rushes toward and past the viewer at a different rate.
════════════════════════════════════════════════════════════════════════════ */
const STATS_DATA = [
  { n: '1',   label: 'full security platform, solo-built' },
  { n: '30+', label: 'console pages shipped' },
  { n: '35',  label: 'backend API routers' },
  { n: '4',   label: 'security tools on PyPI' },
  { n: '18',  label: 'hardware attack parsers' },
];

/* Each stat at a different depth — arrives and departs at its own speed */
const STAT_DEPTHS = [
  { arrive: [0.02, 0.14], peak: [0.14, 0.24], depart: [0.24, 0.34], zStart: 0.65 },
  { arrive: [0.24, 0.36], peak: [0.36, 0.46], depart: [0.46, 0.56], zStart: 0.78 },
  { arrive: [0.46, 0.56], peak: [0.56, 0.66], depart: [0.66, 0.74], zStart: 0.88 },
  { arrive: [0.64, 0.74], peak: [0.74, 0.82], depart: [0.82, 0.90], zStart: 0.72 },
  { arrive: [0.84, 0.93], peak: [0.93, 1.00], depart: [1.00, 1.00], zStart: 0.60 },
];

function FlythroughStat({ p, stat, depth }) {
  const { arrive, peak, depart, zStart } = depth;

  const op = useTransform(p,
    [arrive[0], arrive[1], peak[0], peak[1], depart[0], depart[1]],
    [0, 1, 1, 1, 1, 0], { clamp: true }
  );
  /* Flythrough: arrives small (far away), grows as it nears, then overshoots past camera */
  const scale = useTransform(p,
    [arrive[0], peak[0], depart[1]],
    [zStart, 1, 2.2], { clamp: true }
  );
  /* As it passes camera, Y shifts upward (flying past above us) */
  const y = useTransform(p,
    [peak[0], depart[1]],
    ['0vh', '-12vh'], { clamp: true }
  );
  /* Blur peaks as it rushes past */
  const blurPx = useTransform(p,
    [depart[0], depart[1]],
    [0, 18], { clamp: true }
  );
  const filter = useTransform(blurPx, v => `blur(${v}px)`);
  /* Progress underline */
  const lineOp = useTransform(p, [arrive[1], peak[0]], [0, 1], { clamp: true });

  return (
    <motion.div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: op, scale, y, filter, willChange: 'transform, opacity, filter',
      pointerEvents: 'none', textAlign: 'center',
    }}>
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <div className="mono" style={{
          fontSize: 'clamp(80px,15vw,200px)', fontWeight: 700, color: GOLD, lineHeight: 1,
        }}>{stat.n}</div>
        <motion.div aria-hidden style={{
          position: 'absolute', bottom: -6, left: 0, right: 0, height: 2,
          background: GOLD, opacity: lineOp, scaleX: lineOp, transformOrigin: 'left',
        }}/>
      </div>
      <div className="cg" style={{ fontSize: 'clamp(13px,1.4vw,18px)', color: 'rgba(189,212,232,0.55)', marginTop: 12 }}>
        {stat.label}
      </div>
    </motion.div>
  );
}

function FlythroughScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);

  /* Far background grid — barely moves (deep parallax) */
  const gridOp    = useTransform(p, [0, 0.04, 0.94, 1], [0, 0.14, 0.14, 0]);
  const gridScale = useTransform(p, [0, 1], [1.0, 1.6]);

  const labelOp = useTransform(p, [0, 0.04, 0.94, 1], [0, 1, 1, 0]);

  return (
    <PinnedScene vh="360vh" sceneRef={ref}>
      {/* Far: dot grid parallax layer */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-80px',
        backgroundImage: 'radial-gradient(circle, rgba(74,126,200,0.14) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: gridOp, scale: gridScale, willChange: 'transform, opacity',
      }}/>
      {/* Gold bloom glow */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(245,158,11,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      {/* Section label */}
      <motion.div style={{ position: 'absolute', top: '7vh', left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: labelOp }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.28em', color: 'rgba(189,212,232,0.3)' }}>BY THE NUMBERS</span>
      </motion.div>

      {/* Stats flythrough */}
      {STATS_DATA.map((stat, i) => (
        <FlythroughStat key={i} p={p} stat={stat} depth={STAT_DEPTHS[i]} />
      ))}
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 3 — TOOLS RACK FOCUS
   4 tools laid out in a 2×2 grid. As p advances, focus shifts sequentially
   through each tool — in-focus tool is sharp + bright, others blur + dim.
════════════════════════════════════════════════════════════════════════════ */
const TOOLS = [
  { layer: 'ATTACKS THE TOOLS', name: 'mcp-sploit', desc: 'Metasploit-style exploitation framework for MCP servers. Enum, exfil, RCE, prompt-injection, policy-probe modules.', cmd: 'pip install mcp-sploit', href: 'https://pypi.org/project/mcp-sploit/', focusAt: 0.15 },
  { layer: 'ATTACKS THE BRAIN', name: 'prompt-fuzz', desc: 'Async fuzzer with 51 curated jailbreak payloads across 10 categories. Reports exactly which ones bypass your guardrails.', cmd: 'pip install prompt-fuzz-cli', href: 'https://pypi.org/project/prompt-fuzz-cli/', focusAt: 0.38 },
  { layer: 'ATTACKS THE IDENTITY LAYER', name: 'nhi-hunter', desc: 'AWS IAM privilege-escalation pathfinder. Builds the graph, finds the role chains that end at Admin.', cmd: 'pip install nhi-hunter', href: 'https://pypi.org/project/nhi-hunter/', focusAt: 0.62 },
  { layer: 'WATCHES THE DATA', name: 'shadow-sniffer', desc: 'Offline shadow-AI detector. Scans connection logs against a 39-domain AI service catalog and your allowlist.', cmd: 'pip install shadow-sniffer', href: 'https://pypi.org/project/shadow-sniffer/', focusAt: 0.85 },
];

function ToolRackCard({ tool, p }) {
  const [copied, setCopied] = useState(false);

  /* Rack focus — this card sharpens at `focusAt`, blurs outside */
  const blur = useTransform(p,
    [Math.max(0, tool.focusAt - 0.3), tool.focusAt - 0.12, tool.focusAt + 0.12, Math.min(1, tool.focusAt + 0.3)],
    [8, 0, 0, 8], { clamp: true }
  );
  const op = useTransform(p,
    [Math.max(0, tool.focusAt - 0.3), tool.focusAt - 0.12, tool.focusAt + 0.12, Math.min(1, tool.focusAt + 0.3)],
    [0.2, 1, 1, 0.2], { clamp: true }
  );
  const borderOp = useTransform(p,
    [Math.max(0, tool.focusAt - 0.15), tool.focusAt, Math.min(1, tool.focusAt + 0.15)],
    [0, 1, 0], { clamp: true }
  );
  const filter = useTransform(blur, v => `blur(${v}px)`);

  const copy = () => {
    navigator.clipboard?.writeText(tool.cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div style={{ opacity: op, filter, willChange: 'filter, opacity', position: 'relative' }}>
      {/* Gold border that pulses when in focus */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: -1, border: '1px solid rgba(245,158,11,0.6)',
        opacity: borderOp, pointerEvents: 'none',
      }}/>
      <div style={{
        padding: 'clamp(20px,2.5vw,32px)',
        background: 'rgba(189,212,232,0.025)',
        border: '1px solid rgba(189,212,232,0.07)',
        height: '100%',
      }}>
        <div className="mono" style={{ fontSize: 10, color: 'rgba(189,212,232,0.36)', marginBottom: 14, letterSpacing: '0.16em' }}>{tool.layer}</div>
        <div className="mono" style={{ fontSize: 'clamp(18px,2vw,26px)', fontWeight: 700, color: INK, marginBottom: 10 }}>{tool.name}</div>
        <p className="cg" style={{ fontSize: 13.5, lineHeight: 1.62, color: 'rgba(189,212,232,0.52)', margin: '0 0 18px' }}>{tool.desc}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <code className="mono" style={{ fontSize: 11.5, color: GOLD, background: 'rgba(245,158,11,0.08)', padding: '5px 10px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.cmd}</code>
          <button onClick={copy} className="cg" style={{
            background: 'none', border: '1px solid rgba(189,212,232,0.15)', color: 'rgba(189,212,232,0.5)',
            fontSize: 11, padding: '5px 10px', cursor: 'pointer', flexShrink: 0,
            transition: 'border-color 140ms, color 140ms',
          }}>{copied ? '✓' : 'copy'}</button>
          <a href={tool.href} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, color: 'rgba(189,212,232,0.35)', textDecoration: 'none' }}>
            PyPI ↗
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function ToolsRackScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);

  /* Section label opacity */
  const labelOp = useTransform(p, [0, 0.06, 0.92, 1], [0, 1, 1, 0]);

  /* Active tool label */
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const unsub = p.on('change', v => {
      const idx = TOOLS.findIndex(t => v < t.focusAt + 0.13);
      setActiveIdx(Math.max(0, idx === -1 ? TOOLS.length - 1 : idx));
    });
    return unsub;
  }, [p]);

  return (
    <PinnedScene vh="340vh" sceneRef={ref}>
      {/* Header */}
      <motion.div style={{
        position: 'absolute', top: '7vh', left: 'clamp(24px,5vw,72px)', right: 'clamp(24px,5vw,72px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        opacity: labelOp, zIndex: 4,
      }}>
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.26em', color: 'rgba(189,212,232,0.3)', marginBottom: 4 }}>THE EXPANSION PACK</div>
          <div className="cd" style={{ fontSize: 'clamp(18px,2vw,26px)', fontWeight: 600, color: INK }}>Four tools. Four attack layers.</div>
        </div>
        {/* Active tool name */}
        <div className="mono" style={{ fontSize: 12, color: GOLD, opacity: 0.8 }}>
          {TOOLS[activeIdx].name}
        </div>
      </motion.div>

      {/* 2×2 rack focus grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 2, width: '100%',
        padding: '0 clamp(24px,5vw,72px)',
        maxWidth: 1100, margin: '0 auto',
      }}>
        {TOOLS.map(tool => (
          <ToolRackCard key={tool.name} tool={tool} p={p} />
        ))}
      </div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   EDITORIAL SECTIONS
════════════════════════════════════════════════════════════════════════════ */
const FLAGSHIP_POINTS = [
  'Identity-first detection — 6 real-time ITDR detectors',
  'Explainable AI triage on Groq + NVIDIA NIM',
  'Attack-graph kill-chain reconstruction (Temporal Linker)',
  'SOAR playbooks gated by human approval',
  'Endpoint agent v6.1 — ATSP-encrypted telemetry, honey tokens, auto-block',
  'SHA-256 hash chain on every AI decision — Trust Certificate for DORA',
  'ATSP: formally verifiable protocol, 4 properties proved with ProVerif',
];

const CERTS_EARNED  = ['SC-200', 'Security+', 'TCM PEH'];
const CERTS_PENDING = ['BTL1 — studying', 'eJPT — in progress', 'SC-300 — in progress'];

function FlagshipSection() {
  const ref = useRef(null);
  const p   = useSectionParallax(ref);
  const bgY = useTransform(p, [0, 1], ['-6%', '6%']);

  return (
    <section ref={ref} style={{ padding: 'clamp(80px,10vw,130px) clamp(24px,5vw,72px)', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(189,212,232,0.06)' }}>
      {/* Parallax depth layers */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-10%',
        background: 'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(245,158,11,0.04) 0%, transparent 70%)',
        y: bgY, pointerEvents: 'none',
      }}/>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }}>
          <Reveal>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.24em', color: GOLD, marginBottom: 16 }}>FLAGSHIP — v10.1</div>
              <h2 className="cd" style={{ fontSize: 'clamp(30px,3.5vw,52px)', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 18px', lineHeight: 1.04 }}>AegisTrace</h2>
              <p className="cg" style={{ fontSize: 16, lineHeight: 1.68, color: 'rgba(189,212,232,0.58)', maxWidth: 480, margin: '0 0 18px' }}>
                Free, open Accountability Infrastructure for the AI-agent era: identity-first detection, explainable AI triage, kill-chain reconstruction, SOAR playbooks with human approval gates, SHA-256 hash chain on every AI decision, and a production endpoint agent with a formally verified secure protocol — all on free-tier infrastructure.
              </p>
              <p className="cg" style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(189,212,232,0.36)', maxWidth: 480, margin: '0 0 28px' }}>
                React 18 · FastAPI · SQLite · Groq · NVIDIA NIM · Docker · Render
              </p>
              <div style={{ display: 'flex', gap: 24 }}>
                <a className="u-link" href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer">Live <ArrowUpRight size={12} style={{ verticalAlign: -1 }}/></a>
                <a className="u-link" href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noopener noreferrer">Source <ArrowUpRight size={12} style={{ verticalAlign: -1 }}/></a>
              </div>
            </div>
          </Reveal>
          <div style={{ background: 'rgba(189,212,232,0.02)', border: '1px solid rgba(189,212,232,0.08)', padding: 'clamp(20px,3vw,32px)' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(189,212,232,0.3)', marginBottom: 18 }}>WHAT IT SHIPS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FLAGSHIP_POINTS.map((pt, i) => (
                <Reveal key={pt} delay={i * 0.05} y={10}>
                  <div className="cg" style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.55, color: 'rgba(189,212,232,0.62)' }}>
                    <span className="mono" style={{ color: GOLD, flexShrink: 0 }}>▸</span><span>{pt}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BackgroundSection() {
  const ref = useRef(null);
  const p   = useSectionParallax(ref);
  const lineW = useTransform(p, [0.2, 0.8], ['0%', '100%']);

  return (
    <section ref={ref} style={{ padding: 'clamp(80px,10vw,130px) clamp(24px,5vw,72px)', position: 'relative', borderTop: '1px solid rgba(189,212,232,0.06)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        {/* Animated horizontal rule */}
        <div style={{ position: 'relative', height: 1, background: 'rgba(189,212,232,0.06)', marginBottom: 'clamp(40px,5vw,64px)' }}>
          <motion.div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, background: GOLD, opacity: 0.5, width: lineW }}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,240px) 1fr', gap: 'clamp(32px,5vw,64px)' }}>
          <Reveal>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(189,212,232,0.36)' }}>BACKGROUND</div>
          </Reveal>
          <div>
            <Reveal>
              <div className="cd" style={{ fontSize: 'clamp(20px,2.2vw,30px)', fontWeight: 600, color: INK, marginBottom: 20, lineHeight: 1.1 }}>
                Blue Team SOC Analyst · Security Tooling Developer
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <p className="cg" style={{ fontSize: 15.5, lineHeight: 1.68, color: 'rgba(189,212,232,0.52)', maxWidth: 680, margin: '0 0 28px' }}>
                Case triage, threat hunting, identity threat detection and incident response — plus designing, building, red-teaming and shipping the tooling that does it. Every feature in AegisTrace exists because a real gap in production tooling needed it.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 20 }}>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(189,212,232,0.3)', marginBottom: 12 }}>CERTIFICATIONS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CERTS_EARNED.map(c => (
                      <span key={c} className="mono" style={{ fontSize: 12, border: '1px solid rgba(245,158,11,0.35)', color: INK, borderRadius: 100, padding: '7px 14px' }}>{c}</span>
                    ))}
                    {CERTS_PENDING.map(c => (
                      <span key={c} className="mono" style={{ fontSize: 12, border: '1px solid rgba(189,212,232,0.14)', color: 'rgba(189,212,232,0.42)', borderRadius: 100, padding: '7px 14px' }}>{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(189,212,232,0.3)', marginBottom: 12 }}>EDUCATION</div>
                  <div className="cd" style={{ fontSize: 18, fontWeight: 600, color: INK, marginBottom: 4 }}>MSc Information Systems</div>
                  <div className="cg" style={{ fontSize: 14, color: 'rgba(189,212,232,0.44)' }}>Dublin Business School · 2025</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CTA
════════════════════════════════════════════════════════════════════════════ */
function CTASection() {
  const ref = useRef(null);
  const p   = useSectionParallax(ref);
  /* Dolly-zoom settle on CTA heading as it enters viewport */
  const ctaScale = useTransform(p, [0.1, 0.55], [1.06, 1.0], { clamp: true });
  const ctaOp    = useTransform(p, [0.1, 0.45], [0, 1], { clamp: true });

  return (
    <section ref={ref} style={{
      padding: 'clamp(100px,14vw,160px) clamp(24px,5vw,72px)',
      textAlign: 'center', position: 'relative', overflow: 'hidden',
      borderTop: '1px solid rgba(189,212,232,0.06)',
    }}>
      <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 640, height: 420, background: 'radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 68%)', pointerEvents: 'none' }}/>
      <motion.div style={{ scale: ctaScale, opacity: ctaOp, willChange: 'transform, opacity' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(36px,5.5vw,80px)', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 28px', lineHeight: 1.0, color: INK }}>
          Let&apos;s <span style={{ color: GOLD }}>talk shop.</span>
        </h2>
        <p className="cg" style={{ fontSize: 16, color: 'rgba(189,212,232,0.44)', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 40px' }}>
          Open to blue team roles, security engineering, and product work at the intersection of AI and security.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="gold-btn" href="mailto:Prasanna80564@gmail.com" style={{ fontSize: 14, padding: '14px 32px' }}>Email me <ArrowRight size={15}/></a>
          <a className="ghost-btn" href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, padding: '13px 26px' }}>GitHub</a>
          <a className="ghost-btn" href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, padding: '13px 26px' }}>LinkedIn</a>
        </div>
      </motion.div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════════ */
export default function Portfolio() {
  const isMobile = useIsMobile();
  const reduced  = useReducedMotion();

  return (
    <div style={{ background: BG, color: INK, overflowX: 'clip', minHeight: '100vh', position: 'relative', isolation: 'isolate' }}>
      <AmbientEmbers/>
      <ScrollProgressBar/>
      <CardNav/>

      <style>{`
        .cd   { font-family: 'Plus Jakarta Sans', sans-serif; }
        .cg   { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }

        .gold-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${GOLD}; color: #000; font-weight: 700;
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px;
          padding: 12px 24px; border: none; cursor: pointer;
          text-decoration: none; letter-spacing: 0.03em;
          transition: background 140ms ${EOUT.join(',')}, transform 100ms, box-shadow 140ms;
        }
        .gold-btn:hover  { background: #FBBF24; box-shadow: 0 0 20px rgba(245,158,11,0.3); transform: translateY(-2px); }
        .gold-btn:active { transform: scale(0.97) translateY(0); }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(189,212,232,0.7);
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
          padding: 11px 22px; border: 1px solid rgba(189,212,232,0.18);
          cursor: pointer; text-decoration: none; letter-spacing: 0.02em;
          transition: border-color 140ms, color 140ms, transform 100ms;
        }
        .ghost-btn:hover  { border-color: rgba(189,212,232,0.4); color: ${INK}; transform: translateY(-2px); }
        .ghost-btn:active { transform: scale(0.97) translateY(0); }

        .nav-link {
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(189,212,232,0.58); text-decoration: none; letter-spacing: 0.02em;
          position: relative; transition: color 140ms;
        }
        .nav-link:hover { color: ${INK}; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -3px;
          height: 1px; background: ${GOLD};
          transition: right 240ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover::after { right: 0; }

        .u-link {
          font-family: 'IBM Plex Sans', sans-serif; font-size: 15px; font-weight: 700;
          color: ${INK}; text-decoration: none;
          border-bottom: 1px solid rgba(245,158,11,0.45); padding-bottom: 3px;
          transition: color 140ms, border-color 140ms;
        }
        .u-link:hover { color: ${GOLD}; border-color: ${GOLD}; }

        ::selection { background: rgba(245,158,11,0.3); color: ${INK}; }

        @keyframes float-badge {
          0%,100% { transform: translate(-50%,-50%) translateY(0px); }
          50%      { transform: translate(-50%,-50%) translateY(-7px); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {(isMobile || reduced) ? (
        /* ── Mobile / reduced-motion fallback ── */
        <div style={{ paddingTop: 64 }}>
          <section style={{ minHeight: '80vh', display: 'flex', alignItems: 'flex-end', position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #050505 0%, #080818 35%, #0A1428 65%, #0F1E3E 100%)' }}/>
            <Reveal style={{ position: 'relative', zIndex: 2, padding: '0 24px 60px' }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.26em', color: GOLD, marginBottom: 16 }}>BLUE TEAM · DUBLIN, IRELAND</div>
              <h1 className="cd" style={{ fontSize: 'clamp(36px,10vw,56px)', fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.02em', color: INK, margin: '0 0 16px' }}>Prasanna Kumar Surendran</h1>
              <p className="cg" style={{ fontSize: 16, fontWeight: 500, color: 'rgba(189,212,232,0.56)', maxWidth: 420, margin: 0 }}>One analyst. An entire SOC.</p>
            </Reveal>
          </section>
          <section style={{ padding: '48px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 1, borderTop: '1px solid rgba(189,212,232,0.08)', borderBottom: '1px solid rgba(189,212,232,0.08)' }}>
              {STATS_DATA.map(s => (
                <div key={s.label} style={{ padding: '28px 16px 28px 0' }}>
                  <div className="mono" style={{ fontSize: 34, fontWeight: 700, color: GOLD, lineHeight: 1 }}>{s.n}</div>
                  <div className="cg" style={{ fontSize: 12.5, color: 'rgba(189,212,232,0.48)', marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* ── Desktop: full cinematic experience ── */
        <>
          <HeroScene/>
          <FlythroughScene/>
        </>
      )}

      <FlagshipSection/>

      {!isMobile && !reduced && <ToolsRackScene/>}

      {(isMobile || reduced) && (
        <section style={{ padding: 'clamp(60px,8vw,100px) clamp(24px,5vw,72px)' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <Reveal style={{ marginBottom: 32 }}>
              <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>The expansion pack.</h2>
            </Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 2, background: 'rgba(189,212,232,0.08)', border: '1px solid rgba(189,212,232,0.08)' }}>
              {TOOLS.map(t => (
                <div key={t.name} style={{ padding: '26px 22px', background: BG }}>
                  <div className="mono" style={{ fontSize: 10, color: 'rgba(189,212,232,0.32)', marginBottom: 12 }}>{t.layer}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: INK }}>{t.name}</div>
                  <p className="cg" style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(189,212,232,0.5)', margin: '0 0 14px' }}>{t.desc}</p>
                  <a className="mono" href={t.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: GOLD, textDecoration: 'none' }}>{t.cmd} ↗</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <BackgroundSection/>
      <CTASection/>

      <footer style={{ borderTop: '1px solid rgba(189,212,232,0.05)', padding: '28px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/assets/brand/aegistrace-icon-transparent.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.6 }}/>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: 'rgba(189,212,232,0.3)', fontSize: 11, letterSpacing: '0.16em' }}>AEGISTRACE</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Link to="/" className="cg" style={{ color: 'rgba(189,212,232,0.26)', fontSize: 12, textDecoration: 'none' }}>Home</Link>
            <Link to="/mission" className="cg" style={{ color: 'rgba(189,212,232,0.26)', fontSize: 12, textDecoration: 'none' }}>Mission</Link>
            <Link to="/app/login" className="cg" style={{ color: 'rgba(189,212,232,0.26)', fontSize: 12, textDecoration: 'none' }}>Platform</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
