import React, { useEffect, useRef } from 'react';

/**
 * ThreatStream — Shared background animation for Landing, Mission, AgentSetup.
 *
 * Sparse falling columns of security characters:
 * hex values · identity type labels · algorithm names · hash fragments
 * Very slow fall speed. Near-invisible at low opacity so content reads clearly.
 */

const POOL = [
  '0','1','2','3','4','5','6','7','8','9',
  'A','B','C','D','E','F',
  '0x','FF','4A','D2','B8','3F','7C','E1','9A','5D','C0','6F',
  'USR','AGT','SVC','DEV','TKN','SID',
  'SHA','AES','RSA','JWT','TLS','CBC','GCM',
  '$','@','#','_','·',
];

export default function ThreatStream({ opacity = 0.55 }) {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, raf;

    const COL_W  = 24;   // px between columns
    const FONT_H = 16;   // row height

    let cols = [];

    function buildCols() {
      const n = Math.ceil(W / COL_W);
      cols = Array.from({ length: n }, () => {
        const trailLen = 3 + Math.floor(Math.random() * 5);
        return {
          x:        Math.random() * W,
          dropF:    -Math.random() * (H / FONT_H) * 2,  // start above screen
          speed:    0.08 + Math.random() * 0.22,         // very slow fall
          trailLen,
          chars:    Array.from({ length: Math.ceil(H / FONT_H) + 10 }, () =>
                      POOL[Math.floor(Math.random() * POOL.length)]),
          accent:   Math.random() < 0.14,                // slightly brighter columns
          paused:   Math.random() < 0.25,                // some cols pause randomly
          pauseCD:  Math.random() * 300,
        };
      });
    }

    function resize() {
      W = cv.offsetWidth  || window.innerWidth;
      H = cv.offsetHeight || window.innerHeight;
      cv.width  = W;
      cv.height = H;
      buildCols();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    function frame() {
      // Fade trail with semi-transparent black overlay
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      cols.forEach(col => {
        // Pause logic
        if (col.paused) {
          col.pauseCD -= 1;
          if (col.pauseCD <= 0) {
            col.paused  = false;
            col.pauseCD = 120 + Math.random() * 400;
          }
        } else {
          col.dropF += col.speed;
          if (col.dropF > H / FONT_H + col.trailLen + 5) {
            col.dropF = -(col.trailLen + Math.random() * 30);
            col.chars = Array.from({ length: col.chars.length }, () =>
              POOL[Math.floor(Math.random() * POOL.length)]);
            col.speed = 0.08 + Math.random() * 0.22;
            if (Math.random() < 0.3) { col.paused = true; col.pauseCD = 60 + Math.random() * 200; }
          }
        }

        const headRow = Math.floor(col.dropF);

        for (let i = 0; i <= col.trailLen; i++) {
          const row = headRow - i;
          if (row < 0) continue;
          const y = row * FONT_H;
          if (y > H) continue;

          const char = col.chars[row % col.chars.length];
          let alpha;
          if (i === 0) {
            alpha = col.accent ? 0.60 : 0.38;
            ctx.font = `bold 10px JetBrains Mono, monospace`;
          } else {
            const fade = (col.trailLen - i) / col.trailLen;
            alpha = fade * (col.accent ? 0.15 : 0.09);
            ctx.font = `10px JetBrains Mono, monospace`;
          }

          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.fillText(char, col.x, y);
        }
      });

      raf = requestAnimationFrame(frame);
    }

    // Initial black fill
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={cvRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        opacity, pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}
