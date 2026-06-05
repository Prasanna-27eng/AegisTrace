import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';
import useStore from '../store/useStore';

/* ─── Signal Monitor ──────────────────────────────────────────────────────────
   Five live security telemetry channels scrolling in real time.
   PROC · NET · AUTH · FILE · DNS — each shows a calm baseline that spikes
   red during simulated alert events. Like watching a real SOC console.
   Completely different from any particle / orbital animation.
───────────────────────────────────────────────────────────────────────────── */

const CH = [
  { label: 'PROC', r: 77,  g: 163, b: 255, f1: 1.8, f2: 4.7,  f3: 9.2,  ph: 0.0  },
  { label: 'NET',  r: 34,  g: 197, b: 94,  f1: 2.3, f2: 5.9,  f3: 11.4, ph: 1.4  },
  { label: 'AUTH', r: 167, g: 139, b: 250, f1: 1.5, f2: 3.8,  f3: 8.6,  ph: 2.8  },
  { label: 'FILE', r: 234, g: 179, b: 8,   f1: 2.1, f2: 4.9,  f3: 10.1, ph: 0.7  },
  { label: 'DNS',  r: 6,   g: 182, b: 212, f1: 2.7, f2: 6.3,  f3: 12.5, ph: 2.1  },
];

function SignalMonitor() {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, raf;

    function resize() { W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W; cv.height = H; }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const MAX_S = 1800;
    const LBL = 52; // label column width

    const state = CH.map(ch => ({
      ...ch,
      buf: [],
      alert: 0,
      nextAlert: 2500 + Math.random() * 7000,
    }));

    function sample(ch, t, al) {
      return (
        0.11 * Math.sin(t * ch.f1 + ch.ph) +
        0.065 * Math.sin(t * ch.f2 + ch.ph * 1.4) +
        0.032 * Math.sin(t * ch.f3 + ch.ph * 0.7) +
        0.010 * (Math.random() - 0.5) +
        (al > 0.3 ? (Math.random() - 0.5) * al * 1.9 : 0)
      );
    }

    let t = 0, last = 0;

    function frame(ts) {
      const dt = Math.min(ts - last, 40);
      last = ts; t += dt * 0.001;

      ctx.fillStyle = '#07080F';
      ctx.fillRect(0, 0, W, H);

      const chH = H / state.length;

      state.forEach((ch, i) => {
        // Update alert state
        ch.nextAlert -= dt;
        if (ch.nextAlert <= 0) { ch.alert = 1; ch.nextAlert = 5000 + Math.random() * 9000; }
        if (ch.alert > 0) ch.alert = Math.max(0, ch.alert - dt * 0.0014);

        // Push ~2 samples per frame → smooth leftward scroll
        for (let s = 0; s < 2; s++) { ch.buf.push(sample(ch, t + s * 0.001, ch.alert)); }
        if (ch.buf.length > MAX_S) ch.buf.splice(0, ch.buf.length - MAX_S);

        const cy  = (i + 0.5) * chH;
        const amp = chH * 0.33;
        const dW  = W - LBL;
        const isAl = ch.alert > 0.26;
        const r = isAl ? 239 : ch.r, g = isAl ? 68 : ch.g, b = isAl ? 68 : ch.b;
        const startI = Math.max(0, ch.buf.length - dW);

        // ── Divider ──────────────────────────────────────────────────────
        if (i > 0) {
          ctx.beginPath(); ctx.moveTo(0, i * chH); ctx.lineTo(W, i * chH);
          ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.stroke();
        }

        // ── Label column ─────────────────────────────────────────────────
        ctx.fillStyle = `rgba(${r},${g},${b},0.045)`;
        ctx.fillRect(0, i * chH, LBL, chH);

        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(${r},${g},${b},${0.42 + ch.alert * 0.58})`;
        ctx.fillText(ch.label, LBL / 2, cy + 3);

        // Status dot
        ctx.beginPath();
        ctx.arc(LBL - 8, cy, isAl ? 3.5 : 2.2, 0, Math.PI * 2);
        ctx.fillStyle = isAl
          ? `rgba(239,68,68,${0.55 + ch.alert * 0.45})`
          : `rgba(${ch.r},${ch.g},${ch.b},0.38)`;
        ctx.fill();

        // ── Baseline ─────────────────────────────────────────────────────
        ctx.beginPath(); ctx.moveTo(LBL, cy); ctx.lineTo(W, cy);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.07)`; ctx.lineWidth = 0.5; ctx.stroke();

        // ── Waveform fill (area, very faint) ─────────────────────────────
        if (ch.buf.length > 1) {
          ctx.beginPath();
          let drawn = 0;
          for (let x = 0; x < dW; x++) {
            const si = startI + x;
            if (si >= ch.buf.length) break;
            const px = LBL + x, py = cy - ch.buf[si] * amp;
            if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            drawn = x;
          }
          ctx.lineTo(LBL + drawn, cy);
          ctx.lineTo(LBL, cy);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${b},${isAl ? 0.07 : 0.04})`;
          ctx.fill();
        }

        // ── Waveform line ─────────────────────────────────────────────────
        ctx.beginPath();
        for (let x = 0; x < dW; x++) {
          const si = startI + x;
          if (si >= ch.buf.length) break;
          const px = LBL + x, py = cy - ch.buf[si] * amp;
          if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.48 + ch.alert * 0.48})`;
        ctx.lineWidth = isAl ? 1.35 : 0.85; ctx.stroke();

        // Alert glow pass
        if (ch.alert > 0.1) {
          ctx.beginPath();
          for (let x = 0; x < dW; x++) {
            const si = startI + x;
            if (si >= ch.buf.length) break;
            const px = LBL + x, py = cy - ch.buf[si] * amp;
            if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = `rgba(${r},${g},${b},${ch.alert * 0.2})`;
          ctx.lineWidth = 6; ctx.stroke();
        }
      });

      // "Now" right edge line
      ctx.beginPath(); ctx.moveTo(W - 1, 0); ctx.lineTo(W - 1, H);
      ctx.strokeStyle = 'rgba(77,163,255,0.11)'; ctx.lineWidth = 1; ctx.stroke();

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

      {/* Live signal monitor animation fills the whole background */}
      <SignalMonitor />

      {/* Centre vignette — keeps form legible over moving channels */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 52% 60% at 50% 50%, rgba(7,8,15,0.78) 0%, rgba(7,8,15,0.45) 45%, rgba(7,8,15,0.1) 100%)',
      }} />

      {/* Login card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 390, padding: '0 20px' }}>

        {/* Brand */}
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

        {/* Card */}
        <div style={{
          background: 'rgba(10,14,26,0.9)',
          border: '1px solid rgba(77,163,255,0.12)',
          borderRadius: 14,
          padding: '30px 28px',
          backdropFilter: 'blur(28px)',
          boxShadow: '0 0 60px rgba(77,163,255,0.04), 0 24px 64px rgba(0,0,0,0.6)',
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
                fontSize: '0.82rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
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
          <a href="/"
            style={{ fontSize: '0.7rem', color: 'rgba(240,240,248,0.18)', textDecoration: 'none', ...mono, transition: 'color 0.2s' }}
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
