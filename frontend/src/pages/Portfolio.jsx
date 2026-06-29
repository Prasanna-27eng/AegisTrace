import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion';
import CardNav from '../components/CardNav';
import {
  ArrowRight, ArrowUpRight, Download, Mail, Github,
  Shield, Brain, CheckCircle, Database, Network, Globe,
  MapPin, Star, FileText, Zap, Lock, Eye,
} from '../components/icons';

const T = {
  bg:        '#141210',
  surface:   '#1C1916',
  card:      '#222018',
  cardHover: '#2A271F',
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

const SKILLS = {
  'Security': ['ITDR', 'Threat Intelligence', 'SIEM/SOAR', 'Incident Response', 'Penetration Testing', 'MITRE ATT&CK', 'Zero Trust', 'Identity Security'],
  'Cloud & Infrastructure': ['AWS', 'Azure', 'Google Cloud', 'Kubernetes', 'Docker', 'Terraform', 'CrowdStrike', 'Okta'],
  'Development': ['Python', 'FastAPI', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'REST APIs', 'GraphQL'],
  'Frameworks': ['SOC2', 'ISO 27001', 'NIST CSF', 'CIS Controls', 'GDPR', 'HIPAA'],
};

const EXPERIENCE = [
  {
    role: 'Security Engineer',
    company: 'Independent',
    period: '2023 – Present',
    desc: 'Building AegisTrace — an open-source ITDR platform used by security teams to detect identity threats, manage investigations, and generate compliance evidence.',
    tags: ['ITDR', 'Python', 'React', 'AI/ML'],
  },
  {
    role: 'Blue Team Analyst',
    company: 'Enterprise Security Operations',
    period: '2021 – 2023',
    desc: 'Tier-2 analyst in a 24/7 SOC. Investigated identity-based attacks, built detection rules in Splunk SIEM, and led the migration to Okta-native threat detection.',
    tags: ['SIEM', 'Okta', 'Splunk', 'Incident Response'],
  },
  {
    role: 'Cloud Security Analyst',
    company: 'Managed Security Services',
    period: '2019 – 2021',
    desc: 'Monitored multi-cloud environments (AWS, Azure, GCP) for misconfiguration, privilege escalation, and data exfiltration. Delivered monthly compliance reports.',
    tags: ['AWS', 'Azure', 'Cloud Security', 'Compliance'],
  },
];

const CASE_STUDIES = [
  {
    icon: Shield,
    title: 'Detecting a supply-chain identity pivot',
    desc: "A contractor's compromised credentials were used to access production AWS keys through a third-party IdP. AegisTrace detected the behavioral deviation in 4 minutes; containment was automated.",
    tags: ['ITDR', 'AWS', 'Okta'],
    outcome: '4 min detection',
  },
  {
    icon: Brain,
    title: 'AI agent privilege escalation attempt',
    desc: 'An autonomous coding agent, connected via OAuth, began requesting additional API scopes outside its defined permission boundary. ATSP protocol flagged the deviation before any data was accessed.',
    tags: ['ATSP', 'AI Security', 'OAuth'],
    outcome: 'Zero data exposure',
  },
  {
    icon: FileText,
    title: 'SOC2 Type II audit preparation',
    desc: 'Used AegisTrace\'s compliance module to auto-generate 6 months of access review evidence, anomaly detection logs, and incident response records — cutting audit prep time from 4 weeks to 3 days.',
    tags: ['SOC2', 'Compliance', 'Evidence'],
    outcome: '3 days vs 4 weeks',
  },
];

const CERTS = [
  { name: 'CISSP', full: 'Certified Information Systems Security Professional', issuer: 'ISC²' },
  { name: 'CCSP', full: 'Certified Cloud Security Professional', issuer: 'ISC²' },
  { name: 'CySA+', full: 'CompTIA Cybersecurity Analyst', issuer: 'CompTIA' },
  { name: 'AWS SAP', full: 'AWS Solutions Architect – Professional', issuer: 'Amazon Web Services' },
];

function CaseStudyCard({ cs, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay}>
      <motion.div
        onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}
        animate={{ y: hov ? -4 : 0 }} transition={{ duration: 0.22 }}
        style={{
          background: hov ? T.pubAlt : '#fff',
          border: `1px solid ${hov ? 'rgba(204,120,92,0.25)' : T.pubBorder}`,
          borderRadius: 16, padding: '28px 28px 32px',
          boxShadow: hov ? '0 8px 28px rgba(26,22,18,0.1)' : 'none',
          transition: 'background 0.22s, border-color 0.22s, box-shadow 0.22s',
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <cs.icon size={22} color={T.accent} />
        </div>
        <div style={{ display: 'inline-flex', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '3px 10px', marginBottom: 14 }}>
          <span style={{ fontFamily: T.fontUI, fontSize: '0.75rem', fontWeight: 600, color: '#10B981' }}>{cs.outcome}</span>
        </div>
        <div style={{ fontFamily: T.fontD, fontSize: '1.1rem', color: T.pubText, marginBottom: 12, lineHeight: 1.3 }}>{cs.title}</div>
        <p style={{ fontFamily: T.fontUI, fontSize: '0.875rem', color: T.pubMuted, lineHeight: 1.73, margin: '0 0 20px' }}>{cs.desc}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {cs.tags.map(tag => <span key={tag} style={{ fontFamily: T.fontUI, fontSize: '0.75rem', fontWeight: 500, color: T.pubMuted, background: 'rgba(26,22,18,0.05)', border: `1px solid ${T.pubBorder}`, borderRadius: 6, padding: '3px 9px' }}>{tag}</span>)}
        </div>
      </motion.div>
    </Reveal>
  );
}

export default function Portfolio() {
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
          position: 'relative', background: T.bg, minHeight: '88vh', overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          padding: 'clamp(100px,14vw,160px) clamp(20px,5vw,80px) clamp(80px,10vw,120px)',
        }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.025, pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 55% at 30% 50%, rgba(204,120,92,0.1) 0%, transparent 65%)' }} />
        <motion.div style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(204,120,92,0.13) 1px, transparent 1px)',
          backgroundSize: '34px 34px', x: isTouch ? 0 : dX, y: isTouch ? 0 : dY,
        }} />

        <motion.div style={{
          position: 'relative', zIndex: 2, maxWidth: 1100, width: '100%',
          rotateX: isTouch ? 0 : rX, rotateY: isTouch ? 0 : rY, transformStyle: 'preserve-3d', perspective: 1200,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 64, alignItems: 'center' }}>
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: T.ease }} style={{ display: 'inline-flex', marginBottom: 28 }}>
                <span style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.accent, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.25)', borderRadius: 100, padding: '6px 16px' }}>Portfolio</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.2, ease: T.ease }}
                style={{ fontFamily: T.fontD, fontStyle: 'normal', fontSize: 'clamp(2.4rem, 6vw, 5rem)', lineHeight: 1.08, color: T.darkText, margin: '0 0 8px', fontWeight: 400, letterSpacing: '-0.02em' }}>
                Prasanna Kumar
              </motion.h1>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.28, ease: T.ease }}
                style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.5vw, 1.6rem)', color: T.accent, marginBottom: 24 }}>
                Security Engineer · ITDR Specialist
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.34, ease: T.ease }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                <MapPin size={15} color={T.darkMuted} />
                <span style={{ fontFamily: T.fontUI, fontSize: '0.9rem', color: T.darkMuted }}>Dublin, Ireland</span>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4, ease: T.ease }}
                style={{ fontFamily: T.fontUI, fontSize: 'clamp(1rem, 2vw, 1.12rem)', color: T.darkMuted, lineHeight: 1.78, maxWidth: 560, marginBottom: 40 }}>
                Blue Team analyst and security engineer specializing in identity threat detection,
                cloud security, and AI security infrastructure. Creator of AegisTrace.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: T.ease }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="mailto:prasanna80564@gmail.com"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', fontFamily: T.fontUI, fontWeight: 600, fontSize: '0.95rem', padding: '13px 24px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(204,120,92,0.4)', transition: 'transform 0.22s, box-shadow 0.22s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(204,120,92,0.55)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,120,92,0.4)'; }}
                ><Mail size={16} /> Get in Touch</a>
                <a href="https://github.com/prasxdev" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: T.darkMuted, fontFamily: T.fontUI, fontWeight: 500, fontSize: '0.95rem', padding: '13px 22px', borderRadius: 12, border: `1px solid ${T.border}`, textDecoration: 'none', transition: 'color 0.22s, border-color 0.22s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = T.darkText; e.currentTarget.style.borderColor = T.borderMed; }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.darkMuted; e.currentTarget.style.borderColor = T.border; }}
                ><Github size={16} /> GitHub</a>
              </motion.div>
            </div>

            {/* Stats card */}
            {!isMobile && (
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.5, ease: T.ease }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {[
                    { label: 'Years in Security', value: '5+' },
                    { label: 'Incidents Investigated', value: '500+' },
                    { label: 'Open Source Stars', value: '1.2k' },
                    { label: 'Certifications', value: '4' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontFamily: T.fontUI, fontSize: '0.88rem', color: T.darkMuted }}>{label}</div>
                      <div style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: '1.6rem', color: T.accent }}>{value}</div>
                    </div>
                  )).map((el, i, arr) => i === arr.length - 1
                    ? React.cloneElement(el, { style: { ...el.props.style, borderBottom: 'none', paddingBottom: 0 } })
                    : el
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>

      {/* SKILLS (light) */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Skills</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.pubText, fontWeight: 400, margin: '0 0 56px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>Technical expertise</h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {Object.entries(SKILLS).map(([cat, items], i) => (
              <Reveal key={cat} delay={i * 0.08}>
                <div>
                  <div style={{ fontFamily: T.fontD, fontSize: '1.05rem', color: T.pubText, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${T.pubBorder}` }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {items.map(skill => (
                      <span key={skill} style={{ fontFamily: T.fontUI, fontSize: '0.82rem', fontWeight: 500, color: T.pubMuted, background: 'rgba(26,22,18,0.05)', border: `1px solid ${T.pubBorder}`, borderRadius: 8, padding: '5px 12px' }}>{skill}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIENCE (dark) */}
      <section style={{ background: T.bg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.025, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Experience</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.darkText, fontWeight: 400, margin: '0 0 56px', lineHeight: 1.2 }}>Where I've worked</h2>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {EXPERIENCE.map((exp, i) => (
              <Reveal key={exp.role + i} delay={i * 0.1}>
                <div style={{
                  padding: '36px 0',
                  borderBottom: i < EXPERIENCE.length - 1 ? `1px solid ${T.border}` : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: T.fontD, fontSize: '1.2rem', color: T.darkText, marginBottom: 4 }}>{exp.role}</div>
                      <div style={{ fontFamily: T.fontUI, fontSize: '0.9rem', color: T.accent }}>{exp.company}</div>
                    </div>
                    <div style={{ fontFamily: T.fontMono, fontSize: '0.8rem', color: T.darkMuted }}>{exp.period}</div>
                  </div>
                  <p style={{ fontFamily: T.fontUI, fontSize: '0.95rem', color: T.darkMuted, lineHeight: 1.75, margin: '0 0 16px' }}>{exp.desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {exp.tags.map(tag => (
                      <span key={tag} style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 500, color: T.darkMuted, background: 'rgba(240,235,227,0.06)', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CASE STUDIES (light) */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal><p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 16 }}>Case Studies</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.pubText, fontWeight: 400, margin: '0 0 56px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>Security problems I've solved</h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {CASE_STUDIES.map((cs, i) => (
              <CaseStudyCard key={cs.title} cs={cs} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* CERTIFICATIONS (dark) */}
      <section style={{ background: T.surface, borderTop: `1px solid ${T.border}`, padding: 'clamp(60px,8vw,80px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 40 }}>
              <div>
                <p style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.accent, marginBottom: 10 }}>Certifications</p>
                <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: T.darkText, fontWeight: 400, margin: 0, lineHeight: 1.2 }}>Professional credentials</h2>
              </div>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {CERTS.map((cert, i) => (
              <Reveal key={cert.name} delay={i * 0.08}>
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Star size={16} color={T.accent} />
                    <div style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: '1.2rem', color: T.accent }}>{cert.name}</div>
                  </div>
                  <div style={{ fontFamily: T.fontUI, fontSize: '0.85rem', color: T.darkText, marginBottom: 6, lineHeight: 1.4 }}>{cert.full}</div>
                  <div style={{ fontFamily: T.fontUI, fontSize: '0.78rem', color: T.darkMuted }}>{cert.issuer}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section style={{ background: T.bg, padding: 'clamp(80px,10vw,100px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.025, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 50% at 50% 60%, rgba(204,120,92,0.09) 0%, transparent 70%)' }} />
        <div style={{ maxWidth: 580, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: T.darkText, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              Let's build something secure together
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1rem', color: T.darkMuted, lineHeight: 1.75, margin: '0 0 36px' }}>
              Open to security engineering roles, consulting, and open-source collaboration.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="mailto:prasanna80564@gmail.com"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', fontFamily: T.fontUI, fontWeight: 600, fontSize: '0.98rem', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(204,120,92,0.4)', transition: 'transform 0.22s, box-shadow 0.22s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(204,120,92,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,120,92,0.4)'; }}
              ><Mail size={16} /> Say Hello</a>
              <a href="https://github.com/prasxdev" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: T.darkMuted, fontFamily: T.fontUI, fontWeight: 500, fontSize: '0.98rem', padding: '14px 24px', borderRadius: 12, border: `1px solid ${T.border}`, textDecoration: 'none', transition: 'color 0.22s, border-color 0.22s' }}
                onMouseEnter={e => { e.currentTarget.style.color = T.darkText; e.currentTarget.style.borderColor = T.borderMed; }}
                onMouseLeave={e => { e.currentTarget.style.color = T.darkMuted; e.currentTarget.style.borderColor = T.border; }}
              ><Github size={16} /> GitHub</a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer style={{ background: T.surface, borderTop: `1px solid rgba(240,235,227,0.08)`, padding: 'clamp(36px,5vw,52px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontFamily: T.fontD, fontSize: '1.1rem', color: T.darkText }}>Prasanna Kumar</div>
          <div style={{ fontFamily: T.fontUI, fontSize: '0.84rem', color: T.darkMuted }}>Dublin, Ireland · prasanna80564@gmail.com</div>
        </div>
      </footer>
    </div>
  );
}
