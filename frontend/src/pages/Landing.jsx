import React, { useRef, useState, useEffect } from 'react';
import {
  motion, useTransform,
  useInView, useReducedMotion, AnimatePresence,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useSceneCamera, PinnedScene, ScrollProgressBar } from '../components/SceneController';
import LoadingScreen, { useLoading } from '../components/LoadingScreen';
import CardNav from '../components/CardNav';
import LaserFlow from '../components/LaserFlow';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const GOLD    = '#F59E0B';
const NAVY    = '#050505';
const BLUE    = '#4A7EC8';
const BLUE_L  = '#8BB8E8';
const INK     = '#BDD4E8';
const MUTED   = '#7A9DB8';
const WS_BG   = '#0E0E16';
const WS_TEXT = '#BDD4E8';
const WS_BODY = '#7A9DB8';
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
      border: '1px solid rgba(74,126,200,0.12)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,126,200,0.2)',
      width: '100%',
      maxWidth: 460,
    }}>
      {/* Terminal chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(74,126,200,0.04)',
        borderBottom: '1px solid rgba(74,126,200,0.07)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#F87171', '#FBBF24', '#34D399'].map(c => (
            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.6 }}/>
          ))}
        </div>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11, color: 'rgba(189,212,232,0.35)',
          letterSpacing: '0.1em',
        }}>
          AEGISTRACE · SOC CONSOLE
        </span>
        <div style={{ width: 32 }}/>
      </div>

      {/* Case header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(74,126,200,0.06)' }}>
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
              <stop offset="0%" stopColor="#4A7EC8" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#4A7EC8" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0,38 L40,36 L80,34 L120,30 L160,28 L200,22 L240,18 L280,12 L320,8 L360,6 L400,4 L420,2" stroke="#4A7EC8" strokeWidth="2" fill="none" opacity="0.9"/>
          <path d="M0,38 L40,36 L80,34 L120,30 L160,28 L200,22 L240,18 L280,12 L320,8 L360,6 L400,4 L420,2 L420,48 L0,48 Z" fill="url(#chart-grad)"/>
          <circle cx="420" cy="2" r="3" fill="#EF4444">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </div>

      {/* Status bar */}
      <div style={{
        padding: '10px 20px',
        background: 'rgba(74,126,200,0.08)',
        borderTop: '1px solid rgba(74,126,200,0.15)',
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
  const b1BlurPx  = useTransform(p, [0.18, 0.30], [0, 18], { clamp: true });
  const b1Filter  = useTransform(b1BlurPx, v => `blur(${v}px)`);

  /* Beat 2 — p 0.28→0.54 */
  const b2Opacity = useTransform(p, [0.28, 0.38], [0, 1], { clamp: true });
  const b2Y       = useTransform(p, [0.28, 0.54], [28, 0], { clamp: true });
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
      {/* LaserFlow animated hero background */}
      <LaserFlow />

      {/* Beat 1 */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 clamp(20px,5vw,60px)',
        opacity: b1Opacity, filter: b1Filter,
        willChange: 'opacity, filter',
        pointerEvents: 'none',
      }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(46px,7.5vw,88px)', fontWeight: 800,
          lineHeight: 1.02, letterSpacing: '-0.03em',
          color: INK, margin: 0, textAlign: 'center',
        }}>
          Your AI agents operate autonomously.
        </h1>
      </motion.div>

      {/* Beat 2 */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 clamp(20px,5vw,60px)',
        opacity: b2FinalOp, y: b2Y, filter: b2Filter,
        willChange: 'transform, opacity, filter',
        pointerEvents: 'none',
      }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(46px,7.5vw,88px)', fontWeight: 800,
          lineHeight: 1.02, letterSpacing: '-0.03em',
          color: INK, margin: 0, textAlign: 'center',
        }}>
          Your security should too —<br/>with <span style={{ color: GOLD }}>accountability.</span>
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
              Autonomous AI Security Platform · v10.2
            </div>
            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(32px,4vw,54px)', fontWeight: 800,
              lineHeight: 1.1, letterSpacing: '-0.02em',
              color: INK, margin: '0 0 20px',
            }}>
              AegisTrace is the accountability infrastructure for the AI-agent era.
            </h1>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 16, color: MUTED,
              lineHeight: 1.7, margin: '0 0 32px', maxWidth: 520,
            }}>
              Every identity scored. Every decision explained. Every action reversible.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <a href="/app/login" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: BLUE, color: '#fff',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14, fontWeight: 600,
                  padding: '13px 24px', border: 'none', cursor: 'pointer',
                  textDecoration: 'none', letterSpacing: '0.01em', borderRadius: 4,
                  transition: 'background 140ms, transform 100ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#3A6AB8'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Book a Private Demo <ArrowRight size={14}/>
              </a>
              <Link to="/mission"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent', color: 'rgba(189,212,232,0.8)',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14, fontWeight: 500,
                  padding: '12px 22px', border: '1px solid rgba(189,212,232,0.25)',
                  cursor: 'pointer', textDecoration: 'none', letterSpacing: '0.01em', borderRadius: 4,
                  transition: 'border-color 140ms, color 140ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(189,212,232,0.5)'; e.currentTarget.style.color = INK; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(189,212,232,0.25)'; e.currentTarget.style.color = 'rgba(189,212,232,0.8)'; }}
              >
                Our Mission
              </Link>
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: 'rgba(122,157,184,0.7)',
              letterSpacing: '0.08em',
            }}>
              Self-Hosted · Multi-Tenant · Built in Dublin, Ireland
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
          fontSize: 10, letterSpacing: '0.3em', color: 'rgba(189,212,232,0.3)',
        }}>SCROLL TO EXPLORE</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} color="rgba(189,212,232,0.3)"/>
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
      background: 'linear-gradient(135deg, #050505 0%, #080818 40%, #0A1428 70%, #0F1E3E 100%)',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(74,126,200,0.04) 1px, transparent 1px)',
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
          Autonomous AI Security Platform · v10.2
        </div>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(32px,9vw,48px)', fontWeight: 800,
          lineHeight: 1.1, letterSpacing: '-0.02em', color: INK, margin: 0,
        }}>
          AegisTrace is the accountability infrastructure for the AI-agent era.
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 16, color: MUTED, maxWidth: 420, margin: 0, lineHeight: 1.65,
        }}>
          Every identity scored. Every decision explained. Every action reversible.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          <a href="/app/login" target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: BLUE, color: '#fff',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14, fontWeight: 600, padding: '12px 22px',
              textDecoration: 'none', borderRadius: 4,
            }}>
            Book a Private Demo <ArrowRight size={14}/>
          </a>
          <Link to="/mission"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent', color: 'rgba(189,212,232,0.8)',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14, fontWeight: 500, padding: '11px 20px',
              border: '1px solid rgba(189,212,232,0.25)', textDecoration: 'none', borderRadius: 4,
            }}>
            Our Mission
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
  { value: 12, suffix: '',   label: 'modules' },
  { value: 35, suffix: '',   label: 'API routes' },
  { value: 5,  suffix: '',   label: 'PyPI tools' },
  { value: 6,  suffix: '',   label: 'ITDR detectors' },
];

function StatStrip() {
  return (
    <section style={{
      background: WS_BG,
      borderTop: 'rgba(14,14,22,0.1) 1px solid',
      borderBottom: 'rgba(14,14,22,0.1) 1px solid',
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
            borderRight: i < STATS.length - 1 ? 'rgba(14,14,22,0.1) 1px solid' : 'none',
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
   TRUST BAR — horizontal scrolling badges (dark bg)
════════════════════════════════════════════════════════════════════════════ */
const TRUST_BADGES = [
  'Multi-Tenant Architecture',
  'Explainable Verdicts',
  'Human Approval Gates',
  'MITRE ATT&CK Mapped',
  'DORA · DPDPA · RBI Aligned',
];

function TrustBar() {
  return (
    <div style={{
      background: NAVY,
      borderTop: '1px solid rgba(74,126,200,0.06)',
      borderBottom: '1px solid rgba(74,126,200,0.06)',
      padding: '14px clamp(24px,5vw,72px)',
      overflowX: 'auto',
    }}>
      <div style={{
        display: 'flex', gap: 32, alignItems: 'center',
        justifyContent: 'center', flexWrap: 'wrap',
        maxWidth: 1240, margin: '0 auto',
      }}>
        {TRUST_BADGES.map(badge => (
          <span key={badge} style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: MUTED,
            letterSpacing: '0.08em', whiteSpace: 'nowrap',
          }}>
            <span style={{ color: GOLD, marginRight: 6 }}>&#10003;</span>{badge}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PROBLEM SECTION — "The Accountability Gap" (light bg)
════════════════════════════════════════════════════════════════════════════ */
const PROBLEM_STATS = [
  { value: '78%',   label: "of organisations cannot explain an AI agent's decision after the fact" },
  { value: '144:1', label: 'machine identities per human employee in the average enterprise' },
  { value: '<3%',   label: 'of AI-agent incidents detected by existing SIEM/EDR stacks' },
  { value: '€2.4M', label: 'average cost of an AI-related breach in 2025 (Ponemon Institute)' },
];

function ProblemSection() {
  return (
    <section style={{ background: WS_BG, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 56 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>The Accountability Gap</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 800,
            color: WS_TEXT, margin: '0 0 40px', letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            Autonomous AI Has No Audit Trail. Until Now.
          </h2>
          <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 17, color: WS_BODY, lineHeight: 1.75, margin: 0,
            }}>
              Your organisation has deployed AI agents that triage tickets, approve transactions,
              write code, query databases, and interact with customers. These agents make thousands
              of decisions every hour. Most of those decisions leave no trace anyone can inspect.
            </p>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 17, color: WS_BODY, lineHeight: 1.75, margin: 0,
            }}>
              When an AI agent approves a fraudulent transaction, when it leaks customer data to an
              unauthorised tool, when it escalates privileges it shouldn&apos;t have &mdash; your security team
              gets a single question from the board: &ldquo;Why did the system allow this?&rdquo;
            </p>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 17, color: WS_BODY, lineHeight: 1.75, margin: 0,
            }}>
              Today, most organisations cannot answer that question. Not because the data doesn&apos;t
              exist &mdash; but because no platform was built to capture it. SIEMs log events. EDRs protect
              endpoints. Neither was designed for a world where non-human identities outnumber humans
              144-to-1.
            </p>
          </div>
        </Reveal>

        {/* Stat cards 2x2 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginTop: 16,
        }}>
          {PROBLEM_STATS.map((stat, i) => (
            <Reveal key={stat.value} delay={i * 0.08}>
              <div style={{
                background: '#0E0E16',
                border: '1px solid rgba(14,14,22,0.08)',
                borderRadius: 10,
                padding: 'clamp(24px,3vw,36px)',
                boxShadow: '0 1px 4px rgba(14,14,22,0.06)',
              }}>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 48, fontWeight: 800,
                  color: BLUE, lineHeight: 1, marginBottom: 12,
                  letterSpacing: '-0.03em',
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14, color: WS_BODY, lineHeight: 1.6,
                }}>
                  {stat.label}
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
   SOLUTION SECTION — "Accountability Infrastructure" (dark bg)
════════════════════════════════════════════════════════════════════════════ */
const SOLUTION_PILLARS = [
  {
    title: 'Identity Threat Detection & Response',
    body: 'Six specialised detectors monitor every human, service account, API key, AI agent, and token in real time. Multi-window analytics (10min / 1h / 24h).',
    tag: 'ITDR · 6 Detectors · Multi-Window',
  },
  {
    title: 'Explainable Verdicts',
    body: 'Every AI output ships with its evidence, reasoning chain, confidence score, and a plain-language "what could be wrong" section. No black boxes.',
    tag: 'Transparent · Auditable · Multi-Model',
  },
  {
    title: 'Human Approval Queue',
    body: 'Every automated action passes through an approval layer. Every decision logged to the Provenance Ledger with full reversibility.',
    tag: 'Human Confirmation · Provenance Ledger',
  },
  {
    title: 'Autonomous Response Engine',
    body: 'Visual playbook builder with approval gates, audit trails, and rollback capability.',
    tag: 'SOAR · Visual Builder · Approval Gates',
  },
  {
    title: 'Self-Tuning Detection',
    body: 'Adaptive agent reviews false-positive/negative rates every 4 hours, proposes threshold adjustments within hardcoded safety bounds.',
    tag: 'Adaptive · Self-Tuning · Bounded',
  },
  {
    title: 'Attack Reconstruction',
    body: 'Temporal linker correlates events across six sources, narrative AI builds plain-language attack story with MITRE chain mapping.',
    tag: 'Temporal Correlation · Narrative AI',
  },
];

function SolutionSection() {
  return (
    <section style={{ background: NAVY, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 64 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE_L, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Accountability Infrastructure</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800,
            color: INK, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            Every Identity Scored. Every Decision Explained. Every Action Reversible.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 17, color: MUTED, margin: 0, maxWidth: 640, lineHeight: 1.65,
          }}>
            AegisTrace replaces reactive logging with proactive accountability.
          </p>
        </Reveal>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {SOLUTION_PILLARS.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 0.07}>
              <div
                style={{
                  background: 'rgba(74,126,200,0.04)',
                  border: '1px solid rgba(74,126,200,0.12)',
                  borderRadius: 10,
                  padding: 'clamp(24px,3vw,32px)',
                  height: '100%', boxSizing: 'border-box',
                  transition: 'border-color 160ms ease-out',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,126,200,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(74,126,200,0.12)'; }}
              >
                <h3 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 16, fontWeight: 600, color: INK,
                  margin: '0 0 12px', lineHeight: 1.3,
                }}>{pillar.title}</h3>
                <p style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13, color: MUTED, lineHeight: 1.65,
                  margin: '0 0 16px',
                }}>{pillar.body}</p>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, color: GOLD,
                  letterSpacing: '0.08em',
                }}>{pillar.tag}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MODULES SECTION — "12 Modules. One Unified Platform." (light bg)
════════════════════════════════════════════════════════════════════════════ */
const MODULES = [
  { n: '01', name: 'Case Management',     desc: '15-tab investigation workspace with autosave, SLA tracking, MITRE mapping' },
  { n: '02', name: 'Identity Graph',      desc: 'Force-directed canvas tracking users, service accounts, API keys, AI agents' },
  { n: '03', name: 'ITDR Engine',         desc: 'Six real-time identity threat detectors with multi-window analytics' },
  { n: '04', name: 'Attack Graph',        desc: 'Temporal linker + AI-generated attack narratives from correlated events' },
  { n: '05', name: 'SOAR Playbooks',      desc: 'Visual builder with automated execution, approval gates, and rollback' },
  { n: '06', name: 'Adaptive Agent',      desc: 'Self-tuning detection thresholds based on live FP/FN performance' },
  { n: '07', name: 'Endpoint Agent',      desc: 'v6.1 — honey tokens, YARA-lite, DNS/DGA, auto-block, ATSP-encrypted telemetry' },
  { n: '08', name: 'AI Defense Console',  desc: 'Live attack feed with human-in-the-loop approve/block/escalate/dismiss' },
  { n: '09', name: 'Threat Hunt',         desc: 'Cross-case IOC correlation + DuckDB SQL console over live telemetry' },
  { n: '10', name: 'Hardware Forensics',  desc: '18 parsers for WiFi, RF, USB/HID, RFID/NFC, and network attack tools' },
  { n: '11', name: 'Terminal Lab',        desc: 'Full Linux-style analyst environment with AI-powered output parsing' },
  { n: '12', name: '7-Source Enrichment', desc: 'VirusTotal, Shodan, GreyNoise, IPInfo, URLhaus, ThreatFox, MalwareBazaar' },
];

function ModulesSection() {
  return (
    <section style={{ background: WS_BG, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 56 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Platform</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 800,
            color: WS_TEXT, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            12 Modules. One Unified Platform.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 17, color: WS_BODY, margin: 0, maxWidth: 640, lineHeight: 1.65,
          }}>
            Every capability a modern SOC needs &mdash; integrated at the data layer, not bolted on at the UI layer.
          </p>
        </Reveal>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 12,
        }}>
          {MODULES.map((mod, i) => (
            <Reveal key={mod.n} delay={i * 0.04}>
              <div
                style={{
                  background: '#0E0E16',
                  border: '1px solid rgba(74,126,200,0.12)',
                  borderRadius: 10,
                  padding: '20px 22px',
                  height: '100%', boxSizing: 'border-box',
                  transition: 'transform 140ms ease-out, border-color 140ms ease-out, box-shadow 140ms ease-out',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = BLUE;
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,126,200,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(74,126,200,0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11, color: GOLD, marginBottom: 8,
                }}>{mod.n}</div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 14, fontWeight: 600, color: WS_TEXT,
                  marginBottom: 6, lineHeight: 1.3,
                }}>{mod.name}</div>
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 12, color: '#7A9DB8', lineHeight: 1.55,
                }}>{mod.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   GRASSROOTS TOOLKIT SECTION (dark section)
════════════════════════════════════════════════════════════════════════════ */
const GRASSROOTS_TOOLS = [
  { name: 'mcp-aegis',      desc: 'MCP Security Gateway. Sits between AI agents and MCP servers. Blocks by default, logs every decision.',   cmd: 'pip install mcp-aegis' },
  { name: 'mcp-sploit',     desc: 'MCP Exploitation Framework. 6 modules with MITRE ATT&CK mapping. Purple-teams your MCP gateway.',         cmd: 'pip install mcp-sploit' },
  { name: 'prompt-fuzz',    desc: 'Prompt Injection Fuzzer. 51 payloads, 10 categories, CI-gate ready.',                                     cmd: 'pip install prompt-fuzz' },
  { name: 'nhi-hunter',     desc: 'NHI Privilege Escalation Pathfinder. Finds multi-hop IAM chains. Maps to T1078.004.',                     cmd: 'pip install nhi-hunter' },
  { name: 'shadow-sniffer', desc: 'Shadow AI Detector. 39-domain catalog, 8 categories, T1567 mapping.',                                     cmd: 'pip install shadow-sniffer' },
];

function GrassrootsSection() {
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
            color: INK, margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            The Grassroots Security Toolkit
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 16, color: MUTED, margin: 0, maxWidth: 600, lineHeight: 1.65,
          }}>
            Four enterprise-grade PyPI packages. Each attacks a different layer of the AI stack. All feed the central dashboard.
          </p>
        </Reveal>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {GRASSROOTS_TOOLS.map((tool, i) => (
            <Reveal key={tool.name} delay={i * 0.07}>
              <div style={{
                background: 'rgba(74,126,200,0.05)',
                border: '1px solid rgba(74,126,200,0.08)',
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
                    background: 'rgba(74,126,200,0.12)',
                    padding: '5px 10px', flex: 1,
                    borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{tool.cmd}</code>
                  <button onClick={() => copy(i, tool.cmd)} style={{
                    background: 'none', border: '1px solid rgba(74,126,200,0.15)',
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

        {/* Callout box */}
        <Reveal delay={0.2} style={{ marginTop: 40 }}>
          <div style={{
            background: 'rgba(74,126,200,0.08)',
            border: '1px solid rgba(74,126,200,0.25)',
            borderRadius: 10,
            padding: 'clamp(20px,3vw,32px)',
          }}>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 15, color: INK, lineHeight: 1.7, margin: 0, textAlign: 'center',
            }}>
              Every finding from every tool flows into AegisTrace&apos;s{' '}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: BLUE_L, fontSize: 13 }}>/app/agent-security</span>
              {' '}dashboard.{' '}
              <span style={{ color: MUTED }}>Offensive tools. Defensive platform. One unified accountability surface.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPARISON TABLE SECTION (light bg)
════════════════════════════════════════════════════════════════════════════ */
const COMPARISON_ROWS = [
  { cap: 'Identity-first threat detection',  at: true,  cs: true,      sen: true,      lak: false,    spl: false },
  { cap: 'AI-agent observability',           at: true,  cs: false,     sen: 'Partial', lak: true,     spl: false },
  { cap: 'Explainable AI verdicts',          at: true,  cs: false,     sen: false,     lak: 'Partial', spl: false },
  { cap: 'Human approval queue',             at: true,  cs: false,     sen: false,     lak: false,    spl: true  },
  { cap: 'Self-tuning detection',            at: true,  cs: false,     sen: false,     lak: false,    spl: false },
  { cap: 'MCP server security',              at: true,  cs: false,     sen: false,     lak: false,    spl: false },
  { cap: 'Hardware attack forensics',        at: true,  cs: false,     sen: false,     lak: false,    spl: false },
  { cap: 'Self-hostable',                    at: true,  cs: false,     sen: false,     lak: false,    spl: false },
];

function renderCell(val) {
  if (val === true)      return <span style={{ color: '#16A34A', fontSize: 16 }}>&#10003;</span>;
  if (val === false)     return <span style={{ color: '#94A3B8', fontSize: 14 }}>&#10007;</span>;
  if (val === 'Partial') return <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: '#F59E0B' }}>Partial</span>;
  return null;
}

const DIFF_CARDS = [
  {
    vs: 'vs Enterprise SIEMs',
    body: 'They log everything but explain nothing. AegisTrace shows the full reasoning chain behind every alert — with evidence, confidence, and MITRE mapping attached to every verdict.',
  },
  {
    vs: 'vs AI Security Startups',
    body: 'They focus on one layer — prompt injection, or model output scanning. AegisTrace covers the full stack: identity, agents, MCP servers, endpoints, hardware, and SOAR.',
  },
  {
    vs: 'vs EDR Platforms',
    body: 'They protect endpoints. We protect the trust surface — the humans, machines, AI agents, and tokens that make decisions inside your environment every second of every day.',
  },
];

function ComparisonSection() {
  const headerStyle = {
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 12, fontWeight: 600,
    padding: '10px 16px', textAlign: 'center',
    background: 'rgba(14,14,22,0.04)',
    borderBottom: '1px solid rgba(14,14,22,0.08)',
    color: WS_TEXT,
  };

  const cellStyle = {
    padding: '12px 16px', textAlign: 'center',
    borderBottom: '1px solid rgba(14,14,22,0.06)',
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 13,
  };

  return (
    <section style={{ background: WS_BG, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 56 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Stack Fit</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 800,
            color: WS_TEXT, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            Where AegisTrace Fits in Your Stack
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 17, color: WS_BODY, margin: 0, maxWidth: 600, lineHeight: 1.65,
          }}>
            We don&apos;t replace your SIEM or EDR. We complete them &mdash; at the layer they weren&apos;t built for.
          </p>
        </Reveal>

        {/* Comparison table */}
        <Reveal delay={0.1} style={{ marginBottom: 48, overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            background: '#0E0E16', borderRadius: 10, overflow: 'hidden',
            border: '1px solid rgba(14,14,22,0.08)',
            boxShadow: '0 1px 4px rgba(14,14,22,0.06)',
            minWidth: 640,
          }}>
            <thead>
              <tr>
                <th style={{ ...headerStyle, textAlign: 'left', minWidth: 220 }}>Capability</th>
                <th style={{ ...headerStyle, background: 'rgba(74,126,200,0.1)', color: BLUE }}>AegisTrace</th>
                <th style={headerStyle}>CrowdStrike</th>
                <th style={headerStyle}>Sentinel</th>
                <th style={headerStyle}>Lakera</th>
                <th style={headerStyle}>Splunk SOAR</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.cap} style={{ background: i % 2 === 0 ? '#0E0E16' : 'rgba(14,14,22,0.5)' }}>
                  <td style={{ ...cellStyle, textAlign: 'left', color: WS_BODY, fontWeight: 500 }}>{row.cap}</td>
                  <td style={{ ...cellStyle, background: 'rgba(74,126,200,0.06)' }}>{renderCell(row.at)}</td>
                  <td style={cellStyle}>{renderCell(row.cs)}</td>
                  <td style={cellStyle}>{renderCell(row.sen)}</td>
                  <td style={cellStyle}>{renderCell(row.lak)}</td>
                  <td style={cellStyle}>{renderCell(row.spl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        {/* Differentiator cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {DIFF_CARDS.map((card, i) => (
            <Reveal key={card.vs} delay={i * 0.08}>
              <div style={{
                background: '#0E0E16',
                border: '1px solid rgba(74,126,200,0.12)',
                borderRadius: 10,
                padding: 'clamp(20px,3vw,28px)',
                boxShadow: '0 1px 4px rgba(14,14,22,0.05)',
              }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11, color: BLUE, letterSpacing: '0.1em',
                  marginBottom: 12, textTransform: 'uppercase',
                }}>{card.vs}</div>
                <p style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14, color: WS_BODY, lineHeight: 1.7, margin: 0,
                }}>{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TRUST SECTION — "Hardened by Audit." (dark bg)
════════════════════════════════════════════════════════════════════════════ */
const TRUST_PILLARS = [
  {
    title: 'ATSP — Formally Verified Protocol',
    body: 'AegisTrace Secure Protocol: X25519 forward-secret handshake, ChaCha20-Poly1305 encryption, 3-layer replay protection. Every security property machine-proved with ProVerif. Published spec — verify yourself.',
    badge: 'v10.4 NEW',
  },
  {
    title: 'SHA-256 Hash Chain',
    body: 'Every AI decision is cryptographically chained. Tamper one provenance record and the entire chain breaks. Export a Trust Certificate for DORA Article 19 submission.',
    badge: 'v10.3',
  },
  {
    title: 'File Security Layer',
    body: 'Every uploaded file verified by magic bytes before processing. ChaCha20-Poly1305 encryption at rest. Decompression bomb detection. Subprocess isolation with 30s timeout.',
    badge: 'v10.3',
  },
  {
    title: 'Two Independent Audits',
    body: 'v10.1: CVE remediation, 17+ table IDOR sweep, CORS/CSP lockdown, DNS-rebinding defenses. v10.2: SSRF guard, agent-command auth, prompt injection shield on all AI paths.',
  },
  {
    title: 'Human Control Preserved',
    body: 'Every automated action requires human confirmation. Approval layer + Provenance Ledger with full reversibility. Audit-ready by design.',
  },
  {
    title: 'Self-Hostable',
    body: 'Deploy on your own infrastructure. Your data never leaves your network. Full control over retention, access, and audit. Built for regulated industries.',
  },
];

function TrustSection() {
  return (
    <section style={{ background: NAVY, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 64 }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: BLUE_L, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Security</div>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 800,
            color: INK, margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.05,
          }}>
            Hardened by Audit. Built for Production.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 17, color: MUTED, margin: 0, maxWidth: 540, lineHeight: 1.65,
          }}>
            Every line of code has been through two independent security audits.
          </p>
        </Reveal>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {TRUST_PILLARS.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 0.07}>
              <div
                style={{
                  background: 'rgba(74,126,200,0.04)',
                  border: '1px solid rgba(74,126,200,0.12)',
                  borderRadius: 10,
                  padding: 'clamp(22px,3vw,32px)',
                  height: '100%', boxSizing: 'border-box',
                  transition: 'border-color 160ms',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,126,200,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(74,126,200,0.12)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <h3 style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 15, fontWeight: 700, color: INK,
                    margin: 0, lineHeight: 1.3,
                  }}>{pillar.title}</h3>
                  {pillar.badge && (
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9, fontWeight: 700, color: GOLD,
                      background: 'rgba(245,158,11,0.12)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap',
                      letterSpacing: '0.06em',
                    }}>{pillar.badge}</span>
                  )}
                </div>
                <p style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13, color: MUTED, lineHeight: 1.65,
                  margin: 0,
                }}>{pillar.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CTA BAND (gradient dark)
════════════════════════════════════════════════════════════════════════════ */
function CTABand() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #050505, #0F1428)',
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
            Autonomous AI needs accountable security.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 17, color: MUTED, margin: '0 0 36px', lineHeight: 1.6,
          }}>
            Join the security teams, SOC analysts, and AI builders already using AegisTrace.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
            <a href="/app/login" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: BLUE, color: '#fff',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15, fontWeight: 600, padding: '14px 28px',
                borderRadius: 4, textDecoration: 'none',
                transition: 'background 140ms, transform 100ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3A6AB8'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Book a Private Demo <ArrowRight size={16}/>
            </a>
            <a href="mailto:Prasanna80564@gmail.com"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: 'rgba(189,212,232,0.75)',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15, fontWeight: 500, padding: '13px 26px',
                border: '1px solid rgba(189,212,232,0.2)',
                borderRadius: 4, textDecoration: 'none',
                transition: 'border-color 140ms, color 140ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(241,245,249,0.4)'; e.currentTarget.style.color = INK; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(189,212,232,0.2)'; e.currentTarget.style.color = 'rgba(189,212,232,0.75)'; }}
            >
              Talk to the Founder &rarr;
            </a>
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: 'rgba(122,157,184,0.55)',
            letterSpacing: '0.08em',
          }}>
            Self-hosted &middot; Multi-tenant &middot; Built in Dublin, Ireland &middot; No data leaves your network
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
          <span aria-hidden style={{ color: 'rgba(245,158,11,0.35)', fontSize: 14 }}>&middot;</span>
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
    <footer style={{ background: '#050505', borderTop: '1px solid rgba(74,126,200,0.06)', padding: '40px clamp(24px,5vw,72px)' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <img src="/assets/brand/aegistrace-icon-transparent.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.6 }}/>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: 'rgba(189,212,232,0.3)', fontSize: 11, letterSpacing: '0.16em' }}>AEGISTRACE</span>
            </div>
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 13, color: MUTED, lineHeight: 1.65, margin: 0, maxWidth: 220,
            }}>
              The Accountability Infrastructure for the AI-agent era.
            </p>
          </div>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 11, color: 'rgba(122,157,184,0.5)', letterSpacing: '0.14em',
              textTransform: 'uppercase', marginBottom: 16, fontWeight: 600,
            }}>Platform</div>
            {[
              { l: 'Sign In',   to: '/app/login' },
              { l: 'Mission',   to: '/mission' },
              { l: 'Features',  to: '/features' },
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
              fontSize: 11, color: 'rgba(122,157,184,0.5)', letterSpacing: '0.14em',
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
          borderTop: '1px solid rgba(74,126,200,0.06)', paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'rgba(189,212,232,0.3)', fontSize: 11, letterSpacing: '0.18em',
          }}>AEGISTRACE</span>
          <span style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            color: 'rgba(122,157,184,0.4)', fontSize: 12,
          }}>Built in Dublin, Ireland &middot; Self-hosted &middot; No data leaves your network</span>
        </div>
      </div>
    </footer>
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

  return (
    <>
      <AnimatePresence>{!done && <LoadingScreen/>}</AnimatePresence>

      <div style={{
        background: NAVY, color: INK, overflowX: 'clip',
        minHeight: '100vh', position: 'relative', isolation: 'isolate',
      }}>
        <ScrollProgressBar/>
        <CardNav/>

        <style>{`
          @keyframes ticker-march  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes critical-pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); } 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }
          @keyframes live-pulse    { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }

          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          }

          ::selection { background: rgba(74,126,200,0.3); color: #BDD4E8; }
        `}</style>

        {/* HERO */}
        {useFallback ? <MobileHero/> : <HeroScene/>}

        {/* TICKER */}
        <Ticker/>

        {/* STAT STRIP */}
        <StatStrip/>

        {/* TRUST BAR */}
        <TrustBar/>

        {/* PROBLEM SECTION */}
        <ProblemSection/>

        {/* SOLUTION SECTION */}
        <SolutionSection/>

        {/* MODULES SECTION */}
        <ModulesSection/>

        {/* GRASSROOTS TOOLKIT */}
        <GrassrootsSection/>

        {/* COMPARISON TABLE */}
        <ComparisonSection/>

        {/* TRUST SECTION */}
        <TrustSection/>

        {/* CTA BAND */}
        <CTABand/>

        {/* FOOTER */}
        <Footer/>
      </div>
    </>
  );
}
