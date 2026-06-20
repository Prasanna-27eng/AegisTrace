import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  motion, useScroll, useSpring, useTransform,
  useMotionValueEvent, useInView, useReducedMotion,
} from 'framer-motion';
import {
  ArrowRight, Shield, Brain, Fingerprint, FolderSearch,
  Mail, Monitor, Activity, CheckCircle, Clock, ArrowUpRight,
  Zap, Eye, Lock, GitMerge, Layers, ShieldCheck, User,
  AlertTriangle, UserCheck, Share2, ShieldOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSceneCamera, PinnedScene, ScrollProgressBar } from '../components/SceneController';

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

/* ─── Split char reveal ─────────────────────────────────────────────────── */
function SplitReveal({ text, style = {}, stagger = 0.035, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <span ref={ref} style={{ display: 'inline-block', ...style }}>
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 56, rotateX: -50 }}
          animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={{ duration: 0.76, delay: delay + i * stagger, ease: E }}
          style={{ display: 'inline-block', transformOrigin: 'bottom' }}
        >{ch === ' ' ? ' ' : ch}</motion.span>
      ))}
    </span>
  );
}

/* ─── Ambient embers ────────────────────────────────────────────────────── */
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
      r: 0.6 + Math.random() * 1.7, v: 0.08 + Math.random() * 0.22,
      ph: Math.random() * 6.28, gold: Math.random() < 0.4,
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
        const a = still ? 0.22 : 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.2 + e.ph));
        ctx.fillStyle = e.gold ? `rgba(245,158,11,${a * 1.25})` : `rgba(245,240,232,${a})`;
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

/* ─── Mobile check ──────────────────────────────────────────────────────── */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return m;
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
          : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(245,240,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(245,240,232,0.2)' }}/></div>}
        </div>
        <div>
          <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 14, color, lineHeight: 1.6, display: 'block' }}>{text}</span>
          {why && <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 12, color: 'rgba(245,240,232,0.28)', lineHeight: 1.55, display: 'block', marginTop: 4 }}>{why}</span>}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Principle card with 3D tilt ───────────────────────────────────────── */
function PrincipleCard({ icon: Icon, title, body, delay }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const [hov, setHov] = useState(false);

  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    setTilt({ rx: -ny * 9, ry: nx * 9, gx: (nx + 0.5) * 100, gy: (ny + 0.5) * 100 });
  }, []);
  const onLeave = useCallback(() => { setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 }); setHov(false); }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.72, delay, ease: E }}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={onLeave}
      style={{ perspective: 700 }}
    >
      <div style={{
        background: hov ? 'rgba(245,158,11,0.05)' : 'rgba(245,240,232,0.02)',
        border: `1px solid ${hov ? 'rgba(245,158,11,0.22)' : 'rgba(245,240,232,0.07)'}`,
        backdropFilter: hov ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: hov ? 'blur(10px)' : 'none',
        boxShadow: hov ? '0 0 40px rgba(245,158,11,0.08), inset 0 0 20px rgba(245,158,11,0.03)' : 'none',
        padding: '28px 24px', position: 'relative', overflow: 'hidden',
        transform: `perspective(700px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: 'transform 200ms ease, background 240ms ease, border-color 240ms ease, box-shadow 240ms ease',
        willChange: 'transform',
      }}>
        {hov && <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(245,158,11,0.10) 0%, transparent 65%)`,
        }}/>}
        <Icon size={20} color={GOLD} style={{ marginBottom: 18, opacity: hov ? 1 : 0.7, filter: hov ? 'drop-shadow(0 0 6px rgba(245,158,11,0.5))' : 'none', transition: 'opacity 220ms, filter 220ms' }}/>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 16, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 13, color: 'rgba(245,240,232,0.46)', lineHeight: 1.68 }}>{body}</div>
      </div>
    </motion.div>
  );
}

/* ─── 3D Problem card ───────────────────────────────────────────────────── */
function ProblemCard3D({ n, title, body, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const [hov, setHov] = useState(false);

  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    setTilt({ rx: -ny * 8, ry: nx * 8, gx: (nx + 0.5) * 100, gy: (ny + 0.5) * 100 });
  }, []);
  const onLeave = useCallback(() => { setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 }); setHov(false); }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48, rotateX: -16, scale: 0.92 }}
      animate={inView ? { opacity: 1, y: 0, rotateX: 0, scale: 1 } : {}}
      transition={{ duration: 0.76, delay, ease: E }}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={onLeave}
      style={{ perspective: 700, height: '100%' }}
    >
      <div style={{
        background: hov ? 'rgba(245,240,232,0.04)' : 'rgba(245,240,232,0.025)',
        border: `1px solid ${hov ? 'rgba(245,240,232,0.14)' : 'rgba(245,240,232,0.07)'}`,
        padding: '28px 24px', height: '100%', position: 'relative', overflow: 'hidden',
        transform: `perspective(700px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: 'transform 190ms ease, background 200ms ease, border-color 200ms ease',
        willChange: 'transform',
        boxShadow: hov ? '0 16px 48px rgba(0,0,0,0.4)' : 'none',
      }}>
        {hov && <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(245,158,11,0.05) 0%, transparent 65%)`,
        }}/>}
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: GOLD, letterSpacing: '0.12em', marginBottom: 16 }}>{n}</div>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 15, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 13, color: 'rgba(245,240,232,0.44)', lineHeight: 1.68 }}>{body}</div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STAT 83% SCENE — counter + concentric ring pulse when it hits 83
════════════════════════════════════════════════════════════════════════ */
function Stat83Scene() {
  const ref     = useRef(null);
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const p = useSceneCamera(ref);

  const [count, setCount] = useState(0);
  const [fired, setFired] = useState(false);
  useMotionValueEvent(p, 'change', v => {
    const c = Math.round(Math.max(0, Math.min(1, (v - 0.08) / 0.45)) * 83);
    setCount(c);
    if (c >= 83 && !fired) setFired(true);
  });

  const statOpacity    = useTransform(p, [0.02, 0.22], [0, 1], { clamp: true });
  const statY          = useTransform(statOpacity, o => (1 - o) * 70);
  const captionOpacity = useTransform(p, [0.42, 0.6], [0, 1], { clamp: true });
  const dotsOpacity    = useTransform(p, [0.05, 0.3], [0, 0.2], { clamp: true });
  const dotsY          = useTransform(p, v => -v * 150);

  if (isMobile || reduced) {
    return (
      <section style={{ padding: 'clamp(56px,10vw,96px) clamp(24px,5vw,72px)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 'clamp(80px,20vw,160px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>83</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 'clamp(40px,9vw,72px)', fontWeight: 700, color: 'rgba(245,240,232,0.4)', lineHeight: 1 }}>%</span>
        </div>
        <p className="cg" style={{ fontSize: 18, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 460, margin: '24px auto 0' }}>
          of breaches involve <strong style={{ color: '#F5F0E8' }}>stolen credentials or identity abuse.</strong>
        </p>
      </section>
    );
  }

  return (
    <PinnedScene vh="280vh" sceneRef={ref}>
      {/* Dot grid parallax */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-160px 0',
        backgroundImage: 'radial-gradient(circle, rgba(245,240,232,0.18) 1.5px, transparent 1.5px)',
        backgroundSize: '30px 30px',
        opacity: dotsOpacity, y: dotsY, willChange: 'transform, opacity',
      }}/>

      {/* Concentric rings — fire when count hits 83 */}
      {fired && [0, 1, 2, 3].map(i => (
        <motion.div
          key={i}
          aria-hidden
          initial={{ scale: 0.1, opacity: 0.7 }}
          animate={{ scale: 4.5, opacity: 0 }}
          transition={{ duration: 2.4, delay: i * 0.5, ease: [0, 0, 0.6, 1], repeat: Infinity, repeatDelay: 1.2 }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 200, height: 200, marginLeft: -100, marginTop: -100,
            borderRadius: '50%',
            border: '1px solid rgba(245,158,11,0.55)',
            pointerEvents: 'none',
            willChange: 'transform, opacity',
          }}
        />
      ))}

      {/* Stat number */}
      <motion.div style={{
        position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px',
        opacity: statOpacity, y: statY, willChange: 'transform, opacity',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
          <motion.span style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 'clamp(110px,17vw,250px)', fontWeight: 700, lineHeight: 1,
            color: GOLD,
            textShadow: fired ? '0 0 80px rgba(245,158,11,0.4)' : 'none',
            transition: 'text-shadow 600ms ease',
          }}>{count}</motion.span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 'clamp(50px,7vw,110px)', fontWeight: 700, color: 'rgba(245,240,232,0.4)', lineHeight: 1 }}>%</span>
        </div>
        <motion.p className="cg" style={{ fontSize: 20, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 520, margin: '24px auto 0', opacity: captionOpacity }}>
          of breaches involve <strong style={{ color: '#F5F0E8' }}>stolen credentials or identity abuse.</strong> The perimeter is whoever you trust.
        </motion.p>
      </motion.div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ATTACK TIMELINE SCENE — horizontal dolly pan
   "Credential Stolen → Access Granted → Lateral Movement → Detected"
   Camera pans right through the 4 attack stages as you scroll
════════════════════════════════════════════════════════════════════════ */
const ATTACK_STAGES = [
  {
    icon: ShieldOff,
    step: '01',
    event: 'Credential Stolen',
    detail: 'Phishing email. Service account password reused. Token extracted from memory. The attacker has a key.',
    color: 'rgba(239,68,68,0.9)',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.18)',
  },
  {
    icon: UserCheck,
    step: '02',
    event: 'Access Granted',
    detail: 'Login from Berlin. Time: 3:14 AM. User is asleep in Dublin. SIEM fires one alert. It is dismissed.',
    color: 'rgba(249,115,22,0.9)',
    bg: 'rgba(249,115,22,0.06)',
    border: 'rgba(249,115,22,0.18)',
  },
  {
    icon: Share2,
    step: '03',
    event: 'Lateral Movement',
    detail: 'Privilege escalation via misconfigured service account. 47 files accessed. Exfil begins quietly.',
    color: 'rgba(234,179,8,0.9)',
    bg: 'rgba(234,179,8,0.06)',
    border: 'rgba(234,179,8,0.18)',
  },
  {
    icon: Shield,
    step: '04',
    event: 'Detected by AegisTrace',
    detail: 'Impossible travel. Off-hours access. Privilege spike. Identity graph anomaly. Case opened automatically.',
    color: GOLD,
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.28)',
  },
];

function AttackTimelineScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref, { smooth: false });

  /* Camera pans right through 4 stages */
  const x = useTransform(p, [0.04, 0.96], ['0%', '-60%']);

  /* Connector line fills left to right across p 0.04→0.96 */
  const lineW = useTransform(p, [0.04, 0.96], ['0%', '100%']);

  const labelOp = useTransform(p, [0, 0.05, 0.93, 1], [0, 1, 1, 0]);

  return (
    <PinnedScene vh="340vh" sceneRef={ref}>
      {/* Header */}
      <motion.div style={{
        position: 'absolute', top: '7vh', left: 'clamp(24px,5vw,72px)', right: 0, zIndex: 4,
        opacity: labelOp,
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.26em', color: 'rgba(245,240,232,0.35)', marginBottom: 6 }}>
          HOW EVERY BREACH UNFOLDS
        </div>
        <div className="cd" style={{ fontSize: 'clamp(18px,2.2vw,28px)', fontWeight: 600, color: '#F5F0E8' }}>
          The anatomy of an identity attack.
        </div>
      </motion.div>

      {/* Connector line */}
      <div style={{
        position: 'absolute', top: '50%', left: 'clamp(24px,5vw,72px)', right: 0,
        height: 1, background: 'rgba(245,240,232,0.08)', zIndex: 1,
      }}>
        <motion.div style={{ position: 'absolute', inset: 0, background: GOLD, width: lineW, opacity: 0.4 }}/>
      </div>

      {/* Stage rail */}
      <motion.div style={{
        display: 'flex', gap: 'clamp(20px,3vw,40px)',
        x, willChange: 'transform',
        position: 'absolute',
        left: 'clamp(24px,5vw,72px)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 'max-content',
        zIndex: 2,
        paddingTop: 40,
      }}>
        {ATTACK_STAGES.map((stage, i) => {
          const Icon = stage.icon;
          /* Each stage fades/scales in as camera pans to it */
          const stageStart = 0.04 + i * 0.22;
          const stageEnd   = stageStart + 0.18;

          return (
            <motion.div
              key={stage.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: E }}
              style={{
                width: 'clamp(240px,26vw,360px)', flexShrink: 0,
                background: stage.bg,
                border: `1px solid ${stage.border}`,
                padding: '32px 28px',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Step number */}
              <div className="mono" style={{ fontSize: 10, color: stage.color, letterSpacing: '0.2em', marginBottom: 20, opacity: 0.8 }}>
                STEP {stage.step}
              </div>
              {/* Icon */}
              <div style={{ width: 44, height: 44, background: `rgba(${stage.color === GOLD ? '245,158,11' : '255,255,255'},0.06)`, border: `1px solid ${stage.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Icon size={20} color={stage.color} style={{ filter: `drop-shadow(0 0 6px ${stage.color})` }}/>
              </div>
              {/* Label */}
              <div className="cd" style={{ fontSize: 'clamp(16px,1.6vw,22px)', fontWeight: 600, color: '#F5F0E8', marginBottom: 12, lineHeight: 1.2 }}>
                {stage.event}
              </div>
              <div className="cg" style={{ fontSize: 13.5, color: 'rgba(245,240,232,0.52)', lineHeight: 1.65 }}>
                {stage.detail}
              </div>
              {/* Vertical accent */}
              <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: stage.color, opacity: 0.4 }}/>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom: scroll hint */}
      <motion.div style={{
        position: 'absolute', bottom: '6vh', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: useTransform(p, [0, 0.06, 0.92, 1], [0, 0.45, 0.45, 0]),
      }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(245,240,232,0.35)' }}>PAN →</span>
      </motion.div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   HERO — 3-beat dolly (enhanced zoom ranges + grid materialise on beat 3)
════════════════════════════════════════════════════════════════════════ */
export default function Mission() {
  const heroRef = useRef(null);
  const p = useSceneCamera(heroRef);
  const heroY     = useTransform(p, [0, 1], ['0%', '14%']);
  const heroScale = useTransform(p, [0, 1], [1.1, 1.0]);
  const overlayY  = useTransform(p, [0, 1], ['0%', '8%']);

  /* Beat 1 */
  const b1Opacity = useTransform(p, [0.26, 0.46], [1, 0], { clamp: true });
  const b1Scale   = useTransform(p, [0, 1], [1, 2.6]);
  const b1BPx     = useTransform(p, [0.24, 0.46], [0, 14], { clamp: true });
  const b1Filter  = useTransform(b1BPx, v => `blur(${v}px)`);

  /* Beat 2 */
  const b2Opacity  = useTransform(p, [0.44, 0.62], [0, 1], { clamp: true });
  const b2Scale    = useTransform(p, [0.42, 0.70], [0.5, 1], { clamp: true });
  const b2Out      = useTransform(p, [0.84, 0.96], [1, 0], { clamp: true });
  const b2CombOp   = useTransform(p, v => {
    const fadeIn  = Math.min(1, Math.max(0, (v - 0.44) / 0.18));
    const fadeOut = Math.min(1, Math.max(0, 1 - (v - 0.84) / 0.12));
    return fadeIn * fadeOut;
  });

  /* Beat 3 — security grid lines materialise */
  const b3Op      = useTransform(p, [0.82, 0.94], [0, 1], { clamp: true });
  const b3Scale   = useTransform(p, [0.80, 0.96], [0.88, 1], { clamp: true });

  /* Kicker */
  const subOpacity = useTransform(p, [0.72, 0.86], [0, 1], { clamp: true });

  const V1 = [
    { text: 'ITDR — Identity Threat Detection (4 detectors)', why: 'Credential stuffing, impossible travel, privilege escalation, token theft — all built in.' },
    { text: 'Identity Risk Engine with pluggable detectors', why: 'Each detector contributes to a unified risk score. Swap or add detectors without touching the core.' },
    { text: 'Case Management — 15-tab investigation lifecycle', why: 'From detection to report, the full SOC workflow is in one place.' },
    { text: 'Identity Graph + Trust Timeline', why: 'See exactly how an identity moved through your environment over time.' },
    { text: 'Explainable AI with full reasoning chain', why: 'Every AI verdict includes the evidence it used. No black-box verdicts.' },
    { text: '7-Source IOC Intelligence Engine', why: 'VirusTotal, GreyNoise, threat feeds — all merged into one IOC verdict.' },
    { text: 'Email Forensics Engine', why: 'Header analysis, link extraction, attachment hashing. Phishing triage in under 60 seconds.' },
    { text: 'Endpoint Agent v5 (Windows / Linux / macOS)', why: 'One command deploys. Ships telemetry every 3 seconds. No config files.' },
    { text: 'Threat Hunting + Campaign Detection', why: 'Cross-case IOC correlation surfaces campaigns you would otherwise miss.' },
    { text: 'DORA Article 19 Compliance Reports', why: 'Generated from investigation data automatically. No manual assembly.' },
    { text: 'NVIDIA NIM: Hermes-3 Agentic Triage (Phase 6)', why: 'Function-calling loop with 5 tools — IOC enrichment, case correlation, endpoint data, threat intel.' },
    { text: 'NVIDIA NIM: Semantic Search + NV-RerankQA (Phase 7)', why: 'NV-EmbedQA-E5-v5 embeddings with NV-RerankQA-Mistral-4B reranker.' },
    { text: 'NVIDIA NIM: Vision Analysis — Llama 3.2 Vision (Phase 8)', why: 'Drop a screenshot; get a verdict. Detects phishing pages, malware artifacts, and IOCs in images.' },
    { text: 'NVIDIA NIM: Detection Rule Generator — Codestral 22B (Phase 9)', why: 'Generates deployable YARA, Sigma, KQL, and Splunk SPL from case IOCs.' },
    { text: 'Temporal Linker — Attack Graph Reconstruction (v10.0)', why: 'Correlates alerts and endpoint logs, asks Nemotron-70B to reconstruct the full attack chain.' },
    { text: 'SOAR Playbook Engine (v10.0)', why: 'If-this-then-that automation rules trigger on ITDR alerts — auto-creating cases, enriching IOCs.' },
    { text: 'Shadow AI Detection Dashboard (v4.3)', why: 'Cross-references telemetry against 14+ AI API domains. 3+ hits in 24h auto-escalates into ITDR.' },
    { text: 'AI Defense Console (v5.3)', why: 'Live attack feed with human-in-the-loop block / isolate / escalate / dismiss.' },
    { text: 'Control Plane — live SOC command view', why: '5 KPI cards, high-risk identity panel, AI action queue, ITDR threat feed — auto-refreshing every 30s.' },
    { text: 'NHI Lifecycle Health Dashboard', why: 'Service accounts, API keys, and tokens get sprawl scores and trust-decay tracking.' },
    { text: 'Connector Hub — identity providers + approved AI services', why: 'One place to register identity provider connections and approved AI services.' },
  ];

  const V2 = [
    { text: 'Adaptive Thresholds Agent', why: 'Nemotron reviews detector false-positive rates on a 4-hour cycle and adjusts thresholds within safe bounds.', active: true },
    { text: 'Auto-Rule Generation Trigger', why: 'When the same MITRE technique appears in 3+ cases in 7 days, Codestral 22B auto-generates rules into a pending-review queue.' },
    { text: 'Non-human Identity (NHI) vault + credential rotation', why: 'Next is a vault that actually rotates and revokes the credentials the health dashboard flags.' },
    { text: 'Quantum-Resistant Key Monitoring', why: 'Flags RSA/EC keys in environments migrating toward post-quantum cryptography.' },
    { text: 'Agent Supervision Layer for AI workflows', why: 'Governs what actions AI agents can take. Logs everything. Flags deviations.' },
  ];

  const V3 = [
    { text: 'Attacker Path Emulation (red-team simulation)', why: 'Simulate attack paths from a given identity to critical assets before real attackers find them.' },
    { text: 'Multi-tenant Architecture for enterprise deployments', why: 'Run one AegisTrace instance across multiple client environments or business units.' },
    { text: 'Federated Identity Graph across organisations', why: 'Detect lateral movement that crosses organisational boundaries via shared identities or vendors.' },
    { text: 'Adversarial AI detection engine', why: 'Detect prompt injection, model exfiltration, and AI supply chain attacks.' },
    { text: 'Regulatory Mapping: NIS2, GDPR, DORA v2', why: 'Map every incident to its regulatory obligation automatically. Export-ready for auditors.' },
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
    <div style={{ background: BG, color: '#F5F0E8', overflowX: 'clip', position: 'relative', isolation: 'isolate' }}>
      <AmbientEmbers/>
      <ScrollProgressBar/>
      <style>{`
        .cd  { font-family: 'Clash Display', sans-serif; }
        .cg  { font-family: 'Cabinet Grotesk', sans-serif; }
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
          padding: 12px 24px; border: 1px solid rgba(245,240,232,0.18);
          cursor: pointer; text-decoration: none; letter-spacing: 0.03em;
          transition: border-color 140ms, color 140ms, transform 90ms;
        }
        .ghost-btn:hover  { border-color: rgba(245,240,232,0.42); color: #F5F0E8; transform: translateY(-2px); }
        .ghost-btn:active { transform: scale(0.97); }

        .nav-link {
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(245,240,232,0.6); text-decoration: none; position: relative;
          transition: color 140ms;
        }
        .nav-link:hover { color: #F5F0E8; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -4px;
          height: 1px; background: #F59E0B;
          transition: right 260ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover::after { right: 0; }

        ::selection { background: rgba(245,158,11,0.35); color: #F5F0E8; }

        @keyframes ripple-ring {
          from { transform: translate(-50%,-50%) scale(.04); opacity: .65; }
          to   { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50%     { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,48px)', height: 64,
        background: 'rgba(5,4,5,0.0)',
      }}>
        <Link to="/" className="cd" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.1em' }}>AEGISTRACE</Link>
        <div style={{ display: 'flex', gap: 'clamp(20px,3vw,36px)', alignItems: 'center' }}>
          <Link to="/portfolio" className="nav-link">Portfolio</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>Platform <ArrowRight size={13}/></Link>
        </div>
      </nav>

      {/* ── HERO — 3-beat dolly ── */}
      <PinnedScene vh="300vh" sceneRef={heroRef}>
        {/* BG parallax */}
        <motion.div aria-hidden style={{
          position: 'absolute', inset: '-20%',
          backgroundImage: `url('/assets/pages/mission-bg.jpg')`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          y: heroY, scale: heroScale,
        }}/>
        <motion.div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.03) 50%, transparent 100%)', y: overlayY }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,4,5,0.22) 0%, rgba(5,4,5,0.05) 35%, rgba(5,4,5,0.94) 100%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(5,4,5,0.72) 0%, rgba(5,4,5,0.25) 55%, transparent 100%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 8% 92%, rgba(245,158,11,0.14) 0%, transparent 65%)' }}/>

        {/* Beat 1 */}
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          opacity: b1Opacity, scale: b1Scale, filter: b1Filter,
          willChange: 'transform, opacity, filter',
          padding: '0 clamp(24px,5vw,72px) clamp(56px,8vh,96px)',
        }}>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: E }}
            className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 22, fontWeight: 600 }}>
            Our Mission
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 52 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.95, delay: 0.38, ease: E }}
            className="cd" style={{ fontSize: 'clamp(44px,7vw,88px)', fontWeight: 700, lineHeight: 0.93, letterSpacing: '-0.03em', color: '#F5F0E8', margin: '0 0 28px', maxWidth: 760, textWrap: 'balance' }}>
            Attackers no longer<br/>break in —<br/><span style={{ color: GOLD, textShadow: '0 0 40px rgba(245,158,11,0.28)' }}>they sign in.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.58, ease: E }}
            className="cg" style={{ fontSize: 'clamp(14px,1.6vw,17px)', color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, maxWidth: 480 }}>
            AegisTrace was built because the identity threat surface changed faster than the tools designed to monitor it.
          </motion.p>
        </motion.div>

        {/* Beat 2 */}
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          opacity: b2CombOp,
          scale: b2Scale, willChange: 'transform, opacity',
        }}>
          <h1 className="cd" style={{ fontSize: 'clamp(44px,7vw,96px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#F5F0E8', margin: 0, padding: '0 24px' }}>
            The trust layer for<br/><span style={{ color: GOLD, textShadow: '0 0 40px rgba(245,158,11,0.28)' }}>the AI-agent era.</span>
          </h1>
        </motion.div>

        {/* Beat 3 — grid lines materialise */}
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 9,
          opacity: b3Op, scale: b3Scale, willChange: 'transform, opacity',
          pointerEvents: 'none',
        }}>
          {/* Horizontal lines */}
          {[0.2, 0.4, 0.6, 0.8].map(pos => (
            <motion.div key={pos} aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, delay: pos * 0.4, ease: E }}
              style={{
                position: 'absolute', left: 0, right: 0, height: 1,
                top: `${pos * 100}%`,
                background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.08), transparent)',
                transformOrigin: 'left',
              }}
            />
          ))}
          {/* Vertical lines */}
          {[0.25, 0.5, 0.75].map(pos => (
            <motion.div key={pos} aria-hidden
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 1.4, delay: pos * 0.3, ease: E }}
              style={{
                position: 'absolute', top: 0, bottom: 0, width: 1,
                left: `${pos * 100}%`,
                background: 'linear-gradient(180deg, transparent, rgba(245,158,11,0.06), transparent)',
                transformOrigin: 'top',
              }}
            />
          ))}
        </motion.div>

        {/* Kicker */}
        <motion.div style={{
          position: 'absolute', left: 0, right: 0, bottom: '7vh', zIndex: 11,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          opacity: subOpacity,
        }}>
          <p className="cg" style={{ fontSize: 16, color: 'rgba(245,240,232,0.6)', maxWidth: 480, textAlign: 'center', margin: 0, padding: '0 24px' }}>
            Built inside a SOC, where the gaps were impossible to ignore.
          </p>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(245,240,232,0.35)' }}>SCROLL</span>
        </motion.div>
      </PinnedScene>

      {/* ── 83% STAT SCENE ── */}
      <Stat83Scene/>

      {/* ── ATTACK TIMELINE ── */}
      <AttackTimelineScene/>

      {/* ── ORIGIN STORY ── */}
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
                  AegisTrace is the tool that should have existed. Not a commercial platform with a 6-month procurement cycle. A focused, deployable SOC in one place — built by someone who uses this kind of tooling every day.
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

      {/* ── THE PROBLEM — 3D cards ── */}
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
                  Perimeter security assumes attackers need to break through a wall. They don't.
                </p>
              </div>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
              {[
                { n: '01', title: 'Credential theft is the leading initial access vector', body: 'Over 80% of breaches involve stolen or misused credentials. Traditional IDS tools are blind to normal-looking logins from stolen identities.' },
                { n: '02', title: 'Alert fatigue hides real threats in noise', body: 'SOC analysts spend more time dismissing false positives than investigating real incidents. Signal is buried in volume.' },
                { n: '03', title: 'AI agent sprawl creates invisible attack surfaces', body: 'Every unregistered AI agent is an identity without oversight. Shadow AI runs with service-account privileges nobody audited.' },
                { n: '04', title: 'Compliance reporting is still manual', body: 'DORA, NIS2, and GDPR reporting is assembled manually from scattered logs long after incidents close.' },
              ].map(({ n, title, body }, i) => (
                <ProblemCard3D key={n} n={n} title={title} body={body} delay={i * 0.08}/>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT'S DIFFERENT ── */}
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
                { title: 'Full case lifecycle',       body: 'Detection, investigation, evidence, IOC analysis, report — one platform, not five tools stitched together.' },
                { title: 'Every AI verdict is open', body: 'The AI shows the evidence it used and the reasoning it followed. You can challenge it.' },
                { title: 'Compliance built in',      body: 'DORA Article 19 reports generate from investigation data automatically.' },
                { title: 'Identity, not just logs',  body: 'AegisTrace reasons about identities across events — not individual log lines.' },
                { title: 'One analyst can run it',   body: 'Designed for small, capable teams. One person can deploy, investigate, and close a DORA report the same day.' },
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

      {/* ── WHO IS IT FOR ── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }}>
            <Reveal><span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 8, display: 'block' }}>Who it's for</span></Reveal>
            <div>
              <Reveal>
                <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 40px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
                  The analyst who builds<br/>as well as defends.
                </h2>
              </Reveal>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
                {[
                  { icon: Shield, title: 'SOC analysts',         body: 'Working in an environment where multiple tools need to be correlated manually. AegisTrace replaces the pivot — everything shares one timeline.' },
                  { icon: User,   title: 'Security engineers',   body: "Building detection capabilities on top of a stack that wasn't designed for identity threats. AegisTrace gives you a working base to extend." },
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

      {/* ── PRINCIPLES — 3D tilt ── */}
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

      {/* ── ROADMAP ── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Roadmap</span>
              <div>
                <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 12px', letterSpacing: '-0.03em' }}>Where we are.</h2>
                <p className="cg" style={{ fontSize: 14, color: 'rgba(245,240,232,0.36)', margin: 0 }}>Each item includes the reason it was built — because a roadmap without context is just a list.</p>
              </div>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(40px,5vw,64px)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
                  <div style={{ width: 28, height: 28, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(245,158,11,0.15)' }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: GOLD, fontWeight: 700 }}>v1</span>
                  </div>
                  <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: '#F5F0E8', letterSpacing: '-0.01em' }}>Foundation — Shipped</span>
                </div>
                {V1.map((item, i) => <RoadItem key={item.text} text={item.text} why={item.why} done delay={i * 0.03}/>)}
              </div>
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

      {/* ── CTA ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(96px,12vw,160px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        {[0, 1, 2].map(i => (
          <div key={i} aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', width: 500, height: 500, border: '1px solid rgba(245,158,11,0.06)', borderRadius: '50%', pointerEvents: 'none', animation: `ripple-ring ${4.5 + i * 1.8}s cubic-bezier(0,0,.8,1) ${i * 1.5}s infinite` }}/>
        ))}
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 className="cd" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.03em', lineHeight: 0.94, marginBottom: 22, textWrap: 'balance' }}>
            <SplitReveal text="Built by a practitioner," stagger={0.028}/>
            <br/>
            <SplitReveal text="for practitioners." stagger={0.028} delay={0.6}/>
          </h2>
          <Reveal delay={0.1}>
            <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.46)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 44px' }}>
              AegisTrace is not a commercial product. It is a proof of concept and a statement about what security tooling should be — accessible, auditable, and built by someone who works in this field.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/app/login" className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>Access Platform <ArrowRight size={16}/></Link>
              <Link to="/portfolio" className="ghost-btn" style={{ fontSize: 14, padding: '14px 26px' }}>About the Builder</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '32px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span className="cd" style={{ color: 'rgba(245,240,232,0.22)', fontSize: 13, letterSpacing: '0.08em' }}>AEGISTRACE</span>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <Link to="/" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Home</Link>
            <Link to="/portfolio" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Portfolio</Link>
            <Link to="/app/login" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Platform</Link>
          </div>
          <span className="cg" style={{ color: 'rgba(245,240,232,0.16)', fontSize: 11 }}>© 2026 Prasanna Kumar</span>
        </div>
      </footer>
    </div>
  );
}
