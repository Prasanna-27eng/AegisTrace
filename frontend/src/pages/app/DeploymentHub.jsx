import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Copy, Check, Terminal, Shield, Monitor, Server,
  ChevronDown, ChevronRight, Activity, CheckCircle,
  AlertTriangle, Circle, Download, Cpu, Package,
  Settings, RefreshCw, Key, Zap,
} from '../../components/icons';
import api from '../../api/client';

const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const UI   = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const FADE = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const EASE = { duration: 0.3, ease: [0.23, 1, 0.32, 1] };

const BLUE  = '#2563EB';
const BLUE_L = 'rgba(26,22,18,0.7)';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const RED   = '#EF4444';
const MUTED = 'rgba(26,22,18,0.660)';

/* ── Copy button ─────────────────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={copy} style={{
      background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(26,22,18,0.08)',
      border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(26,22,18,0.14)'}`,
      color: copied ? GREEN : BLUE_L,
      borderRadius: 4, cursor: 'pointer',
      padding: '4px 10px',
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, transition: 'all 140ms',
      ...MONO,
    }}>
      {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy</>}
    </button>
  );
}

/* ── Code block ──────────────────────────────────────────────────────────── */
function CodeBlock({ code, label }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ ...MONO, fontSize: 10, color: MUTED, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 6 }}>
          {label}
        </div>
      )}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid rgba(26,22,18,0.12)',
        borderRadius: 8, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', borderBottom: '1px solid rgba(26,22,18,0.08)',
          background: 'rgba(26,22,18,0.018)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#F87171','#FBBF24','#34D399'].map(c => (
              <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.6 }}/>
            ))}
          </div>
          <CopyBtn text={code} />
        </div>
        <pre style={{
          margin: 0, padding: '14px 18px',
          ...MONO, fontSize: 12.5, lineHeight: 1.75,
          color: '#94A3B8',
          overflowX: 'auto', whiteSpace: 'pre',
        }}>
          {code.split('\n').map((line, i) => (
            <div key={i} style={{
              color: line.startsWith('#') ? MUTED
                   : line.startsWith('$') || line.startsWith('sudo') ? BLUE_L
                   : '#94A3B8',
            }}>
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/* ── Section card ────────────────────────────────────────────────────────── */
function Section({ icon: Icon, title, color = BLUE, children, delay = 0 }) {
  return (
    <motion.div {...FADE} transition={{ ...EASE, delay }}
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(26,22,18,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 22px',
        borderBottom: '1px solid rgba(26,22,18,0.07)',
        background: 'rgba(26,22,18,0.03)',
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 8,
          background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{ ...UI, fontWeight: 600, fontSize: '0.92rem', color: '#D0D4DF' }}>{title}</span>
      </div>
      <div style={{ padding: '20px 22px' }}>{children}</div>
    </motion.div>
  );
}

/* ── Step row ────────────────────────────────────────────────────────────── */
function Step({ n, title, children }) {
  const [open, setOpen] = useState(n <= 2);
  return (
    <div style={{ marginBottom: 12, border: '1px solid rgba(26,22,18,0.07)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: open ? 'rgba(26,22,18,0.036)' : 'rgba(26,22,18,0.03)',
          border: 'none', cursor: 'pointer', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }}
      >
        <div style={{ width: 24, height: 24, borderRadius: '50%',
          background: open ? 'rgba(26,22,18,0.14)' : 'rgba(26,22,18,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0 }}>
          <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: open ? BLUE_L : MUTED }}>{n}</span>
        </div>
        <span style={{ ...UI, fontSize: '0.85rem', fontWeight: 500, color: open ? '#D0D4DF' : '#8090A8', flex: 1, textAlign: 'left' }}>{title}</span>
        {open ? <ChevronDown size={14} color={MUTED} /> : <ChevronRight size={14} color={MUTED} />}
      </button>
      {open && <div style={{ padding: '4px 16px 16px 52px' }}>{children}</div>}
    </div>
  );
}

/* ── OS pill ─────────────────────────────────────────────────────────────── */
function OsPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
      background: active ? 'rgba(26,22,18,0.12)' : 'rgba(26,22,18,0.05)',
      border: `1px solid ${active ? 'rgba(204,120,92,0.3)' : 'rgba(26,22,18,0.09)'}`,
      color: active ? BLUE_L : MUTED,
      fontSize: 12, ...MONO, transition: 'all 140ms',
    }}>{label}</button>
  );
}

/* ── Status badge ────────────────────────────────────────────────────────── */
function StatusDot({ active }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%',
        background: active ? GREEN : MUTED,
        boxShadow: active ? `0 0 6px ${GREEN}` : 'none' }} />
      <span style={{ ...MONO, fontSize: 11, color: active ? GREEN : MUTED }}>
        {active ? 'active' : 'none'}
      </span>
    </span>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function DeploymentHub() {
  const [agentOs, setAgentOs] = useState('linux');
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const origin = window.location.origin;

  useEffect(() => {
    api.get('/api/endpoints')
      .then(r => setEndpoints(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = endpoints.filter(e => e.is_active).length;

  const AGENT_CMDS = {
    linux: `# 1. Download and run the install script
curl -fsSL ${origin}/agent/install.sh | sudo bash

# Or install manually:
curl -O ${origin}/agent/aegistrace_agent.py
sudo AEGISTRACE_SERVER=${origin} \\
     AEGISTRACE_API_KEY=<your-ingest-key> \\
     python3 aegistrace_agent.py --install`,

    mac: `# 1. Download the agent
curl -fsSL ${origin}/agent/aegistrace_agent.py -o aegistrace_agent.py

# 2. Run with your server details
AEGISTRACE_SERVER=${origin} \\
AEGISTRACE_API_KEY=<your-ingest-key> \\
python3 aegistrace_agent.py

# 3. Install as a LaunchDaemon (persistent)
sudo AEGISTRACE_SERVER=${origin} \\
     AEGISTRACE_API_KEY=<your-ingest-key> \\
     python3 aegistrace_agent.py --install`,

    windows: `# PowerShell (Run as Administrator)

# 1. Download the agent
Invoke-WebRequest -Uri "${origin}/agent/aegistrace_agent.py" \`
  -OutFile C:\\aegistrace\\aegistrace_agent.py

# 2. Set environment variables
$env:AEGISTRACE_SERVER = "${origin}"
$env:AEGISTRACE_API_KEY = "<your-ingest-key>"

# 3. Install as a Windows Service
python3 C:\\aegistrace\\aegistrace_agent.py --install`,
  };

  const VERIFY_CMD = `# Verify agent is reporting
curl -s ${origin}/api/endpoints | python3 -m json.tool | grep -E "hostname|is_active"

# Check agent logs (Linux/macOS)
sudo journalctl -u aegistrace-agent -f

# Expected output:
# [agent] Connected to ${origin}
# [agent] Sending heartbeat... OK
# [agent] Telemetry sent: cpu=12% mem=45% procs=142`;

  const INGEST_KEY_CMD = `# Generate a new ingest key via the API
curl -s -X POST ${origin}/api/ingest/keys \\
     -H "Authorization: Bearer <your-jwt-token>" \\
     -H "Content-Type: application/json" \\
     -d '{"label": "my-endpoint", "description": "Production server"}' | python3 -m json.tool`;

  const DOCKER_CMD = `# Deploy AegisTrace as Docker containers
git clone https://github.com/Prasanna-27eng/AegisTrace.git
cd AegisTrace

# Copy example env and fill in values
cp backend/.env.example backend/.env
nano backend/.env   # set DATABASE_URL, GROQ_API_KEY, SECRET_KEY

# Build and run
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f backend`;

  const SYSTEMD_CMD = `# Create systemd service for AegisTrace backend
sudo tee /etc/systemd/system/aegistrace.service << 'EOF'
[Unit]
Description=AegisTrace ITDR Backend
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/aegistrace/backend
EnvironmentFile=/opt/aegistrace/backend/.env
ExecStart=/opt/aegistrace/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now aegistrace
sudo systemctl status aegistrace`;

  const NGINX_CMD = `# Nginx reverse proxy config
sudo tee /etc/nginx/sites-available/aegistrace << 'EOF'
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    root /opt/aegistrace/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / { try_files $uri $uri/ /index.html; }
}
EOF

sudo ln -s /etc/nginx/sites-available/aegistrace /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx`;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <motion.div {...FADE} transition={EASE} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ ...UI, fontSize: '1.4rem', fontWeight: 700, color: '#E0E4EE', margin: 0, marginBottom: 4 }}>
              Deployment Hub
            </h1>
            <p style={{ ...UI, fontSize: '0.82rem', color: MUTED, margin: 0 }}>
              Endpoint agent setup, server deployment, and integration commands
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Active Endpoints', value: loading ? '—' : active, color: GREEN },
              { label: 'Total Enrolled',   value: loading ? '—' : endpoints.length, color: BLUE_L },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--surface)', border: '1px solid rgba(26,22,18,0.08)',
                borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 90 }}>
                <div style={{ ...UI, fontSize: '1.5rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ ...MONO, fontSize: 9, color: MUTED, marginTop: 4, letterSpacing: '0.08em',
                  textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Enrolled endpoints strip */}
      {!loading && endpoints.length > 0 && (
        <motion.div {...FADE} transition={{ ...EASE, delay: 0.05 }}
          style={{ background: 'var(--surface)', border: '1px solid rgba(26,22,18,0.08)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ ...MONO, fontSize: 10, color: MUTED, letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 10 }}>Enrolled Endpoints</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {endpoints.slice(0, 12).map(ep => (
              <div key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(26,22,18,0.04)', border: '1px solid rgba(26,22,18,0.07)',
                borderRadius: 6, padding: '5px 10px' }}>
                <StatusDot active={ep.is_active} />
                <span style={{ ...MONO, fontSize: 11, color: '#94A3B8' }}>{ep.hostname || ep.host_ip}</span>
              </div>
            ))}
            {endpoints.length > 12 && (
              <div style={{ ...MONO, fontSize: 11, color: MUTED, padding: '5px 10px' }}>
                +{endpoints.length - 12} more
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Section 1: Endpoint Agent ── */}
      <Section icon={Monitor} title="Endpoint Agent Installation" delay={0.08}>
        <p style={{ ...UI, fontSize: '0.82rem', color: MUTED, marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
          The AegisTrace agent collects process telemetry, network connections, login events,
          and file integrity data. It streams to this server every 30 seconds.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {[['linux','Linux'], ['mac','macOS'], ['windows','Windows']].map(([id, label]) => (
            <OsPill key={id} label={label} active={agentOs === id} onClick={() => setAgentOs(id)} />
          ))}
        </div>

        <Step n={1} title="Generate an Ingest API Key">
          <p style={{ ...UI, fontSize: '0.8rem', color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
            Each endpoint needs a unique ingest key. Generate one from Settings → API Keys,
            or via the API:
          </p>
          <CodeBlock code={INGEST_KEY_CMD} />
        </Step>

        <Step n={2} title="Install the Agent">
          <CodeBlock code={AGENT_CMDS[agentOs]} label={`${agentOs} installation`} />
        </Step>

        <Step n={3} title="Verify the Connection">
          <CodeBlock code={VERIFY_CMD} />
          <p style={{ ...UI, fontSize: '0.78rem', color: MUTED, marginTop: 10 }}>
            The endpoint should appear in the Endpoints dashboard within 60 seconds.
          </p>
        </Step>
      </Section>

      {/* ── Section 2: Server Deployment ── */}
      <Section icon={Server} title="Server Deployment" color={AMBER} delay={0.12}>

        <Step n={1} title="systemd Service (Recommended for VPS)">
          <p style={{ ...UI, fontSize: '0.8rem', color: MUTED, marginBottom: 10 }}>
            Manages the backend process, auto-restarts on failure, survives reboots.
          </p>
          <CodeBlock code={SYSTEMD_CMD} label="systemd setup" />
        </Step>

        <Step n={2} title="Nginx Reverse Proxy">
          <p style={{ ...UI, fontSize: '0.8rem', color: MUTED, marginBottom: 10 }}>
            Serves the React frontend as static files and proxies API calls to the backend.
          </p>
          <CodeBlock code={NGINX_CMD} label="nginx config" />
        </Step>

        <Step n={3} title="Docker Compose (Alternative)">
          <CodeBlock code={DOCKER_CMD} label="docker deployment" />
        </Step>
      </Section>

      {/* ── Section 3: Environment Variables ── */}
      <Section icon={Key} title="Required Environment Variables" color={GREEN} delay={0.16}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {[
            { key: 'DATABASE_URL',     example: 'postgresql://user:pass@localhost/aegistrace_db', required: true,  note: 'PostgreSQL connection string' },
            { key: 'SECRET_KEY',       example: 'openssl rand -hex 32',                           required: true,  note: 'JWT signing secret (32+ bytes)' },
            { key: 'GROQ_API_KEY',     example: 'gsk_xxxxxxxxxxxx',                               required: true,  note: 'AI features — free at console.groq.com' },
            { key: 'VT_API_KEY',       example: '<virustotal key>',                               required: false, note: 'VirusTotal IOC enrichment (optional)' },
            { key: 'SHODAN_API_KEY',   example: '<shodan key>',                                   required: false, note: 'Shodan host intelligence (optional)' },
            { key: 'ALLOWED_ORIGINS',  example: `https://your-domain.com`,                        required: false, note: 'CORS origins (defaults to *)' },
          ].map(({ key, example, required, note }) => (
            <div key={key} style={{ background: 'rgba(26,22,18,0.03)', border: '1px solid rgba(26,22,18,0.08)',
              borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <code style={{ ...MONO, fontSize: 12, color: required ? BLUE_L : MUTED }}>{key}</code>
                {required && (
                  <span style={{ ...MONO, fontSize: 9, background: 'rgba(239,68,68,0.1)',
                    color: RED, border: '1px solid rgba(239,68,68,0.2)', borderRadius: 3, padding: '1px 5px' }}>
                    required
                  </span>
                )}
              </div>
              <div style={{ ...UI, fontSize: '0.75rem', color: MUTED, marginBottom: 6 }}>{note}</div>
              <code style={{ ...MONO, fontSize: 10, color: '#5A6A7E' }}>{example}</code>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Section 4: Health check ── */}
      <Section icon={Activity} title="Health Check & Troubleshooting" color={BLUE_L} delay={0.2}>
        <CodeBlock code={`# Check all services
systemctl status aegistrace nginx postgresql

# View backend logs
journalctl -u aegistrace -n 50 --no-pager

# Test the API
curl -s ${origin}/api/health
curl -s ${origin}/api/cases | python3 -m json.tool | head -20

# Check PostgreSQL connection
sudo -u postgres psql -c "\\l"
sudo -u postgres psql aegistrace_db -c "SELECT COUNT(*) FROM \\"case\\";"`} />

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {[
            { icon: Zap,      label: 'Dashboard',       path: '/app/dashboard',    color: BLUE   },
            { icon: Monitor,  label: 'Endpoints',        path: '/app/endpoints',    color: GREEN  },
            { icon: Shield,   label: 'ITDR Alerts',      path: '/app/itdr',         color: AMBER  },
            { icon: Terminal, label: 'Terminal Lab',      path: '/app/terminal-lab', color: BLUE_L },
          ].map(({ icon: Icon, label, path, color }) => (
            <a key={path} href={path} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: 'rgba(26,22,18,0.03)',
              border: '1px solid rgba(26,22,18,0.08)', borderRadius: 8,
              textDecoration: 'none', transition: 'border-color 150ms, background 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(26,22,18,0.150)'; e.currentTarget.style.background = 'rgba(26,22,18,0.030)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,22,18,0.08)'; e.currentTarget.style.background = 'rgba(26,22,18,0.03)'; }}
            >
              <Icon size={14} color={color} />
              <span style={{ ...UI, fontSize: '0.82rem', color: '#8090A8' }}>{label}</span>
              <ChevronRight size={12} color={MUTED} style={{ marginLeft: 'auto' }} />
            </a>
          ))}
        </div>
      </Section>

    </div>
  );
}
