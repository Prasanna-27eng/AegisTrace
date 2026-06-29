import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion';
import CardNav from '../components/CardNav';
import {
  ArrowRight, Shield, Brain, Database, Network, Zap,
  Layers, CheckCircle, Key, Eye, Cpu, Globe, Lock,
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

function ArchLayer({ icon: Icon, label, items, color = T.accent, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div style={{
        background: T.pubBg, border: `1px solid ${T.pubBorder}`,
        borderRadius: 16, padding: '24px 28px',
        borderLeft: `3px solid ${color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Icon size={18} color={color} />
          <div style={{ fontFamily: T.fontD, fontSize: '1rem', color: T.pubText }}>{label}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map(item => (
            <span key={item} style={{
              fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 500,
              color: T.pubMuted, background: 'rgba(26,22,18,0.05)',
              border: `1px solid ${T.pubBorder}`, borderRadius: 6, padding: '4px 10px',
            }}>{item}</span>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function ModelCard({ name, provider, specialty, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay}>
      <motion.div
        onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}
        animate={{ y: hov ? -4 : 0 }}
        transition={{ duration: 0.22 }}
        style={{
          background: hov ? T.cardHover : T.card,
          border: `1px solid ${hov ? 'rgba(204,120,92,0.3)' : T.border}`,
          borderRadius: 14, padding: '24px',
          transition: 'background 0.22s, border-color 0.22s',
          boxShadow: hov ? '0 8px 28px rgba(204,120,92,0.14)' : 'none',
        }}
      >
        <div style={{ fontFamily: T.fontUI, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.accent, marginBottom: 8 }}>{provider}</div>
        <div style={{ fontFamily: T.fontD, fontSize: '1.05rem', color: T.darkText, marginBottom: 8 }}>{name}</div>
        <div style={{ fontFamily: T.fontUI, fontSize: '0.85rem', color: T.darkMuted, lineHeight: 1.65 }}>{specialty}</div>
      </motion.div>
    </Reveal>
  );
}

export default function Platform() {
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

  const ARCH_LAYERS = [
    { icon: Globe,    label: 'Ingestion Layer',    color: '#CC785C', items: ['Okta Events', 'Entra ID Audit', 'CrowdStrike FDR', 'SentinelOne', 'AWS CloudTrail', 'Custom Webhooks'] },
    { icon: Database, label: 'Normalization Layer', color: '#D98B6A', items: ['Event Schema v2', 'Identity Resolver', 'Entity Dedup', 'Timeline Builder', 'Enrichment Engine'] },
    { icon: Brain,    label: 'Detection Layer',     color: '#E8A080', items: ['Behavioral Baselines', 'ML Anomaly Models', 'Rule Engine', 'Correlation Engine', 'MITRE ATT&CK Map'] },
    { icon: Layers,   label: 'Response Layer',      color: '#CC785C', items: ['Case Manager', 'SOAR Playbooks', 'AI Triage', 'Evidence Packer', 'Notification Bus'] },
    { icon: Shield,   label: 'API + UI Layer',      color: '#D98B6A', items: ['REST API', 'GraphQL', 'React Dashboard', 'Mobile-Ready', 'Embeddable Widgets'] },
  ];

  const AI_MODELS = [
    { provider: 'Anthropic', name: 'Claude 3.5 Sonnet', specialty: 'Primary analyst model. Excels at incident summarization, containment reasoning, and compliance narrative generation.' },
    { provider: 'OpenAI',    name: 'GPT-4o',            specialty: 'Secondary analyst. Used for cross-validation of findings and executive report drafting.' },
    { provider: 'Local',     name: 'Llama 3.1 8B',      specialty: 'Air-gapped deployments. On-premise inference for environments that can\'t send data to external APIs.' },
    { provider: 'Custom',    name: 'Fine-tuned BERT',   specialty: 'Fast entity classification — identifies user, device, application, and service from raw log entries at scale.' },
  ];

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
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.04, pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(204,120,92,0.1) 0%, transparent 65%)' }} />
        <motion.div style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(204,120,92,0.14) 1px, transparent 1px)',
          backgroundSize: '34px 34px', x: isTouch ? 0 : dX, y: isTouch ? 0 : dY,
        }} />

        <motion.div style={{
          position: 'relative', zIndex: 2, maxWidth: 800, width: '100%', textAlign: 'center',
          rotateX: isTouch ? 0 : rX, rotateY: isTouch ? 0 : rY, transformStyle: 'preserve-3d', perspective: 1200,
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: T.ease }} style={{ display: 'inline-flex', marginBottom: 32 }}>
            <span style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.accent, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.25)', borderRadius: 100, padding: '6px 16px' }}>Platform Architecture</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.2, ease: T.ease }}
            style={{ fontFamily: T.fontD, fontStyle: 'normal', fontSize: 'clamp(2.2rem, 6vw, 4.6rem)', lineHeight: 1.12, color: T.darkText, margin: '0 0 28px', fontWeight: 400, letterSpacing: '-0.02em' }}>
            The trust control plane for<br />
            <em style={{ fontStyle: 'italic', color: T.accent }}>your entire identity estate</em>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.36, ease: T.ease }}
            style={{ fontFamily: T.fontUI, fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: T.darkMuted, lineHeight: 1.75, maxWidth: 580, margin: '0 auto' }}>
            A layered architecture that ingests any identity signal, normalizes it,
            detects threats, and coordinates response — all in one open platform.
          </motion.p>
        </motion.div>
      </section>

      {/* ARCHITECTURE (light) */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Architecture</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.pubText, fontWeight: 400, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>Five layers, one unified platform</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1.05rem', color: T.pubMuted, lineHeight: 1.75, maxWidth: 560, margin: '0 0 56px' }}>
              Each layer is independently scalable and replaceable. Connect your own data sources, swap detection models, or embed the API in your existing SIEM.
            </p>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ARCH_LAYERS.map((l, i) => <ArchLayer key={l.label} {...l} delay={i * 0.08} />)}
          </div>

          {/* ASCII art diagram */}
          <Reveal delay={0.4}>
            <div style={{
              marginTop: 48, background: T.bg, border: `1px solid rgba(240,235,227,0.1)`,
              borderRadius: 16, padding: '32px', overflow: 'auto',
            }}>
              <pre style={{
                fontFamily: T.fontMono, fontSize: '0.78rem', color: 'rgba(240,235,227,0.5)',
                lineHeight: 1.6, margin: 0, whiteSpace: 'pre',
              }}>{`  ┌─────────────────────────────────────────────────────┐
  │               IDENTITY SOURCES                      │
  │  Okta · Entra ID · CrowdStrike · AWS IAM · Custom  │
  └────────────────────┬────────────────────────────────┘
                       │ webhooks / polling / streaming
  ┌────────────────────▼────────────────────────────────┐
  │           NORMALIZATION + ENRICHMENT                 │
  │    Event schema · Entity resolver · Timeline         │
  └────────────────────┬────────────────────────────────┘
                       │ normalized events
  ┌────────────────────▼────────────────────────────────┐
  │          DETECTION ENGINE (open source)              │
  │    Behavioral baselines · ML models · Rules          │
  └──────────┬─────────────────────────┬────────────────┘
             │ alerts                  │ attack paths
  ┌──────────▼────────┐   ┌────────────▼───────────────┐
  │   CASE MANAGER    │   │     IDENTITY GRAPH          │
  │ Timelines · SLAs  │   │  Neo4j · Blast radius       │
  └──────────┬────────┘   └────────────────────────────┘
             │ cases
  ┌──────────▼────────────────────────────────────────┐
  │         AI TRIAGE + SOAR RESPONSE                  │
  │  Claude · GPT-4o · Llama · Playbooks · Evidence    │
  └────────────────────────────────────────────────────┘`}</pre>
            </div>
          </Reveal>
        </div>
      </section>

      {/* AI MODELS (dark) */}
      <section style={{ background: T.bg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.04, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>AI Models</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.darkText, fontWeight: 400, margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>Multi-model by design</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1.05rem', color: T.darkMuted, lineHeight: 1.75, maxWidth: 520, margin: '0 0 56px' }}>
              No vendor lock-in. AegisTrace routes analysis tasks to the best available model — or your own.
            </p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {AI_MODELS.map((m, i) => <ModelCard key={m.name} {...m} delay={i * 0.08} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,100px) clamp(20px,5vw,80px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Reveal>
            <h2 style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: T.pubText, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              See it running in your environment
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1rem', color: T.pubMuted, lineHeight: 1.75, margin: '0 0 36px' }}>
              Deploy in minutes with Docker. Connect your first identity source in under an hour.
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
