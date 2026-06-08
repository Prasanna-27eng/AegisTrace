import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import useStore from '../store/useStore';

const ICONS = {
  success: <CheckCircle size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />,
  error:   <XCircle    size={15} style={{ color: 'var(--error)',   flexShrink: 0 }} />,
  warning: <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />,
  info:    <Info       size={15} style={{ color: 'var(--info)',    flexShrink: 0 }} />,
};

const ACCENT = {
  success: 'var(--success)',
  error:   'var(--error)',
  warning: 'var(--warning)',
  info:    'var(--info)',
};

export default function Toasts() {
  const { toasts, removeToast } = useStore();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, pointerEvents: 'none' }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-slide"
          role={t.type === 'error' ? 'alert' : 'status'}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(14,14,14,0.97)',
            border: `1px solid ${ACCENT[t.type] || ACCENT.info}33`,
            borderLeft: `3px solid ${ACCENT[t.type] || ACCENT.info}`,
            borderRadius: 8,
            padding: '10px 10px 10px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'all',
          }}
        >
          {ICONS[t.type] || ICONS.info}
          <span style={{ flex: 1, fontSize: '0.82rem', color: '#EBEBEB', lineHeight: 1.4 }}>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: '#686868', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#EBEBEB'}
            onMouseLeave={e => e.currentTarget.style.color = '#686868'}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
