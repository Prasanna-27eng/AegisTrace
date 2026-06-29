import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useInView } from 'framer-motion';
import CardNav from '../components/CardNav';
import {
  ArrowRight, Shield, Brain, Eye, Database, CheckCircle,
  Zap, Network, ShieldCheck, Fingerprint, FileText,
  Lock, Cpu, Users, Globe, Layers, Key, AlertTriangle,
} from '../components/icons';

const T = {
  bg:        '#F5F0E8',
  surface:   '#EDE7DC',
  card:      '#E8E0D4',
  cardHover: '#DDD4C4',
  accent:    '#CC785C',
  pubBg:     '#FAF7F2',
  pubAlt:    '#F2EDE5',
  pubText:   '#1A1612',
  pubMuted:  '#6B6258',
  border:    'rgba(26,22,18,0.09)',
  borderMed: 'rgba(26,22,18,0.14)',
  fontD:     "'DM Serif Display', Georgia, serif",
  fontUI:    "'DM Sans', system-ui, sans-serif",
  fontMono:  "'IBM Plex Mono', monospace",
  ease:      [0.23, 1, 0.32, 1],
};
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

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

const FEATURES = [
  {
    icon: Shield,
    title: 'ITDR Detection Engine',
    desc: 'Behavioral baselines and ML anomaly detection across 15+ IdPs with sub-second alert generation.',
    why: 'Identity is the new perimeter. Traditional SIEMs treat auth logs as low-signal noise. Most breaches start with a stolen credential or session token — not malware. You need a detection engine purpose-built for identity events.',
    what: 'Builds behavioral baselines per user, device, and IdP. ML anomaly detection across Okta, Entra ID, and 13 other identity providers. Detects impossible travel, credential stuffing, session hijacking, MFA bypass, and more. Sub-second alert generation with automatic severity scoring tied to the affected user\'s blast radius.',
    diff: 'Most SIEMs ship static correlation rules written for network events. AegisTrace\'s engine is identity-native — every alert carries full identity context: who, what permissions they hold, what they accessed, and what the blast radius looks like. Not just a log line with an IP address.',
  },
  {
    icon: FileText,
    title: 'Case Management',
    desc: 'Structured timelines, evidence packets, and collaborative notes with full SLA tracking.',
    why: 'Analysts drown in alerts without a structured way to investigate and escalate. Unstructured Slack threads and shared spreadsheets destroy MTTR and leave compliance evidence scattered across tools.',
    what: 'Every alert automatically opens a structured case with a timeline, evidence packets, severity score, and SLA clock. Analysts add notes, attach artifacts, tag collaborators, and escalate — all in one place. Cases export as compliance-ready evidence bundles on demand.',
    diff: 'Case management in most SIEM/SOAR tools is bolted on and IP-address centric. AegisTrace cases are built around identity actors — the affected user\'s full profile, their permissions graph, and their access history are surfaced inside every case automatically.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Triage',
    desc: 'Multi-model AI that summarizes alerts, proposes containment, and writes executive summaries.',
    why: 'Tier-1 analysts spend 80% of their time writing summaries and copy-pasting context between tools. That\'s not analysis — it\'s data entry. AI should close that loop so humans can focus on decisions, not documentation.',
    what: 'Multi-model AI reads the full case context — alert data, identity graph, historical behavior, related cases — and produces: a plain-English attack chain summary, a ranked list of containment recommendations, and an executive briefing. Reduces MTTR by up to 70% in pilot deployments.',
    diff: 'Generic AI copilots in SIEMs summarize raw log lines. AegisTrace\'s AI understands identity relationships before it speaks. It knows the affected user holds admin access across three cloud environments before recommending targeted containment — not a boilerplate "consider isolating the host."',
  },
  {
    icon: Network,
    title: 'Identity Graph',
    desc: 'Live graph of your identity estate showing lateral movement, privilege chains, and blast radius.',
    why: 'You can\'t defend what you can\'t see. Traditional tools give you flat user lists and group memberships. Attackers see interconnected privilege chains across SaaS, cloud, and on-prem. Your defenders need the same view.',
    what: 'Live, continuously-updated graph of your entire identity estate: users, devices, service accounts, API tokens, OAuth grants, groups, roles, and their relationships. Interactive visualization of lateral movement paths and privilege escalation chains. Blast radius analysis on demand for any identity actor.',
    diff: 'Identity Graph is interactive and real-time, updated on every auth event — not a periodic scan report or a static AD export. When an alert fires, the analyst opens the graph and sees the full context immediately. Not buried in a separate CMDB tool that was last synced yesterday.',
  },
  {
    icon: CheckCircle,
    title: 'Compliance Evidence',
    desc: 'Auto-generated SOC2, ISO 27001, and NIST CSF evidence packages — audit-ready at any time.',
    why: 'Audits consume weeks of analyst time gathering evidence that should already be structured. Security teams shouldn\'t have to stop responding to threats to prepare for a compliance review.',
    what: 'Every detection, response action, playbook execution, and policy change is automatically logged as structured compliance evidence. Generate SOC2, ISO 27001, and NIST CSF evidence packages at any point in time with a single export. Evidence is timestamped, cryptographically signed, and auditor-friendly.',
    diff: 'Compliance modules in other platforms require manual evidence collection or expensive GRC integrations. AegisTrace captures evidence as a byproduct of normal operations — there is no separate compliance workflow. Audit prep goes from weeks to minutes.',
  },
  {
    icon: Cpu,
    title: 'Endpoint Telemetry',
    desc: 'Lightweight macOS/Linux agent correlating file access, process trees, and network events with identity.',
    why: 'Identity signals alone are incomplete. You need to correlate "who logged in" with "what they actually did on the machine" to close the detection gap between authentication and post-exploitation.',
    what: 'Lightweight macOS and Linux agent (sub-2% CPU) that captures file access events, process execution trees, network connections, and privilege escalation attempts. Every telemetry event is attributed to a specific identity actor and correlated with IdP signals in real time.',
    diff: 'Traditional EDR tools are process-centric — they tell you what code ran, not who directed it. AegisTrace\'s endpoint agent is identity-centric. Every process tree is attributed to a specific user session, cross-referenced against their normal behavior baseline and current permission state.',
  },
  {
    icon: AlertTriangle,
    title: 'Attack Path Mapping',
    desc: 'Graph-based attack path analysis showing the exact route from initial access to domain admin.',
    why: 'Defenders think in control lists; attackers think in graphs. You need to understand your blast radius and attack paths before an incident — not during one when every second counts.',
    what: 'Continuous graph-based attack path analysis powered by the live Identity Graph. Shows every viable route from any initial access vector to crown jewel assets. Highlights shortest paths, identifies chokepoints, and ranks paths by exploitability. Updates in real time as permissions change.',
    diff: 'Attack path tools like BloodHound require manual AD dumps and offline analysis on a static snapshot. AegisTrace maps attack paths continuously against live identity data. When a new service account is created or a permission is granted, the attack path map updates automatically.',
  },
  {
    icon: Zap,
    title: 'SOAR Playbooks',
    desc: 'Automated response playbooks for session revocation, MFA reset, account lockdown, and more.',
    why: 'Manual response to identity threats is too slow. By the time a human opens a ticket, reviews the alert, and revokes a session, lateral movement has already happened. Response must be automated and immediate.',
    what: 'Automated response playbooks pre-built for ITDR scenarios: session revocation across all active sessions, MFA reset, account lockdown with manager notification, Jira ticket creation, IR Slack alerts, and evidence bundle generation. Configurable thresholds and approval gates for high-impact actions.',
    diff: 'Generic SOAR platforms require weeks of playbook engineering for each IdP integration. AegisTrace ships with identity-specific playbooks pre-built for Okta, Entra ID, AWS IAM, and others — up and running in minutes. Playbooks are aware of the identity graph, so they can scope lockdowns to affected access paths, not just the compromised account.',
  },
  {
    icon: Eye,
    title: 'Threat Hunt Workbench',
    desc: 'Interactive query interface for proactive hunting with saved hypotheses and detection exports.',
    why: 'Reactive detection alone isn\'t enough. Adversaries dwell in environments for 60–200 days before triggering a detection. Proactive hunting requires a purpose-built workspace — not a raw SIEM query box with no workflow.',
    what: 'KQL-style query interface over all identity telemetry. Structured hypothesis tracking using PEAK methodology. Saved queries, timeline annotations, and artifact tagging. One-click export of confirmed findings as detections that run automatically going forward.',
    diff: 'Threat hunting in most platforms means writing raw Splunk SPL with no workflow for structuring findings. AegisTrace\'s workbench is purpose-built for identity hunt methodologies: queries are identity-aware, results are automatically enriched with user context, and findings convert directly into production detections.',
  },
  {
    icon: Key,
    title: 'Privileged Access Monitoring',
    desc: 'Real-time monitoring of admin activity, JIT access events, and privilege escalation deviations.',
    why: 'Admin credentials are the #1 target in every major breach. Weekly PAM reports and quarterly access reviews are not security controls — they\'re compliance theater. You need continuous, behavioral surveillance of privileged activity.',
    what: 'Real-time monitoring of all privileged activity: admin logins, just-in-time access grants, privilege escalation, sensitive data access, and configuration changes. Alerts on any deviation from the established admin behavior baseline. Full timeline of every privileged session.',
    diff: 'PAM tools like CyberArk focus on vaulting credentials and controlling access. AegisTrace monitors what privileged users actually do with those credentials after access is granted — behavioral surveillance, not just access gates. It\'s the difference between locking a door and watching what happens inside the room.',
  },
  {
    icon: Fingerprint,
    title: 'AI Agent Telemetry',
    desc: 'First-class monitoring for autonomous AI agents — permissions, API calls, and behavioral drift.',
    why: 'AI agents are being deployed with dangerous levels of trust and zero accountability. The 2026 attack surface includes service accounts that move at machine speed, make autonomous decisions, and hold broad API permissions. No existing ITDR tool was built for this.',
    what: 'First-class monitoring for autonomous AI agents and non-human identities. Track every permission granted, API call made, data accessed, and action taken. Detect behavioral drift from baseline, scope creep (agents doing things outside their intended function), and prompt injection attempts. Powered by the ATSP protocol.',
    diff: 'No other ITDR platform has agent-native telemetry. Existing tools treat AI agents as generic service accounts at best. AegisTrace\'s ATSP (Agent Trust and Security Protocol) was purpose-built to handle the unique characteristics of LLM-driven agents: non-deterministic behavior, tool chaining, and autonomous permission escalation.',
  },
  {
    icon: Globe,
    title: 'Connector Library',
    desc: '15+ native connectors for Okta, Entra ID, CrowdStrike, SentinelOne, AWS IAM, and more.',
    why: 'No ITDR tool succeeds in isolation. Identity threat detection requires correlating signals across every tool in the stack. Gaps in data ingestion are gaps in detection coverage.',
    what: '15+ native bidirectional connectors covering the full identity and security stack: Okta, Entra ID, CrowdStrike, SentinelOne, AWS IAM, Google Cloud, Azure AD, GitHub, and more. All data is normalized to the same identity model. OpenAPI webhook endpoint for any custom integration. Response actions push back to source platforms — not just log ingestion.',
    diff: 'Most SIEM integrations are one-directional log ingestion pipelines. AegisTrace connectors are bidirectional: they ingest signals AND push response actions (session revocation, account lockdown, MFA reset) directly back to the identity provider. No manual API calls required. The connector handles both detection and response.',
  },
];

const INTEGRATIONS = [
  'Okta', 'Microsoft Entra ID', 'CrowdStrike', 'SentinelOne',
  'AWS IAM', 'Google Cloud', 'Azure', 'Splunk',
  'PagerDuty', 'Slack', 'Jira', 'GitHub',
];

function FeatureCard({ icon: Icon, title, desc, why, what, diff, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);

  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: open ? T.pubAlt : hov ? '#F7F3ED' : '#FDFAF6',
          border: `1px solid ${open ? 'rgba(204,120,92,0.28)' : hov ? 'rgba(204,120,92,0.18)' : T.border}`,
          borderRadius: 16,
          transition: 'background 0.22s, border-color 0.22s',
          overflow: 'hidden',
          boxShadow: open ? '0 6px 28px rgba(26,22,18,0.08)' : hov ? '0 3px 14px rgba(26,22,18,0.06)' : 'none',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: '100%', textAlign: 'left', background: 'none',
            border: 'none', cursor: 'pointer',
            padding: '24px 24px 22px',
            display: 'flex', alignItems: 'flex-start', gap: 16,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: open ? 'rgba(204,120,92,0.14)' : 'rgba(204,120,92,0.08)',
            border: `1px solid ${open ? 'rgba(204,120,92,0.28)' : 'rgba(204,120,92,0.16)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.22s, border-color 0.22s',
          }}>
            <Icon size={20} color={T.accent} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.fontUI, fontSize: '0.93rem', fontWeight: 600,
              color: T.pubText, marginBottom: 6, lineHeight: 1.3,
            }}>{title}</div>
            <div style={{
              fontFamily: T.fontUI, fontSize: '0.82rem',
              color: T.pubMuted, lineHeight: 1.62,
            }}>{desc}</div>
          </div>

          {/* +/× toggle */}
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.25, ease: T.ease }}
            style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 8,
              background: open ? 'rgba(204,120,92,0.12)' : 'rgba(26,22,18,0.05)',
              border: `1px solid ${open ? 'rgba(204,120,92,0.28)' : 'rgba(26,22,18,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.22s, border-color 0.22s',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke={open ? T.accent : 'rgba(26,22,18,0.45)'} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </motion.div>
        </button>

        {/* Expandable detail */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.38, ease: T.ease }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                borderTop: '1px solid rgba(204,120,92,0.12)',
                padding: '20px 24px 26px',
              }}>
                {/* Why */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontFamily: T.fontMono, fontSize: '0.67rem', fontWeight: 600,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: T.accent, marginBottom: 8,
                  }}>Why it exists</div>
                  <p style={{
                    fontFamily: T.fontUI, fontSize: '0.86rem',
                    color: T.pubMuted, lineHeight: 1.72, margin: 0,
                  }}>{why}</p>
                </div>

                {/* What */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontFamily: T.fontMono, fontSize: '0.67rem', fontWeight: 600,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: T.pubText, marginBottom: 8,
                  }}>What it does</div>
                  <p style={{
                    fontFamily: T.fontUI, fontSize: '0.86rem',
                    color: T.pubMuted, lineHeight: 1.72, margin: 0,
                  }}>{what}</p>
                </div>

                {/* Differentiator */}
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(204,120,92,0.07)',
                  border: '1px solid rgba(204,120,92,0.16)',
                  borderRadius: 10,
                }}>
                  <div style={{
                    fontFamily: T.fontMono, fontSize: '0.67rem', fontWeight: 600,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: T.accent, marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9.2 11L6 9.4L2.8 11L3.5 7.5L1 5L4.5 4.5L6 1Z" stroke={T.accent} strokeWidth="1.2" strokeLinejoin="round" fill="rgba(204,120,92,0.15)"/>
                    </svg>
                    vs. other SOC tools
                  </div>
                  <p style={{
                    fontFamily: T.fontUI, fontSize: '0.84rem',
                    color: T.pubText, lineHeight: 1.68, margin: 0,
                  }}>{diff}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

export default function Features() {
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

      {/* HERO */}
      <section ref={heroRef} onMouseMove={onMM} onMouseLeave={onML}
        style={{
          position: 'relative', background: T.bg, minHeight: '72vh', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(100px,14vw,160px) clamp(20px,5vw,80px) clamp(80px,10vw,120px)',
        }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.04, pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(204,120,92,0.09) 0%, transparent 65%)' }} />
        <motion.div style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(26,22,18,0.06) 1px, transparent 1px)',
          backgroundSize: '34px 34px', x: isTouch ? 0 : dX, y: isTouch ? 0 : dY,
        }} />

        <motion.div style={{
          position: 'relative', zIndex: 2, maxWidth: 760, width: '100%', textAlign: 'center',
          rotateX: isTouch ? 0 : rX, rotateY: isTouch ? 0 : rY, transformStyle: 'preserve-3d', perspective: 1200,
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: T.ease }} style={{ display: 'inline-flex', marginBottom: 32 }}>
            <span style={{ fontFamily: T.fontUI, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.accent, background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.25)', borderRadius: 100, padding: '6px 16px' }}>Features</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.2, ease: T.ease }}
            style={{ fontFamily: T.fontD, fontStyle: 'normal', fontSize: 'clamp(2.2rem, 6vw, 4.6rem)', lineHeight: 1.12, color: T.pubText, margin: '0 0 28px', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Every feature built for<br />
            <em style={{ fontStyle: 'italic', color: T.accent }}>real SOC workflows</em>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.36, ease: T.ease }}
            style={{ fontFamily: T.fontUI, fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: T.pubMuted, lineHeight: 1.75, maxWidth: 560, margin: '0 auto 0' }}>
            Twelve integrated modules covering detection, investigation, response, and compliance.
            Click any card to understand what it does and why it exists.
          </motion.p>
        </motion.div>
      </section>

      {/* HOW TO USE hint */}
      <div style={{ background: T.pubBg, padding: '28px clamp(20px,5vw,80px) 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(204,120,92,0.06)', border: '1px solid rgba(204,120,92,0.15)',
              borderRadius: 10, padding: '10px 18px',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M7 11.5v1" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="7" cy="7" r="6" stroke={T.accent} strokeWidth="1.2"/>
              </svg>
              <span style={{ fontFamily: T.fontUI, fontSize: '0.82rem', color: T.pubMuted }}>
                Click any feature card to expand — see why it exists, what it does, and how it differs from other SOC tools.
              </span>
            </div>
          </Reveal>
        </div>
      </div>

      {/* FEATURE MODULES */}
      <section style={{ background: T.pubBg, padding: 'clamp(48px,7vw,80px) clamp(20px,5vw,80px) clamp(80px,10vw,120px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal><p style={{ fontFamily: T.fontMono, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.accent, marginBottom: 14 }}>Core Modules</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.pubText, fontWeight: 400, margin: '0 0 52px', lineHeight: 1.2, letterSpacing: '-0.015em' }}>Twelve modules, one platform</h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} delay={i * 0.035} />)}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — quick */}
      <section style={{ background: T.bg, padding: 'clamp(72px,9vw,110px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.035, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {[
              { step: '01', title: 'Connect your stack', body: 'Native connectors to Okta, Entra ID, CrowdStrike, AWS IAM, and 12 more. Operational in under 30 minutes.' },
              { step: '02', title: 'Baselines auto-build', body: 'AegisTrace builds behavioral baselines for every user and entity. No rules to write. Detection starts immediately.' },
              { step: '03', title: 'Alerts with context', body: 'Every alert arrives with full identity context, blast radius, and AI triage — not just a log line and a severity score.' },
              { step: '04', title: 'Respond in one click', body: 'Pre-built playbooks revoke sessions, reset MFA, and lock accounts across every connected IdP instantly.' },
            ].map(({ step, title, body }) => (
              <Reveal key={step} delay={parseInt(step) * 0.08 - 0.08}>
                <div>
                  <div style={{ fontFamily: T.fontMono, fontSize: '0.65rem', color: T.accent, letterSpacing: '0.15em', marginBottom: 14 }}>{step}</div>
                  <div style={{ fontFamily: T.fontD, fontSize: '1.25rem', color: T.pubText, marginBottom: 12, lineHeight: 1.3 }}>{title}</div>
                  <p style={{ fontFamily: T.fontUI, fontSize: '0.88rem', color: T.pubMuted, lineHeight: 1.72, margin: 0 }}>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section style={{ background: T.pubBg, padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Reveal><p style={{ fontFamily: T.fontMono, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.accent, marginBottom: 14 }}>Integrations</p></Reveal>
          <Reveal delay={0.08}>
            <h2 style={{ fontFamily: T.fontD, fontSize: 'clamp(2rem, 4vw, 3rem)', color: T.pubText, fontWeight: 400, margin: '0 0 16px', lineHeight: 1.2 }}>Connects to your existing stack</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1.05rem', color: T.pubMuted, lineHeight: 1.75, maxWidth: 500, margin: '0 auto 52px' }}>
              Native connectors for the tools your team already uses. OpenAPI webhook for everything else.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {INTEGRATIONS.map((name, i) => (
                <motion.span key={name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.4, ease: T.ease }}
                  style={{
                    fontFamily: T.fontUI, fontSize: '0.875rem', fontWeight: 500,
                    color: T.pubMuted, background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 100, padding: '9px 20px',
                  }}
                >{name}</motion.span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: T.bg, padding: 'clamp(80px,10vw,100px) clamp(20px,5vw,80px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <Reveal>
            <h2 style={{ fontFamily: T.fontD, fontStyle: 'italic', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: T.pubText, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.2 }}>
              Ready to explore the platform?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontFamily: T.fontUI, fontSize: '1rem', color: T.pubMuted, lineHeight: 1.75, margin: '0 0 36px' }}>
              All 12 modules available on day one. No credit card, no call required.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <a href="/app/login" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', fontFamily: T.fontUI, fontWeight: 600, fontSize: '0.98rem', padding: '14px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(204,120,92,0.4)', transition: 'transform 0.22s, box-shadow 0.22s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(204,120,92,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,120,92,0.4)'; }}
            >Enter Platform <ArrowRight size={16} /></a>
          </Reveal>
        </div>
      </section>

      <footer style={{ background: T.surface, borderTop: `1px solid ${T.border}`, padding: 'clamp(36px,5vw,52px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontFamily: T.fontD, fontSize: '1.1rem', color: T.pubText }}>AegisTrace</div>
          <div style={{ fontFamily: T.fontUI, fontSize: '0.84rem', color: T.pubMuted }}>© 2025 Prasanna Kumar · MIT License</div>
        </div>
      </footer>
    </div>
  );
}
