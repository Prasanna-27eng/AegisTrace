import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const BG   = '#050405';
const GOLD = '#F59E0B';
const INK  = '#F5F0E8';
const LETTERS = 'AEGISTRACE'.split('');
const STAGGER  = 0.06;   // s per letter
const BAR_DUR  = 1.8;    // s for progress bar
const EXIT_DUR = 0.7;    // s for slide-up exit
const TOTAL    = BAR_DUR + EXIT_DUR;

/* ── Hook ──────────────────────────────────────────────────────────────────── */
export function useLoading() {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(reduced ? true : false);
  useEffect(() => {
    if (reduced) { setDone(true); return; }
    const t = setTimeout(() => setDone(true), TOTAL * 1000 + 80);
    return () => clearTimeout(t);
  }, [reduced]);
  return { done };
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function LoadingScreen() {
  const reduced = useReducedMotion();

  /* progress bar driven imperatively so it stays at exactly BAR_DUR */
  const barRef = useRef(null);
  useEffect(() => {
    if (reduced || !barRef.current) return;
    barRef.current.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: BAR_DUR * 1000, easing: 'cubic-bezier(0.23,1,0.32,1)', fill: 'forwards' }
    );
  }, [reduced]);

  return (
    <motion.div
      key="loading"
      initial={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ duration: EXIT_DUR, ease: [0.76, 0, 0.24, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: BG,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 32,
      }}
    >
      {/* Letter stagger */}
      <div
        aria-label="AegisTrace"
        style={{ display: 'flex', gap: reduced ? 4 : 2 }}
      >
        {LETTERS.map((ch, i) => (
          <motion.span
            key={i}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced
              ? { duration: 0 }
              : { duration: 0.4, delay: i * STAGGER, ease: [0.23, 1, 0.32, 1] }
            }
            style={{
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: 'clamp(28px, 5vw, 52px)',
              letterSpacing: '0.18em',
              color: INK,
              display: 'inline-block',
              willChange: 'transform, opacity',
            }}
          >
            {ch}
          </motion.span>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        width: 'clamp(180px, 28vw, 320px)',
        height: 1,
        background: 'rgba(245,240,232,0.1)',
        overflow: 'hidden',
      }}>
        <div
          ref={barRef}
          style={{
            height: '100%',
            background: GOLD,
            transformOrigin: '0 50%',
            transform: 'scaleX(0)',
          }}
        />
      </div>
    </motion.div>
  );
}
