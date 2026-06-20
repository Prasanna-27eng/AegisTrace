import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

const SPRING = { stiffness: 500, damping: 28, mass: 0.5 };

export default function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [isLink, setIsLink]   = useState(false);
  const [isClick, setIsClick] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const mouseX = useSpring(0, SPRING);
  const mouseY = useSpring(0, SPRING);

  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouch(true);
      return;
    }

    const onMove = e => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!visible) setVisible(true);
    };

    const checkLink = el =>
      el.closest('a') ||
      el.closest('button') ||
      el.closest('[data-cursor="link"]');

    const onOver  = e => { if (checkLink(e.target)) setIsLink(true);  };
    const onOut   = e => { if (checkLink(e.target)) setIsLink(false); };
    const onDown  = () => setIsClick(true);
    const onUp    = () => setIsClick(false);

    document.addEventListener('mousemove',  onMove);
    document.addEventListener('mouseover',  onOver);
    document.addEventListener('mouseout',   onOut);
    document.addEventListener('mousedown',  onDown);
    document.addEventListener('mouseup',    onUp);
    document.documentElement.addEventListener('mouseleave', () => setVisible(false));
    document.documentElement.addEventListener('mouseenter', () => setVisible(true));

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout',  onOut);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup',   onUp);
    };
  
  }, []);

  if (isTouch) return null;

  const size    = isClick ? 6 : isLink ? 32 : 8;
  const opacity = visible ? (isClick ? 0.5 : isLink ? 0.6 : 0.85) : 0;

  return (
    <motion.div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0,
        pointerEvents: 'none', zIndex: 9999,
        x: mouseX, y: mouseY,
        mixBlendMode: 'difference',
        opacity,
        translateX: '-50%', translateY: '-50%',
      }}
    >
      <motion.div
        animate={{ width: size, height: size }}
        transition={{ type: 'spring', stiffness: 400, damping: 24, mass: 0.4 }}
        style={{ background: '#F59E0B', borderRadius: '50%' }}
      />
    </motion.div>
  );
}
