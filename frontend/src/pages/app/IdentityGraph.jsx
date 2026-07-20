import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import {
  Plus, Trash2, RefreshCw, AlertTriangle, Shield, Key,
  Monitor, Bot, User, Link, Loader2, X, ChevronRight,
  Fingerprint, ShieldAlert, GitMerge, Search, CheckCircle,
  Activity, BarChart2
} from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';

cytoscape.use(fcose);

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const NODE_TYPES = [
  { id: 'user',            label: 'Human User',      color: '#CC785C',  Icon: User },
  { id: 'service_account', label: 'Service Account', color: '#EAB308',  Icon: Shield },
  { id: 'api_key',         label: 'API Key',          color: '#1A1612',  Icon: Key },
  { id: 'token',           label: 'Token',            color: '#F97316',  Icon: Key },
  { id: 'device',          label: 'Device',           color: '#22C55E',  Icon: Monitor },
  { id: 'agent',           label: 'AI Agent',         color: '#CC785C',  Icon: Bot },
  { id: 'prompt',          label: 'Prompt',           color: '#928E88',  Icon: GitMerge },
];

const TYPE_MAP = Object.fromEntries(NODE_TYPES.map(t => [t.id, t]));

const RELATIONSHIPS = [
  'used', 'issued', 'accessed', 'owned', 'compromised_by',
  'inherited_from', 'linked', 'escalated_to',
];

// Node type ids used for the quick-filter pills
const FILTER_NODE_TYPES = ['user', 'service_account', 'api_key', 'token', 'device', 'agent', 'ai_agent', 'prompt'];

function NodeIcon({ type, size = 14 }) {
  const meta = TYPE_MAP[type] || NODE_TYPES[0];
  const { Icon } = meta;
  return <Icon size={size} style={{ color: meta.color }} />;
}

function riskColor(score) {
  if (score >= 80) return '#EF4444';
  if (score >= 50) return '#EAB308';
  if (score >= 20) return '#1A1612';
  return '#22C55E';
}

// ── Cytoscape node visual: fill + border + risk-ring, replicated as an SVG
// data-URI background-image so the ring can sit *outside* the node border
// (r+4) the same way the original canvas draw did — Cytoscape's own pie-*
// style props only fill the node interior, which isn't the same visual. ────
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, endAngleDeg) {
  const clampedEnd = Math.min(endAngleDeg, 359.9); // avoid degenerate 360° arc
  const start = polarToCartesian(cx, cy, r, 0);
  const end = polarToCartesian(cx, cy, r, clampedEnd);
  const largeArcFlag = clampedEnd > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function nodeVisualDataUri(n, selected) {
  const r = 18, ringR = 22, size = 64, c = size / 2;
  const meta = TYPE_MAP[n.type] || NODE_TYPES[0];
  const fill = n.is_compromised ? 'rgba(239,68,68,0.2)' : `${meta.color}22`;
  const stroke = selected ? '#FFFFFF' : (n.is_compromised ? '#EF4444' : meta.color);
  const strokeWidth = selected ? 2 : (n.is_compromised ? 2 : 1.5);
  const score = n.risk_score ?? 0;
  const arcPath = score > 20 ? describeArc(c, c, ringR, (score / 100) * 360) : null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>` +
    (arcPath ? `<path d="${arcPath}" fill="none" stroke="${riskColor(score)}88" stroke-width="2"/>` : '') +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function isDimmed(n, riskFilter, typeFilter) {
  const score = n.risk_score ?? 0;
  const belowRisk = score < riskFilter;
  const wrongType = typeFilter !== null && n.type !== typeFilter;
  return belowRisk || wrongType;
}

// Cytoscape nodes and edges share ONE id namespace — this backend's node and
// edge ids are both independent auto-increment sequences starting at 1, so
// without prefixing, node id 1 and edge id 1 collide and cy.add() throws.
const cyNodeId = id => `n${id}`;
const cyEdgeId = id => `e${id}`;

const FCOSE_LAYOUT = {
  name: 'fcose',
  quality: 'default',
  randomize: true,
  animate: true,
  animationDuration: 400,
  fit: true,
  padding: 40,
  nodeRepulsion: 8000,
  idealEdgeLength: 120,
  edgeElasticity: 0.45,
  gravity: 0.25,
  numIter: 2500,
  tile: true,
  packComponents: true,
};

// ── Risk Sparkline (SVG) ───────────────────────────────────────────────────────
function RiskSparkline({ data }) {
  if (!data || data.length < 2) return null;
  const scores = data.map(d => typeof d.risk_score === 'number' ? d.risk_score : 0);
  const max = Math.max(...scores, 1);
  const w = 300, h = 60;
  const pts = scores.map((s, i) =>
    `${(i / (scores.length - 1)) * w},${h - (s / max) * (h - 4)}`
  ).join(' ');
  const areaBottom = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible', display: 'block' }}>
      <polyline points={areaBottom} fill="rgba(245,158,11,0.12)" strokeWidth="0" />
      <polyline points={pts} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Attack Path Mini-Viz for IdentityGraph overlay ───────────────────────────
function IdentityAttackPathViz({ data }) {
  if (!data) return null;
  if (!data.nodes || !data.nodes.length) {
    return (
      <div style={{ padding: '12px 0', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
        {data.summary || 'No attack path found from this node.'}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      {data.summary && (
        <div style={{ fontSize: 11, color: 'rgba(26,22,18,0.7)', lineHeight: 1.5, marginBottom: 10, padding: '8px 10px', background: 'rgba(26,22,18,0.036)', border: '1px solid rgba(26,22,18,0.12)', borderRadius: 5 }}>
          {data.summary}
        </div>
      )}
      {data.path_steps && data.path_steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.path_steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: 'rgba(26,22,18,0.024)', border: '1px solid rgba(26,22,18,0.060)', borderRadius: 4, fontSize: 11 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', flexShrink: 0, minWidth: 18 }}>{String(i+1).padStart(2,'0')}</span>
              <span style={{ color: 'var(--text-muted)', flex: 1, lineHeight: 1.4 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{step.from_label}</span>
                {' → '}
                <span style={{ color: 'rgba(26,22,18,0.7)' }}>{step.action}</span>
                {' → '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{step.to_label}</span>
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#A78BFA', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>
                {step.mitre_id}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Node Detail Overlay (slide-in panel over canvas, Feature 1) ───────────────
function NodeDetailOverlay({ node, onClose }) {
  const navigate = useNavigate();
  const [nodeHistory, setNodeHistory] = useState([]);
  const [pathData, setPathData]       = useState(null);
  const [pathLoading, setPathLoading] = useState(false);

  useEffect(() => {
    if (!node) return;
    setNodeHistory([]);
    api.get(`/api/identity/nodes/${node.id}/history?days=30`)
      .then(r => setNodeHistory(r.data))
      .catch(() => setNodeHistory([]));
  }, [node?.id]);

  if (!node) return null;

  const score = node.risk_score ?? 0;
  const color = riskColor(score);
  const barPct = Math.min(100, Math.max(0, score));
  const type = node.type || node.node_type || '';

  // Build metadata rows based on node type
  const rows = [
    ['Privilege',      node.privilege_level ?? '—'],
    ['Last Active',    node.last_active ? new Date(node.last_active).toLocaleDateString() : 'Never'],
    ['Anomalies (7d)', node.anomaly_count_7d ?? 0],
    ['Compromised',    node.is_compromised ? '⚠ YES' : 'No'],
    ['Orphaned',       node.is_orphaned ? 'Yes' : 'No'],
  ];

  if (type === 'device') {
    const meta = typeof node.metadata === 'object' && node.metadata ? node.metadata : {};
    if (meta.ip)  rows.splice(1, 0, ['IP Address', meta.ip]);
    if (meta.os)  rows.splice(2, 0, ['OS', meta.os]);
  }
  if (['ai_agent', 'agent', 'service_account', 'api_key'].includes(type)) {
    if (node.expiry_date) rows.push(['Expiry', new Date(node.expiry_date).toLocaleDateString()]);
    if (node.credential_sprawl_score != null) rows.push(['Sprawl Score', node.credential_sprawl_score]);
  }

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 340,
      background: 'var(--card)',
      borderLeft: '1px solid rgba(26,22,18,0.1)',
      overflowY: 'auto',
      zIndex: 10,
      animation: 'slideInRight 220ms cubic-bezier(0.23,1,0.32,1)',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 2 }}
      >×</button>

      {/* Node type badge */}
      <div style={{ marginBottom: 10, marginTop: 2 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(26,22,18,0.7)', background: 'rgba(139,184,232,0.1)', padding: '3px 8px', borderRadius: 3, letterSpacing: '0.06em' }}>
          {(type || 'unknown').replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Label */}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, wordBreak: 'break-all', lineHeight: 1.3 }}>
        {node.label}
      </div>

      {/* Risk score bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>RISK SCORE</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: color, fontWeight: 600 }}>
            {Math.round(score)}/100
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(26,22,18,0.060)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${barPct}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 600ms ease',
          }} />
        </div>
      </div>

      {/* Metadata rows */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(26,22,18,0.08)', fontSize: 13 }}>
            <span style={{ color: 'rgba(26,22,18,0.55)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{label}</span>
            <span style={{
              color: label === 'Compromised' && value === '⚠ YES' ? '#EF4444' : 'rgba(26,22,18,0.6)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: label === 'Compromised' && value === '⚠ YES' ? 600 : 400,
            }}>{String(value)}</span>
          </div>
        ))}
      </div>

      {/* Risk trend sparkline */}
      {nodeHistory.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>RISK TREND (30d)</div>
          <RiskSparkline data={nodeHistory} />
        </div>
      )}

      {/* Spacer pushes CTA to bottom when content is short */}
      <div style={{ flex: 1 }} />

      {/* Create Case CTA */}
      <button
        onClick={() => navigate(`/app/cases?identity=${node.id}`)}
        style={{
          marginTop: 16,
          width: '100%',
          background: '#F59E0B',
          color: '#1A1612',
          border: 'none',
          padding: '10px 0',
          borderRadius: 6,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        OPEN CASE FOR THIS IDENTITY
      </button>

      {/* Attack Path CTA */}
      <button
        onClick={async () => {
          if (pathLoading) return;
          setPathLoading(true);
          try {
            const r = await api.get(`/api/identity/attack-path?node_id=${node.id}`);
            setPathData(r.data);
          } catch {
            setPathData({ nodes: [], edges: [], path_steps: [], summary: 'Failed to load attack path.' });
          } finally {
            setPathLoading(false);
          }
        }}
        style={{
          marginTop: 8,
          width: '100%',
          background: 'rgba(167,139,250,0.12)',
          color: '#A78BFA',
          border: '1px solid rgba(167,139,250,0.25)',
          padding: '9px',
          borderRadius: 6,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {pathLoading ? <Loader2 size={12} className="spinner" /> : null}
        {pathLoading ? 'Reconstructing…' : 'Reconstruct Attack Path'}
      </button>

      {/* Attack path result panel */}
      {pathData && (
        <div style={{ marginTop: 4, borderTop: '1px solid rgba(167,139,250,0.15)', paddingTop: 8 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#A78BFA', letterSpacing: '0.08em', marginBottom: 4 }}>
            ATTACK PATH
          </div>
          <IdentityAttackPathViz data={pathData} />
        </div>
      )}
    </div>
  );
}

// ── Identity graph via Cytoscape.js ───────────────────────────────────────────
// Scope is strictly internal to this component — same external props contract
// (nodes, edges, onNodeClick, selectedId, riskFilter, typeFilter) as the old
// hand-rolled canvas version, so nothing outside this function needs to change.
function GraphCanvas({ nodes, edges, onNodeClick, selectedId, riskFilter, typeFilter }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const nodesRef = useRef(nodes);
  const selectedIdRef = useRef(selectedId);
  const riskFilterRef = useRef(riskFilter);
  const typeFilterRef = useRef(typeFilter);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { riskFilterRef.current = riskFilter; }, [riskFilter]);
  useEffect(() => { typeFilterRef.current = typeFilter; }, [typeFilter]);

  const applyDim = useCallback((cy, rFilter, tFilter) => {
    cy.batch(() => {
      cy.nodes().forEach(ele => {
        ele.toggleClass('dimmed', isDimmed(ele.data(), rFilter, tFilter));
      });
    });
  }, []);

  // Mount once — create the cytoscape instance, tear down on unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      elements: [],
      minZoom: 0.2,
      maxZoom: 3,
      style: [
        {
          selector: 'node',
          style: {
            shape: 'ellipse',
            width: 36,
            height: 36,
            'background-opacity': 0,
            'background-image': ele => nodeVisualDataUri(ele.data(), ele.hasClass('selected')),
            'background-width': '178%',
            'background-height': '178%',
            'background-clip': 'none',
            label: ele => {
              const l = ele.data('label') || '';
              return l.length > 14 ? l.slice(0, 12) + '…' : l;
            },
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'font-size': 10,
            'font-family': 'JetBrains Mono, monospace',
            color: ele => (ele.hasClass('selected') ? '#FFFFFF' : 'rgba(240,240,248,0.75)'),
            'font-weight': ele => (ele.hasClass('selected') ? 600 : 400),
          },
        },
        { selector: 'node.dimmed', style: { opacity: 0.15 } },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': 'rgba(26,22,18,0.1)',
            'curve-style': 'straight',
            'target-arrow-shape': 'none',
            label: 'data(relationship)',
            'font-size': 9,
            'font-family': 'JetBrains Mono, monospace',
            color: 'rgba(136,136,136,0.7)',
            'text-background-opacity': 0,
          },
        },
      ],
      layout: { name: 'preset' },
    });

    cy.on('tap', 'node', evt => {
      const cyId = evt.target.id();
      const original = nodesRef.current.find(n => cyNodeId(n.id) === cyId);
      onNodeClick(original || null);
    });
    cy.on('tap', evt => {
      if (evt.target === cy) onNodeClick(null);
    });

    const onResize = () => cy.resize();
    window.addEventListener('resize', onResize);

    cyRef.current = cy;
    return () => {
      window.removeEventListener('resize', onResize);
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // Data sync — only wipe + relayout when the actual node/edge *set* changes;
  // otherwise just patch element data in place so positions (and any in-
  // progress drag) aren't disturbed by e.g. a risk-score-only update.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const nodeIds = new Set(nodes.map(n => cyNodeId(n.id)));
    const edgeIds = new Set(edges.map(e => cyEdgeId(e.id)));
    const existingNodeIds = new Set(cy.nodes().map(n => n.id()));
    const existingEdgeIds = new Set(cy.edges().map(e => e.id()));

    const sameSet = (a, b) => a.size === b.size && [...a].every(id => b.has(id));

    if (sameSet(nodeIds, existingNodeIds) && sameSet(edgeIds, existingEdgeIds)) {
      cy.batch(() => {
        nodes.forEach(n => cy.getElementById(cyNodeId(n.id)).data({ ...n, id: cyNodeId(n.id) }));
        edges.forEach(e => cy.getElementById(cyEdgeId(e.id)).data({
          ...e, id: cyEdgeId(e.id), source: cyNodeId(e.source), target: cyNodeId(e.target),
        }));
      });
      applyDim(cy, riskFilterRef.current, typeFilterRef.current);
      return;
    }

    cy.elements().remove();
    cy.add([
      ...nodes.map(n => ({ group: 'nodes', data: { ...n, id: cyNodeId(n.id) } })),
      ...edges.map(e => ({
        group: 'edges',
        data: { ...e, id: cyEdgeId(e.id), source: cyNodeId(e.source), target: cyNodeId(e.target) },
      })),
    ]);
    cy.layout(FCOSE_LAYOUT).run();

    if (selectedIdRef.current != null) {
      cy.getElementById(cyNodeId(selectedIdRef.current)).addClass('selected');
    }
    applyDim(cy, riskFilterRef.current, typeFilterRef.current);
  }, [nodes, edges, applyDim]);

  // Selection — toggle .selected class only, no relayout.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().removeClass('selected');
      if (selectedId != null) cy.getElementById(cyNodeId(selectedId)).addClass('selected');
    });
  }, [selectedId]);

  // Filters — dim non-matching nodes, edges deliberately untouched (matches
  // the original's dim-inconsistency rather than "fixing" it out of scope).
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    applyDim(cy, riskFilter, typeFilter);
  }, [riskFilter, typeFilter, applyDim]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#E8E0D4' }}
    />
  );
}

const SEV_COLOR = { low: '#22C55E', medium: '#EAB308', high: '#F97316', critical: '#EF4444' };

// ── Node Detail Panel (v4.0 — with anomaly management + risk engine) ──────────
function NodePanel({ node, onMarkCompromised, onDelete, onClose, onScoreUpdate }) {
  const { addToast } = useStore();
  const [anomalies, setAnomalies]       = useState([]);
  const [anomLoading, setAnomLoading]   = useState(false);
  const [showAddAnom, setShowAddAnom]   = useState(false);
  const [recalcResult, setRecalcResult] = useState(null);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [anomForm, setAnomForm]         = useState({
    anomaly_type: '', description: '', severity: 'medium', confidence: 0.8,
  });

  if (!node) return null;
  const meta = TYPE_MAP[node.type] || NODE_TYPES[0];
  const { Icon } = meta;

  const loadAnomalies = useCallback(() => {
    setAnomLoading(true);
    api.get(`/api/identity/nodes/${node.id}/anomalies?resolved=false`)
      .then(r => setAnomalies(r.data))
      .catch(() => {})
      .finally(() => setAnomLoading(false));
  }, [node.id]);

  useEffect(() => { loadAnomalies(); setRecalcResult(null); }, [node.id]);

  const addAnomaly = async () => {
    if (!anomForm.anomaly_type.trim() || !anomForm.description.trim()) {
      addToast('Type and description required', 'error'); return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/api/identity/nodes/${node.id}/anomalies`, anomForm);
      loadAnomalies();
      setRecalcResult(res.data);
      if (onScoreUpdate) onScoreUpdate(node.id, res.data.risk_score);
      setShowAddAnom(false);
      setAnomForm({ anomaly_type: '', description: '', severity: 'medium', confidence: 0.8 });
      addToast('Anomaly recorded, risk score updated', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
    setSaving(false);
  };

  const resolveAnomaly = async (anomId) => {
    try {
      const res = await api.patch(`/api/identity/nodes/${node.id}/anomalies/${anomId}/resolve`);
      loadAnomalies();
      if (onScoreUpdate) onScoreUpdate(node.id, res.data.new_score);
      addToast('Anomaly resolved', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const recalculate = async () => {
    setRecalcLoading(true);
    try {
      const res = await api.post(`/api/identity/nodes/${node.id}/recalculate`);
      setRecalcResult(res.data);
      if (onScoreUpdate) onScoreUpdate(node.id, res.data.new_score);
      addToast(`Risk score: ${res.data.old_score} → ${res.data.new_score}`, 'success');
    } catch { addToast('Recalculate failed', 'error'); }
    setRecalcLoading(false);
  };

  return (
    <div style={{ width: 300, background: 'var(--surface)', borderLeft: '1px solid rgba(26,22,18,0.1)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(26,22,18,0.1)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Icon size={14} style={{ color: meta.color }} />
        <div style={{ flex: 1, fontWeight: 600, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><X size={13} /></button>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
        {/* Type + risk badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', background: `${meta.color}18`, color: meta.color, padding: '2px 7px', borderRadius: 3, ...MONO }}>{node.type?.replace('_', ' ').toUpperCase()}</span>
          <span style={{ fontSize: '0.65rem', background: `${riskColor(node.risk_score)}18`, color: riskColor(node.risk_score), padding: '2px 7px', borderRadius: 3, ...MONO }}>RISK {node.risk_score ?? 0}</span>
          {node.is_compromised && <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '2px 7px', borderRadius: 3, ...MONO }}>COMPROMISED</span>}
          {anomalies.length > 0 && <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.12)', color: '#F5B84B', padding: '2px 7px', borderRadius: 3, ...MONO }}>{anomalies.length} ANOMALY</span>}
        </div>

        {/* Timestamps */}
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', ...MONO, lineHeight: 1.8 }}>
          First seen: {node.first_seen ? new Date(node.first_seen).toLocaleString() : '—'}<br/>
          Last seen: {node.last_seen ? new Date(node.last_seen).toLocaleString() : '—'}
        </div>

        {/* Metadata */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, ...MONO }}>Metadata</div>
            {Object.entries(node.metadata).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(26,22,18,0.036)', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 60 }}>{k}</span>
                <span style={{ color: 'rgba(26,22,18,0.7)', ...MONO, wordBreak: 'break-all', fontSize: '0.68rem' }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── ANOMALIES SECTION ─────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(26,22,18,0.08)', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', ...MONO, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={10} style={{ color: '#F5B84B' }} /> Anomalies ({anomalies.length})
            </div>
            <button onClick={() => setShowAddAnom(p => !p)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.68rem', ...MONO, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Plus size={10} /> Add
            </button>
          </div>

          {/* Add anomaly form */}
          {showAddAnom && (
            <div style={{ background: 'rgba(26,22,18,0.030)', border: '1px solid rgba(26,22,18,0.060)', borderRadius: 6, padding: 10, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <input className="at-input" value={anomForm.anomaly_type} onChange={e => setAnomForm(p => ({...p, anomaly_type: e.target.value}))} placeholder="Type (e.g. impossible_travel)" style={{ fontSize: '0.72rem', ...MONO }} />
              <input className="at-input" value={anomForm.description} onChange={e => setAnomForm(p => ({...p, description: e.target.value}))} placeholder="Description" style={{ fontSize: '0.72rem' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="at-select" value={anomForm.severity} onChange={e => setAnomForm(p => ({...p, severity: e.target.value}))} style={{ flex: 1, fontSize: '0.72rem' }}>
                  {['low','medium','high','critical'].map(s => <option key={s}>{s}</option>)}
                </select>
                <input type="number" className="at-input" min="0" max="1" step="0.1" value={anomForm.confidence} onChange={e => setAnomForm(p => ({...p, confidence: parseFloat(e.target.value)}))} style={{ width: 56, fontSize: '0.72rem', ...MONO }} />
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <button className="btn-accent" onClick={addAnomaly} disabled={saving} style={{ fontSize: '0.7rem', flex: 1 }}>
                  {saving ? <Loader2 size={11} className="spinner" /> : 'Record'}
                </button>
                <button className="btn-ghost" onClick={() => setShowAddAnom(false)} style={{ fontSize: '0.7rem' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Anomaly list */}
          {anomLoading ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}><Loader2 size={13} className="spinner" style={{ color: 'var(--text-muted)' }} /></div>
          ) : anomalies.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: '#404040', ...MONO, textAlign: 'center', padding: '6px 0' }}>No active anomalies</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {anomalies.map(a => (
                <div key={a.id} style={{ background: `${SEV_COLOR[a.severity] || 'rgba(26,22,18,0.35)'}08`, border: `1px solid ${SEV_COLOR[a.severity] || 'rgba(26,22,18,0.35)'}25`, borderRadius: 5, padding: '7px 9px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: SEV_COLOR[a.severity] || 'rgba(26,22,18,0.5)', ...MONO }}>{a.anomaly_type}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: '0.6rem', color: SEV_COLOR[a.severity] || 'rgba(26,22,18,0.5)', ...MONO }}>{a.severity}</span>
                      <button onClick={() => resolveAnomaly(a.id)} title="Mark resolved" style={{ background: 'none', border: 'none', color: '#22C55E', cursor: 'pointer', padding: '1px' }}>
                        <CheckCircle size={11} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{a.description}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', ...MONO, marginTop: 3 }}>
                    Confidence: {Math.round(a.confidence * 100)}% · {new Date(a.detected_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RISK ENGINE SECTION ───────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(26,22,18,0.08)', paddingTop: 10 }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, ...MONO, display: 'flex', alignItems: 'center', gap: 5 }}>
            <BarChart2 size={10} style={{ color: 'var(--accent)' }} /> Risk Engine
          </div>
          <button className="btn-ghost" onClick={recalculate} disabled={recalcLoading} style={{ width: '100%', fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {recalcLoading ? <Loader2 size={12} className="spinner" /> : <RefreshCw size={12} />}
            Recalculate Risk Score
          </button>

          {recalcResult && (
            <div style={{ marginTop: 8, background: 'rgba(26,22,18,0.036)', border: '1px solid rgba(26,22,18,0.12)', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent)', ...MONO, marginBottom: 6 }}>
                {recalcResult.old_score ?? '—'} → <strong>{recalcResult.new_score}</strong>
                {recalcResult.new_score > (recalcResult.old_score ?? 0) ? ' ↑' : ' ↓'}
              </div>
              {recalcResult.detector_results?.map(d => (
                <div key={d.name} style={{ display: 'flex', gap: 6, fontSize: '0.65rem', ...MONO, padding: '2px 0', borderBottom: '1px solid rgba(26,22,18,0.036)' }}>
                  <span style={{ color: 'var(--text-muted)', flex: 1 }}>{d.name}</span>
                  <span style={{ color: d.score > 50 ? '#EF4444' : d.score > 20 ? '#F5B84B' : '#22C55E' }}>{d.score}</span>
                  <span style={{ color: '#404040' }}>×{d.weight}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── NODE ACTIONS ──────────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(26,22,18,0.08)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className={node.is_compromised ? 'btn-ghost' : 'btn-danger'} onClick={() => onMarkCompromised(node.id, !node.is_compromised)} style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={12} />
            {node.is_compromised ? 'Clear Compromised Flag' : 'Mark as Compromised'}
          </button>
          <button className="btn-ghost" onClick={() => onDelete(node.id)} style={{ fontSize: '0.74rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={12} /> Delete Node
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IdentityGraph() {
  const { addToast } = useStore();
  const navigate = useNavigate();
  const [graph, setGraph]       = useState({ nodes: [], edges: [], stats: {} });
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [q, setQ]               = useState('');
  const [form, setForm]         = useState({ label: '', node_type: 'user', risk_score: 0, metadata: '{}' });
  const [edgeForm, setEdgeForm] = useState({ source_id: '', target_id: '', relationship: 'linked' });
  const [showEdge, setShowEdge] = useState(false);

  // ── Feature 2: Risk score filter ──────────────────────────────────────────
  const [riskFilter, setRiskFilter] = useState(0);

  // ── Feature 3: Node type quick filter ─────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/identity/graph')
      .then(r => { setGraph(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNode = async () => {
    try {
      let metadata = {};
      try { metadata = JSON.parse(form.metadata || '{}'); } catch { metadata = {}; }
      await api.post('/api/identity/nodes', {
        ...form,
        risk_score: parseInt(form.risk_score) || 0,
        metadata,
      });
      setShowAdd(false);
      setForm({ label: '', node_type: 'user', risk_score: 0, metadata: '{}' });
      load();
      addToast('Identity node created', 'success');
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to create node', 'error');
    }
  };

  const markCompromised = async (id, value) => {
    try {
      const res = await api.post(`/api/identity/nodes/${id}/mark-compromised`, { compromised: value });
      load();
      setSelected(res.data);
      addToast(value ? 'Node marked as compromised' : 'Compromised flag cleared', 'success');
    } catch { addToast('Update failed', 'error'); }
  };

  const deleteNode = async (id) => {
    if (!window.confirm('Delete this identity node?')) return;
    try {
      await api.delete(`/api/identity/nodes/${id}`);
      setSelected(null);
      load();
      addToast('Node deleted', 'success');
    } catch { addToast('Delete failed', 'error'); }
  };

  const createEdge = async () => {
    if (!edgeForm.source_id || !edgeForm.target_id) { addToast('Both nodes required', 'error'); return; }
    try {
      await api.post('/api/identity/edges', {
        source_id: parseInt(edgeForm.source_id),
        target_id: parseInt(edgeForm.target_id),
        relationship: edgeForm.relationship,
      });
      setShowEdge(false);
      load();
      addToast('Edge created', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
  };

  const filteredNodes = q
    ? graph.nodes.filter(n => n.label.toLowerCase().includes(q.toLowerCase()))
    : graph.nodes;

  // Visible count (both filters applied) for display in toolbar
  const visibleCount = graph.nodes.filter(n => {
    const score = n.risk_score ?? 0;
    const passRisk = score >= riskFilter;
    const passType = typeFilter === null || n.type === typeFilter;
    return passRisk && passType;
  }).length;

  // Only show pills for types actually present in the graph
  const presentTypes = [...new Set(graph.nodes.map(n => n.type))].filter(Boolean);
  const pillTypes = FILTER_NODE_TYPES.filter(t => presentTypes.includes(t));

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--card)', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{ width: 220, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid rgba(26,22,18,0.1)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(26,22,18,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Fingerprint size={14} style={{ color: 'rgba(26,22,18,0.7)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Identity Graph</span>
            </div>
            <button onClick={load} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><RefreshCw size={12} /></button>
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
            {[
              { label: 'Nodes', val: graph.stats?.total_nodes || 0, color: 'var(--text-primary)' },
              { label: 'Edges', val: graph.stats?.total_edges || 0, color: 'var(--text-muted)' },
              { label: 'Compromised', val: graph.stats?.compromised || 0, color: '#EF4444' },
              { label: 'High Risk', val: graph.stats?.high_risk || 0, color: '#EAB308' },
            ].map(s => (
              <div key={s.label} style={{ padding: '5px 8px', background: 'rgba(26,22,18,0.030)', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: s.color, ...MONO }}>{s.val}</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button className="btn-accent" onClick={() => setShowAdd(true)} style={{ flex: 1, fontSize: '0.7rem', padding: '5px 8px' }}>
              <Plus size={11} /> Node
            </button>
            <button className="btn-ghost" onClick={() => setShowEdge(true)} style={{ flex: 1, fontSize: '0.7rem', padding: '5px 8px' }}>
              <Link size={11} /> Edge
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(26,22,18,0.042)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--card)', border: '1px solid rgba(26,22,18,0.060)', borderRadius: 5, padding: '4px 8px' }}>
            <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search nodes…"
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.72rem', ...MONO, flex: 1 }} />
          </div>
        </div>

        {/* Node list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center' }}><Loader2 size={16} className="spinner" style={{ color: 'var(--text-muted)' }} /></div>
          ) : filteredNodes.length === 0 ? (
            <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', ...MONO }}>
              No identity nodes yet.<br />Add one to start building the graph.
            </div>
          ) : (
            filteredNodes.map(n => {
              const meta = TYPE_MAP[n.type] || NODE_TYPES[0];
              const { Icon } = meta;
              return (
                <div
                  key={n.id}
                  onClick={() => setSelected(n)}
                  style={{
                    padding: '8px 8px', borderRadius: 5, cursor: 'pointer', marginBottom: 2,
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: selected?.id === n.id ? 'rgba(26,22,18,0.08)' : 'transparent',
                    border: `1px solid ${selected?.id === n.id ? 'rgba(26,22,18,0.14)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (selected?.id !== n.id) e.currentTarget.style.background = 'rgba(26,22,18,0.030)'; }}
                  onMouseLeave={e => { if (selected?.id !== n.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={12} style={{ color: n.is_compromised ? '#EF4444' : meta.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: n.is_compromised ? '#EF4444' : 'rgba(26,22,18,0.6)' }}>{n.label}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', ...MONO }}>{n.type?.replace('_', ' ')}</div>
                  </div>
                  {n.risk_score > 0 && (
                    <span style={{ fontSize: '0.6rem', color: riskColor(n.risk_score), ...MONO, flexShrink: 0 }}>{n.risk_score}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Canvas area — column flex to hold filter toolbar + canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Feature 2 & 3: Filter toolbar ────────────────────────────────── */}
        <div style={{
          padding: '8px 14px',
          borderBottom: '1px solid rgba(26,22,18,0.1)',
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          flexShrink: 0,
        }}>
          {/* Row 1: Risk score slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
              MIN RISK
            </span>
            <input
              type="range" min="0" max="90" step="5"
              value={riskFilter}
              onChange={e => setRiskFilter(Number(e.target.value))}
              style={{ width: 110, accentColor: '#F59E0B', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#F59E0B', minWidth: 28, fontWeight: 600 }}>
              {riskFilter}+
            </span>
            {riskFilter > 0 && (
              <button
                onClick={() => setRiskFilter(0)}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, background: 'none', border: '1px solid rgba(26,22,18,0.084)', color: 'var(--text-muted)', padding: '2px 8px', cursor: 'pointer', borderRadius: 4 }}
              >
                Clear
              </button>
            )}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
              {visibleCount} / {graph.nodes.length} shown
            </span>
          </div>

          {/* Row 2: Node type pills (only types present in graph) */}
          {pillTypes.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', marginRight: 2 }}>TYPE</span>
              {pillTypes.map(type => {
                const active = typeFilter === type;
                const meta = TYPE_MAP[type];
                const color = meta ? meta.color : 'rgba(26,22,18,0.5)';
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(active ? null : type)}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      padding: '3px 9px',
                      border: '1px solid',
                      borderColor: active ? color : 'rgba(26,22,18,0.084)',
                      background: active ? `${color}18` : 'transparent',
                      color: active ? color : 'rgba(26,22,18,0.5)',
                      cursor: 'pointer',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      transition: 'all 140ms ease-out',
                    }}
                  >
                    {type.replace(/_/g, ' ')}
                  </button>
                );
              })}
              {typeFilter && (
                <button
                  onClick={() => setTypeFilter(null)}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, background: 'none', border: '1px solid rgba(26,22,18,0.084)', color: 'var(--text-muted)', padding: '3px 8px', cursor: 'pointer', borderRadius: 4 }}
                >
                  All
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Canvas ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {graph.nodes.length === 0 && !loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <Fingerprint size={40} style={{ margin: '0 auto 16px', opacity: 0.12 }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>No identity nodes yet</div>
                <div style={{ fontSize: '0.78rem', ...MONO, marginBottom: 20, maxWidth: 300, lineHeight: 1.6 }}>
                  Add users, service accounts, API keys, tokens, devices, and AI agents to build the identity graph.
                </div>
                <button className="btn-accent" onClick={() => setShowAdd(true)} style={{ fontSize: '0.8rem' }}>
                  <Plus size={13} /> Add First Identity
                </button>
              </div>
            </div>
          ) : (
            <GraphCanvas
              nodes={graph.nodes}
              edges={graph.edges}
              onNodeClick={setSelected}
              selectedId={selected?.id}
              riskFilter={riskFilter}
              typeFilter={typeFilter}
            />
          )}

          {/* Node type legend */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {NODE_TYPES.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(245,240,232,0.95)', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 4, fontSize: '0.62rem', color: t.color, ...MONO }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color }} />
                {t.label}
              </div>
            ))}
          </div>

          {/* ── Feature 1: Slide-in node detail overlay ──────────────────────── */}
          {selected && (
            <NodeDetailOverlay
              node={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>

      {/* Existing NodePanel (anomaly management + risk engine) — right sidebar */}
      {selected && (
        <NodePanel
          node={selected}
          onMarkCompromised={markCompromised}
          onDelete={deleteNode}
          onClose={() => setSelected(null)}
          onScoreUpdate={(nodeId, newScore) => {
            setGraph(prev => ({
              ...prev,
              nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, risk_score: newScore } : n),
            }));
            setSelected(prev => prev?.id === nodeId ? { ...prev, risk_score: newScore } : prev);
          }}
        />
      )}

      {/* Add Node Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(26,22,18,0.084)', borderRadius: 10, padding: 24, width: 380, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 600 }}>Add Identity Node</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="at-label">Label / Name *</label>
                <input className="at-input" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="admin@corp.com" style={{ fontSize: '0.8rem' }} />
              </div>
              <div>
                <label className="at-label">Type</label>
                <select className="at-select" value={form.node_type} onChange={e => setForm(p => ({ ...p, node_type: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                  {NODE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="at-label">Risk Score (0–100)</label>
                <input type="number" min="0" max="100" className="at-input" value={form.risk_score} onChange={e => setForm(p => ({ ...p, risk_score: e.target.value }))} style={{ fontSize: '0.8rem', ...MONO }} />
              </div>
              <div>
                <label className="at-label">Metadata (JSON, optional)</label>
                <textarea className="at-input" value={form.metadata} onChange={e => setForm(p => ({ ...p, metadata: e.target.value }))} placeholder='{"role": "admin", "department": "IT"}' rows={2} style={{ fontSize: '0.75rem', ...MONO, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-accent" onClick={createNode} style={{ fontSize: '0.8rem' }}>Create Node</button>
              <button className="btn-ghost" onClick={() => setShowAdd(false)} style={{ fontSize: '0.8rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Edge Modal */}
      {showEdge && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowEdge(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(26,22,18,0.084)', borderRadius: 10, padding: 24, width: 360, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 600 }}>Link Identity Nodes</div>
              <button onClick={() => setShowEdge(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Source Node ID', 'source_id'], ['Target Node ID', 'target_id']].map(([lbl, key]) => (
                <div key={key}>
                  <label className="at-label">{lbl}</label>
                  <select className="at-select" value={edgeForm[key]} onChange={e => setEdgeForm(p => ({ ...p, [key]: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                    <option value="">Select node…</option>
                    {graph.nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.type})</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="at-label">Relationship</label>
                <select className="at-select" value={edgeForm.relationship} onChange={e => setEdgeForm(p => ({ ...p, relationship: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-accent" onClick={createEdge} style={{ fontSize: '0.8rem' }}>Create Edge</button>
              <button className="btn-ghost" onClick={() => setShowEdge(false)} style={{ fontSize: '0.8rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
