import React, { useRef, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

/* Hash-based noise — cheaper than simplex but visually convincing */
function hash(n) {
  return Math.sin(n * 127.1 + 311.7) * 43758.5453123;
}

function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix     + hash(iy));
  const b = hash(ix + 1 + hash(iy));
  const c = hash(ix     + hash(iy + 1));
  const d = hash(ix + 1 + hash(iy + 1));
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y, oct = 4) {
  let v = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < oct; i++) {
    v   += noise2(x * freq, y * freq) * amp;
    max += amp;
    amp  *= 0.5;
    freq *= 2.1;
  }
  return v / max;
}

// Metallic palette: deep navy → steel blue → silver → electric blue → gold flash
const PALETTE = [
  [0.03, 0.09, 0.22],  // deep navy
  [0.16, 0.34, 0.62],  // steel blue
  [0.28, 0.49, 0.78],  // aegis blue
  [0.56, 0.73, 0.93],  // sky silver
  [0.82, 0.88, 0.97],  // bright silver
  [0.38, 0.60, 0.96],  // electric blue
  [0.95, 0.78, 0.18],  // gold flash
];

function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function samplePalette(v) {
  v = Math.max(0, Math.min(1, v));
  const n = PALETTE.length - 1;
  const i = Math.min(n - 1, Math.floor(v * n));
  return lerp3(PALETTE[i], PALETTE[i + 1], v * n - i);
}

export default function MetallicPaint({ imageUrl, size = 160 }) {
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(size * dpr);
    const H = Math.round(size * dpr);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    let animId;
    let maskData = null;
    let t = 0;

    if (reduced) {
      /* Accessibility: just draw the logo with a static metallic tint */
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, W, H);
        ctx.fillStyle = 'rgba(74,126,200,0.3)';
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      };
      return;
    }

    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      /* Capture pixel mask from the logo */
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(img, 0, 0, W, H);
      maskData = offCtx.getImageData(0, 0, W, H);
      startLoop();
    };

    function startLoop() {
      const draw = () => {
        t += 0.007;
        const out = ctx.createImageData(W, H);
        const od = out.data;
        const md = maskData.data;

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const pi = (y * W + x) * 4;
            const mr = md[pi], mg = md[pi + 1], mb = md[pi + 2], ma = md[pi + 3];

            /* Support both transparent PNG and black-bg PNG */
            const lum = (mr * 0.299 + mg * 0.587 + mb * 0.114) / 255;
            const alpha = ma / 255;
            const mask = alpha * Math.min(1, lum * 2);
            if (mask < 0.04) { od[pi + 3] = 0; continue; }

            /* Multi-layer noise for depth */
            const nx = x / W, ny = y / H;
            const n1 = fbm(nx * 3.6 + t * 0.22, ny * 3.6 + t * 0.14);
            const n2 = fbm(nx * 7.2 - t * 0.18, ny * 7.2 + t * 0.10, 2);
            const combined = (n1 * 0.5 + 0.5) * 0.7 + (n2 * 0.5 + 0.5) * 0.3;

            /* Sweeping specular band */
            const specPhase = (Math.sin(t * 0.65) + 1) * 0.5;
            const spec = Math.max(0, 1 - Math.abs(nx - specPhase) * 4.5) * 0.35;

            const v = Math.min(1, combined * 0.85 + spec);
            const [r, g, b] = samplePalette(v);

            od[pi]     = Math.round(r * 255);
            od[pi + 1] = Math.round(g * 255);
            od[pi + 2] = Math.round(b * 255);
            od[pi + 3] = Math.round(mask * 255);
          }
        }
        ctx.putImageData(out, 0, 0);
        animId = requestAnimationFrame(draw);
      };
      animId = requestAnimationFrame(draw);
    }

    return () => cancelAnimationFrame(animId);
  }, [imageUrl, size, reduced]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}
