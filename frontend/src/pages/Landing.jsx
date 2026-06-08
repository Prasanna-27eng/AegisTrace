import React, { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check, Shield, Cpu, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────────
   AEGISTRACE — Main Landing Page
   Design system: Cinematic dark + warm cream (Prisma visual language)
   Fonts: Almarai (global) + Instrument Serif (italic accents)
   Motion: framer-motion with Emil Kowalski intentional easing
   ───────────────────────────────────────────────────────────────────────────── */

const EASE_OUT  = [0.23, 1, 0.32, 1];
const EASE_CARD = [0.22, 1, 0.36, 1];

/* ── WordsPullUp ─────────────────────────────────────────────────────────── */
function WordsPullUp({ text, className = '', showAsterisk = false }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const words  = text.split(' ');
  return (
    <span ref={ref} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0 0.28em' }} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} style={{ overflow: 'hidden', display: 'inline-flex' }}>
          <motion.span
            className={`inline-block relative ${className}`}
            initial={{ y: '110%', opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: i * 0.08, ease: EASE_OUT }}
          >
            {word}
            {showAsterisk && i === words.length - 1 && (
              <sup style={{ position: 'absolute', top: '0.65em', right: '-0.3em', fontSize: '0.31em', fontWeight: 300 }}>*</sup>
            )}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ── WordsPullUpMultiStyle ───────────────────────────────────────────────── */
function WordsPullUpMultiStyle({ segments }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const allWords = segments.flatMap(({ text, style, className }) =>
    text.split(' ').filter(Boolean).map(word => ({ word, style, className }))
  );
  return (
    <span ref={ref} style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.28em' }}>
      {allWords.map(({ word, style, className }, i) => (
        <span key={i} style={{ overflow: 'hidden', display: 'inline-flex' }}>
          <motion.span
            className={className || ''}
            style={{ display: 'inline-block', ...style }}
            initial={{ y: '110%', opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: i * 0.07, ease: EASE_OUT }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ── ScrollRevealParagraph ───────────────────────────────────────────────── */
function AnimatedChar({ char, scrollYProgress, index, total }) {
  const p = index / total;
  const opacity = useTransform(scrollYProgress, [Math.max(0, p - 0.12), Math.min(1, p + 0.04)], [0.12, 1]);
  return <motion.span style={{ opacity, display: 'inline' }}>{char}</motion.span>;
}

function ScrollRevealParagraph({ text, sectionRef }) {
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 0.85', 'end 0.15'] });
  return (
    <p style={{ color: '#DEDBC8', lineHeight: 1.65, margin: 0 }}>
      {text.split('').map((char, i) => (
        <AnimatedChar key={i} char={char} scrollYProgress={scrollYProgress} index={i} total={text.length} />
      ))}
    </p>
  );
}

/* ── FeatureCard ─────────────────────────────────────────────────────────── */
function FeatureCard({ children, delay = 0, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.95, opacity: 0, y: 16 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: EASE_CARD }}
      style={{ borderRadius: 20, overflow: 'hidden', ...style }}
    >
      {children}
    </motion.div>
  );
}

/* ── AnimatedHeroBg — CSS-only cyberpunk grid background ─────────────────── */
function AnimatedHeroBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Deep black base */}
      <div style={{ position: 'absolute', inset: 0, background: '#000' }} />

      {/* Radial glow: red tinted centre */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 90% 70% at 50% 60%, rgba(192,57,43,0.18) 0%, rgba(100,20,10,0.08) 45%, transparent 70%)',
      }} />

      {/* Purple accent glow top-right */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 50% 40% at 80% 10%, rgba(100,60,180,0.12) 0%, transparent 60%)',
      }} />

      {/* Perspective grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(192,57,43,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(192,57,43,0.07) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.8) 60%, transparent 100%)',
      }} />

      {/* Horizontal scanline */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(192,57,43,0.6) 30%, rgba(225,224,204,0.8) 50%, rgba(192,57,43,0.6) 70%, transparent 100%)',
        animation: 'scanline 6s ease-in-out infinite',
        top: '30%',
      }} />

      {/* Floating data particles */}
      {[...Array(18)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? 2 : 1,
          height: i % 3 === 0 ? 2 : 1,
          borderRadius: '50%',
          background: i % 4 === 0 ? 'rgba(192,57,43,0.8)' : 'rgba(225,224,204,0.3)',
          left: `${(i * 37 + 5) % 95}%`,
          top: `${(i * 23 + 10) % 85}%`,
          animation: `float ${4 + (i % 4)}s ease-in-out ${i * 0.3}s infinite alternate`,
        }} />
      ))}

      <style>{`
        @keyframes scanline {
          0%   { top: 10%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        @keyframes float {
          from { transform: translateY(0px); opacity: 0.3; }
          to   { transform: translateY(-12px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

/* ── FeatureVideoCard — animated terminal visual ─────────────────────────── */
function FeatureVisualCard() {
  const lines = [
    { color: '#C0392B', text: '[SIGMA-7] Lateral movement detected · 192.168.4.12' },
    { color: '#DEDBC8', text: '[GHOST-3] Credential sweep — 847 nodes scanned' },
    { color: '#22C55E', text: '[VENOM-1] Exfil blocked · SHA256 matched TTP-0441' },
    { color: '#C0392B', text: '[SIGMA-7] Privilege escalation attempt · svchost.exe' },
    { color: '#DEDBC8', text: '[ORACLE-2] Behavioral baseline deviation detected' },
    { color: '#22C55E', text: '[GHOST-3] Containment deployed · endpoint isolated' },
    { color: '#777',    text: '─────────────────────────────────────────────────' },
    { color: '#C0392B', text: '[VENOM-1] New IOC cluster · APT-38 fingerprint match' },
    { color: '#DEDBC8', text: '[ORACLE-2] Timeline reconstructed · 14 events merged' },
    { color: '#22C55E', text: '[SIGMA-7] Case closed · MITRE T1078.003 confirmed' },
  ];
  return (
    <div style={{
      position: 'relative', height: '100%', minHeight: 480,
      background: 'linear-gradient(135deg, #0a0a0a 0%, #0d0408 100%)',
      overflow: 'hidden', padding: 24, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {/* Terminal header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C0392B' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#444' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#444' }} />
        <span style={{ marginLeft: 8, fontSize: 10, color: '#444', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
          aegistrace — live agent feed
        </span>
      </div>

      {/* Live feed lines */}
      <div style={{ flex: 1, overflow: 'hidden', fontFamily: 'JetBrains Mono, monospace' }}>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.25, ease: EASE_OUT }}
            style={{ fontSize: 10, color: line.color, lineHeight: 1.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {line.text}
          </motion.div>
        ))}
      </div>

      {/* Bottom label */}
      <div style={{ borderTop: '1px solid rgba(192,57,43,0.2)', paddingTop: 12, marginTop: 8 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: '#E1E0CC' }}>Your threat canvas.</p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>Real-time · 24/7 · Autonomous</p>
      </div>

      {/* Corner accent */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60,
        background: 'radial-gradient(ellipse at top right, rgba(192,57,43,0.15) 0%, transparent 70%)' }} />
    </div>
  );
}

/* ── Feature icon component ───────────────────────────────────────────────── */
function FeatureIcon({ icon: Icon, color = '#C0392B' }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
      background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
      border: `1px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={22} color={color} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const aboutRef = useRef(null);

  return (
    <div style={{ background: '#000', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Instrument+Serif:ital@1&display=swap');
        body,*{font-family:'Almarai',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
        .at-serif{font-family:'Instrument Serif',serif;font-style:italic;}
        .at-noise-hero{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-repeat:repeat;background-size:200px;}
        .at-noise-section{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-repeat:repeat;background-size:200px;}
        .at-btn{display:inline-flex;align-items:center;gap:8px;background:#DEDBC8;border-radius:9999px;padding:10px 14px 10px 22px;text-decoration:none;font-weight:700;font-size:14px;color:#000;border:none;cursor:pointer;transition:transform 160ms cubic-bezier(0.23,1,0.32,1),gap 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-btn:active{transform:scale(0.97);}
        .at-btn-ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;border-radius:9999px;padding:10px 22px;text-decoration:none;font-weight:400;font-size:13px;color:rgba(222,219,200,.6);border:1px solid rgba(255,255,255,0.1);cursor:pointer;transition:all 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-btn-ghost:active{transform:scale(0.97);}
        .at-circle{background:#000;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-nav{font-size:12px;color:rgba(225,224,204,0.6);text-decoration:none;white-space:nowrap;transition:color 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-nav-active{font-size:12px;color:rgba(225,224,204,0.9);text-decoration:none;white-space:nowrap;transition:color 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-chk{display:flex;align-items:flex-start;gap:8px;padding:5px 0;}
        .at-learn{display:flex;align-items:center;gap:6px;font-size:13px;color:#666;text-decoration:none;opacity:.7;transition:opacity 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-fcard{padding:24px;height:100%;min-height:480px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px;background:#161616;transition:background 200ms cubic-bezier(0.23,1,0.32,1);}
        @media(hover:hover)and(pointer:fine){
          .at-btn:hover{gap:14px;}
          .at-btn:hover .at-circle{transform:scale(1.1);}
          .at-btn-ghost:hover{color:rgba(222,219,200,0.9);border-color:rgba(255,255,255,0.25);}
          .at-nav:hover,.at-nav-active:hover{color:#E1E0CC!important;}
          .at-learn:hover{opacity:1!important;}
          .at-fcard:hover{background:#1c1c1c!important;}
        }
        @media(prefers-reduced-motion:reduce){
          .at-btn{transition:opacity 200ms;}
          .at-btn:active{transform:none;opacity:.8;}
        }
      `}</style>

      {/* ═══ HERO ═════════════════════════════════════════════════════════ */}
      <section style={{ height: '100vh', padding: 16, boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden' }}>

          {/* CSS animated background — no external deps */}
          <AnimatedHeroBg />

          <div className="at-noise-hero" style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.45, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(to bottom,rgba(0,0,0,.28) 0%,transparent 38%,rgba(0,0,0,.65) 100%)' }} />

          {/* Navbar */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
            <nav style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderRadius: '0 0 24px 24px', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 40 }}>
              <Link to="/mission"   className="at-nav">Mission</Link>
              <Link to="/portfolio" className="at-nav">Platform</Link>
              <a href="#about"      className="at-nav">About</a>
              <a href="#features"   className="at-nav">Features</a>
              <Link to="/app/login" className="at-nav-active" style={{ color: '#DEDBC8' }}>Login</Link>
            </nav>
          </div>

          {/* Bottom content */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '0 28px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24, alignItems: 'flex-end' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(80px, 14vw, 220px)', fontWeight: 500, lineHeight: 0.85, letterSpacing: '-0.07em', color: '#E1E0CC' }}>
                <WordsPullUp text="AegisTrace" showAsterisk />
              </h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 6 }}>
                <motion.p
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.55, ease: EASE_OUT }}
                  style={{ color: 'rgba(222,219,200,.72)', fontSize: 14, lineHeight: 1.3, margin: 0, fontWeight: 300 }}
                >
                  A worldwide network of security engineers, AI researchers and threat hunters — bound not by perimeter, but by the relentless pursuit to detect, trace and eliminate threats before they land.
                </motion.p>
                <motion.div
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.75, ease: EASE_OUT }}
                  style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
                >
                  <Link to="/app/login" className="at-btn">
                    Enter the platform
                    <span className="at-circle"><ArrowRight size={15} color="#DEDBC8" /></span>
                  </Link>
                  <Link to="/portfolio" className="at-btn-ghost">
                    See how it works
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ABOUT ════════════════════════════════════════════════════════ */}
      <section id="about" ref={aboutRef} style={{ background: '#000', padding: '120px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', background: '#101010', borderRadius: 28, padding: 'clamp(48px,8vw,96px)', textAlign: 'center' }}>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            style={{ fontSize: 11, color: '#DEDBC8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 28, fontWeight: 300 }}
          >
            Security Intelligence
          </motion.p>

          <h2 style={{ fontSize: 'clamp(28px,5.5vw,72px)', lineHeight: 0.95, fontWeight: 400, maxWidth: 820, margin: '0 auto 48px', letterSpacing: '-0.03em' }}>
            <WordsPullUpMultiStyle segments={[
              { text: 'We built AegisTrace', style: { color: '#E1E0CC', fontWeight: 400 } },
              { text: 'to make the invisible,', className: 'at-serif', style: { color: '#E1E0CC' } },
              { text: 'visible.', className: 'at-serif', style: { color: '#E1E0CC' } },
              { text: 'AI that detects threats before analysts can blink.', style: { color: '#E1E0CC', fontWeight: 300 } },
            ]} />
          </h2>

          <div style={{ maxWidth: 680, margin: '0 auto', fontSize: 'clamp(13px,1.5vw,16px)' }}>
            <ScrollRevealParagraph
              text="Over three years we have worked alongside the world's most demanding security teams — Fortune 100 enterprises, national CERTs, and elite red teams. Together we built something that stops what others miss: AegisTrace, the autonomous threat intelligence and response platform."
              sectionRef={aboutRef}
            />
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═════════════════════════════════════════════════════ */}
      <section id="features" style={{ background: '#000', padding: '80px 24px 120px', position: 'relative' }}>
        <div className="at-noise-section" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.12 }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(22px,3.5vw,44px)', fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            <WordsPullUpMultiStyle segments={[
              { text: 'Detection workflows for security teams that move fast.', style: { color: '#E1E0CC', display: 'block' } },
              { text: 'Autonomous by design. Precise by necessity.', style: { color: '#555', display: 'block', marginTop: '0.3em' } },
            ]} />
          </h2>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>

          {/* Animated terminal card */}
          <FeatureCard delay={0} style={{ minHeight: 480 }}>
            <FeatureVisualCard />
          </FeatureCard>

          {/* Card: Autonomous Detection */}
          <FeatureCard delay={0.12}>
            <div className="at-fcard">
              <FeatureIcon icon={Shield} color="#C0392B" />
              <div>
                <span style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em' }}>01</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#E1E0CC', margin: '6px 0 0' }}>Autonomous Detection.</h3>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Real-time signal correlation across 50+ data sources','AI agents that triage alerts without analyst intervention','Behavioral baselines updated every 15 minutes','Zero-day pattern recognition from provenance graphs'].map((item, i) => (
                  <div key={i} className="at-chk">
                    <Check size={14} color="#DEDBC8" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/portfolio" className="at-learn">Learn more <ArrowRight size={13} style={{ transform: 'rotate(-45deg)' }} /></Link>
            </div>
          </FeatureCard>

          {/* Card: AI Agent Mesh */}
          <FeatureCard delay={0.24}>
            <div className="at-fcard">
              <FeatureIcon icon={Cpu} color="#6B48C8" />
              <div>
                <span style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em' }}>02</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#E1E0CC', margin: '6px 0 0' }}>AI Agent Mesh.</h3>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Multi-agent investigation across identity, network, and endpoint','Natural-language threat summaries with chain of evidence','Integrates with CrowdStrike, SentinelOne, Splunk, and 40+ tools'].map((item, i) => (
                  <div key={i} className="at-chk">
                    <Check size={14} color="#DEDBC8" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/mission" className="at-learn">Learn more <ArrowRight size={13} style={{ transform: 'rotate(-45deg)' }} /></Link>
            </div>
          </FeatureCard>

          {/* Card: Immersive Response */}
          <FeatureCard delay={0.36}>
            <div className="at-fcard">
              <FeatureIcon icon={Bell} color="#22C55E" />
              <div>
                <span style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em' }}>03</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#E1E0CC', margin: '6px 0 0' }}>Immersive Response.</h3>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Silent non-critical alerts during active investigations','Ambient threat cues — auditory severity indicators','Auto-schedules analyst shifts around incident windows'].map((item, i) => (
                  <div key={i} className="at-chk">
                    <Check size={14} color="#DEDBC8" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/app/login" className="at-learn">Get started <ArrowRight size={13} style={{ transform: 'rotate(-45deg)' }} /></Link>
            </div>
          </FeatureCard>
        </div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════════════════ */}
      <footer style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,.06)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ color: '#333', fontSize: 12, margin: 0, letterSpacing: '0.08em' }}>
            © 2026 AegisTrace — All threats traced.
          </p>
          <div style={{ display: 'flex', gap: 32 }}>
            <Link to="/mission"   style={{ color: '#333', fontSize: 12, textDecoration: 'none' }}>Mission</Link>
            <Link to="/portfolio" style={{ color: '#333', fontSize: 12, textDecoration: 'none' }}>Platform</Link>
            <Link to="/app/login" style={{ color: '#333', fontSize: 12, textDecoration: 'none' }}>Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
