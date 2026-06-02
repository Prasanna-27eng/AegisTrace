import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Github, Linkedin, ExternalLink, Shield, Brain, Mail, Bug, GitMerge, Wrench, FolderSearch, ChevronRight, Loader2, Monitor, Activity, Globe, Terminal, Bell } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';

// Opens the app in a new tab
const openApp = () => window.open('/app/login', '_blank', 'noopener,noreferrer');

/* ─── Tunnel canvas ───────────────────────────────────────────────────────── */
function TunnelCanvas() {
  const ref = useRef(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let aid, last = 0;

    const RING_COUNT = 26, SPACING = 0.55, Z_MIN = 0.18, DRIFT = 0.014;
    const rings = Array.from({ length: RING_COUNT }, (_, i) => ({
      z: Z_MIN + i * SPACING,
      accent: i % 6 === 0,
    }));

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width  = cv.offsetWidth  * dpr;
      cv.height = cv.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e) => {
      mouse.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener('mousemove', onMouse);

    let vpLerpX = 0.5, vpLerpY = 0.5;

    function frame(ts) {
      const dt = Math.min((ts - last) / (1000 / 60), 3);
      last = ts;

      const W = cv.offsetWidth, H = cv.offsetHeight;
      const minDim = Math.min(W, H);
      const maxOffset = minDim * 0.08;

      vpLerpX += (mouse.current.x - vpLerpX) * 0.04;
      vpLerpY += (mouse.current.y - vpLerpY) * 0.04;
      const vpx = W / 2 + (vpLerpX - 0.5) * maxOffset * 2;
      const vpy = H / 2 + (vpLerpY - 0.5) * maxOffset * 2;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#07080F';
      ctx.fillRect(0, 0, W, H);

      // Diagonal connectors from vanishing point to corners
      ctx.save();
      ctx.strokeStyle = 'rgba(240,240,248,0.06)';
      ctx.lineWidth = 0.5;
      [[0,0],[W,0],[W,H],[0,H]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.moveTo(vpx, vpy); ctx.lineTo(x, y); ctx.stroke();
      });
      ctx.restore();

      // Crosshair
      ctx.save();
      ctx.strokeStyle = 'rgba(240,240,248,0.04)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, vpy); ctx.lineTo(W, vpy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vpx, 0); ctx.lineTo(vpx, H); ctx.stroke();
      ctx.restore();

      // Advance rings
      const maxZ = Z_MIN + RING_COUNT * SPACING;
      rings.forEach(r => {
        r.z -= DRIFT * dt;
        if (r.z < Z_MIN) r.z += RING_COUNT * SPACING;
      });

      // Sort far → near
      const sorted = [...rings].sort((a, b) => b.z - a.z);

      sorted.forEach(r => {
        const size = (minDim * 0.62) / r.z;
        const fade = Math.pow(1 - r.z / maxZ, 1.4);
        const x = vpx - size / 2, y = vpy - size / 2;

        if (r.accent) {
          ctx.save();
          ctx.shadowColor = '#C0392B';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = `rgba(192,57,43,${fade * 0.75})`;
          ctx.lineWidth = Math.max(0.4, fade * 1.2);
        } else {
          ctx.strokeStyle = `rgba(240,240,248,${fade * 0.28})`;
          ctx.lineWidth = Math.max(0.3, fade * 0.7);
        }

        ctx.strokeRect(x, y, size, size);
        if (r.accent) ctx.restore();

        // Tick marks on close rings
        if (r.z < 1.2) {
          const tickLen = 5 * fade;
          const mid = size / 2;
          ctx.strokeStyle = r.accent ? `rgba(192,57,43,${fade * 0.8})` : `rgba(240,240,248,${fade * 0.5})`;
          ctx.lineWidth = 0.6;
          // top, bottom, left, right midpoints
          [
            [x + mid, y, x + mid, y - tickLen],
            [x + mid, y + size, x + mid, y + size + tickLen],
            [x, y + mid, x - tickLen, y + mid],
            [x + size, y + mid, x + size + tickLen, y + mid],
          ].forEach(([x1,y1,x2,y2]) => {
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
          });
        }
      });

      // Ember glow at vanishing point
      const grd = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, minDim * 0.35);
      grd.addColorStop(0, 'rgba(192,57,43,0.1)');
      grd.addColorStop(0.4, 'rgba(192,57,43,0.03)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // Vignette
      const vig = ctx.createRadialGradient(W/2, H/2, minDim*0.3, W/2, H/2, minDim*0.85);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(7,8,15,0.7)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      aid = requestAnimationFrame(frame);
    }
    aid = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(aid);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <canvas ref={ref} data-testid="tunnel-canvas"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  );
}

/* ─── Live clock ──────────────────────────────────────────────────────────── */
function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span data-testid="hud-clock" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(240,240,248,0.45)', letterSpacing: '0.06em' }}>{time}</span>;
}

/* ─── AI Demo section ─────────────────────────────────────────────────────── */
function AIDemo() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const EXAMPLES = ['185.220.101.34', 'evil-invoice.com', 'http://phish-acme.ru/login', '4a7f2b3cd91e8f05a6c2d3b4e5f67890abcd1234ef5678901234567890abcdef'];

  const analyse = async (val) => {
    const v = (val || input).trim();
    if (!v) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await api.post('/api/public/demo-analyse', { input: v });
      setResult(res.data);
    } catch (e) {
      setError('Analysis failed — check API configuration');
    }
    setLoading(false);
  };

  const riskColor = { Critical:'#EF4444', High:'#C0392B', Medium:'#EAB308', Low:'#22C55E', Clean:'#22C55E', Unknown:'#71717A' };
  const verdictColor = { Malicious:'#EF4444', Suspicious:'#EAB308', Clean:'#22C55E', Unknown:'#71717A' };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyse()}
          placeholder="Paste an IP, domain, hash, or URL…"
          style={{
            flex: 1, background: 'rgba(240,240,248,0.04)', border: '1px solid rgba(240,240,248,0.1)',
            borderRadius: 6, padding: '10px 14px', color: '#F0F0F8', fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace', outline: 'none',
          }}
        />
        <button onClick={() => analyse()} disabled={loading || !input.trim()}
          style={{ background: '#C0392B', color: 'white', border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: (!input.trim() || loading) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          {loading ? <><Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> SCANNING</> : 'ANALYSE →'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {EXAMPLES.map(ex => (
          <button key={ex} onClick={() => { setInput(ex); analyse(ex); }}
            style={{ background: 'rgba(240,240,248,0.04)', border: '1px solid rgba(240,240,248,0.08)', borderRadius: 4, padding: '4px 10px', fontSize: 11, color: 'rgba(240,240,248,0.5)', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.target.style.borderColor = 'rgba(192,57,43,0.4)'; e.target.style.color = '#C0392B'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(240,240,248,0.08)'; e.target.style.color = 'rgba(240,240,248,0.5)'; }}>
            {ex.length > 40 ? ex.slice(0,38)+'…' : ex}
          </button>
        ))}
      </div>
      {error && <div style={{ color: '#EF4444', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
      {result && !result.parse_error && (
        <div style={{ background: 'rgba(240,240,248,0.03)', border: '1px solid rgba(240,240,248,0.08)', borderLeft: `3px solid ${verdictColor[result.verdict] || '#71717A'}`, borderRadius: 8, padding: '16px 20px', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: verdictColor[result.verdict] || '#71717A', fontFamily: 'JetBrains Mono, monospace' }}>{result.verdict?.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: 'rgba(240,240,248,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>{result.type}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(240,240,248,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>RISK</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: riskColor[result.risk_level] || '#71717A', fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', background: `${riskColor[result.risk_level] || '#71717A'}18`, borderRadius: 4, border: `1px solid ${riskColor[result.risk_level] || '#71717A'}30` }}>{result.risk_level}</span>
              <span style={{ fontSize: 11, color: 'rgba(240,240,248,0.35)', fontFamily: 'JetBrains Mono, monospace' }}>{result.confidence}% confidence</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.75)', lineHeight: 1.65, marginBottom: result.indicators?.length ? 10 : 0 }}>{result.summary}</p>
          {result.indicators?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {result.indicators.map((ind, i) => (
                <span key={i} style={{ fontSize: 11, background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', color: 'rgba(192,57,43,0.8)', padding: '2px 8px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace' }}>→ {ind}</span>
              ))}
            </div>
          )}
          {result.recommendation && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(240,240,248,0.45)', fontFamily: 'JetBrains Mono, monospace', borderTop: '1px solid rgba(240,240,248,0.06)', paddingTop: 10 }}>
              ↳ {result.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Ticker ──────────────────────────────────────────────────────────────── */
function Ticker() {
  const items = '◇ Endpoint Agent · Log Investigation · IOC Correlation · ◇ AI Case Analysis · MITRE ATT&CK Mapping · Email Forensics · ◇ VirusTotal v3 · Shodan · MalwareBazaar · URLhaus · ThreatFox · GreyNoise · ◇ DORA Compliance Reports · Webhook Alerting · ◇ YARA Rule Generator · SPF · DKIM · DMARC · ◇ Campaign Detection · Threat Hunting · ◇ Auth-Protected Reports · Playbook Persistence · ◇ Free. Open. Deployable. · Built by Prasanna Kumar · ';
  return (
    <div data-testid="bottom-ticker" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid rgba(240,240,248,0.06)', overflow: 'hidden', whiteSpace: 'nowrap', padding: '10px 0' }}>
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div style={{ display: 'inline-block', animation: 'marquee 45s linear infinite', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(240,240,248,0.3)', letterSpacing: '0.08em' }}>
        {items}{items}
      </div>
    </div>
  );
}

const FEATURES = [
  { Icon: FolderSearch, title: 'Case Management',       desc: 'Full incident lifecycle — open, investigate, correlate, close. 10-tab deep-dive: IOCs, timeline, playbook, AI analysis, evidence. Playbook progress persists across sessions.', color: '#C0392B' },
  { Icon: Shield,       title: 'VT + 7-Source Intel',   desc: 'VirusTotal v3 plus Shodan, MalwareBazaar, URLhaus, ThreatFox, GreyNoise, and IPInfo — all queried in parallel. Every result saved to history and correlated across cases.', color: '#A78BFA' },
  { Icon: Brain,        title: 'Multi-Model AI',        desc: 'Groq LLM routing — llama-3.3-70b for case analysis and reports, mixtral-8x7b for phishing classification, gemma2-9b for fast IOC extraction.', color: '#EAB308' },
  { Icon: Mail,         title: 'Email Forensics',       desc: 'Full header parsing, SPF/DKIM/DMARC validation, routing hop extraction, AI phishing verdict with confidence scoring and MITRE ATT&CK mapping.', color: '#22C55E' },
  { Icon: Monitor,      title: 'Endpoint Agent',        desc: 'Silent Python agent for Windows/Linux/Mac. Ships auth logs, process snapshots, and network connections every 5 minutes. Auto-creates cases when threat score exceeds threshold.', color: '#C0392B' },
  { Icon: Terminal,     title: 'Log Investigation',     desc: 'Paste any raw log — syslog, Windows Event, Apache, CloudTrail. AI auto-detects format, extracts IOCs, maps MITRE techniques, pushes results to a case.', color: '#A78BFA' },
  { Icon: GitMerge,     title: 'IOC Correlation',       desc: 'Cross-case correlation engine. When the same IOC appears in multiple cases, a campaign alert fires. Detects shared infrastructure and MITRE technique overlap.', color: '#EAB308' },
  { Icon: Activity,     title: 'Threat Hunting',        desc: 'IOC frequency heatmap, MITRE ATT&CK visualisation, campaign detection, and cross-case search. Spot patterns across your entire investigation history.', color: '#22C55E' },
  { Icon: Bug,          title: 'Malware Tools',         desc: 'Base64 and URL encode/decode, hash generator (MD5/SHA1/SHA256/SHA512), defang/refang, and AI-powered YARA rule generation — all in one hub.', color: '#C0392B' },
  { Icon: Globe,        title: 'DORA Compliance',       desc: 'One-click Article 19 Major ICT Incident Report PDF. Maps the 5 DORA pillars to case data. Built for EU financial services firms. Export as PDF or DOCX.', color: '#A78BFA' },
  { Icon: Bell,         title: 'Webhook Alerting',      desc: 'HTTP POST webhooks fire on case events: new critical case, status change, malicious IOC, case closed. Slack-compatible format with HMAC-SHA256 signing.', color: '#EAB308' },
  { Icon: FolderSearch, title: 'Public Case Library',   desc: 'Toggle any case public or private per-case. Published cases appear as polished read-only rundowns. PDF export. Share investigations as case studies.', color: '#22C55E' },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Deploy the Agent',    desc: 'Drop aegistrace_agent.py on any machine. Configure your URL and ingest key. Logs start arriving within 5 minutes — no other setup.' },
  { n: '02', title: 'Investigate',         desc: 'Open a case. Import emails, paste terminal output, run VT lookups. AI scores each artifact and maps it to MITRE ATT&CK automatically.' },
  { n: '03', title: 'Correlate',           desc: 'The IOC correlation engine links cases sharing the same infrastructure. When an IOC appears in 3+ cases, a campaign alert fires.' },
  { n: '04', title: 'Report & Close',      desc: 'AI writes the executive summary and technical analysis. Generate PDF, DOCX, or DORA Article 19 report. Closure checklist enforced before case is sealed.' },
];

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_cases: 12, total_iocs: 847, critical_cases: 3, vt_lookups: 234 });
  const [coord, setCoord] = useState({ x: '0.0', y: '0.0' });

  useEffect(() => {
    api.get('/api/portfolio/stats').then(r => {
      setStats(s => ({ ...s, ...r.data }));
    }).catch(() => {});
    const onMouse = (e) => setCoord({ x: (e.clientX / window.innerWidth * 100).toFixed(1), y: (e.clientY / window.innerHeight * 100).toFixed(1) });
    window.addEventListener('mousemove', onMouse);
    return () => window.removeEventListener('mousemove', onMouse);
  }, []);

  const monoStyle = { fontFamily: 'JetBrains Mono, monospace' };

  return (
    <div style={{ background: '#07080F', color: '#F0F0F8', minHeight: '100vh', cursor: 'crosshair', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.85);opacity:0.4}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        ::selection{background:rgba(192,57,43,0.4);color:#fff}
        .fade-1{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.05s both}
        .fade-2{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.2s both}
        .fade-3{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.4s both}
        .fade-4{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.65s both}
        .fade-5{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 0.85s both}
        .fade-6{animation:fadeUp 0.9s cubic-bezier(.2,.7,.2,1) 1.05s both}
        .nav-link{color:rgba(240,240,248,0.5);text-decoration:none;transition:color 0.2s;font-size:11px;letter-spacing:0.12em;text-transform:uppercase}
        .nav-link:hover{color:#C0392B}
        .cta-box{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border:1px solid rgba(240,240,248,0.25);transition:all 0.2s;cursor:pointer;background:none}
        .cta-box:hover{border-color:#C0392B}
        .cta-box:hover svg{transform:translate(4px,-4px)}
        .cta-box svg{transition:transform 0.2s}
        .feature-card{background:rgba(240,240,248,0.02);border:1px solid rgba(240,240,248,0.07);border-radius:8px;padding:20px 22px;transition:border-color 0.2s,background 0.2s;cursor:default}
        .feature-card:hover{border-color:rgba(192,57,43,0.3);background:rgba(192,57,43,0.03)}
        /* ── Mobile ── */
        @media(max-width:767px){
          .lp-nav-links{display:none!important}
          .lp-rails{display:none!important}
          .lp-hero{bottom:100px!important;left:20px!important;right:20px!important;max-width:100%!important}
          .lp-section{padding:48px 20px!important}
          .lp-grid-4{grid-template-columns:1fr 1fr!important}
          .lp-grid-auto{grid-template-columns:1fr!important}
          .lp-how{grid-template-columns:1fr 1fr!important}
          .lp-footer{flex-direction:column!important;gap:12px!important;align-items:flex-start!important}
          .lp-cta-row{flex-direction:column!important;gap:20px!important}
        }
        @media(max-width:480px){
          .lp-grid-4{grid-template-columns:1fr!important}
          .lp-how{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* ── HERO (full viewport tunnel) ── */}
      <section style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
        <TunnelCanvas />

        {/* Top nav */}
        <header className="fade-1" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid rgba(240,240,248,0.06)' }}>
          <Logo size={24} showText />
          <nav data-testid="primary-nav" className="lp-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <a href="#features" className="nav-link" onClick={e => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({behavior:'smooth'}); }}>Features</a>
            <a href="#demo" className="nav-link" onClick={e => { e.preventDefault(); document.getElementById('demo')?.scrollIntoView({behavior:'smooth'}); }}>Live Demo</a>
            <a href="#how" className="nav-link" onClick={e => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({behavior:'smooth'}); }}>How It Works</a>
            <a href="/portfolio" className="nav-link">Portfolio</a>
            <a href="/public" className="nav-link">Case Library</a>
            <a href="/agent-setup" className="nav-link">Agent Setup</a>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C0392B', animation: 'pulse-dot 1.8s ease-in-out infinite' }} />
            <Clock />
            <button onClick={openApp} style={{ background: '#C0392B', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 11, fontWeight: 600, cursor: 'pointer', ...monoStyle, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Launch App
            </button>
          </div>
        </header>

        {/* Left rail */}
        <div className="fade-2 lp-rails" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ writingMode: 'vertical-rl', fontSize: 10, color: 'rgba(240,240,248,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase', ...monoStyle }}>Transmission № 01</span>
          <div style={{ width: 1, height: 48, background: 'rgba(192,57,43,0.3)' }} />
          <span style={{ writingMode: 'vertical-rl', fontSize: 10, color: 'rgba(240,240,248,0.25)', letterSpacing: '0.12em', ...monoStyle }}>SOC · Intel · Trace</span>
        </div>

        {/* Right rail */}
        <div className="fade-2 lp-rails" style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, color: 'rgba(240,240,248,0.3)', letterSpacing: '0.12em', ...monoStyle }}>Vanishing pt.</span>
          <div style={{ width: 1, height: 36, background: 'rgba(192,57,43,0.3)' }} />
          <span data-testid="coord-readout" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 10, color: 'rgba(192,57,43,0.5)', letterSpacing: '0.1em', ...monoStyle }}>x{coord.x} · y{coord.y}</span>
        </div>

        {/* Hero copy — bottom left */}
        <div className="fade-4 lp-hero" style={{ position: 'absolute', bottom: 80, left: 48, zIndex: 10, maxWidth: 820 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.45em', textTransform: 'uppercase', color: '#C0392B', ...monoStyle, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ border: '1px solid rgba(192,57,43,0.4)', width: 12, height: 12, display: 'inline-block' }} />
            Professional SOC Investigation Platform
          </div>

          <h1 data-testid="hero-title" style={{ fontFamily: 'Instrument Serif, Georgia, serif', lineHeight: 0.92, letterSpacing: '-0.015em', marginBottom: 28 }}>
            <div style={{ fontSize: 'clamp(3rem,8vw,9rem)', color: '#F0F0F8', fontWeight: 400 }}>When threats rise,</div>
            <div style={{ fontSize: 'clamp(3rem,8vw,9rem)', color: '#C0392B', fontStyle: 'italic', fontWeight: 400 }}>we trace the storm.</div>
          </h1>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 48, flexWrap: 'wrap' }}>
            <p style={{ maxWidth: 420, fontSize: 13, color: 'rgba(240,240,248,0.5)', lineHeight: 1.75, ...monoStyle, fontWeight: 300 }}>
              A production-grade SOC platform with endpoint agent, multi-AI investigation, IOC correlation across 7 threat intel sources, email forensics, DORA compliance reporting, and webhook alerting. Free to deploy. Zero paid dependencies.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(240,240,248,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase', ...monoStyle }}>Enter the platform</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button data-testid="cta-enter" onClick={openApp} className="cta-box">
                  <ArrowUpRight size={20} color="#F0F0F8" />
                </button>
                <button onClick={() => navigate('/portfolio')} style={{ fontSize: 11, color: 'rgba(240,240,248,0.4)', background: 'none', border: 'none', cursor: 'pointer', ...monoStyle, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  View Portfolio →
                </button>
              </div>
            </div>
          </div>
        </div>

        <Ticker />
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ background: '#0F1018', borderTop: '1px solid rgba(240,240,248,0.06)', borderBottom: '1px solid rgba(240,240,248,0.06)' }}>
        <div className="lp-grid-4" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { val: stats.total_cases,    label: 'Cases Investigated',  color: '#F0F0F8' },
            { val: stats.total_iocs,     label: 'IOCs Correlated',     color: '#C0392B' },
            { val: stats.critical_cases, label: 'Critical Incidents',  color: '#EAB308' },
            { val: stats.vt_lookups,     label: 'VT Lookups Run',      color: '#A78BFA' },
          ].map(({ val, label, color }, i) => (
            <div key={label} style={{ padding: '28px 24px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(240,240,248,0.06)' : 'none' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color, ...monoStyle }}>{(val || 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'rgba(240,240,248,0.35)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase', ...monoStyle }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI LIVE DEMO ── */}
      <section id="demo" className="lp-section" style={{ padding: '80px 48px', background: '#07080F' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#C0392B', letterSpacing: '0.2em', textTransform: 'uppercase', ...monoStyle, marginBottom: 10 }}>◇ Live Intelligence Demo</div>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 400, color: '#F0F0F8', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Try the AI<br /><span style={{ color: '#C0392B', fontStyle: 'italic' }}>right now.</span></h2>
            </div>
            <p style={{ maxWidth: 360, fontSize: 13, color: 'rgba(240,240,248,0.45)', lineHeight: 1.75, ...monoStyle, fontWeight: 300 }}>
              Paste any IOC — IP address, domain, URL, or hash. AegisTrace AI returns a real threat assessment in under 2 seconds using Groq's inference engine.
            </p>
          </div>
          <AIDemo />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-section" style={{ padding: '80px 48px', background: '#0F1018', borderTop: '1px solid rgba(240,240,248,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 10, color: '#C0392B', letterSpacing: '0.2em', textTransform: 'uppercase', ...monoStyle, marginBottom: 10 }}>◇ Platform Capabilities</div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 400, color: '#F0F0F8', letterSpacing: '-0.02em' }}>Everything a SOC analyst needs.<br /><span style={{ color: 'rgba(240,240,248,0.35)' }}>Nothing you don't.</span></h2>
          </div>
          <div className="lp-grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
            {FEATURES.map(({ Icon, title, desc, color }) => (
              <div key={title} className="feature-card">
                <Icon size={20} style={{ color, marginBottom: 14 }} />
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: '#F0F0F8' }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(240,240,248,0.45)', lineHeight: 1.7, ...monoStyle, fontWeight: 300 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="lp-section" style={{ padding: '80px 48px', background: '#07080F', borderTop: '1px solid rgba(240,240,248,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 10, color: '#C0392B', letterSpacing: '0.2em', textTransform: 'uppercase', ...monoStyle, marginBottom: 10 }}>◇ Workflow</div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>Four steps.<br /><span style={{ color: '#C0392B', fontStyle: 'italic' }}>One investigation.</span></h2>
          </div>
          <div className="lp-how" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 32 }}>
            {HOW_IT_WORKS.map(({ n, title, desc }) => (
              <div key={n}>
                <div style={{ fontSize: '3.5rem', fontWeight: 700, color: 'rgba(192,57,43,0.12)', ...monoStyle, lineHeight: 1, marginBottom: 14 }}>{n}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(240,240,248,0.45)', lineHeight: 1.7, ...monoStyle, fontWeight: 300 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI MODELS ── */}
      <section style={{ padding: '80px 48px', background: '#0F1018', borderTop: '1px solid rgba(240,240,248,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 10, color: '#C0392B', letterSpacing: '0.2em', textTransform: 'uppercase', ...monoStyle, marginBottom: 10 }}>◇ AI Engine</div>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>Right model.<br /><span style={{ color: '#C0392B', fontStyle: 'italic' }}>Right task.</span></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            {[
              { model: 'llama-3.3-70b-versatile', task: 'Case Analysis & Chat',     why: 'Best reasoning for complex incident investigation' },
              { model: 'mixtral-8x7b-32768',      task: 'Email Classification',     why: 'Large context window for header + body analysis' },
              { model: 'gemma2-9b-it',             task: 'IOC & Terminal Parsing',   why: '3× faster than 70b for structured JSON extraction' },
              { model: 'llama-3.1-8b-instant',    task: 'Quick Single-Field Tasks', why: 'Sub-200ms for simple yes/no security questions' },
            ].map(({ model, task, why }) => (
              <div key={model} style={{ background: 'rgba(240,240,248,0.02)', border: '1px solid rgba(240,240,248,0.07)', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#C0392B', ...monoStyle, marginBottom: 8 }}>{model}</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{task}</div>
                <div style={{ fontSize: 11, color: 'rgba(240,240,248,0.4)', ...monoStyle, lineHeight: 1.6, fontWeight: 300 }}>{why}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA + FOOTER ── */}
      <section style={{ padding: '80px 48px 48px', borderTop: '1px solid rgba(240,240,248,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 64 }}>
            <div>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                Start your first<br /><span style={{ color: '#C0392B', fontStyle: 'italic' }}>investigation.</span>
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={openApp} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 6, padding: '12px 28px', fontSize: 12, fontWeight: 600, cursor: 'pointer', ...monoStyle, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Launch App →
              </button>
              <button onClick={() => navigate('/public')} style={{ background: 'transparent', color: 'rgba(240,240,248,0.6)', border: '1px solid rgba(240,240,248,0.15)', borderRadius: 6, padding: '12px 24px', fontSize: 12, cursor: 'pointer', ...monoStyle, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Case Library
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, paddingTop: 24, borderTop: '1px solid rgba(240,240,248,0.06)' }}>
            <Logo size={20} showText />
            <div style={{ fontSize: 11, color: 'rgba(240,240,248,0.25)', ...monoStyle }}>Prasanna Kumar Surendran · Dublin, Ireland · 2025–2026</div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <a href="https://github.com/prasanna80564" target="_blank" rel="noreferrer" style={{ color: 'rgba(240,240,248,0.35)', textDecoration: 'none', fontSize: 11, ...monoStyle, display: 'flex', gap: 5, alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.35)'}>
                <Github size={13} /> GitHub
              </a>
              <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" style={{ color: 'rgba(240,240,248,0.35)', textDecoration: 'none', fontSize: 11, ...monoStyle, display: 'flex', gap: 5, alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e=>e.currentTarget.style.color='#F0F0F8'} onMouseLeave={e=>e.currentTarget.style.color='rgba(240,240,248,0.35)'}>
                <Linkedin size={13} /> LinkedIn
              </a>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(240,240,248,0.2)', ...monoStyle, letterSpacing: '0.06em' }}>React · FastAPI · Groq · VirusTotal · Shodan · SQLite · Docker · Render</div>
          </div>
        </div>
      </section>
    </div>
  );
}
