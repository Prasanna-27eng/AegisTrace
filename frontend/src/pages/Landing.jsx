import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ArrowRight, Shield, Brain, Fingerprint, FolderSearch,
  Mail, Monitor, Activity, ArrowUpRight, Zap, Eye, CheckCircle,
  ShieldCheck, GitMerge, Lock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';

/* ─── Design tokens ─────────────────────────────────────────────────────────
   Fonts:  Clash Display (headings) · Cabinet Grotesk (body) · JetBrains Mono (data)
   Colors: #F59E0B gold · #050405 near-black · #F5F0E8 warm white
   Motion: cubic-bezier(0.16,1,0.3,1) — Emil Kowalski expo ease-out
   ────────────────────────────────────────────────────────────────────────── */
const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050405';

/* ─── 3D perspective tilt card ─────────────────────────────────────────── */
function TiltCard({ children, style = {} }) {
  const ref  = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [live, setLive] = useState(false);

  const onMove = e => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top)  / r.height - 0.5) * -12;
    const ry = ((e.clientX - r.left) / r.width  - 0.5) *  12;
    setTilt({ rx, ry });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setLive(true)}
      onMouseLeave={() => { setTilt({ rx: 0, ry: 0 }); setLive(false); }}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)${live ? ' translateZ(6px)' : ''}`,
        transition: live ? 'transform 0.1s linear' : 'transform 0.65s cubic-bezier(0.16,1,0.3,1)',
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Scroll-triggered reveal ───────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 28, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.82, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Animated counter ─────────────────────────────────────────────────── */
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

/* ─── Module hover card ─────────────────────────────────────────────────── */
function ModuleCard({ icon: Icon, label, desc, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay}>
      <TiltCard style={{ height: '100%' }}>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            background: hov ? 'rgba(245,158,11,0.05)' : 'rgba(245,240,232,0.025)',
            border: `1px solid ${hov ? 'rgba(245,158,11,0.2)' : 'rgba(245,240,232,0.07)'}`,
            padding: '32px 28px',
            height: '100%',
            transition: 'background 220ms cubic-bezier(0.16,1,0.3,1), border-color 220ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: hov ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 22, transition: 'background 220ms cubic-bezier(0.16,1,0.3,1)',
          }}>
            <Icon size={18} color={GOLD}/>
          </div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 16, fontWeight: 600, color: '#F5F0E8', marginBottom: 10, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            {label}
          </div>
          <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 13, color: 'rgba(245,240,232,0.48)', lineHeight: 1.68 }}>
            {desc}
          </div>
        </div>
      </TiltCard>
    </Reveal>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LANDING
════════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const MODULES = [
    { icon: Fingerprint,  label: 'Identity Threat Detection',  desc: 'Real-time ITDR across every identity layer — human, machine, and AI agent — with 4 detection engines.' },
    { icon: FolderSearch, label: 'Case Management',            desc: '13-tab investigation workspace with evidence chain, AI co-analyst, and DORA Article 19 compliance reporting.' },
    { icon: Mail,         label: 'Email Forensics',            desc: 'RFC header parsing, DKIM/SPF/DMARC analysis, AI phishing verdict, and automatic MITRE ATT&CK mapping.' },
    { icon: Monitor,      label: 'Endpoint Detection',         desc: 'EDR telemetry, Sysmon integration, process tree analysis, and lateral movement detection in one view.' },
    { icon: Activity,     label: 'Threat Intelligence',        desc: '7-source IOC engine: VirusTotal, AbuseIPDB, OTX, Shodan, and more — one query, unified verdict.' },
    { icon: Brain,        label: 'AI Co-Analyst',              desc: 'Explainable AI with full reasoning chain — not just a risk score, but a complete investigation narrative.' },
  ];

  const STATS = [
    { end: 13,  suffix: '',   label: 'Investigation modules per case' },
    { end: 7,   suffix: '',   label: 'IOC intelligence sources' },
    { end: 847, suffix: '+',  label: 'Indicators processed' },
    { end: 100, suffix: '%',  label: 'DORA Article 19 coverage' },
  ];

  return (
    <div style={{ background: BG, color: '#F5F0E8', overflowX: 'hidden', minHeight: '100vh' }}>
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
          color: rgba(245,240,232,0.6); text-decoration: none; letter-spacing: 0.03em;
          transition: color 140ms;
        }
        .nav-link:hover { color: #F5F0E8; }

        @keyframes kenburns { from { transform: scale(1.06); } to { transform: scale(1.0); } }
        @keyframes scrollPulse { 0%,100%{opacity:.25} 50%{opacity:.9} }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: E }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(20px,4vw,48px)', height: 64,
          background: scrolled ? 'rgba(5,4,5,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(18px) saturate(150%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(150%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(245,240,232,0.06)' : 'none',
          transition: 'background 300ms, backdrop-filter 300ms, border-color 300ms',
        }}
      >
        <Link to="/" className="cd" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.1em' }}>
          AEGISTRACE
        </Link>
        <div style={{ display: 'flex', gap: 'clamp(20px,3vw,36px)', alignItems: 'center' }}>
          <Link to="/mission"   className="nav-link">Mission</Link>
          <Link to="/portfolio" className="nav-link">Portfolio</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>
            Sign In <ArrowRight size={13}/>
          </Link>
        </div>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 640, overflow: 'hidden' }}>
        {/* Background photo */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url('/assets/pages/mainwebpage.jpg')`,
          backgroundSize: 'cover', backgroundPosition: 'center 30%',
          animation: 'kenburns 18s ease-out forwards',
        }}/>
        {/* Layered dark overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,4,5,0.28) 0%, rgba(5,4,5,0.04) 35%, rgba(5,4,5,0.9) 100%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(5,4,5,0.78) 0%, rgba(5,4,5,0.32) 55%, transparent 100%)' }}/>
        {/* Amber light bloom bottom-left */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 2% 95%, rgba(245,158,11,0.14) 0%, transparent 65%)' }}/>

        {/* Hero content */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '0 clamp(24px,5vw,72px) clamp(56px,8vh,96px)',
          maxWidth: 920,
        }}>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: E }}
            className="cg"
            style={{ fontSize: 11, color: GOLD, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 22, fontWeight: 600 }}
          >
            AI-Powered Security Operations Platform
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.38, ease: E }}
            className="cd"
            style={{
              fontSize: 'clamp(48px,7.5vw,92px)',
              fontWeight: 700, lineHeight: 0.94,
              letterSpacing: '-0.03em', color: '#F5F0E8',
              margin: '0 0 28px', textWrap: 'balance',
            }}
          >
            Detect. Trace.<br/>
            <span style={{ color: GOLD }}>Neutralize.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.56, ease: E }}
            className="cg"
            style={{ fontSize: 'clamp(14px,1.5vw,16px)', color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}
          >
            AegisTrace gives security teams full-stack visibility over identity threats, endpoint activity, and AI-driven investigations — from first alert to resolved case.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.72, ease: E }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}
          >
            <Link to="/app/login" className="gold-btn">
              Access Platform <ArrowRight size={15}/>
            </Link>
            <Link to="/mission" className="ghost-btn">
              See the Mission
            </Link>
          </motion.div>
        </div>

        {/* Scroll pulse line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          aria-hidden
          style={{ position: 'absolute', bottom: 40, right: 'clamp(24px,5vw,72px)', zIndex: 10 }}
        >
          <div style={{ width: 1, height: 56, background: `linear-gradient(to bottom, transparent, ${GOLD})`, animation: 'scrollPulse 2.2s ease-in-out infinite' }}/>
        </motion.div>
      </section>

      {/* ── PLATFORM MODULES ─────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)', background: '#060507' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 64 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <h2 className="cd" style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.0, textWrap: 'balance' }}>
                  One platform.<br/>Every threat surface.
                </h2>
                <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.45)', margin: 0, maxWidth: 380, lineHeight: 1.6 }}>
                  Purpose-built modules that share a single investigation timeline — no pivot tables, no context switching.
                </p>
              </div>
              <Link to="/app/login" className="ghost-btn" style={{ flexShrink: 0 }}>
                Explore Platform <ArrowUpRight size={14}/>
              </Link>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {MODULES.map(({ icon, label, desc }, i) => (
              <ModuleCard key={label} icon={icon} label={label} desc={desc} delay={i * 0.065}/>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)',
        background: BG,
        borderTop: '1px solid rgba(245,240,232,0.05)',
        borderBottom: '1px solid rgba(245,240,232,0.05)',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'clamp(40px,6vw,72px)' }}>
          {STATS.map(({ end, suffix, label }, i) => (
            <Reveal key={label} delay={i * 0.07}>
              <div>
                <div className="cd" style={{ fontSize: 'clamp(44px,5.5vw,72px)', fontWeight: 700, color: GOLD, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 14 }}>
                  <Counter end={end} suffix={suffix}/>
                </div>
                <div className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', lineHeight: 1.55, maxWidth: 210 }}>
                  {label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(48px,7vw,80px) clamp(24px,5vw,72px)', background: '#060507' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(24px,4vw,56px)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { icon: ShieldCheck,  text: 'MITRE ATT&CK aligned' },
                { icon: CheckCircle,  text: 'DORA Article 19 ready' },
                { icon: Lock,         text: 'End-to-end encrypted' },
                { icon: Zap,          text: 'Sub-second alert triage' },
                { icon: Eye,          text: 'Full audit provenance' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <Icon size={14} color={GOLD}/>
                  <span className="cg" style={{ fontSize: 12, color: 'rgba(245,240,232,0.42)', letterSpacing: '0.04em' }}>{text}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(96px,12vw,160px) clamp(24px,5vw,72px)', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient gold glow */}
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 className="cd" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.03em', lineHeight: 0.95, marginBottom: 24, textWrap: 'balance' }}>
              Ready to see inside<br/>your threat landscape?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.48)', lineHeight: 1.7, marginBottom: 44, maxWidth: 440, margin: '0 auto 44px' }}>
              AegisTrace is built for analysts who need answers, not more dashboards.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/app/login" className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>
                Request Access <ArrowRight size={16}/>
              </Link>
              <Link to="/portfolio" className="ghost-btn" style={{ fontSize: 14, padding: '14px 28px' }}>
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
            {[{ l: 'Mission', to: '/mission' }, { l: 'Portfolio', to: '/portfolio' }, { l: 'Platform', to: '/app/login' }].map(({ l, to }) => (
              <Link key={l} to={to} className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none', transition: 'color 140ms' }}
                onMouseEnter={e => (e.target.style.color = 'rgba(245,240,232,0.6)')}
                onMouseLeave={e => (e.target.style.color = 'rgba(245,240,232,0.28)')}
              >{l}</Link>
            ))}
            <a href="mailto:prasanna80564@gmail.com" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Contact</a>
          </div>
          <span className="cg" style={{ color: 'rgba(245,240,232,0.16)', fontSize: 11 }}>© 2026 Prasanna Kumar</span>
        </div>
      </footer>
    </div>
  );
}
