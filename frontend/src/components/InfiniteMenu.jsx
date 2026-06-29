import React, { useRef, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

const ITEMS = [
  { title: 'Identity Threat',    sub: 'ITDR' },
  { title: 'Zero Trust',         sub: 'Architecture' },
  { title: 'Agent Security',     sub: 'AI-Native' },
  { title: 'Memory Forensics',   sub: 'Volatility 3' },
  { title: 'MITRE ATT&CK',       sub: 'Mapped' },
  { title: 'Behavioural AI',     sub: 'ML-Powered' },
  { title: 'Non-Human Identity', sub: 'NHI Health' },
  { title: 'Prompt Shield',      sub: 'LLM Guard' },
  { title: 'Shadow AI',          sub: 'Detection' },
  { title: 'Regulatory Pack',    sub: 'EU AI Act · DORA' },
  { title: 'Attack Graph',       sub: 'Lateral Movement' },
  { title: 'Trust Timeline',     sub: 'ATSP Standard' },
];

const RADIUS     = 440;
const SPEED      = 0.10;   // degrees per frame
const ITEM_W     = 190;
const ITEM_H     = 64;

export default function InfiniteMenu() {
  const cylinderRef = useRef(null);
  const rotRef      = useRef(0);
  const rafRef      = useRef(null);
  const reduced     = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = cylinderRef.current;
    if (!el) return;

    const tick = () => {
      rotRef.current += SPEED;
      el.style.transform = `rotateY(${rotRef.current}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reduced]);

  const N     = ITEMS.length;
  const STEP  = 360 / N;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        perspective: '900px',
        overflow: 'hidden',
        opacity: 0.065,
      }}
    >
      <div
        ref={cylinderRef}
        style={{
          position: 'relative',
          transformStyle: 'preserve-3d',
          width: 1, height: 1,
          willChange: 'transform',
        }}
      >
        {ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: ITEM_W,
              left: -(ITEM_W / 2),
              top: -(ITEM_H / 2),
              transform: `rotateY(${i * STEP}deg) translateZ(${RADIUS}px)`,
              padding: '12px 18px',
              background: 'rgba(26,22,18,0.036)',
              border: '1px solid rgba(26,22,18,0.084)',
              borderRadius: 8,
            }}
          >
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, letterSpacing: '0.14em',
              color: 'rgba(26,22,18,0.540)',
              textTransform: 'uppercase', marginBottom: 4,
            }}>
              {item.sub}
            </div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 600,
              color: 'rgba(189,212,232,0.85)',
            }}>
              {item.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
