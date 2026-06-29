import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Check, Github } from 'lucide-react';
import CardNav from '../components/CardNav';
import BorderGlow from '../components/BorderGlow';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#050505';
const INK  = '#BDD4E8';

/* ─── Scroll state for nav ───────────────────────────────────────────────── */
function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [threshold]);
  return scrolled;
}

/* ─── Reveal wrapper ────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 28, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.72, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Stagger reveal for rows ────────────────────────────────────────────── */
function StaggerRow({ children, index = 0, baseDelay = 0 }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: -10 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
      transition={{ duration: 0.5, delay: baseDelay + index * 0.03, ease: E }}
    >{children}</motion.div>
  );
}

/* ─── 3D tilt card ───────────────────────────────────────────────────────── */
function TiltCard({ children, style = {} }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  const handleMove = useCallback(e => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    ref.current.style.transform = `perspective(600px) rotateX(${-y * 7}deg) rotateY(${x * 7}deg) translateY(-2px)`;
  }, [reduced]);

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateY(0)';
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
        willChange: 'transform',
        ...style,
      }}
    >{children}</div>
  );
}

/* ─── Copy button ────────────────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      aria-label="Copy command"
      style={{
        background: 'none', border: '1px solid rgba(189,212,232,0.15)',
        cursor: 'pointer', padding: '6px 10px', borderRadius: 4,
        color: copied ? GOLD : 'rgba(189,212,232,0.4)',
        display: 'flex', alignItems: 'center', gap: 5,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
        transition: 'color 200ms, border-color 200ms',
      }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'rgba(189,212,232,0.8)'; }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(189,212,232,0.4)'; }}
    >
      {copied ? <Check size={12}/> : <Copy size={12}/>}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   DATA
════════════════════════════════════════════════════════════════════════════ */

const CAPABILITIES = [
  { cat: 'DETECTION',    name: 'Impossible Travel',        desc: 'Flags logins across geographies impossible within travel time, using MaxMind GeoLite2 offline.' },
  { cat: 'DETECTION',    name: 'Credential Stuffing',      desc: 'Detects burst-pattern failed logins correlated with IP reputation across Okta, Azure AD.' },
  { cat: 'DETECTION',    name: 'MFA Fatigue',              desc: 'Identifies repeated push-prompt floods targeting specific users to bypass MFA.' },
  { cat: 'DETECTION',    name: 'Privilege Escalation',     desc: 'Monitors role elevation events and cross-checks against expected access baselines.' },
  { cat: 'DETECTION',    name: 'Session Anomaly',          desc: 'Detects concurrent sessions from divergent user agents, ASNs, and device fingerprints.' },
  { cat: 'DETECTION',    name: 'Lateral Movement',         desc: 'Traces identity pivoting between services using OAuth token chains and access logs.' },
  { cat: 'DETECTION',    name: 'Account Takeover (ATO)',   desc: 'Composite detection combining geo, device, behavior, and velocity signals.' },
  { cat: 'INVESTIGATION', name: '15-Tab Case Workbench',  desc: 'Structured investigation interface covering timeline, IOCs, attack graph, SOAR, and reports.' },
  { cat: 'INVESTIGATION', name: 'Attack Graph',            desc: 'Visual traversal of entity relationships across users, devices, IPs, and services.' },
  { cat: 'INVESTIGATION', name: 'IOC Intelligence',        desc: '7 enrichment sources: VirusTotal, GreyNoise, AlienVault OTX, Shodan, AbuseIPDB, threat feeds, geo.' },
  { cat: 'INVESTIGATION', name: 'Timeline Reconstruction', desc: 'Chronological event assembly from multi-source logs with deduplication and gap detection.' },
  { cat: 'INVESTIGATION', name: 'PCAP Analysis',           desc: 'Network capture dissection with protocol decoding and lateral movement heuristics.' },
  { cat: 'AI',           name: 'Hermes-3 70B Triage',      desc: 'Agentic 5-tool reasoning loop: enrichment, correlation, verdict, MITRE mapping, escalation.' },
  { cat: 'AI',           name: 'Nemotron-70B Chains',      desc: 'Attack chain reconstruction synthesizing multi-hop lateral movement narratives.' },
  { cat: 'AI',           name: 'Codestral 22B Detection',  desc: 'Generates YARA, Sigma, KQL, and SPL rules from natural-language threat descriptions.' },
  { cat: 'AI',           name: 'Llama 3.2 Vision',         desc: 'Analyzes screenshots and images for credential harvesting pages, phishing, and visual IOCs.' },
  { cat: 'COMPLIANCE',   name: 'DORA Reports',             desc: 'Auto-generates EU Digital Operational Resilience Act incident reports from case data.' },
  { cat: 'COMPLIANCE',   name: 'NIS2 Mapping',             desc: 'Maps detected incidents to NIS2 directive obligations with remediation guidance.' },
  { cat: 'COMPLIANCE',   name: 'SHA-256 Hash Chain',       desc: 'Every AI decision cryptographically chained. Tamper any record and the chain breaks. Trust Certificate export for DORA Article 19.' },
  { cat: 'COMPLIANCE',   name: 'Audit Trail',              desc: 'Tamper-evident, signed event log covering all analyst actions and AI decisions.' },
  { cat: 'ENDPOINT',     name: 'Endpoint Agent v6.1',      desc: 'ATSP protocol: X25519 + ChaCha20-Poly1305 + 3-layer replay protection. Honey tokens, YARA-lite, auto-block, ProVerif-verified transport.' },
  { cat: 'ENDPOINT',     name: 'ATSP Secure Protocol',     desc: 'Formally verifiable telemetry protocol. 4 security properties proved with ProVerif. Forward secrecy per session. Zero new dependencies.' },
  { cat: 'ENDPOINT',     name: 'Persistence Monitor',      desc: 'Watches run keys, cron, launchd, systemd, and startup paths for unauthorized persistence.' },
];

const CAT_ORDER   = ['DETECTION', 'INVESTIGATION', 'AI', 'COMPLIANCE', 'ENDPOINT'];
const CAT_COLORS  = {
  DETECTION:     GOLD,
  INVESTIGATION: '#93C5FD',
  AI:            '#A78BFA',
  COMPLIANCE:    '#6EE7B7',
  ENDPOINT:      '#FCA5A5',
};

const AI_MODELS = [
  {
    name: 'Hermes-3 70B',
    role: 'Agentic triage',
    desc: 'Five-tool reasoning loop: enrichment, correlation, verdict, MITRE ATT&CK mapping, escalation recommendation. Explains every step.',
    badge: 'NVIDIA NIM',
  },
  {
    name: 'Nemotron-70B',
    role: 'Chain reconstruction',
    desc: 'Synthesizes multi-hop lateral movement into a readable attack narrative. Identifies the patient zero, pivot path, and blast radius.',
    badge: 'NVIDIA NIM',
  },
  {
    name: 'Codestral 22B',
    role: 'Detection engineering',
    desc: 'Generates production-ready YARA, Sigma, KQL, and SPL rules from natural-language threat descriptions. No detection engineering experience required.',
    badge: 'Mistral',
  },
  {
    name: 'Llama 3.2 Vision',
    role: 'Visual IOC analysis',
    desc: 'Analyzes screenshots, phishing pages, and image attachments for credential harvesting UI, brand spoofing, and embedded malicious content.',
    badge: 'Meta',
  },
];

const TERMINAL_LINES = [
  { prompt: '#',  text: 'Deploy in one command' },
  { prompt: '$',  text: 'curl -fsSL https://aegistrace.uk/agent/install.sh | sudo bash', copy: true },
  { prompt: null, text: '' },
  { prompt: '[✓]', text: 'AegisTrace Endpoint Agent v6.1 installed',    gold: true },
  { prompt: '[✓]', text: 'Connected to: aegistrace.uk',                  gold: true },
  { prompt: '[✓]', text: 'Telemetry interval: 3s',                       gold: true },
  { prompt: '[✓]', text: 'Honey tokens: active',                         gold: true },
  { prompt: '[✓]', text: 'OS: Linux 6.1 (Ubuntu 22.04)',                 gold: true },
];

const COMPARISON = [
  { feature: 'Identity-first detection',  aegis: true,  siem: false,      soar: 'Partial' },
  { feature: 'One-command deploy',        aegis: true,  siem: false,      soar: false },
  { feature: 'Explainable AI verdicts',   aegis: true,  siem: false,      soar: false },
  { feature: 'DORA compliance reports',   aegis: true,  siem: false,      soar: false },
  { feature: 'Attack graph (built-in)',   aegis: true,  siem: false,      soar: 'Partial' },
  { feature: 'Endpoint agent',            aegis: true,  siem: false,      soar: false },
  { feature: 'Cost',                      aegis: 'Free', siem: '$50k+/yr', soar: '$100k+/yr' },
];

const INSTALL_CMD = 'curl -fsSL https://aegistrace.uk/agent/install.sh | sudo bash';

const ASCII_DIAGRAM = `IDENTITY PROVIDERS          ENDPOINTS           EMAIL
       ↓                          ↓                  ↓
┌─────────────────────────────────────────────────────┐
│              AEGISTRACE INGEST ENGINE               │
│  Okta · Azure AD · Auth0 · Endpoint Agent v6.1        │
└─────────────────────────────────────────────────────┘
           ↓                              ↓
┌──────────────────────┐    ┌────────────────────────┐
│  IDENTITY RISK ENGINE│    │  IOC INTELLIGENCE (7x) │
│  6 ITDR Detectors    │    │  VT · Grey · Feeds     │
└──────────────────────┘    └────────────────────────┘
           ↓                              ↓
┌─────────────────────────────────────────────────────┐
│           AI TRIAGE — Hermes-3 · Nemotron-70B       │
│      Agentic reasoning · Explainable verdicts       │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│       CASE MANAGEMENT · 15-TAB INVESTIGATION        │
│   Timeline · IOCs · Attack Graph · SOAR · Reports  │
└─────────────────────────────────────────────────────┘`;

/* ════════════════════════════════════════════════════════════════════════════
   SECTION: Hero
════════════════════════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section style={{
      padding: 'clamp(120px,14vw,160px) clamp(24px,6vw,80px) clamp(72px,8vw,110px)',
      maxWidth: 1100, margin: '0 auto',
    }}>
      <CharStagger
        text="The complete SOC, without the procurement cycle."
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(42px,6vw,72px)',
          fontWeight: 600,
          color: INK,
          lineHeight: 1.06,
          letterSpacing: '-0.03em',
          margin: '0 0 28px',
          display: 'block',
          textWrap: 'balance',
        }}
      />

      <Reveal delay={0.3}>
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 'clamp(16px,1.8vw,20px)',
          color: 'rgba(189,212,232,0.55)',
          maxWidth: '58ch',
          lineHeight: 1.6,
          margin: '0 0 40px',
        }}>
          Identity detection, AI triage, attack graph, SOAR, compliance reports — one platform, free, deployable in one command.
        </p>
      </Reveal>

      <Reveal delay={0.45} style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <a href="/app/login" target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: GOLD, color: '#BDD4E8',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 14, fontWeight: 700,
          padding: '12px 22px', borderRadius: 5,
          textDecoration: 'none', letterSpacing: '0.01em',
          transition: 'background 200ms, transform 120ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FBBF24'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Access Platform <ArrowRight size={14}/>
        </a>
        <a href="https://github.com/prasannakumar-s/aegistrace" target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'transparent',
          border: '1px solid rgba(189,212,232,0.2)',
          color: 'rgba(189,212,232,0.75)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 14, fontWeight: 500,
          padding: '12px 22px', borderRadius: 5,
          textDecoration: 'none', letterSpacing: '0.01em',
          transition: 'border-color 200ms, color 200ms, transform 120ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(189,212,232,0.4)'; e.currentTarget.style.color = INK; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(189,212,232,0.2)'; e.currentTarget.style.color = 'rgba(189,212,232,0.75)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Github size={14}/> View on GitHub
        </a>
      </Reveal>
    </section>
  );
}

/* Char stagger helper */
function CharStagger({ text, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const words  = text.split(' ');
  return (
    <span ref={ref} style={{ display: 'block', ...style }}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: 'inline-block', marginRight: wi < words.length - 1 ? '0.28em' : 0 }}>
          {word.split('').map((ch, ci) => {
            const delay = (wi * word.length + ci) * 0.018;
            return (
              <motion.span
                key={ci}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                transition={{ duration: 0.6, delay, ease: E }}
                style={{ display: 'inline-block' }}
              >{ch}</motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION: Capability Matrix
════════════════════════════════════════════════════════════════════════════ */
function CapabilityMatrix() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <section style={{
      padding: 'clamp(72px,8vw,110px) clamp(24px,6vw,80px)',
      maxWidth: 1100, margin: '0 auto',
    }}>
      <Reveal>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(28px,3.5vw,42px)',
          fontWeight: 600, color: INK,
          letterSpacing: '-0.025em',
          margin: '0 0 48px',
          textWrap: 'balance',
        }}>
          21 shipped capabilities, one platform.
        </h2>
      </Reveal>

      <div style={{
        border: '1px solid rgba(74,126,200,0.12)',
        borderRadius: 8, overflow: 'hidden',
      }}>
        {CAT_ORDER.flatMap(cat =>
          CAPABILITIES
            .filter(c => c.cat === cat)
            .map((cap, i, arr) => {
              const globalIndex = CAPABILITIES.indexOf(cap);
              const isLast = i === arr.length - 1;
              const isHovered = hoveredIndex === globalIndex;
              return (
                <StaggerRow key={cap.name} index={globalIndex} baseDelay={0}>
                  <div
                    onMouseEnter={() => setHoveredIndex(globalIndex)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '130px 1fr',
                      gap: 0,
                      borderBottom: isLast ? 'none' : '1px solid rgba(74,126,200,0.07)',
                      background: isHovered ? 'rgba(245,158,11,0.035)' : 'transparent',
                      transition: 'background 140ms ease',
                      cursor: 'default',
                    }}
                  >
                    {/* Category column */}
                    <div style={{
                      padding: '16px 20px',
                      display: 'flex', alignItems: 'center',
                      borderRight: '1px solid rgba(74,126,200,0.07)',
                    }}>
                      {i === 0 && (
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 9.5, fontWeight: 600,
                          letterSpacing: '0.14em',
                          color: CAT_COLORS[cat] || 'rgba(189,212,232,0.4)',
                          textTransform: 'uppercase',
                        }}>
                          {cat}
                        </span>
                      )}
                    </div>

                    {/* Feature column */}
                    <div style={{
                      padding: '14px 24px',
                      display: 'flex', alignItems: 'center', gap: 16,
                      transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                      transition: 'transform 140ms ease',
                    }}>
                      <div style={{
                        width: 2, height: 22, flexShrink: 0,
                        background: GOLD,
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 140ms ease',
                        borderRadius: 1,
                      }}/>
                      <div>
                        <div style={{
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          fontSize: 14, fontWeight: 600,
                          color: INK, marginBottom: 3,
                        }}>
                          {cap.name}
                        </div>
                        <div style={{
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          fontSize: 12.5,
                          color: 'rgba(189,212,232,0.45)',
                          lineHeight: 1.5,
                          maxWidth: '70ch',
                        }}>
                          {cap.desc}
                        </div>
                      </div>
                    </div>
                  </div>
                </StaggerRow>
              );
            })
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION: Architecture
════════════════════════════════════════════════════════════════════════════ */
function ArchitectureSection() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section style={{
      padding: 'clamp(72px,8vw,110px) clamp(24px,6vw,80px)',
      background: 'rgba(255,255,255,0.015)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(28px,3.5vw,42px)',
            fontWeight: 600, color: INK,
            letterSpacing: '-0.025em',
            margin: '0 0 48px',
          }}>
            How it fits together.
          </h2>
        </Reveal>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.72, ease: E }}
          style={{
            position: 'relative',
            background: '#0F1428',
            border: '1px solid rgba(245,158,11,0.18)',
            borderRadius: 8,
            padding: 'clamp(24px,4vw,40px) clamp(20px,3vw,36px)',
            overflow: 'hidden',
          }}
        >
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)`,
          }}/>

          <pre style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 'clamp(10px,1.2vw,13px)',
            color: 'rgba(189,212,232,0.75)',
            lineHeight: 1.7,
            margin: 0,
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}>
            {ASCII_DIAGRAM.split('\n').map((line, i) => {
              const isBox = /[┌┐└┘├┤┬┴┼─│]/.test(line);
              return (
                <div key={i} style={{ color: isBox ? 'rgba(74,126,200,0.7)' : undefined }}>
                  {line || ' '}
                </div>
              );
            })}
          </pre>
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION: AI Models
════════════════════════════════════════════════════════════════════════════ */
function AIModelsSection() {
  return (
    <section style={{
      padding: 'clamp(72px,8vw,110px) clamp(24px,6vw,80px)',
      maxWidth: 1100, margin: '0 auto',
    }}>
      <Reveal>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(28px,3.5vw,42px)',
          fontWeight: 600, color: INK,
          letterSpacing: '-0.025em',
          margin: '0 0 12px',
        }}>
          Four AI models, four distinct roles.
        </h2>
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 16, color: 'rgba(189,212,232,0.45)',
          margin: '0 0 48px', lineHeight: 1.6, maxWidth: '52ch',
        }}>
          Not one general-purpose model doing everything poorly. Four specialists, each chosen for its specific task.
        </p>
      </Reveal>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {AI_MODELS.map((model, i) => (
          <Reveal key={model.name} delay={i * 0.07}>
            <TiltCard style={{ height: '100%' }}>
              <BorderGlow severity="normal" radius={8} innerStyle={{ padding: '24px 22px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }} style={{ height: '100%' }}>
              <div style={{ display: 'contents' }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13, fontWeight: 600,
                  color: GOLD, letterSpacing: '0.04em',
                }}>
                  {model.name}
                </div>

                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 15, fontWeight: 700,
                  color: INK, lineHeight: 1.3,
                }}>
                  {model.role}
                </div>

                <p style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13, color: 'rgba(189,212,232,0.48)',
                  lineHeight: 1.6, margin: 0, flex: 1,
                }}>
                  {model.desc}
                </p>

                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 4, padding: '4px 10px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, letterSpacing: '0.1em',
                  color: 'rgba(245,158,11,0.7)',
                  alignSelf: 'flex-start', marginTop: 4,
                }}>
                  {model.badge}
                </div>
              </div>
              </BorderGlow>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION: Endpoint agent terminal
════════════════════════════════════════════════════════════════════════════ */
function EndpointSection() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section style={{
      padding: 'clamp(72px,8vw,110px) clamp(24px,6vw,80px)',
      background: 'rgba(255,255,255,0.015)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(28px,3.5vw,42px)',
            fontWeight: 600, color: INK,
            letterSpacing: '-0.025em',
            margin: '0 0 12px',
          }}>
            One command. Your endpoint is monitored.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 16, color: 'rgba(189,212,232,0.45)',
            margin: '0 0 40px', lineHeight: 1.6, maxWidth: '48ch',
          }}>
            The endpoint agent installs in under 10 seconds on any Linux or macOS host. No configuration files. No vendor accounts.
          </p>
        </Reveal>

        {/* Logo + label above terminal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <img src="/assets/brand/aegistrace-icon-transparent.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(74,126,200,0.6))' }}/>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#4A7EC8', letterSpacing: '0.2em' }}>ENDPOINT AGENT</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, color: '#BDD4E8' }}>Deploy in one command</div>
          </div>
        </div>

        {/* Terminal */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.65, ease: E }}
          style={{
            background: '#030308',
            border: '1px solid rgba(74,126,200,0.18)',
            borderRadius: 10,
            overflow: 'hidden',
            maxWidth: 680,
          }}
        >
          {/* Terminal chrome */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(189,212,232,0.07)',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#F87171', '#FBBF24', '#34D399'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.5 }}/>
              ))}
            </div>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: 'rgba(189,212,232,0.25)',
            }}>
              bash
            </span>
            <CopyBtn text={INSTALL_CMD}/>
          </div>

          {/* Lines */}
          <div style={{ padding: '20px 24px' }}>
            {TERMINAL_LINES.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: E }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: i < TERMINAL_LINES.length - 1 ? 8 : 0,
                  minHeight: line.text === '' ? 12 : undefined,
                }}
              >
                {line.prompt !== null && (
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: line.prompt === '$' ? '#4A7EC8'
                          : line.prompt === '#' ? 'rgba(189,212,232,0.28)'
                          : '#34D399',
                    flexShrink: 0, marginTop: 1,
                    minWidth: line.gold ? 24 : undefined,
                  }}>
                    {line.prompt}
                  </span>
                )}
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: line.gold ? 'rgba(189,212,232,0.75)'
                        : line.prompt === '#' ? 'rgba(189,212,232,0.35)'
                        : 'rgba(189,212,232,0.65)',
                  lineHeight: 1.6,
                  wordBreak: 'break-all',
                }}>
                  {line.text}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION: Comparison table
════════════════════════════════════════════════════════════════════════════ */
function ComparisonSection() {
  const COLS = ['AegisTrace', 'Traditional SIEM', 'Commercial SOAR'];

  return (
    <section style={{
      padding: 'clamp(72px,8vw,110px) clamp(24px,6vw,80px)',
      maxWidth: 1100, margin: '0 auto',
    }}>
      <Reveal>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 'clamp(28px,3.5vw,42px)',
          fontWeight: 600, color: INK,
          letterSpacing: '-0.025em',
          margin: '0 0 48px',
        }}>
          Built different.
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}>
            <thead>
              <tr>
                <th style={{
                  textAlign: 'left', padding: '14px 20px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5, fontWeight: 500,
                  color: 'rgba(189,212,232,0.35)', letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid rgba(74,126,200,0.12)',
                }}>Feature</th>
                {COLS.map((col, ci) => (
                  <th key={col} style={{
                    textAlign: 'center', padding: '14px 20px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5, fontWeight: ci === 0 ? 700 : 500,
                    color: ci === 0 ? '#4A7EC8' : 'rgba(189,212,232,0.35)',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(74,126,200,0.12)',
                    background: ci === 0 ? 'rgba(74,126,200,0.05)' : 'transparent',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, ri) => (
                <tr key={row.feature} style={{
                  borderBottom: ri < COMPARISON.length - 1 ? '1px solid rgba(74,126,200,0.06)' : 'none',
                }}>
                  <td style={{
                    padding: '14px 20px',
                    fontSize: 14, fontWeight: 500,
                    color: 'rgba(189,212,232,0.7)',
                  }}>{row.feature}</td>
                  {[row.aegis, row.siem, row.soar].map((val, ci) => (
                    <td key={ci} style={{
                      padding: '14px 20px', textAlign: 'center',
                      background: ci === 0 ? 'rgba(74,126,200,0.04)' : 'transparent',
                      fontSize: 14,
                      color: ci === 0 ? '#8BB8E8'
                            : val === false ? 'rgba(189,212,232,0.22)'
                            : val === 'Partial' ? 'rgba(189,212,232,0.45)'
                            : 'rgba(189,212,232,0.6)',
                      fontWeight: ci === 0 ? 700 : 400,
                    }}>
                      {val === true  ? '✓'
                       : val === false ? '✗'
                       : val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION: Final CTA
════════════════════════════════════════════════════════════════════════════ */
function CTASection() {
  return (
    <section style={{
      padding: 'clamp(80px,10vw,130px) clamp(24px,6vw,80px)',
      background: 'rgba(245,158,11,0.03)',
      borderTop: '1px solid rgba(245,158,11,0.1)',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(32px,4vw,52px)',
            fontWeight: 600, color: INK,
            letterSpacing: '-0.025em',
            margin: '0 0 20px',
            textWrap: 'balance',
          }}>
            One command. Your entire SOC.
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 16, color: 'rgba(189,212,232,0.45)',
            margin: '0 0 32px', lineHeight: 1.6,
          }}>
            No vendor negotiations. No 90-day implementations. No $100k invoices.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{
            background: '#030308',
            border: '1px solid rgba(74,126,200,0.18)',
            borderRadius: 6,
            padding: '14px 20px',
            marginBottom: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12,
          }}>
            <code style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13, color: GOLD,
              wordBreak: 'break-all', textAlign: 'left',
            }}>
              {INSTALL_CMD}
            </code>
            <CopyBtn text={INSTALL_CMD}/>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <a href="/app/login" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: GOLD, color: '#BDD4E8',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 15, fontWeight: 700,
            padding: '14px 28px', borderRadius: 5,
            textDecoration: 'none', letterSpacing: '0.01em',
            transition: 'background 200ms, transform 120ms, box-shadow 200ms',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#FBBF24';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,158,11,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = GOLD;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Access Platform <ArrowRight size={15}/>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════════ */
export default function Platform() {
  const scrolled = useScrolled();

  return (
    <div style={{ background: BG, minHeight: '100vh', color: INK }}>
      <style>{`
        ::selection { background: rgba(74,126,200,0.3); color: ${INK}; }
        .plat-nav-link {
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(189,212,232,0.7); text-decoration: none; letter-spacing: 0.03em;
          transition: color 140ms; position: relative;
        }
        .plat-nav-link:hover { color: ${INK}; }
        .plat-nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -4px;
          height: 1px; background: ${GOLD};
          transition: right 260ms cubic-bezier(0.16,1,0.3,1);
        }
        .plat-nav-link:hover::after { right: 0; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <CardNav/>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <HeroSection/>
      <CapabilityMatrix/>
      <ArchitectureSection/>
      <AIModelsSection/>
      <EndpointSection/>
      <ComparisonSection/>
      <CTASection/>

      {/* Footer */}
      <footer style={{
        padding: '28px clamp(24px,6vw,80px)',
        borderTop: '1px solid rgba(74,126,200,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/assets/brand/aegistrace-icon-transparent.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.5 }}/>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: 'rgba(189,212,232,0.28)', fontSize: 11, letterSpacing: '0.16em' }}>AEGISTRACE</span>
        </div>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11, color: 'rgba(189,212,232,0.2)',
          letterSpacing: '0.08em',
        }}>
          AegisTrace · v10.1 · 2026
        </span>
        <Link to="/" style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12, color: 'rgba(189,212,232,0.28)',
          textDecoration: 'none', transition: 'color 140ms',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(189,212,232,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(189,212,232,0.28)')}
        >
          Back to site
        </Link>
      </footer>
    </div>
  );
}
