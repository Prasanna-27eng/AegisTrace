import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, Linkedin, Mail, Phone, ArrowRight, Award, BookOpen, Briefcase, Code } from 'lucide-react';
import Logo from '../components/Logo';
import WireframeBackground from '../components/WireframeBackground';
import api from '../api/client';

const SKILLS = [
  { cat: 'SIEM & Detection', tags: ['Microsoft Sentinel', 'Splunk SIEM', 'KQL', 'SPL', 'Log Correlation'] },
  { cat: 'Endpoint & EDR', tags: ['MS Defender', 'Defender for Endpoint', 'Active Directory', 'Group Policy', 'AWS Security'] },
  { cat: 'Vulnerability & PenTest', tags: ['Burp Suite', 'Nmap', 'Nessus', 'Metasploit', 'Wireshark', 'OWASP'] },
  { cat: 'Forensics & Intel', tags: ['Email Forensics', 'OSINT', 'MITRE ATT&CK', 'Threat Intel', 'Phishing Analysis', 'VirusTotal'] },
  { cat: 'Cloud & DevSecOps', tags: ['AWS EC2/S3', 'Docker', 'Terraform', 'Ansible', 'GitHub Actions', 'Python', 'Bash'] },
  { cat: 'Compliance & Frameworks', tags: ['GDPR', 'ISO 27001', 'NIST CSF', 'Cyber Kill Chain', 'SOC 2'] },
];

const CERTS = [
  { icon: '🏆', name: 'Microsoft SC-200', sub: 'Security Operations Associate', date: 'Apr 2026', status: 'completed' },
  { icon: '🔒', name: 'CompTIA Security+', sub: 'SY0-701', date: 'Sep 2024', status: 'completed' },
  { icon: '💻', name: 'TCM Practical Ethical Hacking', sub: 'TCM Security', date: 'Oct 2024', status: 'completed' },
  { icon: '🛠', name: 'TCM Practical Help Desk', sub: 'TCM Security', date: 'Oct 2024', status: 'completed' },
  { icon: '🛡', name: 'AIG Shield Up', sub: 'Forage Job Simulation', date: 'Mar 2025', status: 'completed' },
  { icon: '🎖', name: 'BTL1', sub: 'Security Blue Team', date: 'In Progress 55%', status: 'ongoing' },
];

const PROJECTS = [
  {
    icon: '🛡',
    title: 'AegisTrace SOC Platform',
    period: 'Jun 2025',
    desc: 'Production-grade SOC case management platform with AI analysis, VirusTotal enrichment, email forensics, IOC correlation, and public portfolio publishing.',
    tags: ['React', 'FastAPI', 'Groq AI', 'VirusTotal', 'SQLite', 'Docker'],
    badge: 'Live',
    badgeColor: '#22C55E',
    link: null,
  },
  {
    icon: '🔍',
    title: 'WebSecGuard — Browser Vulnerability Scanner',
    period: 'Jun–Sep 2025 · MSc Dissertation',
    desc: 'Chrome extension (Manifest V3) for real-time XSS and CSRF detection. Identified 25+ injection points on OWASP Juice Shop.',
    tags: ['JavaScript', 'Chrome API', 'MV3', 'OWASP', 'Burp Suite'],
    badge: 'Security',
    badgeColor: '#C0392B',
    link: 'https://github.com/prasanna80564/web-scanner-',
  },
  {
    icon: '⚓',
    title: 'Grand Line SOC Dashboard',
    period: 'May 2026',
    desc: 'SOC dashboard with MITRE ATT&CK mapping, VirusTotal IOC enrichment, AI case summaries, RBAC, and PDF report export.',
    tags: ['React 18', 'Firebase', 'MITRE ATT&CK', 'VirusTotal API', 'Groq AI'],
    badge: 'Blue Team',
    badgeColor: '#A78BFA',
    link: 'https://github.com/Prasanna-27eng/grant-line-soc-',
  },
  {
    icon: '🚀',
    title: 'Automated Cloud Deployment & CI/CD',
    period: 'Jan–Mar 2025',
    desc: 'Full-stack automated deployment to AWS EC2. Terraform + Ansible + GitHub Actions. Deployment time reduced by 70%.',
    tags: ['Terraform', 'Ansible', 'Docker', 'AWS EC2', 'GitHub Actions'],
    badge: 'Cloud',
    badgeColor: '#22C55E',
    link: 'https://github.com/prasanna80564/networking',
  },
];

function StatCard({ value, label }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#C0392B' }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: '#71717A', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_cases: 0, total_iocs: 0, vt_lookups: 0, closed_cases: 0 });
  const [publicCases, setPublicCases] = useState([]);

  useEffect(() => {
    api.get('/api/portfolio/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/api/public/cases').then(r => setPublicCases(r.data)).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#07080F', color: '#F0F0F8' }}>
      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(15,16,24,0.92)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 40px' }}>
        <Logo size={24} showText />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => navigate('/')} style={{ fontSize: '0.8rem' }}>Home</button>
          <button className="btn-ghost" onClick={() => navigate('/public')} style={{ fontSize: '0.8rem' }}>Public Cases</button>
          <button className="btn-accent" onClick={() => navigate('/app/login')} style={{ fontSize: '0.8rem' }}>Launch App</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 100, paddingBottom: 60, textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg, #0F1018 0%, #07080F 100%)' }}>
        <WireframeBackground opacity={0.7} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(192,57,43,0.12)', border: '2px solid rgba(192,57,43,0.35)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700, color: '#C0392B' }}>PK</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>Prasanna Kumar Surendran</h1>
          <div style={{ fontSize: '0.9rem', color: '#A78BFA', fontFamily: 'JetBrains Mono', marginBottom: 16 }}>SOC Analyst · Blue Team L1 · Dublin, Ireland</div>
          <div style={{ fontSize: '0.9rem', color: '#71717A', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 28px' }}>
            MSc Information Systems &amp; Computing (DBS, 2025). Hands-on across SIEM platforms, Active Directory security, vulnerability assessment, and cloud infrastructure automation.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            {['Microsoft SC-200', 'CompTIA Security+', 'BTL1 (In Progress)', 'MITRE ATT&CK', 'Splunk', 'KQL'].map(s => (
              <span key={s} style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.25)', color: '#C0392B', fontSize: '0.72rem', padding: '4px 10px', borderRadius: 20 }}>{s}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a href="https://github.com/prasanna80564" target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: '0.8rem', textDecoration: 'none' }}><Github size={14} /> GitHub</a>
            <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: '0.8rem', textDecoration: 'none' }}><Linkedin size={14} /> LinkedIn</a>
            <a href="mailto:Prasanna80564@gmail.com" className="btn-accent" style={{ fontSize: '0.8rem', textDecoration: 'none' }}><Mail size={14} /> Contact</a>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section style={{ padding: '48px 40px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: '0.68rem', color: '#71717A', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 20, textAlign: 'center' }}>Live Platform Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <StatCard value={stats.total_cases} label="Cases Created" />
          <StatCard value={stats.closed_cases} label="Cases Closed" />
          <StatCard value={stats.total_iocs} label="IOCs Tracked" />
          <StatCard value={stats.vt_lookups} label="VT Lookups" />
        </div>
      </section>

      {/* Skills */}
      <section style={{ padding: '0 40px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: '0.68rem', color: '#71717A', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Code size={12} /> Technical Arsenal</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {SKILLS.map(({ cat, tags }) => (
            <div key={cat} className="at-card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '0.68rem', color: '#71717A', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{cat}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.map(t => (
                  <span key={t} style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', fontSize: '0.72rem', padding: '3px 9px', borderRadius: 4 }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Certifications */}
      <section style={{ background: '#0F1018', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '60px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: '0.68rem', color: '#71717A', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Award size={12} /> Certifications</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {CERTS.map(c => (
              <div key={c.name} className="at-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `2px solid ${c.status === 'completed' ? '#22C55E' : c.status === 'ongoing' ? '#EAB308' : 'rgba(255,255,255,0.1)'}` }}>
                <div style={{ fontSize: '1.2rem', flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#71717A', marginTop: 2 }}>{c.sub}</div>
                  <div style={{ fontSize: '0.68rem', color: c.status === 'completed' ? '#22C55E' : '#EAB308', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{c.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section style={{ padding: '60px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: '0.68rem', color: '#71717A', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Briefcase size={12} /> Featured Projects</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {PROJECTS.map(p => (
            <div key={p.title} className="at-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
                <span style={{ background: `${p.badgeColor}18`, border: `1px solid ${p.badgeColor}44`, color: p.badgeColor, fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'JetBrains Mono' }}>{p.badge}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>{p.period}</div>
              <div style={{ fontSize: '0.8rem', color: '#71717A', lineHeight: 1.65, flex: 1, marginBottom: 12 }}>{p.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                {p.tags.map(t => <span key={t} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#71717A', fontSize: '0.68rem', padding: '2px 7px', borderRadius: 3, fontFamily: 'JetBrains Mono' }}>{t}</span>)}
              </div>
              {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Github size={12} /> View on GitHub</a>}
            </div>
          ))}
        </div>
      </section>

      {/* Public Cases */}
      {publicCases.length > 0 && (
        <section style={{ background: '#0F1018', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '60px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: '0.68rem', color: '#71717A', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 20 }}>Notable Case Rundowns</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {publicCases.map(c => (
                <div key={c.id} className="at-card" style={{ padding: '18px 20px', borderLeft: '2px solid #C0392B' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>{c.case_number}</span>
                    <span className={`badge sev-${c.severity}`}>{c.severity?.toUpperCase()}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 8 }}>{c.title}</div>
                  {c.ai_executive_summary && <div style={{ fontSize: '0.78rem', color: '#71717A', lineHeight: 1.65, marginBottom: 12 }}>{c.ai_executive_summary.slice(0, 160)}…</div>}
                  <button className="btn-accent" onClick={() => navigate(`/public/${c.share_token}`)} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                    View Full Case <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section style={{ padding: '60px 40px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>Get In Touch</h2>
          <p style={{ color: '#71717A', fontSize: '0.9rem', lineHeight: 1.75, marginBottom: 28 }}>
            Actively seeking SOC Analyst, Blue Team, or Cybersecurity roles in Dublin and internationally. Let's connect.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360, margin: '0 auto' }}>
            <a href="mailto:Prasanna80564@gmail.com" className="btn-ghost" style={{ textDecoration: 'none', justifyContent: 'center', padding: '12px' }}>
              <Mail size={14} /> Prasanna80564@gmail.com
            </a>
            <a href="tel:+353899582880" className="btn-ghost" style={{ textDecoration: 'none', justifyContent: 'center', padding: '12px' }}>
              <Phone size={14} /> +353 089 958 2880
            </a>
            <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration: 'none', justifyContent: 'center', padding: '12px' }}>
              <Linkedin size={14} /> LinkedIn Profile
            </a>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>
          Prasanna Kumar Surendran · AegisTrace Portfolio · Dublin, Ireland · 2025–2026
        </div>
      </footer>
    </div>
  );
}
