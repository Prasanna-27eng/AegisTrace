import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderSearch, ShieldCheck, Brain, Mail, Bug, GitMerge, Wrench,
  ArrowRight, Github, Linkedin, ExternalLink, ChevronRight
} from 'lucide-react';
import Logo from '../components/Logo';
import ParticleCanvas from '../components/ParticleCanvas';
import api from '../api/client';

function useCountUp(target, duration = 1800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

const FEATURES = [
  { Icon: FolderSearch, title: 'Case Management',   desc: 'Full SOC workflow with evidence tracking, closure enforcement, and shift handoff notes.', color: '#C0392B' },
  { Icon: ShieldCheck,  title: 'VT Integration',    desc: 'VirusTotal API v3 — single, bulk IOC lookup with persistent history and case correlation.', color: '#A78BFA' },
  { Icon: Brain,        title: 'AI Analysis',       desc: 'Groq-powered explainable AI analysis with analyst confirmation and MITRE mapping.', color: '#EAB308' },
  { Icon: Mail,         title: 'Email Forensics',   desc: 'Header analysis, SPF/DKIM/DMARC, routing hops, phishing detection with confidence scoring.', color: '#22C55E' },
  { Icon: Bug,          title: 'Malware Tools',     desc: 'Base64, hash gen, YARA rule generator, defang/refang utility, URL decoder.', color: '#C0392B' },
  { Icon: GitMerge,     title: 'IOC Correlation',   desc: 'Cross-case correlation engine — detects campaign patterns and MITRE technique overlap.', color: '#A78BFA' },
  { Icon: Wrench,       title: 'Free Tools Hub',    desc: 'WHOIS, DNS lookup, IP geo, HTTP headers, IOC extractor — all free, all integrated.', color: '#EAB308' },
];

const STEPS = [
  { num: '01', title: 'Create a Case',       desc: 'Open a new investigation and set severity, type, and affected systems.' },
  { num: '02', title: 'Add Evidence',        desc: 'Import emails, terminal output, VT results, and manual notes as structured artifacts.' },
  { num: '03', title: 'Enrich & Correlate',  desc: 'Run VT lookups, AI analysis, and cross-case IOC correlation automatically.' },
  { num: '04', title: 'Close & Publish',     desc: 'Complete the closure checklist and optionally publish the case as a public case study.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_cases: 12, total_iocs: 847, critical_cases: 3, vt_lookups: 234 });

  useEffect(() => {
    api.get('/api/portfolio/stats').then(r => {
      setStats(s => ({
        ...s,
        total_cases: r.data.total_cases || s.total_cases,
        total_iocs: r.data.total_iocs || s.total_iocs,
        critical_cases: r.data.critical_cases || s.critical_cases,
        vt_lookups: r.data.vt_lookups || s.vt_lookups,
      }));
    }).catch(() => {});
  }, []);

  const c1 = useCountUp(stats.total_cases);
  const c2 = useCountUp(stats.total_iocs);
  const c3 = useCountUp(stats.critical_cases);
  const c4 = useCountUp(stats.vt_lookups);

  return (
    <div style={{ minHeight: '100vh', background: '#07080F', color: '#F0F0F8' }}>
      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(15,16,24,0.92)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 40px',
      }}>
        <Logo size={26} showText />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-ghost" onClick={() => navigate('/portfolio')} style={{ fontSize: '0.8rem' }}>Portfolio</button>
          <button className="btn-ghost" onClick={() => navigate('/public')} style={{ fontSize: '0.8rem' }}>Public Cases</button>
          <button className="btn-accent" onClick={() => navigate('/app/login')} style={{ fontSize: '0.8rem' }}>
            Launch App <ChevronRight size={14} />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        <ParticleCanvas opacity={0.22} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)',
            color: '#C0392B', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em',
            padding: '5px 14px', borderRadius: 20, marginBottom: 28,
            fontFamily: 'JetBrains Mono',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', animation: 'criticalPulse 2s infinite' }} />
            LIVE THREAT INTELLIGENCE PLATFORM
          </div>

          <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
            When threats rise,{' '}
            <span style={{ color: '#C0392B' }}>we trace the storm.</span>
          </h1>

          <p style={{ fontSize: '1rem', color: '#71717A', lineHeight: 1.8, maxWidth: 540, margin: '0 auto 36px' }}>
            A production-grade SOC case management and threat investigation platform.
            Built for analysts who demand precision, speed, and evidence-driven results.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-accent" onClick={() => navigate('/app/login')} style={{ padding: '11px 24px', fontSize: '0.88rem' }}>
              Start Investigation <ArrowRight size={16} />
            </button>
            <button className="btn-ghost" onClick={() => navigate('/portfolio')} style={{ padding: '11px 24px', fontSize: '0.88rem' }}>
              View Portfolio
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: '#0F1018', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { val: c1, label: 'Cases Handled' },
            { val: c2, label: 'IOCs Identified', color: '#C0392B' },
            { val: c3, label: 'Critical Incidents', color: '#EAB308' },
            { val: c4, label: 'VT Lookups', color: '#A78BFA' },
          ].map(({ val, label, color }) => (
            <div key={label} style={{ padding: '28px 20px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: color || '#F0F0F8' }}>{val.toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: '0.68rem', color: '#71717A', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>Platform Capabilities</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Everything a SOC analyst needs</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map(({ Icon, title, desc, color }) => (
            <div key={title} className="at-card fade-up" style={{ padding: '20px 22px', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
            >
              <Icon size={22} style={{ color, marginBottom: 12 }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: '0.8rem', color: '#71717A', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: '#0F1018', padding: '80px 40px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: '0.68rem', color: '#71717A', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>Workflow</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em' }}>How it works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} style={{ position: 'relative', paddingTop: 8 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'rgba(192,57,43,0.15)', fontFamily: 'JetBrains Mono', lineHeight: 1, marginBottom: 12 }}>{num}</div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 8, color: '#F0F0F8' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', color: '#71717A', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Logo size={20} showText />
            <div style={{ fontSize: '0.72rem', color: '#71717A', marginTop: 6, fontFamily: 'JetBrains Mono' }}>
              Prasanna Kumar Surendran · Dublin, Ireland
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="https://github.com/prasanna80564" target="_blank" rel="noreferrer" style={{ color: '#71717A', textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.8rem' }} onMouseEnter={e=>e.target.style.color='#F0F0F8'} onMouseLeave={e=>e.target.style.color='#71717A'}>
              <Github size={14} /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" style={{ color: '#71717A', textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.8rem' }} onMouseEnter={e=>e.target.style.color='#F0F0F8'} onMouseLeave={e=>e.target.style.color='#71717A'}>
              <Linkedin size={14} /> LinkedIn
            </a>
            <a href="/portfolio" style={{ color: '#71717A', textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.8rem' }} onMouseEnter={e=>e.target.style.color='#F0F0F8'} onMouseLeave={e=>e.target.style.color='#71717A'}>
              <ExternalLink size={14} /> Portfolio
            </a>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>
            React · FastAPI · Groq AI · VirusTotal · SQLite
          </div>
        </div>
      </footer>
    </div>
  );
}
