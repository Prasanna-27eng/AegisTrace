import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Shield } from 'lucide-react';
import api from '../api/client';
import useStore from '../store/useStore';

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const E    = [0.16, 1, 0.3, 1];
const GOLD = '#F59E0B';

/* ════════════════════════════════════════════════════════════════════════════
   LOGIN  —  "Event Horizon"
   Full-bleed login bg, frosted glass card, mouse parallax, zero decoration
════════════════════════════════════════════════════════════════════════════ */
export default function Login() {
  const navigate  = useNavigate();
  const setAuth   = useStore(s => s.setAuth);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [mfa,          setMfa]          = useState(false);
  const [mfaCode,      setMfaCode]      = useState('');
  const [pendingToken, setPendingToken] = useState('');

  /* Parallax on mouse move */
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = e => {
      targetRef.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 22,
        y: (e.clientY / window.innerHeight - 0.5) * 16,
      };
    };
    const loop = () => {
      setOffset(prev => ({
        x: prev.x + (targetRef.current.x - prev.x) * 0.06,
        y: prev.y + (targetRef.current.y - prev.y) * 0.06,
      }));
      rafRef.current = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove);
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleLogin = async e => {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email and password.'); return; }
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
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#020202' }}>
      <style>{`
        .cd { font-family: 'Clash Display', sans-serif; }
        .cg { font-family: 'Cabinet Grotesk', sans-serif; }

        .at-field-new {
          display: flex; flex-direction: column; gap: 6px;
        }
        .at-label-new {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-size: 11px; font-weight: 600; color: rgba(245,240,232,0.45);
          letter-spacing: 0.08em; text-transform: uppercase;
        }
        .at-input-new {
          background: rgba(245,240,232,0.04);
          border: 1px solid rgba(245,240,232,0.1);
          color: #F5F0E8;
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 15px; font-weight: 500;
          padding: 13px 16px; outline: none; width: 100%;
          transition: border-color 160ms cubic-bezier(0.16,1,0.3,1),
                      background 160ms cubic-bezier(0.16,1,0.3,1),
                      box-shadow 160ms cubic-bezier(0.16,1,0.3,1);
          border-radius: 0;
          -webkit-font-smoothing: antialiased;
        }
        .at-input-new::placeholder { color: rgba(245,240,232,0.22); }
        .at-input-new:focus {
          border-color: ${GOLD};
          background: rgba(245,158,11,0.04);
          box-shadow: 0 0 0 3px rgba(245,158,11,0.08);
        }
        .at-input-new:hover:not(:focus) { border-color: rgba(245,240,232,0.22); }

        .submit-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: ${GOLD}; color: #000; font-weight: 700;
          font-family: 'Cabinet Grotesk', sans-serif; font-size: 14px;
          padding: 14px 24px; border: none; cursor: pointer; letter-spacing: 0.04em;
          transition: background 140ms cubic-bezier(0.16,1,0.3,1), transform 90ms;
          border-radius: 0;
        }
        .submit-btn:hover:not(:disabled)  { background: #FBBF24; }
        .submit-btn:active:not(:disabled) { transform: scale(0.97); }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        @keyframes shake {
          0%,100%{ transform: translateX(0); }
          20%    { transform: translateX(-6px); }
          40%    { transform: translateX(6px); }
          60%    { transform: translateX(-4px); }
          80%    { transform: translateX(4px); }
        }
        .shake { animation: shake 0.38s cubic-bezier(0.16,1,0.3,1); }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── BACKGROUND IMAGE with parallax ─────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-30px',
          backgroundImage: `url('/assets/pages/login-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `translate(${offset.x * -0.5}px, ${offset.y * -0.5}px) scale(1.08)`,
          willChange: 'transform',
        }}
      />

      {/* Dark overlays */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(2,2,2,0.72)' }}/>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(2,2,2,0.6) 100%)' }}/>
      {/* Amber bloom centre */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 30% at 50% 50%, rgba(245,158,11,0.06) 0%, transparent 60%)' }}/>

      {/* ── BACK LINK ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: E }}
        style={{ position: 'absolute', top: 28, left: 32, zIndex: 20 }}
      >
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 12, color: 'rgba(245,240,232,0.45)', textDecoration: 'none', letterSpacing: '0.04em', transition: 'color 140ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.8)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.45)')}
        >
          <ArrowLeft size={13}/> Back to site
        </Link>
      </motion.div>

      {/* ── CARD ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          transition={{ duration: 0.65, ease: E }}
          style={{
            width: '100%', maxWidth: 400,
            background: 'rgba(8,7,8,0.82)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid rgba(245,240,232,0.1)',
            padding: 'clamp(32px,5vw,48px)',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <div style={{ width: 32, height: 32, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} color={GOLD}/>
            </div>
            <div>
              <div className="cd" style={{ fontSize: 14, fontWeight: 700, color: '#F5F0E8', letterSpacing: '0.08em', lineHeight: 1 }}>AEGISTRACE</div>
              <div className="cg" style={{ fontSize: 10, color: 'rgba(245,240,232,0.35)', marginTop: 2, letterSpacing: '0.06em' }}>Security Operations Platform</div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!mfa ? (
              /* ── LOGIN FORM ────────────────────────────────────────── */
              <motion.div key="login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x:   0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.38, ease: E }}
              >
                <h1 className="cd" style={{ fontSize: 26, fontWeight: 700, color: '#F5F0E8', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Sign in
                </h1>
                <p className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', margin: '0 0 32px', lineHeight: 1.5 }}>
                  Access your investigation workspace.
                </p>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Email */}
                  <div className="at-field-new">
                    <label className="at-label-new">Email</label>
                    <input
                      className="at-input-new"
                      type="email" autoComplete="email" autoFocus
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                    />
                  </div>

                  {/* Password */}
                  <div className="at-field-new">
                    <label className="at-label-new">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="at-input-new"
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
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(245,240,232,0.35)', transition: 'color 140ms', lineHeight: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.7)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.35)')}
                      >
                        {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        className={`cg shake`}
                        key="err"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.28, ease: E }}
                        style={{ margin: 0, fontSize: 12, color: '#F87171', lineHeight: 1.5 }}
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
                    {loading
                      ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.7s linear infinite' }}/>
                      : <>Sign in <ArrowRight size={15}/></>
                    }
                  </button>
                </form>

                {/* Demo link */}
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <Link to="/" className="cg" style={{ fontSize: 12, color: 'rgba(245,240,232,0.28)', textDecoration: 'none', transition: 'color 140ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.28)')}
                  >
                    Don't have access? Request a demo
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* ── MFA FORM ──────────────────────────────────────────── */
              <motion.div key="mfa"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0  }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.38, ease: E }}
              >
                <h1 className="cd" style={{ fontSize: 26, fontWeight: 700, color: '#F5F0E8', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Two-factor auth
                </h1>
                <p className="cg" style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', margin: '0 0 32px', lineHeight: 1.5 }}>
                  Enter the 6-digit code from your authenticator app.
                </p>

                <form onSubmit={handleMfa} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div className="at-field-new">
                    <label className="at-label-new">Verification Code</label>
                    <input
                      className="at-input-new"
                      type="text" inputMode="numeric" maxLength={6}
                      placeholder="000000" autoFocus
                      value={mfaCode}
                      onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                      style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p className="cg shake" key="err2"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ margin: 0, fontSize: 12, color: '#F87171' }}
                      >{error}</motion.p>
                    )}
                  </AnimatePresence>

                  <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
                    {loading
                      ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.7s linear infinite' }}/>
                      : <>Verify <ArrowRight size={15}/></>
                    }
                  </button>
                </form>

                <button onClick={() => { setMfa(false); setError(''); }} className="cg"
                  style={{ display: 'block', width: '100%', marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(245,240,232,0.3)', transition: 'color 140ms', textAlign: 'center', padding: '8px 0' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,240,232,0.3)')}
                >
                  Back to sign in
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── BOTTOM BRAND LINE ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        style={{ position: 'absolute', bottom: 28, left: 0, right: 0, textAlign: 'center', zIndex: 10 }}
      >
        <span className="cg" style={{ fontSize: 11, color: 'rgba(245,240,232,0.18)', letterSpacing: '0.1em' }}>
          AegisTrace · Secure Operations Platform · 2026
        </span>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
