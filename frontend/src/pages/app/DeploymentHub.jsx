import React, { useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Copy, Check, Terminal, Shield, Monitor, Server,
  ChevronDown, ChevronRight, ExternalLink, Activity,
  Zap, CheckCircle, AlertTriangle, Circle, Download,
  Cpu, GitBranch, Package, Settings, RefreshCw,
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const E = [0.23, 1, 0.32, 1];
const MONO = { fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" };
const UI   = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };

const ACCENT  = '#4A7EC8';
const ACCENT_L = '#8BB8E8';
const PURPLE  = '#A78BFA';
const SUCCESS = '#10B981';
const WARN    = '#F59E0B';
const CARD_BG = 'var(--surface, #0E0E16)';
const BORDER  = 'var(--border, rgba(74,126,200,0.1))';

/* ── Reveal wrapper ──────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ── Copy button ─────────────────────────────────────────────────────────── */
function CopyBtn({ text, small = false }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={copy} style={{
      background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(74,126,200,0.08)',
      border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : BORDER}`,
      color: copied ? SUCCESS : ACCENT_L,
      borderRadius: 4, cursor: 'pointer',
      padding: small ? '3px 8px' : '6px 12px',
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: small ? 10 : 11, transition: 'all 140ms ease',
      ...MONO,
    }}>
      {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
    </button>
  );
}

/* ── Terminal code block ─────────────────────────────────────────────────── */
function CodeBlock({ code, label, lang = 'bash', highlight = [] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 2, height: 10, background: ACCENT, borderRadius: 1 }}/>
          {label}
        </div>
      )}
      <div style={{
        background: '#030308', border: `1px solid rgba(74,126,200,0.2)`,
        borderRadius: 6, overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}>
        {/* Chrome */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', borderBottom: `1px solid rgba(74,126,200,0.1)`,
          background: 'rgba(74,126,200,0.03)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#F87171','#FBBF24','#34D399'].map(c => (
              <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.7 }}/>
            ))}
          </div>
          <CopyBtn text={code} small/>
        </div>
        {/* Code */}
        <pre style={{
          margin: 0, padding: '14px 18px',
          ...MONO, fontSize: 12.5, lineHeight: 1.7,
          color: 'var(--text-secondary, #94A3B8)',
          overflowX: 'auto', whiteSpace: 'pre',
        }}>
          {code.split('\n').map((line, i) => (
            <div key={i} style={{ color: line.startsWith('#') ? 'var(--text-muted)' : line.startsWith('$') || line.startsWith('sudo') ? ACCENT_L : 'var(--text-secondary)' }}>
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/* ── Step card ───────────────────────────────────────────────────────────── */
function Step({ n, title, icon: Icon, done = false, active = false, children }) {
  const [open, setOpen] = useState(active);
  return (
    <div style={{ border: `1px solid ${open ? 'rgba(74,126,200,0.25)' : BORDER}`,
      borderRadius: 8, overflow: 'hidden', marginBottom: 10,
      background: open ? 'rgba(74,126,200,0.03)' : CARD_BG,
      transition: 'border-color 200ms ease, background 200ms ease' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left',
      }}>
        {/* Step indicator */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? 'rgba(16,185,129,0.12)' : active ? 'rgba(74,126,200,0.12)' : 'rgba(74,126,200,0.06)',
          border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : active ? 'rgba(74,126,200,0.3)' : BORDER}`,
        }}>
          {done
            ? <CheckCircle size={15} color={SUCCESS}/>
            : Icon
              ? <Icon size={15} color={active ? ACCENT_L : 'var(--text-muted)'}/>
              : <span style={{ ...MONO, fontSize: 12, fontWeight: 700, color: active ? ACCENT_L : 'var(--text-muted)' }}>{n}</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...UI, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{title}</div>
        </div>
        {open ? <ChevronDown size={14} color="var(--text-muted)"/> : <ChevronRight size={14} color="var(--text-muted)"/>}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: E }}
          style={{ padding: '0 18px 18px' }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

/* ── OS pill ─────────────────────────────────────────────────────────────── */
function OsPill({ label, icon: Icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
      background: active ? 'rgba(74,126,200,0.12)' : 'transparent',
      border: `1px solid ${active ? 'rgba(74,126,200,0.35)' : BORDER}`,
      color: active ? ACCENT_L : 'var(--text-muted)',
      fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all 140ms ease',
      ...UI,
    }}>
      <Icon size={13}/>{label}
    </button>
  );
}

/* ── Status dot ──────────────────────────────────────────────────────────── */
function StatusDot({ active }) {
  return (
    <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%',
        background: active ? SUCCESS : 'var(--text-muted)', opacity: active ? 1 : 0.4 }}/>
      {active && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
          background: SUCCESS, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.4 }}/>
      )}
      <style>{`@keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }`}</style>
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────────────────── */
function SectionHead({ icon: Icon, title, badge, color = ACCENT, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}18`,
          border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color}/>
        </div>
        <h2 style={{ ...UI, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {badge && (
          <span style={{ ...MONO, fontSize: 9, fontWeight: 700, color, background: `${color}18`,
            border: `1px solid ${color}30`, padding: '2px 7px', borderRadius: 3, letterSpacing: '0.08em' }}>
            {badge}
          </span>
        )}
      </div>
      {children && <p style={{ ...UI, fontSize: 13.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.65 }}>{children}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function DeploymentHub() {
  const { addToast } = useStore();
  const [agentOs, setAgentOs]     = useState('linux');
  const [falcoOs, setFalcoOs]     = useState('ubuntu');
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [ingestKey, setIngestKey] = useState('');
  const [serverUrl, setServerUrl] = useState(window.location.origin);

  useEffect(() => {
    Promise.all([
      api.get('/api/endpoints').catch(() => ({ data: [] })),
      api.get('/api/admin/config').catch(() => ({ data: {} })),
    ]).then(([eps, cfg]) => {
      setEndpoints(eps.data || []);
      if (cfg.data?.ingest_api_key) setIngestKey(cfg.data.ingest_api_key);
      setLoading(false);
    });
  }, []);

  const activeEndpoints   = endpoints.filter(e => e.is_active);
  const falcoEndpoints    = endpoints.filter(e => {
    try { return JSON.parse(e.last_system_info || '{}').falco_layer3_active; }
    catch { return false; }
  });

  /* ── Agent install commands ─────────────────────────────────────────────── */
  const AGENT_CMDS = {
    linux: `# Download the agent
curl -fsSL ${serverUrl}/agent/install.sh | sudo bash

# Or manually:
curl -O ${serverUrl}/agent/aegistrace_agent.py
sudo AEGISTRACE_SERVER=${serverUrl} \\
     AEGISTRACE_API_KEY=<your-ingest-key> \\
     python3 aegistrace_agent.py`,

    macos: `# Download the agent
curl -fsSL ${serverUrl}/agent/install.sh | bash

# Set env vars and run
AEGISTRACE_SERVER=${serverUrl} \\
AEGISTRACE_API_KEY=<your-ingest-key> \\
python3 aegistrace_agent.py`,

    windows: `# PowerShell (run as Administrator)
$env:AEGISTRACE_SERVER = "${serverUrl}"
$env:AEGISTRACE_API_KEY = "<your-ingest-key>"

Invoke-WebRequest -Uri "${serverUrl}/agent/aegistrace_agent.py" -OutFile agent.py
python agent.py`,
  };

  const AGENT_SYSTEMD = `# Create systemd service for persistent agent
sudo tee /etc/systemd/system/aegistrace-agent.service > /dev/null << 'EOF'
[Unit]
Description=AegisTrace Endpoint Agent v6.2
After=network.target

[Service]
Type=simple
Environment=AEGISTRACE_SERVER=${serverUrl}
Environment=AEGISTRACE_API_KEY=<your-ingest-key>
Environment=AEGISTRACE_AUTO_BLOCK=alert
Environment=AEGISTRACE_HONEY_TOKENS=true
ExecStart=/usr/bin/python3 /opt/aegistrace/aegistrace_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now aegistrace-agent
sudo systemctl status aegistrace-agent`;

  /* ── Falco install commands ─────────────────────────────────────────────── */
  const FALCO_CMDS = {
    ubuntu: `# Step 1: Add Falco repository
curl -fsSL https://falco.org/repo/falcosecurity-packages.asc | \\
  sudo gpg --dearmor -o /usr/share/keyrings/falco-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/falco-archive-keyring.gpg] \\
  https://download.falco.org/packages/deb stable main" | \\
  sudo tee /etc/apt/sources.list.d/falcosecurity.list

# Step 2: Install Falco
sudo apt update && sudo apt install -y falco

# Step 3: Enable eBPF driver (kernel 6.x — no module signing issues)
sudo falco-driver-loader bpf

# Step 4: Start Falco with JSON output (required for AegisTrace integration)
sudo systemctl enable --now falco
# Verify: Falco writes JSON to /var/log/falco.log`,

    rhel: `# Step 1: Add Falco repository
sudo rpm --import https://falco.org/repo/falcosecurity-packages.asc
sudo curl -s -o /etc/yum.repos.d/falcosecurity.repo \\
  https://download.falco.org/packages/rpm/falcosecurity.repo

# Step 2: Install Falco
sudo yum install -y falco

# Step 3: Enable eBPF driver
sudo falco-driver-loader bpf

# Step 4: Start Falco
sudo systemctl enable --now falco`,

    docker: `# Run Falco in a privileged container (dev/test environments)
docker run --rm -it --privileged \\
  -v /var/run/docker.sock:/host/var/run/docker.sock \\
  -v /dev:/host/dev \\
  -v /proc:/host/proc:ro \\
  -v /boot:/host/boot:ro \\
  -v /lib/modules:/host/lib/modules:ro \\
  -v /usr:/host/usr:ro \\
  -v /var/log:/var/log \\
  -e HOST_ROOT=/host \\
  --name falco falcosecurity/falco:latest \\
  falco -o json_output=true -o json_include_output_property=true`,
  };

  const FALCO_CONFIG = `# /etc/falco/falco.yaml — required settings for AegisTrace integration
json_output: true                    # REQUIRED: AegisTrace reads JSON
json_include_output_property: true   # Include full output string
log_level: info
file_output:
  enabled: true
  keep_alive: false
  filename: /var/log/falco.log       # AegisTrace agent tails this file

# Verify config and test:
sudo falco --validate /etc/falco/falco.yaml
sudo systemctl restart falco
sudo journalctl -u falco -f          # Watch for events`;

  const FALCO_VERIFY = `# Trigger a test Falco alert (open a shell in a container)
docker run --rm -it ubuntu bash     # Triggers: "Terminal shell in container"

# Check Falco is writing JSON:
tail -f /var/log/falco.log | python3 -m json.tool

# Check AegisTrace is receiving Falco events (in agent logs):
journalctl -u aegistrace-agent -f | grep -i falco

# Expected output:
# [falco] Layer 3 active — tailing /var/log/falco.log
# [falco] 1 new Falco event(s) forwarded`;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        .tab-row { display: flex; gap: 8; flex-wrap: wrap; margin-bottom: 18px; }
      `}</style>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/assets/brand/aegistrace-icon-transparent.png" alt=""
              style={{ width: 36, height: 36, objectFit: 'contain',
                filter: 'drop-shadow(0 0 8px rgba(74,126,200,0.6))' }}/>
            <div>
              <h1 style={{ ...UI, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Deployment Hub
              </h1>
              <p style={{ ...UI, fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Endpoint Agent v6.2 · Falco Layer 3 eBPF
              </p>
            </div>
          </div>

          {/* Live endpoint stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Active Endpoints', value: loading ? '—' : activeEndpoints.length, color: SUCCESS },
              { label: 'Falco Layer 3',    value: loading ? '—' : falcoEndpoints.length,  color: PURPLE },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ ...UI, fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ ...MONO, fontSize: 9, color: 'var(--text-muted)', marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── Live endpoints strip ──────────────────────────────────────────── */}
      {!loading && endpoints.length > 0 && (
        <Reveal delay={0.05}>
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
            <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Connected Endpoints
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {endpoints.slice(0, 12).map(ep => {
                let falcoActive = false;
                try { falcoActive = JSON.parse(ep.last_system_info || '{}').falco_layer3_active; } catch {}
                return (
                  <div key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(74,126,200,0.06)', border: `1px solid ${BORDER}`,
                    borderRadius: 5, padding: '5px 10px' }}>
                    <StatusDot active={ep.is_active}/>
                    <span style={{ ...MONO, fontSize: 11, color: 'var(--text-secondary)' }}>{ep.hostname}</span>
                    {falcoActive && (
                      <span style={{ ...MONO, fontSize: 9, color: PURPLE, background: 'rgba(167,139,250,0.12)',
                        border: '1px solid rgba(167,139,250,0.2)', padding: '1px 5px', borderRadius: 3 }}>eBPF</span>
                    )}
                  </div>
                );
              })}
              {endpoints.length > 12 && (
                <div style={{ ...UI, fontSize: 12, color: 'var(--text-muted)', padding: '5px 8px' }}>
                  +{endpoints.length - 12} more
                </div>
              )}
            </div>
          </div>
        </Reveal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1: ENDPOINT AGENT
      ════════════════════════════════════════════════════════════════════ */}
      <Reveal delay={0.08}>
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          <SectionHead icon={Shield} title="Endpoint Agent" badge="v6.2" color={ACCENT}>
            Lightweight Python agent — deploys in seconds, ships telemetry every 30s. Includes honey tokens,
            YARA-lite, DNS/DGA detection, auto-block, vulnerability scanner, and HMAC-signed telemetry.
          </SectionHead>

          {/* What it detects */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 8, marginBottom: 22 }}>
            {[
              ['🍯', 'Honey Token Trap'],
              ['📋', 'YARA-lite (~40 rules)'],
              ['🌐', 'DNS/DGA Detection'],
              ['🔒', 'Auto-Block Engine'],
              ['🔍', 'Vulnerability Scanner'],
              ['💾', 'Persistence Monitor'],
              ['⚡', 'HMAC-Signed Telemetry'],
              ['🛡️', 'Guardian Process'],
            ].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', background: 'rgba(74,126,200,0.04)',
                border: `1px solid ${BORDER}`, borderRadius: 6 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ ...UI, fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* OS tabs */}
          <div className="tab-row">
            {[['linux','Linux', Server], ['macos','macOS', Monitor], ['windows','Windows', Cpu]].map(([id, label, Icon]) => (
              <OsPill key={id} label={label} icon={Icon} active={agentOs === id} onClick={() => setAgentOs(id)}/>
            ))}
          </div>

          <Step n={1} title="Download & run the agent" icon={Download} active>
            <CodeBlock code={AGENT_CMDS[agentOs]} label="Install"/>
            {ingestKey && (
              <div style={{ background: 'rgba(74,126,200,0.06)', border: `1px solid rgba(74,126,200,0.2)`,
                borderRadius: 6, padding: '10px 14px', marginTop: 8 }}>
                <div style={{ ...MONO, fontSize: 10, color: ACCENT_L, marginBottom: 4 }}>YOUR INGEST KEY</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ ...MONO, fontSize: 12, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>{ingestKey}</code>
                  <CopyBtn text={ingestKey} small/>
                </div>
              </div>
            )}
          </Step>

          {agentOs === 'linux' && (
            <Step n={2} title="Register as a systemd service (persistent)" icon={Settings}>
              <CodeBlock code={AGENT_SYSTEMD} label="systemd service"/>
            </Step>
          )}

          <Step n={agentOs === 'linux' ? 3 : 2} title="Verify the agent is reporting" icon={Activity}>
            <CodeBlock code={`# Check the agent is sending telemetry
curl -s ${serverUrl}/api/health | python3 -m json.tool

# In the AegisTrace dashboard: Endpoints → look for your hostname
# The agent should appear within 30 seconds of first run`} label="Verify"/>
          </Step>

          {/* Environment variables reference */}
          <details style={{ marginTop: 16 }}>
            <summary style={{ ...UI, fontSize: 13, fontWeight: 500, color: ACCENT_L, cursor: 'pointer',
              listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronRight size={13}/> Environment variable reference
            </summary>
            <div style={{ marginTop: 12, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', ...MONO, fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {['Variable', 'Default', 'Description'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 9 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['AEGISTRACE_SERVER', window.location.origin, 'AegisTrace server URL'],
                    ['AEGISTRACE_API_KEY', '—', 'Ingest API key (required)'],
                    ['AEGISTRACE_AUTO_BLOCK', 'off', 'off | alert | block'],
                    ['AEGISTRACE_HONEY_TOKENS', 'true', 'Plant canary credential files'],
                    ['AEGISTRACE_INTERVAL', '30', 'Telemetry interval in seconds'],
                  ].map(([k, v, d]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: '7px 10px', color: ACCENT_L }}>{k}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>{v}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--text-secondary)', ...UI, fontSize: 12 }}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </Reveal>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2: FALCO LAYER 3
      ════════════════════════════════════════════════════════════════════ */}
      <Reveal delay={0.12}>
        <div style={{ background: CARD_BG, border: `1px solid rgba(167,139,250,0.2)`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
          <SectionHead icon={Zap} title="Falco Layer 3 — eBPF / Kernel Visibility" badge="v6.2 NEW" color={PURPLE}>
            Falco uses eBPF to intercept system calls at the kernel level — process spawns, file opens,
            network connections, privilege escalation. AegisTrace picks up Falco's JSON output automatically
            once installed. No agent restart needed.
          </SectionHead>

          {/* How it works diagram */}
          <div style={{ background: '#030308', border: `1px solid rgba(167,139,250,0.15)`, borderRadius: 8,
            padding: '16px 20px', marginBottom: 22, ...MONO, fontSize: 12 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 10, letterSpacing: '0.1em' }}>HOW IT WORKS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
              <span style={{ color: PURPLE }}>Kernel syscalls (eBPF)</span>
              <ChevronRight size={12} color="var(--text-muted)"/>
              <span>Falco rules engine</span>
              <ChevronRight size={12} color="var(--text-muted)"/>
              <span style={{ color: ACCENT_L }}>/var/log/falco.log (JSON)</span>
              <ChevronRight size={12} color="var(--text-muted)"/>
              <span>AegisTrace agent (tails file)</span>
              <ChevronRight size={12} color="var(--text-muted)"/>
              <span style={{ color: SUCCESS }}>ITDRAlert created</span>
            </div>
          </div>

          {/* Requirement: kernel version */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Linux kernel ≥ 4.14', ok: true, note: 'eBPF requires 4.14+; best on 5.8+' },
              { label: 'Requires root / CAP_SYS_ADMIN', ok: true, note: 'eBPF programs need kernel privileges' },
              { label: 'Not macOS / Windows', ok: false, note: 'eBPF is Linux-only' },
            ].map(({ label, ok, note }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 12px', background: ok ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 5 }}>
                {ok ? <CheckCircle size={12} color={SUCCESS}/> : <AlertTriangle size={12} color="#EF4444"/>}
                <div>
                  <div style={{ ...UI, fontSize: 12, fontWeight: 500, color: ok ? SUCCESS : '#EF4444' }}>{label}</div>
                  <div style={{ ...UI, fontSize: 10, color: 'var(--text-muted)' }}>{note}</div>
                </div>
              </div>
            ))}
          </div>

          {/* OS tabs */}
          <div className="tab-row">
            {[['ubuntu','Ubuntu / Debian', Server], ['rhel','RHEL / CentOS', Server], ['docker','Docker', Package]].map(([id, label, Icon]) => (
              <OsPill key={id} label={label} icon={Icon} active={falcoOs === id} onClick={() => setFalcoOs(id)}/>
            ))}
          </div>

          <Step n={1} title="Install Falco" icon={Download} active>
            <CodeBlock code={FALCO_CMDS[falcoOs]} label={falcoOs === 'ubuntu' ? 'Ubuntu / Debian' : falcoOs === 'rhel' ? 'RHEL / CentOS' : 'Docker'}/>
          </Step>

          <Step n={2} title="Configure Falco for JSON output (required)" icon={Settings}>
            <div style={{ ...UI, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
              AegisTrace reads <code style={MONO}>/var/log/falco.log</code> and expects JSON format.
              Ensure these settings are in <code style={MONO}>/etc/falco/falco.yaml</code>:
            </div>
            <CodeBlock code={FALCO_CONFIG} label="falco.yaml"/>
          </Step>

          <Step n={3} title="Verify integration" icon={Activity}>
            <CodeBlock code={FALCO_VERIFY} label="Verification"/>
          </Step>

          {/* MITRE coverage */}
          <details style={{ marginTop: 16 }}>
            <summary style={{ ...UI, fontSize: 13, fontWeight: 500, color: PURPLE, cursor: 'pointer',
              listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronRight size={13}/> Falco rule → MITRE ATT&CK mapping (22 rules)
            </summary>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 6 }}>
              {[
                ['Write below binary dir',       'T1543', 'Create/Modify System Process'],
                ['Read sensitive file',           'T1552.001', 'Credentials in Files'],
                ['Terminal shell in container',   'T1059.004', 'Unix Shell'],
                ['Ptrace attached to process',    'T1055.008', 'Ptrace System Calls'],
                ['Fileless execution via memfd',  'T1620', 'Reflective Code Loading'],
                ['Linux Kernel Module Injection', 'T1215', 'Kernel Modules'],
                ['Outbound Connection to C2',     'T1041', 'C2 Exfiltration'],
                ['Sudo Privilege Escalation',     'T1548.003', 'Sudo Caching'],
                ['Container Drift Detected',      'T1610', 'Deploy Container'],
                ['Mount Sensitive Paths',         'T1611', 'Escape to Host'],
              ].map(([rule, id, name]) => (
                <div key={rule} style={{ display: 'flex', gap: 8, padding: '7px 10px',
                  background: 'rgba(167,139,250,0.04)', border: `1px solid rgba(167,139,250,0.12)`, borderRadius: 5 }}>
                  <code style={{ ...MONO, fontSize: 10, color: PURPLE, flexShrink: 0, paddingTop: 1 }}>{id}</code>
                  <div>
                    <div style={{ ...UI, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{rule}</div>
                    <div style={{ ...UI, fontSize: 10, color: 'var(--text-muted)' }}>{name}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </Reveal>

      {/* ── Quick reference card ──────────────────────────────────────────── */}
      <Reveal delay={0.16}>
        <div style={{ background: 'rgba(74,126,200,0.04)', border: `1px solid rgba(74,126,200,0.15)`,
          borderRadius: 10, padding: 20 }}>
          <div style={{ ...MONO, fontSize: 10, color: ACCENT_L, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 14 }}>Quick Reference</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
            {[
              { icon: Activity,    label: 'Endpoints dashboard', path: '/app/endpoints', color: ACCENT },
              { icon: Shield,      label: 'ITDR alerts (incl. Falco)', path: '/app/itdr', color: ACCENT },
              { icon: GitBranch,   label: 'Identity Graph',       path: '/app/identity-graph', color: ACCENT_L },
              { icon: Terminal,    label: 'Terminal Lab',          path: '/app/terminal-lab', color: ACCENT_L },
            ].map(({ icon: Icon, label, path, color }) => (
              <a key={path} href={path} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: 'rgba(74,126,200,0.06)',
                border: `1px solid ${BORDER}`, borderRadius: 6,
                textDecoration: 'none', transition: 'border-color 140ms, background 140ms' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,126,200,0.3)'; e.currentTarget.style.background = 'rgba(74,126,200,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'rgba(74,126,200,0.06)'; }}
              >
                <Icon size={15} color={color}/>
                <span style={{ ...UI, fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                <ChevronRight size={12} color="var(--text-muted)" style={{ marginLeft: 'auto' }}/>
              </a>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
