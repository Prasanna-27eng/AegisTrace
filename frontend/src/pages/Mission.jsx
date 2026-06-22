import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  motion, useScroll, useSpring, useTransform,
  useMotionValueEvent, useInView, useReducedMotion, useMotionValue,
} from 'framer-motion';
import {
  ArrowRight, Shield, Brain, Fingerprint,
  CheckCircle, Clock, Zap, Eye, Layers, ShieldCheck,
  User, ShieldOff, UserCheck, Share2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useSceneCamera, useSectionParallax,
  PinnedScene, RackFocus, ScrollProgressBar,
} from '../components/SceneController';

const E    = [0.16, 1, 0.3, 1];
const EOUT = [0.23, 1, 0.32, 1];
const GOLD = '#F59E0B';
const BG   = '#050505';
const INK  = '#BDD4E8';


/* ─── Mobile hook ───────────────────────────────────────────────────────── */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return m;
}

/* ─── Reveal ────────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 28, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.78, delay, ease: E }} style={style}
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
    const embers = Array.from({ length: 44 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6,
      v: 0.07 + Math.random() * 0.2, ph: Math.random() * 6.28, gold: Math.random() < 0.38,
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
        const a = still ? 0.18 : 0.07 + 0.13 * (0.5 + 0.5 * Math.sin(t * 1.1 + e.ph));
        ctx.fillStyle = e.gold ? `rgba(245,158,11,${a * 1.25})` : `rgba(189,212,232,${a})`;
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

/* ─── Roadmap item ──────────────────────────────────────────────────────── */
function RoadItem({ text, why, done = false, active = false, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  const color  = done ? GOLD : active ? '#FBBF24' : 'rgba(189,212,232,0.22)';
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: -8 }} animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.58, delay, ease: E }}
      style={{ padding: '12px 0', borderBottom: '1px solid rgba(189,212,232,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flexShrink: 0, marginTop: 3 }}>
          {done   ? <CheckCircle size={13} color={GOLD} style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' }}/>
          : active ? <Clock size={13} color="#FBBF24"/>
          : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid rgba(189,212,232,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(189,212,232,0.18)' }}/></div>}
        </div>
        <div>
          <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13.5, color, lineHeight: 1.6, display: 'block' }}>{text}</span>
          {why && <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 11.5, color: 'rgba(189,212,232,0.26)', lineHeight: 1.55, display: 'block', marginTop: 3 }}>{why}</span>}
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 1 — HERO  (3-beat dolly zoom + grid materialise)
════════════════════════════════════════════════════════════════════════════ */
function HeroScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgMX   = useSpring(mouseX, { stiffness: 38, damping: 13 });
  const bgMY   = useSpring(mouseY, { stiffness: 38, damping: 13 });
  const bgDX   = useTransform(bgMX, v => v * 10);
  const bgDY   = useTransform(bgMY, v => v * 7);

  useEffect(() => {
    const fn = e => { mouseX.set((e.clientX / window.innerWidth) - 0.5); mouseY.set((e.clientY / window.innerHeight) - 0.5); };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, [mouseX, mouseY]);

  /* Dolly zoom layers */
  const bgDollyScale  = useTransform(p, [0, 0.46], [1.08, 3.8]);
  const bgDollyBlur   = useTransform(p, [0.28, 0.48], [0, 22], { clamp: true });
  const bgDollyFilt   = useTransform(bgDollyBlur, v => `blur(${v}px)`);
  const bgDollyOp     = useTransform(p, [0.36, 0.54], [1, 0], { clamp: true });

  /* Beat 1: heading — camera rushes through it */
  const b1Op    = useTransform(p, [0.26, 0.46], [1, 0], { clamp: true });
  const b1Scale = useTransform(p, [0, 0.46], [1, 1.38]);
  const b1BPx   = useTransform(p, [0.30, 0.46], [0, 14], { clamp: true });
  const b1Filt  = useTransform(b1BPx, v => `blur(${v}px)`);

  /* Beat 2: new headline zooms from depth */
  const b2CombOp = useTransform(p, v => {
    const i = Math.min(1, Math.max(0, (v - 0.44) / 0.18));
    const o = Math.min(1, Math.max(0, 1 - (v - 0.84) / 0.12));
    return i * o;
  });
  const b2Scale = useTransform(p, [0.42, 0.70], [0.48, 1], { clamp: true });
  const b2BPx   = useTransform(p, [0.44, 0.64], [16, 0], { clamp: true });
  const b2Filt  = useTransform(b2BPx, v => `blur(${v}px)`);

  /* Beat 3: security grid materialises */
  const b3Op    = useTransform(p, [0.82, 0.93], [0, 1], { clamp: true });
  const b3Scale = useTransform(p, [0.80, 0.96], [0.90, 1], { clamp: true });

  /* Kicker */
  const kickOp = useTransform(p, [0.72, 0.86], [0, 1], { clamp: true });
  const kickY  = useTransform(kickOp, o => (1 - o) * 18);

  return (
    <PinnedScene vh="320vh" sceneRef={ref}>
      {/* Far background — CSS gradient dolly (no image) */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-16%',
        background: 'linear-gradient(135deg, #050505 0%, #080818 35%, #0A1428 65%, #0F1E3E 100%)',
        scale: bgDollyScale, x: bgDX, y: bgDY,
        filter: bgDollyFilt, opacity: bgDollyOp,
        willChange: 'transform, opacity, filter',
      }}/>
      {/* Mid overlay — moves at different rate (depth) */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(5,5,5,0.22) 0%, rgba(5,5,5,0.06) 36%, rgba(5,5,5,0.94) 100%)',
        x: useTransform(bgDX, v => v * 0.35),
        y: useTransform(bgDY, v => v * 0.35),
      }}/>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(5,5,5,0.7) 0%, rgba(5,5,5,0.22) 55%, transparent 100%)' }}/>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 38% at 8% 94%, rgba(245,158,11,0.13) 0%, transparent 64%)' }}/>

      {/* Beat 1 */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        opacity: b1Op, scale: b1Scale, filter: b1Filt, willChange: 'transform, opacity, filter',
        padding: '0 clamp(24px,5vw,72px) clamp(52px,8vh,90px)',
      }}>
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.66, delay: 0.3, ease: E }}
          className="cg" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.26em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 600 }}>
          Our Mission
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.92, delay: 0.42, ease: E }}
          className="cd" style={{ fontSize: 'clamp(40px,6.5vw,84px)', fontWeight: 700, lineHeight: 0.94, letterSpacing: '-0.03em', color: INK, margin: '0 0 24px', maxWidth: 740 }}>
          Autonomous systems deserve<br/><span style={{ color: GOLD, textShadow: '0 0 36px rgba(245,158,11,0.25)' }}>accountable security.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.80, delay: 0.60, ease: E }}
          className="cg" style={{ fontSize: 'clamp(14px,1.5vw,17px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.7, maxWidth: 520 }}>
          We believe every identity must be scored, every decision explained, every action reversible.
        </motion.p>
      </motion.div>

      {/* Beat 2 */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        opacity: b2CombOp, scale: b2Scale, filter: b2Filt, willChange: 'transform, opacity, filter',
      }}>
        <h1 className="cd" style={{ fontSize: 'clamp(40px,6.5vw,92px)', fontWeight: 700, lineHeight: 0.96, letterSpacing: '-0.03em', color: INK, margin: 0, padding: '0 24px' }}>
          The trust layer for<br/><span style={{ color: GOLD, textShadow: '0 0 36px rgba(245,158,11,0.25)' }}>the AI-agent era.</span>
        </h1>
      </motion.div>

      {/* Beat 3 — grid materialises */}
      <motion.div style={{
        position: 'absolute', inset: 0, zIndex: 9, opacity: b3Op, scale: b3Scale,
        willChange: 'transform, opacity', pointerEvents: 'none',
      }}>
        {[0.2, 0.4, 0.6, 0.8].map(pos => (
          <motion.div key={pos} aria-hidden
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 1.3, delay: pos * 0.35, ease: EOUT }}
            style={{ position: 'absolute', left: 0, right: 0, height: 1, top: `${pos * 100}%`, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.07), transparent)', transformOrigin: 'left' }}
          />
        ))}
        {[0.2, 0.5, 0.8].map(pos => (
          <motion.div key={pos} aria-hidden
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
            transition={{ duration: 1.5, delay: pos * 0.25, ease: EOUT }}
            style={{ position: 'absolute', top: 0, bottom: 0, width: 1, left: `${pos * 100}%`, background: 'linear-gradient(180deg, transparent, rgba(245,158,11,0.05), transparent)', transformOrigin: 'top' }}
          />
        ))}
      </motion.div>

      {/* Kicker */}
      <motion.div style={{
        position: 'absolute', left: 0, right: 0, bottom: '7vh', zIndex: 11,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        opacity: kickOp, y: kickY,
      }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.32em', color: 'rgba(189,212,232,0.3)' }}>SCROLL</span>
      </motion.div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 2 — 83% STAT  with concentric ring pulse
════════════════════════════════════════════════════════════════════════════ */
function Stat83Scene() {
  const ref     = useRef(null);
  const isMobile = useIsMobile();
  const reduced  = useReducedMotion();
  const p = useSceneCamera(ref);

  const [count, setCount] = useState(0);
  const [fired, setFired] = useState(false);
  useMotionValueEvent(p, 'change', v => {
    const c = Math.round(Math.max(0, Math.min(1, (v - 0.08) / 0.44)) * 83);
    setCount(c);
    if (c >= 83 && !fired) setFired(true);
  });

  const statOp  = useTransform(p, [0.02, 0.20], [0, 1], { clamp: true });
  const statY   = useTransform(statOp, o => (1 - o) * 60);
  const capOp   = useTransform(p, [0.44, 0.62], [0, 1], { clamp: true });

  /* 3-layer parallax depth on the dot grid */
  const dotsFarY = useTransform(p, [0, 1], ['-36px', '36px']);
  const dotsFarX = useTransform(p, [0, 1], ['-10px', '10px']);
  const glowMidY = useTransform(p, [0, 1], ['-60px', '60px']);

  if (isMobile || reduced) {
    return (
      <section style={{ padding: 'clamp(60px,10vw,96px) clamp(24px,5vw,72px)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <span className="mono" style={{ fontSize: 'clamp(80px,20vw,140px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>83</span>
          <span className="mono" style={{ fontSize: 'clamp(40px,9vw,64px)', fontWeight: 700, color: 'rgba(189,212,232,0.38)', lineHeight: 1 }}>%</span>
        </div>
        <p className="cg" style={{ fontSize: 17, color: 'rgba(189,212,232,0.58)', maxWidth: 440, margin: '20px auto 0', lineHeight: 1.68 }}>
          of breaches involve <strong style={{ color: INK }}>stolen credentials or identity abuse.</strong>
        </p>
      </section>
    );
  }

  return (
    <PinnedScene vh="280vh" sceneRef={ref}>
      {/* Far layer: dot grid with 3-layer parallax */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-120px 0',
        backgroundImage: 'radial-gradient(circle, rgba(189,212,232,0.16) 1.5px, transparent 1.5px)',
        backgroundSize: '30px 30px',
        y: dotsFarY, x: dotsFarX, opacity: 0.22, willChange: 'transform',
      }}/>
      {/* Mid layer: gold glow */}
      <motion.div aria-hidden style={{
        position: 'absolute', width: '60vw', height: '60vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
        y: glowMidY, willChange: 'transform',
      }}/>

      {/* Concentric ring pulse when counter hits 83 */}
      {fired && [0, 1, 2, 3].map(i => (
        <motion.div key={i} aria-hidden
          initial={{ scale: 0.1, opacity: 0.65 }}
          animate={{ scale: 4.5, opacity: 0 }}
          transition={{ duration: 2.6, delay: i * 0.55, ease: [0, 0, 0.6, 1], repeat: Infinity, repeatDelay: 1.0 }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 180, height: 180, marginLeft: -90, marginTop: -90,
            borderRadius: '50%', border: '1px solid rgba(245,158,11,0.5)',
            pointerEvents: 'none', willChange: 'transform, opacity',
          }}
        />
      ))}

      {/* Near layer: stat number */}
      <motion.div style={{
        position: 'relative', zIndex: 3, textAlign: 'center', padding: '0 24px',
        opacity: statOp, y: statY, willChange: 'transform, opacity',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
          <motion.span className="mono" style={{
            fontSize: 'clamp(100px,17vw,240px)', fontWeight: 700, lineHeight: 1, color: GOLD,
            textShadow: fired ? '0 0 80px rgba(245,158,11,0.38)' : 'none',
            transition: 'text-shadow 600ms ease',
          }}>{count}</motion.span>
          <span className="mono" style={{ fontSize: 'clamp(46px,7vw,106px)', fontWeight: 700, color: 'rgba(189,212,232,0.38)', lineHeight: 1 }}>%</span>
        </div>
        <motion.p className="cg" style={{ fontSize: 19, fontWeight: 500, color: 'rgba(189,212,232,0.58)', maxWidth: 500, margin: '22px auto 0', opacity: capOp }}>
          of breaches involve <strong style={{ color: INK }}>stolen credentials or identity abuse.</strong> The perimeter is whoever you trust.
        </motion.p>
      </motion.div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 3 — ATTACK TIMELINE  (horizontal truck/dolly)
════════════════════════════════════════════════════════════════════════════ */
const ATTACK_STAGES = [
  { icon: ShieldOff, step: '01', event: 'Credential Stolen', detail: 'Phishing email. Password reused. Token extracted from memory. The attacker has a key.', color: 'rgba(239,68,68,0.9)', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.16)' },
  { icon: UserCheck, step: '02', event: 'Access Granted', detail: 'Login from Berlin. 3:14 AM. User is asleep in Dublin. SIEM fires one alert. It is dismissed.', color: 'rgba(249,115,22,0.9)', bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.16)' },
  { icon: Share2, step: '03', event: 'Lateral Movement', detail: 'Privilege escalation via misconfigured service account. 47 files accessed. Exfil begins.', color: 'rgba(234,179,8,0.9)', bg: 'rgba(234,179,8,0.05)', border: 'rgba(234,179,8,0.16)' },
  { icon: Shield, step: '04', event: 'Detected by AegisTrace', detail: 'Impossible travel. Off-hours access. Privilege spike. Identity graph anomaly. Case #AT-2847 opened.', color: GOLD, bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.24)' },
];

function AttackTimelineScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref, { smooth: false });

  /* Camera trucks right — near cards shift more, far BG shifts less */
  const cardsX   = useTransform(p, [0.04, 0.96], ['0%', '-58%']);
  const bgX      = useTransform(p, [0.04, 0.96], ['0px', '-18px']);
  const lineW    = useTransform(p, [0.04, 0.96], ['0%', '100%']);
  const labelOp  = useTransform(p, [0, 0.05, 0.93, 1], [0, 1, 1, 0]);
  const progressW = useTransform(p, [0.04, 0.96], ['0%', '100%']);

  return (
    <PinnedScene vh="340vh" sceneRef={ref}>
      {/* Far: subtle grid barely moves */}
      <motion.div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(189,212,232,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(189,212,232,0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        x: bgX, pointerEvents: 'none',
      }}/>

      {/* Header */}
      <motion.div style={{
        position: 'absolute', top: '7vh', left: 'clamp(24px,5vw,72px)', right: 0, zIndex: 4, opacity: labelOp,
      }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.26em', color: 'rgba(189,212,232,0.3)', marginBottom: 6 }}>HOW EVERY BREACH UNFOLDS</div>
        <div className="cd" style={{ fontSize: 'clamp(18px,2vw,26px)', fontWeight: 600, color: INK }}>The anatomy of an identity attack.</div>
        <div style={{ marginTop: 14, width: 160, height: 1, background: 'rgba(189,212,232,0.08)', position: 'relative' }}>
          <motion.div style={{ position: 'absolute', inset: 0, background: GOLD, width: progressW }}/>
        </div>
      </motion.div>

      {/* Connector line */}
      <div style={{ position: 'absolute', top: '50%', left: 'clamp(24px,5vw,72px)', right: 0, height: 1, background: 'rgba(241,245,249,0.06)', zIndex: 1 }}>
        <motion.div style={{ position: 'absolute', inset: 0, background: GOLD, width: lineW, opacity: 0.35 }}/>
      </div>

      {/* Card rail — near layer, trucks more */}
      <motion.div style={{
        display: 'flex', gap: 'clamp(16px,2.5vw,32px)',
        x: cardsX, willChange: 'transform',
        position: 'absolute', left: 'clamp(24px,5vw,72px)', top: '50%',
        transform: 'translateY(-50%)', width: 'max-content', zIndex: 2, paddingTop: 40,
      }}>
        {ATTACK_STAGES.map((stage, i) => {
          const Icon = stage.icon;
          return (
            <motion.div key={stage.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.58, delay: i * 0.07, ease: E }}
              style={{
                width: 'clamp(220px,24vw,340px)', flexShrink: 0,
                background: stage.bg, border: `1px solid ${stage.border}`,
                padding: 'clamp(20px,2.5vw,30px)', position: 'relative', overflow: 'hidden',
              }}
            >
              <div className="mono" style={{ fontSize: 10, color: stage.color, letterSpacing: '0.18em', marginBottom: 18, opacity: 0.8 }}>STEP {stage.step}</div>
              <div style={{ width: 40, height: 40, background: `rgba(0,0,0,0.2)`, border: `1px solid ${stage.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Icon size={18} color={stage.color} style={{ filter: `drop-shadow(0 0 5px ${stage.color})` }}/>
              </div>
              <div className="cd" style={{ fontSize: 'clamp(14px,1.4vw,20px)', fontWeight: 600, color: INK, marginBottom: 10, lineHeight: 1.2 }}>{stage.event}</div>
              <div className="cg" style={{ fontSize: 13, color: 'rgba(189,212,232,0.5)', lineHeight: 1.64 }}>{stage.detail}</div>
              <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: stage.color, opacity: 0.38 }}/>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div style={{ position: 'absolute', bottom: '6vh', left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: useTransform(p, [0, 0.06, 0.92, 1], [0, 0.4, 0.4, 0]) }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(189,212,232,0.3)' }}>PAN →</span>
      </motion.div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 4 — EVIDENCE RACK FOCUS
════════════════════════════════════════════════════════════════════════════ */
const PROBLEMS = [
  { n: '01', title: 'Credential theft is the leading initial access vector', body: 'Over 80% of breaches involve stolen or misused credentials. Traditional IDS tools are blind to normal-looking logins from stolen identities.', focusAt: 0.12 },
  { n: '02', title: 'Alert fatigue hides real threats in noise', body: 'SOC analysts spend more time dismissing false positives than investigating real incidents. Signal is buried in volume.', focusAt: 0.38 },
  { n: '03', title: 'AI agent sprawl creates invisible attack surfaces', body: 'Every unregistered AI agent is an identity without oversight. Shadow AI runs with service-account privileges nobody audited.', focusAt: 0.64 },
  { n: '04', title: 'Compliance reporting is still manual', body: 'DORA, NIS2, and GDPR reporting is assembled from scattered logs long after incidents close. Deadlines are missed.', focusAt: 0.88 },
];

function EvidenceScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);
  const labelOp = useTransform(p, [0, 0.05, 0.92, 1], [0, 1, 1, 0]);

  return (
    <PinnedScene vh="320vh" sceneRef={ref}>
      <motion.div style={{
        position: 'absolute', top: '7vh', left: 'clamp(24px,5vw,72px)', right: 'clamp(24px,5vw,72px)',
        zIndex: 4, opacity: labelOp,
      }}>
        <div className="cd" style={{ fontSize: 'clamp(18px,2.2vw,28px)', fontWeight: 600, color: INK }}>Modern attacks are an identity problem first.</div>
      </motion.div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 2, width: '100%',
        padding: '0 clamp(24px,5vw,72px)',
        maxWidth: 1100, margin: '0 auto',
      }}>
        {PROBLEMS.map(prob => (
          <RackFocus key={prob.n} p={p} focusAt={prob.focusAt} window={0.24} maxBlur={9} minOp={0.18}>
            <div style={{
              background: 'rgba(189,212,232,0.025)',
              border: '1px solid rgba(189,212,232,0.07)',
              padding: 'clamp(20px,2.5vw,32px)', height: '100%',
            }}>
              <div className="mono" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.14em', marginBottom: 14 }}>{prob.n}</div>
              <div className="cd" style={{ fontSize: 'clamp(14px,1.4vw,18px)', fontWeight: 600, color: INK, marginBottom: 10, lineHeight: 1.28 }}>{prob.title}</div>
              <div className="cg" style={{ fontSize: 13.5, color: 'rgba(189,212,232,0.46)', lineHeight: 1.68 }}>{prob.body}</div>
            </div>
          </RackFocus>
        ))}
      </div>
    </PinnedScene>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   EDITORIAL CONTENT
════════════════════════════════════════════════════════════════════════════ */
function OriginSection() {
  const ref = useRef(null);
  const p   = useSectionParallax(ref);
  const bgY = useTransform(p, [0, 1], ['-5%', '5%']);

  return (
    <section ref={ref} style={{ padding: 'clamp(80px,10vw,130px) clamp(24px,5vw,72px)', background: '#0A0A18', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(189,212,232,0.05)' }}>
      <motion.div aria-hidden style={{ position: 'absolute', inset: '-8%', background: 'radial-gradient(ellipse 50% 60% at 30% 50%, rgba(245,158,11,0.04) 0%, transparent 70%)', y: bgY, pointerEvents: 'none' }}/>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(140px,18vw,220px) 1fr', gap: 'clamp(32px,5vw,72px)', alignItems: 'start' }}>
          <Reveal><span className="cg" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 6, display: 'block' }}>Origin Story</span></Reveal>
          <div>
            <Reveal><h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,48px)', fontWeight: 700, color: INK, margin: '0 0 22px', letterSpacing: '-0.025em', lineHeight: 1.04 }}>A SOC Analyst's Answer to an Impossible Question</h2></Reveal>
            <Reveal delay={0.07}>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 22, maxWidth: 640 }}>
                I'm Prasanna — a blue team SOC analyst in Dublin.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 22, maxWidth: 640 }}>
                For years, I watched the same pattern play out in incident reviews. An alert fires.
                An analyst triages. A case opens. And then the question nobody can answer:
              </p>
              <p className="cg" style={{ fontSize: 'clamp(15px,1.4vw,17px)', color: INK, lineHeight: 1.7, marginBottom: 22, maxWidth: 640, fontStyle: 'italic', borderLeft: `3px solid ${GOLD}`, paddingLeft: 20 }}>
                "Why did the system allow this?"
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 22, maxWidth: 640 }}>
                Not "what happened" — we have logs for that. But "why did the system, at that
                moment, decide this action was acceptable?"
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 22, maxWidth: 640 }}>
                When AI agents entered the picture, the question got louder. Agents approving
                transactions. Agents accessing data. Agents making decisions in milliseconds that
                used to take humans hours. And still — no platform could answer the question.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 22, maxWidth: 640 }}>
                SIEMs log events. EDRs protect endpoints. Firewalls block traffic. None of them
                were built to answer "why did the AI decide this?" None of them were built to
                track the trust relationships between 144 machine identities for every human
                employee. None of them were built to preserve human control in a world where
                machines act autonomously.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 22, maxWidth: 640 }}>
                So I started building AegisTrace. Not as a startup pitch. Not as a product
                roadmap. As an answer to a question I couldn't stop asking:
              </p>
              <p className="cg" style={{ fontSize: 'clamp(15px,1.4vw,17px)', color: INK, lineHeight: 1.7, marginBottom: 28, maxWidth: 640, fontStyle: 'italic', borderLeft: `3px solid ${GOLD}`, paddingLeft: 20 }}>
                "Which identity, agent, workflow, or prompt caused this breach — and can I
                trust the AI's conclusion?"
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.16)', padding: '20px 24px', maxWidth: 560 }}>
                <p className="cg" style={{ fontSize: 15, color: INK, lineHeight: 1.68, margin: 0, fontStyle: 'italic' }}>
                  "Autonomous AI needs accountable security. AegisTrace is how you deliver it."
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrinciplesSection() {
  const CONVICTIONS = [
    {
      num: '01',
      title: 'Every Identity Must Be a First-Class Security Entity',
      body: '83% of breaches involve stolen credentials or identity abuse. The network is no longer the boundary — identity is. Every user, service account, API key, AI agent, and token must be tracked, scored, and monitored in real time. Not as a log entry. As a first-class entity with a risk score, a trust history, and an anomaly count.',
    },
    {
      num: '02',
      title: 'Black-Box AI Is Unacceptable in Security',
      body: "When an AI system tells a SOC analyst \"this is a critical threat,\" the analyst needs to know four things: What evidence? What reasoning? What confidence? What could be wrong? If the AI can't answer those four questions, it doesn't get to make the call. Every AegisTrace verdict ships with all four answers. No exceptions.",
    },
    {
      num: '03',
      title: "Autonomous Doesn't Mean Unaccountable",
      body: 'AI suggests. Humans confirm. Every automated action in AegisTrace — case closure, endpoint isolation, report generation, IOC enrichment, playbook execution — passes through an approval layer. Every decision logged to the Provenance Ledger with full reversibility. Automation without accountability is just liability.',
    },
  ];

  return (
    <section style={{ padding: 'clamp(80px,10vw,130px) clamp(24px,5vw,72px)', background: '#0A0A18', borderTop: '1px solid rgba(189,212,232,0.05)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 56 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(140px,18vw,220px) 1fr', gap: 'clamp(32px,5vw,72px)', alignItems: 'baseline' }}>
            <span className="cg" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600 }}>Convictions</span>
            <h2 className="cd" style={{ fontSize: 'clamp(24px,3.2vw,46px)', fontWeight: 700, color: INK, margin: 0, letterSpacing: '-0.025em' }}>Three Convictions That Drive Every Design Decision</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(140px,18vw,220px) 1fr', gap: 'clamp(32px,5vw,72px)' }}>
          <div/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {CONVICTIONS.map(({ num, title, body }, i) => (
              <Reveal key={num} delay={i * 0.08} y={20}>
                <div style={{ padding: 'clamp(28px,3vw,40px)', background: 'rgba(189,212,232,0.02)', border: '1px solid rgba(189,212,232,0.07)', borderLeft: `3px solid ${GOLD}` }}>
                  <div className="mono" style={{ fontSize: 12, color: GOLD, letterSpacing: '0.14em', marginBottom: 16, opacity: 0.9 }}>{num}</div>
                  <div className="cd" style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 14, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{title}</div>
                  <div className="cg" style={{ fontSize: 15, color: 'rgba(189,212,232,0.54)', lineHeight: 1.72 }}>{body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Philosophy Section ────────────────────────────────────────────────── */
function PhilosophySection() {
  const ref = useRef(null);
  const p   = useSectionParallax(ref);
  const bgY = useTransform(p, [0, 1], ['-4%', '4%']);

  return (
    <section ref={ref} style={{ padding: 'clamp(80px,10vw,130px) clamp(24px,5vw,72px)', background: BG, position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(189,212,232,0.05)' }}>
      <motion.div aria-hidden style={{ position: 'absolute', inset: '-8%', background: 'radial-gradient(ellipse 40% 50% at 70% 50%, rgba(245,158,11,0.03) 0%, transparent 70%)', y: bgY, pointerEvents: 'none' }}/>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(140px,18vw,220px) 1fr', gap: 'clamp(32px,5vw,72px)', alignItems: 'start' }}>
          <Reveal><span className="cg" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 6, display: 'block' }}>Philosophy</span></Reveal>
          <div>
            <Reveal><h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,48px)', fontWeight: 700, color: INK, margin: '0 0 28px', letterSpacing: '-0.025em', lineHeight: 1.04 }}>Not a SIEM. Not an EDR. Accountability Infrastructure.</h2></Reveal>
            <Reveal delay={0.07}>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 18, maxWidth: 640 }}>
                The security industry keeps bolting new capabilities onto old architectures.
                Add AI to the SIEM. Add identity to the EDR. Add SOAR to the XDR.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 18, maxWidth: 640 }}>
                AegisTrace was built from day one as accountability infrastructure — a platform
                where identity scoring, explainability, and human control are not features.
                They are the foundation.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 18, maxWidth: 640 }}>
                Every module was designed around one question:{' '}
                <em style={{ color: INK }}>"Does this strengthen or weaken the accountability surface?"</em>
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 18, maxWidth: 640 }}>
                The result is a platform that doesn't just detect threats — it reconstructs them.
                Doesn't just respond — it learns. Doesn't just log — it explains.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 28, maxWidth: 640 }}>
                When a regulator asks "what happened," you don't show them a log.
                You show them a narrative — with evidence, reasoning, and confidence scores
                attached to every claim.
              </p>
            </Reveal>
            <Reveal delay={0.14}>
              <div style={{ background: 'rgba(189,212,232,0.03)', border: '1px solid rgba(189,212,232,0.08)', padding: '16px 20px', maxWidth: 560, display: 'inline-block' }}>
                <span className="mono" style={{ fontSize: 12, color: GOLD, letterSpacing: '0.1em' }}>That's the difference between a SIEM and accountability infrastructure.</span>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Version badge ─────────────────────────────────────────────────────── */
function VerBadge({ v, label, active = false, done = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? 'rgba(245,158,11,0.12)' : active ? 'rgba(189,212,232,0.04)' : 'rgba(189,212,232,0.02)',
        border: done ? '1px solid rgba(245,158,11,0.24)' : active ? '1px solid rgba(189,212,232,0.1)' : '1px solid rgba(189,212,232,0.05)',
        boxShadow: done ? '0 0 10px rgba(245,158,11,0.14)' : 'none',
      }}>
        <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: done ? GOLD : active ? 'rgba(189,212,232,0.5)' : 'rgba(189,212,232,0.24)' }}>{v}</span>
      </div>
      <span className="cd" style={{ fontSize: 13, fontWeight: 600, color: done ? INK : active ? INK : 'rgba(189,212,232,0.36)' }}>{label}</span>
    </div>
  );
}

function RoadmapSection() {
  const V1_ITEMS = [
    'Core accountability infrastructure: Identity Graph, ITDR (6 detectors), Explainable AI,',
    'Human Approval Queue, Endpoint Agent v6.1, Temporal Linker, SOAR Playbooks,',
    'Adaptive Thresholds, Auto-Rule Generation Trigger, Trust Score Trending.',
    'Grassroots Security Toolkit (5 PyPI packages). Two independent security audits.',
    'DPDPA 2023 compliance reports. ITDR email notifications. Identity Graph click panel.',
  ];

  const V2 = [
    { text: 'SHA-256 hash chain on ProvenanceLedger — every AI decision cryptographically linked. Trust Certificate export for DORA Article 19.', done: true },
    { text: 'AFSL File Security — magic byte verification, ChaCha20-Poly1305 encryption at rest, decompression bomb detection, subprocess sandbox.', done: true },
    { text: 'ATSP Protocol Library — formally verifiable secure telemetry protocol. X25519 + HKDF + ChaCha20-Poly1305, Noise_XX handshake, 4 security properties proved with ProVerif. 17/17 tests pass.', done: true },
    { text: 'SCIM identity sync for enterprise push-based provisioning.' },
    { text: 'Agent Supervision Console with per-agent kill switches and task-scope enforcement.' },
    { text: 'Attacker Path Reconstruction across human + machine actors.' },
  ];
  const V3 = [
    { text: 'Federated accountability across multiple deployments.' },
    { text: 'MCP Guard full sandbox with behavioural analysis.' },
    { text: 'Endpoint Agent eBPF (Layer 3) + memory forensics (Layer 4).' },
    { text: 'Community module marketplace for detection rules and playbooks.' },
  ];

  return (
    <section style={{ padding: 'clamp(80px,10vw,130px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(189,212,232,0.05)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>

        <Reveal style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,50px)', fontWeight: 700, color: INK, margin: 0, letterSpacing: '-0.025em' }}>From Solo Project to Industry Standard</h2>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <VerBadge v="v1" label="Shipped" done/>
              <VerBadge v="v2" label="In Progress" active/>
              <VerBadge v="v3" label="Planned"/>
            </div>
          </div>
        </Reveal>

        <Reveal style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <CheckCircle size={14} color={GOLD} style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' }}/>
            <span className="cd" style={{ fontSize: 15, fontWeight: 600, color: INK }}>v1 — Foundation (NOW · v10.x) — SHIPPED</span>
          </div>
          <div style={{ background: 'rgba(189,212,232,0.02)', border: '1px solid rgba(245,158,11,0.12)', borderLeft: `3px solid ${GOLD}`, padding: 'clamp(20px,2.5vw,32px)' }}>
            {V1_ITEMS.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < V1_ITEMS.length - 1 ? 8 : 0 }}>
                <span style={{ color: GOLD, fontSize: 10, marginTop: 5, flexShrink: 0 }}>✓</span>
                <span className="cg" style={{ fontSize: 13.5, color: 'rgba(189,212,232,0.58)', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 'clamp(24px,4vw,48px)' }}>
          <div>
            <Reveal>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(189,212,232,0.07)' }}>
                <Clock size={13} color="#FBBF24"/>
                <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: INK }}>v2 — Enterprise (2026 H2) — IN PROGRESS</span>
              </div>
            </Reveal>
            {V2.map((item, i) => <RoadItem key={item.text} {...item} done={false} delay={i * 0.05}/>)}
          </div>
          <div>
            <Reveal>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(189,212,232,0.07)' }}>
                <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1px solid rgba(189,212,232,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(189,212,232,0.18)' }}/></div>
                <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(189,212,232,0.38)' }}>v3 — Platform (2027) — PLANNED</span>
              </div>
            </Reveal>
            {V3.map((item, i) => <RoadItem key={item.text} {...item} done={false} delay={i * 0.05}/>)}
          </div>
        </div>

      </div>
    </section>
  );
}

/* ─── Enterprise Philosophy / Who It's For ──────────────────────────────── */
function EnterpriseSection() {
  const AUDIENCE = [
    {
      icon: User,
      label: 'SOC Analysts',
      body: 'The 15-tab case workspace, ITDR engine, and threat hunt console were built for analysts who work live incidents, not demo environments.',
    },
    {
      icon: Layers,
      label: 'Security Engineers',
      body: 'The full stack is open, self-hostable, and extensible. Build your own detectors, write your own playbooks, integrate your own data sources.',
    },
    {
      icon: ShieldCheck,
      label: 'CISOs & Compliance Teams',
      body: 'Multi-tenant, org-scoped, audit-ready. DORA Article 19, DPDPA, and RBI reporting generated from the Provenance Ledger — not assembled manually.',
    },
  ];

  return (
    <section style={{ padding: 'clamp(80px,10vw,130px) clamp(24px,5vw,72px)', background: '#0A0A18', borderTop: '1px solid rgba(189,212,232,0.05)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(140px,18vw,220px) 1fr', gap: 'clamp(32px,5vw,72px)', alignItems: 'start' }}>
          <Reveal><span className="cg" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 6, display: 'block' }}>Who It's For</span></Reveal>
          <div>
            <Reveal><h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,48px)', fontWeight: 700, color: INK, margin: '0 0 22px', letterSpacing: '-0.025em', lineHeight: 1.04 }}>Self-Hostable. Multi-Tenant. Built for Regulated Industries.</h2></Reveal>
            <Reveal delay={0.07}>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 18, maxWidth: 600 }}>
                AegisTrace is self-hostable. Your data never leaves your network.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 18, maxWidth: 600 }}>
                This isn't a deployment option. It's a conviction.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 18, maxWidth: 600 }}>
                The teams defending critical infrastructure — financial services, healthcare,
                government, energy — deserve platforms they can audit, modify, and trust.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: 'rgba(189,212,232,0.56)', lineHeight: 1.78, marginBottom: 28, maxWidth: 600 }}>
                We fund development through enterprise contracts, consulting, and the goodwill
                of a community that believes in the mission.
              </p>
              <p className="cg" style={{ fontSize: 'clamp(14px,1.3vw,16px)', color: INK, lineHeight: 1.78, marginBottom: 36, maxWidth: 600, fontStyle: 'italic' }}>
                Deploy it. Break it. Improve it. Send the pull request.
              </p>
            </Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 2 }}>
              {AUDIENCE.map(({ icon: Icon, label, body }, i) => (
                <Reveal key={label} delay={i * 0.06} y={20}>
                  <div style={{ padding: 'clamp(18px,2vw,26px)', background: 'rgba(189,212,232,0.02)', border: '1px solid rgba(189,212,232,0.07)', height: '100%' }}>
                    <Icon size={18} color={GOLD} style={{ marginBottom: 14, opacity: 0.8 }}/>
                    <div className="cd" style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 8, letterSpacing: '-0.01em' }}>{label}</div>
                    <div className="cg" style={{ fontSize: 13, color: 'rgba(189,212,232,0.44)', lineHeight: 1.68 }}>{body}</div>
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

/* ─── NAV ────────────────────────────────────────────────────────────────── */
function Nav() {
  const { scrollY } = useScroll();
  const navBg     = useTransform(scrollY, [0, 80], ['rgba(5,5,5,0)', 'rgba(5,5,5,0.96)']);
  const navBlur   = useTransform(scrollY, [0, 80], [0, 18]);
  const navFilter = useTransform(navBlur, v => `blur(${v}px)`);

  return (
    <motion.nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(20px,4vw,48px)', height: 64,
      background: navBg, backdropFilter: navFilter, WebkitBackdropFilter: navFilter,
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/assets/brand/aegistrace-icon-transparent.png" alt="AegisTrace" style={{ width: 26, height: 26, objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(74,126,200,0.5))' }}/>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: '#BDD4E8', letterSpacing: '0.18em' }}>AEGISTRACE</span>
      </Link>
      <div style={{ display: 'flex', gap: 'clamp(18px,3vw,36px)', alignItems: 'center' }}>
        <Link to="/portfolio" className="nav-link">Portfolio</Link>
        <Link to="/platform" className="nav-link">Platform</Link>
        <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>Platform <ArrowRight size={12}/></Link>
      </div>
    </motion.nav>
  );
}

/* ─── Builder Section ────────────────────────────────────────────────────── */
function BuilderSection() {
  return (
    <section style={{ padding: 'clamp(80px,10vw,130px) clamp(24px,5vw,72px)', background: BG, borderTop: '1px solid rgba(189,212,232,0.05)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(140px,18vw,220px) 1fr', gap: 'clamp(32px,5vw,72px)', alignItems: 'start' }}>
          <Reveal><span className="cg" style={{ fontSize: 10, color: GOLD, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 6, display: 'block' }}>The Builder</span></Reveal>
          <div>
            <Reveal><h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,48px)', fontWeight: 700, color: INK, margin: '0 0 28px', letterSpacing: '-0.025em', lineHeight: 1.04 }}>Built by a SOC Analyst. For SOC Analysts.</h2></Reveal>
            <Reveal delay={0.08}>
              <div style={{ background: 'rgba(189,212,232,0.02)', border: '1px solid rgba(189,212,232,0.08)', padding: 'clamp(24px,3vw,36px)', maxWidth: 580 }}>
                <div className="cd" style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 4 }}>Prasanna Kumar Surendran</div>
                <div className="cg" style={{ fontSize: 13, color: GOLD, marginBottom: 18 }}>Blue Team SOC Analyst · Dublin, Ireland</div>
                <p className="cg" style={{ fontSize: 14, color: 'rgba(189,212,232,0.56)', lineHeight: 1.72, marginBottom: 16 }}>
                  MSc Information Systems & Computing, Dublin Business School (2025)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                  {['SC-200', 'Security+', 'TCM PEH', 'BTL1', 'eJPT', 'SC-300'].map(cert => (
                    <span key={cert} className="mono" style={{ fontSize: 11, color: 'rgba(241,245,249,0.45)', background: 'rgba(189,212,232,0.04)', border: '1px solid rgba(189,212,232,0.1)', padding: '3px 8px' }}>{cert}</span>
                  ))}
                </div>
                <p className="cg" style={{ fontSize: 14, color: 'rgba(241,245,249,0.52)', lineHeight: 1.72, margin: 0 }}>
                  Building AegisTrace to prove a point: a solo analyst can build SOC tooling
                  that rivals commercial products — and that the next generation of security
                  platforms must be built around identity, explainability, and human control.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ────────────────────────────────────────────────────────────────── */
function CTASection() {
  const ref = useRef(null);
  const p   = useSectionParallax(ref);
  const ctaScale = useTransform(p, [0.1, 0.55], [1.06, 1.0], { clamp: true });
  const ctaOp    = useTransform(p, [0.1, 0.45], [0, 1], { clamp: true });

  return (
    <section ref={ref} style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(100px,14vw,160px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(189,212,232,0.05)', textAlign: 'center' }}>
      <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 380, background: 'radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
      {[0, 1, 2].map(i => (
        <div key={i} aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', width: 480, height: 480, border: '1px solid rgba(245,158,11,0.055)', borderRadius: '50%', pointerEvents: 'none', animation: `ripple-ring ${4.2 + i * 1.6}s cubic-bezier(0,0,.8,1) ${i * 1.4}s infinite` }}/>
      ))}
      <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
        <motion.div style={{ scale: ctaScale, opacity: ctaOp }}>
          <h2 className="cd" style={{ fontSize: 'clamp(30px,4.5vw,60px)', fontWeight: 700, color: INK, letterSpacing: '-0.03em', lineHeight: 0.96, marginBottom: 20 }}>
            Autonomous AI needs<br/>accountable security.
          </h2>
          <p className="cg" style={{ fontSize: 15, color: 'rgba(189,212,232,0.44)', lineHeight: 1.72, maxWidth: 440, margin: '0 auto 40px' }}>
            Book a private demo with the founder. See the full platform in a live environment.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/app/login" className="gold-btn" style={{ fontSize: 14, padding: '14px 32px' }}>Book a Private Demo <ArrowRight size={15}/></Link>
            <Link to="/platform" className="ghost-btn" style={{ fontSize: 14, padding: '13px 24px' }}>About the Platform →</Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════════ */
export default function Mission() {
  const isMobile = useIsMobile();
  const reduced  = useReducedMotion();

  return (
    <div style={{ background: BG, color: INK, overflowX: 'clip', position: 'relative', isolation: 'isolate' }}>
      <AmbientEmbers/>
      <ScrollProgressBar/>
      <Nav/>

      <style>{`
        .cd  { font-family: 'Plus Jakarta Sans', sans-serif; }
        .cg  { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }

        .gold-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${GOLD}; color: #000; font-weight: 700;
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px;
          padding: 12px 22px; border: none; cursor: pointer;
          text-decoration: none; letter-spacing: 0.03em;
          transition: background 140ms ease, transform 100ms, box-shadow 140ms;
        }
        .gold-btn:hover  { background: #FBBF24; transform: translateY(-2px); box-shadow: 0 0 20px rgba(245,158,11,0.28); }
        .gold-btn:active { transform: scale(0.97); }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(241,245,249,0.7);
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
          padding: 11px 22px; border: 1px solid rgba(189,212,232,0.18);
          cursor: pointer; text-decoration: none; letter-spacing: 0.02em;
          transition: border-color 140ms, color 140ms, transform 100ms;
        }
        .ghost-btn:hover  { border-color: rgba(189,212,232,0.4); color: ${INK}; transform: translateY(-2px); }
        .ghost-btn:active { transform: scale(0.97); }

        .nav-link {
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(189,212,232,0.58); text-decoration: none;
          position: relative; transition: color 140ms;
        }
        .nav-link:hover { color: ${INK}; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -3px;
          height: 1px; background: ${GOLD};
          transition: right 240ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover::after { right: 0; }

        ::selection { background: rgba(245,158,11,0.3); color: ${INK}; }

        @keyframes ripple-ring {
          from { transform: translate(-50%,-50%) scale(.04); opacity: .6; }
          to   { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {(isMobile || reduced) ? (
        <section style={{ minHeight: '70vh', display: 'flex', alignItems: 'flex-end', position: 'relative', overflow: 'hidden', paddingTop: 64 }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #050505 0%, #080818 35%, #0A1428 65%, #0F1E3E 100%)' }}/>
          <Reveal style={{ position: 'relative', zIndex: 2, padding: '0 24px 60px' }}>
            <h1 className="cd" style={{ fontSize: 'clamp(38px,10vw,56px)', fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.02em', color: INK, margin: '0 0 16px' }}>
              Autonomous systems deserve<br/><span style={{ color: GOLD }}>accountable security.</span>
            </h1>
            <p className="cg" style={{ fontSize: 15.5, color: 'rgba(189,212,232,0.54)', lineHeight: 1.68, maxWidth: 440, margin: 0 }}>
              We believe every identity must be scored, every decision explained, every action reversible.
            </p>
          </Reveal>
        </section>
      ) : (
        <HeroScene/>
      )}

      <Stat83Scene/>

      {!isMobile && !reduced && <AttackTimelineScene/>}
      {!isMobile && !reduced && <EvidenceScene/>}

      <OriginSection/>
      <PrinciplesSection/>
      <PhilosophySection/>
      <RoadmapSection/>
      <EnterpriseSection/>
      <BuilderSection/>
      <CTASection/>

      <footer style={{ borderTop: '1px solid rgba(189,212,232,0.05)', padding: '28px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/assets/brand/aegistrace-icon-transparent.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.6 }}/>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: 'rgba(189,212,232,0.3)', fontSize: 11, letterSpacing: '0.16em' }}>AEGISTRACE</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/" className="cg" style={{ color: 'rgba(189,212,232,0.25)', fontSize: 12, textDecoration: 'none' }}>Home</Link>
            <Link to="/portfolio" className="cg" style={{ color: 'rgba(189,212,232,0.25)', fontSize: 12, textDecoration: 'none' }}>Portfolio</Link>
            <Link to="/app/login" className="cg" style={{ color: 'rgba(189,212,232,0.25)', fontSize: 12, textDecoration: 'none' }}>Platform</Link>
          </div>
          <span className="cg" style={{ color: 'rgba(189,212,232,0.15)', fontSize: 11 }}>© 2026 Prasanna Kumar</span>
        </div>
      </footer>
    </div>
  );
}
