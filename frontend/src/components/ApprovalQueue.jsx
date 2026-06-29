import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, ChevronRight, Play, Ban, RefreshCw } from 'lucide-react';

// ── Severity dot color ────────────────────────────────────────────────────────
const SEV_COLOR = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#10B981',
  info:     '#6B7280',
};

// Tier badge colors
const TIER_COLORS = {
  observe:         'rgba(255,255,255,0.2)',
  recommend:       '#4A7EC8',
  'auto-safe':     '#22C55E',
  'auto-veto':     '#F59E0B',
  'human-required':'#EF4444',
};

// Countdown seconds per tier
const TIER_COUNTDOWN = {
  'auto-safe': 60,
  'auto-veto': 300,
};

// ── Individual swipeable card ─────────────────────────────────────────────────
function SwipeCard({ caseItem, onApprove, onDismiss, isTop, stackIndex }) {
  const x = useMotionValue(0);

  const approveOpacity = useTransform(x, [20, 80],  [0, 1]);
  const dismissOpacity = useTransform(x, [-80, -20], [1, 0]);
  const rotateZ        = useTransform(x, [-220, 220], [-7, 7]);
  const cardOpacity    = useTransform(x, [-180, -120, 0, 120, 180], [0.35, 1, 1, 1, 0.35]);

  const greenAlpha = useTransform(x, [0, 80, 150], [0, 0.07, 0.14]);
  const redAlpha   = useTransform(x, [-150, -80, 0], [0.14, 0.07, 0]);

  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.x > 100) {
      onApprove(caseItem.id);
    } else if (info.offset.x < -100) {
      onDismiss(caseItem.id);
    }
  }, [caseItem.id, onApprove, onDismiss]);

  const sevColor = SEV_COLOR[caseItem.severity] || SEV_COLOR.info;
  const scaleFactor = isTop ? 1 : (stackIndex === 1 ? 0.95 : 0.9);
  const yOffset     = isTop ? 0 : (stackIndex === 1 ? 8 : 16);

  return (
    <motion.div
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      style={{
        x: isTop ? x : 0,
        rotateZ: isTop ? rotateZ : 0,
        opacity: isTop ? cardOpacity : (stackIndex === 1 ? 0.75 : 0.5),
        position: 'absolute',
        width: '100%',
        scale: scaleFactor,
        y: yOffset,
        transformOrigin: 'bottom center',
        cursor: isTop ? 'grab' : 'default',
        zIndex: isTop ? 10 : (stackIndex === 1 ? 5 : 1),
      }}
      whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
      onDragEnd={isTop ? handleDragEnd : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface, #111827)',
        border: '1px solid var(--border-medium, rgba(148,163,184,0.22))',
        borderRadius: 14,
        boxShadow: isTop
          ? '0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)'
          : '0 4px 16px rgba(0,0,0,0.3)',
        userSelect: 'none',
      }}>
        {isTop && (
          <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 14, zIndex: 2, pointerEvents: 'none', background: 'rgba(16,185,129,1)', opacity: greenAlpha }} />
        )}
        {isTop && (
          <motion.div style={{ position: 'absolute', inset: 0, borderRadius: 14, zIndex: 2, pointerEvents: 'none', background: 'rgba(239,68,68,1)', opacity: redAlpha }} />
        )}
        {isTop && (
          <motion.div style={{ position: 'absolute', top: 20, right: 20, zIndex: 3, opacity: approveOpacity, border: '2px solid #10B981', borderRadius: 6, padding: '4px 10px', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)", fontSize: 11, fontWeight: 700, color: '#10B981', letterSpacing: '0.08em', transform: 'rotate(-12deg)' }}>
            APPROVE
          </motion.div>
        )}
        {isTop && (
          <motion.div style={{ position: 'absolute', top: 20, left: 20, zIndex: 3, opacity: dismissOpacity, border: '2px solid #EF4444', borderRadius: 6, padding: '4px 10px', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)", fontSize: 11, fontWeight: 700, color: '#EF4444', letterSpacing: '0.08em', transform: 'rotate(12deg)' }}>
            DISMISS
          </motion.div>
        )}

        <div style={{ padding: '18px 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor, flexShrink: 0, boxShadow: `0 0 6px ${sevColor}60` }} />
            <span style={{ fontFamily: "var(--font-mono,'IBM Plex Mono',monospace)", fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary, #F1F5F9)', letterSpacing: '0.04em' }}>
              {caseItem.id}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-muted, #475569)', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)", display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} /> {caseItem.age || '2h ago'}
            </span>
          </div>

          <div style={{ fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)", fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #F1F5F9)', marginBottom: 6, lineHeight: 1.35 }}>
            {caseItem.title}
          </div>

          {caseItem.assignee && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)", marginBottom: 14 }}>
              Assigned: {caseItem.assignee}
            </div>
          )}

          <div style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={13} style={{ color: '#60A5FA', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted, #475569)', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                AI recommends
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#60A5FA', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)" }}>
                {caseItem.aiRecommendation || 'CLOSE'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted, #475569)', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Confidence
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: caseItem.confidence >= 90 ? '#10B981' : '#F59E0B', fontFamily: "var(--font-mono,'IBM Plex Mono',monospace)" }}>
                {caseItem.confidence || 94}%
              </div>
            </div>
          </div>
        </div>

        {isTop && (
          <div style={{ padding: '8px 18px 10px', borderTop: '1px solid var(--border, rgba(148,163,184,0.1))', display: 'flex', justifyContent: 'center' }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted, #475569)', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)", letterSpacing: '0.02em' }}>
              Swipe right to approve · Swipe left to dismiss
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Defense Recommendation Row ────────────────────────────────────────────────
function RecRow({ item, onExecute, onVeto }) {
  const [countdown, setCountdown] = useState(null);
  const [executing, setExecuting] = useState(false);
  const timerRef = useRef(null);

  const tierColor = TIER_COLORS[item.tier] || 'rgba(255,255,255,0.2)';
  const autoSeconds = TIER_COUNTDOWN[item.tier];

  // Start countdown for auto-safe / auto-veto tiers
  useEffect(() => {
    if (autoSeconds) {
      setCountdown(autoSeconds);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [autoSeconds, item.id]);

  const handleExecute = async () => {
    clearInterval(timerRef.current);
    setExecuting(true);
    try {
      await onExecute(item.id);
    } finally {
      setExecuting(false);
    }
  };

  const handleVeto = async () => {
    clearInterval(timerRef.current);
    setCountdown(null);
    await onVeto(item.id);
  };

  const formatTime = (s) => {
    if (s === null) return null;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${tierColor === 'rgba(255,255,255,0.2)' ? 'rgba(255,255,255,0.07)' : `${tierColor}22`}`,
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#E8E8F0' }}>
              {item.countermeasure_name}
            </span>
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 3, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: tierColor === 'rgba(255,255,255,0.2)' ? tierColor : `${tierColor}20`,
              color: tierColor === 'rgba(255,255,255,0.2)' ? '#E8E8F0' : tierColor,
              border: `1px solid ${tierColor === 'rgba(255,255,255,0.2)' ? 'rgba(255,255,255,0.15)' : `${tierColor}40`}`,
            }}>
              {item.tier}
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
            {item.d3fend_id} · {item.technique_id} · blast: {item.blast_radius}
          </div>
          {item.case_number && (
            <div style={{ fontSize: 10, color: '#4B5563', marginTop: 2 }}>
              {item.case_number} — {item.case_title}
            </div>
          )}
        </div>

        {/* Timer + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {countdown !== null && countdown > 0 && (
            <span style={{
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              color: countdown < 10 ? '#EF4444' : '#F59E0B',
              fontWeight: 700,
            }}>
              {formatTime(countdown)}
            </span>
          )}
          {countdown === 0 && !executing && (
            <button
              onClick={handleExecute}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 5, color: '#22C55E', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
            >
              <Play size={10} /> Execute
            </button>
          )}
          {item.tier === 'human-required' && (
            <button
              onClick={handleExecute}
              disabled={executing}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(74,126,200,0.12)', border: '1px solid rgba(74,126,200,0.3)', borderRadius: 5, color: '#8BB8E8', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
            >
              <CheckCircle size={10} /> Approve
            </button>
          )}
          <button
            onClick={handleVeto}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, color: '#EF4444', fontSize: 10, cursor: 'pointer' }}
          >
            <Ban size={10} /> Veto
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ApprovalQueue component ──────────────────────────────────────────────
export default function ApprovalQueue({ cases = [], onApprove, onDismiss }) {
  const [queue, setQueue] = useState(cases);
  const [pendingRecs, setPendingRecs] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [activeTab, setActiveTab] = useState('cases');
  const intervalRef = useRef(null);

  // Load pending defense recommendations
  const loadRecs = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const res = await fetch('/api/response-tiers/pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRecs(data || []);
      }
    } catch {
      // silent fail
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    loadRecs();
    intervalRef.current = setInterval(loadRecs, 30000);
    return () => clearInterval(intervalRef.current);
  }, [loadRecs]);

  const handleApprove = useCallback((id) => {
    onApprove && onApprove(id);
    setQueue(q => q.filter(c => c.id !== id));
  }, [onApprove]);

  const handleDismiss = useCallback((id) => {
    onDismiss && onDismiss(id);
    setQueue(q => q.filter(c => c.id !== id));
  }, [onDismiss]);

  const handleExecuteRec = async (recId) => {
    try {
      await fetch(`/api/response-tiers/execute/${recId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      await loadRecs();
    } catch {}
  };

  const handleVetoRec = async (recId) => {
    try {
      await fetch(`/api/response-tiers/veto/${recId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      await loadRecs();
    } catch {}
  };

  // Group recs by tier
  const tierGroups = pendingRecs.reduce((acc, r) => {
    if (!acc[r.tier]) acc[r.tier] = [];
    acc[r.tier].push(r);
    return acc;
  }, {});
  const TIER_ORDER_LIST = ['human-required', 'auto-veto', 'auto-safe', 'recommend', 'observe'];

  const topCase = queue[0];

  return (
    <div style={{ fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)" }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3 }}>
        {[
          { id: 'cases', label: `Cases (${queue.length})` },
          { id: 'defense', label: `Defense (${pendingRecs.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: '6px 8px', borderRadius: 6, border: 'none',
              background: activeTab === t.id ? 'rgba(74,126,200,0.2)' : 'none',
              color: activeTab === t.id ? '#8BB8E8' : 'var(--text-muted, #475569)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'cases' && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #F1F5F9)' }}>
                {queue.length === 0 ? 'All cases reviewed' : `${queue.length} case${queue.length !== 1 ? 's' : ''} awaiting approval`}
              </span>
            </div>
            {queue.length > 0 && (
              <div style={{ display: 'flex', gap: 2 }}>
                {queue.slice(0, 5).map((_, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#F59E0B' : 'var(--border-medium, rgba(148,163,184,0.22))' }} />
                ))}
              </div>
            )}
          </div>

          {/* Card stack */}
          <div style={{ position: 'relative', height: 300, marginBottom: 16 }}>
            <AnimatePresence>
              {queue.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--surface, #111827)', border: '1px dashed var(--border-medium, rgba(148,163,184,0.22))', borderRadius: 14 }}>
                  <CheckCircle size={32} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary, #94A3B8)', fontWeight: 500 }}>All cases reviewed</span>
                </motion.div>
              ) : (
                [...queue].slice(0, 3).reverse().map((caseItem, reversedIdx) => {
                  const stackIndex = queue.slice(0, 3).length - 1 - reversedIdx;
                  return (
                    <SwipeCard key={caseItem.id} caseItem={caseItem} onApprove={handleApprove} onDismiss={handleDismiss} isTop={stackIndex === 0} stackIndex={stackIndex} />
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {topCase && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleDismiss(topCase.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)" }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}>
                <XCircle size={15} /> Keep Open
              </button>
              <button onClick={() => handleApprove(topCase.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10B981', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)" }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}>
                <CheckCircle size={15} /> Approve Closure
              </button>
            </div>
          )}

          {queue.length > 1 && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--surface, #111827)', border: '1px solid var(--border, rgba(148,163,184,0.1))', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #475569)', fontWeight: 500 }}>Next:</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-secondary, #94A3B8)', fontFamily: "var(--font-mono,'IBM Plex Mono',monospace)" }}>{queue[1].id}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #475569)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {queue[1].title}</span>
              <ChevronRight size={12} style={{ color: 'var(--text-muted, #475569)', flexShrink: 0 }} />
            </div>
          )}
        </>
      )}

      {activeTab === 'defense' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #F1F5F9)' }}>
              {pendingRecs.length === 0 ? 'No pending countermeasures' : `${pendingRecs.length} pending countermeasure${pendingRecs.length !== 1 ? 's' : ''}`}
            </span>
            <button onClick={loadRecs} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '3px 7px', color: '#6B7280', cursor: 'pointer' }}>
              <RefreshCw size={11} />
            </button>
          </div>

          {loadingRecs ? (
            <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: '#6B7280' }}>Loading…</div>
          ) : pendingRecs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 10 }}>
              <Shield size={24} style={{ color: '#374151', marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: '#6B7280' }}>No pending countermeasures</div>
            </div>
          ) : (
            TIER_ORDER_LIST.filter(tier => tierGroups[tier]?.length > 0).map(tier => {
              const tierColor = TIER_COLORS[tier] || 'rgba(255,255,255,0.2)';
              return (
                <div key={tier} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: tierColor === 'rgba(255,255,255,0.2)' ? '#9CA3AF' : tierColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: tierColor === 'rgba(255,255,255,0.2)' ? '#9CA3AF' : tierColor }} />
                    {tier} ({tierGroups[tier].length})
                  </div>
                  {tierGroups[tier].map(item => (
                    <RecRow key={item.id} item={item} onExecute={handleExecuteRec} onVeto={handleVetoRec} />
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
