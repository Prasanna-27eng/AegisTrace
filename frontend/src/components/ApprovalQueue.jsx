import React, { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, ChevronRight } from 'lucide-react';

// ── Severity dot color ────────────────────────────────────────────────────────
const SEV_COLOR = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#10B981',
  info:     '#6B7280',
};

// ── Individual swipeable card ─────────────────────────────────────────────────
function SwipeCard({ caseItem, onApprove, onDismiss, isTop, stackIndex }) {
  const x = useMotionValue(0);

  // Visual feedback transforms driven by x drag position
  const approveOpacity = useTransform(x, [20, 80],  [0, 1]);
  const dismissOpacity = useTransform(x, [-80, -20], [1, 0]);
  const rotateZ        = useTransform(x, [-220, 220], [-7, 7]);
  const cardOpacity    = useTransform(x, [-180, -120, 0, 120, 180], [0.35, 1, 1, 1, 0.35]);

  // Green tint overlay opacity
  const greenAlpha = useTransform(x, [0, 80, 150], [0, 0.07, 0.14]);
  const redAlpha   = useTransform(x, [-150, -80, 0], [0.14, 0.07, 0]);

  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.x > 100) {
      onApprove(caseItem.id);
    } else if (info.offset.x < -100) {
      onDismiss(caseItem.id);
    }
    // Within threshold → Framer springs back automatically via dragConstraints
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
        {/* Approve tint overlay (green) */}
        {isTop && (
          <motion.div
            style={{
              position: 'absolute', inset: 0, borderRadius: 14, zIndex: 2,
              pointerEvents: 'none',
              background: 'rgba(16,185,129,1)',
              opacity: greenAlpha,
            }}
          />
        )}

        {/* Dismiss tint overlay (red) */}
        {isTop && (
          <motion.div
            style={{
              position: 'absolute', inset: 0, borderRadius: 14, zIndex: 2,
              pointerEvents: 'none',
              background: 'rgba(239,68,68,1)',
              opacity: redAlpha,
            }}
          />
        )}

        {/* APPROVE label */}
        {isTop && (
          <motion.div
            style={{
              position: 'absolute', top: 20, right: 20, zIndex: 3,
              opacity: approveOpacity,
              border: '2px solid #10B981',
              borderRadius: 6, padding: '4px 10px',
              fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              fontSize: 11, fontWeight: 700,
              color: '#10B981', letterSpacing: '0.08em',
              transform: 'rotate(-12deg)',
            }}
          >
            APPROVE
          </motion.div>
        )}

        {/* DISMISS label */}
        {isTop && (
          <motion.div
            style={{
              position: 'absolute', top: 20, left: 20, zIndex: 3,
              opacity: dismissOpacity,
              border: '2px solid #EF4444',
              borderRadius: 6, padding: '4px 10px',
              fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              fontSize: 11, fontWeight: 700,
              color: '#EF4444', letterSpacing: '0.08em',
              transform: 'rotate(12deg)',
            }}
          >
            DISMISS
          </motion.div>
        )}

        {/* Card content */}
        <div style={{ padding: '18px 18px 16px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: sevColor, flexShrink: 0,
              boxShadow: `0 0 6px ${sevColor}60`,
            }} />
            <span style={{
              fontFamily: "var(--font-mono,'IBM Plex Mono',monospace)",
              fontSize: 11.5, fontWeight: 600,
              color: 'var(--text-primary, #F1F5F9)',
              letterSpacing: '0.04em',
            }}>
              {caseItem.id}
            </span>
            <span style={{
              marginLeft: 'auto',
              fontSize: 10.5,
              color: 'var(--text-muted, #475569)',
              fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Clock size={10} /> {caseItem.age || '2h ago'}
            </span>
          </div>

          {/* Title */}
          <div style={{
            fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
            fontSize: 14, fontWeight: 600,
            color: 'var(--text-primary, #F1F5F9)',
            marginBottom: 6, lineHeight: 1.35,
          }}>
            {caseItem.title}
          </div>

          {/* Assignee */}
          {caseItem.assignee && (
            <div style={{
              fontSize: 12, color: 'var(--text-secondary, #94A3B8)',
              fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              marginBottom: 14,
            }}>
              Assigned: {caseItem.assignee}
            </div>
          )}

          {/* AI recommendation */}
          <div style={{
            background: 'rgba(37,99,235,0.07)',
            border: '1px solid rgba(37,99,235,0.18)',
            borderRadius: 8, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Shield size={13} style={{ color: '#60A5FA', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 600,
                color: 'var(--text-muted, #475569)',
                fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 2,
              }}>
                AI recommends
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: '#60A5FA',
                fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              }}>
                {caseItem.aiRecommendation || 'CLOSE'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 10.5, fontWeight: 600,
                color: 'var(--text-muted, #475569)',
                fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 2,
              }}>
                Confidence
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: caseItem.confidence >= 90 ? '#10B981' : '#F59E0B',
                fontFamily: "var(--font-mono,'IBM Plex Mono',monospace)",
              }}>
                {caseItem.confidence || 94}%
              </div>
            </div>
          </div>
        </div>

        {/* Drag hint — only on top card */}
        {isTop && (
          <div style={{
            padding: '8px 18px 10px',
            borderTop: '1px solid var(--border, rgba(148,163,184,0.1))',
            display: 'flex', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 10.5, color: 'var(--text-muted, #475569)',
              fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              letterSpacing: '0.02em',
            }}>
              Swipe right to approve · Swipe left to dismiss
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main ApprovalQueue component ──────────────────────────────────────────────
export default function ApprovalQueue({ cases = [], onApprove, onDismiss }) {
  const [queue, setQueue] = useState(cases);

  const handleApprove = useCallback((id) => {
    onApprove && onApprove(id);
    setQueue(q => q.filter(c => c.id !== id));
  }, [onApprove]);

  const handleDismiss = useCallback((id) => {
    onDismiss && onDismiss(id);
    setQueue(q => q.filter(c => c.id !== id));
  }, [onDismiss]);

  const topCase = queue[0];

  return (
    <div style={{ fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)" }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} style={{ color: '#F59E0B' }} />
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--text-primary, #F1F5F9)',
          }}>
            {queue.length === 0
              ? 'All cases reviewed'
              : `${queue.length} case${queue.length !== 1 ? 's' : ''} awaiting approval`}
          </span>
        </div>
        {queue.length > 0 && (
          <div style={{
            display: 'flex', gap: 2,
          }}>
            {queue.slice(0, 5).map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === 0 ? '#F59E0B' : 'var(--border-medium, rgba(148,163,184,0.22))',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Card stack */}
      <div style={{ position: 'relative', height: 300, marginBottom: 16 }}>
        <AnimatePresence>
          {queue.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
                background: 'var(--surface, #111827)',
                border: '1px dashed var(--border-medium, rgba(148,163,184,0.22))',
                borderRadius: 14,
              }}
            >
              <CheckCircle size={32} style={{ color: '#10B981' }} />
              <span style={{
                fontSize: 14, color: 'var(--text-secondary, #94A3B8)',
                fontWeight: 500,
              }}>
                All cases reviewed
              </span>
            </motion.div>
          ) : (
            // Render up to 3 cards in the stack (back-to-front)
            [...queue].slice(0, 3).reverse().map((caseItem, reversedIdx) => {
              const stackIndex = queue.slice(0, 3).length - 1 - reversedIdx;
              return (
                <SwipeCard
                  key={caseItem.id}
                  caseItem={caseItem}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                  isTop={stackIndex === 0}
                  stackIndex={stackIndex}
                />
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Button row — for non-touch / accessibility */}
      {topCase && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleDismiss(topCase.id)}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 16px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              color: '#EF4444',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
          >
            <XCircle size={15} />
            Keep Open
          </button>
          <button
            onClick={() => handleApprove(topCase.id)}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 16px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8,
              color: '#10B981',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
          >
            <CheckCircle size={15} />
            Approve Closure
          </button>
        </div>
      )}

      {/* Next case preview */}
      {queue.length > 1 && (
        <div style={{
          marginTop: 12, padding: '8px 12px',
          background: 'var(--surface, #111827)',
          border: '1px solid var(--border, rgba(148,163,184,0.1))',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted, #475569)', fontWeight: 500 }}>
            Next:
          </span>
          <span style={{
            fontSize: 11.5, color: 'var(--text-secondary, #94A3B8)',
            fontFamily: "var(--font-mono,'IBM Plex Mono',monospace)",
          }}>
            {queue[1].id}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted, #475569)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            — {queue[1].title}
          </span>
          <ChevronRight size={12} style={{ color: 'var(--text-muted, #475569)', flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}
