import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Terminal, Plus, Trash2, Save, Copy, ChevronRight, Loader2,
  Shield, AlertTriangle, Brain, FolderOpen, Play, X, Clock,
  Download, CheckCircle, Zap, Eye
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const TYPE_COLOR = {
  ip: '#EF4444', domain: '#EAB308', hash: '#A78BFA',
  url: '#22C55E', email: '#C0392B', port: '#71717A',
};

const TOOL_PRESETS = [
  { name: 'whois',     args: '<domain>',      category: 'recon' },
  { name: 'dig',       args: '<domain>',      category: 'dns' },
  { name: 'nslookup',  args: '<domain>',      category: 'dns' },
  { name: 'nmap',      args: '-sV <ip>',      category: 'recon' },
  { name: 'strings',   args: '<file>',        category: 'forensics' },
  { name: 'file',      args: '<filename>',    category: 'forensics' },
  { name: 'sha256sum', args: '<filename>',    category: 'hashing' },
  { name: 'md5sum',    args: '<filename>',    category: 'hashing' },
  { name: 'ps',        args: 'aux',           category: 'process' },
  { name: 'netstat',   args: '-an',           category: 'network' },
  { name: 'ls',        args: '-la',           category: 'filesystem' },
  { name: 'ioc-extract', args: '',            category: 'analysis' },
  { name: 'defang',    args: '<ioc>',         category: 'analysis' },
  { name: 'log-parse', args: '',              category: 'analysis' },
];

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

// ── Session Sidebar ──────────────────────────────────────────────────────────
function SessionSidebar({ sessions, activeId, onSelect, onCreate, onDelete }) {
  return (
    <div style={{ width: 220, flexShrink: 0, background: '#0B0D14', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.7rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em', ...MONO }}>Sessions</div>
        <button className="btn-accent" onClick={onCreate} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
          <Plus size={11} /> New
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        {sessions.length === 0 && (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: '#71717A', fontSize: '0.72rem', ...MONO }}>
            No sessions yet.<br />Click New to start.
          </div>
        )}
        {sessions.map(s => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              padding: '9px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 3,
              background: activeId === s.id ? 'rgba(192,57,43,0.1)' : 'transparent',
              border: `1px solid ${activeId === s.id ? 'rgba(192,57,43,0.3)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (activeId !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { if (activeId !== s.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: activeId === s.id ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {s.session_name}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: '2px', flexShrink: 0, opacity: 0.6 }}
              ><Trash2 size={10} /></button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: '0.62rem', color: '#71717A', ...MONO }}>
                {s.command_count || 0} cmds
              </span>
              {s.mode === 'sandbox' && (
                <span style={{ fontSize: '0.6rem', color: '#A78BFA', background: 'rgba(167,139,250,0.1)', padding: '0 4px', borderRadius: 2, ...MONO }}>SANDBOX</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Output Pane ──────────────────────────────────────────────────────────────
function OutputPane({ command, onPushIOCs, onSaveToCase, caseId }) {
  const [showParsed, setShowParsed] = useState(true);
  if (!command) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A' }}>
      <div style={{ textAlign: 'center' }}>
        <Terminal size={28} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
        <div style={{ fontSize: '0.8rem', ...MONO }}>Run a command to see output here</div>
      </div>
    </div>
  );

  const parsed = (() => { try { return JSON.parse(command.parsed_output || '{}'); } catch { return {}; } })();
  const iocs = (() => { try { return JSON.parse(command.extracted_iocs || '[]'); } catch { return []; } })();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Output toolbar */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: '0.68rem', color: '#71717A', ...MONO, flex: 1 }}>
          {command.tool_name} · {timeAgo(command.created_at)}
          <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 3, fontSize: '0.6rem', background: command.mode === 'sandbox' ? 'rgba(167,139,250,0.15)' : 'rgba(34,197,94,0.1)', color: command.mode === 'sandbox' ? '#A78BFA' : '#22C55E' }}>
            {command.mode?.toUpperCase()}
          </span>
        </span>
        <button onClick={() => setShowParsed(p => !p)} className="btn-ghost" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
          <Eye size={10} /> {showParsed ? 'Raw' : 'Parsed'}
        </button>
        <button onClick={() => navigator.clipboard.writeText(command.raw_output)} className="btn-ghost" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
          <Copy size={10} /> Copy
        </button>
        {caseId && <button onClick={onSaveToCase} className="btn-ghost" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
          <Save size={10} /> Save to Case
        </button>}
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
        {/* Raw output */}
        <div style={{ flex: showParsed ? '0 0 50%' : '1', borderRight: showParsed ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: 14, overflow: 'auto' }}>
          <div style={{ fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, ...MONO }}>Raw Output</div>
          <pre style={{ margin: 0, fontSize: '0.75rem', color: '#22C55E', ...MONO, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {command.raw_output || '(no output)'}
          </pre>
        </div>

        {/* Parsed / AI results */}
        {showParsed && (
          <div style={{ flex: '0 0 50%', padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* AI Summary */}
            {command.ai_summary && (
              <div>
                <div style={{ fontSize: '0.62rem', color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, ...MONO, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Brain size={10} /> AI Summary
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(240,240,248,0.8)', lineHeight: 1.6 }}>
                  {command.ai_summary}
                </div>
              </div>
            )}

            {/* Key findings */}
            {parsed.key_findings?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.62rem', color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, ...MONO }}>Key Findings</div>
                {parsed.key_findings.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', color: 'rgba(240,240,248,0.75)' }}>
                    <ChevronRight size={10} style={{ color: '#EAB308', flexShrink: 0, marginTop: 3 }} />
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* MITRE */}
            {parsed.mitre_techniques?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.62rem', color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, ...MONO }}>MITRE ATT&CK</div>
                {parsed.mitre_techniques.map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: '0.72rem' }}>
                    <span style={{ color: '#C0392B', ...MONO, flexShrink: 0 }}>{t.id}</span>
                    <span style={{ color: 'rgba(240,240,248,0.6)' }}>{t.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Extracted IOCs */}
            {iocs.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', ...MONO }}>
                    Extracted IOCs ({iocs.length})
                  </div>
                  {caseId && (
                    <button onClick={onPushIOCs} className="btn-ghost" style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
                      <Zap size={9} /> Push to Case
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {iocs.map((ioc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: '#0B0D14', borderRadius: 4, borderLeft: `2px solid ${TYPE_COLOR[ioc.type] || '#71717A'}` }}>
                      <span style={{ fontSize: '0.6rem', color: TYPE_COLOR[ioc.type] || '#71717A', textTransform: 'uppercase', ...MONO, minWidth: 40 }}>{ioc.type}</span>
                      <span style={{ fontSize: '0.72rem', color: '#F0F0F8', ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ioc.ioc}</span>
                      <button onClick={() => navigator.clipboard.writeText(ioc.ioc)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', marginLeft: 'auto', flexShrink: 0, padding: 2 }}>
                        <Copy size={9} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended actions */}
            {parsed.recommended_actions?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.62rem', color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, ...MONO }}>Recommended Actions</div>
                {parsed.recommended_actions.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: '0.72rem', color: 'rgba(240,240,248,0.6)' }}>
                    <span style={{ color: '#22C55E', ...MONO }}>{i + 1}.</span>
                    {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Terminal Lab Page ────────────────────────────────────────────────────
export default function TerminalLab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast, user } = useStore();

  const [sessions, setSessions]     = useState([]);
  const [activeId, setActiveId]     = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [activeCmd, setActiveCmd]   = useState(null);

  const [command, setCommand]       = useState('');
  const [tool, setTool]             = useState('custom');
  const [mode, setMode]             = useState('simulated');
  const [pasteOutput, setPasteOutput] = useState('');
  const [showPaste, setShowPaste]   = useState(false);
  const [running, setRunning]       = useState(false);

  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  const caseId = searchParams.get('case_id') ? parseInt(searchParams.get('case_id')) : null;

  const loadSessions = useCallback(() => {
    const params = caseId ? `?case_id=${caseId}` : '';
    api.get(`/api/terminal/sessions${params}`)
      .then(r => setSessions(r.data))
      .catch(() => {});
  }, [caseId]);

  const loadSessionDetail = useCallback((id) => {
    if (!id) return;
    api.get(`/api/terminal/sessions/${id}`)
      .then(r => {
        setSessionData(r.data);
        const cmds = r.data.commands || [];
        if (cmds.length > 0) setActiveCmd(cmds[cmds.length - 1]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { if (activeId) loadSessionDetail(activeId); }, [activeId, loadSessionDetail]);

  const createSession = async () => {
    try {
      const res = await api.post('/api/terminal/sessions', {
        session_name: `Lab ${new Date().toLocaleTimeString()}`,
        case_id: caseId,
        mode,
      });
      await loadSessions();
      setActiveId(res.data.id);
      setSessionData({ ...res.data, commands: [] });
      addToast('Terminal session started', 'success');
    } catch { addToast('Failed to create session', 'error'); }
  };

  const deleteSession = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await api.delete(`/api/terminal/sessions/${id}`);
      if (activeId === id) { setActiveId(null); setSessionData(null); setActiveCmd(null); }
      loadSessions();
      addToast('Session deleted', 'success');
    } catch { addToast('Delete failed', 'error'); }
  };

  const runCommand = async () => {
    if (!activeId) { addToast('Select or create a session first', 'error'); return; }
    const cmd = command.trim();
    if (!cmd && !pasteOutput.trim()) { addToast('Enter a command or paste output', 'error'); return; }
    setRunning(true);
    try {
      const res = await api.post(`/api/terminal/sessions/${activeId}/run`, {
        command: cmd,
        tool_name: tool,
        mode,
        output: pasteOutput || undefined,
      });
      setCommand('');
      setPasteOutput('');
      setShowPaste(false);
      setActiveCmd(res.data);
      await loadSessionDetail(activeId);
      loadSessions();
      if (outputRef.current) outputRef.current.scrollTop = 0;
    } catch (e) {
      addToast(e.response?.data?.detail || 'Command failed', 'error');
    }
    setRunning(false);
  };

  const saveToCase = async () => {
    if (!activeId || !caseId) { addToast('No case linked to this session', 'error'); return; }
    try {
      await api.post(`/api/terminal/sessions/${activeId}/save-to-case`, { case_id: caseId });
      addToast('Session saved to case findings', 'success');
    } catch { addToast('Save failed', 'error'); }
  };

  const pushIOCs = async () => {
    if (!activeCmd || !caseId) return;
    try {
      const iocs = JSON.parse(activeCmd.extracted_iocs || '[]');
      if (!iocs.length) { addToast('No IOCs extracted from this command', 'error'); return; }
      await api.patch(`/api/cases/${caseId}`, {
        iocs: JSON.stringify(iocs),
      });
      addToast(`${iocs.length} IOC(s) pushed to case`, 'success');
    } catch { addToast('Push failed', 'error'); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runCommand(); return; }
    const history = sessionData?.commands || [];
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(newIdx);
      const cmd = history[history.length - 1 - newIdx];
      if (cmd) setCommand(cmd.command);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setCommand(newIdx === -1 ? '' : (history[history.length - 1 - newIdx]?.command || ''));
    }
  };

  const applyPreset = (preset) => {
    setTool(preset.name);
    setCommand(`${preset.name} ${preset.args}`);
    inputRef.current?.focus();
  };

  const commands = sessionData?.commands || [];

  return (
    <div style={{ display: 'flex', height: '100%', background: '#07080F', overflow: 'hidden' }}>

      {/* Session Sidebar */}
      <SessionSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={id => { setActiveId(id); setActiveCmd(null); }}
        onCreate={createSession}
        onDelete={deleteSession}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: '#0B0D14' }}>
          <Terminal size={15} style={{ color: '#22C55E' }} />
          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Terminal Lab</div>
          {sessionData && (
            <span style={{ fontSize: '0.72rem', color: '#71717A', ...MONO }}>
              {sessionData.session_name} · {commands.length} commands
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="at-select"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
            >
              <option value="simulated">Simulated Mode</option>
              <option value="sandbox">Sandbox Mode (stub)</option>
            </select>
            {caseId && (
              <button className="btn-ghost" onClick={saveToCase} style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Save size={11} /> Save Session to Case
              </button>
            )}
            {caseId && (
              <button className="btn-ghost" onClick={() => navigate(`/app/cases/${caseId}`)} style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FolderOpen size={11} /> Back to Case
              </button>
            )}
          </div>
        </div>

        {/* Body: command input + output */}
        {!activeId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A' }}>
            <div style={{ textAlign: 'center' }}>
              <Terminal size={36} style={{ margin: '0 auto 16px', opacity: 0.15 }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>No active session</div>
              <div style={{ fontSize: '0.78rem', ...MONO, marginBottom: 20 }}>Create a new session to start the terminal lab</div>
              <button className="btn-accent" onClick={createSession} style={{ fontSize: '0.8rem' }}>
                <Plus size={13} /> New Session
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Terminal transcript */}
            <div style={{ flex: 1, overflow: 'auto', padding: '10px 16px', background: '#080A10' }} ref={outputRef}>
              {commands.length === 0 ? (
                <div style={{ padding: '24px 0', color: '#71717A', fontSize: '0.78rem', ...MONO }}>
                  <span style={{ color: '#C0392B' }}>aegistrace@lab:~$</span> _
                  <div style={{ marginTop: 16, opacity: 0.5 }}>Session ready. Type a command or choose a tool preset below.</div>
                </div>
              ) : (
                commands.map(cmd => (
                  <div
                    key={cmd.id}
                    onClick={() => setActiveCmd(cmd)}
                    style={{
                      padding: '8px 10px', marginBottom: 6, borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${activeCmd?.id === cmd.id ? 'rgba(192,57,43,0.3)' : 'rgba(255,255,255,0.04)'}`,
                      background: activeCmd?.id === cmd.id ? 'rgba(192,57,43,0.05)' : 'transparent',
                      transition: 'all 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#C0392B', ...MONO, fontSize: '0.72rem' }}>aegistrace@lab:~$</span>
                      <span style={{ color: '#F0F0F8', ...MONO, fontSize: '0.78rem' }}>{cmd.command}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: '#71717A', ...MONO }}>
                        {timeAgo(cmd.created_at)}
                      </span>
                      <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 2, background: cmd.mode === 'sandbox' ? 'rgba(167,139,250,0.12)' : 'rgba(34,197,94,0.08)', color: cmd.mode === 'sandbox' ? '#A78BFA' : '#22C55E', ...MONO }}>
                        {cmd.mode}
                      </span>
                    </div>
                    <pre style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(240,240,248,0.5)', ...MONO, maxHeight: 80, overflow: 'hidden', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {cmd.raw_output?.slice(0, 200)}{cmd.raw_output?.length > 200 ? '…' : ''}
                    </pre>
                  </div>
                ))
              )}
            </div>

            {/* Tool presets */}
            <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#09090F', display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0 }}>
              {TOOL_PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  style={{ padding: '3px 8px', borderRadius: 3, fontSize: '0.65rem', ...MONO, border: '1px solid rgba(255,255,255,0.08)', background: tool === p.name ? 'rgba(192,57,43,0.12)' : 'transparent', color: tool === p.name ? '#C0392B' : 'rgba(240,240,248,0.4)', cursor: 'pointer' }}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Command input row */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0B0D14', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showPaste ? 8 : 0 }}>
                <span style={{ color: '#C0392B', ...MONO, fontSize: '0.8rem', flexShrink: 0 }}>aegistrace@lab:~$</span>
                <input
                  ref={inputRef}
                  value={command}
                  onChange={e => { setCommand(e.target.value); setHistoryIdx(-1); }}
                  onKeyDown={handleKeyDown}
                  placeholder={`${tool} command…`}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#F0F0F8', ...MONO, fontSize: '0.82rem',
                  }}
                />
                <button
                  onClick={() => setShowPaste(p => !p)}
                  className="btn-ghost"
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                  title="Paste real tool output"
                >
                  {showPaste ? <X size={11} /> : 'Paste Output'}
                </button>
                <button
                  onClick={runCommand}
                  disabled={running}
                  className="btn-accent"
                  style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {running ? <Loader2 size={12} className="spinner" /> : <Play size={11} />}
                  {running ? 'Running…' : 'Run'}
                </button>
              </div>
              {showPaste && (
                <textarea
                  value={pasteOutput}
                  onChange={e => setPasteOutput(e.target.value)}
                  placeholder="Paste real tool output here — AI will analyse it…"
                  rows={5}
                  style={{ width: '100%', background: '#080A10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#22C55E', ...MONO, fontSize: '0.73rem', padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right panel: output details */}
      <div style={{ width: 380, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} ref={outputRef}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: '0.7rem', color: '#71717A', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={11} style={{ color: '#A78BFA' }} />
          AI Analysis
          {activeCmd && <span style={{ marginLeft: 'auto', opacity: 0.5, fontWeight: 400 }}>{activeCmd.tool_name}</span>}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <OutputPane
            command={activeCmd}
            onPushIOCs={pushIOCs}
            onSaveToCase={saveToCase}
            caseId={caseId}
          />
        </div>
      </div>
    </div>
  );
}
