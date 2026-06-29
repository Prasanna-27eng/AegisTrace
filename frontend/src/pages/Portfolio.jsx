import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion';
import CardNav from '../components/CardNav';
import {
  ArrowRight, ArrowUpRight, Github, Shield,
  Brain, CheckCircle, Database, Globe, MapPin, FileText,
  Lock, Eye, Download, Mail, Zap, Star, BookOpen,
} from '../components/icons';

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const T = {
  bg:        '#F5F0E8',
  surface:   '#EDE7DC',
  card:      '#E8E0D4',
  cardHover: '#DDD4C4',
  accent:    '#CC785C',
  text:      '#1A1612',
  muted:     '#6B6258',
  faint:     'rgba(26,22,18,0.35)',
  border:    'rgba(26,22,18,0.09)',
  borderMed: 'rgba(26,22,18,0.14)',
  fontD:     "'DM Serif Display', Georgia, serif",
  fontUI:    "'DM Sans', system-ui, sans-serif",
  fontMono:  "'IBM Plex Mono', monospace",
  ease:      [0.23, 1, 0.32, 1],
};

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const DOT_PATTERN = `radial-gradient(circle, rgba(26,22,18,0.07) 1px, transparent 1px)`;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
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
  const [t, setT] = useState(false);
  useEffect(() => { setT(window.matchMedia('(hover: none)').matches); }, []);
  return t;
}
function Reveal({ children, delay = 0, y = 28, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: T.ease }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Data — CORRECT information from profile ────────────────────────────── */
const SKILLS = {
  'Security': ['Microsoft Sentinel', 'KQL', 'SIEM / SOAR', 'Incident Response', 'MITRE ATT&CK', 'ITDR', 'Threat Intelligence', 'Email Forensics', 'Identity Security'],
  'Development': ['Python', 'FastAPI', 'React 18', 'PostgreSQL', 'Docker', 'REST APIs', 'Zustand', 'Framer Motion'],
  'Cloud & Platforms': ['AWS', 'Azure', 'Microsoft Defender', 'Okta', 'CrowdStrike', 'VirusTotal v3', 'Groq API', 'NVIDIA NIM'],
  'Frameworks': ['NIST CSF', 'ISO 27001', 'SOC2', 'CIS Controls', 'Zero Trust', 'GDPR'],
};

const CERTS = [
  { title: 'SC-200', sub: 'Microsoft Security Operations Analyst', issued: '2025', status: 'certified', color: '#0078D4' },
  { title: 'CompTIA Security+', sub: 'Security Analyst Certification', issued: '2024', status: 'certified', color: '#E1261C' },
  { title: 'TCM PEH', sub: 'Practical Ethical Hacking', issued: '2024', status: 'certified', color: '#CC785C' },
  { title: 'BTL1', sub: 'Blue Team Labs Level 1', issued: '2025', status: 'in-progress', color: '#10B981', progress: 55 },
];

const EDUCATION = [
  {
    degree: 'MSc Information Systems & Computing',
    school: 'Dublin Business School',
    location: 'Dublin, Ireland',
    period: 'Sep 2024 – Sep 2025 (Expected)',
    focus: 'Cybersecurity, Cloud Computing, Systems Architecture',
  },
  {
    degree: 'B.E. Electronics & Communication Engineering',
    school: 'PSG College of Technology',
    location: 'Coimbatore, India',
    period: '2019 – 2023',
    focus: 'Signal Processing, Embedded Systems, Networks',
  },
];

const PROJECT = {
  name: 'AegisTrace',
  version: 'v11.0',
  tagline: 'Accountability Infrastructure for the AI-Agent Era',
  desc: 'Open-source Identity Threat Detection & Response platform. Built from scratch — FastAPI backend, React 18 frontend, 15+ threat detectors, explainable AI via Groq and NVIDIA NIM, SOAR playbooks, hardware attack forensics, and a full audit trail for every AI decision.',
  stats: [
    { n: '15+', label: 'Threat Detectors' },
    { n: '100%', label: 'Open Source' },
    { n: '30+', label: 'App Pages' },
    { n: 'SOC2', label: 'Evidence' },
  ],
  features: [
    'ITDR — 6 identity threat detectors (credential stuffing, impossible travel, privilege escalation)',
    'Explainable AI — every verdict shows evidence chain, reasoning, confidence score',
    'Identity Graph — force-directed canvas, 7 node types, real-time risk scoring',
    'SOAR Playbooks — automated response with human approval gate',
    'Hardware Attack Forensics — 18 parsers: WiFi, USB/HID, RF, RFID',
    'AI Agent Security — action approval queue, provenance ledger, audit trail',
    'Endpoint Agent — Honey Token Trap, YARA-lite, DNS/DGA detection, auto-block',
    '7-source IOC Enrichment — VirusTotal, Shodan, GreyNoise, URLhaus, ThreatFox',
  ],
  url: 'https://aegistrace.uk',
  github: 'https://github.com/Prasanna-27eng/AegisTrace',
};

/* ─── Cert card ──────────────────────────────────────────────────────────── */
function CertCard({ cert, delay }) {
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
          border: `1px solid ${hovered ? T.borderMed : T.border}`,
          borderRadius: 14, padding: '22px 24px',
          cursor: 'default',
          transition: 'background 0.2s, border-color 0.2s',
          boxShadow: hovered ? '0 8px 28px rgba(26,22,18,0.1)' : '0 2px 8px rgba(26,22,18,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{
            fontFamily: T.fontMono, fontSize: 11, fontWeight: 600,
            color: cert.color, letterSpacing: '0.08em',
          }}>{cert.title}</div>
          <div style={{
            fontFamily: T.fontMono, fontSize: 9.5, letterSpacing: '0.12em',
            color: cert.status === 'certified' ? '#10B981' : T.accent,
            background: cert.status === 'certified' ? 'rgba(16,185,129,0.1)' : 'rgba(204,120,92,0.1)',
            border: `1px solid ${cert.status === 'certified' ? 'rgba(16,185,129,0.25)' : 'rgba(204,120,92,0.25)'}`,
            borderRadius: 50, padding: '3px 10px',
          }}>
            {cert.status === 'certified' ? '✓ CERTIFIED' : '◔ IN PROGRESS'}
          </div>
        </div>
        <div style={{ fontFamily: T.fontD, fontSize: '1.05rem', color: T.text, lineHeight: 1.4, marginBottom: 8 }}>
          {cert.sub}
        </div>
        {cert.status === 'in-progress' && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: T.fontMono, fontSize: 9, color: T.muted }}>PROGRESS</span>
              <span style={{ fontFamily: T.fontMono, fontSize: 9, color: T.accent }}>{cert.progress}%</span>
            </div>
            <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cert.progress}%` }}
                transition={{ duration: 1.2, delay: 0.4, ease: T.ease }}
                style={{ height: '100%', background: T.accent, borderRadius: 2 }}
              />
            </div>
          </div>
        )}
        <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.muted, marginTop: 8, letterSpacing: '0.1em' }}>
          {cert.issued}
        </div>
      </motion.div>
    </Reveal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PORTFOLIO PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function Portfolio() {
  const isMobile = useIsMobile();
  const isTouch  = useIsTouch();
  const heroRef  = useRef(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotX = useSpring(useTransform(rawY, [-1,1], [2,-2]), { stiffness: 100, damping: 25 });
  const rotY = useSpring(useTransform(rawX, [-1,1], [-2,2]), { stiffness: 100, damping: 25 });
  const bgX  = useSpring(useTransform(rawX, [-1,1], [-12,12]), { stiffness: 70, damping: 20 });
  const bgY  = useSpring(useTransform(rawY, [-1,1], [-8,8]),  { stiffness: 70, damping: 20 });

  const onMouseMove = useCallback((e) => {
    if (isTouch) return;
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set((e.clientX - r.left) / r.width * 2 - 1);
    rawY.set((e.clientY - r.top) / r.height * 2 - 1);
  }, [isTouch, rawX, rawY]);

  const copyEmail = () => {
    navigator.clipboard.writeText('prasanna80564@gmail.com').then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  };

  return (
    <div style={{ fontFamily: T.fontUI, background: T.bg, overflowX: 'hidden', minHeight: '100vh' }}>
      <CardNav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={onMouseMove}
        onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
        style={{
          position: 'relative', background: T.surface,
          minHeight: '100vh', overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          padding: 'clamp(100px,14vw,160px) clamp(20px,6vw,80px) clamp(60px,8vw,100px)',
        }}
      >
        {/* Grain */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: GRAIN, opacity: 0.04 }} />
        {/* Dot pattern */}
        <motion.div aria-hidden style={{
          position: 'absolute', inset: -40, pointerEvents: 'none',
          backgroundImage: DOT_PATTERN, backgroundSize: '28px 28px',
          opacity: 0.5, x: isTouch ? 0 : bgX, y: isTouch ? 0 : bgY,
        }} />
        {/* Coral glow */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 45% at 65% 45%, rgba(204,120,92,0.07) 0%, transparent 70%)',
        }} />

        <div style={{ maxWidth: 1180, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 'clamp(40px,5vw,80px)', alignItems: 'center' }}>
          <motion.div
            style={{ rotateX: isTouch ? 0 : rotX, rotateY: isTouch ? 0 : rotY, transformStyle: 'preserve-3d', perspective: 1000 }}
          >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: T.ease }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
                background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.2)',
                borderRadius: 50, padding: '6px 16px',
              }}>
                <MapPin size={12} color={T.accent} />
                <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: '0.14em' }}>DUBLIN, IRELAND</span>
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: T.ease }}
              style={{
                fontFamily: T.fontD, fontStyle: 'italic',
                fontSize: 'clamp(2.4rem,6vw,5rem)', fontWeight: 400,
                color: T.text, lineHeight: 1.12, margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              Prasanna Kumar
            </motion.h1>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: T.ease }}
              style={{
                fontFamily: T.fontD,
                fontSize: 'clamp(1.4rem,3vw,2.4rem)', fontWeight: 400,
                color: T.accent, lineHeight: 1.2, margin: '0 0 24px',
              }}
            >
              Surendran
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: T.ease }}
              style={{
                fontFamily: T.fontUI, fontSize: 'clamp(1rem,1.5vw,1.15rem)',
                color: T.muted, lineHeight: 1.75, maxWidth: '52ch', margin: '0 0 36px',
              }}
            >
              Cybersecurity engineer and MSc student at Dublin Business School. Building AegisTrace — open-source Identity Threat Detection & Response for the AI-agent era.
            </motion.p>

            {/* Contact row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: T.ease }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
            >
              <button
                onClick={copyEmail}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: T.text, color: T.bg, fontFamily: T.fontUI,
                  fontSize: 13.5, fontWeight: 600, padding: '10px 20px',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  transition: 'background 150ms, transform 120ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.text; e.currentTarget.style.transform = 'none'; }}
              >
                <Mail size={14} weight="regular" />
                {copiedEmail ? 'Copied!' : 'prasanna80564@gmail.com'}
              </button>
              <a
                href="https://github.com/Prasanna-27eng"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent', color: T.text,
                  fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 500,
                  padding: '10px 20px', borderRadius: 8,
                  border: `1px solid ${T.borderMed}`, textDecoration: 'none',
                  transition: 'border-color 150ms, background 150ms, transform 120ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = 'rgba(204,120,92,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderMed; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}
              >
                <Github size={14} weight="regular" /> GitHub
              </a>
              <a
                href="https://aegistrace.uk"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent', color: T.accent,
                  fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 500,
                  padding: '10px 20px', borderRadius: 8,
                  border: `1px solid rgba(204,120,92,0.3)`, textDecoration: 'none',
                  transition: 'border-color 150ms, background 150ms, transform 120ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(204,120,92,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}
              >
                <Globe size={14} weight="regular" /> aegistrace.uk <ArrowUpRight size={11} weight="regular" />
              </a>
            </motion.div>
          </motion.div>

          {/* Stats card */}
          {!isMobile && (
            <Reveal delay={0.25} style={{ flexShrink: 0 }}>
              <div style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 18, padding: '28px 32px', minWidth: 240,
                boxShadow: '0 4px 20px rgba(26,22,18,0.08)',
              }}>
                {[
                  { icon: Shield, label: 'SC-200', sub: 'Security Operations' },
                  { icon: CheckCircle, label: 'Security+', sub: 'CompTIA Certified' },
                  { icon: Brain, label: 'AegisTrace', sub: 'v11.0 — Live' },
                  { icon: BookOpen, label: 'MSc Computing', sub: 'Dublin Business School' },
                ].map(({ icon: Icon, label, sub }, i) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 0',
                    borderBottom: i < 3 ? `1px solid ${T.border}` : 'none',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={17} color={T.accent} />
                    </div>
                    <div>
                      <div style={{ fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, color: T.text }}>{label}</div>
                      <div style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.muted, letterSpacing: '0.08em', marginTop: 1 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── AEGISTRACE PROJECT ────────────────────────────────────────────── */}
      <section style={{
        background: T.bg, padding: 'clamp(64px,8vw,100px) clamp(20px,6vw,80px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 16, marginBottom: 48 }}>
              <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 400, color: T.text, margin: 0 }}>
                Featured Project
              </h2>
              <div style={{
                fontFamily: T.fontMono, fontSize: 10, color: T.accent, letterSpacing: '0.14em',
                background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.2)',
                borderRadius: 50, padding: '4px 12px',
              }}>OPEN SOURCE</div>
            </div>
          </Reveal>

          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(26,22,18,0.07)',
          }}>
            {/* Header bar */}
            <div style={{
              background: T.card, borderBottom: `1px solid ${T.border}`,
              padding: '20px 32px', display: 'flex',
              flexWrap: 'wrap', alignItems: 'center', gap: 16,
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: T.fontD, fontSize: '1.6rem', color: T.text }}>{PROJECT.name}</span>
                  <span style={{ fontFamily: T.fontMono, fontSize: 10, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 50, padding: '3px 10px' }}>
                    {PROJECT.version} · LIVE
                  </span>
                </div>
                <p style={{ fontFamily: T.fontUI, fontSize: 13, color: T.muted, margin: '4px 0 0', fontStyle: 'italic' }}>
                  {PROJECT.tagline}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href={PROJECT.github} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  border: `1px solid ${T.borderMed}`, background: 'transparent',
                  fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 500, color: T.text,
                  textDecoration: 'none', transition: 'background 150ms, transform 120ms',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.cardHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}
                >
                  <Github size={13} weight="regular" /> Code
                </a>
                <a href={PROJECT.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  background: T.accent, color: '#fff',
                  fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600,
                  textDecoration: 'none', transition: 'background 150ms, transform 120ms, box-shadow 150ms',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#B8644A'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(204,120,92,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <Globe size={13} weight="regular" /> Live Demo <ArrowUpRight size={11} weight="regular" />
                </a>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: 'clamp(24px,3vw,40px) clamp(20px,3vw,32px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'clamp(24px,3vw,48px)' }}>
                {/* Left */}
                <div>
                  <p style={{ fontFamily: T.fontUI, fontSize: 15, color: T.muted, lineHeight: 1.75, margin: '0 0 28px' }}>
                    {PROJECT.desc}
                  </p>
                  {/* Stat pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
                    {PROJECT.stats.map(({ n, label }) => (
                      <div key={label} style={{
                        background: T.card, border: `1px solid ${T.border}`,
                        borderRadius: 10, padding: '10px 16px', textAlign: 'center',
                      }}>
                        <div style={{ fontFamily: T.fontD, fontSize: '1.4rem', color: T.accent, fontWeight: 400 }}>{n}</div>
                        <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.muted, letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Stack */}
                  <div>
                    <div style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.muted, letterSpacing: '0.16em', marginBottom: 10 }}>TECH STACK</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {['React 18', 'FastAPI', 'Python', 'PostgreSQL', 'SQLite', 'Groq API', 'NVIDIA NIM', 'Docker', 'Framer Motion'].map(t => (
                        <span key={t} style={{
                          fontFamily: T.fontMono, fontSize: 10.5, color: T.text,
                          background: T.card, border: `1px solid ${T.border}`,
                          borderRadius: 6, padding: '4px 10px',
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right — features list */}
                <div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.muted, letterSpacing: '0.16em', marginBottom: 16 }}>KEY CAPABILITIES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {PROJECT.features.map((f, i) => (
                      <Reveal key={i} delay={i * 0.04}>
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '12px 14px',
                          background: T.card, border: `1px solid ${T.border}`,
                          borderRadius: 10,
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                            background: 'rgba(204,120,92,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
                          </div>
                          <span style={{ fontFamily: T.fontUI, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{f}</span>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EDUCATION ────────────────────────────────────────────────────── */}
      <section style={{
        background: T.surface, padding: 'clamp(64px,8vw,100px) clamp(20px,6vw,80px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: GRAIN, opacity: 0.035 }} />
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Reveal><h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, color: T.text, margin: '0 0 48px' }}>Education</h2></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
            {EDUCATION.map((ed, i) => (
              <Reveal key={ed.school} delay={i * 0.08}>
                <div style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 16, padding: '28px 28px',
                  boxShadow: '0 2px 10px rgba(26,22,18,0.05)',
                }}>
                  <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.accent, letterSpacing: '0.18em', marginBottom: 12 }}>
                    {ed.period}
                  </div>
                  <h3 style={{ fontFamily: T.fontD, fontSize: '1.25rem', color: T.text, fontWeight: 400, margin: '0 0 6px', lineHeight: 1.3 }}>
                    {ed.degree}
                  </h3>
                  <div style={{ fontFamily: T.fontUI, fontSize: 14, fontWeight: 600, color: T.accent, marginBottom: 4 }}>
                    {ed.school}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <MapPin size={11} color={T.muted} />
                    <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted }}>{ed.location}</span>
                  </div>
                  <p style={{ fontFamily: T.fontUI, fontSize: 13, color: T.muted, lineHeight: 1.6, margin: 0 }}>
                    Focus: {ed.focus}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CERTIFICATIONS ───────────────────────────────────────────────── */}
      <section style={{
        background: T.bg, padding: 'clamp(64px,8vw,100px) clamp(20px,6vw,80px)',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Reveal>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, color: T.text, margin: '0 0 12px' }}>
              Certifications
            </h2>
            <p style={{ fontFamily: T.fontUI, fontSize: 15, color: T.muted, margin: '0 0 44px', maxWidth: '50ch' }}>
              Industry credentials in Microsoft security operations, ethical hacking, and blue team analysis.
            </p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {CERTS.map((cert, i) => <CertCard key={cert.title} cert={cert} delay={i * 0.08} />)}
          </div>
        </div>
      </section>

      {/* ── SKILLS ───────────────────────────────────────────────────────── */}
      <section style={{
        background: T.surface, padding: 'clamp(64px,8vw,100px) clamp(20px,6vw,80px)',
        position: 'relative',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Reveal><h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, color: T.text, margin: '0 0 48px' }}>Skills</h2></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {Object.entries(SKILLS).map(([cat, items], ci) => (
              <Reveal key={cat} delay={ci * 0.07}>
                <div style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 14, padding: '24px 24px',
                  boxShadow: '0 2px 8px rgba(26,22,18,0.05)',
                }}>
                  <div style={{ fontFamily: T.fontMono, fontSize: 9.5, color: T.accent, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {items.map(skill => (
                      <span key={skill} style={{
                        fontFamily: T.fontUI, fontSize: 12, color: T.muted,
                        background: T.surface, border: `1px solid ${T.border}`,
                        borderRadius: 6, padding: '4px 10px',
                      }}>{skill}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{
        background: T.text, padding: 'clamp(64px,8vw,100px) clamp(20px,6vw,80px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 60% at 30% 50%, rgba(204,120,92,0.12), transparent)',
        }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: GRAIN, opacity: 0.03 }} />
        <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Reveal>
            <h2 style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 400, color: T.bg, margin: '0 0 20px' }}>
              Let's connect
            </h2>
            <p style={{ fontFamily: T.fontUI, fontSize: 16, color: 'rgba(245,240,232,0.6)', margin: '0 auto 36px', maxWidth: '40ch', lineHeight: 1.7 }}>
              Open to cybersecurity roles, collaborations, and conversations about identity security and AI-agent accountability.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <button onClick={copyEmail} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: T.accent, color: '#fff',
                fontFamily: T.fontUI, fontSize: 14, fontWeight: 600,
                padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                transition: 'background 150ms, transform 120ms, box-shadow 150ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#B8644A'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(204,120,92,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Mail size={15} weight="regular" />
                {copiedEmail ? 'Copied!' : 'Copy Email'}
              </button>
              <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(245,240,232,0.08)', color: T.bg,
                fontFamily: T.fontUI, fontSize: 14, fontWeight: 500,
                padding: '12px 24px', borderRadius: 8,
                border: '1px solid rgba(245,240,232,0.15)', textDecoration: 'none',
                transition: 'background 150ms, transform 120ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,240,232,0.14)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,240,232,0.08)'; e.currentTarget.style.transform = 'none'; }}
              >
                <Github size={15} weight="regular" /> GitHub
              </a>
              <a href="https://aegistrace.uk" target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: T.accent,
                fontFamily: T.fontUI, fontSize: 14, fontWeight: 500,
                padding: '12px 24px', borderRadius: 8,
                border: '1px solid rgba(204,120,92,0.4)', textDecoration: 'none',
                transition: 'background 150ms, transform 120ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(204,120,92,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}
              >
                <Globe size={15} weight="regular" /> AegisTrace <ArrowUpRight size={12} weight="regular" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
