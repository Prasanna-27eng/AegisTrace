import React, { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

/* Inject scroll-snap styles once */
const SNAP_STYLE_ID = '__aegis_snap';

function ensureSnapStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SNAP_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SNAP_STYLE_ID;
  style.textContent = `
    /* Enable scroll-snap on pages with story-based scrolling */
    body.has-story-scroll {
      scroll-snap-type: y proximity;
      scroll-behavior: smooth;
    }
    body.has-story-scroll .story-scene {
      scroll-snap-align: start;
    }
    @media (prefers-reduced-motion: reduce) {
      body.has-story-scroll {
        scroll-behavior: auto !important;
        scroll-snap-type: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

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

/* ─── Hook to activate story-scroll on the page body ──────────────────── */
export function useStoryScroll() {
  React.useEffect(() => {
    ensureSnapStyles();
    document.body.classList.add('has-story-scroll');
    return () => document.body.classList.remove('has-story-scroll');
  }, []);
}

/* ─── PinnedScene v2 — gapless transitions ───────────────────────────────
   Each scene gets a negative margin-top equal to 100vh so that the blank
   tail at the end of one scene is absorbed by the start of the next.
   scroll-snap-align enables snap-to-section behavior.                    */
export function PinnedScene({
  vh,
  sceneRef,
  children,
  index = 0,
}) {
  /* Pull each scene (except the first) up by the full 100vh tail.
     This eliminates the blank gap between scenes completely:
     when scene N's sticky releases (at progress=1), scene N+1's
     sticky immediately engages because its section top is at that
     exact scroll position.                                               */
  const pullUp = index > 0 ? '-100vh' : '0';

  return (
    <section
      ref={sceneRef}
      className="story-scene"
      style={{
        height: vh,
        position: 'relative',
        marginTop: pullUp,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
