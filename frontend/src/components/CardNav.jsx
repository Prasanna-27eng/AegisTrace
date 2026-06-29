import React, { useState } from 'react';
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

const BLUE = '#4A7EC8';
const INK  = '#BDD4E8';
const E    = [0.23, 1, 0.32, 1];

export default function CardNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

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
          background: 'rgba(12,12,22,0.92)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: '1px solid rgba(74,126,200,0.16)',
          borderRadius: 16,
          padding: '0 14px 0 12px',
          height: 52,
          pointerEvents: 'all',
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
                filter: 'drop-shadow(0 0 6px rgba(74,126,200,0.55))',
              }}
            />
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, fontWeight: 600, color: INK, letterSpacing: '0.22em',
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
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(74,126,200,0.08)',
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
                        background: 'rgba(74,126,200,0.16)',
                        border: '1px solid rgba(74,126,200,0.28)',
                        borderRadius: 100,
                      }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span style={{
                    position: 'relative', zIndex: 1,
                    display: 'block',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 12.5, fontWeight: active ? 500 : 400,
                    color: active ? INK : 'rgba(189,212,232,0.45)',
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
                background: open ? 'rgba(74,126,200,0.14)' : 'rgba(74,126,200,0.06)',
                border: '1px solid rgba(74,126,200,0.2)',
                borderRadius: 8,
                color: open ? INK : 'rgba(189,212,232,0.65)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5, letterSpacing: '0.12em',
                padding: '6px 12px',
                cursor: 'pointer',
                transition: 'background 140ms, color 140ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,126,200,0.14)'; e.currentTarget.style.color = INK; }}
              onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'rgba(74,126,200,0.06)'; e.currentTarget.style.color = 'rgba(189,212,232,0.65)'; } }}
            >
              {open ? <X size={12} /> : <Grid3X3 size={12} />}
              MODULES
            </button>

            <Link
              to="/app/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: BLUE, color: '#EAF3FF',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, fontWeight: 600,
                padding: '7px 16px', borderRadius: 8,
                textDecoration: 'none', letterSpacing: '0.01em',
                transition: 'background 140ms, transform 100ms, box-shadow 140ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#3A6AB8';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(74,126,200,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = BLUE;
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
                background: 'rgba(10,10,22,0.97)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1px solid rgba(74,126,200,0.14)',
                borderRadius: 14,
                padding: '24px 32px',
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28,
                pointerEvents: 'all',
              }}
            >
              {MODULES_GRID.map(({ group, items }) => (
                <div key={group}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9.5, color: BLUE, letterSpacing: '0.2em',
                    textTransform: 'uppercase', marginBottom: 14,
                  }}>
                    {group}
                  </div>
                  {items.map(item => (
                    <Link
                      key={item}
                      to="/app/login"
                      onClick={() => setOpen(false)}
                      style={{
                        display: 'block',
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 13, color: 'rgba(189,212,232,0.5)',
                        textDecoration: 'none',
                        padding: '7px 0',
                        borderBottom: '1px solid rgba(74,126,200,0.05)',
                        transition: 'color 120ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = INK)}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(189,212,232,0.5)')}
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
