import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import useStore from '../store/useStore';
import LaserFlow from '../components/LaserFlow';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const E    = [0.23, 1, 0.32, 1];
const GOLD = '#F59E0B';
const BG   = '#050505';
const INK  = '#F5F0E8';

/* ════════════════════════════════════════════════════════════════════════════
   LOGIN  —  Premium split-screen
════════════════════════════════════════════════════════════════════════════ */
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

  const handleLogin = async e => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your username and password.'); setShakeKey(k => k + 1); return; }
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
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      background: BG, overflow: 'hidden',
    }}>
      <style>{`
        .login-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px; font-weight: 500;
          color: rgba(245,240,232,0.38);
          letter-spacing: 0.2em; text-transform: uppercase;
          display: block; margin-bottom: 9px;
        }
        .login-input {
          display: block; width: 100%; box-sizing: border-box;
          background: #0A0A18;
          border: 1px solid rgba(74,126,200,0.15);
          color: ${INK};
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 15px; font-weight: 500;
          padding: 13px 16px; outline: none;
          border-radius: 6px;
          -webkit-font-smoothing: antialiased;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .login-input::placeholder { color: rgba(245,240,232,0.22); }
        .login-input:focus {
          border-color: rgba(74,126,200,0.6);
          background: rgba(74,126,200,0.04);
          box-shadow: 0 0 0 1px #4A7EC8;
        }
        .login-input:hover:not(:focus) {
          border-color: rgba(74,126,200,0.25);
        }
        .login-input.has-error {
          border-color: rgba(248,113,113,0.45);
          box-shadow: 0 0 0 1px rgba(248,113,113,0.3);
        }

        .sign-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: #4A7EC8; color: #fff;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 15px; font-weight: 700;
          padding: 14px 24px; border: none; cursor: pointer;
          border-radius: 6px; letter-spacing: 0.01em;
          transition: background 200ms ease, transform 120ms ease, box-shadow 200ms ease;
          -webkit-font-smoothing: antialiased;
        }
        .sign-btn:hover:not(:disabled) {
          background: #3A6AB8;
          transform: translateY(-1px);
          box-shadow: 0 4px 24px rgba(74,126,200,0.3);
        }
        .sign-btn:active:not(:disabled) { transform: scale(0.98); }
        .sign-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes ken-burns {
          0%   { transform: scale(1.05); }
          100% { transform: scale(1.0); }
        }
        @keyframes spin-ring { to { transform: rotate(360deg); } }

        .login-left-panel { display: none; }
        @media (min-width: 900px) { .login-left-panel { display: block; } }

        @media (prefers-reduced-motion: reduce) {
          .login-bg-img { animation: none !important; }
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* ── LEFT PANEL: atmospheric 55% ──────────────────────────────────── */}
      <div className="login-left-panel" style={{
        flex: '0 0 55%', position: 'relative', overflow: 'hidden',
      }}>
        {/* LaserFlow animated beam background */}
        <LaserFlow />

        {/* Dark overlay */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(5,5,5,0.55) 0%, rgba(8,8,24,0.35) 60%, rgba(15,20,40,0.25) 100%)',
          zIndex: 1,
        }}/>

        {/* Blue accent line — left edge, vertically centered */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, top: '50%',
          width: 2, height: 60,
          background: '#4A7EC8',
          transform: 'translateY(-50%)',
          zIndex: 3,
          boxShadow: `0 0 16px rgba(74,126,200,0.5)`,
        }}/>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: E }}
          style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'flex-start',
            padding: 'clamp(48px,6vw,80px)',
          }}
        >
          {/* Aether Seal logo — icon in dark circle hides any background */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginBottom: 28 }}>
            <img
              src="/assets/brand/aegistrace-icon-transparent.png"
              alt="AegisTrace Aether Seal"
              style={{
                width: 120, height: 120, objectFit: 'contain',
                filter: 'drop-shadow(0 0 20px rgba(74,126,200,0.5)) drop-shadow(0 0 40px rgba(74,126,200,0.25))',
                marginBottom: 8,
              }}
            />
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: '#4A7EC8', letterSpacing: '0.24em' }}>AEGISTRACE · AETHER SEAL</div>
          </div>

          {/* Large quote */}
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(28px,3vw,38px)',
            fontWeight: 600,
            color: INK,
            lineHeight: 1.18,
            margin: '0 0 20px',
            letterSpacing: '-0.02em',
            textWrap: 'balance',
            maxWidth: '15ch',
          }}>
            "The perimeter is whoever you trust."
          </h2>

          {/* Subtitle */}
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 14,
            color: 'rgba(245,240,232,0.48)',
            margin: '0 0 36px',
            lineHeight: 1.55,
            maxWidth: '36ch',
          }}>
            Identity Threat Detection &amp; Response — built for practitioners.
          </p>

          {/* Micro-stats row */}
          <div style={{
            display: 'flex', gap: 0,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
          }}>
            {['21 detectors', '35 API routers', '4 PyPI tools'].map((stat, i) => (
              <React.Fragment key={stat}>
                <span style={{ color: 'rgba(245,240,232,0.35)' }}>{stat}</span>
                {i < 2 && (
                  <span style={{ color: 'rgba(74,126,200,0.5)', margin: '0 10px' }}>·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* Version badge — bottom left */}
        <div style={{
          position: 'absolute', bottom: 28, left: 'clamp(48px,6vw,80px)', zIndex: 3,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10.5, color: 'rgba(245,240,232,0.25)',
          letterSpacing: '0.1em',
        }}>
          v10.1
        </div>
      </div>

      {/* ── RIGHT PANEL: form 45% ────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(32px,5vw,64px) clamp(24px,4vw,56px)',
        position: 'relative',
        minHeight: '100vh',
      }}>
        {/* Subtle ambient glow */}
        <div aria-hidden style={{
          position: 'absolute', top: '30%', right: 0, width: '60%', height: '40%',
          background: 'radial-gradient(ellipse at right, rgba(74,126,200,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: E }}
          style={{ position: 'absolute', top: 28, left: 'clamp(24px,4vw,40px)' }}
        >
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 12, color: 'rgba(245,240,232,0.35)',
            textDecoration: 'none', letterSpacing: '0.04em',
            transition: 'color 140ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.35)')}
          >
            <ArrowLeft size={12}/> Back to site
          </Link>
        </motion.div>

        {/* Form container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: E }}
          style={{ width: '100%', maxWidth: 360 }}
        >
          <AnimatePresence mode="wait">
            {!mfa ? (
              <motion.div key="login"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.32, ease: E }}
              >
                {/* Heading */}
                <h1 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 28, fontWeight: 700,
                  color: INK, margin: '0 0 6px',
                  letterSpacing: '-0.02em',
                }}>
                  Sign in
                </h1>
                <p style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13, color: 'rgba(245,240,232,0.38)',
                  margin: '0 0 36px', lineHeight: 1.5,
                }}>
                  Access your investigation workspace.
                </p>

                <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Username field */}
                  <div>
                    <label className="login-label" htmlFor="login-email">Username</label>
                    <input
                      id="login-email"
                      className={`login-input${error ? ' has-error' : ''}`}
                      type="text"
                      autoComplete="username"
                      autoFocus
                      placeholder="admin"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <label className="login-label" htmlFor="login-password">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="login-password"
                        className={`login-input${error ? ' has-error' : ''}`}
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        style={{ paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute', right: 13, top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 0, color: 'rgba(245,240,232,0.28)',
                          transition: 'color 140ms', lineHeight: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.65)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.28)')}
                      >
                        {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        key={`err-${shakeKey}`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0, x: [0, -8, 8, -4, 4, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: E }}
                        style={{
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          fontSize: 12.5, color: '#F87171', lineHeight: 1.4,
                          marginTop: -6,
                        }}
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button type="submit" className="sign-btn" disabled={loading} style={{ marginTop: 4 }}>
                    {loading
                      ? <span style={{
                          display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.25)',
                          borderTopColor: '#fff',
                          animation: 'spin-ring 0.65s linear infinite',
                        }}/>
                      : <>Sign in <ArrowRight size={14}/></>
                    }
                  </button>
                </form>

                {/* Demo credentials hint */}
                <div style={{
                  marginTop: 28,
                  paddingTop: 20,
                  borderTop: '1px solid rgba(74,126,200,0.1)',
                }}>
                  <p style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11, color: 'rgba(245,240,232,0.22)',
                    margin: 0, lineHeight: 1.6,
                  }}>
                    Demo: admin / aegis2024
                  </p>
                </div>
              </motion.div>
            ) : (
              /* ── MFA FORM ──────────────────────────────────────────────── */
              <motion.div key="mfa"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.32, ease: E }}
              >
                <h1 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 28, fontWeight: 700,
                  color: INK, margin: '0 0 6px',
                  letterSpacing: '-0.02em',
                }}>
                  Two-factor auth
                </h1>
                <p style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 13, color: 'rgba(245,240,232,0.38)',
                  margin: '0 0 36px', lineHeight: 1.5,
                }}>
                  Enter the 6-digit code from your authenticator app.
                </p>

                <form onSubmit={handleMfa} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label className="login-label" htmlFor="mfa-code">Verification code</label>
                    <input
                      id="mfa-code"
                      className={`login-input${error ? ' has-error' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      autoFocus
                      value={mfaCode}
                      onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                      style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        key={`mfa-err-${shakeKey}`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0, x: [0, -8, 8, -4, 4, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: E }}
                        style={{
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          fontSize: 12.5, color: '#F87171', lineHeight: 1.4,
                          marginTop: -6,
                        }}
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="submit" className="sign-btn" disabled={loading} style={{ marginTop: 4 }}>
                    {loading
                      ? <span style={{
                          display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.25)',
                          borderTopColor: '#fff',
                          animation: 'spin-ring 0.65s linear infinite',
                        }}/>
                      : <>Verify <ArrowRight size={14}/></>
                    }
                  </button>
                </form>

                <button
                  onClick={() => { setMfa(false); setError(''); setMfaCode(''); }}
                  style={{
                    display: 'block', width: '100%', marginTop: 20,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 12, color: 'rgba(245,240,232,0.28)',
                    transition: 'color 140ms', textAlign: 'center', padding: '8px 0',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.28)')}
                >
                  Back to sign in
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer notice */}
        <div style={{
          position: 'absolute', bottom: 24,
          left: 'clamp(24px,4vw,40px)', right: 'clamp(24px,4vw,40px)',
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5, color: 'rgba(245,240,232,0.18)',
            letterSpacing: '0.05em',
          }}>
            Sessions device-fingerprinted · ITDR active
          </span>
        </div>
      </div>
    </div>
  );
}
