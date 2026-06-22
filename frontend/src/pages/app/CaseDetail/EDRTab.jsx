import React, { useState, useEffect } from 'react';
import {
  Search, Shield, ShieldOff, Cpu, XCircle, Terminal,
  CheckCircle, AlertTriangle, Loader2, ChevronDown, ChevronRight,
  Activity, Lock, Unlock
} from 'lucide-react';
import api from '../../../api/client';

const PLATFORM_LABELS = {
  crowdstrike: 'CrowdStrike Falcon',
  sentinelone:  'SentinelOne',
  carbonblack:  'Carbon Black',
};

const PLATFORM_COLORS = {
  crowdstrike: '#EF4444',
  sentinelone:  '#8BB8E8',
  carbonblack:  '#22C55E',
};

const ACTION_ICONS = {
  isolate:       <Lock size={12} />,
  un_isolate:    <Unlock size={12} />,
  list_processes:<Cpu size={12} />,
  kill_process:  <XCircle size={12} />,
  run_command:   <Terminal size={12} />,
};

function StatusDot({ ok }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: ok ? '#22C55E' : '#888888',
      boxShadow: ok ? '0 0 6px #22C55E55' : 'none',
      flexShrink: 0,
    }} />
  );
}

function PlatformBadge({ platform }) {
  const color = PLATFORM_COLORS[platform] || '#787878';
  return (
    <span style={{
      fontSize: '0.62rem', fontFamily: 'JetBrains Mono', fontWeight: 600,
      padding: '2px 6px', borderRadius: 4, background: `${color}22`, color,
    }}>
      {platform?.toUpperCase()}
    </span>
  );
}

function IsolationBadge({ status }) {
  const isolated = status === 'isolated' || status === 'contained' || status === 'containment_pending';
  return (
    <span style={{
      fontSize: '0.62rem', fontFamily: 'JetBrains Mono', fontWeight: 600,
      padding: '2px 6px', borderRadius: 4,
      background: isolated ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)',
      color: isolated ? '#EF4444' : '#22C55E',
    }}>
      {isolated ? '🔴 ISOLATED' : '🟢 CONNECTED'}
    </span>
  );
}

export default function EDRTab({ caseData }) {
  const [edrStatus, setEdrStatus]     = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching]     = useState(false);
  const [endpoints, setEndpoints]     = useState([]);
  const [selected, setSelected]       = useState(null);   // selected endpoint object
  const [processes, setProcesses]     = useState([]);
  const [loadingProcs, setLoadingProcs] = useState(false);
  const [actionLog, setActionLog]     = useState([]);
  const [loadingAction, setLoadingAction] = useState('');
  const [cmdInput, setCmdInput]       = useState('');
  const [cmdOutput, setCmdOutput]     = useState('');
  const [pidInput, setPidInput]       = useState('');
  const [procFilter, setProcFilter]   = useState('');
  const [history, setHistory]         = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load EDR platform status + case-scoped history on mount
  useEffect(() => {
    api.get('/api/edr/status').then(r => setEdrStatus(r.data)).catch(() => {});
    if (caseData?.id) {
      api.get(`/api/edr/history?case_id=${caseData.id}&limit=20`)
        .then(r => setHistory(r.data)).catch(() => {});
    }
  }, [caseData?.id]);

  // Pre-populate search from case affected_systems
  useEffect(() => {
    if (caseData?.affected_systems && !searchQuery) {
      const firstHost = caseData.affected_systems.split(/[,\n;]/)[0].trim();
      if (firstHost) setSearchQuery(firstHost);
    }
  }, [caseData?.affected_systems]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSelected(null);
    setProcesses([]);
    setCmdOutput('');
    try {
      const r = await api.get(`/api/edr/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setEndpoints(r.data.results || []);
      if (Object.keys(r.data.errors || {}).length) {
        const errs = Object.entries(r.data.errors).map(([p, e]) => `${p}: ${e}`).join('; ');
        addLog('error', `Search errors — ${errs}`);
      }
    } catch (e) {
      addLog('error', `Search failed: ${e.response?.data?.detail || e.message}`);
    }
    setSearching(false);
  };

  const addLog = (type, msg) => {
    setActionLog(prev => [{ type, msg, ts: new Date().toISOString() }, ...prev].slice(0, 30));
  };

  const handleIsolate = async (ep) => {
    if (!window.confirm(`Isolate ${ep.hostname} from the network? This will cut all network connections.`)) return;
    setLoadingAction(`isolate-${ep.endpoint_id}`);
    try {
      await api.post(`/api/edr/endpoints/${ep.platform}/${ep.endpoint_id}/isolate`, {
        case_id: caseData?.id, hostname: ep.hostname, note: `Isolated via AegisTrace case ${caseData?.case_number}`
      });
      addLog('success', `✅ ${ep.hostname} isolated successfully (${ep.platform})`);
      setSelected(prev => prev ? { ...prev, isolation_status: 'isolated' } : prev);
      setEndpoints(prev => prev.map(e =>
        e.endpoint_id === ep.endpoint_id ? { ...e, isolation_status: 'isolated' } : e
      ));
      refreshHistory();
    } catch (e) {
      addLog('error', `❌ Isolation failed: ${e.response?.data?.detail || e.message}`);
    }
    setLoadingAction('');
  };

  const handleUnIsolate = async (ep) => {
    if (!window.confirm(`Lift isolation from ${ep.hostname}? This will restore network access.`)) return;
    setLoadingAction(`unisolate-${ep.endpoint_id}`);
    try {
      await api.post(`/api/edr/endpoints/${ep.platform}/${ep.endpoint_id}/un-isolate`, {
        case_id: caseData?.id, hostname: ep.hostname
      });
      addLog('success', `✅ Isolation lifted from ${ep.hostname} (${ep.platform})`);
      setSelected(prev => prev ? { ...prev, isolation_status: 'connected' } : prev);
      setEndpoints(prev => prev.map(e =>
        e.endpoint_id === ep.endpoint_id ? { ...e, isolation_status: 'connected' } : e
      ));
      refreshHistory();
    } catch (e) {
      addLog('error', `❌ Un-isolation failed: ${e.response?.data?.detail || e.message}`);
    }
    setLoadingAction('');
  };

  const handleListProcesses = async (ep) => {
    setLoadingProcs(true);
    setProcesses([]);
    try {
      const r = await api.get(`/api/edr/endpoints/${ep.platform}/${ep.endpoint_id}/processes`);
      setProcesses(r.data.processes || []);
      addLog('info', `📋 Retrieved ${r.data.count} processes from ${ep.hostname}`);
      refreshHistory();
    } catch (e) {
      addLog('error', `❌ Process list failed: ${e.response?.data?.detail || e.message}`);
    }
    setLoadingProcs(false);
  };

  const handleKillProcess = async () => {
    const pid = pidInput.trim();
    if (!pid || !selected) return;
    if (!window.confirm(`Kill PID ${pid} on ${selected.hostname}?`)) return;
    setLoadingAction(`kill-${pid}`);
    try {
      const r = await api.post(
        `/api/edr/endpoints/${selected.platform}/${selected.endpoint_id}/kill-process`,
        { pid, hostname: selected.hostname, case_id: caseData?.id }
      );
      addLog(r.data.ok ? 'success' : 'warn', `${r.data.ok ? '✅' : '⚠️'} Kill PID ${pid}: ${JSON.stringify(r.data.result)}`);
      setPidInput('');
      setProcesses(prev => prev.filter(p => String(p.pid) !== pid));
      refreshHistory();
    } catch (e) {
      addLog('error', `❌ Kill failed: ${e.response?.data?.detail || e.message}`);
    }
    setLoadingAction('');
  };

  const handleRunCommand = async () => {
    const cmd = cmdInput.trim();
    if (!cmd || !selected) return;
    setLoadingAction('cmd');
    setCmdOutput('');
    try {
      const r = await api.post(
        `/api/edr/endpoints/${selected.platform}/${selected.endpoint_id}/run-command`,
        { command: cmd, hostname: selected.hostname, case_id: caseData?.id }
      );
      const out = r.data.result?.stdout || r.data.result?.result || JSON.stringify(r.data.result, null, 2);
      setCmdOutput(out);
      addLog('success', `✅ Command executed: ${cmd}`);
      refreshHistory();
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      setCmdOutput(`Error: ${msg}`);
      addLog('error', `❌ Command failed: ${msg}`);
    }
    setLoadingAction('');
  };

  const refreshHistory = () => {
    if (caseData?.id) {
      api.get(`/api/edr/history?case_id=${caseData.id}&limit=20`)
        .then(r => setHistory(r.data)).catch(() => {});
    }
  };

  const isLoading = (key) => loadingAction === key;
  const filteredProcs = processes.filter(p =>
    !procFilter || p.name?.toLowerCase().includes(procFilter.toLowerCase()) ||
    String(p.pid).includes(procFilter)
  );

  const configuredCount = edrStatus ? Object.values(edrStatus.platforms).filter(p => p.configured).length : 0;
  const connectedCount  = edrStatus ? Object.values(edrStatus.platforms).filter(p => p.connected).length : 0;

  return (
    <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Platform Status Bar ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {edrStatus ? (
          <>
            {Object.entries(edrStatus.platforms).map(([name, info]) => (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 6,
                background: info.configured ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${info.configured ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                opacity: info.configured ? 1 : 0.45,
              }}>
                <StatusDot ok={info.connected} />
                <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>{PLATFORM_LABELS[name]}</span>
                <span style={{ fontSize: '0.62rem', color: '#787878', fontFamily: 'JetBrains Mono' }}>
                  {!info.configured ? 'not configured' : info.connected ? 'online' : 'unreachable'}
                </span>
              </div>
            ))}
            {configuredCount === 0 && (
              <div style={{ fontSize: '0.75rem', color: '#EAB308', padding: '5px 10px' }}>
                ⚠️ No EDR platforms configured — add credentials to .env
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: '0.72rem', color: '#787878', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Checking EDR connections…
          </div>
        )}
      </div>

      {/* ── Endpoint Search ── */}
      <div className="at-card" style={{ padding: '14px 16px' }}>
        <div className="section-label">Find Endpoints</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Hostname or IP address…"
            style={{
              flex: 1, padding: '7px 10px', background: '#0E0E16',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
              color: '#BDD4E8', fontSize: '0.82rem', fontFamily: 'JetBrains Mono',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="btn-accent"
            style={{ fontSize: '0.8rem', gap: 5, minWidth: 90 }}
          >
            {searching ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={13} />}
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Endpoint results */}
        {endpoints.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {endpoints.map(ep => (
              <div
                key={`${ep.platform}-${ep.endpoint_id}`}
                onClick={() => { setSelected(ep); setProcesses([]); setCmdOutput(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
                  background: selected?.endpoint_id === ep.endpoint_id
                    ? 'rgba(74,126,200,0.08)' : '#0E0E16',
                  border: `1px solid ${selected?.endpoint_id === ep.endpoint_id
                    ? 'rgba(90,138,159,0.25)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (selected?.endpoint_id !== ep.endpoint_id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (selected?.endpoint_id !== ep.endpoint_id) e.currentTarget.style.background = '#0E0E16'; }}
              >
                <Cpu size={13} style={{ color: PLATFORM_COLORS[ep.platform] || '#787878', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{ep.hostname}</div>
                  <div style={{ fontSize: '0.67rem', color: '#787878', fontFamily: 'JetBrains Mono', marginTop: 1 }}>
                    {ep.ip} · {ep.os_version || ep.os} · last seen {ep.last_seen ? new Date(ep.last_seen).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                  <PlatformBadge platform={ep.platform} />
                  <IsolationBadge status={ep.isolation_status} />
                </div>
              </div>
            ))}
          </div>
        )}
        {endpoints.length === 0 && !searching && searchQuery && (
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#787878', textAlign: 'center', padding: '12px 0' }}>
            No endpoints found for "{searchQuery}"
          </div>
        )}
      </div>

      {/* ── Selected Endpoint Action Panel ── */}
      {selected && (
        <div className="at-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <Cpu size={14} style={{ color: PLATFORM_COLORS[selected.platform] }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selected.hostname}</span>
                <PlatformBadge platform={selected.platform} />
                <IsolationBadge status={selected.isolation_status} />
              </div>
              <div style={{ fontSize: '0.67rem', color: '#787878', fontFamily: 'JetBrains Mono' }}>
                {selected.ip} · {selected.os_version || selected.os} · Agent {selected.agent_version}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>

            {/* Isolate / Un-isolate */}
            {(selected.isolation_status === 'connected' || selected.isolation_status === 'normal') ? (
              <button
                onClick={() => handleIsolate(selected)}
                disabled={!!loadingAction}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 6, color: '#EF4444', fontSize: '0.78rem', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.15s',
                }}
              >
                {isLoading(`isolate-${selected.endpoint_id}`)
                  ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Lock size={12} />}
                Isolate Host
              </button>
            ) : (
              <button
                onClick={() => handleUnIsolate(selected)}
                disabled={!!loadingAction}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                  borderRadius: 6, color: '#22C55E', fontSize: '0.78rem', cursor: 'pointer',
                  fontWeight: 600, transition: 'all 0.15s',
                }}
              >
                {isLoading(`unisolate-${selected.endpoint_id}`)
                  ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Unlock size={12} />}
                Lift Isolation
              </button>
            )}

            {/* List Processes */}
            <button
              onClick={() => handleListProcesses(selected)}
              disabled={loadingProcs || !!loadingAction}
              className="btn-ghost"
              style={{ fontSize: '0.78rem', gap: 5 }}
            >
              {loadingProcs
                ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : <Cpu size={12} />}
              List Processes
            </button>
          </div>

          {/* Process List */}
          {processes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="section-label" style={{ margin: 0 }}>Running Processes ({processes.length})</span>
                <input
                  value={procFilter}
                  onChange={e => setProcFilter(e.target.value)}
                  placeholder="Filter by name or PID…"
                  style={{
                    padding: '3px 8px', background: '#0E0E16',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4,
                    color: '#BDD4E8', fontSize: '0.72rem', fontFamily: 'JetBrains Mono',
                  }}
                />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', fontFamily: 'JetBrains Mono' }}>
                  <thead>
                    <tr style={{ background: '#0E0E16', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['PID', 'Name', 'User', 'Kill'].map(h => (
                        <th key={h} style={{ padding: '5px 8px', color: '#787878', textAlign: 'left', fontWeight: 500, fontFamily: 'Inter, sans-serif', fontSize: '0.65rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcs.slice(0, 80).map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '4px 8px', color: '#8BB8E8' }}>{p.pid}</td>
                        <td style={{ padding: '4px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || p.command || '—'}</td>
                        <td style={{ padding: '4px 8px', color: '#787878' }}>{p.user || '—'}</td>
                        <td style={{ padding: '4px 8px' }}>
                          <button
                            onClick={() => setPidInput(String(p.pid))}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.65rem', padding: '2px 4px' }}
                            title="Load PID for kill"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Kill Process */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#787878' }}>Kill PID:</span>
                <input
                  value={pidInput}
                  onChange={e => setPidInput(e.target.value)}
                  placeholder="Enter PID…"
                  style={{
                    width: 80, padding: '4px 8px', background: '#0E0E16',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
                    color: '#BDD4E8', fontSize: '0.75rem', fontFamily: 'JetBrains Mono',
                  }}
                />
                <button
                  onClick={handleKillProcess}
                  disabled={!pidInput.trim() || !!loadingAction}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    background: pidInput.trim() ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${pidInput.trim() ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 4, color: pidInput.trim() ? '#EF4444' : '#787878',
                    fontSize: '0.75rem', cursor: pidInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isLoading(`kill-${pidInput}`) ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={11} />}
                  Kill
                </button>
              </div>
            </div>
          )}

          {/* Forensic Command Runner */}
          <div>
            <div className="section-label">Forensic Command (RTR / Live Response)</div>
            <div style={{ fontSize: '0.68rem', color: '#787878', marginBottom: 6 }}>
              CrowdStrike: ls, cat, ps, netstat, reg query, get, filehash, memdump &nbsp;|&nbsp;
              SentinelOne: script execution &nbsp;|&nbsp; Carbon Black: Live Response commands
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={cmdInput}
                onChange={e => setCmdInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRunCommand()}
                placeholder="e.g. netstat -an  or  ps  or  reg query HKLM\\Software…"
                style={{
                  flex: 1, padding: '6px 10px', background: '#0E0E16',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
                  color: '#BDD4E8', fontSize: '0.78rem', fontFamily: 'JetBrains Mono',
                }}
              />
              <button
                onClick={handleRunCommand}
                disabled={!cmdInput.trim() || !!loadingAction}
                className="btn-ghost"
                style={{ fontSize: '0.78rem', gap: 5 }}
              >
                {isLoading('cmd') ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Terminal size={12} />}
                Run
              </button>
            </div>
            {cmdOutput && (
              <pre style={{
                marginTop: 8, padding: '10px 12px', background: '#060606',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6,
                fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#A0FFB0',
                maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {cmdOutput}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* ── Action Log ── */}
      {actionLog.length > 0 && (
        <div className="at-card" style={{ padding: '12px 16px' }}>
          <div className="section-label">Action Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {actionLog.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: '0.72rem' }}>
                <span style={{ color: '#787878', fontFamily: 'JetBrains Mono', flexShrink: 0, fontSize: '0.62rem' }}>
                  {new Date(l.ts).toLocaleTimeString()}
                </span>
                <span style={{ color: l.type === 'success' ? '#22C55E' : l.type === 'error' ? '#EF4444' : '#EAB308' }}>
                  {l.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Case EDR History ── */}
      {history.length > 0 && (
        <div className="at-card" style={{ padding: '12px 16px' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowHistory(v => !v)}
          >
            <div className="section-label" style={{ margin: 0 }}>EDR Actions on this Case ({history.length})</div>
            {showHistory ? <ChevronDown size={13} style={{ color: '#787878' }} /> : <ChevronRight size={13} style={{ color: '#787878' }} />}
          </div>
          {showHistory && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: a.status === 'success' ? '#22C55E' : a.status === 'failed' ? '#EF4444' : '#EAB308', flexShrink: 0 }}>
                    {a.status === 'success' ? '✓' : a.status === 'failed' ? '✗' : '…'}
                  </span>
                  <PlatformBadge platform={a.platform} />
                  <span style={{ fontFamily: 'JetBrains Mono', color: '#8BB8E8' }}>{a.action}</span>
                  <span style={{ color: '#BDD4E8', fontWeight: 500 }}>{a.hostname || a.endpoint_id}</span>
                  {a.target && <span style={{ color: '#787878', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{a.target}</span>}
                  <span style={{ marginLeft: 'auto', color: '#787878', fontFamily: 'JetBrains Mono', fontSize: '0.62rem', flexShrink: 0 }}>
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
