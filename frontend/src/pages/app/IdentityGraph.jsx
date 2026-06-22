import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, RefreshCw, AlertTriangle, Shield, Key,
  Monitor, Bot, User, Link, Loader2, X, ChevronRight,
  Fingerprint, ShieldAlert, GitMerge, Search, CheckCircle,
  Activity, BarChart2
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const NODE_TYPES = [
  { id: 'user',            label: 'Human User',      color: '#4A7EC8',  Icon: User },
  { id: 'service_account', label: 'Service Account', color: '#EAB308',  Icon: Shield },
  { id: 'api_key',         label: 'API Key',          color: '#8BB8E8',  Icon: Key },
  { id: 'token',           label: 'Token',            color: '#F97316',  Icon: Key },
  { id: 'device',          label: 'Device',           color: '#22C55E',  Icon: Monitor },
  { id: 'agent',           label: 'AI Agent',         color: '#4A7EC8',  Icon: Bot },
  { id: 'prompt',          label: 'Prompt',           color: '#787878',  Icon: GitMerge },
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
  if (score >= 20) return '#8BB8E8';
  return '#22C55E';
}

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
      <div style={{ padding: '12px 0', fontSize: 11, color: '#787878', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
        {data.summary || 'No attack path found from this node.'}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      {data.summary && (
        <div style={{ fontSize: 11, color: '#8BB8E8', lineHeight: 1.5, marginBottom: 10, padding: '8px 10px', background: 'rgba(74,126,200,0.06)', border: '1px solid rgba(74,126,200,0.15)', borderRadius: 5 }}>
          {data.summary}
        </div>
      )}
      {data.path_steps && data.path_steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.path_steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', background: 'rgba(74,126,200,0.04)', border: '1px solid rgba(74,126,200,0.1)', borderRadius: 4, fontSize: 11 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#555', flexShrink: 0, minWidth: 18 }}>{String(i+1).padStart(2,'0')}</span>
              <span style={{ color: '#909090', flex: 1, lineHeight: 1.4 }}>
                <span style={{ color: '#BDD4E8', fontWeight: 600 }}>{step.from_label}</span>
                {' → '}
                <span style={{ color: '#8BB8E8' }}>{step.action}</span>
                {' → '}
                <span style={{ color: '#BDD4E8', fontWeight: 600 }}>{step.to_label}</span>
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
      background: '#050505',
      borderLeft: '1px solid rgba(74,126,200,0.12)',
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
        style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: '#787878', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 2 }}
      >×</button>

      {/* Node type badge */}
      <div style={{ marginBottom: 10, marginTop: 2 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#8BB8E8', background: 'rgba(139,184,232,0.1)', padding: '3px 8px', borderRadius: 3, letterSpacing: '0.06em' }}>
          {(type || 'unknown').replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Label */}
      <div style={{ fontSize: 16, fontWeight: 600, color: '#BDD4E8', marginBottom: 16, wordBreak: 'break-all', lineHeight: 1.3 }}>
        {node.label}
      </div>

      {/* Risk score bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#787878', letterSpacing: '0.06em' }}>RISK SCORE</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: color, fontWeight: 600 }}>
            {Math.round(score)}/100
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(74,126,200,0.1)', borderRadius: 3, overflow: 'hidden' }}>
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
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(74,126,200,0.08)', fontSize: 13 }}>
            <span style={{ color: '#7A9DB8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{label}</span>
            <span style={{
              color: label === 'Compromised' && value === '⚠ YES' ? '#EF4444' : '#BDD4E8',
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
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#787878', letterSpacing: '0.06em', marginBottom: 8 }}>RISK TREND (30d)</div>
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
          color: '#0d0d0d',
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

// ── Simple force-directed graph via Canvas ────────────────────────────────────
function GraphCanvas({ nodes, edges, onNodeClick, selectedId, riskFilter, typeFilter }) {
  const canvasRef = useRef(null);
  const posRef = useRef({});
  const velRef = useRef({});
  const dragRef = useRef(null);
  const animRef = useRef(null);

  // Initialize positions
  useEffect(() => {
    nodes.forEach(n => {
      if (!posRef.current[n.id]) {
        const angle = Math.random() * Math.PI * 2;
        const r = 100 + Math.random() * 200;
        posRef.current[n.id] = { x: 400 + Math.cos(angle) * r, y: 300 + Math.sin(angle) * r };
        velRef.current[n.id] = { x: 0, y: 0 };
      }
    });
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let running = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    function simulate() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      const ids = nodes.map(n => n.id);

      // Repulsion
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = posRef.current[ids[i]];
          const b = posRef.current[ids[j]];
          if (!a || !b) continue;
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 8000 / (d * d);
          const fx = (dx / d) * force, fy = (dy / d) * force;
          velRef.current[ids[i]].x += fx * 0.1;
          velRef.current[ids[i]].y += fy * 0.1;
          velRef.current[ids[j]].x -= fx * 0.1;
          velRef.current[ids[j]].y -= fy * 0.1;
        }
      }

      // Attraction along edges
      edges.forEach(e => {
        const a = posRef.current[e.source];
        const b = posRef.current[e.target];
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (d - 120) * 0.04;
        const fx = (dx / d) * force, fy = (dy / d) * force;
        velRef.current[e.source].x += fx;
        velRef.current[e.source].y += fy;
        velRef.current[e.target].x -= fx;
        velRef.current[e.target].y -= fy;
      });

      // Centre gravity + damping
      ids.forEach(id => {
        const p = posRef.current[id];
        const v = velRef.current[id];
        if (!p || !v) return;
        v.x += (W / 2 - p.x) * 0.002;
        v.y += (H / 2 - p.y) * 0.002;
        v.x *= 0.85;
        v.y *= 0.85;
        if (dragRef.current !== id) {
          p.x += v.x;
          p.y += v.y;
          p.x = Math.max(30, Math.min(W - 30, p.x));
          p.y = Math.max(30, Math.min(H - 30, p.y));
        }
      });
    }

    function isDimmed(n) {
      const score = n.risk_score ?? 0;
      const belowRisk = score < riskFilter;
      const wrongType = typeFilter !== null && n.type !== typeFilter;
      return belowRisk || wrongType;
    }

    function draw() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);

      // Edges
      edges.forEach(e => {
        const a = posRef.current[e.source];
        const b = posRef.current[e.target];
        if (!a || !b) return;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(74,126,200,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Label
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.fillStyle = 'rgba(136,136,136,0.7)';
        ctx.font = '9px JetBrains Mono';
        ctx.fillText(e.relationship, mx, my);
      });

      // Nodes
      nodes.forEach(n => {
        const p = posRef.current[n.id];
        if (!p) return;
        const meta = TYPE_MAP[n.type] || NODE_TYPES[0];
        const isSelected = n.id === selectedId;
        const dimmed = isDimmed(n);
        const r = 18;

        ctx.save();
        ctx.globalAlpha = dimmed ? 0.15 : 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.is_compromised ? 'rgba(239,68,68,0.2)' : `${meta.color}22`;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#FFFFFF' : (n.is_compromised ? '#EF4444' : meta.color);
        ctx.lineWidth = isSelected ? 2 : (n.is_compromised ? 2 : 1.5);
        ctx.stroke();

        // Risk ring
        if (n.risk_score > 20) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4, 0, (n.risk_score / 100) * Math.PI * 2);
          ctx.strokeStyle = riskColor(n.risk_score) + '88';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(240,240,248,0.75)';
        ctx.font = `${isSelected ? '600 ' : ''}10px JetBrains Mono`;
        ctx.textAlign = 'center';
        ctx.fillText(
          n.label.length > 14 ? n.label.slice(0, 12) + '…' : n.label,
          p.x, p.y + r + 14
        );
        ctx.textAlign = 'left';

        ctx.restore();
      });
    }

    function loop() {
      if (!running) return;
      simulate();
      draw();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    // Mouse interaction
    const getNode = (mx, my) => {
      const rect = canvas.getBoundingClientRect();
      const x = mx - rect.left, y = my - rect.top;
      for (const n of nodes) {
        const p = posRef.current[n.id];
        if (!p) continue;
        const dx = x - p.x, dy = y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) return n;
      }
      return null;
    };

    const onMouseDown = e => {
      const n = getNode(e.clientX, e.clientY);
      if (n) { dragRef.current = n.id; onNodeClick(n); }
      else { dragRef.current = null; onNodeClick(null); }
    };
    const onMouseMove = e => {
      if (!dragRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const p = posRef.current[dragRef.current];
      if (p) { p.x = e.clientX - rect.left; p.y = e.clientY - rect.top; }
    };
    const onMouseUp = () => { dragRef.current = null; };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
    };
  }, [nodes, edges, selectedId, riskFilter, typeFilter]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
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
    <div style={{ width: 300, background: '#0E0E16', borderLeft: '1px solid rgba(74,126,200,0.12)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(74,126,200,0.12)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Icon size={14} style={{ color: meta.color }} />
        <div style={{ flex: 1, fontWeight: 600, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer', padding: 2 }}><X size={13} /></button>
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
        <div style={{ fontSize: '0.68rem', color: '#787878', ...MONO, lineHeight: 1.8 }}>
          First seen: {node.first_seen ? new Date(node.first_seen).toLocaleString() : '—'}<br/>
          Last seen: {node.last_seen ? new Date(node.last_seen).toLocaleString() : '—'}
        </div>

        {/* Metadata */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div>
            <div style={{ fontSize: '0.6rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, ...MONO }}>Metadata</div>
            {Object.entries(node.metadata).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(74,126,200,0.06)', fontSize: '0.7rem' }}>
                <span style={{ color: '#787878', minWidth: 60 }}>{k}</span>
                <span style={{ color: 'rgba(240,240,248,0.7)', ...MONO, wordBreak: 'break-all', fontSize: '0.68rem' }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── ANOMALIES SECTION ─────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(74,126,200,0.08)', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: '0.6rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', ...MONO, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={10} style={{ color: '#F5B84B' }} /> Anomalies ({anomalies.length})
            </div>
            <button onClick={() => setShowAddAnom(p => !p)} style={{ background: 'none', border: 'none', color: '#4A7EC8', cursor: 'pointer', fontSize: '0.68rem', ...MONO, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Plus size={10} /> Add
            </button>
          </div>

          {/* Add anomaly form */}
          {showAddAnom && (
            <div style={{ background: 'rgba(74,126,200,0.05)', border: '1px solid rgba(74,126,200,0.1)', borderRadius: 6, padding: 10, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
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
            <div style={{ textAlign: 'center', padding: '8px 0' }}><Loader2 size={13} className="spinner" style={{ color: '#787878' }} /></div>
          ) : anomalies.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: '#404040', ...MONO, textAlign: 'center', padding: '6px 0' }}>No active anomalies</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {anomalies.map(a => (
                <div key={a.id} style={{ background: `${SEV_COLOR[a.severity] || '#888888'}08`, border: `1px solid ${SEV_COLOR[a.severity] || '#888888'}25`, borderRadius: 5, padding: '7px 9px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: SEV_COLOR[a.severity] || '#787878', ...MONO }}>{a.anomaly_type}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: '0.6rem', color: SEV_COLOR[a.severity] || '#787878', ...MONO }}>{a.severity}</span>
                      <button onClick={() => resolveAnomaly(a.id)} title="Mark resolved" style={{ background: 'none', border: 'none', color: '#22C55E', cursor: 'pointer', padding: '1px' }}>
                        <CheckCircle size={11} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#909090', lineHeight: 1.4 }}>{a.description}</div>
                  <div style={{ fontSize: '0.6rem', color: '#787878', ...MONO, marginTop: 3 }}>
                    Confidence: {Math.round(a.confidence * 100)}% · {new Date(a.detected_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RISK ENGINE SECTION ───────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(74,126,200,0.08)', paddingTop: 10 }}>
          <div style={{ fontSize: '0.6rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, ...MONO, display: 'flex', alignItems: 'center', gap: 5 }}>
            <BarChart2 size={10} style={{ color: '#4A7EC8' }} /> Risk Engine
          </div>
          <button className="btn-ghost" onClick={recalculate} disabled={recalcLoading} style={{ width: '100%', fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {recalcLoading ? <Loader2 size={12} className="spinner" /> : <RefreshCw size={12} />}
            Recalculate Risk Score
          </button>

          {recalcResult && (
            <div style={{ marginTop: 8, background: 'rgba(74,126,200,0.06)', border: '1px solid rgba(74,126,200,0.15)', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: '0.7rem', color: '#4A7EC8', ...MONO, marginBottom: 6 }}>
                {recalcResult.old_score ?? '—'} → <strong>{recalcResult.new_score}</strong>
                {recalcResult.new_score > (recalcResult.old_score ?? 0) ? ' ↑' : ' ↓'}
              </div>
              {recalcResult.detector_results?.map(d => (
                <div key={d.name} style={{ display: 'flex', gap: 6, fontSize: '0.65rem', ...MONO, padding: '2px 0', borderBottom: '1px solid rgba(74,126,200,0.06)' }}>
                  <span style={{ color: '#787878', flex: 1 }}>{d.name}</span>
                  <span style={{ color: d.score > 50 ? '#EF4444' : d.score > 20 ? '#F5B84B' : '#22C55E' }}>{d.score}</span>
                  <span style={{ color: '#404040' }}>×{d.weight}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── NODE ACTIONS ──────────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(74,126,200,0.08)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
    <div style={{ display: 'flex', height: '100%', background: '#050505', overflow: 'hidden' }}>
      {/* Left panel */}
      <div style={{ width: 220, flexShrink: 0, background: '#0E0E16', borderRight: '1px solid rgba(74,126,200,0.12)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(74,126,200,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Fingerprint size={14} style={{ color: '#8BB8E8' }} />
              <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Identity Graph</span>
            </div>
            <button onClick={load} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer', padding: 2 }}><RefreshCw size={12} /></button>
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
            {[
              { label: 'Nodes', val: graph.stats?.total_nodes || 0, color: '#BDD4E8' },
              { label: 'Edges', val: graph.stats?.total_edges || 0, color: '#787878' },
              { label: 'Compromised', val: graph.stats?.compromised || 0, color: '#EF4444' },
              { label: 'High Risk', val: graph.stats?.high_risk || 0, color: '#EAB308' },
            ].map(s => (
              <div key={s.label} style={{ padding: '5px 8px', background: 'rgba(74,126,200,0.05)', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: s.color, ...MONO }}>{s.val}</div>
                <div style={{ fontSize: '0.58rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
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
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(74,126,200,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#050505', border: '1px solid rgba(74,126,200,0.1)', borderRadius: 5, padding: '4px 8px' }}>
            <Search size={11} style={{ color: '#787878', flexShrink: 0 }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search nodes…"
              style={{ background: 'none', border: 'none', outline: 'none', color: '#BDD4E8', fontSize: '0.72rem', ...MONO, flex: 1 }} />
          </div>
        </div>

        {/* Node list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center' }}><Loader2 size={16} className="spinner" style={{ color: '#787878' }} /></div>
          ) : filteredNodes.length === 0 ? (
            <div style={{ padding: '24px 10px', textAlign: 'center', color: '#787878', fontSize: '0.72rem', ...MONO }}>
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
                    background: selected?.id === n.id ? 'rgba(74,126,200,0.08)' : 'transparent',
                    border: `1px solid ${selected?.id === n.id ? 'rgba(74,126,200,0.2)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (selected?.id !== n.id) e.currentTarget.style.background = 'rgba(74,126,200,0.05)'; }}
                  onMouseLeave={e => { if (selected?.id !== n.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={12} style={{ color: n.is_compromised ? '#EF4444' : meta.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: n.is_compromised ? '#EF4444' : '#BDD4E8' }}>{n.label}</div>
                    <div style={{ fontSize: '0.6rem', color: '#787878', ...MONO }}>{n.type?.replace('_', ' ')}</div>
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
          borderBottom: '1px solid rgba(74,126,200,0.12)',
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          flexShrink: 0,
        }}>
          {/* Row 1: Risk score slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#787878', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
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
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, background: 'none', border: '1px solid rgba(74,126,200,0.14)', color: '#787878', padding: '2px 8px', cursor: 'pointer', borderRadius: 4 }}
              >
                Clear
              </button>
            )}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#555', marginLeft: 4 }}>
              {visibleCount} / {graph.nodes.length} shown
            </span>
          </div>

          {/* Row 2: Node type pills (only types present in graph) */}
          {pillTypes.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#555', letterSpacing: '0.06em', marginRight: 2 }}>TYPE</span>
              {pillTypes.map(type => {
                const active = typeFilter === type;
                const meta = TYPE_MAP[type];
                const color = meta ? meta.color : '#787878';
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(active ? null : type)}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      padding: '3px 9px',
                      border: '1px solid',
                      borderColor: active ? color : 'rgba(74,126,200,0.14)',
                      background: active ? `${color}18` : 'transparent',
                      color: active ? color : '#787878',
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
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, background: 'none', border: '1px solid rgba(74,126,200,0.14)', color: '#787878', padding: '3px 8px', cursor: 'pointer', borderRadius: 4 }}
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
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#787878' }}>
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
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(14,14,22,0.9)', border: '1px solid rgba(74,126,200,0.12)', borderRadius: 4, fontSize: '0.62rem', color: t.color, ...MONO }}>
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
          <div style={{ background: '#0E0E16', border: '1px solid rgba(74,126,200,0.14)', borderRadius: 10, padding: 24, width: 380, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 600 }}>Add Identity Node</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={15} /></button>
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
          <div style={{ background: '#0E0E16', border: '1px solid rgba(74,126,200,0.14)', borderRadius: 10, padding: 24, width: 360, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 600 }}>Link Identity Nodes</div>
              <button onClick={() => setShowEdge(false)} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer' }}><X size={15} /></button>
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
