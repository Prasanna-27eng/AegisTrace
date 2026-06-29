import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion';
import CardNav from '../components/CardNav';
import {
  ArrowRight, Shield, Brain, Eye, Database, CheckCircle,
  Layers, Zap, Github, Network, ShieldCheck, Fingerprint,
  Users, FileText, Lock, Cpu,
} from '../components/icons';

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const T = {
  bg:         '#F5F0E8',
  surface:    '#EDE7DC',
  card:       '#E8E0D4',
  cardHover:  '#DDD4C4',
  accent:     '#CC785C',
  accentL:    '#E8A080',
  pubBg:      '#FAF7F2',
  pubAlt:     '#F2EDE5',
  pubText:    '#1A1612',
  pubMuted:   '#6B6258',
  darkText:   '#1A1612',
  darkMuted:  '#6B6258',
  border:     'rgba(26,22,18,0.09)',
  borderMed:  'rgba(240,235,227,0.12)',
  pubBorder:  'rgba(26,22,18,0.09)',
  fontD:      "'DM Serif Display', Georgia, serif",
  fontUI:     "'DM Sans', system-ui, sans-serif",
  fontMono:   "'IBM Plex Mono', monospace",
  ease:       [0.23, 1, 0.32, 1],
};

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ─── Hooks ──────────────────────────────────────────────────────────────── */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return m;
}

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => { setTouch(window.matchMedia('(hover: none)').matches); }, []);
  return touch;
}

/* ─── Reveal ─────────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 30, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: T.ease }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Counter ────────────────────────────────────────────────────────────── */
function Counter({ end, suffix = '' }) {
  const ref = useRef(null);
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

/* ─── Bento card ─────────────────────────────────────────────────────────── */
function BentoCard({ icon: Icon, title, desc, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={delay}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        animate={{ y: hovered ? -4 : 0 }}
        transition={{ duration: 0.22, ease: T.ease }}
        style={{
          background: hovered ? T.cardHover : T.card,
          border: `1px solid ${hovered ? 'rgba(204,120,92,0.35)' : T.border}`,
          borderRadius: 16, padding: '28px 28px 32px',
          cursor: 'default', height: '100%',
          boxShadow: hovered
            ? '0 8px 32px rgba(204,120,92,0.18), 0 0 0 1px rgba(204,120,92,0.2)'
            : '0 2px 8px rgba(26,22,18,0.07)',
          transition: 'background 0.22s, border-color 0.22s, box-shadow 0.22s',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(204,120,92,0.12)', border: '1px solid rgba(204,120,92,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Icon size={22} color={T.accent} />
        </div>
        <div style={{ fontFamily: T.fontD, fontSize: '1.15rem', color: T.darkText, marginBottom: 10, lineHeight: 1.3 }}>
          {title}
        </div>
        <div style={{ fontFamily: T.fontUI, fontSize: '0.88rem', color: T.darkMuted, lineHeight: 1.7 }}>
          {desc}
        </div>
      </motion.div>
    </Reveal>
  );
}

/* ─── Step card ──────────────────────────────────────────────────────────── */
function StepCard({ num, title, desc, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div style={{ position: 'relative', paddingTop: 16 }}>
        <div style={{
          fontFamily: T.fontD, fontSize: 'clamp(4rem, 9vw, 7rem)',
          color: 'rgba(26,22,18,0.06)', lineHeight: 1,
          position: 'absolute', top: -28, left: -12,
          fontStyle: 'italic', userSelect: 'none', pointerEvents: 'none',
        }}>{num}</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: T.fontD, fontSize: '1.35rem',
            color: T.pubText, marginBottom: 12, lineHeight: 1.3,
          }}>{title}</div>
          <div style={{
            fontFamily: T.fontUI, fontSize: '1rem',
            color: T.pubMuted, lineHeight: 1.75,
          }}>{desc}</div>
        </div>
      </div>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const isMobile = useIsMobile();
  const isTouch  = useIsTouch();
  const heroRef  = useRef(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const rotateX = useTransform(rawY, [-1, 1], [3, -3]);
  const rotateY = useTransform(rawX, [-1, 1], [-4, 4]);
  const srX = useSpring(rotateX, { stiffness: 120, damping: 28 });
  const srY = useSpring(rotateY, { stiffness: 120, damping: 28 });

  const dotX = useTransform(rawX, [-1, 1], [-18, 18]);
  const dotY = useTransform(rawY, [-1, 1], [-14, 14]);
  const sdotX = useSpring(dotX, { stiffness: 80, damping: 20 });
  const sdotY = useSpring(dotY, { stiffness: 80, damping: 20 });

  const ringX = useTransform(rawX, [-1, 1], [-28, 28]);
  const ringY = useTransform(rawY, [-1, 1], [-22, 22]);
  const sringX = useSpring(ringX, { stiffness: 60, damping: 18 });
  const sringY = useSpring(ringY, { stiffness: 60, damping: 18 });

  const handleMouseMove = useCallback((e) => {
    if (isTouch) return;
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    rawY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }, [isTouch, rawX, rawY]);

  const handleMouseLeave = useCallback(() => { rawX.set(0); rawY.set(0); }, [rawX, rawY]);

  return (
    <div style={{ fontFamily: T.fontUI, background: T.bg, overflowX: 'hidden' }}>
      <CardNav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative', background: T.bg,
          minHeight: '100vh', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(100px,14vw,160px) clamp(20px,5vw,80px) clamp(80px,10vw,120px)',
        }}
      >
        {/* Grain */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', backgroundImage: GRAIN, opacity: 0.04 }} />
        {/* Radial glow */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(204,120,92,0.08) 0%, transparent 70%)',
        }} />

        {/* Parallax dot grid layer 1 */}
        <motion.div style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(26,22,18,0.07) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          x: isTouch ? 0 : sdotX,
          y: isTouch ? 0 : sdotY,
        }} />

        {/* Parallax ring layer 2 */}
        {!isTouch && (
          <motion.div style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            x: sringX, y: sringY,
          }}>
            <div style={{
              position: 'absolute', top: '28%', right: '12%',
              width: 320, height: 320, borderRadius: '50%',
              border: '1px solid rgba(204,120,92,0.1)',
            }} />
            <div style={{
              position: 'absolute', top: '22%', right: '7%',
              width: 500, height: 500, borderRadius: '50%',
              border: '1px solid rgba(204,120,92,0.05)',
            }} />
          </motion.div>
        )}

        {/* 3D tilt container */}
        <motion.div style={{
          position: 'relative', zIndex: 2,
          maxWidth: 820, width: '100%', textAlign: 'center',
          rotateX: isTouch ? 0 : srX,
          rotateY: isTouch ? 0 : srY,
          transformStyle: 'preserve-3d',
          perspective: 1200,
        }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: T.ease }}
            style={{ display: 'inline-flex', marginBottom: 28 }}
          >
            <span style={{
              fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: T.accent, background: 'rgba(204,120,92,0.1)',
              border: '1px solid rgba(204,120,92,0.25)',
              borderRadius: 100, padding: '6px 16px',
            }}>Open Source · Free Forever</span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.2, ease: T.ease }}
            style={{
              fontFamily: T.fontD, fontStyle: 'normal',
              fontSize: 'clamp(2.4rem, 7vw, 5.2rem)',
              lineHeight: 1.12, color: T.darkText,
              margin: '0 0 28px', fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            Accountability Infrastructure<br />
            for the{' '}
            <em style={{ color: T.accent, fontStyle: 'italic' }}>AI-agent era</em>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: T.ease }}
            style={{
              fontFamily: T.fontUI, fontSize: 'clamp(1rem, 2.2vw, 1.18rem)',
              color: T.darkMuted, lineHeight: 1.75,
              maxWidth: 580, margin: '0 auto 44px',
            }}
          >
            AegisTrace is an open-source Identity Threat Detection & Response platform —
            built for security teams who can't afford blind spots in the AI era.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.48, ease: T.ease }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <a
              href="/app/login" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: T.accent, color: '#fff',
                fontFamily: T.fontUI, fontWeight: 600, fontSize: '0.98rem',
                padding: '14px 28px', borderRadius: 12,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(204,120,92,0.4)',
                transition: 'transform 0.22s, box-shadow 0.22s, background 0.22s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(204,120,92,0.55)'; e.currentTarget.style.background = '#B8644A'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,120,92,0.4)'; e.currentTarget.style.background = T.accent; }}
            >
              Enter Platform <ArrowRight size={16} />
            </a>
            <a
              href="https://github.com/prasxdev/aegistrace" target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: T.darkMuted,
                fontFamily: T.fontUI, fontWeight: 500, fontSize: '0.98rem',
                padding: '14px 24px', borderRadius: 12,
                border: `1px solid ${T.border}`, textDecoration: 'none',
                transition: 'color 0.22s, border-color 0.22s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = T.darkText; e.currentTarget.style.borderColor = T.borderMed; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.darkMuted; e.currentTarget.style.borderColor = T.border; }}
            >
              <Github size={16} /> View on GitHub
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          style={{
            position: 'absolute', bottom: 40, left: '50%',
            transform: 'translateX(-50%)', zIndex: 2,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontFamily: T.fontUI, fontSize: '0.68rem', color: 'rgba(240,235,227,0.28)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            style={{ width: 1, height: 28, background: 'linear-gradient(to bottom, rgba(204,120,92,0.6), transparent)' }}
          />
        </motion.div>
      </section>

      {/* ── FEATURES STRIP (light) ───────────────────────────────────────── */}
      <section style={{
        background: T.pubBg,
        padding: 'clamp(56px,8vw,80px) clamp(20px,5vw,80px)',
        borderTop: `1px solid ${T.pubBorder}`,
        borderBottom: `1px solid ${T.pubBorder}`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {[
                'ITDR Detection', 'AI Anomaly Analysis', 'Case Management',
                'Identity Graph', 'SOAR Playbooks', 'Compliance Evidence',
                'Endpoint Telemetry', 'Attack Path Mapping', 'Open Source',
              ].map((cap, i) => (
                <motion.span
                  key={cap}
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: T.ease }}
                  style={{
                    fontFamily: T.fontUI, fontSize: '0.85rem', fontWeight: 500,
                    color: T.pubText, background: 'rgba(26,22,18,0.05)',
                    border: `1px solid ${T.pubBorder}`,
                    borderRadius: 100, padding: '8px 18px', whiteSpace: 'nowrap',
                  }}
                >{cap}</motion.span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── BENTO GRID (dark) ────────────────────────────────────────────── */}
      <section style={{
        background: T.bg,
        padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.04, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Platform Capabilities</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 style={{
              fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              color: T.darkText, fontWeight: 400, margin: '0 0 16px',
              lineHeight: 1.2, letterSpacing: '-0.015em',
            }}>Everything a modern SOC needs</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p style={{
              fontFamily: T.fontUI, fontSize: '1.05rem', color: T.darkMuted,
              lineHeight: 1.75, maxWidth: 540, margin: '0 0 60px',
            }}>
              Six integrated modules working together to detect, investigate,
              and respond to identity threats — at machine speed.
            </p>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            <BentoCard icon={Shield} title="ITDR Detection Engine" delay={0}
              desc="Behavioral baselines, rule-based detections, and ML anomaly signals across all identity providers — Okta, Entra ID, CrowdStrike, and more." />
            <BentoCard icon={FileText} title="Case Management" delay={0.06}
              desc="Structured investigation timelines, evidence collection, and collaborative case notes. Every alert becomes a traceable, closeable case." />
            <BentoCard icon={Brain} title="AI-Powered Analysis" delay={0.12}
              desc="Multi-model AI triage that summarizes alerts, proposes containment actions, and generates executive-ready reports in seconds." />
            <BentoCard icon={Network} title="Identity Graph" delay={0.18}
              desc="Visualize lateral movement, privilege escalation paths, and blast radius across your entire identity estate in a live graph." />
            <BentoCard icon={CheckCircle} title="Compliance Evidence" delay={0.24}
              desc="Auto-generated evidence packages for SOC2, ISO 27001, and NIST CSF. Audit-ready documentation at the click of a button." />
            <BentoCard icon={Cpu} title="Endpoint Telemetry" delay={0.30}
              desc="Lightweight agent for macOS and Linux. Correlate endpoint events with identity signals for full attack chain visibility." />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (light) ─────────────────────────────────────────── */}
      <section style={{
        background: T.pubBg,
        padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Process</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 style={{
              fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              color: T.pubText, fontWeight: 400, margin: '0 0 64px',
              lineHeight: 1.2, letterSpacing: '-0.015em',
            }}>How it works</h2>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 52 : 64,
            position: 'relative',
          }}>
            {!isMobile && (
              <div style={{
                position: 'absolute', top: 12, left: '16%', right: '16%', height: 1,
                background: `linear-gradient(to right, transparent, rgba(204,120,92,0.25), transparent)`,
                zIndex: 0,
              }} />
            )}
            <StepCard num="01" title="Connect your identity stack" delay={0}
              desc="Plug in Okta, Entra ID, CrowdStrike, and 15+ other sources via API. AegisTrace normalizes events into a unified timeline in minutes." />
            <StepCard num="02" title="Detect and triage at scale" delay={0.1}
              desc="Detection models fire on behavioral anomalies, impossible travel, credential stuffing, and AI agent misuse — with sub-second alert generation." />
            <StepCard num="03" title="Investigate and respond" delay={0.2}
              desc="AI analysts summarize context, propose containment, and generate compliance evidence — so your team closes cases in hours, not days." />
          </div>
        </div>
      </section>

      {/* ── STATS BAR (dark) ─────────────────────────────────────────────── */}
      <section style={{
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        padding: 'clamp(60px,8vw,96px) clamp(20px,5vw,80px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.04, pointerEvents: 'none' }} />
        <div style={{
          maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 48 : 0, textAlign: 'center',
        }}>
          {[
            { num: 100, suffix: '%', label: 'Open Source', sub: 'Always free, always transparent' },
            { num: 15,  suffix: '+', label: 'Detection Models', sub: 'AI + rule-based hybrid coverage' },
            { num: 3,   suffix: '',  label: 'Compliance Frameworks', sub: 'SOC2 · ISO 27001 · NIST CSF' },
          ].map(({ num, suffix, label, sub }, i) => (
            <Reveal key={label} delay={i * 0.12}>
              <div style={{
                padding: isMobile ? 0 : '0 32px',
                borderRight: (!isMobile && i < 2) ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  fontFamily: T.fontD, fontStyle: 'italic',
                  fontSize: 'clamp(3rem, 6vw, 5rem)',
                  color: T.accent, lineHeight: 1, marginBottom: 12,
                }}>
                  <Counter end={num} suffix={suffix} />
                </div>
                <div style={{ fontFamily: T.fontD, fontSize: '1.2rem', color: T.darkText, marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: T.fontUI, fontSize: '0.88rem', color: T.darkMuted }}>{sub}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section style={{
        background: T.bg,
        padding: 'clamp(100px,12vw,140px) clamp(20px,5vw,80px)',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(204,120,92,0.1) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.04, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={{
              fontFamily: T.fontD, fontStyle: 'italic',
              fontSize: 'clamp(2rem, 5vw, 3.8rem)',
              color: T.darkText, fontWeight: 400, margin: '0 0 24px',
              lineHeight: 1.15, letterSpacing: '-0.015em',
            }}>
              Your identity perimeter<br />deserves better than alerts.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{
              fontFamily: T.fontUI, fontSize: '1.05rem',
              color: T.darkMuted, lineHeight: 1.75, margin: '0 0 44px',
            }}>
              Join security teams using AegisTrace to detect insider threats,
              stop credential abuse, and stay audit-ready — for free.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/app/login" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: T.accent, color: '#fff',
                  fontFamily: T.fontUI, fontWeight: 600, fontSize: '1rem',
                  padding: '15px 32px', borderRadius: 12, textDecoration: 'none',
                  boxShadow: '0 4px 24px rgba(204,120,92,0.45)',
                  transition: 'transform 0.22s, box-shadow 0.22s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(204,120,92,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(204,120,92,0.45)'; }}
              >
                Start for Free <ArrowRight size={16} />
              </a>
              <a href="https://github.com/prasxdev/aegistrace" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent', color: T.darkMuted,
                  fontFamily: T.fontUI, fontWeight: 500, fontSize: '1rem',
                  padding: '15px 28px', borderRadius: 12,
                  border: `1px solid ${T.border}`, textDecoration: 'none',
                  transition: 'color 0.22s, border-color 0.22s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = T.darkText; e.currentTarget.style.borderColor = T.borderMed; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.darkMuted; e.currentTarget.style.borderColor = T.border; }}
              >
                <Github size={16} /> View on GitHub
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{
        background: T.surface, borderTop: `1px solid ${T.border}`,
        padding: 'clamp(40px,5vw,56px) clamp(20px,5vw,80px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 20,
        }}>
          <div style={{ fontFamily: T.fontD, fontSize: '1.1rem', color: T.darkText }}>AegisTrace</div>
          <div style={{ fontFamily: T.fontUI, fontSize: '0.84rem', color: T.darkMuted }}>
            © 2025 Prasanna Kumar · MIT License
          </div>
        </div>
      </footer>
    </div>
  );
}
