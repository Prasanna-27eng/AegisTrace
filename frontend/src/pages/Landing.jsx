import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent, useInView, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Minus, Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050405';
const INK  = '#F5F0E8';

/* clamp(0..1) helper for the choreography maths below */
const M = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));

/* ─── Cinematic camera ──────────────────────────────────────────────────
   Spring-damped scroll progress. The camera eases toward the scroll
   position instead of tracking every wheel detent — this is the single
   biggest difference between "scrubbed" and "filmed".                    */
function useCamera(ref) {
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.4, restDelta: 0.0001 });
}

/* ─── Mobile breakpoint ─────────────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

/* ─── Scroll reveal (kept from the previous Landing) ───────────────────── */
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

/* ─── Animated counter (kept from the previous Landing) ────────────────── */
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

/* ─── Pinned scene wrapper ──────────────────────────────────────────────
   Tall scroll runway with a sticky 100vh viewport — the "camera" is the
   scroll progress measured across the runway.                            */
function PinnedScene({ vh, sceneRef, children }) {
  /* Exit handoff: as the runway runs out the whole frame eases to black,
     so un-pinning never hard-cuts — the next scene fades up from the same
     void. Uses RAW progress (not the spring) so it stays locked to the
     actual un-pin point.                                                  */
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start start', 'end end'] });
  const exitOpacity = useTransform(scrollYProgress, [0.93, 1], [1, 0], { clamp: true });
  const exitScale   = useTransform(scrollYProgress, [0.93, 1], [1, 0.985], { clamp: true });
  return (
    <section ref={sceneRef} style={{ height: vh, position: 'relative' }}>
      <motion.div style={{
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: exitOpacity, scale: exitScale, willChange: 'opacity, transform',
      }}>
        {children}
      </motion.div>
    </section>
  );
}

/* Simple stacked fallback for mobile / reduced-motion — fades up once */
function SceneFallback({ children, minHeight = '70vh' }) {
  return (
    <section style={{ minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(56px,10vw,96px) clamp(24px,5vw,72px)' }}>
      <Reveal style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>{children}</Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 1 — Hero dolly
════════════════════════════════════════════════════════════════════════ */
function HeroScene() {
  const ref = useRef(null);
  const p = useCamera(ref);

  const line1Opacity = useTransform(p, [0.22, 0.42], [1, 0], { clamp: true });
  const line1Scale   = useTransform(p, [0, 1], [1, 2.9]);
  const line1BlurPx  = useTransform(p, [0.2, 0.45], [0, 10], { clamp: true });
  const line1Filter  = useTransform(line1BlurPx, v => `blur(${v}px)`);

  const line2Opacity = useTransform(p, [0.4, 0.58], [0, 1], { clamp: true });
  const line2Scale   = useTransform(p, [0.38, 0.66, 1], [0.5, 1, 1.06], { clamp: true });
  const line2BlurPx  = useTransform(p, [0.45, 0.62], [6, 0], { clamp: true });
  const line2Filter  = useTransform(line2BlurPx, v => `blur(${v}px)`);

  const kickerOpacity = useTransform(p, [0.7, 0.85], [0, 1], { clamp: true });
  const kickerY       = useTransform(kickerOpacity, o => (1 - o) * 20);

  const glowOpacity = useTransform(p, [0.3, 0.7], [0.12, 0.32], { clamp: true });
  const glowScale   = useTransform(p, [0, 1], [0.6, 1.8]);

  const bgScale   = useTransform(p, [0, 0.5], [1.14, 1.04], { clamp: true });
  const bgY       = useTransform(p, v => v * 50);
  const bgOpacity = useTransform(p, [0.35, 0.62], [0.55, 0], { clamp: true });

  return (
    <PinnedScene vh="280vh" sceneRef={ref}>
      {/* Background image */}
      <motion.div style={{
        position: 'absolute', inset: '-6%',
        backgroundImage: `url('/assets/pages/hero-bg.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center 35%',
        scale: bgScale, y: bgY, opacity: bgOpacity, willChange: 'transform, opacity',
      }}/>
      {/* Scrim */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(5,4,5,0.2) 0%, rgba(5,4,5,0.82) 75%), linear-gradient(180deg, rgba(5,4,5,0.55) 0%, rgba(5,4,5,0.2) 40%, rgba(5,4,5,0.92) 100%)',
      }}/>
      {/* Gold glow */}
      <motion.div aria-hidden style={{
        position: 'absolute', width: '70vw', height: '70vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0) 62%)',
        opacity: glowOpacity, scale: glowScale, willChange: 'transform, opacity',
      }}/>
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 clamp(20px,5vw,60px)' }}>
        <motion.h1 className="cd" style={{
          fontSize: 'clamp(54px,8.5vw,140px)', fontWeight: 600, lineHeight: 0.98,
          letterSpacing: '-0.02em', color: INK, margin: 0,
          opacity: line1Opacity, scale: line1Scale, filter: line1Filter,
          willChange: 'transform, opacity, filter',
        }}>
          Attackers no longer<br/>break in.
        </motion.h1>
        <motion.h1 className="cd" style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(54px,8.5vw,140px)', fontWeight: 600, lineHeight: 0.98,
          letterSpacing: '-0.02em', color: INK, margin: 0,
          opacity: line2Opacity, scale: line2Scale, filter: line2Filter,
          willChange: 'transform, opacity, filter',
        }}>
          They become<br/><span style={{ color: GOLD }}>trusted.</span>
        </motion.h1>
        <motion.div style={{
          position: 'absolute', left: 0, right: 0, bottom: '-18vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          opacity: kickerOpacity, y: kickerY, willChange: 'transform, opacity',
        }}>
          <p className="cg" style={{ fontSize: 17, fontWeight: 500, color: 'rgba(245,240,232,0.55)', maxWidth: 460, textAlign: 'center', margin: 0 }}>
            AegisTrace is the Trust Operating System for the AI-agent era.
          </p>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(245,240,232,0.35)' }}>SCROLL</span>
        </motion.div>
      </div>
    </PinnedScene>
  );
}

function MobileHero() {
  return (
    <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: '-6%',
        backgroundImage: `url('/assets/pages/hero-bg.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center 35%', opacity: 0.4,
      }}/>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(5,4,5,0.2) 0%, rgba(5,4,5,0.82) 75%), linear-gradient(180deg, rgba(5,4,5,0.55) 0%, rgba(5,4,5,0.2) 40%, rgba(5,4,5,0.92) 100%)',
      }}/>
      <Reveal style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <h1 className="cd" style={{ fontSize: 'clamp(40px,12vw,64px)', fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.02em', color: INK, margin: 0 }}>
          Attackers no longer break in. They become <span style={{ color: GOLD }}>trusted.</span>
        </h1>
        <p className="cg" style={{ fontSize: 16, fontWeight: 500, color: 'rgba(245,240,232,0.55)', maxWidth: 420, margin: 0 }}>
          AegisTrace is the Trust Operating System for the AI-agent era.
        </p>
      </Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 2 — 144:1 stat
════════════════════════════════════════════════════════════════════════ */
function StatScene() {
  const ref = useRef(null);
  const p = useCamera(ref);
  const [count, setCount] = useState(0);
  useMotionValueEvent(p, 'change', v => setCount(Math.round(M(v, 0.08, 0.55) * 144)));

  const dotsOpacity = useTransform(p, [0.05, 0.3], [0, 0.25], { clamp: true });
  const dotsY       = useTransform(p, v => -v * 150);

  const statOpacity = useTransform(p, [0.02, 0.25], [0, 1], { clamp: true });
  const statY       = useTransform(statOpacity, o => (1 - o) * 70);

  const captionOpacity = useTransform(p, [0.45, 0.65], [0, 1], { clamp: true });

  return (
    <PinnedScene vh="230vh" sceneRef={ref}>
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-160px 0',
        backgroundImage: 'radial-gradient(circle, rgba(245,240,232,0.18) 1.5px, transparent 1.5px)',
        backgroundSize: '30px 30px',
        opacity: dotsOpacity, y: dotsY, willChange: 'transform, opacity',
      }}/>
      <motion.div style={{
        position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 clamp(20px,5vw,60px)',
        opacity: statOpacity, y: statY, willChange: 'transform, opacity',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
          <span className="mono" style={{ fontSize: 'clamp(110px,17vw,250px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>{count}</span>
          <span className="mono" style={{ fontSize: 'clamp(50px,7vw,110px)', fontWeight: 700, color: 'rgba(245,240,232,0.4)', lineHeight: 1 }}>:1</span>
        </div>
        <motion.p className="cg" style={{
          fontSize: 20, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 520, margin: '24px auto 0',
          opacity: captionOpacity, willChange: 'opacity',
        }}>
          The average enterprise runs <strong style={{ color: INK }}>144 machine identities for every human.</strong> Most are unmonitored.
        </motion.p>
      </motion.div>
    </PinnedScene>
  );
}

function MobileStat() {
  return (
    <SceneFallback minHeight="60vh">
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
          <span className="mono" style={{ fontSize: 'clamp(80px,24vw,140px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>144</span>
          <span className="mono" style={{ fontSize: 'clamp(36px,10vw,60px)', fontWeight: 700, color: 'rgba(245,240,232,0.4)', lineHeight: 1 }}>:1</span>
        </div>
        <p className="cg" style={{ fontSize: 18, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 420, margin: '24px auto 0' }}>
          The average enterprise runs <strong style={{ color: INK }}>144 machine identities for every human.</strong> Most are unmonitored.
        </p>
      </div>
    </SceneFallback>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 3 — The breach
════════════════════════════════════════════════════════════════════════ */
const BREACH_EVENTS = [
  { time: '07:41:02', text: '7 failed logins · svc-backup@corp · 10-min window',          tag: 'CREDENTIAL STUFFING', tagColor: '#F5B84B' },
  { time: '08:02:17', text: 'login success · Dublin → Shanghai · Δ 1h 54m',               tag: 'IMPOSSIBLE TRAVEL',   tagColor: '#F5B84B' },
  { time: '08:06:44', text: 'unknown device fingerprint · first seen',                     tag: 'NEW DEVICE',          tagColor: '#F5B84B' },
  { time: '08:11:09', text: 'role elevated to domain-admin · no approval ticket',          tag: 'PRIV ESCALATION',     tagColor: '#FF667C' },
];

function BreachScene() {
  const ref = useRef(null);
  const p = useCamera(ref);

  const stageScale = useTransform(p, [0, 1], [1, 1.06]);

  const headOpacity = useTransform(p, [0, 0.13], [0, 1], { clamp: true });
  const headY       = useTransform(headOpacity, o => (1 - o) * 26);

  const ev0Opacity = useTransform(p, [0.16, 0.25], [0, 1], { clamp: true });
  const ev0Y       = useTransform(ev0Opacity, o => (1 - o) * 24);
  const ev1Opacity = useTransform(p, [0.30, 0.39], [0, 1], { clamp: true });
  const ev1Y       = useTransform(ev1Opacity, o => (1 - o) * 24);
  const ev2Opacity = useTransform(p, [0.44, 0.53], [0, 1], { clamp: true });
  const ev2Y       = useTransform(ev2Opacity, o => (1 - o) * 24);
  const ev3Opacity = useTransform(p, [0.58, 0.67], [0, 1], { clamp: true });
  const ev3Y       = useTransform(ev3Opacity, o => (1 - o) * 24);

  const finalOpacity = useTransform(p, [0.70, 0.82], [0, 1], { clamp: true });
  const finalY       = useTransform(finalOpacity, o => (1 - o) * 24);

  const eventMotion = [
    { opacity: ev0Opacity, y: ev0Y },
    { opacity: ev1Opacity, y: ev1Y },
    { opacity: ev2Opacity, y: ev2Y },
    { opacity: ev3Opacity, y: ev3Y },
  ];

  return (
    <PinnedScene vh="300vh" sceneRef={ref}>
      <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, scale: stageScale, padding: '0 clamp(20px,5vw,60px)', width: '100%', willChange: 'transform' }}>
        <motion.h2 className="cd" style={{
          fontSize: 'clamp(36px,4.5vw,64px)', fontWeight: 600, color: INK, margin: 0, textAlign: 'center', letterSpacing: '-0.02em',
          opacity: headOpacity, y: headY,
        }}>
          It starts quietly.
        </motion.h2>
        <div style={{
          width: 'min(640px,94vw)', background: '#0A0908', border: '1px solid rgba(245,240,232,0.10)',
          borderRadius: 14, padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {BREACH_EVENTS.map((ev, i) => (
            <motion.div key={ev.tag} className="mono" style={{
              fontSize: 14, lineHeight: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10,
              opacity: eventMotion[i].opacity, y: eventMotion[i].y,
            }}>
              <span style={{ color: 'rgba(245,240,232,0.35)' }}>{ev.time}</span>
              <span style={{ color: 'rgba(245,240,232,0.8)' }}>{ev.text}</span>
              <span style={{ color: ev.tagColor, fontSize: 11, letterSpacing: '0.12em', marginLeft: 'auto' }}>{ev.tag}</span>
            </motion.div>
          ))}
        </div>
        <motion.p className="cg" style={{
          fontSize: 21, fontWeight: 700, color: '#F5F0E8', textAlign: 'center', margin: 0,
          opacity: finalOpacity, y: finalY,
        }}>
          Four signals. One compromised identity. <span style={{ color: GOLD }}>Zero malware.</span>
        </motion.p>
      </motion.div>
    </PinnedScene>
  );
}

function MobileBreach() {
  return (
    <SceneFallback minHeight="auto">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', maxWidth: 640 }}>
        <h2 className="cd" style={{ fontSize: 'clamp(32px,8vw,48px)', fontWeight: 600, color: INK, margin: 0, textAlign: 'center', letterSpacing: '-0.02em' }}>It starts quietly.</h2>
        <div style={{ width: '100%', background: '#0A0908', border: '1px solid rgba(245,240,232,0.10)', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {BREACH_EVENTS.map(ev => (
            <div key={ev.tag} className="mono" style={{ fontSize: 13, lineHeight: 1.5, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: 'rgba(245,240,232,0.35)' }}>{ev.time}</span>
              <span style={{ color: 'rgba(245,240,232,0.8)' }}>{ev.text}</span>
              <span style={{ color: ev.tagColor, fontSize: 11, letterSpacing: '0.12em' }}>{ev.tag}</span>
            </div>
          ))}
        </div>
        <p className="cg" style={{ fontSize: 18, fontWeight: 700, color: '#F5F0E8', textAlign: 'center', margin: 0 }}>
          Four signals. One compromised identity. <span style={{ color: GOLD }}>Zero malware.</span>
        </p>
      </div>
    </SceneFallback>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 4 — Identity graph dolly-in
════════════════════════════════════════════════════════════════════════ */
const GRAPH_NODES = [
  { x: 0.5,  y: 0.5,  r: 9,   hot: true },
  { x: 0.3,  y: 0.32, r: 5 }, { x: 0.68, y: 0.28, r: 6 }, { x: 0.82, y: 0.5,  r: 5 },
  { x: 0.7,  y: 0.74, r: 5 }, { x: 0.34, y: 0.76, r: 6 }, { x: 0.18, y: 0.55, r: 5 },
  { x: 0.42, y: 0.16, r: 4 }, { x: 0.58, y: 0.86, r: 4 }, { x: 0.9,  y: 0.3,  r: 4 },
  { x: 0.1,  y: 0.34, r: 4 }, { x: 0.88, y: 0.72, r: 4 }, { x: 0.14, y: 0.8,  r: 4 },
  { x: 0.5,  y: 0.05, r: 3.5 }, { x: 0.97, y: 0.52, r: 3.5 }, { x: 0.03, y: 0.6, r: 3.5 },
];
const GRAPH_EDGES = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,7],[1,10],[2,9],[2,13],[3,14],[4,11],[5,8],[5,12],[6,15],[6,10],[2,3],[4,8]];

function drawGraph(ctx, w, h, p) {
  ctx.clearRect(0, 0, w, h);
  const reveal = M(p, 0.05, 0.6);

  GRAPH_EDGES.forEach(([ai, bi], i) => {
    const er = Math.max(0, Math.min(1, reveal * GRAPH_EDGES.length - i));
    if (er <= 0) return;
    const a = GRAPH_NODES[ai], b = GRAPH_NODES[bi];
    const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + (bx - ax) * er, ay + (by - ay) * er);
    if (ai === 0 || bi === 0) {
      ctx.strokeStyle = `rgba(245,158,11,${0.1 + 0.3 * M(p, 0.5, 0.85)})`;
      ctx.lineWidth = 1.4;
    } else {
      ctx.strokeStyle = `rgba(245,240,232,${0.1 * er})`;
      ctx.lineWidth = 1;
    }
    ctx.stroke();
  });

  GRAPH_NODES.forEach((node, i) => {
    const nr = Math.max(0, Math.min(1, reveal * GRAPH_NODES.length * 0.8 - i * 0.5));
    if (nr <= 0) return;
    const nx = node.x * w, ny = node.y * h;
    if (node.hot) {
      const glowR = 18 + M(p, 0.5, 0.9) * 18;
      const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR);
      grad.addColorStop(0, 'rgba(245,158,11,0.5)');
      grad.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.beginPath(); ctx.arc(nx, ny, glowR, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); ctx.arc(nx, ny, node.r * nr, 0, Math.PI * 2); ctx.fillStyle = '#F59E0B'; ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(nx, ny, node.r * nr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,240,232,${0.55 * nr})`;
      ctx.fill();
    }
  });
}

function GraphScene() {
  const ref       = useRef(null);
  const canvasRef = useRef(null);
  const p = useCamera(ref);

  const stageOpacity = useTransform(p, [0, 0.18], [0, 1], { clamp: true });
  const stageScale   = useTransform(p, [0.05, 0.78], [0.7, 1.25], { clamp: true });
  const headOpacity  = useTransform(p, v => M(v, 0, 0.15) * (1 - M(v, 0.82, 0.96) * 0.5));
  const chipOpacity  = useTransform(p, [0.74, 0.88], [0, 1], { clamp: true });

  useMotionValueEvent(p, 'change', v => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawGraph(canvas.getContext('2d'), canvas.width, canvas.height, v);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = Math.min(820, window.innerWidth * 0.94);
    canvas.height = 460;
    drawGraph(canvas.getContext('2d'), canvas.width, canvas.height, p.get());
  }, [p]);

  return (
    <PinnedScene vh="260vh" sceneRef={ref}>
      <motion.div style={{ position: 'absolute', top: 'clamp(60px,8vh,100px)', left: 0, right: 0, textAlign: 'center', opacity: headOpacity, padding: '0 24px' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(34px,4.2vw,58px)', fontWeight: 600, color: INK, margin: 0, letterSpacing: '-0.02em' }}>
          The graph sees what logs can't.
        </h2>
      </motion.div>
      <motion.div style={{ position: 'relative', opacity: stageOpacity, scale: stageScale, willChange: 'transform, opacity' }}>
        <canvas ref={canvasRef} style={{ width: 'min(820px,94vw)', height: 460, display: 'block' }}/>
        <motion.div className="mono" style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-150%)',
          background: 'rgba(10,9,8,0.92)', border: '1px solid rgba(245,158,11,0.45)', borderRadius: 100,
          padding: '8px 18px', fontSize: 12, letterSpacing: '0.1em', color: GOLD, whiteSpace: 'nowrap',
          opacity: chipOpacity,
        }}>
          svc-backup · RISK 91 · COMPROMISED
        </motion.div>
      </motion.div>
    </PinnedScene>
  );
}

function MobileGraph() {
  return (
    <SceneFallback minHeight="50vh">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(32px,8vw,48px)', fontWeight: 600, color: INK, margin: 0, letterSpacing: '-0.02em' }}>
          The graph sees what logs can't.
        </h2>
        <span className="mono" style={{
          background: 'rgba(10,9,8,0.92)', border: '1px solid rgba(245,158,11,0.45)', borderRadius: 100,
          padding: '8px 18px', fontSize: 12, letterSpacing: '0.1em', color: GOLD,
        }}>
          svc-backup · RISK 91 · COMPROMISED
        </span>
      </div>
    </SceneFallback>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 5 — Explainable verdict
════════════════════════════════════════════════════════════════════════ */
function VerdictCard({ conf, confBarWidth, motionProps = {} }) {
  const { b0 = {}, b1 = {}, b2 = {}, b3 = {}, card = {} } = motionProps;
  return (
    <motion.div style={{
      width: 'min(720px,92vw)', background: '#0A0908', border: '1px solid rgba(245,240,232,0.10)',
      borderRadius: 14, padding: '34px 38px', display: 'flex', flexDirection: 'column', gap: 22,
      ...card,
    }}>
      <motion.div style={b0}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)', marginBottom: 10 }}>EVIDENCE</div>
        <div className="cg" style={{ fontSize: 15.5, color: 'rgba(245,240,232,0.8)', lineHeight: 1.8 }}>
          · 7 failed logins in a 10-minute window — svc-backup<br/>
          · Geo jump Dublin → Shanghai, Δ 1h 54m<br/>
          · Privilege change outside the approval workflow
        </div>
      </motion.div>
      <motion.div style={b1}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)', marginBottom: 10 }}>REASONING</div>
        <div className="cg" style={{ fontSize: 15.5, color: 'rgba(245,240,232,0.8)', lineHeight: 1.8 }}>
          1 — Pattern matches credential stuffing across 3 time windows<br/>
          2 — Geo-velocity exceeds physical travel limits<br/>
          3 — Escalation chains to domain-admin scope
        </div>
      </motion.div>
      <motion.div style={b2}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)', marginBottom: 10 }}>CONFIDENCE</div>
        <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: GOLD, marginBottom: 10 }}>{conf}%</div>
        <div style={{ height: 4, background: 'rgba(245,240,232,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: confBarWidth, background: GOLD, borderRadius: 2 }}/>
        </div>
      </motion.div>
      <motion.div style={{ borderTop: '1px solid rgba(245,240,232,0.08)', paddingTop: 20, ...b3 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)', marginBottom: 10 }}>WHAT COULD BE WRONG</div>
        <div className="cg" style={{ fontSize: 15.5, color: 'rgba(245,240,232,0.65)', lineHeight: 1.7 }}>
          VPN egress could explain the geo jump — verify against network telemetry before isolating.
        </div>
      </motion.div>
    </motion.div>
  );
}

function VerdictScene() {
  const ref = useRef(null);
  const p = useCamera(ref);

  const cardOpacity = useTransform(p, [0, 0.16], [0, 1], { clamp: true });
  const cardY       = useTransform(cardOpacity, o => (1 - o) * 50);

  const b0Opacity = useTransform(p, [0.20, 0.29], [0, 1], { clamp: true });
  const b0Y       = useTransform(b0Opacity, o => (1 - o) * 18);
  const b1Opacity = useTransform(p, [0.32, 0.41], [0, 1], { clamp: true });
  const b1Y       = useTransform(b1Opacity, o => (1 - o) * 18);
  const b2Opacity = useTransform(p, [0.44, 0.53], [0, 1], { clamp: true });
  const b2Y       = useTransform(b2Opacity, o => (1 - o) * 18);
  const b3Opacity = useTransform(p, [0.56, 0.65], [0, 1], { clamp: true });
  const b3Y       = useTransform(b3Opacity, o => (1 - o) * 18);

  const [conf, setConf] = useState(0);
  useMotionValueEvent(p, 'change', v => setConf(Math.round(M(v, 0.55, 0.82) * 94)));

  return (
    <PinnedScene vh="260vh" sceneRef={ref}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, padding: '0 clamp(20px,5vw,60px)', width: '100%' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(34px,4.2vw,58px)', fontWeight: 600, color: INK, margin: 0, textAlign: 'center', letterSpacing: '-0.02em' }}>
          Every verdict shows its work.
        </h2>
        <VerdictCard
          conf={conf}
          confBarWidth={`${conf}%`}
          motionProps={{
            card: { opacity: cardOpacity, y: cardY },
            b0: { opacity: b0Opacity, y: b0Y },
            b1: { opacity: b1Opacity, y: b1Y },
            b2: { opacity: b2Opacity, y: b2Y },
            b3: { opacity: b3Opacity, y: b3Y },
          }}
        />
      </div>
    </PinnedScene>
  );
}

function MobileVerdict() {
  return (
    <SceneFallback minHeight="auto">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(32px,8vw,48px)', fontWeight: 600, color: INK, margin: 0, textAlign: 'center', letterSpacing: '-0.02em' }}>
          Every verdict shows its work.
        </h2>
        <VerdictCard conf={94} confBarWidth="94%"/>
      </div>
    </SceneFallback>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 6 — Human approval
════════════════════════════════════════════════════════════════════════ */
function ApproveCard({ style = {} }) {
  return (
    <motion.div style={{
      width: 'min(560px,92vw)', background: '#0A0908', border: '1px solid rgba(245,240,232,0.12)',
      borderRadius: 16, padding: '30px 34px', ...style,
    }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)', marginBottom: 10 }}>RECOMMENDED ACTION</div>
      <div className="cg" style={{ fontSize: 21, fontWeight: 700, color: INK, marginBottom: 8 }}>Isolate endpoint DUB-WS-114</div>
      <div className="mono" style={{ fontSize: 12.5, color: 'rgba(245,240,232,0.45)', marginBottom: 24 }}>nemotron-70b · confidence 94% · provenance № 4182</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="gold-btn" style={{ flex: 1, justifyContent: 'center', border: 'none' }}>Approve</button>
        <button className="ghost-btn" style={{ flex: 1, justifyContent: 'center' }}>Reject</button>
      </div>
    </motion.div>
  );
}

function LedgerLine({ style = {} }) {
  return (
    <motion.p className="mono" style={{ fontSize: 13, color: 'rgba(245,240,232,0.45)', margin: 0, ...style }}>
      <span style={{ color: '#4BE38A' }}>✓</span> Logged to the Provenance Ledger — nothing executes without a human.
    </motion.p>
  );
}

function ApproveScene() {
  const ref = useRef(null);
  const p = useCamera(ref);

  const cardOpacity = useTransform(p, [0, 0.25], [0, 1], { clamp: true });
  const cardScale   = useTransform(p, [0.05, 0.4], [0.88, 1], { clamp: true });

  const ledgerOpacity = useTransform(p, [0.6, 0.75], [0, 1], { clamp: true });
  const ledgerY       = useTransform(ledgerOpacity, o => (1 - o) * 14);

  return (
    <PinnedScene vh="230vh" sceneRef={ref}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, padding: '0 clamp(20px,5vw,60px)', width: '100%' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(38px,5vw,72px)', fontWeight: 600, color: INK, margin: 0, textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          AI suggests.<br/><span style={{ color: GOLD }}>Humans confirm.</span>
        </h2>
        <ApproveCard style={{ opacity: cardOpacity, scale: cardScale, willChange: 'transform, opacity' }}/>
        <LedgerLine style={{ opacity: ledgerOpacity, y: ledgerY }}/>
      </div>
    </PinnedScene>
  );
}

function MobileApprove() {
  return (
    <SceneFallback minHeight="auto">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(32px,8vw,52px)', fontWeight: 600, color: INK, margin: 0, textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          AI suggests.<br/><span style={{ color: GOLD }}>Humans confirm.</span>
        </h2>
        <ApproveCard/>
        <LedgerLine/>
      </div>
    </SceneFallback>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SCENE 7 — Bridge to the app
════════════════════════════════════════════════════════════════════════ */
function StatBox({ label, value, color }) {
  return (
    <div style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(235,235,235,0.4)', marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const dotStyle = { width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'inline-block' };

function BridgeFrame() {
  const navItem = { padding: '8px 10px', borderRadius: 6, color: 'rgba(235,235,235,0.5)', fontSize: 12.5, fontFamily: 'Inter, sans-serif' };
  const groupLabel = { fontSize: 9, letterSpacing: '0.18em', color: 'rgba(235,235,235,0.3)', padding: '6px 10px', textTransform: 'uppercase' };
  return (
    <div style={{
      width: 'min(900px,94vw)', background: '#000', border: '1px solid rgba(245,240,232,0.12)',
      borderRadius: 14, boxShadow: '0 40px 120px rgba(0,0,0,0.7)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={dotStyle}/><span style={dotStyle}/><span style={dotStyle}/>
        <span className="mono" style={{ fontSize: 11, color: 'rgba(235,235,235,0.4)', marginLeft: 8 }}>aegistrace · console</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', minHeight: 320 }}>
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="mono" style={groupLabel}>Control</div>
          <div style={{ ...navItem, background: 'rgba(78,122,142,0.16)', color: '#7AABB5' }}>Dashboard</div>
          <div style={navItem}>Defense Console</div>
          <div style={navItem}>Playbooks</div>
          <div className="mono" style={{ ...groupLabel, paddingTop: 14 }}>Investigation</div>
          <div style={navItem}>Cases</div>
          <div style={navItem}>Threat Hunt</div>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <StatBox label="Open Cases" value="23" color="#EBEBEB"/>
            <StatBox label="SLA At Risk" value="4" color="#F5B84B"/>
            <StatBox label="Identities" value="1,284" color="#7AABB5"/>
          </div>
          <div style={{ border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(245,158,11,0.04)' }}>
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'inline-block', flexShrink: 0, animation: 'goldPulse 2.2s infinite' }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#EBEBEB', fontWeight: 600, marginBottom: 2 }}>Honey token accessed — svc-backup</div>
              <div className="mono" style={{ fontSize: 11, color: 'rgba(235,235,235,0.45)' }}>DUB-WS-114 · 08:11:09 · awaiting approval</div>
            </div>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: GOLD, border: '1px solid rgba(245,158,11,0.4)', borderRadius: 100, padding: '4px 10px', whiteSpace: 'nowrap' }}>AI SIGNAL</span>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: '#EBEBEB', fontWeight: 600, marginBottom: 2 }}>Impossible travel — j.doyle</div>
              <div className="mono" style={{ fontSize: 11, color: 'rgba(235,235,235,0.45)' }}>case #1042 · investigating</div>
            </div>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: '#7AABB5', whiteSpace: 'nowrap' }}>HIGH</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BridgeCaption({ style = {} }) {
  return (
    <motion.p className="cg" style={{
      fontSize: 16, color: 'rgba(245,240,232,0.55)', maxWidth: 560, margin: '0 auto', padding: '0 24px', textAlign: 'center',
      ...style,
    }}>
      The console keeps its pure-black, data-dense calm. <strong style={{ color: INK }}>Gold appears only when the AI speaks.</strong>
    </motion.p>
  );
}

function BridgeScene() {
  const ref = useRef(null);
  const p = useCamera(ref);

  const headOpacity = useTransform(p, v => M(v, 0, 0.15) * (1 - M(v, 0.45, 0.65)));

  const frameOpacity = useTransform(p, [0.08, 0.3], [0, 1], { clamp: true });
  const frameScale   = useTransform(p, [0.1, 0.72], [0.6, 1], { clamp: true });
  const frameY       = useTransform(p, [0.1, 0.72], [60, 0], { clamp: true });

  const captionOpacity = useTransform(p, [0.74, 0.9], [0, 1], { clamp: true });
  const captionY       = useTransform(captionOpacity, o => (1 - o) * 16);

  return (
    <PinnedScene vh="260vh" sceneRef={ref}>
      <motion.div style={{ position: 'absolute', zIndex: 2, textAlign: 'center', opacity: headOpacity, padding: '0 24px' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(40px,6vw,96px)', fontWeight: 600, color: INK, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.02 }}>
          One identity.<br/>Two worlds.
        </h2>
      </motion.div>
      <motion.div style={{ opacity: frameOpacity, scale: frameScale, y: frameY, willChange: 'transform, opacity' }}>
        <BridgeFrame/>
      </motion.div>
      <BridgeCaption style={{ position: 'absolute', bottom: '6vh', left: 0, right: 0, opacity: captionOpacity, y: captionY }}/>
    </PinnedScene>
  );
}

function MobileBridge() {
  return (
    <SceneFallback minHeight="auto">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%' }}>
        <h2 className="cd" style={{ fontSize: 'clamp(34px,9vw,56px)', fontWeight: 600, color: INK, margin: 0, textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          One identity.<br/>Two worlds.
        </h2>
        <BridgeFrame/>
        <BridgeCaption/>
      </div>
    </SceneFallback>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PLATFORM SEAM-GRID (8 modules, click-to-expand)
════════════════════════════════════════════════════════════════════════ */
const PLATFORM_MODULES = [
  {
    title: 'Case Management',
    desc: 'A 15-tab investigation workspace with autosave and SLA tracking.',
    bullets: [
      '15 tabs (overview, IOCs, timeline, AI chat, vision, rules, provenance, EDR…)',
      'SLA clocks — Critical 4h · High 8h · Medium 48h',
      '6 investigation templates, autosave, comments',
      'PDF / DOCX / DORA Article 19 export',
    ],
  },
  {
    title: 'ITDR',
    desc: 'Six real-time identity threat detectors, from stuffing to token theft.',
    bullets: [
      'Credential stuffing across 3 time windows',
      'Impossible travel · new device · token theft',
      'Privilege escalation · shadow-AI usage',
      'Analytics: fire rates, FP rate, 30-day trend',
    ],
  },
  {
    title: 'Identity Graph',
    desc: 'A force-directed map of every human and machine identity.',
    bullets: [
      '7 node types — users, service accounts, keys, tokens, devices, agents, prompts',
      'Pluggable risk detectors, scores logged to audit',
      'NHI health — sprawl scores & trust decay',
      'Azure AD / Okta / CSV connectors',
    ],
  },
  {
    title: 'Attack Graph',
    desc: 'The Temporal Linker reconstructs the kill chain automatically.',
    bullets: [
      'Correlates 6 event sources in ±5s windows',
      'Nemotron-70B writes the attack narrative',
      'MITRE chain + confidence, one-click apply to case',
      'Step timeline with correlated raw events',
    ],
  },
  {
    title: 'SOAR Playbooks',
    desc: 'Trigger → action → human approval gate. Response in seconds.',
    bullets: [
      '7 actions — isolate, create case, webhook, page on-call, comment, enrich, generate rules',
      'Threshold + string-match trigger conditions',
      'Per-action approval gates via the ledger',
      'Dry-run testing & full run history',
    ],
  },
  {
    title: 'Explainable AI',
    desc: 'Every verdict ships with evidence, reasoning and confidence.',
    bullets: [
      'Multi-model routing — Groq Llama + NVIDIA NIM',
      'Agentic triage loop with 7 callable tools',
      'Llama Guard 3 safety + prompt-injection shield',
      'Vision analysis & YARA/Sigma/KQL rule generation',
    ],
  },
  {
    title: 'Endpoint Defense',
    desc: 'Honey tokens, DGA detection, auto-block and vuln scanning.',
    bullets: [
      'Canary credentials — CRITICAL alert on access',
      'DGA/DNS-tunnel scoring · YARA-lite signatures',
      'Auto-block & device isolation (iptables/pfctl/netsh)',
      'Vulnerability scanner every 5 min · guardian process',
    ],
  },
  {
    title: 'Terminal Lab',
    desc: 'A simulated analyst lab where AI parses every output.',
    bullets: [
      '20+ simulated commands — whois, dig, nmap, strings…',
      'AI extracts IOCs & maps MITRE per output',
      'Named sessions, save straight to a case',
      'SQL hunting console over live telemetry (DuckDB)',
    ],
  },
];

function PlatformModuleCell({ index, title, desc, bullets }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ background: '#050405', padding: '34px 30px', cursor: 'pointer', transition: 'background 200ms cubic-bezier(0.16,1,0.3,1)' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#0A0908')}
      onMouseLeave={e => (e.currentTarget.style.background = '#050405')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span className="mono" style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)' }}>{String(index + 1).padStart(2, '0')}</span>
        <span aria-hidden style={{ color: open ? GOLD : 'rgba(245,240,232,0.35)', display: 'flex' }}>
          {open ? <Minus size={16}/> : <Plus size={16}/>}
        </span>
      </div>
      <div className="cd" style={{ fontSize: 21, fontWeight: 600, color: INK, marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</div>
      <div className="cg" style={{ fontSize: 14.5, color: 'rgba(245,240,232,0.5)', lineHeight: 1.6 }}>{desc}</div>
      {open && (
        <ul style={{ listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bullets.map(b => (
            <li key={b} className="mono" style={{ fontSize: 12, color: 'rgba(245,240,232,0.55)', display: 'flex', gap: 8, lineHeight: 1.5 }}>
              <span style={{ color: GOLD, flexShrink: 0 }}>▸</span><span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlatformGrid() {
  return (
    <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 56 }}>
          <h2 className="cd" style={{ fontSize: 'clamp(36px,4.5vw,68px)', fontWeight: 600, color: INK, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            One platform.<br/>Every layer of trust.
          </h2>
        </Reveal>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px,1fr))', gap: 1,
          background: 'rgba(245,240,232,0.1)', border: '1px solid rgba(245,240,232,0.1)',
        }}>
          {PLATFORM_MODULES.map((m, i) => (
            <PlatformModuleCell key={m.title} index={i} title={m.title} desc={m.desc} bullets={m.bullets}/>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MISSION BREAK + DETAIL
════════════════════════════════════════════════════════════════════════ */
function MissionBreak() {
  const ref = useRef(null);
  const { scrollYProgress: progress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const smooth    = useSpring(progress, { stiffness: 110, damping: 26, mass: 0.4 });
  const parallaxY = useTransform(smooth, v => (v - 0.5) * 110);

  return (
    <section id="mission" ref={ref} style={{ position: 'relative', height: '88vh', overflow: 'hidden' }}>
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-14% 0',
        backgroundImage: `url('/assets/pages/mission-bg.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        y: parallaxY, willChange: 'transform',
      }}/>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(5,4,5,0.92) 0%, rgba(5,4,5,0.25) 45%, rgba(5,4,5,0.92) 100%)',
      }}/>
      <div style={{ position: 'absolute', left: 0, bottom: 0, padding: 'clamp(40px,6vw,80px)', maxWidth: 800 }}>
        <Reveal>
          <h2 className="cd" style={{ fontSize: 'clamp(40px,5.5vw,84px)', fontWeight: 600, color: INK, margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.05, maxWidth: 800 }}>
            The trust layer for the AI-agent era.
          </h2>
          <p className="cg" style={{ fontSize: 18, fontWeight: 500, color: 'rgba(245,240,232,0.7)', maxWidth: 560, lineHeight: 1.6, margin: '0 0 24px' }}>
            Most platforms watch machines. AegisTrace watches trust — descending into the places logs can't reach.
          </p>
          <Link to="/mission" style={{ color: GOLD, textDecoration: 'underline', fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 15, fontWeight: 700 }}>
            Read the full mission →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function EditorialRow({ label, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(180px,260px) 1fr', gap: 44,
      borderTop: '1px solid rgba(245,240,232,0.1)', padding: 'clamp(32px,5vw,48px) 0',
    }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)' }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

const CONVICTIONS = [
  { n: '01', title: 'Identity is the perimeter', body: 'Track identities — human and machine — not just hosts.' },
  { n: '02', title: 'No black-box AI',            body: 'Every verdict ships its evidence, reasoning chain and confidence.' },
  { n: '03', title: 'Humans stay in control',     body: 'AI suggests, humans confirm — everything lands in the ledger.' },
];

const ROADMAP = [
  { status: '✓ SHIPPED', statusColor: '#4BE38A', title: 'V1 — Foundation',     body: 'Case management · ITDR · identity graph · attack graph · SOAR playbooks · endpoint agent', dim: false },
  { status: '● ACTIVE',  statusColor: GOLD,      title: 'V2 — Self-improving', body: 'Adaptive thresholds · auto-rule generation · control plane · SQL hunting console', dim: false },
  { status: '○ NEXT',    statusColor: 'rgba(245,240,232,0.35)', title: 'V3 — Enterprise', body: 'SCIM sync · least-agency enforcement · eBPF visibility · memory forensics', dim: true },
];

function MissionDetail() {
  return (
    <section style={{ padding: '0 clamp(24px,5vw,72px) clamp(72px,10vw,120px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <EditorialRow label="WHY THIS EXISTS">
          <Reveal>
            <p className="cg" style={{ fontSize: 22, fontWeight: 500, color: 'rgba(245,240,232,0.85)', maxWidth: 720, lineHeight: 1.55, margin: '0 0 18px' }}>
              83% of breaches involve stolen credentials or identity abuse. The perimeter is no longer the network — it's every human, service account, token and AI agent you choose to trust.
            </p>
            <p className="cg" style={{ fontSize: 16, color: 'rgba(245,240,232,0.55)', maxWidth: 720, lineHeight: 1.65, margin: 0 }}>
              AegisTrace is built to defend that trust surface — entirely self-funded, running on free-tier infrastructure, open in philosophy and free forever.
            </p>
          </Reveal>
        </EditorialRow>
        <EditorialRow label="CONVICTIONS">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 36 }}>
            {CONVICTIONS.map((c, i) => (
              <Reveal key={c.n} delay={i * 0.06}>
                <div className="mono" style={{ fontSize: 13, color: GOLD, marginBottom: 12 }}>{c.n}</div>
                <div className="cd" style={{ fontSize: 20, fontWeight: 600, color: INK, marginBottom: 10, letterSpacing: '-0.01em' }}>{c.title}</div>
                <div className="cg" style={{ fontSize: 14.5, color: 'rgba(245,240,232,0.55)', lineHeight: 1.6 }}>{c.body}</div>
              </Reveal>
            ))}
          </div>
        </EditorialRow>
        <EditorialRow label="ROADMAP">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {ROADMAP.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.06}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontSize: 12, letterSpacing: '0.1em', color: r.statusColor, minWidth: 86, flexShrink: 0 }}>{r.status}</span>
                  <div>
                    <div className="cd" style={{ fontSize: 18, fontWeight: 600, color: r.dim ? 'rgba(245,240,232,0.7)' : INK, marginBottom: 6, letterSpacing: '-0.01em' }}>{r.title}</div>
                    <div className="cg" style={{ fontSize: 14, color: r.dim ? 'rgba(245,240,232,0.45)' : 'rgba(245,240,232,0.55)', lineHeight: 1.6 }}>{r.body}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </EditorialRow>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   BUILDER (portfolio folded in)
════════════════════════════════════════════════════════════════════════ */
function Pill({ children, variant = 'earned' }) {
  const styles = {
    earned:  { border: '1px solid rgba(245,158,11,0.4)', color: '#F5F0E8' },
    pending: { border: '1px solid rgba(245,240,232,0.18)', color: 'rgba(245,240,232,0.5)' },
    stack:   { border: '1px solid rgba(245,240,232,0.18)', color: 'rgba(245,240,232,0.7)' },
  };
  return (
    <span className="mono" style={{ fontSize: 12.5, borderRadius: 100, padding: '9px 18px', display: 'inline-block', ...styles[variant] }}>
      {children}
    </span>
  );
}

const BUILDER_STATS = [
  { end: 30, suffix: '+', label: 'console pages shipped' },
  { end: 35, suffix: '',  label: 'backend API routers' },
  { end: 4,  suffix: '',  label: 'security tools on PyPI' },
  { end: 18, suffix: '',  label: 'hardware attack parsers' },
];
const CERTS_EARNED  = ['SC-200', 'Security+', 'TCM PEH'];
const CERTS_PENDING = ['BTL1 — in progress', 'eJPT — in progress', 'SC-300 — in progress'];
const STACK         = ['React 18', 'FastAPI', 'SQLite', 'Groq', 'NVIDIA NIM', 'Docker', 'Render'];
const BUILDER_LINKS = [
  { label: 'GitHub ↗',       href: 'https://github.com/Prasanna-27eng' },
  { label: 'LinkedIn ↗',     href: 'https://www.linkedin.com/in/prasannakumarsurendran' },
  { label: 'Live console ↗', href: 'https://aegistrace-7qvn.onrender.com' },
];

function BuilderSection() {
  const ref = useRef(null);
  const { scrollYProgress: progress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const smooth    = useSpring(progress, { stiffness: 110, damping: 26, mass: 0.4 });
  const parallaxY = useTransform(smooth, v => (v - 0.5) * 110);

  return (
    <section id="builder" ref={ref} style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-14% 0',
        backgroundImage: `url('/assets/pages/login-bg.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        y: parallaxY, willChange: 'transform',
      }}/>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(5,4,5,0.94) 0%, rgba(5,4,5,0.86) 50%, rgba(5,4,5,0.94) 100%)',
      }}/>
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1240, margin: '0 auto' }}>
        <Reveal>
          <div className="mono" style={{ fontSize: 12, letterSpacing: '0.26em', color: GOLD, marginBottom: 20 }}>BUILT BY ONE ANALYST</div>
          <h2 className="cd" style={{ fontSize: 'clamp(40px,6.5vw,92px)', fontWeight: 600, color: INK, margin: '0 0 18px', letterSpacing: '-0.02em', lineHeight: 1.02 }}>
            Prasanna Kumar<br/>Surendran
          </h2>
          <p className="cg" style={{ fontSize: 18, fontWeight: 500, color: 'rgba(245,240,232,0.6)', margin: '0 0 56px' }}>
            Blue Team SOC analyst · security tooling developer · Dublin, Ireland
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 32,
            borderTop: '1px solid rgba(245,240,232,0.1)', borderBottom: '1px solid rgba(245,240,232,0.1)',
            padding: '36px 0', marginBottom: 56,
          }}>
            {BUILDER_STATS.map(s => (
              <div key={s.label}>
                <div className="mono" style={{ fontSize: 38, fontWeight: 700, color: GOLD, lineHeight: 1, marginBottom: 8 }}>
                  <Counter end={s.end} suffix={s.suffix}/>
                </div>
                <div className="cg" style={{ fontSize: 13.5, color: 'rgba(245,240,232,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} style={{ marginBottom: 28 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)', marginBottom: 14 }}>CERTIFICATIONS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {CERTS_EARNED.map(c => <Pill key={c} variant="earned">{c}</Pill>)}
            {CERTS_PENDING.map(c => <Pill key={c} variant="pending">{c}</Pill>)}
          </div>
        </Reveal>
        <Reveal delay={0.14} style={{ marginBottom: 48 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)', marginBottom: 14 }}>STACK</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {STACK.map(s => <Pill key={s} variant="stack">{s}</Pill>)}
          </div>
        </Reveal>
        <Reveal delay={0.18}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
            {BUILDER_LINKS.map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="cg"
                style={{ fontSize: 15.5, fontWeight: 700, color: '#F5F0E8', textDecoration: 'none', borderBottom: '2px solid rgba(245,158,11,0.5)', paddingBottom: 4, transition: 'color 140ms, border-color 140ms' }}
                onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = GOLD; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#F5F0E8'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; }}
              >{l.label}</a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CTA + FOOTER
════════════════════════════════════════════════════════════════════════ */
function CTASection() {
  return (
    <section style={{ padding: 'clamp(96px,12vw,160px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <h2 className="cd" style={{ fontSize: 'clamp(44px,7vw,110px)', fontWeight: 600, color: INK, letterSpacing: '-0.02em', lineHeight: 1.0, margin: '0 0 36px' }}>
            Deploy the<br/><span style={{ color: GOLD }}>trust layer.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer" className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>
              Launch Console <ArrowRight size={16}/>
            </a>
            <a href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noopener noreferrer" className="ghost-btn" style={{ fontSize: 14, padding: '14px 28px' }}>
              View on GitHub
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '40px clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <div className="cd" style={{ fontSize: 16, fontWeight: 700, color: '#F5F0E8', letterSpacing: '0.08em', marginBottom: 12 }}>AEGISTRACE</div>
            <p className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.35)', lineHeight: 1.65, margin: 0, maxWidth: 220 }}>
              The Trust Operating System for the AI-agent era.
            </p>
          </div>
          <div>
            <div className="cg" style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Platform</div>
            {[{ l: 'Sign In', to: '/app/login' }, { l: 'Mission', to: '/mission' }, { l: 'Builder', to: '/#builder' }].map(({ l, to }) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <Link to={to} className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none', transition: 'color 140ms' }}
                  onMouseEnter={e => (e.target.style.color = GOLD)} onMouseLeave={e => (e.target.style.color = 'rgba(245,240,232,0.42)')}
                >{l}</Link>
              </div>
            ))}
          </div>
          <div>
            <div className="cg" style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Contact</div>
            <a href="mailto:prasanna80564@gmail.com" className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none', display: 'block', marginBottom: 10 }}>prasanna80564@gmail.com</a>
            <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none' }}>github.com/Prasanna-27eng</a>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(245,240,232,0.05)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span className="mono" style={{ color: 'rgba(245,240,232,0.4)', fontSize: 12, letterSpacing: '0.18em' }}>AEGISTRACE — TRUST OPERATING SYSTEM</span>
          <span className="cg" style={{ color: 'rgba(245,240,232,0.4)', fontSize: 13 }}>Built in Dublin by a solo Blue Team analyst. Open source, free forever.</span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LANDING
════════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();
  const reduced  = useReducedMotion();
  const useFallback = isMobile || reduced;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (window.location.hash === '#builder') {
      const el = document.getElementById('builder');
      if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
    }
  }, [reduced]);

  return (
    <div style={{ background: BG, color: '#F5F0E8', overflowX: 'hidden', minHeight: '100vh', position: 'relative', isolation: 'isolate' }}>
      <AmbientEmbers/>
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
          <Link to="/#builder"  className="nav-link">Builder</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>
            Sign In <ArrowRight size={13}/>
          </Link>
        </div>
      </motion.nav>

      {/* ── 7 PINNED SCENES ── */}
      {useFallback ? <MobileHero/>    : <HeroScene/>}
      {useFallback ? <MobileStat/>    : <StatScene/>}
      {useFallback ? <MobileBreach/>  : <BreachScene/>}
      {useFallback ? <MobileGraph/>   : <GraphScene/>}
      {useFallback ? <MobileVerdict/> : <VerdictScene/>}
      {useFallback ? <MobileApprove/> : <ApproveScene/>}
      {useFallback ? <MobileBridge/>  : <BridgeScene/>}

      {/* ── PLATFORM, MISSION, BUILDER, CTA, FOOTER ── */}
      <PlatformGrid/>
      <MissionBreak/>
      <MissionDetail/>
      <BuilderSection/>
      <CTASection/>
      <FooterSection/>
    </div>
  );
}






