import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft } from '../components/icons';
import api from '../api/client';
import useStore from '../store/useStore';

const E = [0.23, 1, 0.32, 1];
const CORAL  = '#CC785C';
const DARK   = '#141210';
const INK    = '#F0EBE3';
const MUTED  = 'rgba(240,235,227,0.55)';
const SERIF  = "'DM Serif Display', Georgia, serif";
const SANS   = "'DM Sans', system-ui, sans-serif";
const MONO   = "'IBM Plex Mono', monospace";

/* ── Animated grain texture ──────────────────────────────────────────────── */
const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export default function Login() {
  const navigate = useNavigate();
  const setAuth  = useStore(s => s.setAuth);

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [mfa,          setMfa]          = useState(false);
  const [mfaCode,      setMfaCode]      = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [shakeKey,     setShakeKey]     = useState(0);
  const [focusField,   setFocusField]   = useState(null);

  const panelRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const bg1X = useTransform(smoothX, [-0.5, 0.5], [-18, 18]);
  const bg1Y = useTransform(smoothY, [-0.5, 0.5], [-10, 10]);
  const bg2X = useTransform(smoothX, [-0.5, 0.5], [10, -10]);
  const bg2Y = useTransform(smoothY, [-0.5, 0.5], [6, -6]);
  const tiltX = useTransform(smoothY, [-0.5, 0.5], [3, -3]);
  const tiltY = useTransform(smoothX, [-0.5, 0.5], [-3, 3]);

  const onMouseMove = useCallback((e) => {
    if (!panelRef.current) return;
    const r = panelRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width - 0.5);
    mouseY.set((e.clientY - r.top) / r.height - 0.5);
  }, [mouseX, mouseY]);

  const handleLogin = async e => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email and password.'); setShakeKey(k => k + 1); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data.mfa_required) {
        setPendingToken(res.data.pending_token);
        setMfa(true); setLoading(false); return;
      }
      setAuth(res.data.token, res.data.user);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid credentials.');
      setShakeKey(k => k + 1);
      setLoading(false);
    }
  };

  const handleMfa = async e => {
    e.preventDefault();
    if (!mfaCode) { setError('Enter your 6-digit code.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/login/mfa', { pending_token: pendingToken, code: mfaCode });
      setAuth(res.data.token, res.data.user);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid code.');
      setShakeKey(k => k + 1);
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', background: DARK, overflow: 'hidden' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)}
          40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-shake { animation: shake 0.4s ease; }
        .login-spinner { animation: spin 0.7s linear infinite; }

        .login-panel { display: none; }
        @media (min-width: 860px) { .login-panel { display: flex !important; } }

        .login-field {
          width: 100%; box-sizing: border-box;
          background: rgba(240,235,227,0.04);
          border: 1px solid rgba(240,235,227,0.1);
          color: ${INK};
          font-family: ${SANS};
          font-size: 15px;
          padding: 13px 16px;
          border-radius: 8px;
          outline: none;
          transition: border-color 200ms ease, background 200ms ease, box-shadow 200ms ease;
          -webkit-font-smoothing: antialiased;
        }
        .login-field::placeholder { color: rgba(240,235,227,0.25); }
        .login-field:focus {
          border-color: rgba(204,120,92,0.6);
          background: rgba(204,120,92,0.04);
          box-shadow: 0 0 0 3px rgba(204,120,92,0.12);
        }
        .login-field.error {
          border-color: rgba(239,68,68,0.5);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
        }
        .sign-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: ${CORAL};
          color: #fff;
          font-family: ${SANS};
          font-size: 15px; font-weight: 600;
          padding: 13px 24px;
          border: none; border-radius: 8px;
          cursor: pointer; letter-spacing: 0.01em;
          transition: background 200ms ease, transform 140ms ease, box-shadow 200ms ease;
          -webkit-font-smoothing: antialiased;
        }
        .sign-btn:hover:not(:disabled) {
          background: #B8644A;
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(204,120,92,0.35);
        }
        .sign-btn:active:not(:disabled) { transform: scale(0.98); }
        .sign-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── LEFT ATMOSPHERIC PANEL ───────────────────────────────────────── */}
      <div
        ref={panelRef}
        className="login-panel"
        onMouseMove={onMouseMove}
        onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
        style={{
          flex: '0 0 52%', position: 'relative', overflow: 'hidden',
          background: '#100E0B', display: 'none',
        }}
      >
        {/* Grain texture */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: 0.035,
          backgroundImage: GRAIN, backgroundSize: '200px',
          pointerEvents: 'none', zIndex: 1,
        }}/>

        {/* Parallax bg layer 1 — large warm orb */}
        <motion.div aria-hidden style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(204,120,92,0.12) 0%, transparent 65%)',
          top: '50%', left: '50%', marginTop: -350, marginLeft: -350,
          pointerEvents: 'none', zIndex: 2,
          x: bg1X, y: bg1Y,
        }}/>

        {/* Parallax bg layer 2 — smaller teal accent */}
        <motion.div aria-hidden style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(204,120,92,0.07) 0%, transparent 70%)',
          bottom: '10%', right: '-5%',
          pointerEvents: 'none', zIndex: 2,
          x: bg2X, y: bg2Y,
        }}/>

        {/* Subtle grid lines */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 2, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(240,235,227,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(240,235,227,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}/>

        {/* Corner accent */}
        <div aria-hidden style={{
          position: 'absolute', bottom: 0, left: 0,
          width: 2, height: 80,
          background: `linear-gradient(to top, ${CORAL}, transparent)`,
          zIndex: 4,
        }}/>
        <div aria-hidden style={{
          position: 'absolute', bottom: 0, left: 0,
          width: 80, height: 2,
          background: `linear-gradient(to right, ${CORAL}, transparent)`,
          zIndex: 4,
        }}/>

        {/* Main content — 3D tilt */}
        <motion.div
          style={{
            position: 'absolute', inset: 0, zIndex: 5,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'flex-start',
            padding: 'clamp(48px,5vw,72px)',
            rotateX: tiltX, rotateY: tiltY,
            transformPerspective: 1200,
            transformStyle: 'preserve-3d',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: E }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <img
                src="/assets/brand/aegistrace-icon-transparent.png"
                alt="AegisTrace"
                style={{
                  width: 44, height: 44, objectFit: 'contain',
                  filter: `drop-shadow(0 0 12px rgba(204,120,92,0.5))`,
                }}
              />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: CORAL, letterSpacing: '0.18em' }}>AEGISTRACE</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(240,235,227,0.3)', letterSpacing: '0.14em', marginTop: 1 }}>ITDR PLATFORM</div>
              </div>
            </div>

            {/* Serif headline */}
            <h2 style={{
              fontFamily: SERIF, fontSize: 'clamp(32px,3.5vw,48px)',
              fontWeight: 400, color: INK, lineHeight: 1.15,
              margin: '0 0 24px', maxWidth: '14ch',
              textWrap: 'balance',
            }}>
              "The perimeter is{' '}
              <em style={{ fontStyle: 'italic', color: CORAL }}>whoever</em>
              {' '}you trust."
            </h2>

            <p style={{
              fontFamily: SANS, fontSize: 15, color: MUTED,
              lineHeight: 1.7, maxWidth: '38ch', margin: '0 0 40px',
            }}>
              Identity-first threat detection and response. Every credential, every agent, every automated action — accountable.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 32 }}>
              {[
                { n: '100%', label: 'Open Source' },
                { n: '15+',  label: 'Detectors' },
                { n: 'SOC2', label: 'Compliant' },
              ].map(({ n, label }) => (
                <div key={label}>
                  <div style={{ fontFamily: SERIF, fontSize: 22, color: INK, fontWeight: 400 }}>{n}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(240,235,227,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Floating orbital badge */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: 40, right: 40, zIndex: 6,
            background: 'rgba(204,120,92,0.1)',
            border: '1px solid rgba(204,120,92,0.25)',
            borderRadius: 50, padding: '8px 16px',
            fontFamily: MONO, fontSize: 10, color: CORAL,
            letterSpacing: '0.1em',
            backdropFilter: 'blur(10px)',
          }}
        >
          v11.0 · Production
        </motion.div>
      </div>

      {/* ── RIGHT FORM PANEL ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', overflowY: 'auto',
        background: 'linear-gradient(160deg, #1C1916 0%, #141210 100%)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: E }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {/* Back to site */}
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: MONO, fontSize: 11, color: 'rgba(240,235,227,0.35)',
            letterSpacing: '0.1em', textDecoration: 'none', marginBottom: 40,
            transition: 'color 180ms ease',
          }}
            onMouseEnter={e => e.target.style.color = CORAL}
            onMouseLeave={e => e.target.style.color = 'rgba(240,235,227,0.35)'}
          >
            <ArrowLeft size={12} weight="regular" /> BACK TO SITE
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(204,120,92,0.1)', border: '1px solid rgba(204,120,92,0.2)',
              borderRadius: 50, padding: '5px 14px', marginBottom: 20,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: CORAL, boxShadow: `0 0 6px ${CORAL}` }} />
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: CORAL, letterSpacing: '0.14em' }}>SECURE ACCESS</span>
            </div>
            <h1 style={{
              fontFamily: SERIF, fontSize: 'clamp(26px,4vw,34px)',
              fontWeight: 400, color: INK, lineHeight: 1.2, margin: 0,
            }}>
              {mfa ? 'Two-factor auth' : 'Welcome back'}
            </h1>
            <p style={{
              fontFamily: SANS, fontSize: 13.5, color: MUTED,
              marginTop: 8, lineHeight: 1.55,
            }}>
              {mfa ? 'Enter the 6-digit code from your authenticator app.' : 'Sign in to your AegisTrace workspace.'}
            </p>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            {!mfa ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: E }}
                onSubmit={handleLogin}
              >
                {/* Email */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(240,235,227,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className={`login-field${error ? ' error' : ''}`}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 24, position: 'relative' }}>
                  <label style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(240,235,227,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className={`login-field${error ? ' error' : ''}`}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(240,235,227,0.3)', padding: 4, display: 'flex',
                        transition: 'color 150ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = CORAL}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(240,235,227,0.3)'}
                    >
                      {showPw ? <EyeOff size={15} weight="regular"/> : <Eye size={15} weight="regular"/>}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key={shakeKey}
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="login-shake"
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                        fontFamily: SANS, fontSize: 13, color: '#F87171', lineHeight: 1.4,
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" className="sign-btn" disabled={loading}>
                  {loading
                    ? <span className="login-spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }}/>
                    : <><span>Sign in</span><ArrowRight size={16} weight="regular"/></>
                  }
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="mfa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: E }}
                onSubmit={handleMfa}
              >
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(240,235,227,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    className="login-field"
                    style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center' }}
                  />
                </div>
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key={shakeKey} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }} className="login-shake"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontFamily: SANS, fontSize: 13, color: '#F87171' }}
                    >{error}</motion.div>
                  )}
                </AnimatePresence>
                <button type="submit" className="sign-btn" disabled={loading}>
                  {loading
                    ? <span className="login-spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }}/>
                    : <><span>Verify</span><ArrowRight size={16} weight="regular"/></>
                  }
                </button>
                <button type="button" onClick={() => { setMfa(false); setError(''); }} style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: MUTED, fontFamily: SANS, fontSize: 13, cursor: 'pointer', padding: 8 }}>
                  ← Back
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid rgba(240,235,227,0.07)' }}>
            <p style={{ fontFamily: MONO, fontSize: 9.5, color: 'rgba(240,235,227,0.2)', textAlign: 'center', letterSpacing: '0.1em', lineHeight: 1.6 }}>
              AegisTrace ITDR · Built in Dublin, Ireland<br />
              <span style={{ color: 'rgba(240,235,227,0.12)' }}>Free & open source · Apache 2.0</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
