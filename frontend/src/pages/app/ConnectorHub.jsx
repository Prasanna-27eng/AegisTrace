import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plug, Check, X, RefreshCw, Upload, ChevronDown, ChevronUp, AlertCircle } from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';

const C = {
  bg: '#0A0A0A', card: var(--surface), border: '#181818',
  blue: '#4A7EC8', purple: '#8BB8E8', green: '#34D399',
  amber: '#FBBF24', red: '#F87171', muted: '#888888',
  text: '#E5E5E5',
};

const WELL_KNOWN_AI = [
  { name: 'ChatGPT',        domain: 'api.openai.com' },
  { name: 'GitHub Copilot', domain: 'api.github.com' },
  { name: 'Gemini',         domain: 'generativelanguage.googleapis.com' },
  { name: 'Claude',         domain: 'api.anthropic.com' },
  { name: 'Perplexity',     domain: 'api.perplexity.ai' },
  { name: 'Mistral',        domain: 'api.mistral.ai' },
  { name: 'Groq',           domain: 'api.groq.com' },
];

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    ok:      { color: C.green,  label: 'Connected' },
    running: { color: C.blue,   label: 'Syncing…' },
    error:   { color: C.red,    label: 'Error' },
    never:   { color: C.muted,  label: 'Not connected' },
  };
  const s = map[status] || map.never;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      background: s.color + '22', color: s.color,
      fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {s.label}
    </span>
  );
}

// ── Connector card ────────────────────────────────────────────────────────────
function ConnectorCard({ title, description, icon, status, lastSync, identitiesFound, children }) {
  const [expanded, setExpanded] = useState(status !== 'ok');

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: C.blue + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{title}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {status === 'ok' && identitiesFound > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.green, fontWeight: 700, fontSize: 18 }}>{identitiesFound}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>identities</div>
            </div>
          )}
          <StatusBadge status={status} />
          {expanded ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
        </div>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.border}` }}>
          {lastSync && (
            <div style={{ color: C.muted, fontSize: 12, padding: '10px 0 14px' }}>
              Last sync: {new Date(lastSync).toLocaleString()}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ConnectorHub() {
  const { addToast } = useStore();
  const navigate = useNavigate();

  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [aiSaved, setAiSaved]   = useState(false);

  // Okta form
  const [oktaDomain, setOktaDomain] = useState('');
  const [oktaToken,  setOktaToken]  = useState('');
  const [oktaBusy,   setOktaBusy]   = useState(false);

  // Azure form
  const [azClientId,     setAzClientId]     = useState('');
  const [azClientSecret, setAzClientSecret] = useState('');
  const [azTenantId,     setAzTenantId]     = useState('');
  const [azBusy,         setAzBusy]         = useState(false);

  // CSV
  const [csvPreview,  setCsvPreview]  = useState(null);
  const [csvBusy,     setCsvBusy]     = useState(false);

  // Approved AI
  const [approvedAI,    setApprovedAI]    = useState(WELL_KNOWN_AI.map(s => ({ ...s, checked: true })));
  const [customDomain,  setCustomDomain]  = useState('');
  const [aiSaving,      setAiSaving]      = useState(false);

  const loadConnectors = useCallback(async () => {
    try {
      const res = await api.get('/api/connectors');
      setConnectors(res.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  const getConnector = (type) => connectors.find(c => c.connector_type === type) || null;

  // ── Okta connect ─────────────────────────────────────────────────────────
  const connectOkta = async () => {
    if (!oktaDomain || !oktaToken) return addToast('Domain and API token required', 'error');
    setOktaBusy(true);
    try {
      const res = await api.post('/api/connectors/okta/connect', { okta_domain: oktaDomain, api_token: oktaToken });
      addToast(res.data.message || 'Okta connected — sync started', 'success');
      await loadConnectors();
    } catch (e) {
      addToast(e.response?.data?.detail || 'Okta connection failed', 'error');
    } finally {
      setOktaBusy(false);
    }
  };

  // ── Azure connect ─────────────────────────────────────────────────────────
  const connectAzure = async () => {
    if (!azClientId || !azClientSecret || !azTenantId) return addToast('All fields required', 'error');
    setAzBusy(true);
    try {
      const res = await api.post('/api/connectors/azure/connect', {
        client_id: azClientId, client_secret: azClientSecret, tenant_id: azTenantId,
      });
      addToast(res.data.message || 'Azure AD connected — sync started', 'success');
      await loadConnectors();
    } catch (e) {
      addToast(e.response?.data?.detail || 'Azure AD connection failed', 'error');
    } finally {
      setAzBusy(false);
    }
  };

  // ── CSV upload ────────────────────────────────────────────────────────────
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvBusy(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/api/connectors/csv/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvPreview(res.data.preview);
    } catch (e) {
      addToast('CSV upload failed', 'error');
    } finally {
      setCsvBusy(false);
    }
  };

  const confirmCsv = async () => {
    setCsvBusy(true);
    try {
      await api.post('/api/connectors/csv/confirm', { org_name: 'CSV Import' });
      addToast('CSV import started', 'success');
      setCsvPreview(null);
      await loadConnectors();
    } catch (e) {
      addToast('CSV import failed', 'error');
    } finally {
      setCsvBusy(false);
    }
  };

  // ── Manual sync ───────────────────────────────────────────────────────────
  const manualSync = async (type) => {
    try {
      await api.post(`/api/connectors/${type}/sync`);
      addToast(`${type} sync started`, 'success');
      await loadConnectors();
    } catch (e) {
      addToast('Sync failed', 'error');
    }
  };

  // ── Save approved AI ──────────────────────────────────────────────────────
  const saveApprovedAI = async () => {
    setAiSaving(true);
    try {
      const services = approvedAI
        .filter(s => s.checked)
        .map(s => ({ name: s.name, domain: s.domain }));
      if (customDomain.trim()) {
        services.push({ name: 'Custom', domain: customDomain.trim() });
      }
      await api.post('/api/connectors/approved-ai', { services });
      setAiSaved(true);
      addToast('Approved AI services saved', 'success');
      setTimeout(() => setAiSaved(false), 3000);
    } catch (e) {
      addToast('Save failed', 'error');
    } finally {
      setAiSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: C.bg,
    border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const btnStyle = (color = C.blue, busy = false) => ({
    padding: '9px 18px', borderRadius: 8, border: 'none', cursor: busy ? 'wait' : 'pointer',
    background: color + '22', color, fontSize: 13, fontWeight: 600,
    opacity: busy ? 0.6 : 1, transition: 'opacity 0.2s',
  });

  if (loading) return (
    <div style={{ padding: 40, color: C.muted, textAlign: 'center' }}>Loading connectors…</div>
  );

  const azureConn = getConnector('azure_ad');
  const oktaConn  = getConnector('okta');
  const csvConn   = getConnector('csv');

  return (
    <div style={{ padding: '32px 40px', maxWidth: 880, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Plug size={24} color={C.blue} />
          <h1 style={{ margin: 0, color: C.text, fontSize: 22, fontWeight: 700 }}>Identity Connector Hub</h1>
        </div>
        <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
          Connect your identity sources to auto-discover every user, service account, and AI agent in your environment.
        </p>
      </div>

      {/* No-connectors banner */}
      {connectors.filter(c => c.sync_status === 'ok').length === 0 && (
        <div style={{
          padding: '14px 20px', marginBottom: 28,
          background: C.amber + '15', border: `1px solid ${C.amber}40`,
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertCircle size={18} color={C.amber} />
          <div style={{ color: C.amber, fontSize: 13 }}>
            <strong>No identity source connected.</strong> Connect one below to start monitoring your identity surface.
          </div>
        </div>
      )}

      {/* Connector cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>

        {/* Azure AD */}
        <ConnectorCard
          title="Azure AD / Microsoft Entra"
          description="Auto-discover users, service principals, and app registrations"
          icon="🔷"
          status={azureConn?.sync_status || 'never'}
          lastSync={azureConn?.last_sync}
          identitiesFound={azureConn?.identities_discovered || 0}
        >
          {azureConn?.sync_status === 'ok' ? (
            <button style={btnStyle(C.blue)} onClick={() => manualSync('azure')}>
              <RefreshCw size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Sync now
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Tenant ID</div>
                  <input style={inputStyle} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={azTenantId} onChange={e => setAzTenantId(e.target.value)} />
                </div>
                <div>
                  <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Client ID</div>
                  <input style={inputStyle} placeholder="App registration client ID"
                    value={azClientId} onChange={e => setAzClientId(e.target.value)} />
                </div>
              </div>
              <div>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Client Secret</div>
                <input style={{ ...inputStyle, fontFamily: 'monospace' }} type="password"
                  placeholder="App registration client secret"
                  value={azClientSecret} onChange={e => setAzClientSecret(e.target.value)} />
              </div>
              <div style={{ color: C.muted, fontSize: 11 }}>
                Required scopes: User.Read.All · AuditLog.Read.All · Directory.Read.All
              </div>
              <button style={btnStyle(C.blue, azBusy)} onClick={connectAzure} disabled={azBusy}>
                {azBusy ? 'Connecting…' : 'Connect Azure AD'}
              </button>
              {azureConn?.last_error && (
                <div style={{ color: C.red, fontSize: 12 }}>Error: {azureConn.last_error}</div>
              )}
            </div>
          )}
        </ConnectorCard>

        {/* Okta */}
        <ConnectorCard
          title="Okta"
          description="Pull users, groups, app assignments, and sign-in logs"
          icon="🔑"
          status={oktaConn?.sync_status || 'never'}
          lastSync={oktaConn?.last_sync}
          identitiesFound={oktaConn?.identities_discovered || 0}
        >
          {oktaConn?.sync_status === 'ok' ? (
            <button style={btnStyle(C.blue)} onClick={() => manualSync('okta')}>
              <RefreshCw size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Sync now
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
              <div>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Okta Domain</div>
                <input style={inputStyle} placeholder="yourorg.okta.com"
                  value={oktaDomain} onChange={e => setOktaDomain(e.target.value)} />
              </div>
              <div>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>API Token</div>
                <input style={{ ...inputStyle, fontFamily: 'monospace' }} type="password"
                  placeholder="SSWS your-okta-api-token"
                  value={oktaToken} onChange={e => setOktaToken(e.target.value)} />
              </div>
              <button style={btnStyle(C.blue, oktaBusy)} onClick={connectOkta} disabled={oktaBusy}>
                {oktaBusy ? 'Connecting…' : 'Connect Okta'}
              </button>
            </div>
          )}
        </ConnectorCard>

        {/* CSV */}
        <ConnectorCard
          title="CSV Import"
          description="Upload a spreadsheet of identities — auto-detects columns"
          icon="📄"
          status={csvConn?.sync_status || 'never'}
          lastSync={csvConn?.last_sync}
          identitiesFound={csvConn?.identities_discovered || 0}
        >
          <div style={{ paddingTop: 16 }}>
            {!csvPreview ? (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '28px 20px', border: `2px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer',
              }}>
                <Upload size={24} color={C.muted} style={{ marginBottom: 8 }} />
                <div style={{ color: C.muted, fontSize: 13 }}>
                  {csvBusy ? 'Uploading…' : 'Click or drag a CSV file here'}
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>name, email, type, role, department</div>
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
              </label>
            ) : (
              <div>
                <div style={{ color: C.green, fontSize: 13, marginBottom: 12 }}>
                  ✓ {csvPreview.row_count} rows detected · {csvPreview.columns?.length} columns
                </div>
                {/* Column mapping preview */}
                <div style={{
                  background: C.bg, borderRadius: 8, padding: 12,
                  marginBottom: 14, fontSize: 12, color: C.muted,
                }}>
                  <div style={{ marginBottom: 6, color: C.text, fontWeight: 600 }}>Detected column mapping:</div>
                  {Object.entries(csvPreview.detected_mapping || {}).map(([col, field]) => (
                    <div key={col} style={{ marginBottom: 3 }}>
                      <span style={{ color: C.blue }}>{col}</span>
                      <span style={{ color: C.muted }}> → </span>
                      <span style={{ color: C.green }}>{field}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={btnStyle(C.green, csvBusy)} onClick={confirmCsv} disabled={csvBusy}>
                    {csvBusy ? 'Importing…' : `Import ${csvPreview.row_count} identities`}
                  </button>
                  <button style={btnStyle(C.muted)} onClick={() => setCsvPreview(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </ConnectorCard>
      </div>

      {/* Approved AI Services */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '24px 24px 20px',
      }}>
        <div style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 700 }}>Approved AI Services</h2>
          <p style={{ margin: '6px 0 18px', color: C.muted, fontSize: 13 }}>
            AegisTrace will alert on any AI API call from your endpoints that isn't on this list.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
          {approvedAI.map((svc, i) => (
            <label key={svc.name} style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              padding: '10px 14px', borderRadius: 8,
              background: svc.checked ? C.blue + '15' : C.bg,
              border: `1px solid ${svc.checked ? C.blue + '40' : C.border}`,
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                background: svc.checked ? C.blue : 'transparent',
                border: `2px solid ${svc.checked ? C.blue : C.muted}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {svc.checked && <Check size={10} color="#fff" />}
              </div>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{svc.name}</div>
                <div style={{ color: C.muted, fontSize: 10 }}>{svc.domain}</div>
              </div>
              <input type="checkbox" checked={svc.checked} style={{ display: 'none' }}
                onChange={() => setApprovedAI(prev => prev.map((s, j) => j === i ? { ...s, checked: !s.checked } : s))} />
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Add custom domain (e.g. api.yourllm.com)"
            value={customDomain} onChange={e => setCustomDomain(e.target.value)} />
        </div>
        <button style={btnStyle(aiSaved ? C.green : C.purple, aiSaving)} onClick={saveApprovedAI} disabled={aiSaving}>
          {aiSaved ? '✓ Saved' : aiSaving ? 'Saving…' : 'Save Approved Services'}
        </button>
      </div>
    </div>
  );
}
