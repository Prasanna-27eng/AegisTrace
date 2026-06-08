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

// Error and warning stay until explicitly dismissed — show a subtle "persistent" dot
const PERSISTENT = new Set(['error', 'warning']);

export default function Toasts() {
  const { toasts, removeToast } = useStore();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380, pointerEvents: 'none' }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-slide"
          role={t.type === 'error' ? 'alert' : 'status'}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'rgba(10,10,10,0.98)',
            border: `1px solid ${ACCENT[t.type] || ACCENT.info}30`,
            borderLeft: `3px solid ${ACCENT[t.type] || ACCENT.info}`,
            borderRadius: 8,
            padding: '11px 10px 11px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'all',
          }}
        >
          <span style={{ marginTop: 1 }}>{ICONS[t.type] || ICONS.info}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '0.82rem', color: '#EBEBEB', lineHeight: 1.45, wordBreak: 'break-word' }}>{t.message}</span>
            {PERSISTENT.has(t.type) && (
              <span style={{ fontSize: '0.6rem', color: '#555', fontFamily: 'JetBrains Mono,monospace', marginTop: 3, display: 'block' }}>
                Click × to dismiss
              </span>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.15s', marginTop: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = '#EBEBEB'}
            onMouseLeave={e => e.currentTarget.style.color = '#555'}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
