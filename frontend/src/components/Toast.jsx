import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import useStore from '../store/useStore';

const CONFIG = {
  success: { icon: CheckCircle,   color: '#10B981', duration: 4000 },
  error:   { icon: XCircle,       color: '#EF4444', duration: null  },
  warning: { icon: AlertTriangle, color: '#F59E0B', duration: 6000 },
  info:    { icon: Info,          color: '#3B82F6', duration: 4000 },
};

function ToastItem({ toast, onRemove }) {
  const cfg = CONFIG[toast.type] || CONFIG.info;
  const Icon = cfg.icon;
  const duration = toast.duration !== undefined ? toast.duration : cfg.duration;

  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(t);
  }, [toast.id, duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      onClick={() => onRemove(toast.id)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface, #111827)',
        border: '1px solid var(--border-medium, rgba(148,163,184,0.22))',
        borderRadius: 10,
        cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        minWidth: 300,
        maxWidth: 380,
        width: 360,
      }}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      {/* Top color accent bar */}
      <div style={{
        height: 3,
        background: cfg.color,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
      }} />

      {/* Content row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '16px 14px 14px',
      }}>
        <Icon
          size={16}
          style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <div style={{
              fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary, #F1F5F9)',
              marginBottom: 2,
            }}>
              {toast.title}
            </div>
          )}
          <div style={{
            fontFamily: "var(--font-ui,'IBM Plex Sans',sans-serif)",
            fontSize: 12.5,
            color: 'var(--text-secondary, #94A3B8)',
            lineHeight: 1.4,
          }}>
            {toast.message}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onRemove(toast.id); }}
          aria-label="Dismiss notification"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #475569)',
            cursor: 'pointer',
            padding: 2,
            borderRadius: 4,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar — counts down, only for auto-dismiss toasts */}
      {duration && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: 'linear', delay: 0.1 }}
          style={{
            height: 3,
            background: cfg.color,
            transformOrigin: 'left',
            opacity: 0.7,
          }}
        />
      )}
    </motion.div>
  );
}

export default function Toasts() {
  const { toasts, removeToast } = useStore();

  return (
    <div
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 'var(--z-toast, 500)',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
