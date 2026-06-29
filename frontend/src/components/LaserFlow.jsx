import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function LaserFlow({ style = {} }) {
  const ref      = useRef(null);
  const reduced  = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;
    const el = ref.current;
    const handle = e => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--lx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty('--ly', `${((e.clientY - rect.top) / rect.height) * 100}%`);
    };
    window.addEventListener('mousemove', handle, { passive: true });
    return () => window.removeEventListener('mousemove', handle);
  }, [reduced]);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', '--lx': '50%', '--ly': '35%', ...style }}
    >
      <style>{`
        @keyframes lfGridDrift  { to { background-position: 44px 44px; } }
        @keyframes lfBeamPulse  { 0%,100% { opacity:.55; transform:scaleX(1);     }  50% { opacity:.95; transform:scaleX(1.03); } }
        @keyframes lfBloom      { 0%,100% { opacity:.35; transform:scale(1);       }  50% { opacity:.65; transform:scale(1.1);   } }
        @keyframes lfStreak     { 0%   { transform:translateY(-120%); opacity:0;  }
                                  8%   { opacity:.7; }
                                  92%  { opacity:.35; }
                                  100% { transform:translateY(220%); opacity:0;   } }
        @media (prefers-reduced-motion: reduce) {
          .lf-grid  { animation:none !important; }
          .lf-beam  { animation:none !important; opacity:.2 !important; }
          .lf-bloom { animation:none !important; opacity:.2 !important; }
          .lf-streak { display:none; }
        }
      `}</style>

      {/* Radial background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 80% at 50% -10%, #0A1024 0%, #050505 55%)',
      }} />

      {/* Dot grid */}
      <div className="lf-grid" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(26,22,18,0.042) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        animation: 'lfGridDrift 6s linear infinite',
      }} />

      {/* Central laser beam */}
      <div className="lf-beam" style={{
        position: 'absolute', left: '50%', top: 0,
        width: 1, height: '100%',
        background: 'linear-gradient(to bottom, transparent 0%, rgba(26,22,18,0.300) 28%, rgba(139,184,232,.9) 50%, rgba(26,22,18,0.300) 72%, transparent 100%)',
        transform: 'translateX(-50%)',
        animation: 'lfBeamPulse 3.6s ease-in-out infinite',
        boxShadow: '0 0 22px 5px rgba(26,22,18,0.168)',
      }} />

      {/* Bloom at beam center */}
      <div className="lf-bloom" style={{
        position: 'absolute', left: '50%', top: '44%',
        width: 340, height: 180,
        background: 'radial-gradient(ellipse, rgba(26,22,18,0.108) 0%, transparent 70%)',
        transform: 'translate(-50%,-50%)',
        animation: 'lfBloom 4.5s ease-in-out infinite',
      }} />

      {/* Streaks */}
      {[14, 29, 52, 68, 83].map((left, i) => (
        <div key={i} className="lf-streak" style={{
          position: 'absolute', left: `${left}%`, top: 0,
          width: 1, height: '38%',
          background: `linear-gradient(to bottom, transparent, rgba(74,126,200,${.12 + (i % 3) * .07}), transparent)`,
          animation: `lfStreak ${3.8 + i * .65}s linear infinite`,
          animationDelay: `${i * 1.1}s`,
        }} />
      ))}

      {/* Horizontal impact line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: '56%', height: 1,
        background: 'linear-gradient(to right, transparent 0%, rgba(26,22,18,0.150) 38%, rgba(139,184,232,.55) 50%, rgba(26,22,18,0.150) 62%, transparent 100%)',
        opacity: .55,
      }} />

      {/* Pointer-reactive spotlight */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle 300px at var(--lx) var(--ly), rgba(26,22,18,0.042) 0%, transparent 70%)',
        pointerEvents: 'none',
        transition: 'background .08s ease',
      }} />
    </div>
  );
}
