import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';
import useStore from '../store/useStore';

/* ─── Trust Field Canvas ───────────────────────────────────────────────────
   The AegisTrace vision made visible: every identity orbits the trust core.
   Threats are detected and resolved in real time.
   Completely different from the landing page particle network.
──────────────────────────────────────────────────────────────────────────── */

const IDENTITY_TYPES = [
  { label: 'USR', r: 77,  g: 163, b: 255 },  // blue   — human users
  { label: 'TKN', r: 167, g: 139, b: 250 },  // purple — tokens
  { label: 'SVC', r: 34,  g: 197, b: 94  },  // green  — services
  { label: 'DEV', r: 234, g: 179, b: 8   },  // yellow — devices
  { label: 'AGT', r: 249, g: 115, b: 22  },  // orange — AI agents
];

function TrustField() {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let raf, W, H, cx, cy;

    function resize() {
      W = cv.offsetWidth;  H = cv.offsetHeight;
      cv.width = W;        cv.height = H;
      cx = W / 2;          cy = H / 2;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // ── Orbital rings: inner ↻, middle ↺ (counter), outer ↻ ──────────────
    const RINGS = [
      { r: 88,  count: 3, spd: 0.00030,  dir:  1 },
      { r: 162, count: 5, spd: 0.00018,  dir: -1 },
      { r: 248, count: 8, spd: 0.000105, dir:  1 },
    ];

    const nodes = [];
    RINGS.forEach((ring) => {
      for (let i = 0; i < ring.count; i++) {
        const t = IDENTITY_TYPES[Math.floor(Math.random() * IDENTITY_TYPES.length)];
        nodes.push({
          angle:        (i / ring.count) * Math.PI * 2 + Math.random() * 0.3,
          orbitR:       ring.r,
          spd:          ring.spd * ring.dir * (0.78 + Math.random() * 0.44),
          ...t,
          size:         4.5 + Math.random() * 2.5,
          phase:        Math.random() * Math.PI * 2,
          phaseSpd:     0.0007 + Math.random() * 0.0007,
          threat:       0,   // 0=normal 1=compromised 2=resolving
          tTimer:       0,
          x: 0, y: 0,
        });
      }
    });

    const conns = [];
    let connCD = 1200, pulseCD = 0, threatCD = 3500;
    const pulses = [];
    let last = 0;

    function frame(ts) {
      const dt = Math.min(ts - last, 50);
      last = ts;

      // Background
      ctx.fillStyle = '#07080F';
      ctx.fillRect(0, 0, W, H);

      // Dot grid
      ctx.fillStyle = 'rgba(77,163,255,0.065)';
      for (let x = 36; x < W; x += 36)
        for (let y = 36; y < H; y += 36) {
          ctx.beginPath(); ctx.arc(x, y, 0.85, 0, Math.PI * 2); ctx.fill();
        }

      // ── Outward pulse rings from center ─────────────────────────────────
      pulseCD -= dt;
      if (pulseCD <= 0) {
        pulses.push({ r: 16, op: 0.55 });
        pulseCD = 2100 + Math.random() * 900;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].r  += 0.044 * dt;
        pulses[i].op -= 0.00023 * dt;
        if (pulses[i].op <= 0) { pulses.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(cx, cy, pulses[i].r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(77,163,255,${pulses[i].op * 0.4})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // ── Orbit path guides ────────────────────────────────────────────────
      ctx.setLineDash([2, 10]);
      RINGS.forEach(ring => {
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(77,163,255,0.07)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // ── Update node positions & threat states ────────────────────────────
      nodes.forEach(n => {
        n.angle += n.spd * dt;
        n.phase += n.phaseSpd * dt;
        n.x = cx + Math.cos(n.angle) * n.orbitR;
        n.y = cy + Math.sin(n.angle) * n.orbitR;

        if (n.threat === 1) { n.tTimer += dt; if (n.tTimer > 1800) { n.threat = 2; n.tTimer = 0; } }
        if (n.threat === 2) { n.tTimer += dt; if (n.tTimer > 800)  { n.threat = 0; n.tTimer = 0; } }
      });

      // ── Trust bond connections ───────────────────────────────────────────
      connCD -= dt;
      if (connCD <= 0 && conns.length < 7) {
        const a = Math.floor(Math.random() * nodes.length);
        let b  = (a + 1 + Math.floor(Math.random() * (nodes.length - 1))) % nodes.length;
        const alert = nodes[a].threat > 0 || nodes[b].threat > 0;
        conns.push({ a, b, op: 0, ph: 'in', tm: 0, alert });
        connCD = 700 + Math.random() * 1300;
      }
      for (let i = conns.length - 1; i >= 0; i--) {
        const c = conns[i];
        c.tm += dt;
        if (c.ph === 'in')  { c.op = Math.min(1, c.tm / 300); if (c.op >= 1) { c.ph = 'hold'; c.tm = 0; } }
        if (c.ph === 'hold'){ if (c.tm > 1300 + Math.random()*1200) { c.ph = 'out'; c.tm = 0; } }
        if (c.ph === 'out') { c.op = Math.max(0, 1 - c.tm / 300); if (c.op <= 0) { conns.splice(i, 1); continue; } }
        const na = nodes[c.a], nb = nodes[c.b];
        const rgb = c.alert ? '239,68,68' : '77,163,255';
        ctx.beginPath();
        ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = `rgba(${rgb},${c.op * 0.32})`;
        ctx.lineWidth = c.alert ? 1.1 : 0.7;
        ctx.stroke();
      }

      // ── Threat events ────────────────────────────────────────────────────
      threatCD -= dt;
      if (threatCD <= 0) {
        const safe = nodes.filter(n => n.threat === 0);
        if (safe.length > 0) {
          const pick = safe[Math.floor(Math.random() * safe.length)];
          pick.threat = 1; pick.tTimer = 0;
        }
        threatCD = 4200 + Math.random() * 4000;
      }

      // Resolution beam: compromised node → center (green beam as Trust OS resolves it)
      nodes.filter(n => n.threat === 2).forEach(n => {
        const prog = n.tTimer / 800;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(cx + (n.x - cx) * (1 - prog), cy + (n.y - cy) * (1 - prog));
        ctx.strokeStyle = `rgba(34,197,94,${(1 - prog) * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // ── Center core — the Trust OS ───────────────────────────────────────
      const coreP = 0.72 + 0.28 * Math.sin(ts * 0.00092);
      const cg = ctx.createRadialGradient(cx, cy, 3, cx, cy, 32);
      cg.addColorStop(0,   `rgba(77,163,255,${coreP * 0.9})`);
      cg.addColorStop(0.45,`rgba(77,163,255,${coreP * 0.3})`);
      cg.addColorStop(1,   'rgba(77,163,255,0)');
      ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#4DA3FF'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();

      // ── Identity nodes ───────────────────────────────────────────────────
      nodes.forEach(n => {
        const pulse = 0.72 + 0.28 * Math.sin(n.phase);
        let r = n.r, g = n.g, b = n.b;
        if (n.threat === 1) { r = 239; g = 68;  b = 68; }
        if (n.threat === 2) { r = 34;  g = 197; b = 94; }

        const glowR = n.size * (n.threat === 1 ? 5 : 2.8);
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
        ng.addColorStop(0, `rgba(${r},${g},${b},${pulse * 0.45})`);
        ng.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath(); ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * (n.threat === 1 ? 1.35 : 1), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${pulse})`;
        ctx.fill();

        ctx.font = '7.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(240,240,248,0.28)';
        ctx.fillText(n.label, n.x, n.y + n.size + 9);
      });

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas ref={cvRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  );
}

/* ─── Login Form ────────────────────────────────────────────────────────── */
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

      {/* Orbital Trust Field animation — full bleed behind the form */}
      <TrustField />

      {/* Radial vignette keeps the form legible */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse 55% 65% at 50% 50%, transparent 20%, rgba(7,8,15,0.72) 100%)', pointerEvents: 'none' }} />

      {/* Form card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 390, padding: '0 20px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Logo size={44} showText={false} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#F0F0F8', marginBottom: 4 }}>
            AegisTrace
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(240,240,248,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase', ...mono }}>
            Trust Operating System
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(10,14,26,0.88)',
          border: '1px solid rgba(77,163,255,0.14)',
          borderRadius: 14,
          padding: '30px 28px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 60px rgba(77,163,255,0.05), 0 24px 64px rgba(0,0,0,0.55)',
        }}>
          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(240,240,248,0.28)', ...mono, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 7 }}>
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
              <label style={{ fontSize: '0.67rem', color: 'rgba(240,240,248,0.38)', display: 'block', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase', ...mono }}>
                Email
              </label>
              <input type="email" className="at-input"
                placeholder="analyst@corp.io"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email" autoFocus
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(77,163,255,0.14)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.67rem', color: 'rgba(240,240,248,0.38)', display: 'block', marginBottom: 7, letterSpacing: '0.08em', textTransform: 'uppercase', ...mono }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} className="at-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPw(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(77,163,255,0.14)' }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,240,248,0.3)', cursor: 'pointer', padding: 4 }}>
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{
                background: loading ? 'rgba(77,163,255,0.45)' : '#4DA3FF',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '11px', marginTop: 4,
                fontSize: '0.82rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s', ...mono, letterSpacing: '0.06em',
              }}>
              {loading ? (
                <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'login-spin 0.8s linear infinite' }} /> Authenticating…</>
              ) : (
                <>Sign In <ArrowRight size={13} /></>
              )}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <a href="/"
            style={{ fontSize: '0.7rem', color: 'rgba(240,240,248,0.2)', textDecoration: 'none', ...mono, transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(240,240,248,0.55)'}
            onMouseLeave={e => e.target.style.color = 'rgba(240,240,248,0.2)'}>
            ← Back to landing
          </a>
        </div>
      </div>

      <style>{`@keyframes login-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
