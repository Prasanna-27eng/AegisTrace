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

      ctx.fillStyle = '#070A12';
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
      vig.addColorStop(1, 'rgba(7,10,18,0.90)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={cvRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

/* ─── Login Form ─────────────────────────────────────────────────────────── */
export default function Login() {
  const [email, setEmail]   = useState('');
  const [password, setPw]   = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState('');
  const { setAuth }         = useStore();
  const navigate            = useNavigate();
  const mono                = { fontFamily: 'JetBrains Mono, monospace' };

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
      setAuth(res.data.token, res.data.user);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoad(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07080F', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Iris Scanner animation fills the whole background */}
      <IrisScanner />

      {/* Centre vignette so card reads clearly over the animation */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 48% 55% at 50% 50%, rgba(7,8,15,0.72) 0%, rgba(7,8,15,0.3) 50%, transparent 100%)',
      }} />

      {/* Login card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 390, padding: '0 20px' }}>

        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Logo size={44} showText={false} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#F0F0F8', marginBottom: 4 }}>
            AegisTrace
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(240,240,248,0.28)', letterSpacing: '0.18em', textTransform: 'uppercase', ...mono }}>
            Trust Operating System
          </div>
        </div>

        <div style={{
          background: 'rgba(8,12,22,0.92)',
          border: '1px solid rgba(77,163,255,0.13)',
          borderRadius: 14,
          padding: '30px 28px',
          backdropFilter: 'blur(28px)',
          boxShadow: '0 0 60px rgba(77,163,255,0.05), 0 24px 64px rgba(0,0,0,0.65)',
        }}>
          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(240,240,248,0.26)', ...mono, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Lock size={10} style={{ color: '#4DA3FF' }} />
            Analyst Secure Access
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 7, padding: '10px 12px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#EF4444' }}>
              <AlertCircle size={13} />{error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.67rem', color: 'rgba(240,240,248,0.36)', display: 'block', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase', ...mono }}>Email</label>
              <input type="email" className="at-input"
                placeholder="analyst@corp.io"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" autoFocus
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(77,163,255,0.13)' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.67rem', color: 'rgba(240,240,248,0.36)', display: 'block', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase', ...mono }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} className="at-input"
                  placeholder="••••••••"
                  value={password} onChange={e => setPw(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(77,163,255,0.13)' }} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,240,248,0.3)', cursor: 'pointer', padding: 4 }}>
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{
                background: loading ? 'rgba(77,163,255,0.45)' : '#4DA3FF',
                color: '#fff', border: 'none', borderRadius: 8, padding: '11px', marginTop: 4,
                fontSize: '0.82rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s', ...mono, letterSpacing: '0.06em',
              }}>
              {loading
                ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'lg-spin 0.8s linear infinite' }} /> Authenticating…</>
                : <>Sign In <ArrowRight size={13} /></>}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <a href="/" style={{ fontSize: '0.7rem', color: 'rgba(240,240,248,0.18)', textDecoration: 'none', ...mono, transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(240,240,248,0.55)'}
            onMouseLeave={e => e.target.style.color = 'rgba(240,240,248,0.18)'}>
            ← Back to landing
          </a>
        </div>
      </div>

      <style>{`@keyframes lg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
