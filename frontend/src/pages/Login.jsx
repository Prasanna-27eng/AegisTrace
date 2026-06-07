import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';
import useStore from '../store/useStore';

/* ═══════════════════════════════════════════════════════════════════════════
   CIPHER LOCK
   ───────────
   Four concentric cipher rings rotating in alternating directions,
   each carrying security tokens. A central pulsing lock core.
   Pure monochrome — white on absolute black.
═══════════════════════════════════════════════════════════════════════════ */

function CipherLock() {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, raf;

    const RINGS = [
      { rMul:0.20, speed:0.00022, dir: 1,  tokens:['SHA','AES','RSA','0x3F','JWT','TLS','0xB8','HMAC','ECB','GCM','0xA2','SIG'],  thick:1.0, tokenAlpha:0.65, ringAlpha:0.35 },
      { rMul:0.30, speed:0.00016, dir:-1,  tokens:['VERIFY','CERT','TOKEN','SEAL','LOCK','AUTH','SIGN','HASH','NONCE','SALT','IV','0xD4'], thick:0.75, tokenAlpha:0.45, ringAlpha:0.22 },
      { rMul:0.40, speed:0.00010, dir: 1,  tokens:['ACCESS','DENIED','GUARD','POLICY','TRUST','TRACE','SCOPE','CLAIM','ROLE','MASK','BIND','CTRL'], thick:0.6, tokenAlpha:0.28, ringAlpha:0.14 },
      { rMul:0.50, speed:0.00006, dir:-1,  tokens:['AEGISTRACE','IDENTITY','CONTROL','PLANE','PROVENANCE','TRUST','ENGINE','DETECT','RESPOND','MONITOR','ISOLATE','ENFORCE'], thick:0.45, tokenAlpha:0.14, ringAlpha:0.08 },
    ];

    function resize() {
      W = cv.offsetWidth; H = cv.offsetHeight;
      cv.width = W; cv.height = H;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    function frame(ts) {
      const cx = W / 2, cy = H / 2;
      const base = Math.min(W, H);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      // Subtle dot grid
      ctx.fillStyle = 'rgba(255,255,255,0.022)';
      for (let gx = 36; gx < W; gx += 36)
        for (let gy = 36; gy < H; gy += 36) {
          ctx.beginPath(); ctx.arc(gx, gy, 0.7, 0, Math.PI * 2); ctx.fill();
        }

      RINGS.forEach(ring => {
        const R   = base * ring.rMul;
        const rot = ts * ring.speed * ring.dir;

        // Ring line
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${ring.ringAlpha})`;
        ctx.lineWidth = ring.thick;
        ctx.stroke();

        // Tick marks
        const ticks = ring.tokens.length * 4;
        for (let i = 0; i < ticks; i++) {
          const a = (i / ticks) * Math.PI * 2 + rot;
          const major = i % 4 === 0;
          const r1 = R - (major ? 5 : 2.5);
          const r2 = R + (major ? 5 : 2.5);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          ctx.strokeStyle = `rgba(255,255,255,${major ? ring.ringAlpha * 0.9 : ring.ringAlpha * 0.35})`;
          ctx.lineWidth = major ? ring.thick : ring.thick * 0.5;
          ctx.stroke();
        }

        // Token labels
        const fontSize = Math.max(7, base * 0.016);
        ctx.font = `${fontSize}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const step = (Math.PI * 2) / ring.tokens.length;
        ring.tokens.forEach((tok, i) => {
          const a = i * step + rot;
          ctx.save();
          ctx.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = `rgba(255,255,255,${ring.tokenAlpha})`;
          ctx.fillText(tok, 0, 0);
          ctx.restore();
        });
      });

      // Central lock core — pulsing glow
      const pulse  = 0.72 + 0.28 * Math.sin(ts * 0.0008);
      const coreR  = base * 0.032;

      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4);
      grd.addColorStop(0,   `rgba(255,255,255,${0.22 * pulse})`);
      grd.addColorStop(0.5, `rgba(255,255,255,${0.07 * pulse})`);
      grd.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 4, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      // Core ring
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * pulse})`;
      ctx.lineWidth = 1.2; ctx.stroke();

      // Core dot
      ctx.beginPath(); ctx.arc(cx, cy, coreR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${pulse})`; ctx.fill();

      // Vignette
      const vig = ctx.createRadialGradient(cx, cy, base * 0.28, cx, cy, Math.max(W, H) * 0.78);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={cvRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

/* ─── Hex Matrix Background ─────────────────────────────────────────────── */
// Generated ONCE on module load — never flickering
const HEX_CELLS = Array.from({ length: 192 }, () =>
  Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
);

function HexMatrix({ rippleRef }) {
  return (
    <div ref={rippleRef} style={{
      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)',
      gap: 0, padding: '20px', overflow: 'hidden',
    }}>
      {HEX_CELLS.map((h, i) => (
        <span key={i} data-hex={i} style={{
          fontSize: '10px', color: '#111111',
          fontFamily: 'JetBrains Mono, monospace',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '4px 0', userSelect: 'none', transition: 'color 0.4s, opacity 0.4s',
        }}>{h}</span>
      ))}
    </div>
  );
}

/* ─── Login Form ─────────────────────────────────────────────────────────── */
export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPw]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoad]      = useState(false);
  const [error, setError]       = useState('');
  // MFA step
  const [mfaRequired, setMfa]   = useState(false);
  const [pendingToken, setPend]  = useState('');
  const [mfaCode, setMfaCode]   = useState('');
  // Void Core
  const [collapsing, setCollapse] = useState(false);
  const hexRef    = useRef(null);
  const cardRef   = useRef(null);
  const pendingNav = useRef(null);

  const { setAuth }  = useStore();
  const navigate     = useNavigate();
  const mono         = { fontFamily: 'JetBrains Mono, monospace' };

  /* ── Keypress hex ripple ─────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = () => {
      if (!hexRef.current) return;
      const cells = hexRef.current.querySelectorAll('span[data-hex]');
      const total = cells.length;
      // Pick 8–14 random cells and pulse them
      const count = 8 + Math.floor(Math.random() * 7);
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * total);
        const el = cells[idx];
        if (!el) continue;
        el.style.color = '#FFFFFF';
        el.style.opacity = '0.55';
        setTimeout(() => {
          if (el) { el.style.color = '#111111'; el.style.opacity = '1'; }
        }, 480 + Math.random() * 220);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Horizon collapse helper ─────────────────────────────────────────── */
  const collapseAndNavigate = (token, user) => {
    setAuth(token, user);
    if (cardRef.current) {
      setCollapse(true);
      setTimeout(() => navigate('/app/dashboard'), 720);
    } else {
      navigate('/app/dashboard');
    }
  };

  /* ── Step 1: password login ──────────────────────────────────────────── */
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password required'); return; }
    setLoad(true);
    try {
      const res = await api.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      if (res.data.mfa_required) {
        setPend(res.data.pending_token);
        setMfa(true);
        setLoad(false);
      } else if (res.data.mfa_setup_required) {
        // Admin without 2FA — log in and redirect to MFA setup
        collapseAndNavigate(res.data.token, res.data.user);
        navigate('/app/admin');
      } else {
        collapseAndNavigate(res.data.token, res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
      setLoad(false);
    }
  };

  /* ── Step 2: TOTP verification ───────────────────────────────────────── */
  const submitMfa = async (e) => {
    e.preventDefault();
    setError('');
    const clean = mfaCode.replace(/\s/g, '');
    if (clean.length !== 6) { setError('Enter the 6-digit code from your authenticator'); return; }
    setLoad(true);
    try {
      const res = await api.post('/api/auth/login/mfa', {
        pending_token: pendingToken,
        code: clean,
      });
      collapseAndNavigate(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code. Try again.');
      setLoad(false);
    }
  };

  /* ── Styles ──────────────────────────────────────────────────────────── */
  const inputStyle = {
    background: '#000000', border: '1px solid #1A1A1A',
    borderRadius: 0, color: '#FFFFFF',
    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem',
    padding: '11px 12px', width: '100%', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.25s cubic-bezier(0.16,1,0.3,1)',
  };
  const lblStyle = {
    display: 'block', fontSize: '0.6rem', color: '#555555',
    letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, ...mono,
  };
  const btnStyle = (active) => ({
    width: '100%', background: active ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
    color: '#000000', border: 'none', padding: '13px',
    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', cursor: active ? 'pointer' : 'not-allowed',
    marginTop: 8, fontFamily: 'JetBrains Mono, monospace',
    transition: 'opacity 0.2s',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Cipher Lock — the main atmosphere */}
      <CipherLock />

      {/* Hex Matrix — static, keypress-ripple capable */}
      <HexMatrix rippleRef={hexRef} />

      {/* Deep centre vignette so card reads cleanly */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 52% 58% at 50% 50%, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)',
      }} />

      {/* Card — horizon collapse target */}
      <div ref={cardRef} className={collapsing ? 'void-collapse' : ''}
        style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 360, padding: '0 20px' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.28em', color: '#555555', ...mono, marginBottom: 6 }}>
            AEGISTRACE // CORE v5.1
          </div>
          <div className="void-compile" style={{ fontSize: '1.05rem', fontWeight: 300, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
            analyst gateway
          </div>
        </div>

        {/* ── Vault panel ── */}
        <div style={{
          background: 'rgba(5,5,5,0.94)',
          border: '1px solid #111111',
          padding: '32px 28px',
          backdropFilter: 'blur(32px)',
        }}>
          {/* ── MFA step ── */}
          {mfaRequired ? (
            <>
              <div style={{ fontSize: '0.6rem', color: '#555555', letterSpacing: '0.14em', textTransform: 'uppercase', ...mono, marginBottom: 24, textAlign: 'center' }}>
                TWO-FACTOR VERIFICATION
              </div>
              {error && (
                <div style={{ fontSize: '0.72rem', color: '#FF3333', marginBottom: 16, ...mono, borderLeft: '2px solid #FF3333', paddingLeft: 10 }}>
                  {error}
                </div>
              )}
              <form onSubmit={submitMfa} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lblStyle}>Authenticator Code</label>
                  <input className="at-input" type="text" inputMode="numeric" maxLength={7}
                    placeholder="000 000" autoFocus value={mfaCode}
                    onChange={e => setMfaCode(e.target.value)}
                    style={{ ...inputStyle, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em' }}
                    onFocus={e => e.target.style.borderColor = '#333333'}
                    onBlur={e => e.target.style.borderColor = '#1A1A1A'} />
                </div>
                <button type="submit" style={btnStyle(!loading)}>
                  {loading ? 'VERIFYING…' : 'VERIFY IDENTITY'}
                </button>
              </form>
              <button onClick={() => { setMfa(false); setPend(''); setMfaCode(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#333333', cursor: 'pointer', fontSize: '0.62rem', ...mono, display: 'block', margin: '16px auto 0', letterSpacing: '0.1em' }}>
                ← BACK
              </button>
            </>
          ) : (
            /* ── Password step ── */
            <>
              <div style={{ fontSize: '0.6rem', color: '#555555', letterSpacing: '0.14em', textTransform: 'uppercase', ...mono, marginBottom: 24 }}>
                ANALYST ID + PASSPHRASE
              </div>
              {error && (
                <div style={{ fontSize: '0.72rem', color: '#FF3333', marginBottom: 16, ...mono, borderLeft: '2px solid #FF3333', paddingLeft: 10 }}>
                  {error}
                </div>
              )}
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lblStyle}>Analyst ID</label>
                  <input type="email" placeholder="analyst@corp.io" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#333333'}
                    onBlur={e => e.target.style.borderColor = '#1A1A1A'} />
                </div>
                <div>
                  <label style={lblStyle}>Signature Passphrase</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                      value={password} onChange={e => setPw(e.target.value)}
                      autoComplete="current-password"
                      style={{ ...inputStyle, paddingRight: 40 }}
                      onFocus={e => e.target.style.borderColor = '#333333'}
                      onBlur={e => e.target.style.borderColor = '#1A1A1A'} />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#444444', cursor: 'pointer', padding: 4 }}>
                      {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
                <button type="submit" style={btnStyle(!loading)}>
                  {loading ? 'AUTHENTICATING…' : 'AUTHENTICATE'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ fontSize: '0.6rem', color: '#333333', textDecoration: 'none', ...mono, letterSpacing: '0.1em', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#888888'}
            onMouseLeave={e => e.target.style.color = '#333333'}>
            ← RETURN TO BASE
          </a>
        </div>
      </div>

      <style>{`@keyframes lg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
