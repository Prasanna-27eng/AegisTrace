import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion';
import CardNav from '../components/CardNav';
import { ArrowRight, Shield, Brain, Eye } from '../components/icons';

/* ─── Tokens ──────────────────────────────────────────────────────────────── */
const T = {
  bg:        '#141210',
  surface:   '#1C1916',
  card:      '#222018',
  accent:    '#CC785C',
  pubBg:     '#FAF7F2',
  pubAlt:    '#F2EDE5',
  pubText:   '#1A1612',
  pubMuted:  '#6B6258',
  darkText:  '#F0EBE3',
  darkMuted: 'rgba(240,235,227,0.62)',
  border:    'rgba(240,235,227,0.08)',
  borderMed: 'rgba(240,235,227,0.12)',
  pubBorder: 'rgba(26,22,18,0.09)',
  fontD:     "'DM Serif Display', Georgia, serif",
  fontUI:    "'DM Sans', system-ui, sans-serif",
  ease:      [0.23, 1, 0.32, 1],
};
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => { const fn = () => setM(window.innerWidth <= 768); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return m;
}
function useIsTouch() {
  const [t, setT] = useState(false);
  useEffect(() => { setT(window.matchMedia('(hover: none)').matches); }, []);
  return t;
}
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

function PhaseItem({ phase, title, desc, status, delay = 0 }) {
  const sc = status === 'complete' ? '#10B981' : status === 'active' ? T.accent : T.pubMuted;
  const sl = status === 'complete' ? 'Complete' : status === 'active' ? 'In Progress' : 'Planned';
  return (
    <Reveal delay={delay}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: status === 'complete' ? 'rgba(16,185,129,0.12)' : status === 'active' ? 'rgba(204,120,92,0.12)' : 'rgba(26,22,18,0.06)',
            border: `1px solid ${sc}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.fontD, fontSize: '0.9rem', color: sc, fontStyle: 'italic',
          }}>{phase}</div>
        </div>
        <div style={{ flex: 1, paddingBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: T.fontD, fontSize: '1.2rem', color: T.pubText }}>{title}</div>
            <span style={{
              fontFamily: T.fontUI, fontSize: '0.7rem', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: sc,
              background: status === 'complete' ? 'rgba(16,185,129,0.1)' : status === 'active' ? 'rgba(204,120,92,0.1)' : 'rgba(26,22,18,0.06)',
              border: `1px solid ${sc}33`, borderRadius: 100, padding: '3px 10px',
            }}>{sl}</span>
          </div>
          <div style={{ fontFamily: T.fontUI, fontSize: '0.95rem', color: T.pubMuted, lineHeight: 1.7 }}>{desc}</div>
        </div>
      </div>
    </Reveal>
  );
}

export default function Mission() {
  const isMobile = useIsMobile();
  const isTouch  = useIsTouch();
  const heroRef  = useRef(null);
  const rawX = useMotionValue(0), rawY = useMotionValue(0);
  const rX = useSpring(useTransform(rawY, [-1,1], [3,-3]), { stiffness: 100, damping: 26 });
  const rY = useSpring(useTransform(rawX, [-1,1], [-3,3]), { stiffness: 100, damping: 26 });
  const dX = useSpring(useTransform(rawX, [-1,1], [-16,16]), { stiffness: 70, damping: 18 });
  const dY = useSpring(useTransform(rawY, [-1,1], [-12,12]), { stiffness: 70, damping: 18 });
  const onMM = useCallback((e) => {
    if (isTouch) return;
    const r = heroRef.current?.getBoundingClientRect(); if (!r) return;
    rawX.set(((e.clientX - r.left) / r.width) * 2 - 1);
    rawY.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }, [isTouch, rawX, rawY]);
  const onML = useCallback(() => { rawX.set(0); rawY.set(0); }, [rawX, rawY]);

  const CONVICTIONS = [
    { num: '01', icon: Shield, title: 'Identity is the new perimeter', body: "Firewalls protect networks. But when the attacker already has valid credentials — from phishing, token theft, or a compromised third-party agent — the network perimeter means nothing. Every modern attack chain runs through an identity provider. That's where the battle is fought." },
    { num: '02', icon: Brain,  title: 'AI agents need accountability too', body: "As autonomous agents act on behalf of users — reading email, calling APIs, triggering workflows — the attack surface multiplies. AegisTrace treats AI agent activity as a first-class identity event: logged, analyzed, and held to the same behavioral standards as any human user." },
    { num: '03', icon: Eye,    title: 'Open source is a security principle', body: 'Security tooling that hides its detection logic is asking for trust without evidence. Our models, rules, and data pipelines are open source — so your team can audit every decision, extend every detection, and never be locked into a black box.' },
  ];

  const PHASES = [
    { phase: 'I',   title: 'Core ITDR + Case Management',         status: 'complete', desc: 'Unified event ingest, behavioral detections, investigation timelines, and evidence packaging. The foundational platform.' },
    { phase: 'II',  title: 'AI Analyst + Multi-model Triage',     status: 'complete', desc: 'Multi-model AI for alert summarization, severity scoring, and containment recommendations. Claude, GPT-4, and local models.' },
    { phase: 'III', title: 'Identity Graph + Attack Path Mapping', status: 'active',   desc: 'Live graph visualization of identity relationships, privilege escalation chains, and lateral movement paths.' },
    { phase: 'IV',  title: 'ATSP Protocol + Agent Attestation',    status: 'active',   desc: 'AegisTrace Security Protocol — a standardized framework for AI agent identity, permission scoping, and activity logging.' },
    { phase: 'V',   title: 'Enterprise Scale + SaaS Launch',       status: 'planned',  desc: 'Multi-tenant SaaS offering, SCIM provisioning, SSO, and enterprise compliance packages.' },
  ];

  return (
    <div style={{ fontFamily: T.fontUI, background: T.bg, overflowX: 'hidden' }}>
      <CardNav />

      {/* HERO */}
      <section ref={heroRef} onMouseMove={onMM} onMouseLeave={onML}
        style={{
          position: 'relative', background: T.bg, minHeight: '88vh', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(100px,14vw,160px) clamp(20px,5vw,80px) clamp(80px,10vw,120px)',
        }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.025, pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(204,120,92,0.1) 0%, transparent 65%)' }} />
        <motion.div style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(204,120,92,0.15) 1px, transparent 1px)',
          backgroundSize: '36px 36px', x: isTouch ? 0 : dX, y: isTouch ? 0 : dY,
        }} />

        <motion.div style={{
          position: 'relative', zIndex: 2, maxWidth: 760, width: '100%', textAlign: 'center',
          rotateX: isTouch ? 0 : rX, rotateY: isTouch ? 0 : rY,
          transformStyle: 'preserve-3d', perspective: 1200,
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: T.ease }} style={{ display: 'inline-flex', marginBottom: 32 }}>
            <span style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.accent, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.25)', borderRadius: 100, padding: '6px 16px' }}>Our Mission</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.2, ease: T.ease }}
            style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(2.2rem, 6vw, 4.8rem)', lineHeight: 1.15, color: T.darkText, margin: '0 0 28px', fontWeight: 400, letterSpacing: '-0.02em' }}>
            We believe every identity<br />deserves accountability
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.36, ease: T.ease }}
            style={{ fontFamily: T.fontUI, fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: T.darkMuted, lineHeight: 1.75, maxWidth: 560, margin: '0 auto' }}>
            In a world where AI agents act autonomously on behalf of people and organizations,
            the question of who did what — and why — has never mattered more.
          </motion.p>
        </motion.div>
      </section>

      {/* THREE CONVICTIONS (light) */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Principles</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.pubText, fontWeight: 400, margin: '0 0 72px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>
              Three convictions that guide everything
            </h2>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 80 }}>
            {CONVICTIONS.map(({ num, icon: Icon, title, body }, i) => (
              <Reveal key={num} delay={i * 0.1}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '180px 1fr',
                  gap: isMobile ? 20 : 64, alignItems: 'flex-start',
                }}>
                  <div style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: isMobile ? '4.5rem' : 'clamp(4rem, 8vw, 7rem)', color: 'rgba(26,22,18,0.06)', lineHeight: 1, userSelect: 'none' }}>{num}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={T.accent} />
                      </div>
                      <h3 style={{ fontFamily: T.fontD, fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: T.pubText, fontWeight: 400, margin: 0, lineHeight: 1.3 }}>{title}</h3>
                    </div>
                    <p style={{ fontFamily: T.fontUI, fontSize: '1.05rem', color: T.pubMuted, lineHeight: 1.8, margin: 0, maxWidth: 580 }}>{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* BUILDER PROFILE (dark) */}
      <section style={{ background: T.bg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.025, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 60% at 20% 50%, rgba(204,120,92,0.07) 0%, transparent 60%)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <Reveal>
              <div>
                <p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 20 }}>Builder</p>
                <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.darkText, fontWeight: 400, margin: '0 0 24px', lineHeight: 1.2 }}>Prasanna Kumar</h2>
                <p style={{ fontFamily: T.fontUI, fontSize: '1rem', color: T.darkMuted, lineHeight: 1.8, marginBottom: 32 }}>
                  Blue Team analyst and security engineer based in Dublin, Ireland.
                  AegisTrace started as a personal toolbox — scripts to detect impossible travel,
                  automate Okta investigations, and map attack paths. It grew into a platform.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {['ITDR', 'Cloud Security', 'Python', 'Threat Intelligence', 'Dublin, Ireland'].map(tag => (
                    <span key={tag} style={{ fontFamily: T.fontUI, fontSize: '0.8rem', fontWeight: 500, color: T.darkMuted, background: 'rgba(240,235,227,0.06)', border: `1px solid rgba(240,235,227,0.08)`, borderRadius: 100, padding: '5px 14px' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div style={{ background: T.surface, border: `1px solid rgba(240,235,227,0.08)`, borderRadius: 20, padding: '36px' }}>
                <blockquote style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', color: T.darkText, lineHeight: 1.55, margin: 0 }}>
                  "I built this because every enterprise SIEM I used felt like it was designed for a team of 20. SOC analysts need clarity, not complexity."
                </blockquote>
                <div style={{ marginTop: 24, fontFamily: T.fontUI, fontSize: '0.85rem', color: T.darkMuted }}>— Prasanna Kumar, Founder</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ROADMAP (light) */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Roadmap</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.pubText, fontWeight: 400, margin: '0 0 64px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>Five phases to a full platform</h2>
          </Reveal>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 19, top: 40, bottom: 40, width: 1, background: `linear-gradient(to bottom, rgba(204,120,92,0.4), rgba(26,22,18,0.1))` }} />
            {PHASES.map((p, i) => <PhaseItem key={p.phase} {...p} delay={i * 0.08} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: T.bg, padding: 'clamp(80px,10vw,100px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.025, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: T.darkText, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              Join us in building the future of identity security
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1rem', color: T.darkMuted, lineHeight: 1.75, margin: '0 0 36px' }}>AegisTrace is fully open source. Contribute, fork, deploy — or just use it.</p>
          </Reveal>
          <Reveal delay={0.18}>
            <a href="/app/login" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', fontFamily: T.fontUI, fontWeight: 600, fontSize: '0.98rem', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(204,120,92,0.4)', transition: 'transform 0.22s, box-shadow 0.22s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(204,120,92,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,120,92,0.4)'; }}
            >Enter Platform <ArrowRight size={16} /></a>
          </Reveal>
        </div>
      </section>

      <footer style={{ background: T.surface, borderTop: `1px solid rgba(240,235,227,0.08)`, padding: 'clamp(36px,5vw,52px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontFamily: T.fontD, fontSize: '1.1rem', color: T.darkText }}>AegisTrace</div>
          <div style={{ fontFamily: T.fontUI, fontSize: '0.84rem', color: T.darkMuted }}>© 2025 Prasanna Kumar · MIT License</div>
        </div>
      </footer>
    </div>
  );
}
