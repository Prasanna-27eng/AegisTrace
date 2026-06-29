import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion';
import CardNav from '../components/CardNav';
import {
  ArrowRight, Shield, Brain, Eye, Database, CheckCircle,
  Zap, Network, ShieldCheck, Fingerprint, FileText,
  Lock, Cpu, Users, Globe, Layers, Key, AlertTriangle,
} from '../components/icons';

const T = {
  bg:        '#F5F0E8',
  surface:   '#EDE7DC',
  card:      '#E8E0D4',
  cardHover: '#DDD4C4',
  accent:    '#CC785C',
  pubBg:     '#FAF7F2',
  pubAlt:    '#F2EDE5',
  pubText:   '#1A1612',
  pubMuted:  '#6B6258',
  darkText:  '#1A1612',
  darkMuted: '#6B6258',
  border:    'rgba(26,22,18,0.09)',
  borderMed: 'rgba(26,22,18,0.14)',
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

function FeatureCard({ icon: Icon, title, desc, delay = 0, dark = false }) {
  const [hov, setHov] = useState(false);
  const bg = dark ? (hov ? T.cardHover : T.card) : (hov ? T.pubAlt : '#fff');
  const titleColor = dark ? T.darkText : T.pubText;
  const descColor  = dark ? T.darkMuted : T.pubMuted;
  const border = dark
    ? (hov ? 'rgba(204,120,92,0.35)' : T.border)
    : (hov ? 'rgba(204,120,92,0.25)' : T.pubBorder);
  return (
    <Reveal delay={delay}>
      <motion.div
        onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}
        animate={{ y: hov ? -4 : 0 }}
        transition={{ duration: 0.22, ease: T.ease }}
        style={{
          background: bg, border: `1px solid ${border}`, borderRadius: 16,
          padding: '28px 28px 32px', cursor: 'default', height: '100%',
          boxShadow: hov ? (dark ? '0 8px 28px rgba(204,120,92,0.15)' : '0 8px 28px rgba(26,22,18,0.1)') : 'none',
          transition: 'background 0.22s, border-color 0.22s, box-shadow 0.22s',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <Icon size={22} color={T.accent} />
        </div>
        <div style={{ fontFamily: T.fontD, fontSize: '1.12rem', color: titleColor, marginBottom: 10, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontFamily: T.fontUI, fontSize: '0.875rem', color: descColor, lineHeight: 1.72 }}>{desc}</div>
      </motion.div>
    </Reveal>
  );
}

const FEATURES = [
  { icon: Shield,        title: 'ITDR Detection Engine',        desc: 'Behavioral baselines + ML anomaly detection across Okta, Entra ID, and 13 other IdPs. Sub-second alert generation with automatic severity scoring.' },
  { icon: FileText,      title: 'Case Management',              desc: 'Structured timelines, evidence packets, and collaborative notes. Every alert is a traceable, resolvable case with SLA tracking.' },
  { icon: Brain,         title: 'AI-Powered Triage',            desc: 'Multi-model AI that summarizes alerts, proposes containment, and writes executive summaries — reducing MTTR by up to 70%.' },
  { icon: Network,       title: 'Identity Graph',               desc: 'Live graph of your identity estate. See lateral movement, privilege escalation chains, and blast radius before an attacker does.' },
  { icon: CheckCircle,   title: 'Compliance Evidence',          desc: 'Auto-generated SOC2, ISO 27001, and NIST CSF evidence packages. Audit-ready at any time, without manual effort.' },
  { icon: Cpu,           title: 'Endpoint Telemetry',           desc: 'Lightweight macOS/Linux agent. Correlate file access, process trees, and network events with identity signals.' },
  { icon: AlertTriangle, title: 'Attack Path Mapping',          desc: 'Graph-based attack path analysis that shows exactly how an attacker would move from initial access to domain admin.' },
  { icon: Zap,           title: 'SOAR Playbooks',               desc: 'Automated response playbooks for common ITDR scenarios — session revocation, MFA reset, account lockdown, and more.' },
  { icon: Eye,           title: 'Threat Hunt Workbench',        desc: 'Interactive query interface for proactive threat hunting. Saved queries, hypothesis tracking, and detection exports.' },
  { icon: Key,           title: 'Privileged Access Monitoring', desc: 'Real-time monitoring of admin activity, just-in-time access events, and privilege escalation. Alert on every deviation.' },
  { icon: Fingerprint,   title: 'AI Agent Telemetry',           desc: 'First-class monitoring for autonomous AI agents — track permissions, API calls, and behavioral drift against baselines.' },
  { icon: Globe,         title: 'Connector Library',            desc: '15+ native connectors: Okta, Entra ID, CrowdStrike, SentinelOne, AWS IAM, GCP, and more. OpenAPI webhook for everything else.' },
];

const INTEGRATIONS = [
  'Okta', 'Microsoft Entra ID', 'CrowdStrike', 'SentinelOne',
  'AWS IAM', 'Google Cloud', 'Azure', 'Splunk',
  'PagerDuty', 'Slack', 'Jira', 'GitHub',
];

export default function Features() {
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

  return (
    <div style={{ fontFamily: T.fontUI, background: T.bg, overflowX: 'hidden' }}>
      <CardNav />

      {/* HERO (dark) */}
      <section ref={heroRef} onMouseMove={onMM} onMouseLeave={onML}
        style={{
          position: 'relative', background: T.bg, minHeight: '72vh', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(100px,14vw,160px) clamp(20px,5vw,80px) clamp(80px,10vw,120px)',
        }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.04, pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(204,120,92,0.1) 0%, transparent 65%)' }} />
        <motion.div style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(204,120,92,0.14) 1px, transparent 1px)',
          backgroundSize: '34px 34px', x: isTouch ? 0 : dX, y: isTouch ? 0 : dY,
        }} />

        <motion.div style={{
          position: 'relative', zIndex: 2, maxWidth: 760, width: '100%', textAlign: 'center',
          rotateX: isTouch ? 0 : rX, rotateY: isTouch ? 0 : rY, transformStyle: 'preserve-3d', perspective: 1200,
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: T.ease }} style={{ display: 'inline-flex', marginBottom: 32 }}>
            <span style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.accent, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.25)', borderRadius: 100, padding: '6px 16px' }}>Features</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.2, ease: T.ease }}
            style={{ fontFamily: T.fontD, fontStyle: 'normal', fontSize: 'clamp(2.2rem, 6vw, 4.6rem)', lineHeight: 1.12, color: T.darkText, margin: '0 0 28px', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Every feature built for<br />
            <em style={{ fontStyle: 'italic', color: T.accent }}>real SOC workflows</em>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.36, ease: T.ease }}
            style={{ fontFamily: T.fontUI, fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: T.darkMuted, lineHeight: 1.75, maxWidth: 560, margin: '0 auto' }}>
            Twelve integrated modules covering detection, investigation, response, and compliance.
            Built by a Blue Team analyst who used them first.
          </motion.p>
        </motion.div>
      </section>

      {/* FEATURE MODULES (light) */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Core Modules</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.pubText, fontWeight: 400, margin: '0 0 60px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>Twelve modules, one platform</h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} delay={i * 0.04} dark={false} />)}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS (dark) */}
      <section style={{ background: T.bg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.04, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Integrations</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.darkText, fontWeight: 400, margin: '0 0 16px', lineHeight: 1.2 }}>Connects to your existing stack</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1.05rem', color: T.darkMuted, lineHeight: 1.75, maxWidth: 500, margin: '0 auto 56px' }}>
              Native connectors for the tools your team already uses. OpenAPI webhook for everything else.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {INTEGRATIONS.map((name, i) => (
                <motion.span key={name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.4, ease: T.ease }}
                  style={{
                    fontFamily: T.fontUI, fontSize: '0.875rem', fontWeight: 500,
                    color: T.darkMuted, background: T.surface,
                    border: `1px solid rgba(240,235,227,0.08)`,
                    borderRadius: 100, padding: '9px 20px',
                  }}
                >{name}</motion.span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,100px) clamp(20px,5vw,80px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <Reveal>
            <h2 style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: T.pubText, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              Ready to explore the platform?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1rem', color: T.pubMuted, lineHeight: 1.75, margin: '0 0 36px' }}>
              All 12 modules available on day one. No credit card, no call required.
            </p>
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
