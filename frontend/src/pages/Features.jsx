import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';

const GOLD  = '#F59E0B';
const DARK  = '#050505';
const DARK2 = '#0A0A18';
const LIGHT = '#0E0E16';
const INK   = '#BDD4E8';
const E     = [0.16, 1, 0.3, 1];

/* ─── Reveal ─────────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 24, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ─── Quick-jump nav ─────────────────────────────────────────────────────── */
const JUMP_LINKS = [
  { label: 'Core Modules', href: '#modules' },
  { label: 'ITDR', href: '#itdr' },
  { label: 'Attack Graph', href: '#attack-graph' },
  { label: 'SOAR', href: '#soar' },
  { label: 'Endpoint', href: '#endpoint' },
  { label: 'AI Defense', href: '#ai-defense' },
  { label: 'Threat Hunt', href: '#threat-hunt' },
  { label: 'Hardware', href: '#hardware' },
  { label: 'Toolkit', href: '#toolkit' },
  { label: 'Enterprise', href: '#enterprise' },
];

function QuickNav({ active }) {
  return (
    <div style={{
      position: 'sticky', top: 52, zIndex: 100,
      background: 'rgba(5,5,5,0.96)', backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(74,126,200,0.08)',
      overflowX: 'auto', scrollbarWidth: 'none',
    }}>
      <div style={{ display: 'flex', gap: 4, padding: '0 clamp(24px,5vw,72px)', height: 44, alignItems: 'center', width: 'max-content', minWidth: '100%' }}>
        {JUMP_LINKS.map(({ label, href }) => (
          <a key={href} href={href} style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 12, fontWeight: 500,
            color: active === href ? '#000' : 'rgba(189,212,232,0.5)',
            background: active === href ? '#4A7EC8' : 'transparent',
            padding: '4px 12px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'all 140ms',
            borderRadius: 2,
          }}>{label}</a>
        ))}
      </div>
    </div>
  );
}

/* ─── Module Section wrapper ─────────────────────────────────────────────── */
function ModuleSection({ id, num, name, tagline, dark = false, children }) {
  const bg = dark ? DARK2 : LIGHT;
  const headingColor = dark ? INK : '#BDD4E8';
  const numColor = GOLD;
  const taglineColor = dark ? 'rgba(189,212,232,0.5)' : '#7A9DB8';

  return (
    <section id={id} style={{ background: bg, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)', borderTop: dark ? '1px solid rgba(74,126,200,0.08)' : '1px solid rgba(74,126,200,0.06)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: numColor, letterSpacing: '0.18em', marginBottom: 10 }}>MODULE {num}</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: headingColor, margin: '0 0 10px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{name}</h2>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 16, color: taglineColor, margin: 0, fontStyle: 'italic' }}>{tagline}</p>
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/* ─── Feature pill ───────────────────────────────────────────────────────── */
function Pill({ label, dark = false }) {
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11,
      color: '#8BB8E8',
      background: dark ? 'rgba(74,126,200,0.12)' : 'rgba(74,126,200,0.08)',
      border: dark ? '1px solid rgba(74,126,200,0.2)' : '1px solid rgba(74,126,200,0.15)',
      padding: '4px 10px',
      display: 'inline-block',
      marginRight: 6, marginBottom: 6,
    }}>{label}</span>
  );
}

/* ─── Why It Matters callout ─────────────────────────────────────────────── */
function WhyMatters({ text, dark = false }) {
  return (
    <Reveal delay={0.12}>
      <div style={{
        background: 'rgba(74,126,200,0.06)',
        border: `1px solid rgba(74,126,200,0.15)`,
        borderLeft: `3px solid ${GOLD}`,
        padding: '16px 20px',
        marginTop: 28,
      }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: GOLD, letterSpacing: '0.18em', marginBottom: 6 }}>WHY IT MATTERS</div>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: 'rgba(189,212,232,0.7)', lineHeight: 1.68, margin: 0 }}>{text}</p>
      </div>
    </Reveal>
  );
}

/* ─── Body text ──────────────────────────────────────────────────────────── */
function Body({ children, dark = false }) {
  return (
    <Reveal delay={0.06}>
      <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 16, color: dark ? '#94A3B8' : '#7A9DB8', lineHeight: 1.72, marginBottom: 20, maxWidth: 760 }}>
        {children}
      </p>
    </Reveal>
  );
}

/* ─── Nav ────────────────────────────────────────────────────────────────── */
function Nav() {
  const { scrollY } = useScroll();
  const navBg     = useTransform(scrollY, [0, 80], ['rgba(5,5,5,0)', 'rgba(5,5,5,0.96)']);
  const navBlur   = useTransform(scrollY, [0, 80], [0, 18]);
  const navFilter = useTransform(navBlur, v => `blur(${v}px)`);

  return (
    <motion.nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(20px,4vw,48px)', height: 52,
      background: navBg, backdropFilter: navFilter, WebkitBackdropFilter: navFilter,
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/assets/brand/aegistrace-icon.png" alt="AegisTrace"
          style={{ width: 26, height: 26, objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(74,126,200,0.5))' }}/>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600,
          color: '#BDD4E8', letterSpacing: '0.18em' }}>AEGISTRACE</span>
      </Link>
      <div style={{ display: 'flex', gap: 'clamp(16px,2.5vw,32px)', alignItems: 'center' }}>
        {[
          { label: 'Mission',  to: '/mission'  },
          { label: 'Platform', to: '/platform' },
          { label: 'Tools',    to: '/tools'    },
        ].map(({ label, to }) => (
          <Link key={to} to={to} style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 500, color: 'rgba(189,212,232,0.58)', textDecoration: 'none', transition: 'color 140ms' }}
            onMouseEnter={e => e.currentTarget.style.color = INK}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(189,212,232,0.58)'}
          >{label}</Link>
        ))}
        <Link to="/app/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#4A7EC8', color: '#fff', fontWeight: 700,
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12,
          padding: '8px 18px', textDecoration: 'none', borderRadius: 4,
          transition: 'background 140ms',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#3A6AB8'}
          onMouseLeave={e => e.currentTarget.style.background = '#4A7EC8'}
        >Book a Demo <ArrowRight size={11}/></Link>
      </div>
    </motion.nav>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function Features() {
  return (
    <div style={{ background: DARK, color: INK, overflowX: 'clip' }}>
      <Nav />

      <style>{`
        * { box-sizing: border-box; }
        a { transition: color 140ms; }
        ::selection { background: rgba(74,126,200,0.3); color: #BDD4E8; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section style={{ background: 'linear-gradient(135deg, #050505, #0F1428)', padding: 'clamp(100px,12vw,140px) clamp(24px,5vw,72px)', paddingTop: 'calc(clamp(100px,12vw,140px) + 52px)' }}>
        <div style={{ maxWidth: 800 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: E }}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#8BB8E8', letterSpacing: '0.2em', marginBottom: 16 }}>PLATFORM CAPABILITIES</div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(40px,5vw,68px)', fontWeight: 800, color: INK, margin: '0 0 20px', lineHeight: 1.05 }}>
              Every Module.<br/>Every Detail.
            </h1>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 17, color: '#7A9DB8', lineHeight: 1.7, maxWidth: 600, margin: 0 }}>
              A complete technical breakdown of the 12 core modules, the Grassroots Security Toolkit, and the enterprise capabilities that make AegisTrace production-ready for regulated industries.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Quick-jump nav ── */}
      <QuickNav />

      {/* ══════════════════════════════════════════════
          MODULE 01: Case Management
      ══════════════════════════════════════════════ */}
      <ModuleSection id="modules" num="01" name="Case Management" tagline="The investigation workspace your analysts will actually want to use." dark={false}>
        <Body>
          A 15-tab investigation workspace built around the full incident lifecycle. Every case opens with autosave enabled, SLA tracking active, and a completeness score that tells you exactly what's missing before you close.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#BDD4E8', marginBottom: 10 }}>SLA Tiers</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2 }}>
              {[['Critical', '4h', '#EF4444'], ['High', '8h', '#F97316'], ['Medium', '48h', '#EAB308'], ['Low', '168h', '#22C55E']].map(([tier, time, col]) => (
                <div key={tier} style={{ background: '#1C1C24', border: '1px solid rgba(74,126,200,0.12)', padding: '12px 16px', borderLeft: `3px solid ${col}` }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: col, marginBottom: 4 }}>{tier}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#BDD4E8' }}>{time}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#BDD4E8', marginBottom: 10 }}>15 Workspace Tabs</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#7A9DB8', background: '#141420', border: '1px solid rgba(74,126,200,0.12)', padding: '12px 16px', lineHeight: 1.9 }}>
              Overview · Investigation · IOCs · Terminal · Timeline · Trust Timeline · Playbook · AI Analysis · AI Chat · Vision · Rules · Comments · Provenance · Report · EDR
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 4 }}>
            {['6 case templates', 'Report completeness preview', 'DORA Article 19 export', 'Autosave every 30s', 'Multi-org scoping'].map(f => <Pill key={f} label={f}/>)}
          </div>
        </Reveal>
        <WhyMatters text="Most SIEMs give you a list of alerts. AegisTrace gives you a workspace that guides an analyst from first alert to closed case without switching tabs or tools." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 02: Identity Graph
      ══════════════════════════════════════════════ */}
      <ModuleSection id="itdr" num="02" name="Identity Graph" tagline="Every identity. Every relationship. Every trust signal." dark={true}>
        <Body dark>
          A force-directed canvas that maps every identity and trust relationship in your environment. Seven node types cover the full modern identity surface — including AI agents and prompts that traditional IAM tools ignore entirely.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, marginBottom: 20 }}>
            {['User', 'Service Account', 'API Key', 'Token', 'Device', 'AI Agent', 'Prompt'].map((node, i) => (
              <div key={node} style={{ background: 'rgba(74,126,200,0.04)', border: '1px solid rgba(74,126,200,0.1)', padding: '14px 16px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: GOLD, letterSpacing: '0.16em', marginBottom: 6 }}>NODE {String(i+1).padStart(2,'0')}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600, color: INK }}>{node}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['Pluggable risk detectors', 'Credential sprawl tracking', 'Orphan identity detection', 'Real-time risk scoring', 'Trust relationship edges'].map(f => <Pill key={f} label={f} dark/>)}
          </div>
        </Reveal>
        <WhyMatters dark text="144 machine identities per human employee is the modern enterprise average. You cannot defend what you cannot see. The Identity Graph makes every relationship visible and scoreable." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 03: ITDR Engine
      ══════════════════════════════════════════════ */}
      <ModuleSection id="attack-graph" num="03" name="ITDR Engine" tagline="Six real-time detectors. Multi-window analytics. Zero tolerance for blind spots." dark={false}>
        <Body>
          Identity Threat Detection & Response with six dedicated detectors running in parallel. Each detector operates on its own time window with independent thresholds, and all feed into the shared risk engine that scores every identity in real time.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, marginBottom: 20 }}>
            {[
              { name: 'Impossible Travel', what: 'Logins from geographically impossible locations within a time window', window: '30 min' },
              { name: 'Credential Stuffing', what: 'High-velocity failed login attempts across multiple accounts', window: '5 min' },
              { name: 'Privilege Escalation', what: 'Sudden permission spikes outside established baseline', window: '15 min' },
              { name: 'Token Theft', what: 'Session tokens reused from anomalous client signatures', window: '60 min' },
              { name: 'Off-Hours Access', what: 'Authentication outside established user behavioral windows', window: '24h profile' },
              { name: 'Lateral Movement', what: 'Cross-system access chains inconsistent with role profile', window: '2h' },
            ].map(({ name, what, window: w }) => (
              <div key={name} style={{ background: '#141420', border: '1px solid rgba(74,126,200,0.12)', padding: '16px 20px', borderLeft: `3px solid ${GOLD}` }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: GOLD, letterSpacing: '0.15em', marginBottom: 6 }}>WINDOW: {w}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: '#BDD4E8', marginBottom: 6 }}>{name}</div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: '#7A9DB8', lineHeight: 1.6 }}>{what}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <WhyMatters text="Alert fatigue kills SOC effectiveness. The ITDR engine fires only when multi-window analytics confirm anomaly — reducing false positives by correlating behavioral history before raising an alert." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 04: Attack Graph
      ══════════════════════════════════════════════ */}
      <ModuleSection id="soar" num="04" name="Attack Graph" tagline="From correlated events to readable narratives in seconds." dark={true}>
        <Body dark>
          Temporal correlation across 6 event sources, clustering related events within a ±5-second window into discrete attack steps. The AI layer maps each step to a MITRE ATT&CK technique and generates a human-readable narrative chain.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}>
            {['Auth logs', 'Endpoint telemetry', 'Network flows', 'DNS queries', 'Email headers', 'SOAR actions'].map(s => <Pill key={s} label={s} dark/>)}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, marginBottom: 4 }}>
            {[['±5s', 'Temporal correlation window'], ['6', 'Correlated event sources'], ['MITRE', 'ATT&CK technique mapping'], ['AI', 'Narrative chain generation']].map(([val, label]) => (
              <div key={label} style={{ background: 'rgba(74,126,200,0.04)', border: '1px solid rgba(74,126,200,0.08)', padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 700, color: GOLD, marginBottom: 6 }}>{val}</div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: 'rgba(189,212,232,0.45)' }}>{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <WhyMatters dark text="The difference between a SIEM and AegisTrace: a SIEM gives you 400 events. The Attack Graph gives you a 6-step narrative of exactly how the attacker moved — and which MITRE techniques they used." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 05: SOAR Playbooks
      ══════════════════════════════════════════════ */}
      <ModuleSection id="endpoint" num="05" name="SOAR Playbooks" tagline="Visual builder. Automated execution. Approval gates." dark={false}>
        <Body>
          A drag-and-drop playbook builder with 7 built-in action types, approval gates that pause execution for human confirmation, and a full run history with per-step logs. Ships with seed playbooks for the most common incident patterns.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}>
            {['Block IP', 'Isolate Endpoint', 'Revoke Token', 'Send Alert', 'Close Case', 'Enrich IOC', 'Run Script'].map(a => <Pill key={a} label={a}/>)}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['Approval gates', 'Dry-run mode', 'Full run history', 'Seed playbooks', 'Step-level logs', 'Human-in-the-loop controls'].map(f => <Pill key={f} label={f}/>)}
          </div>
        </Reveal>
        <WhyMatters text="Automation without accountability is liability. Every SOAR action in AegisTrace passes through a human approval gate. The Provenance Ledger records who approved what, and every action is fully reversible." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 06: Adaptive Agent
      ══════════════════════════════════════════════ */}
      <ModuleSection id="ai-defense" num="06" name="Adaptive Thresholds Agent" tagline="Detection that learns from its own performance." dark={true}>
        <Body dark>
          A background agent that reviews detector performance every 4 hours and adjusts alert thresholds based on false positive and false negative rates. Hardcoded bounds prevent runaway tuning. Every adjustment is logged with reasoning and is manually overridable.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, marginBottom: 20 }}>
            {[['4h', 'Review cycle'], ['±20%', 'Max adjustment bound'], ['Full', 'Audit trail'], ['Manual', 'Override always available']].map(([val, label]) => (
              <div key={label} style={{ background: 'rgba(74,126,200,0.04)', border: '1px solid rgba(74,126,200,0.08)', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: GOLD, marginBottom: 6 }}>{val}</div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: 'rgba(189,212,232,0.45)' }}>{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <WhyMatters dark text="Static thresholds age poorly. The Adaptive Agent keeps detection current without requiring manual tuning cycles — and the ±20% bound ensures it can't degrade security posture autonomously." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 07: Endpoint Agent v6.1
      ══════════════════════════════════════════════ */}
      <ModuleSection id="threat-hunt" num="07" name="Endpoint Agent v6.1" tagline="Production-grade EDR with ATSP-encrypted telemetry, honey tokens, and YARA-lite." dark={false}>
        <Body>
          A full endpoint detection agent with 9 layered capabilities. All telemetry is transmitted over ATSP — the AegisTrace Secure Protocol — with X25519 forward-secret handshake, ChaCha20-Poly1305 encryption, and 3-layer replay protection. A Guardian Process monitors agent health and auto-restarts if tampered. Multi-backend failover keeps collection running even when the primary ingest endpoint is unreachable.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, marginBottom: 20 }}>
            {[
              { name: 'ATSP Encrypted Transport', desc: 'X25519 forward-secret handshake + ChaCha20-Poly1305 AEAD. Security properties formally proved with ProVerif.' },
              { name: 'Honey Token Trap', desc: 'Decoy credentials that fire high-confidence alerts on first use' },
              { name: 'YARA-lite Engine', desc: '~40 signatures covering malware families, suspicious strings, packed executables' },
              { name: 'DNS/DGA Detection', desc: 'Domain generation algorithm detection via entropy analysis + volume thresholds' },
              { name: 'Auto-Block Engine', desc: 'Immediate IP and process blocking on confirmed high-confidence detections' },
              { name: 'Vulnerability Scanner', desc: 'OS patch level, open ports, misconfigured services — local assessment without network exposure' },
              { name: 'Persistence Monitor', desc: 'Registry keys, cron jobs, startup items, LaunchDaemons — live monitoring' },
              { name: 'Replay Protection', desc: '3-layer: ±30s timestamp + monotonic SeqNum + 1000-nonce cache — four independent barriers' },
              { name: 'Guardian Process', desc: 'Watchdog monitors agent health, auto-restarts on tamper or crash' },
            ].map(({ name, desc }) => (
              <div key={name} style={{ background: '#141420', border: '1px solid rgba(74,126,200,0.12)', padding: '16px 20px' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#BDD4E8', marginBottom: 6 }}>{name}</div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: '#7A9DB8', lineHeight: 1.58 }}>{desc}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <WhyMatters text="Most EDRs send telemetry over HTTPS with no forward secrecy. ATSP provides per-session ephemeral keys, meaning past sessions cannot be decrypted even if long-term keys are compromised. Every security property is formally proved — not just claimed." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 08: AI Defense Console
      ══════════════════════════════════════════════ */}
      <ModuleSection id="hardware" num="08" name="AI Defense Console" tagline="Live attack feed. Human-in-the-loop workflow." dark={true}>
        <Body dark>
          A real-time feed of AI-targeted attacks — prompt injections, jailbreaks, adversarial inputs, data exfiltration attempts. Request fingerprinting identifies attack patterns. Groq AI classifies each request in under 1 second. High-confidence requests are auto-handled; borderline cases queue for human review.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, marginBottom: 20 }}>
            {[['<1s', 'Groq AI triage latency'], ['≥92%', 'Auto-handle threshold'], ['≥70%', 'HITL queue threshold'], ['8', 'Honeypot endpoints'], ['15s', 'Auto-refresh interval']].map(([val, label]) => (
              <div key={label} style={{ background: 'rgba(74,126,200,0.04)', border: '1px solid rgba(74,126,200,0.08)', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{val}</div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: 'rgba(189,212,232,0.4)' }}>{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <WhyMatters dark text="AI systems are a new attack surface. The Defense Console is the only module in AegisTrace specifically designed for attacks targeting AI endpoints — prompt injection, model probing, and adversarial inputs." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 09: Threat Hunt
      ══════════════════════════════════════════════ */}
      <ModuleSection id="toolkit" num="09" name="Threat Hunt Console" tagline="Cross-case IOC correlation + SQL console over live telemetry." dark={false}>
        <Body>
          Proactive threat hunting with cross-case IOC correlation, a MITRE ATT&CK heatmap showing technique frequency across your case history, and a DuckDB SQL console that runs queries directly against live telemetry.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}>
            {['Cross-case IOC correlation', 'MITRE ATT&CK heatmap', 'DuckDB SQL console', 'Keyword blocklist', '10s query timeout', '1000-row result cap'].map(f => <Pill key={f} label={f}/>)}
          </div>
        </Reveal>
        <WhyMatters text="Incident response is reactive. Threat hunting is proactive. The SQL console lets analysts run arbitrary queries against live telemetry — finding patterns before they become incidents." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 10: Hardware Forensics
      ══════════════════════════════════════════════ */}
      <ModuleSection id="enterprise" num="10" name="Hardware Forensics" tagline="18 parsers for WiFi, RF, USB/HID, RFID/NFC, and network attack tools." dark={true}>
        <Body dark>
          A forensics module covering physical and RF attack tooling. 18 parsers cover the most common hardware attack categories — from Pineapple WiFi to Flipper Zero to USB Rubber Ducky logs.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, marginBottom: 20 }}>
            {[
              { cat: 'WiFi Attack Tools', items: ['WiFi Pineapple', 'Aircrack-ng', 'Kismet', 'Wireshark captures'] },
              { cat: 'RF & SDR Tools', items: ['Flipper Zero RF logs', 'HackRF captures', 'RTL-SDR data', 'GNU Radio outputs'] },
              { cat: 'USB / HID Attack', items: ['USB Rubber Ducky payloads', 'Bash Bunny scripts', 'O.MG Cable logs', 'KeySweeper captures'] },
              { cat: 'RFID / NFC', items: ['Proxmark3 logs', 'ACR122U captures', 'RFID cloning logs', 'NFC intercepts'] },
              { cat: 'Network Attack', items: ['LAN Turtle data'] },
            ].map(({ cat, items }) => (
              <div key={cat} style={{ background: 'rgba(74,126,200,0.04)', border: '1px solid rgba(74,126,200,0.1)', padding: '16px 20px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: GOLD, letterSpacing: '0.15em', marginBottom: 10 }}>{cat}</div>
                {items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: GOLD, fontSize: 8 }}>▸</span>
                    <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: 'rgba(189,212,232,0.5)' }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Reveal>
        <WhyMatters dark text="Physical security is an identity security problem. Hardware attack tools target credentials, session tokens, and RF-based authentication. The Hardware Forensics module brings those artifacts into the same investigation workspace." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 11: Terminal Lab
      ══════════════════════════════════════════════ */}
      <ModuleSection num="11" name="Terminal Lab" tagline="Full Linux-style analyst environment with AI-powered output parsing." dark={false}>
        <Body>
          A browser-based terminal with 20+ simulated security commands, named sessions that persist across investigations, and AI parsing that extracts IOCs from command output automatically. Push findings directly to an open case.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 4 }}>
            {['20+ commands', 'Named sessions', 'Save-to-case', 'AI IOC parsing', 'Push IOCs to case', 'Persistent history'].map(f => <Pill key={f} label={f}/>)}
          </div>
        </Reveal>
        <WhyMatters text="Analysts shouldn't have to switch between their investigation workspace and a separate terminal. The Terminal Lab keeps every command and its output inside the case record — fully searchable, fully reproducible." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          MODULE 12: 7-Source Enrichment
      ══════════════════════════════════════════════ */}
      <ModuleSection num="12" name="7-Source IOC Enrichment" tagline="Parallel queries. Cross-case correlation. Campaign detection." dark={true}>
        <Body dark>
          Parallel enrichment queries against 7 threat intelligence sources with automatic cross-case correlation. When the same IOC appears in 3 or more cases, a campaign tag is automatically applied and linked.
        </Body>
        <Reveal delay={0.08}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, marginBottom: 20 }}>
            {['VirusTotal', 'Shodan', 'MalwareBazaar', 'URLhaus', 'ThreatFox', 'GreyNoise', 'IPInfo'].map(src => (
              <div key={src} style={{ background: 'rgba(74,126,200,0.04)', border: '1px solid rgba(74,126,200,0.1)', padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: GOLD }}>{src}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['Parallel queries', 'Rate limiting', 'Cross-case correlation', 'Campaign detection', 'Auto-tagging'].map(f => <Pill key={f} label={f} dark/>)}
          </div>
        </Reveal>
        <WhyMatters dark text="Single-source enrichment misses context that only appears when you correlate across multiple feeds. 7-source parallel enrichment gives you confidence scores based on consensus, not individual verdicts." />
      </ModuleSection>

      {/* ══════════════════════════════════════════════
          GRASSROOTS TOOLKIT
      ══════════════════════════════════════════════ */}
      <section id="toolkit-section" style={{ background: LIGHT, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(74,126,200,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: GOLD, letterSpacing: '0.2em', marginBottom: 12 }}>OPEN SOURCE</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: '#BDD4E8', margin: '0 0 12px', lineHeight: 1.1 }}>The Grassroots Security Toolkit</h2>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 16, color: '#7A9DB8', marginBottom: 40, maxWidth: 640 }}>
              5 standalone PyPI packages built from the same codebase as AegisTrace. Free. Open source. Designed for analysts who need specific capabilities without the full platform.
            </p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {[
              { pkg: 'mcp-aegis', desc: 'MCP server exposing AegisTrace case management, IOC enrichment, and SOAR actions as AI-callable tools. Works with any MCP-compatible LLM client.', pills: ['MCP protocol', 'Case tools', 'IOC tools', 'SOAR tools'] },
              { pkg: 'mcp-sploit', desc: 'MCP server wrapping Metasploit RPC. Exposes module search, session management, and exploit execution as AI-callable tools for red team workflows.', pills: ['Metasploit RPC', 'Session management', 'Module search'] },
              { pkg: 'prompt-fuzz', desc: 'Adversarial prompt testing library. Runs 40+ jailbreak and injection payloads against any LLM endpoint and returns a structured vulnerability report.', pills: ['40+ payloads', 'Structured report', 'LLM-agnostic'] },
              { pkg: 'nhi-hunter', desc: 'Non-Human Identity scanner. Discovers service accounts, API keys, tokens, and AI agents across AWS, Azure, GCP, and Okta tenants.', pills: ['Multi-cloud', 'Okta', 'Risk scoring', 'CSV export'] },
              { pkg: 'shadow-sniffer', desc: 'Shadow AI detector. Identifies unauthorized LLM API calls in network traffic by matching against 14+ known AI API domains and patterns.', pills: ['14+ domains', 'PCAP input', 'Real-time mode', 'SIEM export'] },
            ].map(({ pkg, desc, pills }) => (
              <Reveal key={pkg} delay={0.04}>
                <div style={{ background: '#141420', border: '1px solid rgba(74,126,200,0.12)', padding: '24px', height: '100%', borderTop: `3px solid ${GOLD}` }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: '#BDD4E8', marginBottom: 10 }}>{pkg}</div>
                  <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: '#7A9DB8', lineHeight: 1.68, marginBottom: 14 }}>{desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {pills.map(p => <Pill key={p} label={p}/>)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ENTERPRISE CAPABILITIES
      ══════════════════════════════════════════════ */}
      <section id="enterprise-section" style={{ background: DARK2, padding: 'clamp(80px,10vw,120px) clamp(24px,5vw,72px)', borderTop: '1px solid rgba(74,126,200,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: GOLD, letterSpacing: '0.2em', marginBottom: 12 }}>ENTERPRISE</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: INK, margin: '0 0 40px', lineHeight: 1.1 }}>Enterprise Capabilities</h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2 }}>
            {[
              { title: 'ATSP Secure Protocol', body: 'AegisTrace Secure Protocol: X25519 ephemeral key exchange, ChaCha20-Poly1305 AEAD, 3-layer replay protection. Four security properties formally proved with ProVerif. Published spec — verify yourself.', pills: ['X25519 forward secrecy', 'ChaCha20-Poly1305', 'ProVerif verified', 'Zero new deps'] },
              { title: 'Cryptographic Audit Chain', body: 'Every AI decision cryptographically chained via SHA-256. Tamper any provenance record and the chain breaks. Export Trust Certificates for DORA Article 19 regulatory submission.', pills: ['SHA-256 chain', 'Trust Certificates', 'DORA Article 19', 'Tamper-evident'] },
              { title: 'Multi-Tenancy', body: 'Org-scoped data isolation. Multiple tenants on a single deployment. Per-org API keys, user management, and audit logs.', pills: ['Org isolation', 'Per-org keys', 'Shared infrastructure'] },
              { title: 'Compliance Reporting', body: 'Automated DORA Article 19, DPDPA, and RBI reports generated from Provenance Ledger data — not assembled manually from scattered logs.', pills: ['DORA Article 19', 'DPDPA', 'RBI', 'Auto-generated'] },
              { title: 'Self-Hosting', body: 'Full deployment on your infrastructure. No cloud dependency. Your data never leaves your network. Designed for air-gapped environments.', pills: ['On-premise', 'Air-gap ready', 'Docker + Compose'] },
              { title: 'Integrations', body: 'REST API for every platform capability. Webhook support for inbound events. Native connectors for Okta, Microsoft Sentinel, and Splunk.', pills: ['REST API', 'Webhooks', 'Okta', 'Sentinel', 'Splunk'] },
            ].map(({ title, body, pills }) => (
              <Reveal key={title} delay={0.05}>
                <div style={{ background: 'rgba(74,126,200,0.03)', border: '1px solid rgba(74,126,200,0.1)', padding: '28px', height: '100%' }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 700, color: INK, marginBottom: 10 }}>{title}</div>
                  <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#7A9DB8', lineHeight: 1.68, marginBottom: 14 }}>{body}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {pills.map(p => <Pill key={p} label={p} dark/>)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════ */}
      <section style={{ background: DARK, padding: 'clamp(100px,14vw,160px) clamp(24px,5vw,72px)', textAlign: 'center', borderTop: '1px solid rgba(74,126,200,0.06)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <Reveal>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: GOLD, letterSpacing: '0.2em', marginBottom: 20 }}>SEE IT IN ACTION</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 800, color: INK, margin: '0 0 16px', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              See it in action.
            </h2>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 16, color: '#7A9DB8', lineHeight: 1.7, marginBottom: 36 }}>
              Book a private demo with the founder. Every module shown live, every question answered.
            </p>
            <Link to="/app/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: GOLD, color: '#000', fontWeight: 700,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15,
              padding: '16px 36px', textDecoration: 'none',
              letterSpacing: '0.02em',
            }}>
              Book a Private Demo <ArrowRight size={16}/>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(74,126,200,0.06)', padding: '28px clamp(24px,5vw,72px)', background: DARK }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/assets/brand/aegistrace-icon.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.5 }}/>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: 'rgba(189,212,232,0.28)', fontSize: 11, letterSpacing: '0.16em' }}>AEGISTRACE</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['/', 'Home'], ['/mission', 'Mission'], ['/features', 'Features'], ['/platform', 'Platform'], ['/tools', 'Tools']].map(([to, label]) => (
              <Link key={to} to={to} style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'rgba(189,212,232,0.25)', fontSize: 12, textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'rgba(189,212,232,0.15)', fontSize: 11 }}>© 2026 Prasanna Kumar</span>
        </div>
      </footer>
    </div>
  );
}
