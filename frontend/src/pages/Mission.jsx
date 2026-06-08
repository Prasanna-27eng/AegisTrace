import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ArrowRight, Shield, Brain, Fingerprint, FolderSearch,
  Mail, Monitor, Activity, CheckCircle, Clock, ArrowUpRight,
  Zap, Eye, Lock, GitMerge, Layers, ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050405';

/* ─── Scroll reveal ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 28, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Roadmap item ──────────────────────────────────────────────────────── */
function RoadItem({ text, done = false, active = false, delay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  const color  = done ? GOLD : active ? '#FBBF24' : 'rgba(245,240,232,0.22)';
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: -10 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: E }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: '1px solid rgba(245,240,232,0.04)' }}
    >
      <div style={{ flexShrink: 0, marginTop: 4 }}>
        {done   ? <CheckCircle size={14} color={GOLD}/>
        : active ? <Clock size={14} color="#FBBF24"/>
        : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(245,240,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(245,240,232,0.2)' }}/></div>
        }
      </div>
      <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 14, color, lineHeight: 1.6 }}>
        {text}
      </span>
    </motion.div>
  );
}

/* ─── Principle card ────────────────────────────────────────────────────── */
function PrincipleCard({ icon: Icon, title, body, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? 'rgba(245,158,11,0.04)' : 'rgba(245,240,232,0.02)',
          border: `1px solid ${hov ? 'rgba(245,158,11,0.18)' : 'rgba(245,240,232,0.07)'}`,
          padding: '28px 24px',
          transition: 'background 220ms cubic-bezier(0.16,1,0.3,1), border-color 220ms',
        }}
      >
        <Icon size={20} color={GOLD} style={{ marginBottom: 18, opacity: hov ? 1 : 0.7, transition: 'opacity 220ms' }}/>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 16, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 13, color: 'rgba(245,240,232,0.46)', lineHeight: 1.68 }}>{body}</div>
      </div>
    </Reveal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MISSION
════════════════════════════════════════════════════════════════════════════ */
export default function Mission() {
  const heroRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY    = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const V1 = [
    'ITDR — Identity Threat Detection (4 detectors)',
    'Identity Risk Engine with pluggable detectors',
    'Case Management — 13-tab investigation lifecycle',
    'Identity Graph + Trust Timeline',
    'Explainable AI with full reasoning chain',
    '7-Source IOC Intelligence Engine',
    'Email Forensics Engine',
    'Endpoint Agent v5 (Windows / Linux / macOS)',
    'Threat Hunting + Campaign Detection',
    'DORA Article 19 Compliance Reports',
  ];
  const V2 = [
    { text: 'Shadow AI Detection — unregistered AI agents', active: true },
    { text: 'SOAR Playbook Engine', active: true },
    { text: 'Control Plane — real-time identity state changes' },
    { text: 'Non-human Identity (NHI) vault and lifecycle' },
    { text: 'Quantum-Resistant Key Monitoring' },
    { text: 'Agent Supervision Layer for AI workflows' },
  ];
  const V3 = [
    'Attacker Path Emulation (red-team simulation)',
    'Multi-tenant Architecture for enterprise deployments',
    'Federated Identity Graph across organisations',
    'Adversarial AI detection engine',
    'Regulatory Mapping: NIS2, GDPR, DORA v2',
  ];

  const PRINCIPLES = [
    { icon: Eye,        title: 'Full provenance',     body: 'Every alert, every verdict, every AI recommendation carries a full chain of custody — not a black-box score.' },
    { icon: Fingerprint,title: 'Identity-first',      body: 'In 80% of breaches, identity is the attack path. AegisTrace treats identity as the primary telemetry source, not an afterthought.' },
    { icon: Brain,      title: 'Explainable AI',      body: 'AI that can\'t show its reasoning can\'t be trusted in a legal context. Every inference is grounded in evidence the analyst can verify.' },
    { icon: Layers,     title: 'Unified timeline',    body: 'Identity events, endpoint telemetry, email forensics, and threat intelligence all share one timeline — no pivot tables.' },
    { icon: ShieldCheck,title: 'Built-in compliance', body: 'DORA Article 19 reports are generated automatically from investigation data — not filled in manually after the fact.' },
    { icon: Zap,        title: 'Speed of response',   body: 'Mean time to respond is the metric that matters. AegisTrace is designed to cut that number, not add to the analyst\'s queue.' },
  ];

  return (
    <div style={{ background: BG, color: '#F5F0E8', overflowX: 'hidden' }}>
      <style>{`
        .cd { font-family: 'Clash Display', sans-serif; }
        .cg { font-family: 'Cabinet Grotesk', sans-serif; }

        .gold-btn {
          display: inline-flex; align-items: center; gap: 9px;
          background: ${GOLD}; color: #000; font-weight: 700;
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px;
          padding: 13px 26px; border: none; cursor: pointer;
          text-decoration: none; letter-spacing: 0.03em;
          transition: background 140ms cubic-bezier(0.16,1,0.3,1), transform 90ms;
        }
        .gold-btn:hover  { background: #FBBF24; }
        .gold-btn:active { transform: scale(0.97); }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(245,240,232,0.75);
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          padding: 12px 24px; border: 1px solid rgba(245,240,232,0.18);
          cursor: pointer; text-decoration: none; letter-spacing: 0.03em;
          transition: border-color 140ms, color 140ms, transform 90ms;
        }
        .ghost-btn:hover  { border-color: rgba(245,240,232,0.42); color: #F5F0E8; }
        .ghost-btn:active { transform: scale(0.97); }

        .nav-link {
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(245,240,232,0.6); text-decoration: none;
          transition: color 140ms;
        }
        .nav-link:hover { color: #F5F0E8; }

        @keyframes kenburns-m { from { transform: scale(1.06); } to { transform: scale(1.0); } }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,48px)', height: 64,
        background: 'rgba(5,4,5,0.0)',
        backdropFilter: 'none', WebkitBackdropFilter: 'none',
      }}>
        <Link to="/" className="cd" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.1em' }}>
          AEGISTRACE
        </Link>
        <div style={{ display: 'flex', gap: 'clamp(20px,3vw,36px)', alignItems: 'center' }}>
          <Link to="/portfolio" className="nav-link">Portfolio</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>
            Platform <ArrowRight size={13}/>
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden' }}>
        {/* Parallax image */}
        <motion.div
          aria-hidden
          style={{
            position: 'absolute', inset: '-20%',
            backgroundImage: `url('/assets/pages/mission-bg.jpg')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            y: heroY,
            animation: 'kenburns-m 20s ease-out forwards',
          }}
        />
        {/* Overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,4,5,0.22) 0%, rgba(5,4,5,0.05) 35%, rgba(5,4,5,0.92) 100%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(5,4,5,0.7) 0%, rgba(5,4,5,0.25) 55%, transparent 100%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 8% 92%, rgba(245,158,11,0.12) 0%, transparent 65%)' }}/>

        {/* Hero content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          aria-hidden={false}
        >
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end', zIndex: 10,
            padding: '0 clamp(24px,5vw,72px) clamp(56px,8vh,96px)',
          }}>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: E }}
              className="cg"
              style={{ fontSize: 11, color: GOLD, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 22, fontWeight: 600 }}
            >
              Our Mission
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.95, delay: 0.38, ease: E }}
              className="cd"
              style={{ fontSize: 'clamp(44px,7vw,88px)', fontWeight: 700, lineHeight: 0.93, letterSpacing: '-0.03em', color: '#F5F0E8', margin: '0 0 28px', maxWidth: 760, textWrap: 'balance' }}
            >
              Attackers no longer<br/>
              break in —<br/>
              <span style={{ color: GOLD }}>they sign in.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.58, ease: E }}
              className="cg"
              style={{ fontSize: 'clamp(14px,1.6vw,17px)', color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, maxWidth: 480 }}
            >
              AegisTrace was built because the identity threat surface changed faster than the tools designed to monitor it.
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', background: '#060507' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 64 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 8 }}>The Problem</span>
              <div>
                <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 20px', letterSpacing: '-0.03em', lineHeight: 1.0, textWrap: 'balance' }}>
                  Modern attacks are an identity problem first.
                </h2>
                <p className="cg" style={{ fontSize: 'clamp(15px,1.6vw,18px)', color: 'rgba(245,240,232,0.58)', lineHeight: 1.72, margin: 0, maxWidth: 600 }}>
                  Perimeter security assumes attackers need to break through a wall. They don't. Compromised credentials, stolen tokens, and misconfigured service accounts hand them the keys. Most SIEM tools were not designed for this shift.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Problem points — no border-left, use full-border cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
              {[
                { n: '01', title: 'Credential theft is the leading initial access vector', body: 'Over 80% of breaches involve stolen or misused credentials. Traditional IDS tools are blind to normal-looking logins.' },
                { n: '02', title: 'Alert fatigue hides real threats in noise', body: 'SOC analysts spend more time dismissing false positives than investigating real incidents. Signal is buried in volume.' },
                { n: '03', title: 'AI agent sprawl creates invisible attack surfaces', body: 'Every unregistered AI agent is an identity without oversight. Shadow AI runs with service-account privileges nobody tracks.' },
                { n: '04', title: 'Compliance reporting is manual and incomplete', body: 'DORA, NIS2, and GDPR reporting is assembled manually from scattered logs. Deadlines are missed and coverage is partial.' },
              ].map(({ n, title, body }, i) => (
                <Reveal key={n} delay={i * 0.07}>
                  <div style={{ background: 'rgba(245,240,232,0.025)', border: '1px solid rgba(245,240,232,0.07)', padding: '28px 24px', height: '100%' }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: GOLD, letterSpacing: '0.12em', marginBottom: 16 }}>{n}</div>
                    <div className="cd" style={{ fontSize: 15, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{title}</div>
                    <div className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.44)', lineHeight: 1.68 }}>{body}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRINCIPLES ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>How we build</span>
              <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.03em', textWrap: 'balance' }}>
                Six principles behind every decision.
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
              {PRINCIPLES.map(({ icon, title, body }, i) => (
                <PrincipleCard key={title} icon={icon} title={title} body={body} delay={i * 0.06}/>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ──────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', background: '#060507', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Roadmap</span>
              <h2 className="cd" style={{ fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.03em' }}>
                Where we are.
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(40px,5vw,64px)' }}>
              {/* v1 */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
                  <div style={{ width: 28, height: 28, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: GOLD, fontWeight: 700 }}>v1</span>
                  </div>
                  <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: '#F5F0E8', letterSpacing: '-0.01em' }}>Foundation — Shipped</span>
                </div>
                {V1.map((t, i) => <RoadItem key={t} text={t} done delay={i * 0.04}/>)}
              </div>
              {/* v2 + v3 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
                    <div style={{ width: 28, height: 28, background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(245,240,232,0.5)', fontWeight: 700 }}>v2</span>
                    </div>
                    <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: '#F5F0E8', letterSpacing: '-0.01em' }}>Scale — In Progress</span>
                  </div>
                  {V2.map(({ text, active }, i) => <RoadItem key={text} text={text} active={active} delay={i * 0.04}/>)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(245,240,232,0.07)' }}>
                    <div style={{ width: 28, height: 28, background: 'rgba(245,240,232,0.02)', border: '1px solid rgba(245,240,232,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(245,240,232,0.28)', fontWeight: 700 }}>v3</span>
                    </div>
                    <span className="cd" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(245,240,232,0.4)', letterSpacing: '-0.01em' }}>Enterprise — Planned</span>
                  </div>
                  {V3.map((t, i) => <RoadItem key={t} text={t} delay={i * 0.04}/>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(96px,12vw,160px) clamp(24px,5vw,72px)' }}>
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <Reveal>
            <h2 className="cd" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.03em', lineHeight: 0.94, marginBottom: 22, textWrap: 'balance' }}>
              Built by a practitioner,<br/>for practitioners.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.46)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 44px' }}>
              AegisTrace is not a commercial product. It is a proof of concept and a statement about what security tooling should be. Access it directly or get in touch.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/app/login" className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>
                Access Platform <ArrowRight size={16}/>
              </Link>
              <Link to="/portfolio" className="ghost-btn" style={{ fontSize: 14, padding: '14px 26px' }}>
                About the Builder
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '32px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span className="cd" style={{ color: 'rgba(245,240,232,0.22)', fontSize: 13, letterSpacing: '0.08em' }}>AEGISTRACE</span>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <Link to="/"          className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Home</Link>
            <Link to="/portfolio" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Portfolio</Link>
            <Link to="/app/login" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Platform</Link>
          </div>
          <span className="cg" style={{ color: 'rgba(245,240,232,0.16)', fontSize: 11 }}>© 2026 Prasanna Kumar</span>
        </div>
      </footer>
    </div>
  );
}
