import React from 'react';

const PALETTES = {
  critical: ['#EF4444', '#F97316'],
  high:     ['#F97316', '#FBBF24'],
  normal:   ['#4A7EC8', 'rgba(26,22,18,0.7)'],
  info:     ['#22C55E', '#4A7EC8'],
  gold:     ['#F59E0B', '#FBBF24'],
};

export default function BorderGlow({
  severity = 'normal',
  children,
  style = {},
  innerStyle = {},
  radius = 14,
  speed = 4,
  glow = true,
}) {
  const [c1, c2] = PALETTES[severity] || PALETTES.normal;
  const id = `bg-spin-${severity}-${speed}`;

  return (
    <div style={{ position: 'relative', borderRadius: radius + 1.5, padding: 1.5, ...style }}>
      <style>{`
        @keyframes ${id} { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .border-glow-spin { animation: none !important; }
        }
      `}</style>

      {/* Spinning conic-gradient ring */}
      <div
        aria-hidden
        className="border-glow-spin"
        style={{
          position: 'absolute', inset: 0,
          borderRadius: radius + 1.5,
          background: `conic-gradient(from 0deg, ${c1}, ${c2} 20%, transparent 30%, transparent 70%, ${c2} 80%, ${c1})`,
          animation: `${id} ${speed}s linear infinite`,
          ...(glow ? { filter: `blur(0px)` } : {}),
        }}
      />

      {/* Static border fallback / depth */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        borderRadius: radius + 1.5,
        border: `1px solid rgba(74,126,200,0.14)`,
        opacity: .7,
      }} />

      {/* Inner surface */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#100E12',
        borderRadius: radius,
        overflow: 'hidden',
        ...innerStyle,
      }}>
        {children}
      </div>
    </div>
  );
}
