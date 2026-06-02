import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import useStore from '../store/useStore';

const icons = {
  success: <CheckCircle size={16} className="text-success" />,
  error:   <XCircle size={16} className="text-error" />,
  warning: <AlertTriangle size={16} className="text-warning" />,
  info:    <Info size={16} className="text-accent2" />,
};

const borders = {
  success: 'border-l-2 border-success',
  error:   'border-l-2 border-error',
  warning: 'border-l-2 border-warning',
  info:    'border-l-2 border-accent2',
};

export default function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" style={{ maxWidth: 340 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast-slide at-card flex items-center gap-3 px-4 py-3 ${borders[t.type] || borders.info}`}
        >
          {icons[t.type] || icons.info}
          <span style={{ fontSize: '0.82rem', color: '#F0F0F8', flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
