/**
 * MagicRings — React Bits-style animated concentric rings background
 * Pure CSS animation, no canvas or Three.js needed.
 * Use as full-screen background behind any layout.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const RINGS = [
  { r: 120,  dur: 8,   delay: 0,    opacity: 0.55, blur: 0,   width: 1.5 },
  { r: 220,  dur: 12,  delay: -2,   opacity: 0.38, blur: 0.5, width: 1   },
  { r: 340,  dur: 16,  delay: -5,   opacity: 0.28, blur: 0.5, width: 1   },
  { r: 480,  dur: 22,  delay: -8,   opacity: 0.20, blur: 1,   width: 0.8 },
  { r: 650,  dur: 30,  delay: -12,  opacity: 0.14, blur: 1,   width: 0.8 },
  { r: 850,  dur: 40,  delay: -18,  opacity: 0.09, blur: 1.5, width: 0.6 },
  { r: 1100, dur: 55,  delay: -25,  opacity: 0.06, blur: 2,   width: 0.5 },
];

const DOTS = [
  { r: 120,  angle: 45 },
  { r: 220,  angle: 135 },
  { r: 340,  angle: 225 },
  { r: 480,  angle: 315 },
  { r: 650,  angle: 72 },
];

export default function MagicRings({ color = '#4A7EC8', accent = 'rgba(26,22,18,0.7)', className = '' }) {
  const id = useMemo(() => `mr-${Math.random().toString(36).slice(2, 7)}`, []);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* ── Gradient radial glow at center ── */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, ${color}08 50%, transparent 70%)`,
        filter: 'blur(40px)',
      }} />

      {/* ── SVG rings ── */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {RINGS.map((ring, i) => (
            <radialGradient key={`rg-${i}`} id={`${id}-rg-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={accent} stopOpacity="0" />
              <stop offset="70%" stopColor={color} stopOpacity={ring.opacity} />
              <stop offset="85%" stopColor={color} stopOpacity={ring.opacity * 0.6} />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* rings */}
        {RINGS.map((ring, i) => (
          <motion.ellipse
            key={`ring-${i}`}
            cx="50%"
            cy="50%"
            rx={ring.r}
            ry={ring.r * 0.38}
            fill="none"
            stroke={color}
            strokeWidth={ring.width}
            strokeOpacity={ring.opacity}
            style={{ filter: ring.blur ? `blur(${ring.blur}px)` : undefined }}
            animate={{
              rotateX: [0, 360],
              strokeOpacity: [ring.opacity, ring.opacity * 0.5, ring.opacity],
            }}
            transition={{
              rotateX: { duration: ring.dur, delay: ring.delay, repeat: Infinity, ease: 'linear' },
              strokeOpacity: { duration: ring.dur * 0.5, delay: ring.delay, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        ))}

        {/* orbiting glow dots */}
        {DOTS.map((dot, i) => {
          const rad = (dot.angle * Math.PI) / 180;
          const cx = `calc(50% + ${Math.cos(rad) * dot.r}px)`;
          const cy = `calc(50% + ${Math.sin(rad) * dot.r * 0.38}px)`;
          return (
            <motion.circle
              key={`dot-${i}`}
              r={2.5}
              fill={accent}
              fillOpacity={0.8}
              style={{ cx, cy, filter: `blur(1px) drop-shadow(0 0 6px ${accent})` }}
              animate={{
                fillOpacity: [0.8, 0.2, 0.8],
              }}
              transition={{
                duration: 3 + i,
                delay: i * 0.7,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </svg>

      {/* ── CSS-animated spinning rings via keyframes ── */}
      <style>{`
        @keyframes ${id}-spin-slow {
          from { transform: translate(-50%, -50%) rotateX(60deg) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotateX(60deg) rotate(360deg); }
        }
        @keyframes ${id}-spin-rev {
          from { transform: translate(-50%, -50%) rotateX(60deg) rotate(360deg); }
          to   { transform: translate(-50%, -50%) rotateX(60deg) rotate(0deg); }
        }
        @keyframes ${id}-pulse-ring {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      {[120, 240, 380, 530].map((size, i) => (
        <div
          key={`css-ring-${i}`}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: size * 2,
            height: size * 2,
            marginLeft: -size,
            marginTop: -size,
            borderRadius: '50%',
            border: `${1 - i * 0.15}px solid ${color}`,
            opacity: 0.18 - i * 0.03,
            animation: `
              ${i % 2 === 0 ? `${id}-spin-slow` : `${id}-spin-rev`} ${20 + i * 10}s linear infinite,
              ${id}-pulse-ring ${5 + i * 2}s ease-in-out infinite
            `,
            transform: `translate(-50%, -50%) rotateX(60deg) rotate(${i * 45}deg)`,
          }}
        />
      ))}
    </div>
  );
}
