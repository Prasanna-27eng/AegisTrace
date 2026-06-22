import React from 'react';

/**
 * AegisTrace Aether Seal logo component.
 * variant: 'icon' | 'full' | 'dark'
 * size: number (controls icon height in px)
 */
export default function AppLogo({ variant = 'icon', size = 28, style = {} }) {
  const src = variant === 'icon'
    ? '/assets/brand/aegistrace-icon.png'
    : variant === 'dark'
    ? '/assets/brand/aegistrace-logo-dark.png'
    : '/assets/brand/aegistrace-logo.png';

  const glow = {
    filter: 'drop-shadow(0 0 6px rgba(74,126,200,0.55)) drop-shadow(0 0 12px rgba(74,126,200,0.25))',
  };

  if (variant === 'full' || variant === 'dark') {
    return (
      <img
        src={src}
        alt="AegisTrace"
        style={{ height: size, width: 'auto', objectFit: 'contain', ...glow, ...style }}
        draggable={false}
      />
    );
  }

  return (
    <img
      src="/assets/brand/aegistrace-icon.png"
      alt="AegisTrace"
      style={{ width: size, height: size, objectFit: 'contain', ...glow, ...style }}
      draggable={false}
    />
  );
}
