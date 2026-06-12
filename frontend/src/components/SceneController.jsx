import React from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

/* ─── Scene-level progress hook ───────────────────────────────────────────
   Smooth spring-damped camera that eases between scroll positions.
   Set smooth=false for 1:1 scrubbed (freeze-on-stop) behavior.           */
export function useSceneCamera(ref, { smooth = true } = {}) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  if (!smooth) return scrollYProgress;
  return useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.6,
  });
}

/* ─── PinnedScene — tall scroll runway with a sticky 100vh viewport ────
   The "camera" is the scroll progress measured across the runway.
   The frame holds its final state while it scrolls away — no exit fade
   (fading creates blank black stretches between scenes).               */
export function PinnedScene({ vh, sceneRef, children }) {
  return (
    <section ref={sceneRef} style={{ height: vh, position: 'relative' }}>
      <div style={{
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </div>
    </section>
  );
}

/* ─── CrossFade wrapper for smooth visual scene transitions ─────────────
   Wraps the PinnedScene's sticky content.  Uses the scene's own scroll
   progress to fade out its last ~8% as the next scene fades in.          */
export function SceneFade({ children, progress, style }) {
  const exitOpacity = useTransform(progress, [0.92, 1], [1, 0], { clamp: true });
  return (
    <motion.div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: exitOpacity,
        willChange: 'opacity',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Scroll progress hairline — gold thread across the top ───────────── */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 170,
    damping: 30,
    mass: 0.3,
  });
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: '#F59E0B',
        transformOrigin: '0 50%',
        scaleX,
        zIndex: 300,
      }}
    />
  );
}

export default PinnedScene;
