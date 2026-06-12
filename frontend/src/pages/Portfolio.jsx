import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSceneCamera, PinnedScene, ScrollProgressBar } from '../components/SceneController';

const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050405';
const INK  = '#F5F0E8';

/* ─── Scroll reveal ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 36, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-70px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.88, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Animated counter ──────────────────────────────────────────────────── */
function Counter({ end, suffix = '' }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    const dur   = 2000;
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

/* ─── Ambient ember field ───────────────────────────────────────────────── */
function AmbientEmbers() {
  const canvasRef = useRef(null);
  const reduced   = useReducedMotion();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 1, raf = 0, t = 0;
    const embers = Array.from({ length: 44 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random() * 1.7,
      v: 0.08 + Math.random() * 0.22,
      ph: Math.random() * 6.28,
      gold: Math.random() < 0.4,
    }));
    const size = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (still) => {
      ctx.clearRect(0, 0, w, h);
      embers.forEach(e => {
        if (!still) {
          e.y -= e.v / h;
          if (e.y < -0.01) { e.y = 1.01; e.x = Math.random(); }
        }
        const x = e.x * w + Math.sin(t * 0.5 + e.ph) * 14;
        const a = still ? 0.22 : 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.2 + e.ph));
        ctx.fillStyle = e.gold ? 'rgba(245,158,11,' + (a * 1.25) + ')' : 'rgba(245,240,232,' + a + ')';
        ctx.beginPath();
        ctx.arc(x, e.y * h, e.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    size();
    window.addEventListener('resize', size);
    if (reduced) {
      draw(true);
    } else {
      const loop = () => { t += 0.016; draw(false); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, [reduced]);
  return (
    <canvas ref={canvasRef} aria-hidden style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      zIndex: -1, pointerEvents: 'none',
    }}/>
  );
}

/* ─── Mobile breakpoint ─────────────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

/* ════════════════════════════════════════════════════════════════════════
   HERO — pinned dolly through the monoliths
╦ ════════════════════════════════════════════════════════════════════════ */
function HeroScene({ sceneIndex = 0 }) {
  const ref = useRef(null);
  const p = useSceneCamera(ref);

  const bgScale = useTransform(p, [0, 1], [1.12, 1.0]);
  const bgY     = useTransform(p, v => v * 60);

  const line1Opacity = useTransform(p, [0.25, 0.45], [1, 0], { clamp: true });
  const line1Scale   = useTransform(p, [0, 1], [1, 2.4]);
  const line1BlurPx  = useTransform(p, [0.22, 0.45], [0, 10], { clamp: true });
  const line1Filter  = useTransform(line1BlurPx, v => 'blur(' + v + 'px)');

  const line2Opacity = useTransform(p, [0.42, 0.6], [0, 1], { clamp: true });
  const line2Scale   = useTransform(p, [0.4, 0.68, 1], [0.55, 1, 1.05], { clamp: true });
  const line2BlurPx  = useTransform(p, [0.46, 0.64], [8, 0], { clamp: true });
  const line2Filter  = useTransform(line2BlurPx, v => 'blur(' + v + 'px)');

  const kickerOpacity = useTransform(p, [0.66, 0.8], [0, 1], { clamp: true });
  const kickerY       = useTransform(kickerOpacity, o => (1 - o) * 20);

  return (
    <PinnedScene vh="300vh" sceneRef={ref}>
      <motion.div aria-hidden style={{
        position: 'absolute', inset: '-8%',
        backgroundImage: "url('/assets/pages/login-bg.jpg')",
        backgroundSize: 'cover', backgroundPosition: 'center 25%',
        scale: bgScale, y: bgY, willChange: 'transform',
      }}/>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(5,4,5,0.75) 0%, rgba(5,4,5,0.35) 40%, rgba(5,4,5,0.95) 100%)',
      }}/>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 110%, rgba(245,158,11,0.12) 0%, transparent 55%)',
      }}/>
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 clamp(20px,5vw,60px)' }}>
        <motion.div className="mono" style={{
          fontSize: 12, letterSpacing: '0.26em', color: GOLD, marginBottom: 26,
          opacity: line1Opacity,
        }}>
          BLUE TEAM · DUBLIN, IRELAND
        </motion.div>
        <motion.h1 className="cd" style={{
          fontSize: 'clamp(44px,7.5vw,116px)', fontWeight: 600, lineHeight: 1,
          letterSpacing: '-0.02em', color: INK, margin: 0,
          opacity: line1Opacity, scale: line1Scale, filter: line1Filter,
          willChange: 'transform, opacity, filter',
        }}>
          Prasanna Kumar<br/>Surendran
        </motion.h1>
        <motion.h1 className="cd" style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(44px,7.5vw,116px)', fontWeight: 600, lineHeight: 1,
          letterSpacing: '-0.02em', color: INK, margin: 0,
          opacity: line2Opacity, scale: line2Scale, filter: line2Filter,
          willChange: 'transform, opacity, filter',
        }}>
          <span>One analyst.<br/><span style={{ color: GOLD }}>An entire SOC.</span></span>
        </motion.h1>
        <motion.div style={{
          position: 'absolute', left: 0, right: 0, bottom: '-22vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          opacity: kickerOpacity, y: kickerY,
        }}>
          <p className="cg" style={{ fontSize: 17, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 480, textAlign: 'center', margin: 0 }}>
            SOC analyst who builds the tools he wishes existed — a Trust Operating System and four published security tools, solo.
          </p>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(245,240,232,0.35)' }}>SCROLL</span>
        </motion.div>
      </div>
    </PinnedScene>
  );
}

function MobileHero() {
  return (
    <section style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: '-6%',
        backgroundImage: "url('/assets/pages/login-bg.jpg')",
        backgroundSize: 'cover', backgroundPosition: 'center 25%', opacity: 0.5,
      }}/>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(5,4,5,0.7) 0%, rgba(5,4,5,0.35) 40%, rgba(5,4,5,0.96) 100%)',
      }}/>
      <Reveal style={{ position: 'relative', zIndex: 2, padding: '0 24px 64px' }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.26em', color: GOLD, marginBottom: 18 }}>BLUE TEAM · DUBLIN, IRELAND</div>
        <h1 className="cd" style={{ fontSize: 'clamp(38px,11vw,60px)', fontWeight: 600, lineHeight: 1.02, letterSpacing: '-0.02em', color: INK, margin: '0 0 16px' }}>
          Prasanna Kumar Surendran
        </h1>
        <p className="cg" style={{ fontSize: 16, fontWeight: 500, color: 'rgba(245,240,232,0.6)', maxWidth: 420, margin: 0 }}>
          One analyst. An entire SOC — a Trust Operating System and four published security tools, built solo.
        </p>
      </Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CONTENT DATA
════════════════════════════════════════════════════════════════════════ */
const STATS = [
  { end: 1,  suffix: '',  label: 'full security platform, solo-built' },
  { end: 30, suffix: '+', label: 'console pages shipped' },
  { end: 35, suffix: '',  label: 'backend API routers' },
  { end: 4,  suffix: '',  label: 'security tools on PyPI' },
  { end: 18, suffix: '',  label: 'hardware attack parsers' },
];

const TOOLS = [
  { layer: 'ATTACKS THE TOOLS', name: 'mcp-sploit', desc: 'Metasploit-style exploitation framework for MCP servers — enum, exfil, RCE, prompt-injection and policy-probe modules.', cmd: 'pip install mcp-sploit', href: 'https://pypi.org/project/mcp-sploit/' },
  { layer: 'ATTACKS THE BRAIN', name: 'prompt-fuzz', desc: 'Async fuzzer with 51 curated jailbreak payloads across 10 categories — reports exactly which ones bypass your guardrails.', cmd: 'pip install prompt-fuzz-cli', href: 'https://pypi.org/project/prompt-fuzz-cli/' },
  { layer: 'ATTACKS THE IDENTITY LAYER', name: 'nhi-hunter', desc: 'AWS IAM privilege-escalation pathfinder — builds the graph, finds the role chains that end at Admin.', cmd: 'pip install nhi-hunter', href: 'https://pypi.org/project/nhi-hunter/' },
  { layer: 'WATCHES THE DATA', name: 'shadow-sniffer', desc: 'Offline shadow-AI detector — scans connection logs against a 39-domain AI service catalog and your allowlist.', cmd: 'pip install shadow-sniffer', href: 'https://pypi.org/project/shadow-sniffer/' },
];

const CERTS_EARNED  = ['SC-200', 'Security+', 'TCM PEH'];
const CERTS_PENDING = ['BTL1 — in progress', 'eJPT — in progress', 'SC-300 — in progress'];

const FLAGSHIP_POINTS = [
  'Identity-first detection — 6 real-time ITDR detectors',
  'Explainable AI triage on Groq + NVIDIA NIM',
  'Attack-graph kill-chain reconstruction (Temporal Linker)',
  'SOAR playbooks gated by human approval',
  'Production-grade endpoint agent — honey tokens to auto-block',
  'Deep multi-tenancy security audit shipped in v10.1',
];

/* ─── Editorial row ─────────────────────────────────────────────────────── */
function EditorialRow({ label, children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(160px,240px) 1fr', gap: 'clamp(24px,4vw,44px)',
      borderTop: '1px solid rgba(245,240,232,0.1)', padding: 'clamp(32px,5vw,48px) 0',
    }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: 'rgba(245,240,232,0.4)' }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PORTFOLIO / BUILDER PAGE
════════════════════════════════════════════════════════════════════════ */
export default function Portfolio() {
  const isMobile = useIsMobile();
  const reduced  = useReducedMotion();
  const useFallback = isMobile || reduced;

  return (
    <div style={{ background: BG, color: INK, overflowX: 'clip', minHeight: '100vh', position: 'relative', isolation: 'isolate' }}>
      <AmbientEmbers/>
      <ScrollProgressBar/>
      <style>{`
        .cd { font-family: 'Clash Display', sans-serif; }
        .cg { font-family: 'Cabinet Grotesk', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .gold-btn {
          display: inline-flex; align-items: center; gap: 9px;
          background: ${GOLD}; color: #000; font-weight: 700;
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px;
          padding: 13px 26px; border: none; cursor: pointer;
          text-decoration: none; letter-spacing: 0.03em;
          transition: background 140ms cubic-bezier(0.16,1,0.3,1), transform 90ms, box-shadow 140ms;
        }
        .gold-btn:hover  { background: #FBBF24; box-shadow: 0 0 24px rgba(245,158,11,0.35); }
        .gold-btn:active { transform: scale(0.97); }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(245,240,232,0.75);
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          padding: 12px 24px; border: 1px solid rgba(245,240,232,0.2);
          cursor: pointer; text-decoration: none; letter-spacing: 0.03em;
          transition: border-color 140ms, color 140ms, transform 90ms;
        }
        .ghost-btn:hover  { border-color: rgba(245,240,232,0.44); color: #F5F0E8; }
        .ghost-btn:active { transform: scale(0.97); }

        .nav-link {
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(245,240,232,0.6); text-decoration: none; letter-spacing: 0.03em;
          transition: color 140ms;
        }
        .nav-link:hover { color: #F5F0E8; }

        ::selection { background: rgba(245,158,11,0.35); color: #F5F0E8; }

        .nav-link { position: relative; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -4px;
          height: 1px; background: #F59E0B;
          transition: right 260ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover::after { right: 0; }

        .gold-btn:hover  { transform: translateY(-2px); }
        .ghost-btn:hover { transform: translateY(-2px); }
        .gold-btn:active, .ghost-btn:active { transform: translateY(0) scale(0.97); }

        .tool-cell { background: #050405; transition: background 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1); }
        .tool-cell:hover { background: #0A0908; transform: translateY(-2px); }

        .u-link {
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 15.5px; font-weight: 700;
          color: #F5F0E8; text-decoration: none;
          border-bottom: 1px solid rgba(245,158,11,0.5); padding-bottom: 4px;
          transition: color 140ms, border-color 140ms;
        }
        .u-link:hover { color: ${GOLD}; border-color: ${GOLD}; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,56px)', height: 64,
        background: 'linear-gradient(180deg, rgba(5,4,5,0.85), rgba(5,4,5,0))',
      }}>
        <Link to="/" className="cd" style={{ color: INK, textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.1em' }}>
          AEGISTRACE
        </Link>
        <div style={{ display: 'flex', gap: 'clamp(16px,3vw,36px)', alignItems: 'center' }}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/mission" className="nav-link">Mission</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>
            Platform <ArrowRight size={13}/>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      {useFallback ? <MobileHero/> : <HeroScene sceneIndex={0}/>}

      {/* ── STATS STRIP ── */}
      <section style={{ padding: '0 clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))',
              borderTop: '1px solid rgba(245,240,232,0.1)', borderBottom: '1px solid rgba(245,240,232,0.1)',
            }}>
              {STATS.map(s => (
                <div key={s.label} style={{ padding: '36px 24px 36px 0' }}>
                  <div className="mono" style={{ fontSize: 40, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
                    <Counter end={s.end} suffix={s.suffix}/>
                  </div>
                  <div className="cg" style={{ fontSize: 13.5, color: 'rgba(245,240,232,0.5)', marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FLAGSHIP ── */}
      <section style={{ padding: 'clamp(72px,10vw,110px) clamp(24px,5vw,72px) 0' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 56, alignItems: 'center' }}>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.24em', color: GOLD, marginBottom: 16 }}>FLAGSHIP — v10.1</div>
                <h2 className="cd" style={{ fontSize: 'clamp(34px,4vw,56px)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 16px' }}>AegisTrace</h2>
                <p className="cg" style={{ fontSize: 16.5, lineHeight: 1.65, color: 'rgba(245,240,232,0.6)', maxWidth: 480, margin: '0 0 18px' }}>
                  A free, open Trust Operating System: identity-first detection, explainable AI triage, kill-chain reconstruction, SOAR playbooks with human approval gates, and a production-grade endpoint agent — running entirely on free-tier infrastructure.
                </p>
                <p className="cg" style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(245,240,232,0.45)', maxWidth: 480, margin: '0 0 26px' }}>
                  React 18 · FastAPI · SQLite · Groq · NVIDIA NIM · Docker · Render
                </p>
                <div style={{ display: 'flex', gap: 24 }}>
                  <a className="u-link" href="https://aegistrace-7qvn.onrender.com" target="_blank" rel="noopener noreferrer">Live <ArrowUpRight size={13} style={{ verticalAlign: -1 }}/></a>
                  <a className="u-link" href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noopener noreferrer">Source <ArrowUpRight size={13} style={{ verticalAlign: -1 }}/></a>
                </div>
              </div>
              <div style={{ background: '#0A0908', border: '1px solid rgba(245,240,232,0.1)', borderRadius: 14, padding: '30px 32px' }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(245,240,232,0.45)', marginBottom: 18 }}>WHAT IT SHIPS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {FLAGSHIP_POINTS.map(pt => (
                    <div key={pt} className="cg" style={{ display: 'flex', gap: 10, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(245,240,232,0.65)' }}>
                      <span className="mono" style={{ color: GOLD, flexShrink: 0 }}>▸</span><span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── EXPANSION PACK ── */}
      <section style={{ padding: 'clamp(72px,10vw,110px) clamp(24px,5vw,72px) 0' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <h2 className="cd" style={{ fontSize: 'clamp(32px,4vw,56px)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 14px' }}>The expansion pack.</h2>
            <p className="cg" style={{ fontSize: 16.5, color: 'rgba(245,240,232,0.55)', maxWidth: 560, margin: '0 0 48px', lineHeight: 1.6 }}>
              Four standalone offensive-security tools — each one attacks a different layer of the AI stack, and each one feeds its findings back into AegisTrace.
            </p>
          </Reveal>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 1,
            background: 'rgba(245,240,232,0.1)', border: '1px solid rgba(245,240,232,0.1)',
          }}>
            {TOOLS.map((tool, i) => (
              <Reveal key={tool.name} delay={i * 0.07} style={{ height: '100%' }}>
                <div className="tool-cell" style={{ padding: '32px 28px', height: '100%' }}>
                  <div className="mono" style={{ fontSize: 11, color: 'rgba(245,240,232,0.35)', marginBottom: 16 }}>{tool.layer}</div>
                  <div className="mono" style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{tool.name}</div>
                  <p className="cg" style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(245,240,232,0.55)', margin: '0 0 18px' }}>{tool.desc}</p>
                  <a className="mono" href={tool.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: GOLD, textDecoration: 'none' }}>
                    {tool.cmd} ↗
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mono" style={{ margin: '22px 0 0', fontSize: 12.5, color: 'rgba(245,240,232,0.4)' }}>
              + mcp-aegis — the defensive MCP gateway the offensive tools are tested against. Purple team in a box.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── BACKGROUND ── */}
      <section style={{ padding: 'clamp(72px,10vw,110px) clamp(24px,5vw,72px) 0' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal>
            <EditorialRow label="EXPERIENCE">
              <div className="cd" style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Blue Team SOC Analyst · Security Tooling Developer</div>
              <p className="cg" style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(245,240,232,0.55)', maxWidth: 720, margin: 0 }}>
                Case triage, threat hunting, identity threat detection and incident response — plus designing, building, red-teaming and shipping the tooling that does it. Every feature in AegisTrace exists because a real shift needed it.
              </p>
            </EditorialRow>
          </Reveal>
          <Reveal>
            <EditorialRow label="CERTIFICATIONS">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {CERTS_EARNED.map(c => (
                  <span key={c} className="mono" style={{ fontSize: 12.5, border: '1px solid rgba(245,158,11,0.4)', color: INK, borderRadius: 100, padding: '9px 18px' }}>{c}</span>
                ))}
                {CERTS_PENDING.map(c => (
                  <span key={c} className="mono" style={{ fontSize: 12.5, border: '1px solid rgba(245,240,232,0.18)', color: 'rgba(245,240,232,0.5)', borderRadius: 100, padding: '9px 18px' }}>{c}</span>
                ))}
              </div>
            </EditorialRow>
          </Reveal>
          <Reveal>
            <EditorialRow label="EDUCATION">
              <div className="cd" style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>MSc Information Systems &amp; Computing</div>
              <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.55)', margin: 0 }}>Dublin Business School · 2025</p>
            </EditorialRow>
          </Reveal>
          <div style={{ borderTop: '1px solid rgba(245,240,232,0.1)' }}/>
        </div>
      </section>

      {/* ── CONTACT CTA ── */}
      <section style={{ padding: 'clamp(96px,12vw,150px) clamp(24px,5vw,72px)', textAlign: 'center' }}>
        <Reveal>
          <h2 className="cd" style={{ fontSize: 'clamp(40px,6vw,92px)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 34px', lineHeight: 1.02 }}>
            Let&apos;s <span style={{ color: GOLD }}>talk shop.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="gold-btn" href="mailto:Prasanna80564@gmail.com" style={{ fontSize: 14, padding: '15px 34px' }}>Email me <ArrowRight size={16}/></a>
            <a className="ghost-btn" href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, padding: '14px 28px' }}>GitHub</a>
            <a className="ghost-btn" href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, padding: '14px 28px' }}>LinkedIn</a>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '32px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span className="mono" style={{ color: 'rgba(245,240,232,0.4)', fontSize: 12, letterSpacing: '0.18em' }}>PRASANNA KUMAR SURENDRAN — DUBLIN, IRELAND</span>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <Link to="/" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Home</Link>
            <Link to="/mission" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Mission</Link>
            <Link to="/app/login" className="cg" style={{ color: 'rgba(245,240,232,0.28)', fontSize: 12, textDecoration: 'none' }}>Platform</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
