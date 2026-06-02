import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Copy, CheckCircle, ChevronDown, ChevronUp, Terminal, Shield, ArrowLeft, ExternalLink } from 'lucide-react';
import Logo from '../components/Logo';

const AEGISTRACE_URL = 'https://aegistrace-7qvn.onrender.com';
const AGENT_RAW_URL  = 'https://raw.githubusercontent.com/Prasanna-27eng/AegisTrace/main/agent/aegistrace_agent.py';

const mono = { fontFamily: "'JetBrains Mono', 'Fira Mono', monospace" };

/* ── helpers ── */
function CopyBlock({ code, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: 'relative', marginTop: 10 }}>
      {label && <div style={{ fontSize: 11, color: '#71717A', marginBottom: 4, ...mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>}
      <pre style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '14px 48px 14px 16px', margin: 0, ...mono, fontSize: 13, color: '#e2e8f0', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.65 }}>{code}</pre>
      <button onClick={copy} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', color: copied ? '#22C55E' : '#71717A', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, ...mono }}>
        {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#F0F0F8', textAlign: 'left' }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{title}</span>
        {open ? <ChevronUp size={15} style={{ color: '#71717A' }} /> : <ChevronDown size={15} style={{ color: '#71717A' }} />}
      </button>
      {open && <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>{children}</div>}
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(192,57,43,0.2)', border: '1px solid rgba(192,57,43,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#C0392B', flexShrink: 0, ...mono }}>{n}</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#F0F0F8' }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

const TABS = ['Quick Start', 'Background Service', 'What It Collects', 'Config Options'];

export default function AgentSetup() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Quick Start');

  const configSnippet = `AEGISTRACE_URL = "${AEGISTRACE_URL}"
INGEST_KEY     = "paste-your-ingest-key-here"`;

  return (
    <div style={{ minHeight: '100vh', background: '#07080F', color: '#F0F0F8' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 32px', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <Logo size={22} />
          <span style={{ fontWeight: 700, fontSize: 14, ...mono, letterSpacing: '0.06em' }}>AEGISTRACE</span>
        </a>
        <div style={{ flex: 1 }} />
        <a href="/public" style={{ fontSize: 12, color: 'rgba(240,240,248,0.45)', textDecoration: 'none', ...mono }}>Case Library</a>
        <button onClick={() => navigate('/app/login')} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer', ...mono, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, rgba(192,57,43,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '52px 32px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.35)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Terminal size={20} style={{ color: '#C0392B' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, ...mono, color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Endpoint Agent</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>Setup Guide</h1>
            </div>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(240,240,248,0.55)', margin: '0 0 24px', lineHeight: 1.7, maxWidth: 580 }}>
            Install the AegisTrace agent on any machine — Windows, Linux, or Mac — to automatically collect and ship security logs to your AegisTrace dashboard. No extra dependencies required.
          </p>

          {/* Download card */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>aegistrace_agent.py</div>
              <div style={{ fontSize: 11, color: '#71717A', ...mono }}>Python 3.7+ · Zero dependencies · Windows / Linux / Mac</div>
            </div>
            <a
              href={AGENT_RAW_URL}
              download="aegistrace_agent.py"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#C0392B', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700, ...mono, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}
            >
              <Download size={14} /> Download Agent
            </a>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 32px 60px' }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 28, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #C0392B' : '2px solid transparent', color: tab === t ? '#F0F0F8' : '#71717A', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, marginBottom: -1, whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── QUICK START ── */}
        {tab === 'Quick Start' && (
          <div>
            <Step n="1" title="Get your Ingest Key">
              <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.6)', margin: '0 0 10px', lineHeight: 1.65 }}>
                Log into AegisTrace, go to <strong style={{ color: '#F0F0F8' }}>Endpoints</strong> and click <strong style={{ color: '#F0F0F8' }}>Get Ingest Key</strong>. Copy the key — you'll paste it in the next step.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A78BFA', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 6, padding: '7px 12px', ...mono }}>
                <Shield size={12} /> Admin → Endpoints → Get Ingest Key
              </div>
            </Step>

            <Step n="2" title="Download & configure the agent">
              <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.6)', margin: '0 0 10px', lineHeight: 1.65 }}>
                Download the agent file above, open it in any text editor, and set these two lines near the top:
              </p>
              <CopyBlock code={configSnippet} label="aegistrace_agent.py — edit these two lines" />
              <div style={{ marginTop: 12 }}>
                <a href={AGENT_RAW_URL} download="aegistrace_agent.py" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#71717A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 12px', textDecoration: 'none', ...mono, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = '#F0F0F8'} onMouseLeave={e => e.currentTarget.style.color = '#71717A'}>
                  <Download size={12} /> Download aegistrace_agent.py
                </a>
              </div>
            </Step>

            <Step n="3" title="Run it">
              <CopyBlock code="python3 aegistrace_agent.py" label="Terminal" />
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 7, fontSize: 13, color: 'rgba(240,240,248,0.7)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={13} style={{ color: '#22C55E', flexShrink: 0 }} />
                Logs appear in your <strong style={{ color: '#F0F0F8' }}>Endpoints</strong> page within 5 minutes.
              </div>
            </Step>

            <div style={{ padding: '12px 16px', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 8, fontSize: 13, color: '#A78BFA', lineHeight: 1.6 }}>
              <strong>Requirements:</strong> Python 3.7 or newer, no extra packages needed. The agent tracks its position in each log file so it never ships duplicate lines.
            </div>
          </div>
        )}

        {/* ── BACKGROUND SERVICE ── */}
        {tab === 'Background Service' && (
          <div>
            <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.6)', margin: '0 0 20px', lineHeight: 1.65 }}>
              Install the agent as a persistent service so it starts automatically and keeps running in the background.
            </p>

            <Section title="Linux — systemd" icon="🐧" defaultOpen>
              <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.6)', margin: '0 0 8px', lineHeight: 1.6 }}>One command installs and starts the systemd service:</p>
              <CopyBlock code="sudo python3 aegistrace_agent.py --install-service" />
              <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.6)', margin: '12px 0 6px' }}>Check status:</p>
              <CopyBlock code="systemctl status aegistrace-agent" />
            </Section>

            <Section title="Mac — LaunchAgent (auto-starts on login)" icon="🍎">
              <CopyBlock code="python3 aegistrace_agent.py --install-launchd" />
              <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.55)', margin: '10px 0 0', lineHeight: 1.6 }}>The agent will launch automatically each time you log in.</p>
            </Section>

            <Section title="Windows — Task Scheduler" icon="🪟">
              <ol style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: 'rgba(240,240,248,0.65)', lineHeight: 2 }}>
                <li>Open <strong style={{ color: '#F0F0F8' }}>Task Scheduler</strong> → Create Basic Task</li>
                <li>Name: <code style={{ color: '#A78BFA', ...mono, fontSize: 12 }}>AegisTrace Agent</code></li>
                <li>Trigger: <strong style={{ color: '#F0F0F8' }}>At startup</strong> + repeat every <strong style={{ color: '#F0F0F8' }}>5 minutes</strong></li>
                <li>Action: <code style={{ color: '#A78BFA', ...mono, fontSize: 12 }}>python.exe "C:\path\to\aegistrace_agent.py"</code></li>
                <li>Run whether user is logged on or not ✓</li>
                <li>Run with highest privileges ✓</li>
              </ol>
            </Section>
          </div>
        )}

        {/* ── WHAT IT COLLECTS ── */}
        {tab === 'What It Collects' && (
          <div>
            <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.6)', margin: '0 0 20px', lineHeight: 1.65 }}>
              The agent auto-detects your operating system and collects the relevant log sources. All data is sent over HTTPS.
            </p>

            <Section title="Linux / Mac" icon="🐧🍎" defaultOpen>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ textAlign: 'left', padding: '7px 10px', color: '#71717A', fontWeight: 500 }}>Source</th>
                    <th style={{ textAlign: 'left', padding: '7px 10px', color: '#71717A', fontWeight: 500 }}>What it captures</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['/var/log/auth.log', 'SSH logins, sudo, su'],
                    ['/var/log/syslog', 'System events'],
                    ['journalctl', 'Systemd service events'],
                    ['/var/log/nginx/access.log', 'Web access logs'],
                    ['/var/log/apache2/access.log', 'Web access logs'],
                    ['ps aux', 'Running processes snapshot'],
                    ['ss -tunp', 'Active network connections'],
                  ].map(([src, desc]) => (
                    <tr key={src} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 10px', ...mono, fontSize: 12, color: '#A78BFA' }}>{src}</td>
                      <td style={{ padding: '8px 10px', color: 'rgba(240,240,248,0.65)' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="Windows" icon="🪟">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ textAlign: 'left', padding: '7px 10px', color: '#71717A', fontWeight: 500 }}>Source</th>
                    <th style={{ textAlign: 'left', padding: '7px 10px', color: '#71717A', fontWeight: 500 }}>What it captures</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Windows Security Events', '4624 login · 4625 failed · 4720 new user · 4726 deleted · 4698 task'],
                    ['Windows System Events', '7045 new service · 7040 service changed'],
                    ['PowerShell History', 'All commands typed in PS'],
                    ['Process list', 'Get-Process snapshot'],
                    ['Network connections', 'Get-NetTCPConnection'],
                  ].map(([src, desc]) => (
                    <tr key={src} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 10px', ...mono, fontSize: 12, color: '#A78BFA' }}>{src}</td>
                      <td style={{ padding: '8px 10px', color: 'rgba(240,240,248,0.65)' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>
        )}

        {/* ── CONFIG OPTIONS ── */}
        {tab === 'Config Options' && (
          <div>
            <p style={{ fontSize: 13, color: 'rgba(240,240,248,0.6)', margin: '0 0 14px', lineHeight: 1.65 }}>
              Open <code style={{ color: '#A78BFA', ...mono, fontSize: 12 }}>aegistrace_agent.py</code> and adjust these variables near the top of the file:
            </p>
            <CopyBlock code={`INTERVAL_SECONDS = 300     # How often to ship logs (default: 5 min)
MAX_LINES        = 500     # Max lines per log file per run
AUTO_ANALYSE     = True    # Run AI analysis on arrival
AUTO_CASE        = True    # Auto-create a case if threat score > threshold
THREAT_THRESHOLD = 60      # Score 0–100 (default: 60)
TAGS             = ["prod", "finance"]  # Optional labels for this machine`} label="Configuration variables" />

            <div style={{ marginTop: 28, marginBottom: 12, fontWeight: 700, fontSize: 14 }}>Troubleshooting</div>

            {[
              ['Agent runs but no data appears in AegisTrace', 'Check that the INGEST_KEY matches the key shown in Endpoints → Get Ingest Key. Make sure AEGISTRACE_URL includes https://. Check aegistrace_agent.log in the same folder for error details.'],
              ['Permission denied on log files', 'Linux/Mac: run as root, or add your user to the adm group: sudo usermod -aG adm $USER (then log out and back in). Windows: run as Administrator, or set the Task Scheduler task to run as SYSTEM.'],
              ['AI analysis not running on new batches', 'Verify that GROQ_API_KEY is set as an environment variable in your Render (or hosting) dashboard. You can check with GET /api/health — it should return {"groq": true}.'],
            ].map(([q, a]) => (
              <div key={q} style={{ marginBottom: 10, padding: '13px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5, color: '#F0F0F8' }}>⚠ {q}</div>
                <div style={{ fontSize: 13, color: 'rgba(240,240,248,0.55)', lineHeight: 1.65 }}>{a}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div style={{ marginTop: 48, padding: '24px', background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.18)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Ready to monitor your endpoints?</div>
            <div style={{ fontSize: 12, color: 'rgba(240,240,248,0.5)' }}>Sign in to AegisTrace to get your ingest key and start collecting logs.</div>
          </div>
          <button onClick={() => navigate('/app/login')} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 22px', fontSize: 12, fontWeight: 700, cursor: 'pointer', ...mono, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
            Sign In →
          </button>
        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'rgba(240,240,248,0.3)', ...mono }}>
          <a href="/" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = '#F0F0F8'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,240,248,0.3)'}>← Home</a>
          <a href="/public" style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = '#F0F0F8'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,240,248,0.3)'}>Case Library</a>
          <a href="https://github.com/Prasanna-27eng/AegisTrace" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onMouseEnter={e => e.currentTarget.style.color = '#F0F0F8'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,240,248,0.3)'}>GitHub <ExternalLink size={10} /></a>
          <a href={AGENT_RAW_URL} target="_blank" rel="noreferrer" download="aegistrace_agent.py" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }} onMouseEnter={e => e.currentTarget.style.color = '#F0F0F8'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,240,248,0.3)'}>Download Agent <Download size={10} /></a>
        </div>
      </div>
    </div>
  );
}
