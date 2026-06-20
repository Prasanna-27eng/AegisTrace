import React, { useRef, useState, useEffect } from 'react';
import {
  motion, useTransform,
  useInView, useReducedMotion, AnimatePresence,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useSceneCamera, PinnedScene, ScrollProgressBar } from '../components/SceneController';
import LoadingScreen, { useLoading } from '../components/LoadingScreen';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const GOLD    = '#F59E0B';
const NAVY    = '#0A1628';
const BLUE    = '#2563EB';
const BLUE_L  = '#60A5FA';
const INK     = '#F1F5F9';
const MUTED   = '#94A3B8';
const WS_BG   = '#F0F4F9';
const WS_TEXT = '#0F172A';
const WS_BODY = '#334155';
const E       = [0.23, 1, 0.32, 1];

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
  const inView = useInView(ref, { once: true, margin: '-80px' });
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
    const dur   = 1800;
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
   ANIMATED DASHBOARD MOCKUP — replaces Three.js particle field
════════════════════════════════════════════════════════════════════════════ */
function DashboardMockup() {
  const [alertCount, setAlertCount] = useState(2847);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAlertCount(prev => prev + 1);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 4200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.2)',
      width: '100%',
      maxWidth: 460,
    }}>
      {/* Terminal chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#F87171', '#FBBF24', '#34D399'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.6 }}/>
          ))}
        </div>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11, color: 'rgba(241,245,249,0.35)',
          letterSpacing: '0.1em',
        }}>
          AEGISTRACE · SOC CONSOLE
        </span>
        <div style={{ width: 32 }}/>
      </div>

      {/* Case header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE_L, letterSpacing: '0.1em',
          }}>
            CASE AT-{alertCount}
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, color: '#EF4444',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            padding: '3px 8px', letterSpacing: '0.1em',
            animation: pulse ? 'critical-pulse 0.6s ease-out' : 'none',
          }}>
            CRITICAL
          </span>
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 15, fontWeight: 600, color: INK, lineHeight: 1.3,
        }}>
          Impossible Travel + Privilege Escalation
        </div>
      </div>

      {/* Severity badges grid */}
      <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Impossible Travel', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
          { label: 'Privilege Escalation', color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
          { label: 'MFA Fatigue', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
          { label: 'Session Anomaly', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)' },
        ].map(item => (
          <div key={item.label} style={{
            background: item.bg, border: `1px solid ${item.border}`,
            borderRadius: 6, padding: '8px 10px',
          }}>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 11, color: item.color, fontWeight: 500,
            }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Mini chart */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: MUTED, letterSpacing: '0.1em', marginBottom: 6,
        }}>RISK SCORE TREND · 24H</div>
        <svg width="100%" height="48" viewBox="0 0 420 48" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0,38 L40,36 L80,34 L120,30 L160,28 L200,22 L240,18 L280,12 L320,8 L360,6 L400,4 L420,2" stroke="#2563EB" strokeWidth="2" fill="none" opacity="0.9"/>
          <path d="M0,38 L40,36 L80,34 L120,30 L160,28 L200,22 L240,18 L280,12 L320,8 L360,6 L400,4 L420,2 L420,48 L0,48 Z" fill="url(#chart-grad)"/>
          <circle cx="420" cy="2" r="3" fill="#EF4444">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </div>

      {/* Status bar */}
      <div style={{
        padding: '10px 20px',
        background: 'rgba(37,99,235,0.08)',
        borderTop: '1px solid rgba(37,99,235,0.15)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', animation: 'live-pulse 2s ease-out infinite' }}/>
        </div>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: '#34D399', letterSpacing: '0.1em',
        }}>
          LIVE · AI TRIAGE ACTIVE · 6 DETECTORS RUNNING
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SCENE 1 — Hero (340vh, 4 beats) — Keep existing dolly zoom pattern
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
  const b2FinalOp = useTransform([b2Opacity, b2ExitOp], ([enter, exit]) => enter * exit);

  /* Beat 4 — p 0.72→0.90 */
  const b4Opacity = useTransform(p, [0.72, 0.82], [0, 1], { clamp: true });
  const b4Y       = useTransform(b4Opacity, o => (1 - o) * 28);

  /* Right column mockup fade in */
  const mockupOp  = useTransform(p, [0.68, 0.80], [0, 1], { clamp: true });
  const mockupY   = useTransform(mockupOp, o => (1 - o) * 40);

  return (
    <PinnedScene vh="340vh" sceneRef={ref}>
      {/* Hero gradient background */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #0A1628 0%, #0D2240 35%, #0F3470 65%, #1048A0 85%, #2563EB 100%)',
      }}/>

      {/* Subtle dot grid overlay */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}/>

      {/* Beat 1 */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 clamp(20px,5vw,60px)',
        opacity: b1Opacity, scale: b1Scale, filter: b1Filter,
        willChange: 'transform, opacity, filter',
        pointerEvents: 'none',
      }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(46px,7.5vw,88px)', fontWeight: 800,
          lineHeight: 1.02, letterSpacing: '-0.03em',
          color: INK, margin: 0, textAlign: 'center',
        }}>
          Stop identity threats<br/>before they become breaches.
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
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(46px,7.5vw,88px)', fontWeight: 800,
          lineHeight: 1.02, letterSpacing: '-0.03em',
          color: INK, margin: 0, textAlign: 'center',
        }}>
          Attackers no longer break in.<br/>They <span style={{ color: GOLD }}>sign in.</span>
        </h1>
      </motion.div>

      {/* Beat 4 — Full hero layout with 60/40 split */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center',
        padding: '80px clamp(24px,5vw,72px) 0',
        opacity: b4Opacity, y: b4Y,
        willChange: 'transform, opacity',
      }}>
        <div style={{
          maxWidth: 1240, margin: '0 auto', width: '100%',
          display: 'grid', gridTemplateColumns: '60% 40%',
          gap: 48, alignItems: 'center',
        }}>
          {/* Left column */}
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: BLUE_L,
              letterSpacing: '0.14em', marginBottom: 20,
              textTransform: 'uppercase',
            }}>
              Identity Threat Detection &amp; Response
            </div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(32px,4vw,54px)', fontWeight: 800,
              lineHeight: 1.1, letterSpacing: '-0.02em',
              color: INK, margin: '0 0 20px',
            }}>
              Stop identity threats before they become breaches.
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 16, color: MUTED,
              lineHeight: 1.7, margin: '0 0 32px', maxWidth: 520,
            }}>
              AegisTrace monitors every identity across your environment — human accounts, machine identities, AI agents — and fires when something doesn&apos;t add up.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <Link to="/app/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: BLUE, color: '#fff',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14, fontWeight: 600,
                  padding: '13px 24px', border: 'none', cursor: 'pointer',
                  textDecoration: 'none', letterSpacing: '0.01em', borderRadius: 4,
                  transition: 'background 140ms, transform 100ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Access Platform <ArrowRight size={14}/>
              </Link>
              <Link to="/mission"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent', color: 'rgba(241,245,249,0.8)',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14, fontWeight: 500,
                  padding: '12px 22px', border: '1px solid rgba(241,245,249,0.25)',
                  cursor: 'pointer', textDecoration: 'none', letterSpacing: '0.01em', borderRadius: 4,
                  transition: 'border-color 140ms, color 140ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(241,245,249,0.5)'; e.currentTarget.style.color = INK; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(241,245,249,0.25)'; e.currentTarget.style.color = 'rgba(241,245,249,0.8)'; }}
              >
                Watch Demo
              </Link>
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: 'rgba(148,163,184,0.7)',
              letterSpacing: '0.08em',
            }}>
              SC-200 Certified · 4 Published Tools · Free &amp; Open Source
            </div>
          </div>

          {/* Right column — animated dashboard mockup */}
          <motion.div style={{ opacity: mockupOp, y: mockupY }}>
            <DashboardMockup/>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div style={{
        position: 'absolute', bottom: '5vh', left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        opacity: b4Opacity,
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, letterSpacing: '0.3em', color: 'rgba(241,245,249,0.3)',
        }}>SCROLL TO EXPLORE</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} color="rgba(241,245,249,0.3)"/>
        </motion.div>
      </motion.div>
    </PinnedScene>
  );
}

function MobileHero() {
  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      background: 'linear-gradient(135deg, #0A1628 0%, #0D2240 35%, #0F3470 65%, #1048A0 85%, #2563EB 100%)',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}/>
      <div style={{
        position: 'relative', zIndex: 2, textAlign: 'center',
        padding: '80px 24px 48px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20,
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: BLUE_L,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          Identity Threat Detection &amp; Response
        </div>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(32px,9vw,48px)', fontWeight: 800,
          lineHeight: 1.1, letterSpacing: '-0.02em', color: INK, margin: 0,
        }}>
          Stop identity threats before they become breaches.
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 16, color: MUTED, maxWidth: 420, margin: 0, lineHeight: 1.65,
        }}>
          AegisTrace monitors every identity across your environment and fires when something doesn&apos;t add up.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          <Link to="/app/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: BLUE, color: '#fff',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14, fontWeight: 600, padding: '12px 22px',
              textDecoration: 'none', borderRadius: 4,
            }}>
            Access Platform <ArrowRight size={14}/>
          </Link>
          <Link to="/mission"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent', color: 'rgba(241,245,249,0.8)',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14, fontWeight: 500, padding: '11px 20px',
              border: '1px solid rgba(241,245,249,0.25)', textDecoration: 'none', borderRadius: 4,
            }}>
            Mission
          </Link>
        </div>
        <div style={{ marginTop: 8, width: '100%', maxWidth: 420 }}>
          <DashboardMockup/>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 3 — STAT STRIP (light bg)
════════════════════════════════════════════════════════════════════════════ */
const STATS = [
  { value: 1,  suffix: '',   label: 'platform' },
  { value: 30, suffix: '+',  label: 'pages' },
  { value: 35, suffix: '',   label: 'API routes' },
  { value: 4,  suffix: '',   label: 'PyPI tools' },
  { value: 6,  suffix: '',   label: 'ITDR detectors' },
];

function StatStrip() {
  return (
    <section style={{
      background: WS_BG,
      borderTop: 'rgba(15,23,42,0.1) 1px solid',
      borderBottom: 'rgba(15,23,42,0.1) 1px solid',
      padding: '0 clamp(24px,5vw,72px)',
    }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 0,
      }}>
        {STATS.map((stat, i) => (
          <div key={stat.label} style={{
            padding: 'clamp(24px,4vw,40px) clamp(16px,2vw,24px)',
            borderRight: i < STATS.length - 1 ? 'rgba(15,23,42,0.1) 1px solid' : 'none',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 700,
              color: BLUE, lineHeight: 1, marginBottom: 6,
            }}>
              <Counter end={stat.value} suffix={stat.suffix}/>
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: WS_BODY,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 4 — PLATFORM FEATURE BENTO (light bg, alternating rows)
════════════════════════════════════════════════════════════════════════════ */

/* Feature 1 — terminal animation mockup */
function TerminalMockup() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const LINES = [
    { t: 0.0, prompt: '$', text: 'aegistrace detect --live', gold: false },
    { t: 0.4, prompt: null, text: '' },
    { t: 0.7, prompt: '[!]', text: 'Impossible travel · berlin.de → dublin.ie · 3:41 AM', gold: true },
    { t: 1.2, prompt: '[!]', text: 'Off-hours login · User asleep in Dublin timezone', gold: true },
    { t: 1.6, prompt: '[!]', text: 'Privilege escalation: role Admin granted · svc-backup', gold: true },
    { t: 2.1, prompt: '[✓]', text: 'Case AT-2847 opened · CRITICAL · AI triage active', gold: true },
  ];

  return (
    <div ref={ref} style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, overflow: 'hidden', maxWidth: 520,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {['#F87171', '#FBBF24', '#34D399'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.55 }}/>
        ))}
        <span style={{ marginLeft: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(241,245,249,0.3)' }}>
          soc-console — live detection
        </span>
      </div>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LINES.map((line, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: line.t, ease: E }}
            style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}
          >
            {line.prompt !== null && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: line.prompt === '$' ? BLUE_L
                      : line.prompt === '[✓]' ? '#34D399'
                      : GOLD,
                flexShrink: 0, minWidth: 24,
              }}>{line.prompt}</span>
            )}
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, lineHeight: 1.5,
              color: line.gold ? 'rgba(241,245,249,0.85)' : 'rgba(241,245,249,0.55)',
            }}>{line.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* Feature 2 — AI verdict card */
function AIVerdictCard() {
  return (
    <div style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, overflow: 'hidden', maxWidth: 460,
    }}>
      <div style={{
        padding: '16px 20px',
        background: 'rgba(37,99,235,0.12)',
        borderBottom: '1px solid rgba(37,99,235,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: BLUE_L, letterSpacing: '0.1em' }}>
          AI TRIAGE VERDICT
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#34D399' }}>
          CONFIDENCE 96%
        </span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 14, fontWeight: 700, color: INK, marginBottom: 10,
        }}>
          Account Takeover via Credential Theft
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { step: '01', text: 'Enriched svc-backup@corp IP · Berlin · AbuseIPDB score: 87/100' },
            { step: '02', text: 'Correlated 7 failed logins across 10-min window → stuffing pattern' },
            { step: '03', text: 'Geographic impossibility confirmed · 3,200km in 2h window' },
            { step: '04', text: 'MITRE T1078 · Valid Accounts · Initial Access · HIGH confidence' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: BLUE_L, flexShrink: 0, marginTop: 2 }}>{item.step}</span>
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 14, padding: '8px 12px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 4,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#F87171' }}>
            ESCALATE · Contain account · Block IP · Page on-call
          </span>
        </div>
      </div>
    </div>
  );
}

/* Feature 3 — Attack graph SVG */
function AttackGraphMockup() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const NODES = [
    { id: 'attacker', x: 60, y: 140, label: 'Attacker IP', color: '#EF4444' },
    { id: 'creds', x: 180, y: 60, label: 'Stolen Creds', color: '#F97316' },
    { id: 'login', x: 300, y: 140, label: 'Login Event', color: GOLD },
    { id: 'priv', x: 300, y: 240, label: 'Priv Escalation', color: GOLD },
    { id: 'data', x: 420, y: 80, label: 'Data Access', color: '#F87171' },
    { id: 'detect', x: 420, y: 200, label: 'AT-2847 Detected', color: '#34D399' },
  ];
  const EDGES = [
    { x1: 100, y1: 140, x2: 168, y2: 80 },
    { x1: 210, y1: 70, x2: 275, y2: 130 },
    { x1: 320, y1: 150, x2: 396, y2: 95 },
    { x1: 320, y1: 145, x2: 320, y2: 225 },
    { x1: 340, y1: 240, x2: 400, y2: 210 },
  ];

  return (
    <div ref={ref} style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '20px', maxWidth: 520,
    }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: MUTED, letterSpacing: '0.1em', marginBottom: 12 }}>
        ATTACK GRAPH · CASE AT-2847
      </div>
      <svg width="100%" viewBox="0 0 480 300" style={{ display: 'block' }}>
        {EDGES.map((e, i) => (
          <line key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="rgba(96,165,250,0.4)" strokeWidth="1.5"
            opacity={inView ? 1 : 0}
            style={{ transition: `opacity 0.6s ${0.3 + i * 0.2}s` }}
          />
        ))}
        {NODES.map((node, i) => (
          <g key={node.id}
            style={{
              opacity: inView ? 1 : 0,
              transition: `opacity 0.4s ${i * 0.15}s`,
            }}
          >
            <circle cx={node.x} cy={node.y} r={18} fill={node.color} fillOpacity="0.15" stroke={node.color} strokeWidth="1.5"/>
            <text x={node.x} y={node.y + 30} textAnchor="middle" style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
              fill: 'rgba(241,245,249,0.6)',
            }}>{node.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function FeatureSection() {
  const features = [
    {
      n: '01',
      title: 'Identity Risk Engine',
      desc1: 'Six real-time ITDR detectors fire simultaneously across every identity event in your environment — human accounts, machine identities, AI agents.',
      desc2: 'Credential stuffing, impossible travel, privilege escalation, token theft, shadow AI, and MFA fatigue. All correlated, all scored, all explained.',
      visual: <TerminalMockup/>,
      flip: false,
    },
    {
      n: '02',
      title: 'Explainable AI Triage',
      desc1: 'Every AI verdict surfaces its evidence, reasoning chain, confidence score, and MITRE ATT&CK mapping — no black boxes.',
      desc2: 'Backed by Groq Llama 3 and NVIDIA Nemotron-70B. Every recommendation carries a full chain of custody an analyst can verify and a regulator can audit.',
      visual: <AIVerdictCard/>,
      flip: true,
    },
    {
      n: '03',
      title: 'Attack Graph Reconstruction',
      desc1: 'The Temporal Linker correlates six event sources across ±5s windows and produces the full kill-chain narrative.',
      desc2: 'Visual traversal of entity relationships across users, devices, IPs, and services — with MITRE mapping and confidence scores on every edge.',
      visual: <AttackGraphMockup/>,
      flip: false,
    },
  ];

  return (
    <section style={{ background: WS_BG, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 72 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Platform</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 800,
            color: WS_TEXT, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            One platform. Every layer of trust.
          </h2>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(72px,10vw,120px)' }}>
          {features.map((feature) => (
            <Reveal key={feature.n} delay={0.05}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 'clamp(40px,6vw,80px)',
                alignItems: 'center',
              }}>
                {/* Text */}
                <div style={{ order: feature.flip ? 2 : 1 }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10, color: BLUE, letterSpacing: '0.14em',
                    marginBottom: 12, textTransform: 'uppercase',
                  }}>{feature.n}</div>
                  <h3 style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 'clamp(22px,3vw,36px)', fontWeight: 800,
                    color: WS_TEXT, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.15,
                  }}>{feature.title}</h3>
                  <p style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 16, color: WS_BODY, lineHeight: 1.7, margin: '0 0 14px',
                  }}>{feature.desc1}</p>
                  <p style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 15, color: '#64748B', lineHeight: 1.7, margin: 0,
                  }}>{feature.desc2}</p>
                </div>
                {/* Visual */}
                <div style={{ order: feature.flip ? 1 : 2, display: 'flex', justifyContent: feature.flip ? 'flex-end' : 'flex-start' }}>
                  {feature.visual}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 5 — TOOLS STRIP (dark section)
════════════════════════════════════════════════════════════════════════════ */
const PYPI_TOOLS = [
  { name: 'aegis-ioc-scanner',    desc: 'Multi-source IOC lookup: VirusTotal, AbuseIPDB, Shodan, OTX',   cmd: 'pip install aegis-ioc-scanner' },
  { name: 'aegis-pcap-analyzer',  desc: 'PCAP dissection with AI-generated threat narrative',              cmd: 'pip install aegis-pcap-analyzer' },
  { name: 'aegis-log-parser',     desc: 'Structured parser for auth, DNS and HTTP access logs',            cmd: 'pip install aegis-log-parser' },
  { name: 'aegis-yara-runner',    desc: 'YARA scanning engine with MITRE ATT&CK mapping',                  cmd: 'pip install aegis-yara-runner' },
];

function ToolsSection() {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copy = (idx, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  return (
    <section style={{ background: NAVY, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 56 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE_L, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>PyPI</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,4.5vw,48px)', fontWeight: 800,
            color: INK, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            The offensive toolkit.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 16, color: MUTED, margin: '16px 0 0', maxWidth: 520,
          }}>
            Four tools published on PyPI. Install and run in seconds. No accounts, no keys.
          </p>
        </Reveal>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {PYPI_TOOLS.map((tool, i) => (
            <Reveal key={tool.name} delay={i * 0.07}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '24px',
                height: '100%', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 14, fontWeight: 600, color: GOLD,
                }}>{tool.name}</div>
                <p style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: 0, flex: 1,
                }}>{tool.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11.5, color: BLUE_L,
                    background: 'rgba(37,99,235,0.12)',
                    padding: '5px 10px', flex: 1,
                    borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{tool.cmd}</code>
                  <button onClick={() => copy(i, tool.cmd)} style={{
                    background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                    color: copiedIdx === i ? GOLD : MUTED,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11, padding: '5px 10px', cursor: 'pointer', borderRadius: 4,
                    transition: 'color 140ms, border-color 140ms',
                  }}>{copiedIdx === i ? '✓' : 'copy'}</button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 6 — WHO IT'S FOR (light section)
════════════════════════════════════════════════════════════════════════════ */
const AUDIENCES = [
  {
    title: 'SOC Analysts',
    icon: '🔍',
    desc: 'Stop pivoting between five tools. AegisTrace gives you identity telemetry, IOC enrichment, and AI triage in one timeline.',
    points: [
      'Unified case timeline across all event sources',
      'AI verdict with evidence chain — no black boxes',
      '15-tab investigation workbench',
      'One-click DORA compliance reports',
    ],
  },
  {
    title: 'Security Engineers',
    icon: '⚙️',
    desc: 'Deploy in minutes. Hook up your identity providers. Get real-time ITDR without a six-month procurement cycle.',
    points: [
      'Okta + Azure AD + Auth0 connectors built-in',
      'SOAR playbooks with human approval gates',
      'Endpoint agent in one command',
      'Full API — 35 routes, OpenAPI documented',
    ],
  },
  {
    title: 'Researchers',
    icon: '🧪',
    desc: 'Four published PyPI tools for offensive security research. Attack MCP servers, fuzz LLMs, hunt NHI privilege paths.',
    points: [
      'mcp-sploit — MCP server attack framework',
      'prompt-fuzz — async LLM jailbreak fuzzer',
      'nhi-hunter — AWS IAM privilege path finder',
      'shadow-sniffer — offline shadow AI detector',
    ],
  },
];

function AudienceSection() {
  return (
    <section style={{ background: WS_BG, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 56 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Built for</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 800,
            color: WS_TEXT, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            Who uses AegisTrace.
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, background: 'rgba(15,23,42,0.1)' }}>
          {AUDIENCES.map((aud, i) => (
            <Reveal key={aud.title} delay={i * 0.08}>
              <div
                style={{
                  background: '#FFFFFF', padding: 'clamp(28px,4vw,40px) clamp(24px,3vw,32px)',
                  height: '100%', boxSizing: 'border-box',
                  transition: 'transform 160ms ease-out, box-shadow 160ms ease-out',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,99,235,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{aud.icon}</div>
                <h3 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 22, fontWeight: 800, color: WS_TEXT,
                  margin: '0 0 12px', letterSpacing: '-0.01em',
                }}>{aud.title}</h3>
                <p style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 15, color: WS_BODY, lineHeight: 1.7, margin: '0 0 20px',
                }}>{aud.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aud.points.map(pt => (
                    <li key={pt} style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 13.5, color: '#475569', lineHeight: 1.5,
                      display: 'flex', gap: 10,
                    }}>
                      <span style={{ color: BLUE, flexShrink: 0 }}>→</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 7 — CTA BAND (gradient dark)
════════════════════════════════════════════════════════════════════════════ */
function CTABand() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #0A1628, #0F3470)',
      padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Reveal>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800,
            color: INK, letterSpacing: '-0.02em', lineHeight: 1.1,
            margin: '0 0 20px',
          }}>
            The complete SOC, without the procurement cycle.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 17, color: MUTED, margin: '0 0 36px', lineHeight: 1.6,
          }}>
            Free, open, deployable. No sales process. No trial gate. No $100k invoice.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
            <a href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: BLUE, color: '#fff',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15, fontWeight: 600, padding: '14px 28px',
                borderRadius: 4, textDecoration: 'none',
                transition: 'background 140ms, transform 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Launch Platform <ArrowRight size={16}/>
            </a>
            <a href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: 'rgba(241,245,249,0.75)',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15, fontWeight: 500, padding: '13px 26px',
                border: '1px solid rgba(241,245,249,0.2)',
                borderRadius: 4, textDecoration: 'none',
                transition: 'border-color 140ms, color 140ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(241,245,249,0.4)'; e.currentTarget.style.color = INK; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(241,245,249,0.2)'; e.currentTarget.style.color = 'rgba(241,245,249,0.75)'; }}
            >
              View on GitHub
            </a>
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: 'rgba(148,163,184,0.55)',
            letterSpacing: '0.08em',
          }}>
            SC-200 Certified · 4 Published Tools · Free &amp; Open Source
          </div>
        </Reveal>
      </div>
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
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.24em', color: GOLD }}>
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
      background: NAVY,
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
   FOOTER
════════════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ background: '#070D1A', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 14, fontWeight: 800, color: INK, letterSpacing: '0.1em', marginBottom: 12,
            }}>AEGISTRACE</div>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13, color: MUTED, lineHeight: 1.65, margin: 0, maxWidth: 220,
            }}>
              The Trust Operating System for the AI-agent era.
            </p>
          </div>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 11, color: 'rgba(148,163,184,0.5)', letterSpacing: '0.14em',
              textTransform: 'uppercase', marginBottom: 16, fontWeight: 600,
            }}>Platform</div>
            {[
              { l: 'Sign In',   to: '/app/login' },
              { l: 'Mission',   to: '/mission' },
              { l: 'Portfolio', to: '/portfolio' },
              { l: 'Platform',  to: '/platform' },
            ].map(({ l, to }) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <Link to={to} style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13, color: MUTED, textDecoration: 'none', transition: 'color 140ms',
                }}
                  onMouseEnter={e => (e.target.style.color = INK)}
                  onMouseLeave={e => (e.target.style.color = MUTED)}>
                  {l}
                </Link>
              </div>
            ))}
          </div>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 11, color: 'rgba(148,163,184,0.5)', letterSpacing: '0.14em',
              textTransform: 'uppercase', marginBottom: 16, fontWeight: 600,
            }}>Contact</div>
            <a href="mailto:prasanna80564@gmail.com" style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13, color: MUTED, textDecoration: 'none', display: 'block', marginBottom: 10,
            }}>
              prasanna80564@gmail.com
            </a>
            <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13, color: MUTED, textDecoration: 'none',
            }}>
              github.com/Prasanna-27eng
            </a>
          </div>
        </div>
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'rgba(148,163,184,0.4)', fontSize: 11, letterSpacing: '0.18em',
          }}>AEGISTRACE</span>
          <span style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            color: 'rgba(148,163,184,0.4)', fontSize: 12,
          }}>Built in Dublin. Open source. Free forever.</span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   NAV — always dark, fixed 56px
════════════════════════════════════════════════════════════════════════════ */
function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: E }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,56px)', height: 56,
        background: NAVY,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Link to="/" style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: INK, textDecoration: 'none',
        fontSize: 15, fontWeight: 800, letterSpacing: '0.1em',
      }}>
        AEGISTRACE
      </Link>
      <div style={{ display: 'flex', gap: 'clamp(16px,2.5vw,32px)', alignItems: 'center' }}>
        {[
          { label: 'Platform', to: '/platform' },
          { label: 'Mission',  to: '/mission' },
          { label: 'Portfolio',to: '/portfolio' },
        ].map(({ label, to }) => (
          <Link key={label} to={to} style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13, fontWeight: 500,
            color: 'rgba(241,245,249,0.7)', textDecoration: 'none', letterSpacing: '0.02em',
            transition: 'color 140ms',
          }}
            onMouseEnter={e => (e.target.style.color = INK)}
            onMouseLeave={e => (e.target.style.color = 'rgba(241,245,249,0.7)')}>
            {label}
          </Link>
        ))}
        <a href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: BLUE, color: '#fff',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 12, fontWeight: 600,
            padding: '8px 18px', borderRadius: 4, border: 'none', cursor: 'pointer',
            textDecoration: 'none', letterSpacing: '0.02em',
            transition: 'background 140ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1D4ED8')}
          onMouseLeave={e => (e.currentTarget.style.background = BLUE)}
        >
          Get Started <ArrowRight size={12}/>
        </a>
      </div>
    </motion.nav>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const isMobile = useIsMobile();
  const reduced  = useReducedMotion();
  const useFallback = isMobile || reduced;
  const { done }    = useLoading();

  /* Lenis smooth scroll — desktop only */
  useEffect(() => {
    if (reduced || useFallback) return;
    const lenis = new Lenis({ lerp: 0.06, smoothWheel: true, wheelMultiplier: 0.88, infinite: false });
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, [reduced, useFallback]);

  return (
    <>
      <AnimatePresence>{!done && <LoadingScreen/>}</AnimatePresence>

      <div style={{
        background: NAVY, color: INK, overflowX: 'clip',
        minHeight: '100vh', position: 'relative', isolation: 'isolate',
      }}>
        <ScrollProgressBar/>
        <Nav/>

        <style>{`
          @keyframes ticker-march  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes critical-pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); } 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }
          @keyframes live-pulse    { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }

          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          }

          ::selection { background: rgba(37,99,235,0.3); color: #F1F5F9; }
        `}</style>

        {/* ── HERO ── */}
        {useFallback ? <MobileHero/> : <HeroScene/>}

        {/* ── TICKER ── */}
        <Ticker/>

        {/* ── STAT STRIP ── */}
        <StatStrip/>

        {/* ── FEATURE BENTO ── */}
        <FeatureSection/>

        {/* ── TOOLS STRIP ── */}
        <ToolsSection/>

        {/* ── WHO IT'S FOR ── */}
        <AudienceSection/>

        {/* ── CTA BAND ── */}
        <CTABand/>

        {/* ── FOOTER ── */}
        <Footer/>
      </div>
    </>
  );
}
