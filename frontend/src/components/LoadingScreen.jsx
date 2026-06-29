import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import MetallicPaint from './MetallicPaint';

const EOUT   = [0.23, 1, 0.32, 1];
const SPRING = { type: 'spring', stiffness: 260, damping: 22, mass: 0.8 };
const LETTERS = 'AEGISTRACE'.split('');

function SealRing({ progress }) {
  const c = 2 * Math.PI * 54;
  const offset = c - c * Math.min(progress, 1);
  return (
    <svg viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(74,126,200,0.22)" strokeWidth="1"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 60 60)"/>
      <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(74,126,200,0.1)" strokeWidth="0.5"
        strokeDasharray={`${c * 0.6 * Math.min(progress, 1)} 999`} transform="rotate(-90 60 60)"/>
    </svg>
  );
}

export function useLoading() {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(() => {
    // Only show on first-ever visit
    return reduced || localStorage.getItem('at_visited') === '1';
  });
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => {
      setDone(true);
      localStorage.setItem('at_visited', '1');
    }, 2700);
    return () => clearTimeout(t);
  }, [done]);
  return { done };
}

export default function LoadingScreen() {
  const reduced = useReducedMotion();
  const [ring, setRing] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (reduced) { setRing(1); return; }
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      setRing(1 - Math.pow(1 - p, 4));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [reduced]);

  if (reduced) {
    return (
      <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: var(--card), display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, zIndex: 9999 }}>
        <img src="/assets/brand/aegistrace-icon-transparent.png" alt="AegisTrace"
          style={{ width: 72, height: 72, filter: 'drop-shadow(0 0 8px rgba(74,126,200,0.6))' }}/>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: 'var(--text-primary)', letterSpacing: '0.3em' }}>AEGISTRACE</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1], delay: 0.08 }}
      style={{ position: 'fixed', inset: 0, background: var(--card), display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 9999, overflow: 'hidden' }}
    >
      {/* Deep glow bloom */}
      <motion.div aria-hidden
        initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: EOUT }}
        style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,126,200,0.14) 0%, rgba(74,126,200,0.04) 45%, transparent 70%)',
          pointerEvents: 'none' }}
      />

      {/* MetallicPaint logo */}
      <motion.div
        initial={{ scale: 0.55, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.10 }}
        style={{ position: 'relative', marginBottom: 38,
          filter: 'drop-shadow(0 0 18px rgba(74,126,200,0.65)) drop-shadow(0 0 36px rgba(204,120,92,0.25))' }}
      >
        <MetallicPaint
          imageUrl="/assets/brand/aegistrace-icon-transparent.png"
          size={120}
        />
        {/* Orbital ring around the metallic logo */}
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          border: '1px solid rgba(74,126,200,0.18)',
          pointerEvents: 'none',
        }}/>
        <motion.div aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
          style={{
            position: 'absolute', inset: -12, borderRadius: '50%',
            border: '1px dashed rgba(26,22,18,0.1)',
            pointerEvents: 'none',
          }}
        />
      </motion.div>

      {/* Letter stagger — Remotion interpolate timing model */}
      <div style={{ display: 'flex', marginBottom: 20 }}>
        {LETTERS.map((ch, i) => (
          <motion.span key={i}
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.42, delay: 0.68 + i * 0.058, ease: EOUT }}
            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 600,
              color: 'var(--text-primary)', letterSpacing: '0.22em', display: 'inline-block' }}
          >{ch}</motion.span>
        ))}
      </div>

      {/* Progress bar with gradient sweep */}
      <div style={{ width: 150, height: 1.5, background: 'rgba(74,126,200,0.1)', position: 'relative', overflow: 'hidden' }}>
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 1.85, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'absolute', inset: 0, transformOrigin: 'left',
            background: 'linear-gradient(90deg, #2A5A9E 0%, #4A7EC8 50%, #8BB8E8 100%)',
            boxShadow: '0 0 10px rgba(74,126,200,0.9), 0 0 24px rgba(204,120,92,0.35)' }}
        />
      </div>
    </motion.div>
  );
}
