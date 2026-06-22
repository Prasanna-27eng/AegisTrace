import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const E = [0.23, 1, 0.32, 1];
const LETTERS = 'AEGISTRACE'.split('');

function SealIcon({ size = 80 }) {
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      filter: 'drop-shadow(0 0 20px rgba(74,126,200,0.6)) drop-shadow(0 0 40px rgba(74,126,200,0.3))',
    }}>
      <img
        src="/assets/brand/aegistrace-icon.png"
        alt="AegisTrace Aether Seal"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        draggable={false}
      />
    </div>
  );
}

export function useLoading() {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), reduced ? 100 : 2600);
    return () => clearTimeout(t);
  }, [reduced]);
  return { done };
}

export default function LoadingScreen() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, zIndex: 9999 }}
        >
          <SealIcon size={72} />
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, letterSpacing: '0.3em', color: '#BDD4E8' }}>AEGISTRACE</span>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.76,0,0.24,1], delay: 0.1 }}
      style={{ position: 'fixed', inset: 0, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 9999, overflow: 'hidden' }}
    >
      {/* Ambient glow behind seal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: E }}
        style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,126,200,0.18) 0%, transparent 70%)', pointerEvents: 'none' }}
      />

      {/* Seal — appears, then slowly rotates */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: E }}
        style={{ marginBottom: 32, position: 'relative', zIndex: 2 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, ease: 'linear', repeat: Infinity }}
        >
          <SealIcon size={88} />
        </motion.div>
      </motion.div>

      {/* AEGISTRACE letter stagger */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 20, position: 'relative', zIndex: 2 }}>
        {LETTERS.map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 + i * 0.055, ease: E }}
            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: '#BDD4E8', letterSpacing: '0.22em', display: 'inline-block' }}
          >
            {ch}
          </motion.span>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: 160, height: 1, background: 'rgba(74,126,200,0.15)', position: 'relative', overflow: 'hidden', zIndex: 2 }}>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.8, delay: 0.5, ease: [0.4,0,0.2,1] }}
          style={{ position: 'absolute', inset: 0, background: '#4A7EC8', transformOrigin: 'left', boxShadow: '0 0 8px rgba(74,126,200,0.8)' }}
        />
      </div>

      {/* Global keyframes for glow pulse */}
      <style>{`
        @keyframes sealGlow {
          0%,100% { filter: drop-shadow(0 0 16px rgba(74,126,200,0.5)) drop-shadow(0 0 32px rgba(74,126,200,0.25)); }
          50%      { filter: drop-shadow(0 0 28px rgba(74,126,200,0.8)) drop-shadow(0 0 56px rgba(74,126,200,0.4)); }
        }
      `}</style>
    </motion.div>
  );
}
