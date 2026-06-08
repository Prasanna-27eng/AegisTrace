import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  ArrowUpRight, Github, Mail, ExternalLink,
  CheckCircle, Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050405';

/* ─── 3D tilt ───────────────────────────────────────────────────────────── */
function TiltCard({ children, style = {} }) {
  const ref  = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [live, setLive] = useState(false);
  const onMove = e => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top)  / r.height - 0.5) * -10;
    const ry = ((e.clientX - r.left) / r.width  - 0.5) *  10;
    setTilt({ rx, ry });
  };
  return (
    <div ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setLive(true)}
      onMouseLeave={() => { setTilt({ rx: 0, ry: 0 }); setLive(false); }}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)${live ? ' translateZ(5px)' : ''}`,
        transition: live ? 'transform 0.1s linear' : 'transform 0.65s cubic-bezier(0.16,1,0.3,1)',
        ...style,
      }}
    >{children}</div>
  );
}

/* ─── Scroll reveal ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-70px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 26 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Project card ──────────────────────────────────────────────────────── */
function ProjectCard({ title, tags, desc, url, large = false, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <Reveal delay={delay} style={{ height: '100%' }}>
      <TiltCard style={{ height: '100%' }}>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            background: hov ? 'rgba(245,158,11,0.04)' : 'rgba(245,240,232,0.025)',
            border: `1px solid ${hov ? 'rgba(245,158,11,0.18)' : 'rgba(245,240,232,0.07)'}`,
            padding: large ? '36px 32px' : '28px 24px',
            height: '100%',
            display: 'flex', flexDirection: 'column',
            transition: 'background 220ms cubic-bezier(0.16,1,0.3,1), border-color 220ms',
          }}
        >
          {large && (
            <div style={{ display: 'inline-flex', padding: '4px 10px', background: 'rgba(245,158,11,0.12)', marginBottom: 20, alignSelf: 'flex-start' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: GOLD, letterSpacing: '0.12em', fontWeight: 600 }}>FLAGSHIP PROJECT</span>
            </div>
          )}
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: large ? 20 : 15, fontWeight: 600, color: '#F5F0E8', marginBottom: 12, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            {title}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {tags.map(t => (
              <span key={t} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'rgba(245,158,11,0.7)', border: '1px solid rgba(245,158,11,0.18)', padding: '3px 8px', letterSpacing: '0.06em' }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 13, color: 'rgba(245,240,232,0.46)', lineHeight: 1.68, flex: 1, marginBottom: url ? 18 : 0 }}>
            {desc}
          </div>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 12, color: GOLD, textDecoration: 'none', fontWeight: 600, transition: 'gap 140ms' }}
              onMouseEnter={e => (e.currentTarget.style.gap = '8px')}
              onMouseLeave={e => (e.currentTarget.style.gap = '5px')}
            >
              View on GitHub <ExternalLink size={11}/>
            </a>
          )}
        </div>
      </TiltCard>
    </Reveal>
  );
}

/* ─── Cert chip ─────────────────────────────────────────────────────────── */
function CertChip({ name, issuer, status, done, delay }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, delay, ease: E }}
      style={{
        background: 'rgba(245,240,232,0.025)', border: '1px solid rgba(245,240,232,0.07)',
        padding: '20px 22px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: '#F5F0E8', lineHeight: 1.3 }}>{name}</div>
        {done
          ? <CheckCircle size={14} color={GOLD} style={{ flexShrink: 0, marginTop: 2 }}/>
          : <Clock size={14} color="rgba(245,240,232,0.3)" style={{ flexShrink: 0, marginTop: 2 }}/>
        }
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(245,240,232,0.35)', letterSpacing: '0.06em' }}>{issuer}</div>
      <div style={{ marginTop: 10 }}>
        <span style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
          color: done ? GOLD : 'rgba(245,240,232,0.35)',
          background: done ? 'rgba(245,158,11,0.1)' : 'transparent',
          padding: '3px 8px', letterSpacing: '0.1em',
        }}>{status}</span>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PORTFOLIO
════════════════════════════════════════════════════════════════════════════ */
export default function Portfolio() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const SKILLS = [
    { cat: 'Detection & Response', tags: ['Microsoft Sentinel', 'KQL', 'Incident Response', 'MITRE ATT&CK', 'SIEM', 'SOAR'] },
    { cat: 'Threat Intelligence',  tags: ['IOC Enrichment', 'VirusTotal', 'OTX', 'AbuseIPDB', 'Shodan', 'Campaign Analysis'] },
    { cat: 'Forensics',            tags: ['Email Forensics', 'DKIM/SPF/DMARC', 'Memory Analysis', 'Endpoint Forensics', 'PCAP'] },
    { cat: 'Engineering',          tags: ['React 18', 'FastAPI', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'REST APIs'] },
    { cat: 'AI / LLM',            tags: ['NVIDIA NIM', 'Hermes-3', 'Llama 3.2 Vision', 'Codestral 22B', 'Groq', 'Llama Guard', 'Function Calling', 'Embeddings'] },
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

        .skill-tag {
          display: inline-block;
          fontFamily: 'Cabinet Grotesk', sans-serif; font-size: 12px; font-weight: 500;
          color: rgba(245,240,232,0.6); border: 1px solid rgba(245,240,232,0.1);
          padding: 6px 14px; cursor: default; line-height: 1;
          transition: color 160ms, border-color 160ms, background 160ms;
        }
        .skill-tag:hover { color: ${GOLD}; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.05); }

        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,48px)', height: 64,
        background: scrolled ? 'rgba(5,4,5,0.9)' : 'rgba(5,4,5,0.0)',
        backdropFilter: scrolled ? 'blur(18px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(18px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(245,240,232,0.06)' : 'none',
        transition: 'background 300ms, backdrop-filter 300ms',
      }}>
        <Link to="/" className="cd" style={{ color: '#F5F0E8', textDecoration: 'none', fontSize: 17, fontWeight: 700, letterSpacing: '0.1em' }}>
          AEGISTRACE
        </Link>
        <div style={{ display: 'flex', gap: 'clamp(20px,3vw,36px)', alignItems: 'center' }}>
          <Link to="/mission"   className="nav-link">Mission</Link>
          <Link to="/app/login" className="nav-link">Platform</Link>
          <a href="mailto:prasanna80564@gmail.com" className="gold-btn" style={{ padding: '9px 18px', fontSize: 12 }}>
            Contact <ArrowUpRight size={13}/>
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: 'clamp(140px,16vh,200px) clamp(24px,5vw,72px) clamp(72px,8vw,96px)', borderBottom: '1px solid rgba(245,240,232,0.06)', overflow: 'hidden' }}>
        {/* Background image with heavy dark overlay */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/pages/portfolio-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 40%', filter: 'brightness(0.28) saturate(0.7)', zIndex: 0 }}/>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,4,5,0.5) 0%, rgba(5,4,5,0.2) 40%, rgba(5,4,5,0.95) 100%)', zIndex: 1 }}/>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 5% 90%, rgba(245,158,11,0.1) 0%, transparent 65%)', zIndex: 1 }}/>
        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.1, ease: E }}
          >
            {/* Gold accent line */}
            <div style={{ width: 40, height: 2, background: GOLD, marginBottom: 32 }}/>
            <h1 className="cd" style={{ fontSize: 'clamp(48px,7vw,88px)', fontWeight: 700, color: '#F5F0E8', margin: '0 0 14px', lineHeight: 0.94, letterSpacing: '-0.03em', textWrap: 'balance' }}>
              Prasanna Kumar<br/>
              <span style={{ color: GOLD }}>Surendran.</span>
            </h1>
            <div className="cg" style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'rgba(245,240,232,0.5)', marginTop: 20, marginBottom: 10, fontWeight: 500, letterSpacing: '0.02em' }}>
              Cybersecurity Engineer
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.12em' }}>
              Dublin, Ireland · prasanna80564@gmail.com
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: E }}
            style={{ display: 'flex', gap: 14, marginTop: 40, flexWrap: 'wrap' }}
          >
            <a href="mailto:prasanna80564@gmail.com" className="gold-btn">
              Get in Touch <Mail size={14}/>
            </a>
            <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" className="ghost-btn">
              <Github size={14}/> GitHub
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(24px,5vw,72px)', background: '#060507' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }}>
          <Reveal>
            <div className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, paddingTop: 6 }}>
              About
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="cg" style={{ fontSize: 'clamp(16px,1.8vw,20px)', color: 'rgba(245,240,232,0.72)', lineHeight: 1.72, margin: '0 0 24px', maxWidth: 680, fontWeight: 400 }}>
              I build security platforms that think. AegisTrace is my full-stack proof of concept: a complete SOC control plane — identity threat detection, case management, email forensics, endpoint visibility — built from scratch while studying for my MSc in Dublin.
            </p>
            <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.42)', lineHeight: 1.7, margin: 0, maxWidth: 600 }}>
              My background spans electronics engineering (PSG College of Technology, Coimbatore) and information systems (Dublin Business School). I combine hardware-level thinking with modern cloud-security operations.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SKILLS ───────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Skills</span>
              <h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.02em', textWrap: 'balance' }}>
                What I work with
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {SKILLS.map(({ cat, tags }, si) => (
              <Reveal key={cat} delay={si * 0.06}>
                <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(20px,4vw,80px)', alignItems: 'start' }}>
                  <div className="cg" style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)', fontWeight: 500, paddingTop: 8, letterSpacing: '0.03em' }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {tags.map((t, ti) => (
                      <motion.span
                        key={t} className="skill-tag"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.55, delay: si * 0.06 + ti * 0.04, ease: E }}
                      >
                        {t}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROJECTS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(24px,5vw,72px)', background: '#060507', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 48 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Projects</span>
              <h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.02em' }}>
                What I've built
              </h2>
            </div>
          </Reveal>

          {/* Asymmetric grid: 1 large top + 3 smaller below */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 2 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <ProjectCard
                large
                title="AegisTrace — AI-Powered SOC Platform"
                tags={['React 18', 'FastAPI', 'NVIDIA NIM', 'PostgreSQL', 'Docker', 'MITRE ATT&CK']}
                desc="Full-stack security control plane with NVIDIA NIM agentic AI. 15-tab case management, ITDR with 4 detection engines, 7-source IOC intelligence, email forensics, identity graph, trust timeline, screenshot vision analysis (Llama 3.2 Vision 11B), detection rule generation (Codestral 22B — YARA, Sigma, KQL, Splunk SPL), Hermes-3 function-calling triage agent, semantic case search with NV-RerankQA, Llama Guard safety classifier, and DORA Article 19 compliance reports. Runs on Windows, Linux, and macOS."
                url="https://github.com/Prasanna-27eng/AegisTrace"
                delay={0}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
            <ProjectCard
              title="WebSecGuard — Web Security Scanner"
              tags={['Python', 'OWASP', 'Burp Suite', 'FastAPI']}
              desc="Automated OWASP Top 10 scanner. Header analysis, CORS misconfiguration detection, injection testing, and structured vulnerability reports."
              delay={0.08}
            />
            <ProjectCard
              title="Grand Line SOC Dashboard"
              tags={['Kibana', 'Elastic SIEM', 'Python', 'KQL']}
              desc="Real-time SOC metrics dashboard built on Elastic SIEM. Correlation rules, threat scoring, and analyst workload management."
              delay={0.14}
            />
            <ProjectCard
              title="Automated Cloud Security Posture"
              tags={['AWS', 'Python', 'boto3', 'IAM']}
              desc="Cloud security posture checks for AWS. IAM policy analysis, S3 ACL audits, Security Group misconfigs, and CIS Benchmark scoring."
              delay={0.20}
            />
          </div>
        </div>
      </section>

      {/* ── EXPERIENCE ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 56 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Experience</span>
              <h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.02em' }}>
                Where I've worked
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ position: 'relative', paddingLeft: 28, borderLeft: '1px solid rgba(245,240,232,0.08)' }}>
              {/* Gold dot */}
              <div style={{ position: 'absolute', left: -5, top: 6, width: 10, height: 10, borderRadius: '50%', background: GOLD }}/>
              <Reveal>
                <div>
                  <div className="cd" style={{ fontSize: 18, fontWeight: 600, color: '#F5F0E8', marginBottom: 4, letterSpacing: '-0.01em' }}>
                    Cybersecurity Analyst
                  </div>
                  <div className="cg" style={{ fontSize: 13, color: GOLD, marginBottom: 4, fontWeight: 600 }}>
                    Dublin, Ireland
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.08em', marginBottom: 16 }}>
                    2024 — Present
                  </div>
                  <p className="cg" style={{ fontSize: 14, color: 'rgba(245,240,232,0.52)', lineHeight: 1.7, margin: 0 }}>
                    Identity threat detection, incident response, and security tooling development. Built AegisTrace as an internal platform for SOC workflow automation.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── CERTIFICATIONS ───────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(24px,5vw,72px)', background: '#060507', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 48 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Credentials</span>
              <h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.02em' }}>
                Certifications
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
              <CertChip name="SC-200 Microsoft Security Operations Analyst" issuer="Microsoft · 2025"    status="CERTIFIED"     done delay={0}/>
              <CertChip name="CompTIA Security+"                             issuer="CompTIA · 2024"     status="CERTIFIED"     done delay={0.07}/>
              <CertChip name="TCM Practical Ethical Hacking"                 issuer="TCM Security"       status="CERTIFIED"     done delay={0.14}/>
              <CertChip name="Blue Team Labs Level 1 (BTL1)"                 issuer="Security Blue Team" status="IN PROGRESS"   done={false} delay={0.21}/>
            </div>
          </div>
        </div>
      </section>

      {/* ── EDUCATION ────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,112px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(245,240,232,0.05)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal style={{ marginBottom: 48 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'baseline' }}>
              <span className="cg" style={{ fontSize: 11, color: GOLD, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Education</span>
              <h2 className="cd" style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 700, color: '#F5F0E8', margin: 0, letterSpacing: '-0.02em' }}>
                Academic background
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(160px,20vw,240px) 1fr', gap: 'clamp(40px,6vw,80px)' }}>
            <div/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { deg: 'MSc Information Systems & Computing', school: 'Dublin Business School', loc: 'Dublin, Ireland', dates: 'Sep 2024 – Sep 2025 (Expected)' },
                { deg: 'B.E. Electronics & Communication Engineering', school: 'PSG College of Technology', loc: 'Coimbatore, India', dates: '2019 – 2023' },
              ].map(({ deg, school, loc, dates }, i) => (
                <motion.div key={deg}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: E }}
                  style={{ padding: '28px 0', borderBottom: '1px solid rgba(245,240,232,0.05)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}
                >
                  <div>
                    <div className="cd" style={{ fontSize: 16, fontWeight: 600, color: '#F5F0E8', marginBottom: 5, letterSpacing: '-0.01em' }}>{deg}</div>
                    <div className="cg" style={{ fontSize: 13, color: GOLD, marginBottom: 3, fontWeight: 600 }}>{school}</div>
                    <div className="cg" style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)' }}>{loc}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(245,240,232,0.28)', letterSpacing: '0.06em', textAlign: 'right', paddingTop: 4, whiteSpace: 'nowrap' }}>{dates}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(96px,12vw,160px) clamp(24px,5vw,72px)', background: '#060507', borderTop: '1px solid rgba(245,240,232,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <Reveal>
            <h2 className="cd" style={{ fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.03em', lineHeight: 0.95, marginBottom: 22, textWrap: 'balance' }}>
              Let's build something secure.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="cg" style={{ fontSize: 15, color: 'rgba(245,240,232,0.45)', lineHeight: 1.7, marginBottom: 40, maxWidth: 400, margin: '0 auto 40px' }}>
              Open to security analyst and engineering roles in Dublin or remote. Available immediately.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <a href="mailto:prasanna80564@gmail.com" className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>
                prasanna80564@gmail.com <Mail size={15}/>
              </a>
              <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer" className="ghost-btn" style={{ fontSize: 14, padding: '14px 26px' }}>
                <Github size={14}/> GitHub
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(245,240,232,0.05)', padding: '32px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span className="cd" style={{ color: 'rgba(245,240,232,0.2)', fontSize: 13, letterSpacing: '0.08em' }}>PRASANNA KUMAR SURENDRAN</span>
          <span className="cg" style={{ color: 'rgba(245,240,232,0.16)', fontSize: 11 }}>Dublin · 2026</span>
        </div>
      </footer>
    </div>
  );
}
