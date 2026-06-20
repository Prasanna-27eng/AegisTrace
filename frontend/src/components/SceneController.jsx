import React, { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

/* ─── Scene-level progress hook ─────────────────────────────────────────────
   Smooth spring-damped scroll progress for a pinned section.
   smooth=false gives 1:1 scrub (use for horizontal pans).                   */
export function useSceneCamera(ref, { smooth = true } = {}) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  if (!smooth) return scrollYProgress;
  return useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.8 });
}

/* ─── Section-level parallax progress ───────────────────────────────────────
   Measures how far a section has scrolled through the viewport.
   offset: ['start end', 'end start'] = section enters bottom, exits top.    */
export function useSectionParallax(ref) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  return useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.8 });
}

/* ─── PinnedScene ────────────────────────────────────────────────────────────
   Tall scroll runway with a sticky 100vh viewport. The camera is the
   scroll progress across the runway height.                                  */
export function PinnedScene({ vh, sceneRef, children, style = {} }) {
  return (
    <section ref={sceneRef} style={{ height: vh, position: 'relative', ...style }}>
      <div style={{
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </div>
    </section>
  );
}

/* ─── DepthLayer ─────────────────────────────────────────────────────────────
   A parallax layer that moves at `rate` × the section scroll progress.
   rate 0 = stationary, rate 1 = moves with scroll, rate > 1 = faster.
   Use negative Y to make layers move upward (foreground feel).              */
export function DepthLayer({ p, rate = 0.5, distance = 80, axis = 'y', children, style = {} }) {
  const translate = useTransform(p, [0, 1],
    axis === 'y' ? [`${-distance * rate}px`, `${distance * rate}px`]
                 : [`${-distance * rate}px`, `${distance * rate}px`]
  );
  return (
    <motion.div style={{ [axis === 'y' ? 'y' : 'x']: translate, ...style }}>
      {children}
    </motion.div>
  );
}

/* ─── RackFocus ──────────────────────────────────────────────────────────────
   Simulates a camera rack-focus shift. The element is "in focus" when p
   is near `focusAt`. Outside that window it blurs + dims.
   Use multiple RackFocus elements at different focusAt values to shift
   focus between depth planes as you scroll.

   Props:
     p         — scroll progress MotionValue (0–1)
     focusAt   — p value at which this element is sharp (0–1)
     window    — how wide the in-focus zone is (default 0.2)
     maxBlur   — max blur in px (default 10)
     minOp     — min opacity when fully blurred (default 0.2)             */
export function RackFocus({ p, focusAt, window: win = 0.2, maxBlur = 10, minOp = 0.2, children, style = {} }) {
  const half = win / 2;
  const blur = useTransform(
    p,
    [Math.max(0, focusAt - half - 0.15), focusAt - half, focusAt + half, Math.min(1, focusAt + half + 0.15)],
    [maxBlur, 0, 0, maxBlur],
    { clamp: true }
  );
  const opacity = useTransform(
    p,
    [Math.max(0, focusAt - half - 0.15), focusAt - half, focusAt + half, Math.min(1, focusAt + half + 0.15)],
    [minOp, 1, 1, minOp],
    { clamp: true }
  );
  const filter = useTransform(blur, v => `blur(${v}px)`);
  return (
    <motion.div style={{ opacity, filter, willChange: 'filter, opacity', ...style }}>
      {children}
    </motion.div>
  );
}

/* ─── DollyZoom ──────────────────────────────────────────────────────────────
   Vertigo / Hitchcock effect: background rushes toward camera while
   foreground moves gently. Pass bgRate and fgRate for the scale differentials.
   The ratio between them IS the effect — bg should be 2-4× the fg rate.     */
export function DollyZoom({ p, bgRate = 3.5, fgRate = 1.3, children, bgStyle = {}, fgStyle = {} }) {
  const bgScale = useTransform(p, [0, 1], [1, bgRate]);
  const fgScale = useTransform(p, [0, 1], [1, fgRate]);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <motion.div style={{ ...bgStyle, scale: bgScale, willChange: 'transform' }}/>
      <motion.div style={{ ...fgStyle, scale: fgScale, willChange: 'transform' }}>
        {children}
      </motion.div>
    </div>
  );
}

/* ─── ScrollProgressBar ──────────────────────────────────────────────────────
   Gold hairline across the top that fills as the page scrolls.              */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 170, damping: 30, mass: 0.3 });
  return (
    <motion.div aria-hidden style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2,
      background: '#F59E0B', transformOrigin: '0 50%', scaleX, zIndex: 300,
    }}/>
  );
}

export default PinnedScene;
