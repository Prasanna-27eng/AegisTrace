import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Play, RefreshCw, Trash2, ChevronRight, AlertTriangle, CheckCircle, Clock } from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

/* ── Alphanumeric status morph — 300ms scramble before resolving ─────────── */
const MORPH_CHARS = '0123456789ABCDEF_$@#!%^&*<>?[]{}|~';

function useMorphText(target, active) {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!active) { setDisplay(target); return; }
    const totalMs = 320, fps = 28;
    const steps = Math.round((totalMs / 1000) * fps);
    let step = 0;

    const tick = () => {
      step++;
      const progress = step / steps;
      const scrambled = target.split('').map((ch, i) => {
        if (ch === ' ') return ' ';
        const cp = progress - (i / target.length) * 0.5;
        if (cp >= 1) return ch;
        return MORPH_CHARS[Math.floor(Math.random() * MORPH_CHARS.length)];
      }).join('');
      setDisplay(scrambled);
      if (step < steps) {
        frameRef.current = setTimeout(tick, 1000 / fps);
      } else {
        setDisplay(target);
      }
    };
    frameRef.current = setTimeout(tick, 0);
    return () => clearTimeout(frameRef.current);
  }, [target, active]);

  return display;
}

/* ── Technique metadata ──────────────────────────────────────────────────── */
const TECHNIQUES = [
  {
    id: 'T1110',
    name: 'Brute Force',
    tactic: 'Credential Access',
    description: 'Injects 7 failed login events from the same IP within minutes. Tests your credential stuffing detection threshold.',
    detector: 'credential_stuffing',
    events: 7,
    severity: 'HIGH',
  },
  {
    id: 'T1078.001',
    name: 'Impossible Travel',
    tactic: 'Initial Access',
    description: 'Logs the same account in from Ireland and China 2 hours apart — physically impossible. Tests continent mismatch detection.',
    detector: 'impossible_travel',
    events: 2,
    severity: 'CRITICAL',
  },
  {
    id: 'T1078.004',
    name: 'New Device Login',
    tactic: 'Initial Access',
    description: 'Creates known device history then logs in from an unknown device. Tests device fingerprint baseline detection.',
    detector: 'new_device',
    events: 4,
    severity: 'MEDIUM',
  },
  {
    id: 'T1098',
    name: 'Privilege Escalation',
    tactic: 'Persistence',
    description: 'Injects an unapproved privilege_change: analyst → admin. Tests whether unapproved escalations are caught.',
    detector: 'privilege_escalation',
    events: 1,
    severity: 'CRITICAL',
  },
  {
    id: 'T1539',
    name: 'Session Hijacking',
    tactic: 'Collection',
    description: 'Same session token used from two different user-agents within 1 hour. Tests token theft / session fixation detection.',
    detector: 'token_theft',
    events: 2,
    severity: 'CRITICAL',
  },
];

const SEV_COLOR = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#22C55E' };

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

/* ── Result status with morph ────────────────────────────────────────────── */
function ResultBadge({ result, morphing }) {
  const label = result === 'DETECTED' ? 'DETECTED' : 'NOT_DETECTED';
  const color = result === 'DETECTED' ? '#00FF66' : '#FF3333';
  const display = useMorphText(label, morphing);

  return (
    <span style={{
      color, fontWeight: 700, letterSpacing: '0.12em', ...MONO,
      fontSize: '0.75rem', textShadow: `0 0 12px ${color}66`,
    }}>
      {display}
    </span>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function SimulationHub() {
  const { addToast } = useStore();
  const navigate     = useNavigate();
  const [running, setRunning]     = useState(null);    // technique_id currently running
  const [morphing, setMorphing]   = useState(null);    // technique_id morphing
  const [results, setResults]     = useState({});      // technique_id → result obj
  const [history, setHistory]     = useState([]);
  const [loadingHist, setLoadH]   = useState(true);
  const [selectedTech, setSelected] = useState(TECHNIQUES[0].id);

  const loadHistory = useCallback(async () => {
    setLoadH(true);
    try {
      const r = await api.get('/api/simulation/history?limit=30');
      setHistory(r.data);
    } catch { /* silent */ }
    setLoadH(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const runSimulation = async (technique_id) => {
    if (running) return;
    setRunning(technique_id);
    setSelected(technique_id);

    try {
      const r = await api.post(`/api/simulation/run/${technique_id}`);
      // Trigger morph animation
      setMorphing(technique_id);
      setTimeout(() => setMorphing(null), 400);
      setResults(prev => ({ ...prev, [technique_id]: r.data }));
      addToast(
        r.data.result === 'DETECTED'
          ? `✓ ${r.data.technique_name} — DETECTED by ${r.data.detector_name}`
          : `✗ ${r.data.technique_name} — NOT detected`,
        r.data.result === 'DETECTED' ? 'success' : 'error'
      );
      loadHistory();
    } catch (e) {
      addToast(e.response?.data?.detail || 'Simulation failed', 'error');
    }
    setRunning(null);
  };

  const runAll = async () => {
    for (const t of TECHNIQUES) {
      await runSimulation(t.id);
      await new Promise(res => setTimeout(res, 600));
    }
  };

  const clearHistory = async () => {
    try {
      await api.delete('/api/simulation/history');
      setHistory([]);
      addToast('History cleared', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
  };

  const selectedResult = results[selectedTech];
  const selectedTechMeta = TECHNIQUES.find(t => t.id === selectedTech);

  // Stats from history
  const totalRuns     = history.length;
  const detected      = history.filter(h => h.result === 'DETECTED').length;
  const notDetected   = history.filter(h => h.result === 'NOT_DETECTED').length;
  const detectionRate = totalRuns ? Math.round((detected / totalRuns) * 100) : 0;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, background: '#000000', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid rgba(26,22,18,0.07)' }}>
        <div style={{ fontSize: '0.6rem', color: '#505050', letterSpacing: '0.22em', textTransform: 'uppercase', ...MONO, marginBottom: 8 }}>
          AEGISTRACE // MITRE ATT&CK SIMULATION ENGINE
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>
          Detection Validation
        </h1>
        <div style={{ fontSize: '0.7rem', color: '#505050', ...MONO, maxWidth: 620, lineHeight: 1.7 }}>
          Injects real synthetic attack events through the live ITDR pipeline and verifies whether each detector fires correctly.
          All events use isolated simulation identities and are cleaned up after each run.
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'rgba(26,22,18,0.05)', marginBottom: 32 }}>
        {[
          { label: 'Total Runs',      value: totalRuns,       color: 'var(--text-primary)' },
          { label: 'Detected',        value: detected,        color: '#00FF66' },
          { label: 'Not Detected',    value: notDetected,     color: '#FF3333' },
          { label: 'Detection Rate',  value: `${detectionRate}%`, color: detectionRate >= 80 ? '#00FF66' : detectionRate >= 50 ? '#F97316' : '#FF3333' },
        ].map(k => (
          <div key={k.label} style={{ background: var(--card), padding: '20px 22px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 300, color: k.color, letterSpacing: '-0.04em', ...MONO, marginBottom: 6 }}>{k.value}</div>
            <div style={{ fontSize: '0.6rem', color: '#505050', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>

        {/* LEFT: Technique list ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: '0.6rem', color: '#505050', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO }}>
              5 Attack Techniques
            </div>
            <button onClick={runAll} disabled={!!running}
              style={{ background: running ? 'rgba(26,22,18,0.05)' : '#FFFFFF', color: running ? '#505050' : '#000000', border: 'none', padding: '7px 16px', fontSize: '0.62rem', fontWeight: 700, cursor: running ? 'not-allowed' : 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', ...MONO, display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s' }}
              onMouseEnter={e => !running && (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <Play size={10} /> RUN ALL
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(26,22,18,0.05)' }}>
            {TECHNIQUES.map(t => {
              const res   = results[t.id];
              const isRun  = running === t.id;
              const active = selectedTech === t.id;

              return (
                <div key={t.id}
                  onClick={() => setSelected(t.id)}
                  style={{
                    background: active ? 'rgba(74,126,200,0.06)' : var(--card),
                    padding: '16px 18px', cursor: 'pointer',
                    borderLeft: `2px solid ${active ? '#FFFFFF' : (res ? (res.result === 'DETECTED' ? '#00FF66' : '#FF3333') : 'transparent')}`,
                    transition: 'background 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.62rem', color: '#505050', ...MONO }}>{t.id}</span>
                    <span style={{ fontSize: '0.62rem', color: SEV_COLOR[t.severity], background: `${SEV_COLOR[t.severity]}12`, padding: '1px 7px', ...MONO, letterSpacing: '0.08em' }}>{t.severity}</span>
                    <span style={{ marginLeft: 'auto' }}>
                      {res && (
                        <ResultBadge result={res.result} morphing={morphing === t.id} />
                      )}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#505050', ...MONO }}>{t.tactic} · {t.events} event{t.events !== 1 ? 's' : ''} injected</div>

                  <button
                    onClick={e => { e.stopPropagation(); runSimulation(t.id); }}
                    disabled={!!running}
                    style={{ marginTop: 10, background: isRun ? 'rgba(26,22,18,0.07)' : 'rgba(26,22,18,0.05)', border: '1px solid rgba(26,22,18,0.09)', color: isRun ? '#BDD4E8' : '#787878', padding: '5px 14px', fontSize: '0.62rem', cursor: running ? 'not-allowed' : 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', ...MONO, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}
                    onMouseEnter={e => !running && (e.currentTarget.style.color = '#BDD4E8')}
                    onMouseLeave={e => !running && (e.currentTarget.style.color = '#787878')}>
                    {isRun
                      ? <><RefreshCw size={9} style={{ animation: 'spin 0.8s linear infinite' }} /> RUNNING…</>
                      : <><Play size={9} /> LAUNCH SIMULATION</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Result detail + History ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Result detail */}
          <div style={{ background: var(--card), border: '1px solid rgba(26,22,18,0.07)', padding: '22px' }}>
            <div style={{ fontSize: '0.6rem', color: '#505050', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO, marginBottom: 18 }}>
              Simulation Result
            </div>

            {selectedTechMeta && !selectedResult && (
              <div>
                <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 400, marginBottom: 8 }}>{selectedTechMeta.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#505050', lineHeight: 1.7, ...MONO, marginBottom: 16 }}>
                  {selectedTechMeta.description}
                </div>
                <div style={{ fontSize: '0.64rem', color: '#383838', ...MONO, lineHeight: 1.6 }}>
                  <div>TECHNIQUE ID · {selectedTechMeta.id}</div>
                  <div>TACTIC · {selectedTechMeta.tactic}</div>
                  <div>DETECTOR · {selectedTechMeta.detector}</div>
                  <div>EVENTS · {selectedTechMeta.events} synthetic auth events</div>
                </div>
                <div style={{ marginTop: 20, fontSize: '0.64rem', color: '#383838', ...MONO }}>
                  ► Press LAUNCH SIMULATION to run
                </div>
              </div>
            )}

            {selectedResult && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  {selectedResult.result === 'DETECTED'
                    ? <CheckCircle size={18} style={{ color: '#00FF66' }} />
                    : <AlertTriangle size={18} style={{ color: '#FF3333' }} />}
                  <div>
                    <ResultBadge result={selectedResult.result} morphing={morphing === selectedTech} />
                    <div style={{ fontSize: '0.64rem', color: '#505050', ...MONO, marginTop: 3 }}>
                      {selectedResult.technique_name} · {selectedResult.mitre_tactic}
                    </div>
                  </div>
                  {selectedResult.confidence && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 300, color: '#00FF66', ...MONO }}>{Math.round(selectedResult.confidence * 100)}%</div>
                      <div style={{ fontSize: '0.58rem', color: '#505050', textTransform: 'uppercase', letterSpacing: '0.1em' }}>confidence</div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={{ fontSize: '0.72rem', color: '#7A9DB8', lineHeight: 1.7, marginBottom: 16, ...MONO }}>
                  {selectedResult.description}
                </div>

                {/* Evidence */}
                {selectedResult.evidence && Object.keys(selectedResult.evidence).length > 0 && (
                  <div style={{ background: '#000000', border: '1px solid rgba(26,22,18,0.07)', padding: '14px' }}>
                    <div style={{ fontSize: '0.58rem', color: '#383838', textTransform: 'uppercase', letterSpacing: '0.14em', ...MONO, marginBottom: 10 }}>
                      Evidence
                    </div>
                    {Object.entries(selectedResult.evidence).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 12, padding: '4px 0', borderBottom: '1px solid rgba(26,22,18,0.04)' }}>
                        <span style={{ fontSize: '0.64rem', color: '#505050', ...MONO, minWidth: 140, flexShrink: 0 }}>{k}</span>
                        <span style={{ fontSize: '0.64rem', color: '#7A9DB8', ...MONO, wordBreak: 'break-all' }}>
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12, fontSize: '0.62rem', color: '#383838', ...MONO, display: 'flex', gap: 16 }}>
                  <span>{selectedResult.events_injected} events injected</span>
                  <span>detector: {selectedResult.detector_name}</span>
                  <span>{timeAgo(selectedResult.run_at)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Run history */}
          <div style={{ background: var(--card), border: '1px solid rgba(26,22,18,0.07)', padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: '0.6rem', color: '#505050', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO }}>
                Run History
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={loadHistory} style={{ background: 'none', border: 'none', color: '#383838', cursor: 'pointer', ...MONO, fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={9} /> REFRESH
                </button>
                {history.length > 0 && (
                  <button onClick={clearHistory} style={{ background: 'none', border: 'none', color: '#383838', cursor: 'pointer', ...MONO, fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={9} /> CLEAR
                  </button>
                )}
              </div>
            </div>

            {loadingHist ? (
              <div style={{ fontSize: '0.7rem', color: '#383838', ...MONO }}>Loading…</div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: '0.7rem', color: '#383838', ...MONO, padding: '24px 0', textAlign: 'center' }}>
                No simulations run yet. Launch a technique to begin.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(26,22,18,0.04)' }}>
                {history.slice(0, 12).map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: var(--card) }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: h.result === 'DETECTED' ? '#00FF66' : '#FF3333', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.62rem', color: '#505050', ...MONO, width: 72, flexShrink: 0 }}>{h.technique_id}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.technique_name}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: h.result === 'DETECTED' ? '#00FF66' : '#FF3333', ...MONO, flexShrink: 0, letterSpacing: '0.06em' }}>
                      {h.result === 'DETECTED' ? 'DETECTED' : 'MISS'}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#383838', ...MONO, flexShrink: 0, minWidth: 54, textAlign: 'right' }}>
                      {timeAgo(h.run_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Demo attack chain explainer ── */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(26,22,18,0.05)' }}>
        <div style={{ fontSize: '0.6rem', color: '#383838', letterSpacing: '0.16em', textTransform: 'uppercase', ...MONO, marginBottom: 14 }}>
          Demo Attack Chain — Run in sequence to simulate a realistic breach scenario
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {[
            { step: '01', label: 'T1110 Brute Force', desc: 'Attacker gains foothold by password stuffing' },
            { step: '02', label: 'T1078.001 Impos. Travel', desc: 'Stolen creds used from attacker\'s location' },
            { step: '03', label: 'T1539 Session Hijack', desc: 'Session token extracted and replayed' },
            { step: '04', label: 'T1098 Priv. Escalation', desc: 'Attacker escalates to admin silently' },
            { step: '05', label: 'T1078.004 New Device', desc: 'Persistent access from new attacker device' },
          ].map((s, i) => (
            <React.Fragment key={s.step}>
              <div style={{ flexShrink: 0, padding: '12px 16px', background: var(--card), border: '1px solid rgba(26,22,18,0.05)', minWidth: 170 }}>
                <div style={{ fontSize: '0.58rem', color: '#383838', ...MONO, marginBottom: 5 }}>STEP {s.step}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: '0.62rem', color: '#505050', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
              {i < 4 && (
                <div style={{ flexShrink: 0, padding: '0 6px', color: '#383838' }}>
                  <ChevronRight size={14} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
