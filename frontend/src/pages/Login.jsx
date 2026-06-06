import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';
import useStore from '../store/useStore';

/* ═══════════════════════════════════════════════════════════════════════════
   IRIS SCANNER
   ────────────
   Biometric authentication rendered as a living canvas.

   · Faint hex grid tiles the background — structural, not decorative.
   · Four counter-rotating iris petal layers create a living starburst.
   · Outer dial ring with 72 tick marks slowly drifts clockwise.
   · Three cipher-text rings orbit at different radii + speeds:
       inner  → hex opcodes  (CW)
       middle → algorithm IDs (CCW)
       outer  → status tokens (CW)
   · A horizontal scan beam sweeps top-to-bottom, clipped to the iris.
   · Corner targeting brackets frame the iris.
   · Every ~10 s: "● BIOMETRIC VERIFIED" flashes green + a ring pulse fires.
═══════════════════════════════════════════════════════════════════════════ */

function IrisScanner() {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, raf, t = 0, last = 0;
    let scanY = 0, scanDir = 1;
    let verifiedFlash = 0;
    let verifiedCD = 9000 + Math.random() * 5000;
    const pulses = [];

    function resize() {
      W = cv.offsetWidth;
      H = cv.offsetHeight;
      cv.width = W;
      cv.height = H;
      scanY = 0;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // ── Cipher ring data ─────────────────────────────────────────────────
    const RINGS = [
      {
        tokens: ['0x3F','0x7A','RSA','0x2B','HMAC','0x91','0x4E','TLS','0xAB','0x5C','0xFF','AES'],
        speed: 0.000185, dir:  1, alpha: 0.24, rMul: 1.22,
      },
      {
        tokens: ['SHA-256','VERIFY','AES-GCM','JWT','CERT','ECDSA','0x0F','4DA3FF','0xCC','0x11'],
        speed: 0.000125, dir: -1, alpha: 0.16, rMul: 1.48,
      },
      {
        tokens: ['ACCESS','GRANTED','FIREWALL','SCAN','0x1A','AUTH','0xBB','SECURE','ZONE','CTRL'],
        speed: 0.000085, dir:  1, alpha: 0.09, rMul: 1.74,
      },
    ];

    // ── Iris petal layers ────────────────────────────────────────────────
    const LAYERS = [
      { count: 34, inner: 0.31, outer: 0.73, speed: 0.000215, dir:  1, alpha: 0.38, lw: 0.9 },
      { count: 26, inner: 0.23, outer: 0.59, speed: 0.000175, dir: -1, alpha: 0.28, lw: 0.7 },
      { count: 18, inner: 0.14, outer: 0.44, speed: 0.000130, dir:  1, alpha: 0.20, lw: 0.6 },
      { count: 12, inner: 0.07, outer: 0.27, speed: 0.000095, dir: -1, alpha: 0.14, lw: 0.5 },
    ];

    function frame(ts) {
      const dt = Math.min(ts - last, 40);
      last = ts;
      t += dt;

      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.36;

      // ── Hex grid background ──────────────────────────────────────────
      const HS = 30;
      const HW = HS * 1.5, HH = HS * Math.sqrt(3);
      ctx.strokeStyle = 'rgba(77,163,255,0.032)';
      ctx.lineWidth = 0.5;
      const cols = Math.ceil(W / HW) + 3, rows = Math.ceil(H / HH) + 3;
      for (let c = -1; c < cols; c++) {
        for (let r = -1; r < rows; r++) {
          const hx = c * HW - HS;
          const hy = r * HH + (c % 2 === 0 ? 0 : HH / 2) - HS;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI / 3) - Math.PI / 6;
            const px = hx + (HS - 1) * Math.cos(a);
            const py = hy + (HS - 1) * Math.sin(a);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }

      // ── Cipher text rings ─────────────────────────────────────────────
      RINGS.forEach(ring => {
        const ringR = R * ring.rMul;
        const rot = t * ring.speed * ring.dir;
        ctx.font = '7.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const step = (Math.PI * 2) / ring.tokens.length;
        ring.tokens.forEach((tok, i) => {
          const a = i * step + rot;
          const tx2 = cx + Math.cos(a) * ringR;
          const ty2 = cy + Math.sin(a) * ringR;
          ctx.save();
          ctx.translate(tx2, ty2);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = `rgba(77,163,255,${ring.alpha})`;
          ctx.fillText(tok, 0, 0);
          ctx.restore();
        });
        // Ring circle
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(77,163,255,${ring.alpha * 0.45})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      });

      // ── Outer dial ring (tick marks) ──────────────────────────────────
      const dialRot = t * 0.000072;
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2 + dialRot;
        const major = i % 6 === 0;
        const r1 = R * 0.985, r2 = R * (major ? 0.908 : 0.945);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.strokeStyle = `rgba(77,163,255,${major ? 0.62 : 0.25})`;
        ctx.lineWidth = major ? 1.3 : 0.65; ctx.stroke();
      }
      // Outer rim circle
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(77,163,255,0.55)';
      ctx.lineWidth = 1.6; ctx.stroke();

      // ── Iris petal layers ─────────────────────────────────────────────
      LAYERS.forEach(layer => {
        const rot = t * layer.speed * layer.dir;
        const spread = (Math.PI / layer.count) * 0.55;
        for (let i = 0; i < layer.count; i++) {
          const a = (i / layer.count) * Math.PI * 2 + rot;
          const rIn = R * layer.inner, rOut = R * layer.outer;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a - spread) * rIn, cy + Math.sin(a - spread) * rIn);
          ctx.lineTo(cx + Math.cos(a) * rOut,         cy + Math.sin(a) * rOut);
          ctx.lineTo(cx + Math.cos(a + spread) * rIn, cy + Math.sin(a + spread) * rIn);
          ctx.strokeStyle = `rgba(77,163,255,${layer.alpha})`;
          ctx.lineWidth = layer.lw; ctx.stroke();
        }
      });

      // ── Inner limbal ring ─────────────────────────────────────────────
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(77,163,255,0.45)';
      ctx.lineWidth = 1.0; ctx.stroke();

      // ── Scan beam (clipped to iris) ───────────────────────────────────
      scanY += scanDir * dt * 0.16;
      if (scanY > R * 2 + 4) scanDir = -1;
      if (scanY < -4)         scanDir =  1;
      const scanAbsY = cy - R + scanY;

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.985, 0, Math.PI * 2); ctx.clip();
      // Glow band
      const sg = ctx.createLinearGradient(0, scanAbsY - 22, 0, scanAbsY + 22);
      sg.addColorStop(0, 'transparent');
      sg.addColorStop(0.5, 'rgba(77,163,255,0.14)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg; ctx.fillRect(cx - R, scanAbsY - 22, R * 2, 44);
      // Bright line
      ctx.beginPath(); ctx.moveTo(cx - R, scanAbsY); ctx.lineTo(cx + R, scanAbsY);
      ctx.strokeStyle = 'rgba(77,163,255,0.60)'; ctx.lineWidth = 1.0; ctx.stroke();
      ctx.restore();

      // ── Pupil glow ────────────────────────────────────────────────────
      const pupR = R * 0.135;
      const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pupR * 2.6);
      pg.addColorStop(0, 'rgba(77,163,255,0.92)');
      pg.addColorStop(0.38, 'rgba(77,163,255,0.26)');
      pg.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, pupR * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = pg; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, pupR, 0, Math.PI * 2);
      ctx.fillStyle = '#4DA3FF'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, pupR * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();

      // ── Targeting brackets ────────────────────────────────────────────
      const bLen = 20, bAlpha = 0.42;
      const corners = [
        [cx - R * 0.68, cy - R * 0.68, 1, 1],
        [cx + R * 0.68, cy - R * 0.68, -1, 1],
        [cx + R * 0.68, cy + R * 0.68, -1, -1],
        [cx - R * 0.68, cy + R * 0.68, 1, -1],
      ];
      ctx.strokeStyle = `rgba(77,163,255,${bAlpha})`;
      ctx.lineWidth = 1.6;
      corners.forEach(([bx, by, dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dx * bLen, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + dy * bLen); ctx.stroke();
      });

      // ── Pulse rings ───────────────────────────────────────────────────
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].r  += 0.048 * dt;
        pulses[i].op -= 0.0018 * dt;
        if (pulses[i].op <= 0) { pulses.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(cx, cy, pulses[i].r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${pulses[i].green ? '34,197,94' : '77,163,255'},${pulses[i].op})`;
        ctx.lineWidth = 1.2; ctx.stroke();
      }

      // ── Verified flash ────────────────────────────────────────────────
      verifiedCD -= dt;
      if (verifiedCD <= 0) {
        verifiedFlash = 1600;
        verifiedCD = 9500 + Math.random() * 7000;
        pulses.push({ r: R * 0.96, op: 0.75, green: true });
      }
      if (verifiedFlash > 0) {
        verifiedFlash -= dt;
        const progress = verifiedFlash / 1600;
        const vAlpha   = Math.min(1, (1 - Math.abs(progress - 0.5) * 2) + 0.25);
        ctx.font = '8.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(34,197,94,${vAlpha * 0.88})`;
        ctx.fillText('● BIOMETRIC VERIFIED', cx, cy + R + 24);
      }

      // ── Radial vignette ───────────────────────────────────────────────
      const vig = ctx.createRadialGradient(cx, cy, R * 0.45, cx, cy, Math.max(W, H) * 0.72);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(8,8,8,0.90)');
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

      {/* Iris Scanner — the main atmosphere */}
      <IrisScanner />

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
