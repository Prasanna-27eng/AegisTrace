import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScrollProgressBar } from '../components/SceneController';

const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';
const BG   = '#0A1628';
const INK  = '#F1F5F9';

/* ─── Smooth wheel scroll ─────────────────────────────────────────────────── */
function useSmoothScroll() {
  useEffect(() => {
    let target = window.scrollY;
    let current = target;
    let raf = 0;
    const LERP = 0.08;
    const onWheel = e => {
      if (e.ctrlKey) return;
      e.preventDefault();
      target = Math.max(0, Math.min(document.body.scrollHeight - window.innerHeight, target + e.deltaY));
    };
    const loop = () => {
      current += (target - current) * LERP;
      if (Math.abs(target - current) > 0.5) window.scrollTo(0, current);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('wheel', onWheel); cancelAnimationFrame(raf); };
  }, []);
}

/* ─── Reveal ─────────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 30, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Copy button ─────────────────────────────────────────────────────────── */
function CopyButton({ text, style = {} }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={copy}
      data-cursor="link"
      style={{
        background: copied ? 'rgba(245,158,11,0.15)' : 'rgba(241,245,249,0.06)',
        border: `1px solid ${copied ? 'rgba(245,158,11,0.4)' : 'rgba(241,245,249,0.12)'}`,
        color: copied ? GOLD : 'rgba(241,245,249,0.55)',
        padding: '6px 12px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        transition: 'all 160ms ease',
        ...style,
      }}
    >
      {copied ? <Check size={12}/> : <Copy size={12}/>}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

/* ─── CopyAll button ─────────────────────────────────────────────────────── */
function CopyAllButton({ text }) {
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
      data-cursor="link"
      style={{
        background: copied ? 'rgba(245,158,11,0.12)' : 'transparent',
        border: `1px solid ${copied ? GOLD : 'rgba(241,245,249,0.18)'}`,
        color: copied ? GOLD : 'rgba(241,245,249,0.7)',
        padding: '10px 20px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600,
        transition: 'all 160ms ease',
      }}
    >
      {copied ? <Check size={14}/> : <Copy size={14}/>}
      {copied ? 'All copied!' : 'Copy all installs'}
    </button>
  );
}

/* ─── Terminal line colors ───────────────────────────────────────────────── */
function lineColor(text) {
  if (text.startsWith('[+]')) return '#4ade80';   // green — success
  if (text.startsWith('[!]')) return '#f87171';   // red — critical
  if (text.startsWith('[*]')) return 'rgba(241,245,249,0.42)'; // dim — info
  if (text.startsWith('$'))   return GOLD;        // prompt
  if (text.startsWith('  ')) return 'rgba(241,245,249,0.55)'; // indented output
  return INK;
}

/* ─── Terminal component ─────────────────────────────────────────────────── */
function Terminal({ lines, delay = 0, title = 'terminal' }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(id);
  }, []);

  const fullText = lines.join('\n');

  return (
    <div ref={ref} style={{
      background: '#0A0908',
      border: '1px solid rgba(241,245,249,0.1)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12.5,
      lineHeight: 1.7,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(241,245,249,0.07)',
        background: 'rgba(241,245,249,0.03)',
      }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {['#f87171','#fbbf24','#4ade80'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }}/>
          ))}
          <span style={{ marginLeft: 8, color: 'rgba(241,245,249,0.3)', fontSize: 11 }}>{title}</span>
        </div>
        <CopyButton text={fullText}/>
      </div>

      {/* Lines */}
      <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.35, delay: delay + i * 0.08, ease: 'easeOut' }}
            style={{ color: lineColor(line), whiteSpace: 'pre' }}
          >
            {line}
          </motion.div>
        ))}
        {/* Blinking cursor on last line */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: delay + lines.length * 0.08 + 0.1 }}
          style={{ color: GOLD }}
        >
          {cursor ? '█' : ' '}
        </motion.span>
      </div>
    </div>
  );
}

/* ─── Install box ─────────────────────────────────────────────────────────── */
function InstallBox({ cmd, pypiUrl, githubUrl }) {
  return (
    <div style={{
      background: '#0A0908',
      border: '1px solid rgba(241,245,249,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
      padding: '14px 20px',
    }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: INK }}>
        <span style={{ color: GOLD }}>$ </span>{cmd}
      </span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <CopyButton text={cmd}/>
        {pypiUrl && (
          <a href={pypiUrl} target="_blank" rel="noopener noreferrer"
            data-cursor="link"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(241,245,249,0.45)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color 140ms' }}
            onMouseEnter={e => e.currentTarget.style.color = GOLD}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(241,245,249,0.45)'}
          >
            PyPI <ArrowUpRight size={11}/>
          </a>
        )}
        {githubUrl && (
          <a href={githubUrl} target="_blank" rel="noopener noreferrer"
            data-cursor="link"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(241,245,249,0.45)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color 140ms' }}
            onMouseEnter={e => e.currentTarget.style.color = INK}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(241,245,249,0.45)'}
          >
            GitHub <ArrowUpRight size={11}/>
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Module pills ─────────────────────────────────────────────────────────── */
function ModulePill({ label }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
      color: 'rgba(241,245,249,0.65)',
      border: '1px solid rgba(241,245,249,0.14)',
      padding: '5px 12px',
      letterSpacing: '0.05em',
    }}>{label}</span>
  );
}

/* ─── Tool section ─────────────────────────────────────────────────────────── */
function ToolSection({ tool, flip = false, idx }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} style={{
      padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)',
      borderTop: '1px solid rgba(241,245,249,0.06)',
      background: idx % 2 === 0 ? BG : '#0D1A2E',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Layer badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.05, ease: E }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.28em',
            color: 'rgba(241,245,249,0.28)',
            marginBottom: 14,
          }}
        >{tool.layer}</motion.div>

        {/* Two-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))',
          gap: 'clamp(40px,6vw,80px)',
          alignItems: 'start',
        }}>

          {/* Copy side */}
          <div style={{ order: flip ? 2 : 1 }}>
            {/* Tool name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1, ease: E }}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(32px,4vw,48px)',
                fontWeight: 700,
                color: INK,
                marginBottom: 12,
                letterSpacing: '-0.02em',
              }}
            >{tool.name}</motion.div>

            {/* One-liner */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.16, ease: E }}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 'clamp(17px,1.8vw,21px)',
                fontWeight: 600,
                color: INK,
                lineHeight: 1.35,
                marginBottom: 20,
                letterSpacing: '-0.01em',
              }}
            >{tool.oneLiner}</motion.p>

            {/* Paragraphs */}
            {tool.body.map((para, i) => (
              <motion.p key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.22 + i * 0.06, ease: E }}
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 'clamp(14px,1.3vw,15.5px)',
                  color: 'rgba(241,245,249,0.52)',
                  lineHeight: 1.72,
                  marginBottom: 16,
                }}
              >{para}</motion.p>
            ))}

            {/* Modules */}
            {tool.modules && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.32, ease: E }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}
              >
                {tool.modules.map(m => <ModulePill key={m} label={m}/>)}
              </motion.div>
            )}

            {/* Install */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.38, ease: E }}
            >
              <InstallBox cmd={tool.cmd} pypiUrl={tool.pypi} githubUrl={tool.github}/>
            </motion.div>
          </div>

          {/* Terminal side */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.18, ease: E }}
            style={{ order: flip ? 1 : 2 }}
          >
            <Terminal lines={tool.terminal} delay={0.25} title={tool.name}/>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

/* ─── Tool data ─────────────────────────────────────────────────────────────── */
const TOOLS = [
  {
    layer: 'LAYER 01 — ATTACKS THE TOOLS',
    name: 'mcp-sploit',
    oneLiner: 'Metasploit-style exploitation framework for MCP servers.',
    body: [
      'MCP (Model Context Protocol) servers expose tools to AI agents — file writes, shell commands, API calls. mcp-sploit scans them the way Metasploit scans network services: enumerate everything, probe each tool for dangerous capabilities, and test whether prompt injection can bypass the guardrails.',
      'Five modules cover the full attack surface: enum discovers exposed tools, exfil tests data extraction, rce probes for command execution, prompt-injection tries to hijack the agent, and policy-probe tests whether safety boundaries hold under adversarial input.',
    ],
    modules: ['enum', 'exfil', 'rce', 'prompt-injection', 'policy-probe'],
    cmd: 'pip install mcp-sploit',
    pypi: 'https://pypi.org/project/mcp-sploit/',
    github: 'https://github.com/Prasanna-27eng/mcp-sploit',
    terminal: [
      '$ mcp-sploit enum --target localhost:3000',
      '[*] Scanning MCP server...',
      '[*] Probing tool endpoints...',
      '[+] Found 7 exposed tools',
      '[+] Tool: file_read        — READ ACCESS',
      '[+] Tool: file_write       — DANGEROUS',
      '[+] Tool: execute_command  — CRITICAL',
      '[+] Tool: web_fetch        — MODERATE',
      '[+] Tool: list_directory   — INFORMATIONAL',
      '[!] Policy bypass: prompt injection possible on execute_command',
      '[!] Recommend: immediate tool scoping + input validation',
    ],
  },
  {
    layer: 'LAYER 02 — ATTACKS THE BRAIN',
    name: 'prompt-fuzz',
    oneLiner: '51 curated adversarial payloads across 10 attack categories.',
    body: [
      'prompt-fuzz is an async fuzzer for AI guardrails. It fires 51 carefully curated payloads at a model endpoint — spanning jailbreaks, role-play injection, adversarial prefix attacks, and extraction attempts — then reports exactly which ones got through.',
      'The async engine fires all payloads concurrently and aggregates bypass rates per category. Red teams use it to benchmark guardrail coverage before deployment. Blue teams use it to identify which payload classes their model is blind to.',
    ],
    modules: ['injection', 'jailbreak', 'role-play', 'adversarial', 'extraction', 'prefix-attack', 'token-smuggling', 'instruction-ignore', 'system-override', 'context-hijack'],
    cmd: 'pip install prompt-fuzz-cli',
    pypi: 'https://pypi.org/project/prompt-fuzz-cli/',
    github: 'https://github.com/Prasanna-27eng/prompt-fuzz',
    terminal: [
      '$ prompt-fuzz run --target https://api.example.com/v1/chat',
      '[*] Loading 51 payloads across 10 categories...',
      '[*] Running async fuzzer (concurrency: 12)...',
      '[+] injection       → 3/7 bypassed  (42.8%)',
      '[+] jailbreak       → 2/6 bypassed  (33.3%)',
      '[!] role-play       → 5/5 bypassed  (100%)',
      '[+] adversarial     → 1/4 bypassed  (25.0%)',
      '[!] prefix-attack   → 4/5 bypassed  (80.0%)',
      '[+] extraction      → 0/6 bypassed  (0.0%)',
      '[*] Overall bypass rate: 15/51 (29.4%)',
      '[!] HIGH RISK: role-play and prefix-attack categories need patching',
    ],
  },
  {
    layer: 'LAYER 03 — ATTACKS THE IDENTITY LAYER',
    name: 'nhi-hunter',
    oneLiner: 'AWS IAM privilege-escalation pathfinder — finds the chains to Admin.',
    body: [
      'Non-human identities — service accounts, API keys, IAM roles — are the attack surface nobody audits. nhi-hunter builds the full IAM graph for an AWS environment, then runs path analysis to find every role chain that ends at an administrative privilege.',
      'It outputs the exact escalation path as a JSON structure, so red teams know which service account to compromise first and blue teams know which trust relationships to cut. The same path data feeds directly into AegisTrace\'s NHI Lifecycle Health Dashboard.',
    ],
    modules: ['graph-build', 'path-analysis', 'role-chains', 'trust-map', 'admin-paths'],
    cmd: 'pip install nhi-hunter',
    pypi: 'https://pypi.org/project/nhi-hunter/',
    github: 'https://github.com/Prasanna-27eng/nhi-hunter',
    terminal: [
      '$ nhi-hunter scan --profile prod --region eu-west-1',
      '[*] Enumerating IAM entities...',
      '[*] Building privilege graph (312 nodes, 847 edges)...',
      '[+] Found 4 privilege escalation paths to Admin',
      '[!] CRITICAL PATH FOUND:',
      '  svc-deployment-agent',
      '  → sts:AssumeRole → cicd-execution-role',
      '  → iam:PassRole  → lambda-admin-role',
      '  → iam:*         → AdministratorAccess',
      '[!] Path length: 3 hops | Exploitability: HIGH',
      '[*] Full report → nhi-report-2026-06-20.json',
    ],
  },
  {
    layer: 'LAYER 04 — WATCHES THE DATA',
    name: 'shadow-sniffer',
    oneLiner: 'Offline shadow-AI detector scanning 39 AI service domains.',
    body: [
      'Shadow AI is any AI service being used without security team approval. shadow-sniffer parses connection logs offline — no data leaves the network — and cross-references every domain against a curated catalog of 39 AI API endpoints.',
      'It accepts your approved-service allowlist and flags every hit that isn\'t on it. Three or more unapproved AI service hits in 24 hours auto-escalates in AegisTrace\'s Shadow AI Detection Dashboard. The same detection logic that powers the platform is available as a standalone CLI for any environment.',
    ],
    modules: ['log-parse', 'domain-match', 'allowlist-diff', 'risk-score', 'timeline-export'],
    cmd: 'pip install shadow-sniffer',
    pypi: 'https://pypi.org/project/shadow-sniffer/',
    github: 'https://github.com/Prasanna-27eng/shadow-sniffer',
    terminal: [
      '$ shadow-sniffer scan --log proxy.log --allowlist approved.txt',
      '[*] Loading 39-domain AI service catalog...',
      '[*] Parsing 142,847 connection records...',
      '[+] Scanning against allowlist (8 approved services)...',
      '[!] UNAPPROVED: api.openai.com        — 847 hits (last: 14:32)',
      '[!] UNAPPROVED: api.anthropic.com     — 124 hits (last: 14:28)',
      '[!] UNAPPROVED: generativelanguage.googleapis.com — 67 hits',
      '[+] APPROVED:   groq.com             — 2,341 hits',
      '[+] APPROVED:   api.nvidia.com       — 891 hits',
      '[*] Risk score: CRITICAL (3 unapproved services > threshold)',
      '[!] Escalation triggered → AegisTrace Shadow AI Dashboard',
    ],
  },
];

/* ─── Purple team section ───────────────────────────────────────────────────── */
function PurpleTeamSection() {
  return (
    <section style={{
      padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)',
      background: '#0D1A2E',
      borderTop: '1px solid rgba(241,245,249,0.06)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.28em', color: 'rgba(241,245,249,0.28)', marginBottom: 14 }}>
            PURPLE TEAM
          </div>
          <h2 className="cd" style={{
            fontSize: 'clamp(28px,4vw,52px)', fontWeight: 700,
            color: INK, margin: '0 0 16px',
            letterSpacing: '-0.03em', lineHeight: 1.0,
          }}>
            These tools attack what AegisTrace defends.
          </h2>
          <p className="cg" style={{
            fontSize: 'clamp(15px,1.4vw,17px)',
            color: 'rgba(241,245,249,0.5)',
            lineHeight: 1.7, maxWidth: 600, margin: '0 0 56px',
          }}>
            The offensive toolkit and the defensive platform are designed to test each other. That's what purple team means — the same person built both sides of the engagement.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: 2,
          }}>
            {/* Offensive side */}
            <div style={{
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.14)',
              padding: '32px 28px',
            }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: '#f87171', marginBottom: 20, opacity: 0.8 }}>OFFENSIVE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { name: 'mcp-sploit',     target: 'MCP server tool surfaces' },
                  { name: 'prompt-fuzz',    target: 'AI model guardrails' },
                  { name: 'nhi-hunter',     target: 'IAM privilege paths' },
                  { name: 'shadow-sniffer', target: 'Shadow AI endpoints' },
                ].map(t => (
                  <div key={t.name} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: INK, minWidth: 130 }}>{t.name}</span>
                    <span className="cg" style={{ fontSize: 13, color: 'rgba(241,245,249,0.38)' }}>→ {t.target}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '32px 12px',
              background: 'rgba(245,158,11,0.03)',
              border: '1px solid rgba(245,158,11,0.1)',
              minHeight: 140,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 18, color: GOLD, letterSpacing: '0.1em' }}>⟷</div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.24em', color: 'rgba(245,158,11,0.6)', marginTop: 8 }}>PURPLE TEAM</div>
              </div>
            </div>

            {/* Defensive side */}
            <div style={{
              background: 'rgba(245,158,11,0.03)',
              border: '1px solid rgba(245,158,11,0.14)',
              padding: '32px 28px',
            }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: GOLD, marginBottom: 20, opacity: 0.8 }}>DEFENSIVE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { name: 'AegisTrace',     cap: 'AI Defense Console + Agent Security' },
                  { name: 'Shadow AI',      cap: 'Detection Dashboard — 14+ AI API domains' },
                  { name: 'NHI Dashboard',  cap: 'Sprawl scores + trust-decay tracking' },
                  { name: 'mcp-aegis',      cap: 'The defensive MCP gateway these tools are tested against' },
                ].map(t => (
                  <div key={t.name} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: GOLD, minWidth: 130 }}>{t.name}</span>
                    <span className="cg" style={{ fontSize: 13, color: 'rgba(241,245,249,0.38)' }}>{t.cap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div style={{
            marginTop: 28,
            padding: '20px 28px',
            background: 'rgba(245,158,11,0.04)',
            border: '1px solid rgba(245,158,11,0.12)',
            display: 'flex', gap: 16, alignItems: 'flex-start',
          }}>
            <span className="mono" style={{ color: GOLD, fontSize: 12, flexShrink: 0, marginTop: 2 }}>[NOTE]</span>
            <p className="cg" style={{ fontSize: 14, color: 'rgba(241,245,249,0.5)', lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: INK, fontWeight: 600 }}>mcp-aegis</strong> — the defensive MCP gateway these tools are tested against — is the final piece. Every vulnerability mcp-sploit finds, mcp-aegis is hardened against. Purple team in a box.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Install all section ───────────────────────────────────────────────────── */
const ALL_INSTALLS = `pip install mcp-sploit
pip install prompt-fuzz-cli
pip install nhi-hunter
pip install shadow-sniffer`;

function InstallAllSection() {
  return (
    <section style={{
      padding: 'clamp(72px,10vw,120px) clamp(24px,5vw,72px)',
      borderTop: '1px solid rgba(241,245,249,0.06)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.28em', color: 'rgba(241,245,249,0.28)', marginBottom: 14 }}>
            INSTALL ALL FOUR
          </div>
          <h2 className="cd" style={{
            fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700,
            color: INK, margin: '0 0 12px',
            letterSpacing: '-0.03em',
          }}>The full offensive stack.</h2>
          <p className="cg" style={{
            fontSize: 15, color: 'rgba(241,245,249,0.46)',
            lineHeight: 1.65, marginBottom: 32, maxWidth: 520,
          }}>
            Four tools, one pip command each. No dependency conflicts — each tool is self-contained.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{
            background: '#0A0908',
            border: '1px solid rgba(241,245,249,0.1)',
            overflow: 'hidden',
          }}>
            {/* Terminal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(241,245,249,0.07)',
              background: 'rgba(241,245,249,0.03)',
            }}>
              <div style={{ display: 'flex', gap: 7 }}>
                {['#f87171','#fbbf24','#4ade80'].map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }}/>
                ))}
                <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono', monospace", color: 'rgba(241,245,249,0.3)', fontSize: 11 }}>install-all.sh</span>
              </div>
              <CopyAllButton text={ALL_INSTALLS}/>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {ALL_INSTALLS.split('\n').map((line, i) => (
                <div key={i} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                  color: INK, lineHeight: 2,
                }}>
                  <span style={{ color: GOLD, userSelect: 'none' }}>$ </span>{line}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.18} style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Python 3.9+', note: 'required' },
              { label: 'No dependencies shared', note: 'safe to install together' },
              { label: 'MIT license', note: 'all four tools' },
              { label: 'PyPI verified', note: 'published packages' },
            ].map(tag => (
              <span key={tag.label} style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: 'rgba(241,245,249,0.45)',
                border: '1px solid rgba(241,245,249,0.1)',
                padding: '5px 12px',
              }}>
                {tag.label} — <span style={{ color: 'rgba(241,245,249,0.28)' }}>{tag.note}</span>
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════════════ */
export default function Tools() {
  useSmoothScroll();

  return (
    <div style={{ background: BG, color: INK, overflowX: 'clip', position: 'relative', isolation: 'isolate' }}>
      <ScrollProgressBar/>

      <style>{`
        .cd   { font-family: 'Plus Jakarta Sans', sans-serif; }
        .cg   { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .gold-btn {
          display: inline-flex; align-items: center; gap: 9px;
          background: ${GOLD}; color: #000; font-weight: 700;
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px;
          padding: 13px 26px; border: none; cursor: pointer;
          text-decoration: none; letter-spacing: 0.03em;
          transition: background 140ms, transform 90ms, box-shadow 140ms;
        }
        .gold-btn:hover  { background: #FBBF24; box-shadow: 0 0 24px rgba(245,158,11,0.35); transform: translateY(-2px); }
        .gold-btn:active { transform: scale(0.97); }

        .ghost-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(241,245,249,0.75);
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
          padding: 12px 24px; border: 1px solid rgba(241,245,249,0.18);
          cursor: pointer; text-decoration: none; letter-spacing: 0.03em;
          transition: border-color 140ms, color 140ms, transform 90ms;
        }
        .ghost-btn:hover  { border-color: rgba(241,245,249,0.42); color: #F1F5F9; transform: translateY(-2px); }
        .ghost-btn:active { transform: scale(0.97); }

        .nav-link {
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(241,245,249,0.6); text-decoration: none; position: relative;
          transition: color 140ms;
        }
        .nav-link:hover { color: #F1F5F9; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -4px;
          height: 1px; background: #F59E0B;
          transition: right 260ms cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover::after { right: 0; }

        ::selection { background: rgba(245,158,11,0.35); color: #F1F5F9; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,48px)', height: 64,
        background: 'rgba(10,22,40,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(241,245,249,0.06)',
      }}>
        <Link to="/" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: INK, textDecoration: 'none', fontSize: 16, fontWeight: 700, letterSpacing: '0.08em' }}>AEGISTRACE</Link>
        <div style={{ display: 'flex', gap: 'clamp(16px,3vw,32px)', alignItems: 'center' }}>
          <Link to="/mission"   className="nav-link">Mission</Link>
          <Link to="/features"  className="nav-link">Features</Link>
          <Link to="/platform"  className="nav-link">Platform</Link>
          <Link to="/app/login" className="gold-btn" style={{ padding: '8px 18px', fontSize: 12 }}>Book a Demo <ArrowRight size={12}/></Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        padding: 'clamp(140px,18vh,200px) clamp(24px,5vw,72px) clamp(80px,10vh,120px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle grid bg */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(241,245,249,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(241,245,249,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
        }}/>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: E }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.3em',
              color: GOLD, marginBottom: 20,
            }}
          >
            OFFENSIVE SECURITY TOOLKIT
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: E }}
            className="cd"
            style={{
              fontSize: 'clamp(44px,7vw,72px)', fontWeight: 700,
              letterSpacing: '-0.03em', lineHeight: 0.95,
              color: INK, margin: '0 0 24px', maxWidth: 800,
            }}
          >
            Four tools.<br/>Four attack layers.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28, ease: E }}
            className="cg"
            style={{
              fontSize: 'clamp(16px,1.6vw,19px)',
              color: 'rgba(241,245,249,0.52)',
              lineHeight: 1.65, maxWidth: 540, margin: '0 0 40px',
            }}
          >
            Each tool attacks a different surface of the AI security stack. Each finding feeds back into AegisTrace.
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.38, ease: E }}
            style={{ display: 'flex', gap: 'clamp(24px,4vw,48px)', flexWrap: 'wrap' }}
          >
            {[
              { val: '4', label: 'tools on PyPI' },
              { val: '51', label: 'fuzz payloads' },
              { val: '39', label: 'AI domains tracked' },
              { val: '5', label: 'MCP attack modules' },
            ].map(s => (
              <div key={s.label}>
                <div className="mono" style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: GOLD, lineHeight: 1 }}>{s.val}</div>
                <div className="cg" style={{ fontSize: 12, color: 'rgba(241,245,249,0.38)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TOOL SECTIONS ── */}
      {TOOLS.map((tool, i) => (
        <ToolSection key={tool.name} tool={tool} flip={i % 2 === 1} idx={i}/>
      ))}

      {/* ── PURPLE TEAM ── */}
      <PurpleTeamSection/>

      {/* ── INSTALL ALL ── */}
      <InstallAllSection/>

      {/* ── CTA ── */}
      <section style={{
        padding: 'clamp(96px,12vw,160px) clamp(24px,5vw,72px)',
        borderTop: '1px solid rgba(241,245,249,0.06)',
        background: '#0D1A2E',
        position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        <div aria-hidden style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>
        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
          <Reveal>
            <h2 className="cd" style={{
              fontSize: 'clamp(32px,5vw,56px)', fontWeight: 700,
              color: INK, letterSpacing: '-0.03em', lineHeight: 0.96,
              margin: '0 0 20px',
            }}>
              Built the offense.<br/>Built the defense.<br/>
              <span style={{ color: GOLD }}>Access the platform.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="cg" style={{
              fontSize: 15, color: 'rgba(241,245,249,0.44)',
              lineHeight: 1.7, maxWidth: 460, margin: '0 auto 40px',
            }}>
              AegisTrace is where these tools report their findings. One platform defending every layer these tools attack.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/app/login" className="gold-btn" style={{ fontSize: 14, padding: '15px 34px' }}>
                Book a Demo <ArrowRight size={16}/>
              </Link>
              <Link to="/mission" className="ghost-btn" style={{ fontSize: 14, padding: '14px 26px' }}>
                Our Mission
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(241,245,249,0.06)', padding: '32px clamp(24px,5vw,72px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", color: 'rgba(241,245,249,0.22)', fontSize: 12, letterSpacing: '0.08em' }}>AEGISTRACE</span>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['/', 'Home'], ['/mission', 'Mission'], ['/features', 'Features'], ['/platform', 'Platform']].map(([to, label]) => (
              <Link key={to} to={to} style={{ fontFamily: "'IBM Plex Sans',sans-serif", color: 'rgba(241,245,249,0.26)', fontSize: 12, textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
          <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", color: 'rgba(241,245,249,0.15)', fontSize: 11 }}>© 2026 Prasanna Kumar</span>
        </div>
      </footer>
    </div>
  );
}
