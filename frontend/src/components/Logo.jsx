import React from 'react';

export default function Logo({ size = 28, showText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Nodes */}
        <circle cx="4"  cy="16" r="3"   fill="#C0392B" />
        <circle cx="12" cy="8"  r="2.5" fill="#C0392B" opacity="0.85" />
        <circle cx="22" cy="10" r="2.5" fill="#C0392B" opacity="0.85" />
        <circle cx="28" cy="20" r="3"   fill="#C0392B" />
        <circle cx="16" cy="26" r="2"   fill="#C0392B" opacity="0.65" />
        {/* Connections */}
        <line x1="4"  y1="16" x2="12" y2="8"  stroke="#C0392B" strokeWidth="1.5" strokeDasharray="2.5 1.5" opacity="0.6" />
        <line x1="12" y1="8"  x2="22" y2="10" stroke="#C0392B" strokeWidth="1.5" opacity="0.7" />
        <line x1="22" y1="10" x2="28" y2="20" stroke="#C0392B" strokeWidth="2"   />
        <line x1="28" y1="20" x2="16" y2="26" stroke="#C0392B" strokeWidth="1.5" strokeDasharray="2.5 1.5" opacity="0.6" />
        {/* Crimson trace line (the active investigation path) */}
        <line x1="4"  y1="16" x2="28" y2="20" stroke="#C0392B" strokeWidth="0.75" strokeDasharray="3 2" opacity="0.3" />
      </svg>
      {showText && (
        <span style={{ fontWeight: 600, fontSize: size * 0.54, letterSpacing: '-0.02em', color: '#F0F0F8' }}>
          AegisTrace
        </span>
      )}
    </div>
  );
}
