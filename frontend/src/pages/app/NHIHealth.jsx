import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Plus } from '../../components/icons';
import api from '../../api/client';
import useStore from '../../store/useStore';

const C = {
  bg: '#0A0A0A', card: '#0E0E16', border: '#181818',
  blue: '#4A7EC8', purple: '#8BB8E8', green: '#34D399',
  amber: '#FBBF24', red: '#F87171', muted: '#888888', text: '#E5E5E5',
};

const TYPE_COLORS = {
  service_account: C.blue, api_key: C.purple, token: C.amber,
  device: '#60A5FA', agent: '#34D399', prompt: '#F472B6', user: C.muted,
};

const PRIV_COLORS = { admin: C.red, high: C.amber, medium: C.blue, low: C.green };

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, count, color, icon }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${color}30`,
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 160,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 10,
        background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color }}>{count}</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Identity row ──────────────────────────────────────────────────────────────
function IdentityRow({ node, onViewGraph, onCreateCase }) {
  const daysSince = node.last_active
    ? Math.floor((Date.now() - new Date(node.last_active)) / 86400000)
    : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      borderBottom: `1px solid ${C.border}`, fontSize: 13,
    }}>
      {/* Type badge */}
      <span style={{
        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: (TYPE_COLORS[node.node_type] || C.muted) + '22',
        color: TYPE_COLORS[node.node_type] || C.muted, whiteSpace: 'nowrap',
      }}>
        {node.node_type?.replace('_', ' ') || 'unknown'}
      </span>

      {/* Label */}
      <div style={{ flex: 1, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {node.label}
      </div>

      {/* Last active */}
      <div style={{ color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
        {daysSince != null ? (
          <span style={{ color: daysSince > 30 ? C.red : C.muted }}>
            {daysSince}d ago
          </span>
        ) : '–'}
      </div>

      {/* Privilege */}
      <span style={{
        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: (PRIV_COLORS[node.privilege_level] || C.muted) + '22',
        color: PRIV_COLORS[node.privilege_level] || C.muted, whiteSpace: 'nowrap',
      }}>
        {node.privilege_level || 'low'}
      </span>

      {/* Sprawl */}
      <div style={{ color: node.credential_sprawl_score > 50 ? C.amber : C.muted, fontSize: 12, minWidth: 50, textAlign: 'right' }}>
        sprawl: {Math.round(node.credential_sprawl_score || 0)}
      </div>

      {/* Trust score */}
      <div style={{
        minWidth: 54, textAlign: 'right', fontWeight: 700,
        color: node.trust_score < 30 ? C.red : node.trust_score < 60 ? C.amber : C.green,
        fontSize: 13,
      }}>
        {Math.round(node.trust_score || 0)}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onViewGraph(node.id)}
          title="View in Identity Graph"
          style={{
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.blue}40`,
            background: 'transparent', color: C.blue, fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <ExternalLink size={11} /> Graph
        </button>
        <button
          onClick={() => onCreateCase(node)}
          title="Create investigation case"
          style={{
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.purple}40`,
            background: 'transparent', color: C.purple, fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Plus size={11} /> Case
        </button>
      </div>
    </div>
  );
}

// ── Expandable category ───────────────────────────────────────────────────────
function CategorySection({ title, color, icon, count, items, onViewGraph, onCreateCase }) {
  const [open, setOpen] = useState(count > 0);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ flex: 1, color: C.text, fontWeight: 600, fontSize: 14 }}>{title}</span>
        <span style={{
          padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 13,
          background: count > 0 ? color + '22' : C.border,
          color: count > 0 ? color : C.muted,
        }}>
          {count}
        </span>
        {open ? <ChevronUp size={15} color={C.muted} /> : <ChevronDown size={15} color={C.muted} />}
      </div>

      {open && count > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {/* Column headers */}
          <div style={{
            display: 'flex', gap: 12, padding: '8px 16px',
            fontSize: 11, color: C.muted, fontWeight: 600,
            background: C.bg + '80',
          }}>
            <span style={{ width: 90 }}>TYPE</span>
            <span style={{ flex: 1 }}>IDENTITY</span>
            <span style={{ width: 60 }}>LAST ACTIVE</span>
            <span style={{ width: 70 }}>PRIVILEGE</span>
            <span style={{ width: 70, textAlign: 'right' }}>SPRAWL</span>
            <span style={{ width: 54, textAlign: 'right' }}>TRUST</span>
            <span style={{ width: 120 }}></span>
          </div>
          {items.map(node => (
            <IdentityRow
              key={node.id}
              node={node}
              onViewGraph={onViewGraph}
              onCreateCase={onCreateCase}
            />
          ))}
        </div>
      )}

      {open && count === 0 && (
        <div style={{ padding: '16px', color: C.green, fontSize: 13, textAlign: 'center', borderTop: `1px solid ${C.border}` }}>
          ✓ No issues in this category
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NHIHealth() {
  const { addToast } = useStore();
  const navigate = useNavigate();
  const [health,   setHealth]   = useState(null);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [decaying, setDecaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, sRes] = await Promise.all([
        api.get('/api/nhi/health'),
        api.get('/api/nhi/summary'),
      ]);
      setHealth(hRes.data);
      setSummary(sRes.data);
    } catch (e) {
      addToast('Failed to load NHI health data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const runTrustDecay = async () => {
    setDecaying(true);
    try {
      const res = await api.post('/api/nhi/trust-decay/run');
      addToast(`Trust decay: ${res.data.scores_updated} scores updated, ${res.data.itdr_alerts_created} alerts created`, 'success');
      await load();
    } catch (e) {
      addToast('Trust decay failed', 'error');
    } finally {
      setDecaying(false);
    }
  };

  const viewInGraph = (nodeId) => navigate(`/app/identity-graph?node=${nodeId}`);

  const createCase = (node) => {
    const title = encodeURIComponent(`NHI Investigation: ${node.label}`);
    const desc  = encodeURIComponent(
      `Identity: ${node.label}\nType: ${node.node_type}\nPrivilege: ${node.privilege_level}\nTrust Score: ${Math.round(node.trust_score)}`
    );
    navigate(`/app/cases?new=1&title=${title}&description=${desc}&severity=medium&incident_type=identity_risk`);
  };

  if (loading) return (
    <div style={{ padding: 40, color: C.muted, textAlign: 'center' }}>Loading NHI health data…</div>
  );

  const ratio = summary?.ratio || '–';
  const industryAvg = '82:1';

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <ShieldAlert size={24} color={C.purple} />
            <h1 style={{ margin: 0, color: C.text, fontSize: 22, fontWeight: 700 }}>NHI Health Monitor</h1>
          </div>
          <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
            Non-human identity lifecycle: stale credentials, expiring tokens, orphaned accounts.
          </p>
        </div>
        <button
          onClick={runTrustDecay}
          disabled={decaying}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 8,
            background: C.purple + '22', color: C.purple,
            border: `1px solid ${C.purple}40`,
            fontSize: 13, fontWeight: 600, cursor: decaying ? 'wait' : 'pointer',
            opacity: decaying ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: decaying ? 'spin 1s linear infinite' : 'none' }} />
          {decaying ? 'Running decay…' : 'Run trust decay'}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* NHI:Human ratio banner */}
      {summary && (
        <div style={{
          padding: '14px 20px', marginBottom: 28,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div>
            <span style={{ color: C.muted, fontSize: 13 }}>Your NHI:Human ratio is </span>
            <span style={{ color: C.blue, fontSize: 15, fontWeight: 700 }}>{ratio}</span>
            <span style={{ color: C.muted, fontSize: 13 }}>
              {' '}— industry average is <strong style={{ color: C.amber }}>{industryAvg}</strong>
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 18 }}>{summary.total_nhi}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>Non-human</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 18 }}>{summary.total_human}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>Human</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: C.green, fontWeight: 700, fontSize: 18 }}>{summary.avg_trust_score}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>Avg trust score</div>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {health && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
          <StatCard
            label="Stale Identities"
            count={health.stale?.count || 0}
            color={health.stale?.count > 0 ? C.red : C.green}
            icon="🕰️"
          />
          <StatCard
            label="Expiring Soon"
            count={health.expiring_soon?.count || 0}
            color={health.expiring_soon?.count > 0 ? C.amber : C.green}
            icon="⏰"
          />
          <StatCard
            label="Never Expires + High Priv"
            count={health.never_expires_high_privilege?.count || 0}
            color={health.never_expires_high_privilege?.count > 0 ? C.amber : C.green}
            icon="♾️"
          />
          <StatCard
            label="Orphaned Accounts"
            count={health.orphaned?.count || 0}
            color={health.orphaned?.count > 0 ? C.red : C.green}
            icon="👻"
          />
        </div>
      )}

      {/* Category sections */}
      {health && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CategorySection
            title="Stale Identities"
            color={C.red}
            icon="🕰️"
            count={health.stale?.count || 0}
            items={health.stale?.items || []}
            onViewGraph={viewInGraph}
            onCreateCase={createCase}
          />
          <CategorySection
            title="Expiring Soon (< 14 days)"
            color={C.amber}
            icon="⏰"
            count={health.expiring_soon?.count || 0}
            items={health.expiring_soon?.items || []}
            onViewGraph={viewInGraph}
            onCreateCase={createCase}
          />
          <CategorySection
            title="Never Expires + High Privilege"
            color={C.amber}
            icon="♾️"
            count={health.never_expires_high_privilege?.count || 0}
            items={health.never_expires_high_privilege?.items || []}
            onViewGraph={viewInGraph}
            onCreateCase={createCase}
          />
          <CategorySection
            title="Orphaned Accounts"
            color={C.red}
            icon="👻"
            count={health.orphaned?.count || 0}
            items={health.orphaned?.items || []}
            onViewGraph={viewInGraph}
            onCreateCase={createCase}
          />
        </div>
      )}

      {/* By-type breakdown */}
      {summary?.by_type && Object.keys(summary.by_type).length > 0 && (
        <div style={{
          marginTop: 32, background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 20,
        }}>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 14 }}>Identity Breakdown by Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(summary.by_type).map(([type, count]) => (
              <div key={type} style={{
                padding: '8px 16px', borderRadius: 20,
                background: (TYPE_COLORS[type] || C.muted) + '20',
                border: `1px solid ${(TYPE_COLORS[type] || C.muted)}40`,
              }}>
                <span style={{ color: TYPE_COLORS[type] || C.muted, fontWeight: 700, fontSize: 15 }}>{count}</span>
                <span style={{ color: C.muted, fontSize: 12, marginLeft: 6 }}>{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
