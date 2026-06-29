import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from './icons';

const NAV_ITEMS = [
  { label: 'Platform',  to: '/platform'  },
  { label: 'Mission',   to: '/mission'   },
  { label: 'Features',  to: '/features'  },
  { label: 'Tools',     to: '/tools'     },
  { label: 'Portfolio', to: '/portfolio' },
];

const BLUE = '#2563EB';
const INK  = '#BDD4E8';

export default function PillNav() {
  const { pathname } = useLocation();

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,4vw,56px)', height: 60,
        background: 'rgba(5,5,5,0.85)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid rgba(74,126,200,0.08)',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
        <img
          src="/assets/brand/aegistrace-icon-transparent.png"
          alt="AegisTrace"
          style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(74,126,200,0.55))' }}
        />
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13, fontWeight: 600, color: INK, letterSpacing: '0.18em',
        }}>
          AEGISTRACE
        </span>
      </Link>

      {/* Pill navigation */}
      <nav
        aria-label="Main navigation"
        style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(74,126,200,0.1)',
          borderRadius: 100,
          padding: '4px',
        }}
      >
        {NAV_ITEMS.map(({ label, to }) => {
          const isActive = pathname === to || (to === '/' && pathname === '/');
          return (
            <Link
              key={label}
              to={to}
              style={{ position: 'relative', textDecoration: 'none' }}
            >
              {isActive && (
                <motion.div
                  layoutId="pill-indicator"
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(74,126,200,0.18)',
                    border: '1px solid rgba(74,126,200,0.28)',
                    borderRadius: 100,
                    zIndex: 0,
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span style={{
                position: 'relative', zIndex: 1,
                display: 'block',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                color: isActive ? INK : 'rgba(189,212,232,0.48)',
                padding: '6px 16px',
                borderRadius: 100,
                transition: 'color 140ms',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* CTA */}
      <Link
        to="/app/login"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: BLUE, color: '#fff',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12, fontWeight: 600,
          padding: '8px 18px', borderRadius: 4, flexShrink: 0,
          textDecoration: 'none', letterSpacing: '0.02em',
          transition: 'background 140ms, transform 100ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        Book a Demo <ArrowRight size={12} />
      </Link>
    </motion.header>
  );
}
