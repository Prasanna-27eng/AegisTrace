import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/* ─── PageCurtain ────────────────────────────────────────────────────────────
   Dark #050405 overlay that covers the screen on every route change and
   then fades out to reveal the incoming page. Creates a seamless cinematic
   cut between pages with zero content flash.

   Reduced motion: opacity crossfade only (no movement).                     */
export default function PageCurtain() {
  const location   = useLocation();
  const reduced    = useReducedMotion();
  const keyRef     = useRef(0);
  const prevPath   = useRef(location.pathname);

  if (location.pathname !== prevPath.current) {
    prevPath.current = location.pathname;
    keyRef.current  += 1;
  }

  return (
    <AnimatePresence>
      <motion.div
        key={keyRef.current}
        aria-hidden
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={reduced
          ? { duration: 0.15 }
          : { duration: 0.52, ease: [0.76, 0, 0.24, 1], delay: 0.04 }
        }
        style={{
          position: 'fixed', inset: 0,
          background: '#050405',
          zIndex: 9997,
          pointerEvents: 'none',
        }}
      />
    </AnimatePresence>
  );
}
