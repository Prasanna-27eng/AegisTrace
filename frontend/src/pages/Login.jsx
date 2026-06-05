import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';
import useStore from '../store/useStore';

/* ═══════════════════════════════════════════════════════════════════════════
   TRUST VERIFICATION
   ─────────────────
   AegisTrace's core mission, rendered as a living scene.

   · Identity nodes (USR · AGT · SVC · DEV) emerge from the darkness and
     drift inward toward the central Trust Core.
   · When close enough, a beam of light connects node to core → authenticated.
     The node takes its orbit. A pulse ring confirms the grant.
   · Orbiting nodes weave thin trust threads between each other — a living
     mesh that grows and breathes.
   · Every ~10 seconds, a red threat node approaches. The Core rejects it:
     a red pulse ring fires, the threat is expelled back into the dark.
   · Subtle dot grid, three concentric orbit guides, three micro-electrons
     circling the core.

   Clean. Geometric. Purposeful. Nothing funky.
═══════════════════════════════════════════════════════════════════════════ */

const ID_TYPES = [
  { label: 'USR', r: 77,  g: 163, b: 255 },   // human user   — blue
  { label: 'AGT', r: 167, g: 139, b: 250 },   // AI agent     — purple
  { label: 'SVC', r: 34,  g: 197, b: 94  },   // service acct — green
  { label: 'DEV', r: 234, g: 179, b: 8   },   // device       — amber
];

function TrustVerification() {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, raf;

    function resize() {
      W = cv.offsetWidth;
      H = cv.offsetHeight;
      cv.width  = W;
      cv.height = H;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // ── State ────────────────────────────────────────────────────────────
    const nodes  = [];
    const pulses = [];     // expanding ring events from core
    let spawnCD  = 1100;
    let threatCD = 11000 + Math.random() * 6000;
    let cPulseCD = 2800;
    let last     = 0;

    const MAX_NODES = 12;
    const AUTH_R    = 54;   // within this radius → node authenticates
    const ORB_MAX   = 132;  // max orbit radius

    // ── Helpers ───────────────────────────────────────────────────────────
    function edgePt() {
      const e = Math.floor(Math.random() * 4);
      if (e === 0) return { x: Math.random() * W, y: -18 };
      if (e === 1) return { x: W + 18,             y: Math.random() * H };
      if (e === 2) return { x: Math.random() * W,  y: H + 18 };
      return              { x: -18,                y: Math.random() * H };
    }

    function spawnNode(isThreat) {
      const { x, y } = edgePt();
      const cx = W / 2, cy = H / 2;
      const t   = ID_TYPES[Math.floor(Math.random() * ID_TYPES.length)];
      const ang = Math.random() * Math.PI * 2;
      const od  = 40 + Math.random() * (ORB_MAX - 40);

      nodes.push({
        x, y,
        tx: cx + Math.cos(ang) * od,
        ty: cy + Math.sin(ang) * od,
        oAng: ang,
        oDist: od,
        oSpd: (0.00024 + Math.random() * 0.00032) * (Math.random() < 0.5 ? 1 : -1),
        spd:   0.031 + Math.random() * 0.038,
        sz:    3.5 + Math.random() * 2.5,
        ph:    Math.random() * Math.PI * 2,
        r: isThreat ? 239 : t.r,
        g: isThreat ? 68  : t.g,
        b: isThreat ? 68  : t.b,
        label: t.label,
        isThreat,
        rejected: false,
        state:    'arriving',   // arriving | orbiting | leaving
        alpha:    0,
        lineB:    0,            // brightness of line to core
        life:     0,
        maxLife:  isThreat ? 0 : 10000 + Math.random() * 8000,
      });
    }

    // Seed a few nodes so screen is not empty at start
    for (let i = 0; i < 4; i++) spawnNode(false);

    // ── Frame ─────────────────────────────────────────────────────────────
    function frame(ts) {
      const dt = Math.min(ts - last, 40);
      last = ts;
      const cx = W / 2, cy = H / 2;

      ctx.fillStyle = '#07080F';
      ctx.fillRect(0, 0, W, H);

      // Subtle dot grid
      ctx.fillStyle = 'rgba(77,163,255,0.048)';
      for (let gx = 44; gx < W; gx += 44)
        for (let gy = 44; gy < H; gy += 44) {
          ctx.beginPath(); ctx.arc(gx, gy, 0.72, 0, Math.PI * 2); ctx.fill();
        }

      // Orbit guide rings (dashed)
      ctx.setLineDash([2, 12]);
      [50, 91, ORB_MAX].forEach((r, i) => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(77,163,255,${[0.07, 0.05, 0.035][i]})`;
        ctx.lineWidth = 0.7; ctx.stroke();
      });
      ctx.setLineDash([]);

      // ── Spawn timers ────────────────────────────────────────────────────
      spawnCD  -= dt;
      threatCD -= dt;
      cPulseCD -= dt;
      if (spawnCD  <= 0 && nodes.length < MAX_NODES) { spawnNode(false); spawnCD  = 1400 + Math.random() * 1900; }
      if (threatCD <= 0)                              { spawnNode(true);  threatCD = 12000 + Math.random() * 8000; }
      if (cPulseCD <= 0)                              { pulses.push({ r: 10, op: 0.3, red: false }); cPulseCD = 2700 + Math.random() * 1500; }

      // ── Pulse rings ─────────────────────────────────────────────────────
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].r  += 0.055 * dt;
        pulses[i].op -= 0.0017 * dt;
        if (pulses[i].op <= 0) { pulses.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(cx, cy, pulses[i].r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${pulses[i].red ? '239,68,68' : '77,163,255'},${pulses[i].op})`;
        ctx.lineWidth = 1.3; ctx.stroke();
      }

      // ── Trust threads (orbiting nodes ↔ each other) ─────────────────────
      const orb = nodes.filter(n => n.state === 'orbiting' && !n.rejected);
      for (let i = 0; i < orb.length; i++)
        for (let j = i + 1; j < orb.length; j++) {
          const d = Math.sqrt((orb[i].x - orb[j].x) ** 2 + (orb[i].y - orb[j].y) ** 2);
          if (d < 155) {
            ctx.beginPath(); ctx.moveTo(orb[i].x, orb[i].y); ctx.lineTo(orb[j].x, orb[j].y);
            ctx.strokeStyle = `rgba(77,163,255,${(1 - d / 155) * 0.17})`;
            ctx.lineWidth = 0.45; ctx.stroke();
          }
        }

      // ── Update + draw nodes ─────────────────────────────────────────────
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n  = nodes[i];
        n.life  += dt;
        n.ph    += 0.0009 * dt;
        const dc = Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2);

        // Threat rejection
        if (n.isThreat && !n.rejected && n.state === 'arriving' && dc < AUTH_R + 14) {
          n.rejected = true;
          n.state    = 'leaving';
          const dx = n.x - cx, dy = n.y - cy, dn = Math.sqrt(dx * dx + dy * dy) || 1;
          n.tx = cx + (dx / dn) * W * 0.86;
          n.ty = cy + (dy / dn) * H * 0.86;
          pulses.push({ r: 14, op: 0.82, red: true });
        }

        if (n.state === 'arriving') {
          n.x    += (n.tx - n.x) * n.spd;
          n.y    += (n.ty - n.y) * n.spd;
          n.alpha = Math.min(1, n.alpha + dt * 0.003);
          if (!n.isThreat && Math.sqrt((n.x - n.tx) ** 2 + (n.y - n.ty) ** 2) < 3) {
            n.state = 'orbiting';
            n.lineB = 1;
            pulses.push({ r: 8, op: 0.42, red: false });
          }
        } else if (n.state === 'orbiting') {
          n.oAng += n.oSpd * dt;
          n.x = cx + Math.cos(n.oAng) * n.oDist + Math.sin(n.ph) * 2.5;
          n.y = cy + Math.sin(n.oAng) * n.oDist + Math.cos(n.ph * 1.4) * 2.5;
          n.lineB = Math.max(0, n.lineB - dt * 0.0006);
          if (n.maxLife > 0 && n.life > n.maxLife) {
            n.state = 'leaving';
            const a = Math.random() * Math.PI * 2;
            n.tx = cx + Math.cos(a) * W;
            n.ty = cy + Math.sin(a) * H;
          }
        } else if (n.state === 'leaving') {
          n.x    += (n.tx - n.x) * 0.022;
          n.y    += (n.ty - n.y) * 0.022;
          n.alpha = Math.max(0, n.alpha - dt * 0.0018);
          if (n.alpha <= 0) { nodes.splice(i, 1); continue; }
        }

        // Line from node → core
        const lA = n.state === 'orbiting'
          ? Math.max(0.05, n.lineB * 0.62) * n.alpha
          : (dc < ORB_MAX + 42 ? (1 - dc / (ORB_MAX + 42)) * 0.28 * n.alpha : 0);
        if (lA > 0.018) {
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(cx, cy);
          ctx.strokeStyle = `rgba(${n.r},${n.g},${n.b},${lA})`;
          ctx.lineWidth   = n.lineB > 0.4 ? 1.0 : 0.45;
          ctx.stroke();
        }

        // Node glow
        const gR = n.sz * 3.8 * (n.isThreat ? 1.5 : 1);
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, gR);
        ng.addColorStop(0, `rgba(${n.r},${n.g},${n.b},${n.alpha * 0.42})`);
        ng.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(n.x, n.y, gR, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();

        // Node core dot
        ctx.beginPath(); ctx.arc(n.x, n.y, n.sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.r},${n.g},${n.b},${n.alpha})`; ctx.fill();

        // Type label (very faint)
        if (n.alpha > 0.5 && !n.isThreat) {
          ctx.font      = '7px JetBrains Mono,monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(240,240,248,${n.alpha * 0.28})`;
          ctx.fillText(n.label, n.x, n.y - n.sz - 5);
        }
      }

      // ── Central Trust Core ───────────────────────────────────────────────
      const cp = 0.68 + 0.32 * Math.sin(ts * 0.00088);

      // Outer glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 36);
      cg.addColorStop(0,    `rgba(77,163,255,${cp * 0.88})`);
      cg.addColorStop(0.45, `rgba(77,163,255,${cp * 0.28})`);
      cg.addColorStop(1,    'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();

      // Three orbiting micro-electrons
      for (let i = 0; i < 3; i++) {
        const a  = ts * 0.00078 + (i * Math.PI * 2) / 3;
        const ex = cx + Math.cos(a) * 15;
        const ey = cy + Math.sin(a) * 15;
        ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(77,163,255,0.72)'; ctx.fill();
      }

      // Core dot
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4DA3FF'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();

      // Bottom fade
      const bv = ctx.createLinearGradient(0, H * 0.52, 0, H);
      bv.addColorStop(0, 'transparent');
      bv.addColorStop(1, 'rgba(7,8,15,0.6)');
      ctx.fillStyle = bv; ctx.fillRect(0, 0, W, H);

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

      {/* Trust Verification animation fills the whole background */}
      <TrustVerification />

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
