import React, { useRef, useState, useEffect } from 'react';
import {
  motion, useScroll, useSpring, useTransform,
  useMotionValueEvent, useInView, useReducedMotion, AnimatePresence,
} from 'framer-motion';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import { ArrowRight } from 'lucide-react';
import { useSceneCamera, PinnedScene, ScrollProgressBar } from '../components/SceneController';
import LoadingScreen, { useLoading } from '../components/LoadingScreen';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const GOLD = '#F59E0B';
const BG   = '#050405';
const INK  = '#F5F0E8';
const E    = [0.23, 1, 0.32, 1];

/* clamp progress 0..1 between two scroll positions */
const M = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));

/* ─── Hooks ─────────────────────────────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

/* ─── Scroll reveal ─────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 32, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: E }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated counter ──────────────────────────────────────────────────────── */
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

/* ─── Simple stacked mobile fallback ───────────────────────────────────────── */
function SceneFallback({ children, minHeight = '70vh' }) {
  return (
    <section style={{
      minHeight,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(56px,10vw,96px) clamp(24px,5vw,72px)',
    }}>
      <Reveal style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {children}
      </Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   THREE.JS PARTICLE FIELD — Beat 3 hero
════════════════════════════════════════════════════════════════════════════ */
function ThreeHero({ opacity }) {
  const mountRef = useRef(null);
  const reduced  = useReducedMotion();

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const goldC  = new THREE.Color(GOLD);
    const inkC   = new THREE.Color('#aaaaaa');

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 2 + Math.random() * 1.5;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const c = Math.random() < 0.35 ? goldC : inkC;
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.028, vertexColors: true, transparent: true, opacity: 0.85 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let raf;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!reduced) {
        t += 0.004;
        points.rotation.y = t * 0.22;
        points.rotation.x = Math.sin(t * 0.18) * 0.15;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [reduced]);

  return (
    <motion.div
      ref={mountRef}
      style={{
        position: 'absolute', inset: 0,
        opacity,
        willChange: 'opacity',
      }}
    />
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 1 — Hero (340vh, 4 beats)
════════════════════════════════════════════════════════════════════════════ */
function HeroScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);

  /* Beat 1 — p 0→0.30 */
  const b1Opacity = useTransform(p, [0, 0.22, 0.30], [1, 1, 0], { clamp: true });
  const b1Scale   = useTransform(p, [0, 0.30], [1, 3], { clamp: true });
  const b1BlurPx  = useTransform(p, [0.18, 0.30], [0, 18], { clamp: true });
  const b1Filter  = useTransform(b1BlurPx, v => `blur(${v}px)`);

  /* Beat 2 — p 0.28→0.54 */
  const b2Opacity = useTransform(p, [0.28, 0.38], [0, 1], { clamp: true });
  const b2Scale   = useTransform(p, [0.28, 0.54], [0.4, 1], { clamp: true });
  const b2BlurPx  = useTransform(p, [0.28, 0.42], [6, 0], { clamp: true });
  const b2Filter  = useTransform(b2BlurPx, v => `blur(${v}px)`);
  const b2ExitOp  = useTransform(p, [0.50, 0.58], [1, 0], { clamp: true });
  /* combined: enter * exit — both are 0..1 motion values */
  const b2FinalOp = useTransform([b2Opacity, b2ExitOp], ([enter, exit]) => enter * exit);

  /* Beat 3 — Three.js opacity p 0.52→0.78 */
  const b3Opacity = useTransform(p, [0.52, 0.62, 0.72, 0.78], [0, 1, 1, 0], { clamp: true });

  /* Beat 4 — p 0.72→0.90 */
  const b4Opacity = useTransform(p, [0.72, 0.82], [0, 1], { clamp: true });
  const b4Y       = useTransform(b4Opacity, o => (1 - o) * 28);

  /* BG photo opacity */
  const bgScale   = useTransform(p, [0, 0.6], [1.12, 1.04], { clamp: true });
  const bgOpacity = useTransform(p, [0, 0.48, 0.58], [0.65, 0.65, 0], { clamp: true });


  return (
    <PinnedScene vh="340vh" sceneRef={ref}>
      {/* Background photo — Ken Burns */}
      <motion.div style={{
        position: 'absolute', inset: '-6%',
        backgroundImage: `url('/assets/pages/hero-bg.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center 35%',
        scale: bgScale, opacity: bgOpacity,
        willChange: 'transform, opacity',
      }}/>

      {/* Dark scrim */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(5,4,5,0.15) 0%, rgba(5,4,5,0.78) 70%), linear-gradient(180deg, rgba(5,4,5,0.5) 0%, rgba(5,4,5,0.1) 40%, rgba(5,4,5,0.9) 100%)',
      }}/>

      {/* Three.js particle field */}
      <ThreeHero opacity={b3Opacity}/>

      {/* Beat 1 */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 clamp(20px,5vw,60px)',
        opacity: b1Opacity, scale: b1Scale, filter: b1Filter,
        willChange: 'transform, opacity, filter',
        pointerEvents: 'none',
      }}>
        <h1 className="cd" style={{
          fontSize: 'clamp(46px,7.5vw,88px)', fontWeight: 600,
          lineHeight: 1.02, letterSpacing: '-0.03em',
          color: INK, margin: 0, textAlign: 'center',
        }}>
          Attackers no longer break in.
        </h1>
      </motion.div>

      {/* Beat 2 */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 clamp(20px,5vw,60px)',
        opacity: b2FinalOp, scale: b2Scale, filter: b2Filter,
        willChange: 'transform, opacity, filter',
        pointerEvents: 'none',
      }}>
        <h1 className="cd" style={{
          fontSize: 'clamp(46px,7.5vw,88px)', fontWeight: 600,
          lineHeight: 1.02, letterSpacing: '-0.03em',
          color: INK, margin: 0, textAlign: 'center',
        }}>
          They <span style={{ color: GOLD }}>sign in.</span>
        </h1>
      </motion.div>

      {/* Beat 4 — CTAs + subtitle */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 20, padding: '0 clamp(20px,5vw,60px)',
        opacity: b4Opacity, y: b4Y,
        willChange: 'transform, opacity',
      }}>
        <p className="cg" style={{
          fontSize: 'clamp(15px,1.8vw,20px)', fontWeight: 500,
          color: 'rgba(245,240,232,0.6)', maxWidth: 540,
          textAlign: 'center', margin: 0, lineHeight: 1.55,
        }}>
          The Trust Operating System for the AI-agent era.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          <a href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer"
            className="gold-btn" style={{ fontSize: 13, padding: '13px 28px' }}>
            Access Platform <ArrowRight size={14}/>
          </a>
          <Link to="/mission" className="ghost-btn" style={{ fontSize: 13, padding: '12px 22px' }}>
            Read the mission
          </Link>
        </div>
        <span className="mono" style={{
          fontSize: 10, letterSpacing: '0.3em', color: 'rgba(245,240,232,0.3)', marginTop: 12,
        }}>SCROLL TO EXPLORE</span>
      </motion.div>
    </PinnedScene>
  );
}

function MobileHero() {
  return (
    <section style={{
      position: 'relative', minHeight: '92vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: '-6%',
        backgroundImage: `url('/assets/pages/hero-bg.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center 35%', opacity: 0.35,
      }}/>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(5,4,5,0.5) 0%, rgba(5,4,5,0.1) 40%, rgba(5,4,5,0.95) 100%)',
      }}/>
      <Reveal style={{
        position: 'relative', zIndex: 2, textAlign: 'center',
        padding: '0 24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 18,
      }}>
        <h1 className="cd" style={{
          fontSize: 'clamp(38px,11vw,60px)', fontWeight: 600,
          lineHeight: 1.04, letterSpacing: '-0.03em', color: INK, margin: 0,
        }}>
          Attackers no longer break in. They <span style={{ color: GOLD }}>sign in.</span>
        </h1>
        <p className="cg" style={{
          fontSize: 16, fontWeight: 500, color: 'rgba(245,240,232,0.55)', maxWidth: 420, margin: 0,
        }}>
          The Trust Operating System for the AI-agent era.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          <a href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer"
            className="gold-btn" style={{ fontSize: 13, padding: '12px 24px' }}>
            Access Platform <ArrowRight size={14}/>
          </a>
          <Link to="/mission" className="ghost-btn" style={{ fontSize: 13, padding: '11px 20px' }}>
            Mission
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TICKER STRIP
════════════════════════════════════════════════════════════════════════════ */
const TICKER_ITEMS = [
  'CREDENTIAL THEFT', 'IMPOSSIBLE TRAVEL', 'PRIVILEGE ESCALATION', 'TOKEN THEFT',
  'SHADOW AI', 'MFA FATIGUE', 'IDENTITY SPRAWL', 'NHI ABUSE',
];

function TickerRow() {
  return (
    <div style={{ display: 'flex', gap: 44, paddingRight: 44, whiteSpace: 'nowrap', alignItems: 'center' }}>
      {TICKER_ITEMS.map(item => (
        <React.Fragment key={item}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.24em', color: GOLD }}>
            {item}
          </span>
          <span aria-hidden style={{ color: 'rgba(245,158,11,0.35)', fontSize: 14 }}>·</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function Ticker() {
  const reduced = useReducedMotion();
  return (
    <div style={{
      overflow: 'hidden',
      borderTop: '1px solid rgba(245,158,11,0.15)',
      borderBottom: '1px solid rgba(245,158,11,0.15)',
      background: 'rgba(245,158,11,0.025)',
      padding: '14px 0',
    }}>
      <div style={{
        display: 'flex', width: 'max-content',
        animation: reduced ? 'none' : 'ticker-march 40s linear infinite',
      }}>
        <TickerRow/>
        <TickerRow/>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 2 — 144:1 stat (260vh)
════════════════════════════════════════════════════════════════════════════ */
function StatScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);
  const [count, setCount] = useState(0);

  useMotionValueEvent(p, 'change', v => setCount(Math.round(M(v, 0.08, 0.55) * 144)));

  const dotsOpacity = useTransform(p, [0.05, 0.3], [0, 0.22], { clamp: true });
  const dotsY       = useTransform(p, v => -v * 140);
  const statOpacity = useTransform(p, [0.02, 0.25], [0, 1], { clamp: true });
  const statY       = useTransform(statOpacity, o => (1 - o) * 60);
  const capOpacity  = useTransform(p, [0.45, 0.65], [0, 1], { clamp: true });

  return (
    <PinnedScene vh="260vh" sceneRef={ref}>
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-160px 0',
        backgroundImage: 'radial-gradient(circle, rgba(245,240,232,0.14) 1.5px, transparent 1.5px)',
        backgroundSize: '32px 32px',
        opacity: dotsOpacity, y: dotsY, willChange: 'transform, opacity',
      }}/>
      <motion.div style={{
        position: 'relative', zIndex: 2, textAlign: 'center',
        padding: '0 clamp(20px,5vw,60px)',
        opacity: statOpacity, y: statY, willChange: 'transform, opacity',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
          <span className="mono" style={{
            fontSize: 'clamp(100px,16vw,240px)', fontWeight: 700,
            color: GOLD, lineHeight: 1,
          }}>{count}</span>
          <span className="mono" style={{
            fontSize: 'clamp(44px,6.5vw,100px)', fontWeight: 700,
            color: 'rgba(245,240,232,0.35)', lineHeight: 1,
          }}>:1</span>
        </div>
        <motion.p className="cg" style={{
          fontSize: 'clamp(16px,1.6vw,20px)', fontWeight: 500,
          color: 'rgba(245,240,232,0.6)', maxWidth: 520, margin: '24px auto 0',
          opacity: capOpacity, lineHeight: 1.6,
        }}>
          The average enterprise runs <strong style={{ color: INK }}>144 machine identities per human.</strong> Most are unmonitored.
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
          <span className="mono" style={{ fontSize: 'clamp(80px,22vw,130px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>144</span>
          <span className="mono" style={{ fontSize: 'clamp(32px,9vw,56px)', fontWeight: 700, color: 'rgba(245,240,232,0.35)', lineHeight: 1 }}>:1</span>
        </div>
        <p className="cg" style={{ fontSize: 17, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 400, margin: '20px auto 0', lineHeight: 1.6 }}>
          The average enterprise runs <strong style={{ color: INK }}>144 machine identities per human.</strong> Most are unmonitored.
        </p>
      </div>
    </SceneFallback>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 3 — Breach timeline (280vh)
════════════════════════════════════════════════════════════════════════════ */
const BREACH_LOG = [
  { time: '07:41:02', text: '7 failed logins · svc-backup@corp · 10-min window',   tag: 'CREDENTIAL STUFFING',  gold: false },
  { time: '07:41:44', text: 'Login succeeded · Berlin, DE · 3:41 AM local',         tag: 'IMPOSSIBLE TRAVEL',    gold: false },
  { time: '07:43:12', text: 'Role: Admin granted · svc-backup@corp',                tag: 'PRIVILEGE ESCALATION', gold: false },
  { time: '07:43:14', text: '⚡ AegisTrace detected · Case #AT-2847 opened',    tag: 'CONTAINED',            gold: true  },
];

function BreachScene() {
  const ref = useRef(null);
  const p   = useSceneCamera(ref);

  const headOpacity = useTransform(p, [0, 0.14], [0, 1], { clamp: true });
  const headY       = useTransform(headOpacity, o => (1 - o) * 24);

  const ev0Op = useTransform(p, [0.18, 0.28], [0, 1], { clamp: true });
  const ev0Y  = useTransform(ev0Op, o => (1 - o) * 20);
  const ev1Op = useTransform(p, [0.32, 0.42], [0, 1], { clamp: true });
  const ev1Y  = useTransform(ev1Op, o => (1 - o) * 20);
  const ev2Op = useTransform(p, [0.47, 0.57], [0, 1], { clamp: true });
  const ev2Y  = useTransform(ev2Op, o => (1 - o) * 20);
  const ev3Op = useTransform(p, [0.62, 0.72], [0, 1], { clamp: true });
  const ev3Y  = useTransform(ev3Op, o => (1 - o) * 20);

  const evMotion = [
    { opacity: ev0Op, y: ev0Y },
    { opacity: ev1Op, y: ev1Y },
    { opacity: ev2Op, y: ev2Y },
    { opacity: ev3Op, y: ev3Y },
  ];

  return (
    <PinnedScene vh="280vh" sceneRef={ref}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 28, padding: '0 clamp(20px,5vw,60px)', width: '100%',
      }}>
        <motion.h2 className="cd" style={{
          fontSize: 'clamp(32px,4vw,58px)', fontWeight: 600, color: INK,
          margin: 0, textAlign: 'center', letterSpacing: '-0.02em',
          opacity: headOpacity, y: headY,
        }}>
          It starts quietly.
        </motion.h2>

        <div style={{
          width: 'min(680px,96vw)',
          background: '#06050A',
          border: '1px solid rgba(245,240,232,0.08)',
          padding: '28px 32px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Terminal chrome */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            borderBottom: '1px solid rgba(245,240,232,0.06)', paddingBottom: 16, marginBottom: 4,
          }}>
            {['rgba(255,96,88,0.7)', 'rgba(255,189,68,0.7)', 'rgba(40,200,64,0.7)'].map((c, i) => (
              <span key={i} aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }}/>
            ))}
            <span className="mono" style={{ marginLeft: 8, fontSize: 11, color: 'rgba(245,240,232,0.3)' }}>
              soc-console — incident #AT-2847
            </span>
          </div>

          {BREACH_LOG.map((ev, i) => (
            <motion.div key={ev.time} style={{
              fontSize: 'clamp(11px,1.1vw,13.5px)', lineHeight: 1.65,
              display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0 14px',
              alignItems: 'baseline',
              opacity: evMotion[i].opacity, y: evMotion[i].y,
            }}>
              <span className="mono" style={{ color: 'rgba(245,240,232,0.28)', whiteSpace: 'nowrap' }}>{ev.time}</span>
              <span className="mono" style={{ color: ev.gold ? GOLD : 'rgba(245,240,232,0.75)' }}>{ev.text}</span>
              <span className="mono" style={{
                fontSize: 10, letterSpacing: '0.12em',
                color: ev.gold ? GOLD : 'rgba(245,240,232,0.38)',
                border: `1px solid ${ev.gold ? 'rgba(245,158,11,0.5)' : 'rgba(245,240,232,0.12)'}`,
                padding: '3px 9px', whiteSpace: 'nowrap',
              }}>{ev.tag}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </PinnedScene>
  );
}

function MobileBreach() {
  return (
    <SceneFallback minHeight="auto">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', maxWidth: 680 }}>
        <h2 className="cd" style={{ fontSize: 'clamp(30px,8vw,46px)', fontWeight: 600, color: INK, margin: 0, textAlign: 'center', letterSpacing: '-0.02em' }}>
          It starts quietly.
        </h2>
        <div style={{ width: '100%', background: '#06050A', border: '1px solid rgba(245,240,232,0.08)', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {BREACH_LOG.map(ev => (
            <div key={ev.time} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: 'rgba(245,240,232,0.28)' }}>{ev.time}</span>
              <span className="mono" style={{ fontSize: 11, color: ev.gold ? GOLD : 'rgba(245,240,232,0.75)', flex: 1 }}>{ev.text}</span>
              <span className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: ev.gold ? GOLD : 'rgba(245,240,232,0.4)', border: `1px solid ${ev.gold ? 'rgba(245,158,11,0.4)' : 'rgba(245,240,232,0.1)'}`, padding: '2px 8px' }}>{ev.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </SceneFallback>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PLATFORM CAPABILITIES — 9-tile grid
════════════════════════════════════════════════════════════════════════════ */
const CAPABILITIES = [
  { n: '01', title: 'Identity Risk Engine',         body: 'Six real-time detectors scoring every credential, session and service account: credential stuffing, impossible travel, privilege escalation, token theft, shadow AI, MFA fatigue.' },
  { n: '02', title: 'Attack Graph Reconstruction',  body: 'The Temporal Linker correlates six event sources across ±5s windows and produces the full kill-chain narrative with MITRE mapping and confidence scores.' },
  { n: '03', title: 'Explainable AI Triage',        body: 'Every verdict surfaces its evidence, reasoning steps and confidence. Backed by Groq Llama 3 and NVIDIA Nemotron-70B with Llama Guard 3 safety screening.' },
  { n: '04', title: 'SOAR Playbooks',               body: 'Trigger-action-approval pipelines. Seven actions including isolate, webhook, page on-call and rule generation. Every action routes through the Provenance Ledger.' },
  { n: '05', title: 'IOC Intelligence',             body: 'Seven source feeds: VirusTotal, AbuseIPDB, Shodan, MISP, OTX, URLScan, YARA — unified into a single enrichment API with automatic case binding.' },
  { n: '06', title: 'Email Forensics',              body: 'Header parsing, DKIM/SPF/DMARC verification, link detonation, attachment hash scoring and AI narrative for every suspicious message.' },
  { n: '07', title: 'Endpoint Agent v5',            body: 'Honey token canaries, DGA/DNS-tunnel detection, auto-block via iptables/pfctl/netsh, YARA-lite scanning and a guardian process that restarts itself on kill.' },
  { n: '08', title: 'Shadow AI Detection',          body: 'Monitors for unsanctioned model endpoints, prompt-injection attempts via the Shield API and non-human identity sprawl across your AI-agent mesh.' },
  { n: '09', title: 'DORA Compliance Reports',      body: 'Article 19 ICT incident reports auto-drafted from case data. PDF/DOCX export, SLA breach tracking and audit ledger for every analyst action.' },
];

function CapabilityTile({ n, title, body, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: E }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: BG,
        border: '1px solid rgba(245,240,232,0.07)',
        borderTop: `1px solid ${hovered ? GOLD : 'rgba(245,240,232,0.07)'}`,
        padding: 'clamp(22px,2.8vw,32px)',
        cursor: 'default',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 160ms ease-out, transform 160ms ease-out',
      }}
    >
      <div className="mono" style={{ fontSize: 11, color: GOLD, marginBottom: 14, letterSpacing: '0.08em' }}>{n}</div>
      <div className="cd" style={{
        fontSize: 'clamp(16px,1.5vw,20px)', fontWeight: 600, color: INK,
        marginBottom: 10, letterSpacing: '-0.01em', lineHeight: 1.2,
      }}>
        {title}
      </div>
      <div className="cg" style={{ fontSize: 13.5, color: 'rgba(245,240,232,0.5)', lineHeight: 1.65 }}>{body}</div>
    </motion.div>
  );
}

function PlatformCapabilities() {
  return (
    <section id="platform" style={{ padding: 'clamp(80px,10vw,140px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 56 }}>
          <h2 className="cd" style={{
            fontSize: 'clamp(34px,4.5vw,68px)', fontWeight: 600, color: INK,
            margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            One platform. Every layer of trust.
          </h2>
        </Reveal>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
          gap: 1,
          background: 'rgba(245,240,232,0.07)',
        }}>
          {CAPABILITIES.map((cap, i) => (
            <CapabilityTile key={cap.n} {...cap} delay={Math.min(i * 0.04, 0.22)}/>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TECH STACK
════════════════════════════════════════════════════════════════════════════ */
const STACK_ITEMS = [
  'React 18', 'FastAPI', 'SQLite', 'Groq', 'NVIDIA NIM',
  'Three.js', 'Docker', 'YARA', 'MITRE ATT&CK', 'MaxMind GeoLite2',
];

function StackSection() {
  return (
    <section style={{ padding: '0 clamp(24px,5vw,72px) clamp(80px,10vw,140px)' }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto',
        borderTop: '1px solid rgba(245,240,232,0.07)',
        paddingTop: 'clamp(48px,6vw,80px)',
      }}>
        <Reveal>
          <p className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.35)', marginBottom: 24 }}>
            BUILT WITH
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {STACK_ITEMS.map(s => (
              <span key={s} className="mono" style={{
                fontSize: 12, letterSpacing: '0.04em',
                color: 'rgba(245,240,232,0.6)',
                background: 'rgba(245,240,232,0.04)',
                border: '1px solid rgba(245,240,232,0.1)',
                padding: '8px 16px', whiteSpace: 'nowrap',
                transition: 'color 160ms ease-out, border-color 160ms ease-out',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = INK; e.currentTarget.style.borderColor = 'rgba(245,240,232,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,240,232,0.6)'; e.currentTarget.style.borderColor = 'rgba(245,240,232,0.1)'; }}
              >
                {s}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CREDIBILITY
════════════════════════════════════════════════════════════════════════════ */
const PYPI_TOOLS = [
  { name: 'aegis-ioc-scanner',    desc: 'Multi-source IOC lookup with VirusTotal and AbuseIPDB' },
  { name: 'aegis-pcap-analyzer',  desc: 'PCAP dissection with AI-generated threat narrative' },
  { name: 'aegis-log-parser',     desc: 'Structured parser for auth, DNS and HTTP access logs' },
  { name: 'aegis-yara-runner',    desc: 'YARA scanning engine with MITRE ATT&CK mapping' },
];

const CERTS = ['SC-200', 'Security+', 'MSc Computing', 'TCM PEH'];

function CredibilitySection() {
  return (
    <section style={{ padding: 'clamp(80px,10vw,140px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))',
          gap: 'clamp(48px,6vw,96px)',
          alignItems: 'start',
        }}>

          <Reveal>
            <div>
              <h2 className="cd" style={{
                fontSize: 'clamp(28px,3.2vw,48px)', fontWeight: 600, color: INK,
                margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.08,
              }}>
                Built by a practitioner, for practitioners.
              </h2>
              <p className="cg" style={{
                fontSize: 15.5, color: 'rgba(245,240,232,0.55)',
                lineHeight: 1.7, margin: '0 0 32px', maxWidth: 460,
              }}>
                Prasanna Kumar Surendran built AegisTrace after running real incident pipelines on Microsoft Sentinel and finding every gap that SIEM vendors won't acknowledge.
              </p>
              <p className="cg" style={{ fontSize: 14, color: 'rgba(245,240,232,0.38)', lineHeight: 1.65, margin: 0 }}>
                MSc Information Systems &amp; Computing, Dublin Business School 2025. Blue Team SOC engineer. Dublin, Ireland.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
              <div>
                <p className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.3)', marginBottom: 14 }}>CREDENTIALS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CERTS.map(c => (
                    <span key={c} className="mono" style={{
                      fontSize: 11.5, padding: '7px 15px',
                      border: '1px solid rgba(245,158,11,0.35)',
                      color: INK, letterSpacing: '0.04em',
                    }}>{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.3)', marginBottom: 14 }}>PUBLISHED ON PYPI</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {PYPI_TOOLS.map(tool => (
                    <div key={tool.name} style={{ borderTop: '1px solid rgba(245,240,232,0.06)', paddingTop: 12 }}>
                      <div className="mono" style={{ fontSize: 12, color: GOLD, marginBottom: 4 }}>{tool.name}</div>
                      <div className="cg" style={{ fontSize: 12.5, color: 'rgba(245,240,232,0.45)', lineHeight: 1.5 }}>{tool.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FINAL CTA — ripple rings
════════════════════════════════════════════════════════════════════════════ */
function RippleRings() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: `${220 + i * 140}px`,
          height: `${220 + i * 140}px`,
          borderRadius: '50%',
          border: `1px solid rgba(245,158,11,${0.14 - i * 0.03})`,
          animation: reduced ? 'none' : `ripple-expand 3.5s ${i * 0.7}s ease-out infinite`,
        }}/>
      ))}
    </div>
  );
}

function FinalCTA() {
  return (
    <section style={{
      position: 'relative',
      padding: 'clamp(100px,13vw,180px) clamp(24px,5vw,72px)',
      borderTop: '1px solid rgba(245,240,232,0.05)',
      overflow: 'hidden',
    }}>
      <RippleRings/>
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 740, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <h2 className="cd" style={{
            fontSize: 'clamp(40px,6.5vw,88px)', fontWeight: 600, color: INK,
            letterSpacing: '-0.02em', lineHeight: 1.02, margin: '0 0 20px',
          }}>
            Access the platform.
          </h2>
          <p className="cg" style={{ fontSize: 17, color: 'rgba(245,240,232,0.55)', margin: '0 0 40px', lineHeight: 1.6 }}>
            Free, open, deployable. No sales process. No trial gate.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer"
              className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>
              Launch Platform <ArrowRight size={16}/>
            </a>
            <a href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noopener noreferrer"
              className="ghost-btn" style={{ fontSize: 14, padding: '14px 28px' }}>
              View on GitHub
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FOOTER
════════════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '40px clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <div className="cd" style={{ fontSize: 14, fontWeight: 700, color: INK, letterSpacing: '0.1em', marginBottom: 12 }}>AEGISTRACE</div>
            <p className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.35)', lineHeight: 1.65, margin: 0, maxWidth: 220 }}>
              The Trust Operating System for the AI-agent era.
            </p>
          </div>
          <div>
            <div className="cg" style={{ fontSize: 11, color: 'rgba(245,240,232,0.28)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Platform</div>
            {[
              { l: 'Sign In',   to: '/app/login' },
              { l: 'Mission',   to: '/mission' },
              { l: 'Portfolio', to: '/portfolio' },
            ].map(({ l, to }) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <Link to={to} className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none', transition: 'color 140ms' }}
                  onMouseEnter={e => (e.target.style.color = GOLD)}
                  onMouseLeave={e => (e.target.style.color = 'rgba(245,240,232,0.42)')}>
                  {l}
                </Link>
              </div>
            ))}
          </div>
          <div>
            <div className="cg" style={{ fontSize: 11, color: 'rgba(245,240,232,0.28)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Contact</div>
            <a href="mailto:prasanna80564@gmail.com" className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none', display: 'block', marginBottom: 10 }}>
              prasanna80564@gmail.com
            </a>
            <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" className="cg"
              style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', textDecoration: 'none' }}>
              github.com/Prasanna-27eng
            </a>
          </div>
        </div>
        <div style={{
          borderTop: '1px solid rgba(245,240,232,0.05)', paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <span className="mono" style={{ color: 'rgba(245,240,232,0.3)', fontSize: 11, letterSpacing: '0.18em' }}>AEGISTRACE</span>
          <span className="cg" style={{ color: 'rgba(245,240,232,0.3)', fontSize: 12 }}>Built in Dublin. Open source. Free forever.</span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   NAV
════════════════════════════════════════════════════════════════════════════ */
function Nav({ scrolled }) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: E }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,56px)', height: 64,
        background: scrolled ? 'rgba(5,4,5,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(245,158,11,0.13)' : '1px solid transparent',
        transition: 'background 300ms cubic-bezier(0.23,1,0.32,1), border-color 300ms',
      }}
    >
      <Link to="/" className="cd" style={{
        color: INK, textDecoration: 'none',
        fontSize: 15, fontWeight: 700, letterSpacing: '0.12em',
      }}>
        AEGISTRACE
      </Link>
      <div style={{ display: 'flex', gap: 'clamp(16px,2.5vw,32px)', alignItems: 'center' }}>
        <a href="#platform" className="nav-link">Platform</a>
        <Link to="/mission"   className="nav-link">Mission</Link>
        <Link to="/portfolio" className="nav-link">Portfolio</Link>
        <a href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer"
          className="gold-btn" style={{ padding: '9px 20px', fontSize: 12 }}>
          Access Platform <ArrowRight size={12}/>
        </a>
      </div>
    </motion.nav>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();
  const reduced  = useReducedMotion();
  const useFallback = isMobile || reduced;
  const { done }    = useLoading();

  /* Lenis smooth scroll — desktop only */
  useEffect(() => {
    if (reduced || useFallback) return;
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, [reduced, useFallback]);

  /* Nav blur threshold */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <AnimatePresence>{!done && <LoadingScreen/>}</AnimatePresence>

      <div style={{
        background: BG, color: INK, overflowX: 'clip',
        minHeight: '100vh', position: 'relative', isolation: 'isolate',
      }}>
        <ScrollProgressBar/>
        <Nav scrolled={scrolled}/>

        <style>{`
          .cd   { font-family: 'Clash Display', sans-serif; }
          .cg   { font-family: 'Cabinet Grotesk', sans-serif; }
          .mono { font-family: 'JetBrains Mono', monospace; }

          .gold-btn {
            display: inline-flex; align-items: center; gap: 8px;
            background: ${GOLD}; color: #000; font-weight: 700;
            font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px;
            padding: 12px 24px; border: none; cursor: pointer;
            text-decoration: none; letter-spacing: 0.02em;
            transition: background 140ms cubic-bezier(0.23,1,0.32,1), transform 100ms, box-shadow 140ms;
          }
          .gold-btn:hover  { background: #FBBF24; transform: translateY(-2px); box-shadow: 0 0 24px rgba(245,158,11,0.28); }
          .gold-btn:active { transform: scale(0.97); }

          .ghost-btn {
            display: inline-flex; align-items: center; gap: 8px;
            background: transparent; color: rgba(245,240,232,0.72);
            font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
            padding: 11px 22px; border: 1px solid rgba(245,240,232,0.18);
            cursor: pointer; text-decoration: none; letter-spacing: 0.02em;
            transition: border-color 140ms, color 140ms, transform 100ms;
          }
          .ghost-btn:hover  { border-color: rgba(245,240,232,0.42); color: ${INK}; transform: translateY(-2px); }
          .ghost-btn:active { transform: scale(0.97); }

          .nav-link {
            font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
            color: rgba(245,240,232,0.58); text-decoration: none; letter-spacing: 0.02em;
            transition: color 140ms; position: relative;
          }
          .nav-link::after {
            content: ''; position: absolute; left: 0; right: 100%; bottom: -4px;
            height: 1px; background: ${GOLD};
            transition: right 240ms cubic-bezier(0.23,1,0.32,1);
          }
          .nav-link:hover        { color: ${INK}; }
          .nav-link:hover::after { right: 0; }

          @keyframes ticker-march  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes ripple-expand {
            0%   { transform: scale(0.7); opacity: 0.7; }
            100% { transform: scale(1.3); opacity: 0; }
          }

          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          }

          ::selection { background: rgba(245,158,11,0.35); color: ${INK}; }
        `}</style>

        {/* ── SCENES ── */}
        {useFallback ? (
          <>
            <MobileHero/>
            <Ticker/>
            <MobileStat/>
            <MobileBreach/>
          </>
        ) : (
          <>
            <HeroScene/>
            <Ticker/>
            <StatScene/>
            <BreachScene/>
          </>
        )}

        {/* ── CONTENT SECTIONS ── */}
        <PlatformCapabilities/>
        <StackSection/>
        <CredibilitySection/>
        <FinalCTA/>
        <Footer/>
      </div>
    </>
  );
}
