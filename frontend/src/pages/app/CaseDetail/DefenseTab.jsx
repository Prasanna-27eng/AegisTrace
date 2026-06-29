import React, { useEffect, useState, useCallback } from 'react';
import { Shield, Zap, CheckCircle, XCircle, Play, RefreshCw } from 'lucide-react';
import api from '../../../api/client';

const TIER_COLORS = {
  observe:         'rgba(255,255,255,0.15)',
  recommend:       '#4A7EC8',
  'auto-safe':     '#22C55E',
  'auto-veto':     '#F59E0B',
  'human-required':'#EF4444',
};

const BLAST_COLORS = {
  low:    '#22C55E',
  medium: '#F59E0B',
  high:   '#EF4444',
};

function TierBadge({ tier }) {
  const bg = TIER_COLORS[tier] || 'rgba(255,255,255,0.15)';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: bg === 'rgba(255,255,255,0.15)' ? bg : `${bg}22`,
      color: bg === 'rgba(255,255,255,0.15)' ? '#E8E8F0' : bg,
      border: `1px solid ${bg === 'rgba(255,255,255,0.15)' ? 'rgba(255,255,255,0.2)' : `${bg}44`}`,
    }}>
      {tier}
    </span>
  );
}

function BlastChip({ level }) {
  const color = BLAST_COLORS[level] || '#787878';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 3,
      fontSize: 10,
      fontWeight: 600,
      background: `${color}18`,
      color,
      border: `1px solid ${color}33`,
    }}>
      blast: {level}
    </span>
  );
}

function D3FendBadge({ id }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 7px',
      background: 'rgba(74,126,200,0.15)',
      color: '#8BB8E8',
      borderRadius: 4,
      border: '1px solid rgba(74,126,200,0.3)',
    }}>
      {id}
    </span>
  );
}

function RecCard({ rec, onStatusChange }) {
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status) => {
    setLoading(true);
    try {
      await onStatusChange(rec.id, status);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '14px 16px',
      marginBottom: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <Shield size={14} style={{ color: '#4A7EC8', marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E8F0' }}>
              {rec.countermeasure_name}
            </span>
            <D3FendBadge id={rec.d3fend_id} />
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
            {rec.technique_id} · {rec.technique_name}
          </div>
          <div style={{ fontSize: 12, color: '#A0AEC0', lineHeight: 1.5, marginBottom: 8 }}>
            {rec.description}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <TierBadge tier={rec.tier} />
            <BlastChip level={rec.blast_radius} />
          </div>
        </div>
        {/* Status badge */}
        <div style={{
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          background: rec.status === 'executed' ? 'rgba(34,197,94,0.15)' :
                      rec.status === 'approved' ? 'rgba(74,126,200,0.15)' :
                      rec.status === 'vetoed' || rec.status === 'rejected' ? 'rgba(239,68,68,0.15)' :
                      'rgba(255,255,255,0.08)',
          color: rec.status === 'executed' ? '#22C55E' :
                 rec.status === 'approved' ? '#4A7EC8' :
                 rec.status === 'vetoed' || rec.status === 'rejected' ? '#EF4444' :
                 '#6B7280',
          flexShrink: 0,
        }}>
          {rec.status}
        </div>
      </div>

      {/* Action buttons */}
      {rec.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={() => updateStatus('approved')}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 6, color: '#22C55E', fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <CheckCircle size={12} /> Approve
          </button>
          <button
            onClick={() => updateStatus('rejected')}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 6, color: '#EF4444', fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <XCircle size={12} /> Reject
          </button>
        </div>
      )}
      {rec.status === 'approved' && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => updateStatus('executed')}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 14px',
              background: 'rgba(74,126,200,0.15)',
              border: '1px solid rgba(74,126,200,0.35)',
              borderRadius: 6, color: '#8BB8E8', fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Play size={12} /> Execute
          </button>
        </div>
      )}
    </div>
  );
}

export default function DefenseTab({ caseData }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!caseData?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/defense/recommendations/${caseData.id}`);
      setRecs(res.data || []);
    } catch (e) {
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [caseData?.id]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!caseData?.id) return;
    setGenerating(true);
    setError(null);
    try {
      let techniques = [];
      try {
        techniques = JSON.parse(caseData.mitre_techniques || '[]');
      } catch {
        techniques = [];
      }
      const res = await api.post('/api/defense/recommend', {
        case_id: caseData.id,
        techniques,
      });
      await load();
    } catch (e) {
      setError('Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (recId, status) => {
    await api.patch(`/api/defense/recommendations/${recId}/status`, { status });
    await load();
  };

  const grouped = recs.reduce((acc, r) => {
    const key = `${r.technique_id} · ${r.technique_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div style={{ color: '#E8E8F0', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#E8E8F0', margin: 0, marginBottom: 4 }}>
            D3FEND Countermeasures
          </h3>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            MITRE D3FEND countermeasure recommendations mapped from ATT&CK techniques
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#6B7280', cursor: 'pointer' }}
          >
            <RefreshCw size={13} />
          </button>
          {recs.length === 0 && !loading && (
            <button
              onClick={generate}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px',
                background: 'rgba(74,126,200,0.15)',
                border: '1px solid rgba(74,126,200,0.4)',
                borderRadius: 7, color: '#8BB8E8', fontSize: 12, fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              <Zap size={13} />
              {generating ? 'Generating…' : 'Generate D3FEND Recommendations'}
            </button>
          )}
          {recs.length > 0 && (
            <button
              onClick={generate}
              disabled={generating}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 7, color: '#6B7280', fontSize: 12,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={12} />
              {generating ? 'Refreshing…' : 'Re-generate'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#EF4444' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280', fontSize: 13 }}>
          Loading recommendations…
        </div>
      ) : recs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 12,
        }}>
          <Shield size={32} style={{ color: '#374151', marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>No D3FEND recommendations yet</div>
          <div style={{ fontSize: 12, color: '#374151' }}>
            Click "Generate D3FEND Recommendations" to map ATT&CK techniques to countermeasures
          </div>
        </div>
      ) : (
        <div>
          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {['pending','approved','executed','rejected'].map(s => {
              const count = recs.filter(r => r.status === s).length;
              const color = s === 'executed' ? '#22C55E' : s === 'approved' ? '#4A7EC8' : s === 'rejected' ? '#EF4444' : '#6B7280';
              return (
                <div key={s} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 14px', minWidth: 80 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s}</div>
                </div>
              );
            })}
          </div>

          {/* Grouped by technique */}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                {group}
              </div>
              {items.map(rec => (
                <RecCard key={rec.id} rec={rec} onStatusChange={handleStatusChange} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
