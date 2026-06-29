import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion';
import CardNav from '../components/CardNav';
import { ArrowRight, Github, Copy, Check, Terminal, Shield, Brain, Network, Database, Fingerprint } from '../components/icons';

const T = {
  bg:        '#141210',
  surface:   '#1C1916',
  card:      '#222018',
  cardHover: '#2A271F',
  inset:     '#0E0C0A',
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
  fontMono:  "'IBM Plex Mono', monospace",
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

function CopyButton({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: copied ? '#10B981' : 'rgba(240,235,227,0.4)',
        padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center',
        transition: 'color 0.2s',
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function CodeBlock({ code }) {
  return (
    <div style={{
      background: T.inset, border: `1px solid rgba(240,235,227,0.08)`,
      borderRadius: 10, padding: '14px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginTop: 16,
    }}>
      <code style={{ fontFamily: T.fontMono, fontSize: '0.82rem', color: 'rgba(240,235,227,0.75)', flex: 1, overflowX: 'auto' }}>
        {code}
      </code>
      <CopyButton code={code} />
    </div>
  );
}

const TOOLS = [
  {
    icon: Shield,
    name: 'aegistrace-cli',
    pypi: 'aegistrace-cli',
    tagline: 'Command-line ITDR control plane',
    desc: 'Full-featured CLI for querying detections, managing cases, triggering playbooks, and generating compliance reports — all from your terminal.',
    install: 'pip install aegistrace-cli',
    commands: ['aegis detections list --severity high', 'aegis case create --alert <id>', 'aegis report generate --framework soc2'],
  },
  {
    icon: Brain,
    name: 'aegis-triage',
    pypi: 'aegis-triage',
    tagline: 'AI alert triage as a library',
    desc: 'Drop-in Python library for AI-powered alert summarization, severity scoring, and containment recommendations. Bring your own model.',
    install: 'pip install aegis-triage',
    commands: ['from aegis_triage import Analyst', 'analyst = Analyst(model="claude-3-5-sonnet")', 'result = analyst.triage(alert_dict)'],
  },
  {
    icon: Network,
    name: 'identity-graph',
    pypi: 'identity-graph',
    tagline: 'Build and query your identity graph',
    desc: 'Lightweight library for constructing, querying, and visualizing identity relationships, attack paths, and blast radius from any data source.',
    install: 'pip install identity-graph',
    commands: ['from identity_graph import IdentityGraph', 'g = IdentityGraph()', 'g.blast_radius(user="admin@corp.com")'],
  },
  {
    icon: Database,
    name: 'okta-detective',
    pypi: 'okta-detective',
    tagline: 'Advanced Okta log analysis',
    desc: 'Purpose-built Okta log parser and anomaly detector. Finds impossible travel, MFA bypass attempts, session fixation, and suspicious OAuth grants.',
    install: 'pip install okta-detective',
    commands: ['from okta_detective import LogAnalyzer', 'analyzer = LogAnalyzer(api_token="...")', 'alerts = analyzer.scan_last_24h()'],
  },
  {
    icon: Fingerprint,
    name: 'atsp-agent',
    pypi: 'atsp-agent',
    tagline: 'ATSP protocol agent for AI systems',
    desc: 'Reference implementation of the AegisTrace Security Protocol for AI agents. Enforces identity attestation, permission scoping, and activity logging.',
    install: 'pip install atsp-agent',
    commands: ['from atsp_agent import ATSPAgent', 'agent = ATSPAgent(identity="my-agent-v1")', 'agent.request_permission("read:emails")'],
  },
];

export default function Tools() {
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
          position: 'relative', background: T.bg, minHeight: '78vh', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(100px,14vw,160px) clamp(20px,5vw,80px) clamp(80px,10vw,120px)',
        }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.025, pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(204,120,92,0.1) 0%, transparent 65%)' }} />
        <motion.div style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(204,120,92,0.14) 1px, transparent 1px)',
          backgroundSize: '34px 34px', x: isTouch ? 0 : dX, y: isTouch ? 0 : dY,
        }} />

        <motion.div style={{
          position: 'relative', zIndex: 2, maxWidth: 780, width: '100%', textAlign: 'center',
          rotateX: isTouch ? 0 : rX, rotateY: isTouch ? 0 : rY, transformStyle: 'preserve-3d', perspective: 1200,
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: T.ease }} style={{ display: 'inline-flex', marginBottom: 32 }}>
            <span style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.accent, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.25)', borderRadius: 100, padding: '6px 16px' }}>Open Source Tools</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.2, ease: T.ease }}
            style={{ fontFamily: T.fontD, fontStyle: 'normal', fontSize: 'clamp(2.2rem, 6vw, 4.6rem)', lineHeight: 1.12, color: T.darkText, margin: '0 0 28px', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Five open-source tools to extend<br />
            <em style={{ fontStyle: 'italic', color: T.accent }}>your security stack</em>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.36, ease: T.ease }}
            style={{ fontFamily: T.fontUI, fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: T.darkMuted, lineHeight: 1.75, maxWidth: 540, margin: '0 auto 40px' }}>
            All available on PyPI. Use them standalone, or as building blocks
            in your own security automation stack.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.48, ease: T.ease }} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://pypi.org/user/aegistrace" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', fontFamily: T.fontUI, fontWeight: 600, fontSize: '0.95rem', padding: '13px 24px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(204,120,92,0.4)', transition: 'transform 0.22s, box-shadow 0.22s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(204,120,92,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,120,92,0.4)'; }}
            ><Terminal size={16} /> Browse PyPI</a>
            <a href="https://github.com/prasxdev/aegistrace" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: T.darkMuted, fontFamily: T.fontUI, fontWeight: 500, fontSize: '0.95rem', padding: '13px 22px', borderRadius: 12, border: `1px solid ${T.border}`, textDecoration: 'none', transition: 'color 0.22s, border-color 0.22s' }}
              onMouseEnter={e => { e.currentTarget.style.color = T.darkText; e.currentTarget.style.borderColor = T.borderMed; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.darkMuted; e.currentTarget.style.borderColor = T.border; }}
            ><Github size={16} /> GitHub</a>
          </motion.div>
        </motion.div>
      </section>

      {/* TOOL CARDS (alternating light/dark sections) */}
      {TOOLS.map((tool, i) => {
        const isDark = i % 2 === 0;
        const bg = isDark ? T.surface : T.pubBg;
        const titleColor = isDark ? T.darkText : T.pubText;
        const mutedColor = isDark ? T.darkMuted : T.pubMuted;
        const accentColor = T.accent;
        return (
          <section key={tool.name} style={{
            background: bg,
            padding: 'clamp(70px,9vw,100px) clamp(20px,5vw,80px)',
            position: 'relative', overflow: 'hidden',
            borderTop: `1px solid ${isDark ? T.border : T.pubBorder}`,
          }}>
            {isDark && <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.02, pointerEvents: 'none' }} />}
            <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr',
                gap: 64, alignItems: 'center',
                direction: (!isMobile && i % 2 !== 0) ? 'rtl' : 'ltr',
              }}>
                {/* Content */}
                <Reveal delay={0}>
                  <div style={{ direction: 'ltr' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <tool.icon size={24} color={accentColor} />
                      </div>
                      <div>
                        <div style={{ fontFamily: T.fontMono, fontSize: '0.78rem', color: accentColor, marginBottom: 2 }}>pip install {tool.pypi}</div>
                        <div style={{ fontFamily: T.fontD, fontSize: '1.4rem', color: titleColor }}>{tool.name}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: '1.1rem', color: isDark ? T.accentL || T.accent : T.accent, marginBottom: 14, lineHeight: 1.4 }}>{tool.tagline}</div>
                    <p style={{ fontFamily: T.fontUI, fontSize: '1rem', color: mutedColor, lineHeight: 1.78, margin: '0 0 24px' }}>{tool.desc}</p>
                  </div>
                </Reveal>

                {/* Code block */}
                <Reveal delay={0.12}>
                  <div style={{ direction: 'ltr' }}>
                    <div style={{
                      background: isDark ? T.inset : T.bg, border: `1px solid ${isDark ? T.border : T.border}`,
                      borderRadius: 16, padding: '28px', overflow: 'hidden',
                    }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                        {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <code style={{ fontFamily: T.fontMono, fontSize: '0.8rem', color: 'rgba(240,235,227,0.45)' }}>$ </code>
                        <CopyButton code={tool.install} />
                      </div>
                      <code style={{ fontFamily: T.fontMono, fontSize: '0.88rem', color: T.accent, display: 'block', marginBottom: 20 }}>{tool.install}</code>
                      <div style={{ borderTop: `1px solid rgba(240,235,227,0.07)`, paddingTop: 16 }}>
                        {tool.commands.map((cmd, ci) => (
                          <div key={ci} style={{ display: 'flex', gap: 8, marginBottom: ci < tool.commands.length - 1 ? 6 : 0 }}>
                            <span style={{ fontFamily: T.fontMono, fontSize: '0.78rem', color: 'rgba(240,235,227,0.3)' }}>{ci === 0 ? '>>>' : '...'}</span>
                            <code style={{ fontFamily: T.fontMono, fontSize: '0.78rem', color: 'rgba(240,235,227,0.65)' }}>{cmd}</code>
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
      })}

      {/* CTA */}
      <section style={{ background: T.bg, padding: 'clamp(80px,10vw,100px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.025, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 50% at 50% 60%, rgba(204,120,92,0.09) 0%, transparent 70%)' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: T.darkText, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              Start building your security stack
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1rem', color: T.darkMuted, lineHeight: 1.75, margin: '0 0 36px' }}>
              All five tools are MIT licensed. Use them, fork them, build on them.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="https://pypi.org/user/aegistrace" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', fontFamily: T.fontUI, fontWeight: 600, fontSize: '0.98rem', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(204,120,92,0.4)', transition: 'transform 0.22s, box-shadow 0.22s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(204,120,92,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,120,92,0.4)'; }}
              ><Terminal size={16} /> Browse PyPI <ArrowRight size={15} /></a>
              <a href="/app/login" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: T.darkMuted, fontFamily: T.fontUI, fontWeight: 500, fontSize: '0.98rem', padding: '14px 24px', borderRadius: 12, border: `1px solid ${T.border}`, textDecoration: 'none', transition: 'color 0.22s, border-color 0.22s' }}
                onMouseEnter={e => { e.currentTarget.style.color = T.darkText; e.currentTarget.style.borderColor = T.borderMed; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.darkMuted; e.currentTarget.style.borderColor = T.border; }}
              >Enter Platform</a>
            </div>
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
