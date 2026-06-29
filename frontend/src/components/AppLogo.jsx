import React from 'react';

/**
 * AegisTrace Aether Seal logo component.
 * variant: 'icon' — orbital knot (black bg, use mix-blend-mode:screen on dark surfaces)
 * variant: 'seal' — full circular emblem in dark container
 * size: number (px)
 *
 * The icon PNG has a black background. On dark sites (#050505),
 * mix-blend-mode:screen makes the black background invisible — only the
 * blue orbital knot renders. Never use on light backgrounds.
 */
export default function AppLogo({ variant = 'icon', size = 28, glow = true, style = {} }) {
  const glowFilter = glow
    ? 'drop-shadow(0 0 6px rgba(74,126,200,0.6)) drop-shadow(0 0 14px rgba(204,120,92,0.25))'
    : 'none';

  /* Icon — orbital knot on black bg, blend mode removes the black */
  if (variant === 'icon') {
    return (
      <img
        src="/assets/brand/aegistrace-icon-transparent.png"
        alt="AegisTrace"
        draggable={false}
        style={{
          width: size, height: size,
          objectFit: 'contain',          /* black bg vanishes on dark site */
          filter: glowFilter,
          ...style,
        }}
      />
    );
  }

  /* Seal — full circular emblem wrapped in a dark circle to mask any bg */
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: 'var(--card)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: glow ? '0 0 20px rgba(204,120,92,0.3), 0 0 40px rgba(26,22,18,0.14)' : 'none',
      ...style,
    }}>
      <img
        src="/assets/brand/aegistrace-seal.png"
        alt="AegisTrace"
        draggable={false}
        style={{ width: '85%', height: '85%', objectFit: 'contain' }}
      />
    </div>
  );
}
