import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Github, Shield, Brain, Users, Code,
  GitMerge, Layers, Fingerprint, Database, ChevronRight,
  AlertTriangle, TrendingUp, Clock, CheckCircle, Target,
  BookOpen, Zap, Globe, Lock, Bot, Activity
} from 'lucide-react';
import Logo from '../components/Logo';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };
const SERIF = { fontFamily: 'Instrument Serif, Georgia, serif' };

const CONTACT_EMAIL = 'prasanna80564@gmail.com';

/* ── Subtle particle bg for hero ─────────────────────────────────────────── */
function HeroParticles() {
  const ref = useRef(null);
  const mRef = useRef({ x: 0.5, y: 0.5 });
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    let aid;
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0002,
      vy: (Math.random() - 0.5) * 0.0002,
      r: Math.random() * 1.6 + 0.5,
      a: Math.random() * 0.45 + 0.35,
    }));
    function resize() {
      const dpr = Math.min(window.devicePixelRatio||1,2);
      cv.width = cv.offsetWidth * dpr; cv.height = cv.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize(); window.addEventListener('resize', resize);
    const onM = e => { mRef.current = { x: e.clientX/window.innerWidth, y: e.clientY/window.innerHeight }; };
    window.addEventListener('mousemove', onM);
    let mx=0.5, my=0.5;
    function frame() {
      const W = cv.offsetWidth, H = cv.offsetHeight;
      mx += (mRef.current.x - mx) * 0.03; my += (mRef.current.y - my) * 0.03;
      const ox=(mx-0.5)*20, oy=(my-0.5)*14;
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#040812'; ctx.fillRect(0,0,W,H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if(p.x<0)p.x=1; if(p.x>1)p.x=0; if(p.y<0)p.y=1; if(p.y>1)p.y=0;
      });
      const T = Math.min(W,H)*0.18;
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++) {
        const a=pts[i],b=pts[j];
        const ax=a.x*W+ox,ay=a.y*H+oy,bx=b.x*W+ox,by=b.y*H+oy;
        const d=Math.sqrt((ax-bx)**2+(ay-by)**2);
        if(d<T){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.strokeStyle=`rgba(74,142,219,${(1-d/T)*0.32})`;ctx.lineWidth=0.7;ctx.stroke();}
      }
      pts.forEach(p=>{
        const px=p.x*W+ox,py=p.y*H+oy;
        ctx.beginPath();ctx.arc(px,py,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(74,142,219,${p.a})`;ctx.fill();
      });
      const vig=ctx.createRadialGradient(W/2,H/2,H*0.1,W/2,H/2,H*0.85);
      vig.addColorStop(0,'transparent');vig.addColorStop(1,'rgba(4,8,18,0.8)');
      ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
      aid=requestAnimationFrame(frame);
    }
    aid=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(aid);window.removeEventListener('resize',resize);window.removeEventListener('mousemove',onM);};
  },[]);
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>;
}

/* ── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ number, label, sub, color = '#4A8EDB' }) {
  return (
    <div style={{ padding: '24px 28px', background: 'rgba(74,142,219,0.04)', border: '1px solid rgba(74,142,219,0.12)', borderRadius: 12, textAlign: 'center' }}>
      <div style={{ ...SERIF, fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 400, color, fontStyle: 'italic', lineHeight: 1 }}>{number}</div>
      <div style={{ fontSize: '0.82rem', color: 'rgba(245,247,250,0.85)', marginTop: 8, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#6F7A8F', marginTop: 4, ...MONO }}>{sub}</div>}
    </div>
  );
}

/* ── Contribution card ───────────────────────────────────────────────────── */
function ContribCard({ Icon, title, desc, action, href, color = '#4A8EDB' }) {
  return (
    <div style={{ padding: '24px', background: 'rgba(12,18,32,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${color}35`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: '0.78rem', color: '#8A95A8', lineHeight: 1.65 }}>{desc}</div>
      </div>
      {action && (
        <a href={href || `mailto:${CONTACT_EMAIL}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color, textDecoration: 'none', marginTop: 'auto', ...MONO }}
          target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
          {action} <ChevronRight size={12} />
        </a>
      )}
    </div>
  );
}

/* ── Vision pillar ───────────────────────────────────────────────────────── */
function Pillar({ Icon, label, desc }) {
  return (
    <div style={{ padding: '20px', background: 'rgba(74,142,219,0.03)', border: '1px solid rgba(74,142,219,0.1)', borderRadius: 10 }}>
      <Icon size={18} style={{ color: '#4A8EDB', marginBottom: 10 }} />
      <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: '#8A95A8', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function Mission() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#040812', color: '#F5F7FA', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&family=Inter:wght@300;400;500;600;700&display=swap');
        ::selection{background:rgba(74,142,219,0.3);color:#fff}
        .mission-section { padding: 90px 48px; border-top: 1px solid rgba(255,255,255,0.05); }
        .mission-label { font-size:10px; color:#4A8EDB; letter-spacing:0.25em; text-transform:uppercase; font-family:'JetBrains Mono',monospace; margin-bottom:14px; }
        .mission-h2 { font-family:'Instrument Serif',serif; font-size:clamp(2rem,4vw,3.2rem); font-weight:400; letter-spacing:-0.02em; line-height:1.1; margin-bottom:20px; }
        .mission-body { font-size:0.9rem; color:#A6AFBF; line-height:1.85; max-width:680px; margin-bottom:16px; }
        .accent { color:#4A8EDB; }
        .accent2 { color:#9C7CFF; }
        .accent-text { font-style:italic; color:#6BABEC; }
        @media(max-width:767px){.mission-section{padding:52px 20px!important}.lp-2col{grid-template-columns:1fr!important}.lp-3col{grid-template-columns:1fr!important}.lp-4col{grid-template-columns:1fr 1fr!important}}
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(4,8,18,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 48px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <Logo size={22} showText />
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6F7A8F', cursor: 'pointer', fontSize: '0.78rem', ...MONO, marginLeft: 8 }}>
          <ArrowLeft size={13} /> Back to Home
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ fontSize: '0.8rem', color: '#6F7A8F', textDecoration: 'none', ...MONO, display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e => e.currentTarget.style.color='#6F7A8F'}>
            <Mail size={13} /> Contact
          </a>
          <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#6F7A8F', textDecoration: 'none', ...MONO, display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e => e.currentTarget.style.color='#6F7A8F'}>
            <Github size={13} /> GitHub
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '70vh', minHeight: 520, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <HeroParticles />
        <div style={{ position: 'relative', zIndex: 10, padding: '0 48px', maxWidth: 900 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(74,142,219,0.1)', border: '1px solid rgba(74,142,219,0.25)', borderRadius: 20, marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4A8EDB', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.68rem', color: '#6BABEC', ...MONO, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              The Industrial Revolution in Cybersecurity
            </span>
          </div>

          <h1 style={{ ...SERIF, fontSize: 'clamp(2.8rem,7vw,5.5rem)', fontWeight: 400, lineHeight: 0.96, letterSpacing: '-0.015em', marginBottom: 24 }}>
            <div style={{ color: '#F5F7FA' }}>Building the Future of</div>
            <div style={{ color: '#4A8EDB', fontStyle: 'italic' }}>AI-Augmented Security.</div>
          </h1>

          <p style={{ fontSize: '1rem', color: '#A6AFBF', lineHeight: 1.8, maxWidth: 600, marginBottom: 36, ...MONO, fontWeight: 300 }}>
            AegisTrace isn't just a product. It's a movement to redefine how humanity defends itself in the AI-agent era — where identity, trust, and provenance become the new perimeter.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={`mailto:${CONTACT_EMAIL}?subject=I want to join the AegisTrace mission`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4A8EDB', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
              <Mail size={15} /> Join the Mission
            </a>
            <button onClick={() => document.querySelector('#vision')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#D7DCE6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 24px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <BookOpen size={15} /> Read the Vision
            </button>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to top, #040812 0%, transparent 100%)' }} />
      </section>

      {/* ── THE PROBLEM ── */}
      <section className="mission-section" id="problem" style={{ padding: '90px 48px', background: '#040812' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mission-label">◇ The Problem</div>
          <h2 className="mission-h2">The world is changing.<br /><span className="accent-text">Security isn't keeping up.</span></h2>

          <p className="mission-body">
            The SOC model built in the 2000s — tracking machines, IPs, and endpoints — is <strong style={{ color: '#F5F7FA' }}>fundamentally broken</strong>. Attackers no longer breach perimeters. They log in. The real attack surface has shifted entirely.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 12, marginBottom: 40 }}>
            {[
              { icon: Fingerprint,  label: 'User identities',     desc: 'Stolen credentials = instant access to everything' },
              { icon: Bot,          label: 'AI agents',           desc: '70% of organisations using AI lack security controls' },
              { icon: Lock,         label: 'Service accounts',    desc: 'Rogue tokens operating at machine speed, undetected' },
              { icon: Activity,     label: 'Machine-speed attacks', desc: 'Executed in milliseconds — humans cannot respond alone' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, borderLeft: '2px solid rgba(74,142,219,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Icon size={14} style={{ color: '#4A8EDB' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{label}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#8A95A8', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="lp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            <StatCard number="83%" label="of breaches involve stolen credentials or identity abuse" sub="Verizon DBIR 2025" color="#4A8EDB" />
            <StatCard number="70%" label="of organisations using AI lack proper security controls" sub="Gartner 2025" color="#9C7CFF" />
            <StatCard number="30 min" label="average human triage time vs 30 seconds for AI-augmented" sub="SOC Analyst Survey 2025" color="#F5B84B" />
            <StatCard number="10×" label="productivity gap between human-only and AI-augmented SOC" sub="Industry benchmark" color="#4BE38A" />
          </div>
        </div>
      </section>

      {/* ── OUR VISION ── */}
      <section className="mission-section" id="vision" style={{ padding: '90px 48px', background: '#060A16' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mission-label" style={{ color: '#9C7CFF' }}>◇ Our Vision</div>
          <h2 className="mission-h2">From case manager to<br /><span className="accent2" style={{ fontStyle: 'italic' }}>trust control plane.</span></h2>

          <div className="lp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start', marginBottom: 48 }}>
            <div>
              <p className="mission-body">
                AegisTrace started as an open-source case manager. But the future is far bigger.
              </p>
              <p className="mission-body">
                We're building the <strong style={{ color: '#4A8EDB' }}>control plane for the AI-agent era</strong> — where every action is traced to an identity, every AI decision is explainable and auditable, and every agent operates within human-defined trust boundaries.
              </p>
              <p className="mission-body">
                The platform that helps analysts answer the question the next decade of security will be built around:<br />
                <em style={{ color: '#F5F7FA', fontSize: '0.95rem' }}>"Which identity, agent, workflow, or prompt caused this?"</em>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { from: 'IOC dashboard',         to: 'Identity investigation platform',   c: '#4A8EDB' },
                { from: 'Case manager',           to: 'Trust orchestration platform',      c: '#9C7CFF' },
                { from: 'Alert viewer',           to: 'Agent supervision console',         c: '#4BE38A' },
                { from: 'Manual triage',          to: 'Autonomous + human-approved',       c: '#F5B84B' },
                { from: 'Black-box AI verdicts',  to: 'Explainable provenance chains',     c: '#4A8EDB' },
                { from: 'Static reports',         to: 'Future-narrative intelligence',     c: '#9C7CFF' },
              ].map(({ from, to, c }) => (
                <div key={from} style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ flex: 1, fontSize: '0.78rem', color: 'rgba(245,247,250,0.3)', textDecoration: 'line-through', ...MONO }}>{from}</div>
                  <ChevronRight size={14} style={{ color: c, margin: '0 10px', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: '0.78rem', color: 'rgba(245,247,250,0.9)', ...MONO, fontWeight: 500 }}>{to}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pillars */}
          <div className="lp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            <Pillar Icon={Fingerprint}  label="Identity First"    desc="Every actor — human, service, agent, token — is modelled as a first-class entity with a risk score and a trust history." />
            <Pillar Icon={Database}     label="Provenance"        desc="Every AI output, tool result, and case action carries full provenance: who, what model, what evidence, what confidence." />
            <Pillar Icon={GitMerge}     label="Trust"             desc="Trust is tracked, inherited, challenged, and revocable. A trust timeline sits beside every incident." />
            <Pillar Icon={Brain}        label="Explainability"    desc="No black boxes. Every AI verdict shows its reasoning chain, evidence used, and what could be wrong." />
            <Pillar Icon={Shield}       label="Human Control"     desc="AI suggests. Humans confirm. Every automation has an approval layer and a complete audit trail." />
            <Pillar Icon={TrendingUp}   label="Future-Ready"      desc="Designed to remain relevant 10–15 years from now — when quantum threats and AI-native adversaries are the norm." />
          </div>
        </div>
      </section>

      {/* ── HOW TO CONTRIBUTE ── */}
      <section className="mission-section" id="contribute" style={{ padding: '90px 48px', background: '#040812' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mission-label">◇ Contribute</div>
          <h2 className="mission-h2">Six ways to<br /><span className="accent-text">join the mission.</span></h2>
          <p className="mission-body">
            AegisTrace is built by one analyst in Dublin — but the vision is bigger than one person. Whether you're an analyst, developer, designer, researcher, writer, or enterprise buyer, there's a place for you here.
          </p>

          <div className="lp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 32 }}>
            <ContribCard Icon={Code}     color="#4A8EDB" title="Build Features"        action="Email to discuss →"
              desc="Help build the v3.0 features: Identity Graph, Terminal Lab, Agent Supervision, Attacker Path Reconstruction. Any stack welcome." />
            <ContribCard Icon={Shield}   color="#9C7CFF" title="Security Research"     action="Share your research →"
              desc="Contribute AI threat models, identity attack patterns, MITRE mappings, or research on emerging threats in the AI-agent era." />
            <ContribCard Icon={Brain}    color="#4BE38A" title="AI / ML Engineering"  action="Email to collaborate →"
              desc="Help improve the multi-model AI router, explainability layer, proactive triage engine, and AI memory across cases." />
            <ContribCard Icon={Users}    color="#F5B84B" title="SOC Analyst Input"    action="Share your pain points →"
              desc="You use tools like this every day. Tell us what's broken, what's missing, and what would make your investigations 10× faster." />
            <ContribCard Icon={BookOpen} color="#4A8EDB" title="Documentation"        action="Help write docs →"
              desc="Write guides, walkthroughs, deployment docs, or use-case narratives that help analysts get value out of AegisTrace faster." />
            <ContribCard Icon={Globe}    color="#9C7CFF" title="Enterprise Partnership" action="Let's talk →"
              desc="Using AegisTrace in a real SOC environment? We want to hear from you. Your feedback shapes the enterprise roadmap." />
          </div>

          {/* CTA */}
          <div style={{ marginTop: 52, padding: '40px 48px', background: 'rgba(74,142,219,0.05)', border: '1px solid rgba(74,142,219,0.18)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Ready to contribute?</div>
              <div style={{ fontSize: '0.85rem', color: '#A6AFBF', maxWidth: 480 }}>
                Send an email with a short intro — who you are, what you do, and how you'd like to be involved. Every message is read personally.
              </div>
              <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#4A8EDB', ...MONO }}>{CONTACT_EMAIL}</div>
            </div>
            <a href={`mailto:${CONTACT_EMAIL}?subject=I want to contribute to AegisTrace`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4A8EDB', color: 'white', borderRadius: 8, padding: '13px 28px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
              <Mail size={16} /> Send Introduction
            </a>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section className="mission-section" id="roadmap" style={{ padding: '90px 48px', background: '#060A16' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mission-label" style={{ color: '#9C7CFF' }}>◇ Roadmap</div>
          <h2 className="mission-h2">What we're building.<br /><span className="accent2" style={{ fontStyle: 'italic' }}>In the open.</span></h2>

          <div className="lp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {[
              {
                phase: 'Now — v2.0', status: 'live', color: '#4BE38A',
                items: ['Case management lifecycle','Multi-model AI (4 Groq models)','7-source IOC enrichment','Endpoint agent (Sysmon/process)','18 hardware forensic tools','Email forensics','PCAP analysis','DORA Article 19 compliance','Threat hunting + campaigns','Audit logs + webhook alerting'],
              },
              {
                phase: 'Building — v3.0', status: 'building', color: '#F5B84B',
                items: ['Identity Graph — users/tokens/agents as nodes','Trust Timeline — per-case chain of events','Provenance Ledger — AI action audit','Terminal Lab — private analyst workspace','Explainable AI — reasoning chain','Proactive triage — AI-surfaced anomalies','Case Comments + investigation templates','Analytics — trends, SLA, throughput'],
              },
              {
                phase: 'Planned — v4.0', status: 'planned', color: '#9C7CFF',
                items: ['Agent Supervision Console — kill switches','Attacker Path Reconstruction','AI Memory across cases','Policy-based response automation','Machine Identity incidents','Control Plane view — live trust/policy','Crypto + Quantum Readiness inventory','Future-narrative board-level reporting'],
              },
            ].map(({ phase, status, color, items }) => (
              <div key={phase} style={{ background: 'rgba(12,18,32,0.5)', border: `1px solid ${color}20`, borderRadius: 12, padding: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color}70,transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: status==='live' ? `0 0 8px ${color}` : 'none' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{phase}</div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.62rem', ...MONO, padding: '2px 8px', borderRadius: 3, background: `${color}18`, color, border: `1px solid ${color}30`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {status === 'live' ? 'Live' : status === 'building' ? 'In Progress' : 'Planned'}
                  </div>
                </div>
                {items.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: status==='live' ? color : 'rgba(255,255,255,0.15)', flexShrink: 0, marginTop: 5 }} />
                    <div style={{ fontSize: '0.75rem', color: status==='live' ? 'rgba(245,247,250,0.8)' : 'rgba(245,247,250,0.5)', lineHeight: 1.4, ...MONO }}>{item}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="mission-section" style={{ padding: '80px 48px', background: '#040812' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div className="mission-label" style={{ textAlign: 'center' }}>◇ Who's Building This</div>
          <h2 className="mission-h2" style={{ textAlign: 'center' }}>One analyst.<br /><span className="accent-text">One ambitious mission.</span></h2>
          <p style={{ fontSize: '0.9rem', color: '#A6AFBF', lineHeight: 1.85, marginBottom: 20 }}>
            Prasanna Kumar Surendran — Blue Team analyst and security tooling developer, Dublin, Ireland. AegisTrace started as a personal investigation platform and grew into a full SOC control plane benchmarked against commercial products.
          </p>
          <p style={{ fontSize: '0.9rem', color: '#A6AFBF', lineHeight: 1.85, marginBottom: 32 }}>
            The platform is self-funded, free to use, and open in philosophy. The goal is to prove that a solo analyst can build SOC tooling that rivals commercial products — and that the next generation of security platforms must be built around identity, trust, and explainability from the ground up.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#4A8EDB', color: 'white', borderRadius: 8, padding: '11px 22px', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>
              <Mail size={14} /> Get in Touch
            </a>
            <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.05)', color: '#D7DCE6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 22px', fontSize: '0.82rem', textDecoration: 'none' }}>
              <Github size={14} /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.05)', color: '#D7DCE6', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 22px', fontSize: '0.82rem', textDecoration: 'none' }}>
              <Users size={14} /> LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '28px 48px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <Logo size={18} showText />
        <div style={{ fontSize: '0.72rem', color: '#3A4556', ...MONO }}>Prasanna Kumar Surendran · Dublin, Ireland · 2025–2026</div>
        <button onClick={() => navigate('/')} style={{ fontSize: '0.75rem', color: '#6F7A8F', background: 'none', border: 'none', cursor: 'pointer', ...MONO }}>← Back to AegisTrace</button>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.2)} }
      `}</style>
    </div>
  );
}
