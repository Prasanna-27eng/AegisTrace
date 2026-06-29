import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Grid3X3, X } from './icons';

const NAV_ITEMS = [
  { label: 'Platform',  to: '/platform'  },
  { label: 'Mission',   to: '/mission'   },
  { label: 'Features',  to: '/features'  },
  { label: 'Tools',     to: '/tools'     },
  { label: 'Portfolio', to: '/portfolio' },
];

const MODULES_GRID = [
  { group: 'Detection',  items: ['ITDR Engine', 'Attack Graph', 'Threat Hunt', 'AI Anomaly'] },
  { group: 'Response',   items: ['SOAR Playbooks', 'Auto-Rules', 'Incident Timeline', 'Evidence Pack'] },
  { group: 'Platform',   items: ['Identity Graph', 'Endpoint Agent', 'API Gateway', 'ATSP Protocol'] },
  { group: 'Enterprise', items: ['SCIM Sync', 'RBAC + Orgs', 'Audit Log', 'Compliance Reports'] },
];

const CORAL  = '#CC785C';
const INK    = '#1A1612';
const MUTED  = '#6B6258';
const BG     = 'rgba(245,240,232,0.92)';
const E      = [0.23, 1, 0.32, 1];
const SERIF  = "'DM Serif Display', Georgia, serif";
const MONO   = "'IBM Plex Mono', monospace";
const SANS   = "'DM Sans', system-ui, sans-serif";

export default function CardNav() {
  const { pathname } = useLocation();
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: E }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          padding: '10px clamp(12px,2.5vw,28px)',
          pointerEvents: 'none',
        }}
      >
        {/* Card container */}
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 12,
          background: scrolled ? BG : 'rgba(245,240,232,0.7)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: `1px solid rgba(26,22,18,${scrolled ? '0.1' : '0.07'})`,
          borderRadius: 14,
          padding: '0 14px 0 12px',
          height: 52,
          pointerEvents: 'all',
          boxShadow: scrolled ? '0 4px 24px rgba(26,22,18,0.08)' : 'none',
          transition: 'background 300ms, border-color 300ms, box-shadow 300ms',
        }}>
          {/* Logo */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}
          >
            <img
              src="/assets/brand/aegistrace-icon-transparent.png"
              alt="AegisTrace"
              style={{
                width: 26, height: 26, objectFit: 'contain',
                filter: 'drop-shadow(0 0 4px rgba(204,120,92,0.35))',
              }}
            />
            <span style={{
              fontFamily: MONO,
              fontSize: 11.5, fontWeight: 600, color: INK, letterSpacing: '0.22em',
            }}>
              AEGISTRACE
            </span>
          </Link>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Pill nav */}
          <nav
            aria-label="Main navigation"
            style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'rgba(26,22,18,0.04)',
              border: '1px solid rgba(26,22,18,0.06)',
              borderRadius: 100,
              padding: 3,
            }}
          >
            {NAV_ITEMS.map(({ label, to }) => {
              const active = pathname === to;
              return (
                <Link key={label} to={to} style={{ position: 'relative', textDecoration: 'none' }}>
                  {active && (
                    <motion.div
                      layoutId="cardnav-pill"
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(204,120,92,0.12)',
                        border: '1px solid rgba(204,120,92,0.25)',
                        borderRadius: 100,
                      }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span style={{
                    position: 'relative', zIndex: 1,
                    display: 'block',
                    fontFamily: SANS,
                    fontSize: 13, fontWeight: active ? 500 : 400,
                    color: active ? CORAL : MUTED,
                    padding: '5px 14px',
                    borderRadius: 100,
                    whiteSpace: 'nowrap',
                    transition: 'color 140ms',
                  }}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setOpen(v => !v)}
              aria-label="Toggle modules menu"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: open ? 'rgba(204,120,92,0.1)' : 'transparent',
                border: `1px solid ${open ? 'rgba(204,120,92,0.25)' : 'rgba(26,22,18,0.12)'}`,
                borderRadius: 8,
                color: open ? CORAL : MUTED,
                fontFamily: MONO,
                fontSize: 10.5, letterSpacing: '0.12em',
                padding: '6px 12px',
                cursor: 'pointer',
                transition: 'background 140ms, color 140ms, border-color 140ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(204,120,92,0.08)'; e.currentTarget.style.color = CORAL; e.currentTarget.style.borderColor = 'rgba(204,120,92,0.2)'; }}
              onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = 'rgba(26,22,18,0.12)'; } }}
            >
              {open ? <X size={12} /> : <Grid3X3 size={12} />}
              MODULES
            </button>

            <Link
              to="/app/login"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: INK, color: '#F5F0E8',
                fontFamily: SANS,
                fontSize: 13, fontWeight: 600,
                padding: '7px 16px', borderRadius: 8,
                textDecoration: 'none', letterSpacing: '0.01em',
                transition: 'background 140ms, transform 100ms, box-shadow 140ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = CORAL;
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(204,120,92,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = INK;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Enter Console <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* Mega-menu dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: E }}
              style={{
                maxWidth: 1180, margin: '6px auto 0',
                background: 'rgba(245,240,232,0.97)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1px solid rgba(26,22,18,0.1)',
                borderRadius: 14,
                padding: '24px 32px',
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28,
                pointerEvents: 'all',
                boxShadow: '0 16px 48px rgba(26,22,18,0.12)',
              }}
            >
              {MODULES_GRID.map(({ group, items }) => (
                <div key={group}>
                  <div style={{
                    fontFamily: MONO,
                    fontSize: 9.5, color: CORAL, letterSpacing: '0.2em',
                    textTransform: 'uppercase', marginBottom: 14,
                  }}>
                    {group}
                  </div>
                  {items.map(item => (
                    <Link
                      key={item}
                      to="/app/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      style={{
                        display: 'block',
                        fontFamily: SANS,
                        fontSize: 13, color: MUTED,
                        textDecoration: 'none',
                        padding: '7px 0',
                        borderBottom: '1px solid rgba(26,22,18,0.06)',
                        transition: 'color 120ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = INK)}
                      onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Backdrop close */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
