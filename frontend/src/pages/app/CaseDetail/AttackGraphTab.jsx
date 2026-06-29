import React, { useState } from 'react';
import { GitBranch, Loader2, Sparkles, Network, Clock, ArrowRight } from '../../../components/icons';
import { SeverityBadge } from '../../../components/SeverityBadge';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const SOURCE_LABELS = {
  agent_action:   'Agent Action',
  itdr_alert:     'ITDR Alert',
  shadow_ai:      'Shadow AI',
  hardware_alert: 'Hardware Alert',
  raw_log:        'Endpoint Log',
  defense_event:  'Defense Engine',
};

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return ts; }
}

// ── Attack Path Visualisation ─────────────────────────────────────────────────
function AttackPathViz({ data }) {
  if (!data || !data.nodes.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
        No attack path data. Mark at least one identity node as compromised and link it via edges in the Identity Graph.
      </div>
    );
  }

  const NODE_TYPE_ICONS = {
    user: '👤', service_account: '⚙️', api_key: '🔑', token: '🪙',
    device: '💻', agent: '🤖', ai_agent: '🤖', prompt: '💬',
  };

  const NODE_COLORS = {
    user: '#2563EB', service_account: '#F59E0B', api_key: '#8B5CF6',
    token: '#EC4899', device: '#10B981', agent: '#A78BFA', ai_agent: '#A78BFA', prompt: '#6B7280',
  };

  const SEV_COLOR = (score) => score > 0.7 ? '#EF4444' : score > 0.4 ? '#F97316' : '#10B981';

  // Group nodes by depth for horizontal lane layout
  const byDepth = {};
  data.nodes.forEach(n => { byDepth[n.depth] = [...(byDepth[n.depth] || []), n]; });
  const maxDepth = Math.max(...data.nodes.map(n => n.depth), 0);

  const LANE_W = 200;
  const NODE_H = 90;
  const PAD_V  = 24;
  const TOTAL_W = (maxDepth + 1) * LANE_W + 48;

  // Position map: node.id → {x, y}
  const positions = {};
  data.nodes.forEach(n => {
    const col = n.depth;
    const siblings = byDepth[col] || [];
    const idx = siblings.findIndex(s => s.id === n.id);
    positions[n.id] = {
      x: 24 + col * LANE_W + 80,
      y: PAD_V + idx * (NODE_H + 20) + NODE_H / 2,
    };
  });

  const totalH = Math.max(...Object.values(positions).map(p => p.y), 0) + NODE_H + PAD_V;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520, padding: '12px 0' }}>
      {/* Summary */}
      {data.summary && (
        <div style={{ padding: '10px 16px', margin: '0 16px 16px',
          background: 'rgba(26,22,18,0.036)', border: '1px solid rgba(26,22,18,0.090)',
          borderRadius: 6, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {data.summary}
        </div>
      )}

      <svg width={Math.max(TOTAL_W, 600)} height={totalH + 20} style={{ display: 'block' }}>
        {/* Depth lane labels */}
        {Object.entries(byDepth).map(([depth, nodes]) => (
          <text key={depth}
            x={24 + parseInt(depth) * LANE_W + 80} y={14}
            textAnchor="middle" fontSize="9" fill="rgba(26,22,18,0.600)"
            fontFamily="var(--font-mono)" letterSpacing="0.08em">
            {depth === '0' ? 'INITIAL ACCESS' : `HOP ${depth}`}
          </text>
        ))}

        {/* Edges with MITRE labels */}
        {data.edges.map((edge, i) => {
          const src = positions[edge.source];
          const tgt = positions[edge.target];
          if (!src || !tgt) return null;
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y + tgt.y) / 2;
          return (
            <g key={i}>
              <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke="rgba(26,22,18,0.210)" strokeWidth="1.5" strokeDasharray="4 3"/>
              {/* Arrow */}
              <polygon
                points={`${tgt.x-6},${tgt.y-4} ${tgt.x},${tgt.y} ${tgt.x-6},${tgt.y+4}`}
                fill="rgba(26,22,18,0.300)"/>
              {/* MITRE label */}
              <rect x={mx - 28} y={my - 10} width={56} height={18} rx={3}
                fill="var(--surface)" stroke="rgba(26,22,18,0.120)"/>
              <text x={mx} y={my + 3} textAnchor="middle" fontSize="8.5"
                fill="rgba(26,22,18,0.7)" fontFamily="var(--font-mono)">{edge.mitre_id}</text>
            </g>
          );
        })}

        {/* Nodes */}
        {data.nodes.map(node => {
          const pos = positions[node.id];
          if (!pos) return null;
          const color = NODE_COLORS[node.node_type] || '#2563EB';
          const sevColor = SEV_COLOR(node.risk_score);
          const icon = NODE_TYPE_ICONS[node.node_type] || '🔷';
          return (
            <g key={node.id} transform={`translate(${pos.x - 64}, ${pos.y - 36})`}>
              {/* Card */}
              <rect width={128} height={72} rx={6}
                fill={node.is_compromised ? 'rgba(239,68,68,0.08)' : 'rgba(26,22,18,0.036)'}
                stroke={node.is_compromised ? 'rgba(239,68,68,0.4)' : 'rgba(26,22,18,0.150)'}
                strokeWidth={node.is_compromised ? 1.5 : 1}/>
              {/* Top color bar */}
              <rect width={128} height={3} rx={2} fill={node.is_compromised ? '#EF4444' : color}/>
              {/* Icon */}
              <text x={14} y={28} fontSize="16">{icon}</text>
              {/* Label */}
              <text x={34} y={24} fontSize="10" fontWeight="600" fill="rgba(241,245,249,0.9)"
                fontFamily="var(--font-ui)">
                {(node.label || '').slice(0, 14)}{node.label?.length > 14 ? '…' : ''}
              </text>
              {/* Type */}
              <text x={34} y={36} fontSize="8.5" fill={color} fontFamily="var(--font-mono)"
                letterSpacing="0.04em">
                {(node.node_type || '').replace('_', ' ').toUpperCase()}
              </text>
              {/* Risk bar */}
              <rect x={8} y={48} width={112} height={4} rx={2} fill="rgba(26,22,18,0.06)"/>
              <rect x={8} y={48} width={Math.round(112 * node.risk_score)} height={4} rx={2} fill={sevColor}/>
              {/* Risk label */}
              <text x={124} y={54} fontSize="8" fill={sevColor} textAnchor="end" fontFamily="var(--font-mono)">
                {Math.round(node.risk_score * 100)}
              </text>
              {/* Compromised badge */}
              {node.is_compromised && (
                <text x={64} y={66} textAnchor="middle" fontSize="7.5" fill="#F87171" fontFamily="var(--font-mono)" letterSpacing="0.05em">
                  &#9888; COMPROMISED
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Step-by-step list below */}
      {data.path_steps.length > 0 && (
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', marginTop: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Attack Chain</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.path_steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', minWidth: 20 }}>
                  {String(i+1).padStart(2,'0')}
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{step.from_label}</strong>
                  {' → '}
                  <span style={{ color: 'var(--accent-light)' }}>{step.action}</span>
                  {' → '}
                  <strong style={{ color: 'var(--text-primary)' }}>{step.to_label}</strong>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#A78BFA',
                  background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                  padding: '2px 6px', borderRadius: 3 }}>
                  {step.mitre_id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttackGraphTab({ caseData, updateCase, caseId }) {
  const { addToast } = useStore();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  // Attack Path tab state
  const [activeTab, setActiveTab]     = useState('timeline');
  const [pathData, setPathData]       = useState(null);
  const [pathLoading, setPathLoading] = useState(false);

  const reconstruct = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/graph/reconstruct', { params: { case_id: caseId } });
      setResult(res.data);
      if (res.data.event_count === 0) {
        addToast('No correlated events found for this case yet', 'info');
      } else {
        addToast('Attack chain reconstructed', 'success');
      }
    } catch (e) {
      addToast(e.response?.data?.detail || 'Reconstruction failed', 'error');
    }
    setLoading(false);
  };

  const loadAttackPath = async () => {
    if (pathData) return; // cached
    setPathLoading(true);
    try {
      const r = await api.get(`/api/identity/attack-path?case_id=${caseId}`);
      setPathData(r.data);
    } catch (e) {
      setPathData({ nodes: [], edges: [], path_steps: [], summary: 'No attack path data.' });
    } finally {
      setPathLoading(false);
    }
  };

  const applyToCase = () => {
    if (!result) return;
    let mitre = [];
    try { mitre = JSON.parse(caseData?.mitre_techniques || '[]'); } catch { mitre = []; }
    const existingIds = new Set(mitre.map(t => t.id));
    for (const tid of (result.mitre_chain || [])) {
      if (!existingIds.has(tid)) { mitre.push({ id: tid, name: '' }); existingIds.add(tid); }
    }

    const narrativeBlock = `\n\n## Attack Graph Reconstruction (${result.model_used || 'AI'})\n${result.narrative || ''}`;
    const description = (caseData?.description || '') + narrativeBlock;

    const updates = { mitre_techniques: JSON.stringify(mitre), description };
    if (!caseData?.title || caseData.title === 'New Case') {
      updates.title = result.suggested_title;
    }
    updateCase(updates);
    addToast('Applied narrative + MITRE techniques to case', 'success');
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 920 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitBranch size={18} style={{ color: '#9C7CFF' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Attack Graph</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(26,22,18,0.5)', marginTop: 1 }}>
              Temporal Linker · Nemotron-70B · correlates events within 5s windows
            </div>
          </div>
        </div>
        {activeTab === 'timeline' && (
          <button className="btn-accent" onClick={reconstruct} disabled={loading} style={{ fontSize: '0.8rem' }}>
            {loading
              ? <><Loader2 size={14} className="spinner"/> Reconstructing&hellip;</>
              : <><Sparkles size={14}/> {result ? 'Reconstruct Again' : 'Reconstruct'}</>
            }
          </button>
        )}
      </div>

      {/* Tab row */}
      <div style={{ display: 'flex', gap: 2, padding: '12px 0 12px 0', borderBottom: '1px solid rgba(26,22,18,0.072)', marginBottom: 20 }}>
        {[['timeline', 'Timeline'], ['path', 'Attack Path']].map(([id, label]) => (
          <button key={id} onClick={() => { setActiveTab(id); if (id === 'path') loadAttackPath(); }}
            style={{
              padding: '7px 16px',
              background: activeTab === id ? 'rgba(26,22,18,0.072)' : 'transparent',
              border: `1px solid ${activeTab === id ? 'rgba(26,22,18,0.210)' : 'rgba(26,22,18,0.072)'}`,
              borderRadius: 6, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13, fontWeight: activeTab === id ? 600 : 400,
              color: activeTab === id ? 'rgba(26,22,18,0.7)' : 'rgba(26,22,18,0.5)',
              transition: 'all 140ms ease',
            }}>{label}</button>
        ))}
      </div>

      {/* ── Timeline tab ──────────────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div>
          {/* Empty state */}
          {!result && !loading && (
            <div className="at-card" style={{ padding: 36, textAlign: 'center', color: 'rgba(26,22,18,0.5)' }}>
              <Network size={32} style={{ margin: '0 auto 12px', color: 'rgba(156,124,255,0.25)', display: 'block' }}/>
              <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>Correlates ITDR alerts, Shadow AI events, hardware alerts, agent actions, endpoint logs, and defense events linked to this case.</div>
              <div style={{ fontSize: '0.75rem' }}>Clusters them by time and asks Nemotron-70B to reconstruct the attack chain as a narrative.</div>
            </div>
          )}

          {/* No events found */}
          {result && result.event_count === 0 && (
            <div className="at-card" style={{ padding: 36, textAlign: 'center', color: 'rgba(26,22,18,0.5)' }}>
              <Network size={32} style={{ margin: '0 auto 12px', color: 'rgba(156,124,255,0.2)', display: 'block' }}/>
              <div style={{ fontSize: '0.85rem' }}>{result.narrative}</div>
            </div>
          )}

          {/* Result */}
          {result && result.event_count > 0 && (
            <div>
              {/* Narrative */}
              <div className="at-card" style={{ padding: '14px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#9C7CFF' }}>{result.suggested_title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(26,22,18,0.5)', ...MONO }}>
                      {result.event_count} events &middot; {result.step_count} steps &middot; confidence {result.confidence}%
                    </span>
                    <button className="btn-ghost" onClick={applyToCase} style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                      Apply to Case
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(26,22,18,0.6)', lineHeight: 1.6 }}>{result.narrative}</div>
                {result.mitre_chain?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {result.mitre_chain.map(t => (
                      <span key={t} style={{ background: 'rgba(156,124,255,0.1)', border: '1px solid rgba(156,124,255,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.68rem', color: '#9C7CFF', ...MONO }}>{t}</span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#444', marginTop: 8 }}>
                  Generated by {result.model_used || 'AI'} at {fmtTime(result.generated_at)}
                </div>
              </div>

              {/* Steps */}
              {result.steps?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(26,22,18,0.5)', marginBottom: 10, fontWeight: 600 }}>RECONSTRUCTED STEPS</div>
                  {result.steps.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(156,124,255,0.12)', border: '1px solid rgba(156,124,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', color: '#9C7CFF', fontWeight: 700 }}>{s.step}</div>
                        {i < result.steps.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(26,22,18,0.08)', marginTop: 4 }} />}
                      </div>
                      <div className="at-card" style={{ flex: 1, padding: '10px 14px', marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '0.82rem', color: 'rgba(26,22,18,0.6)' }}>{s.description}</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                            {s.technique && <span style={{ background: 'rgba(156,124,255,0.1)', border: '1px solid rgba(156,124,255,0.3)', borderRadius: 4, padding: '1px 7px', fontSize: '0.66rem', color: '#9C7CFF', ...MONO }}>{s.technique}</span>}
                            {s.severity && <SeverityBadge severity={s.severity} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw correlated events */}
              <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div onClick={() => setShowEvents(s => !s)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(26,22,18,0.5)' }}>Correlated events ({result.events?.length || 0})</span>
                  <ArrowRight size={13} style={{ color: '#555', transform: showEvents ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                </div>
                {showEvents && (
                  <div style={{ borderTop: '1px solid rgba(26,22,18,0.07)' }}>
                    {(result.events || []).map((e, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < result.events.length - 1 ? '1px solid rgba(26,22,18,0.04)' : 'none', fontSize: '0.76rem' }}>
                        <Clock size={12} style={{ color: '#444', flexShrink: 0 }} />
                        <span style={{ color: '#555', ...MONO, fontSize: '0.7rem', flexShrink: 0 }}>{fmtTime(e.timestamp)}</span>
                        <span style={{ background: 'rgba(26,22,18,0.04)', border: '1px solid rgba(26,22,18,0.08)', borderRadius: 4, padding: '1px 6px', fontSize: '0.66rem', color: 'rgba(26,22,18,0.7)', flexShrink: 0, ...MONO }}>{SOURCE_LABELS[e.source] || e.source}</span>
                        {e.hostname && <span style={{ color: 'rgba(26,22,18,0.5)', fontSize: '0.7rem', ...MONO, flexShrink: 0 }}>{e.hostname}</span>}
                        <span style={{ color: 'rgba(26,22,18,0.55)', flex: 1 }}>{e.description}</span>
                        <SeverityBadge severity={e.severity} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Attack Path tab ───────────────────────────────────────────────── */}
      {activeTab === 'path' && (
        pathLoading
          ? <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,22,18,0.5)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
              Reconstructing attack path&hellip;
            </div>
          : <AttackPathViz data={pathData}/>
      )}
    </div>
  );
}
