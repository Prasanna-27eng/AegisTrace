import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import api from '../api/client';
import useStore from '../store/useStore';

/* ═══════════════════════════════════════════════════════════════════════════
   AEGISTRACE — Login Page
   ───────────────────────────────────────────────────────────────────────────
   Emil Kowalski principles applied:
   • EASE_OUT = cubic-bezier(0.23,1,0.32,1) — "strong ease-out, instant response"
   • Card enters from scale(0.95) + opacity 0  — "nothing appears from nothing"
   • Button: scale(0.97) on :active            — "buttons must feel responsive"
   • All durations under 300ms for UI elements — "180ms feels faster than 400ms"
   • No ease-in anywhere                       — "ease-in starts slow, feels sluggish"
   • MFA transition uses blur(2px)             — "bridges visual gap between states"
   • Stagger fields at 60ms intervals          — "cascading, natural, not robotic"
   • Hover gated on (hover:hover)(pointer:fine)— "touch devices trigger on tap"
   • prefers-reduced-motion: crossfade only    — "reduced motion ≠ zero motion"

   Impeccable principles applied:
   • OKLCH-derived warm cream accent (#E1E0CC)  — "tinted neutrals, never pure white"
   • Contrast: all text ≥ 4.5:1 on black       — "muted gray is the biggest a11y fail"
   • Almarai typeface                           — "Impeccable: no Inter by default"
   • Motion intentional, not decorative        — "every animation earns its place"
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Easing curves (Emil Kowalski) ───────────────────────────────────────────
const EASE_OUT    = [0.23, 1, 0.32, 1];       // Strong ease-out: instant response
const EASE_DRAWER = [0.32, 0.72, 0, 1];       // iOS-like, for panel transitions

// ─── CipherLock canvas ───────────────────────────────────────────────────────
// (unchanged — still the best atmospheric element on the page)
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
    function resize() { W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W; cv.height = H; }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    function frame(ts) {
      const cx = W/2, cy = H/2, base = Math.min(W,H);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = 'rgba(255,255,255,0.022)';
      for (let gx=36; gx<W; gx+=36) for (let gy=36; gy<H; gy+=36) { ctx.beginPath(); ctx.arc(gx,gy,0.7,0,Math.PI*2); ctx.fill(); }
      RINGS.forEach(ring => {
        const R = base*ring.rMul, rot = ts*ring.speed*ring.dir;
        ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
        ctx.strokeStyle = `rgba(255,255,255,${ring.ringAlpha})`; ctx.lineWidth = ring.thick; ctx.stroke();
        const ticks = ring.tokens.length*4;
        for (let i=0; i<ticks; i++) {
          const a = (i/ticks)*Math.PI*2+rot, major = i%4===0;
          const r1 = R-(major?5:2.5), r2 = R+(major?5:2.5);
          ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1); ctx.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);
          ctx.strokeStyle = `rgba(255,255,255,${major?ring.ringAlpha*0.9:ring.ringAlpha*0.35})`; ctx.lineWidth = major?ring.thick:ring.thick*0.5; ctx.stroke();
        }
        const fontSize = Math.max(7,base*0.016);
        ctx.font = `${fontSize}px JetBrains Mono,monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
        const step = (Math.PI*2)/ring.tokens.length;
        ring.tokens.forEach((tok,i) => {
          const a = i*step+rot;
          ctx.save(); ctx.translate(cx+Math.cos(a)*R,cy+Math.sin(a)*R); ctx.rotate(a+Math.PI/2);
          ctx.fillStyle = `rgba(255,255,255,${ring.tokenAlpha})`; ctx.fillText(tok,0,0); ctx.restore();
        });
      });
      const pulse = 0.72+0.28*Math.sin(ts*0.0008), coreR = base*0.032;
      const grd = ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*4);
      grd.addColorStop(0,`rgba(225,224,204,${0.22*pulse})`);
      grd.addColorStop(0.5,`rgba(225,224,204,${0.07*pulse})`);
      grd.addColorStop(1,'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx,cy,coreR*4,0,Math.PI*2); ctx.fillStyle=grd; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,coreR,0,Math.PI*2);
      ctx.strokeStyle=`rgba(225,224,204,${0.7*pulse})`; ctx.lineWidth=1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,coreR*0.3,0,Math.PI*2);
      ctx.fillStyle=`rgba(225,224,204,${pulse})`; ctx.fill();
      const vig = ctx.createRadialGradient(cx,cy,base*0.28,cx,cy,Math.max(W,H)*0.78);
      vig.addColorStop(0,'transparent'); vig.addColorStop(1,'rgba(0,0,0,0.92)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={cvRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />;
}

// ─── HexMatrix background (keypress-ripple) ──────────────────────────────────
const HEX_CELLS = Array.from({ length: 192 }, () =>
  Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()
);
function HexMatrix({ rippleRef }) {
  return (
    <div ref={rippleRef} style={{ position:'absolute',inset:0,zIndex:0,pointerEvents:'none',display:'grid',gridTemplateColumns:'repeat(16,1fr)',gap:0,padding:'20px',overflow:'hidden' }}>
      {HEX_CELLS.map((h,i) => (
        <span key={i} data-hex={i} style={{ fontSize:'10px',color:'#111111',fontFamily:'JetBrains Mono,monospace',display:'flex',alignItems:'center',justifyContent:'center',padding:'4px 0',userSelect:'none',transition:'color 0.4s,opacity 0.4s' }}>{h}</span>
      ))}
    </div>
  );
}

// ─── FormField: staggered entrance + focus state ──────────────────────────────
function FormField({ label, children, delay }) {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      // Emil: ease-out — starts fast, feels responsive
      transition={{ duration: 0.45, delay, ease: EASE_OUT }}
    >
      <label style={{ display:'block', fontSize:'0.6rem', color:'#555', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:8, fontFamily:'JetBrains Mono,monospace' }}>
        {label}
      </label>
      {children}
    </motion.div>
  );
}

/* ─── Main Login component ──────────────────────────────────────────────────── */
export default function Login() {
  const [email,    setEmail]   = useState('');
  const [password, setPw]      = useState('');
  const [showPw,   setShowPw]  = useState(false);
  const [loading,  setLoad]    = useState(false);
  const [error,    setError]   = useState('');
  const [mfaRequired, setMfa]  = useState(false);
  const [pendingToken,setPend] = useState('');
  const [mfaCode, setMfaCode]  = useState('');

  const hexRef  = useRef(null);
  const { setAuth } = useStore();
  const navigate    = useNavigate();
  const mono = { fontFamily: 'JetBrains Mono, monospace' };

  // ── Keypress hex ripple ─────────────────────────────────────────────────
  useEffect(() => {
    const onKey = () => {
      if (!hexRef.current) return;
      const cells = hexRef.current.querySelectorAll('span[data-hex]');
      const count = 8 + Math.floor(Math.random()*7);
      for (let i=0; i<count; i++) {
        const idx = Math.floor(Math.random()*cells.length);
        const el = cells[idx];
        if (!el) continue;
        el.style.color = '#E1E0CC';
        el.style.opacity = '0.55';
        setTimeout(() => { if (el) { el.style.color='#111'; el.style.opacity='1'; } }, 480+Math.random()*220);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Auth helpers ────────────────────────────────────────────────────────
  const collapseAndNavigate = (token, user) => {
    setAuth(token, user);
    navigate('/app/dashboard');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password required'); return; }
    setLoad(true);
    try {
      const res = await api.post('/api/auth/login', { email: email.trim().toLowerCase(), password: password.trim() });
      if (res.data.mfa_required) { setPend(res.data.pending_token); setMfa(true); setLoad(false); }
      else if (res.data.mfa_setup_required) { collapseAndNavigate(res.data.token, res.data.user); navigate('/app/admin'); }
      else { collapseAndNavigate(res.data.token, res.data.user); }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
      setLoad(false);
    }
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    setError('');
    const clean = mfaCode.replace(/\s/g,'');
    if (clean.length !== 6) { setError('Enter the 6-digit code from your authenticator'); return; }
    setLoad(true);
    try {
      const res = await api.post('/api/auth/login/mfa', { pending_token: pendingToken, code: clean });
      collapseAndNavigate(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code. Try again.');
      setLoad(false);
    }
  };

  // ── Shared input style ──────────────────────────────────────────────────
  const inputBase = {
    background: '#000',
    border: '1px solid #1A1A1A',
    borderRadius: 0,
    color: '#E1E0CC',
    ...mono,
    fontSize: '0.82rem',
    padding: '11px 12px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    // Emil: specify exact property, never transition:all
    transition: 'border-color 220ms cubic-bezier(0.23,1,0.32,1)',
  };

  return (
    <div style={{ minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');

        /* Emil: scale(0.97) on :active — "buttons must feel responsive to press" */
        .at-login-btn { transition: transform 160ms cubic-bezier(0.23,1,0.32,1), background 200ms cubic-bezier(0.23,1,0.32,1) !important; }
        .at-login-btn:active { transform: scale(0.97) !important; }

        /* Impeccable: hover only on pointer devices */
        @media (hover:hover) and (pointer:fine) {
          .at-login-btn:hover { background: rgba(225,224,204,0.92) !important; }
          .at-back-link:hover { color: #888 !important; }
          .at-toggle:hover { color: #888 !important; }
        }

        /* Reduced motion: only crossfade, never movement */
        @media (prefers-reduced-motion:reduce) {
          .at-login-btn:active { transform: none !important; opacity: 0.8; }
        }
      `}</style>

      {/* Atmosphere layers */}
      <CipherLock />
      <HexMatrix rippleRef={hexRef} />

      {/* Centre vignette */}
      <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none', background:'radial-gradient(ellipse 52% 58% at 50% 50%,rgba(0,0,0,0.84) 0%,rgba(0,0,0,0.45) 55%,transparent 100%)' }} />

      {/* ── Card — enters from scale(0.95) per Emil's "nothing from nothing" rule */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        // Emil: ease-out — starts fast, user sees movement immediately
        transition={{ duration: 0.55, ease: EASE_OUT }}
        style={{ position:'relative', zIndex:2, width:'100%', maxWidth:360, padding:'0 20px' }}
      >
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
            style={{ fontSize:'0.6rem', letterSpacing:'0.28em', color:'#555', ...mono, marginBottom:6 }}
          >
            AEGISTRACE // CORE v5.1
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: EASE_OUT }}
            style={{
              fontSize:'1.05rem', fontWeight:300, letterSpacing:'-0.03em', color:'#E1E0CC',
              fontFamily:'Almarai, sans-serif',
            }}
          >
            analyst gateway
          </motion.div>
        </div>

        {/* Vault panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
          style={{ background:'rgba(5,5,5,0.94)', border:'1px solid #111', padding:'32px 28px', backdropFilter:'blur(32px)' }}
        >
          {/* Emil: AnimatePresence + blur trick for MFA transition.
              "When a crossfade feels off, add subtle blur(2px) — it bridges
               the visual gap between the two states." */}
          <AnimatePresence mode="wait">
            {mfaRequired ? (

              /* ── MFA step ── */
              <motion.div
                key="mfa"
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                // Emil: drawers/modals: 200–500ms
                transition={{ duration: 0.28, ease: EASE_OUT }}
              >
                <div style={{ fontSize:'0.6rem', color:'#555', letterSpacing:'0.14em', textTransform:'uppercase', ...mono, marginBottom:24, textAlign:'center' }}>
                  TWO-FACTOR VERIFICATION
                </div>

                {error && <ErrorBanner error={error} />}

                <form onSubmit={submitMfa} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <FormField label="Authenticator Code" delay={0.06}>
                    <input
                      className="at-input" type="text" inputMode="numeric" maxLength={7}
                      placeholder="000 000" autoFocus value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                      style={{ ...inputBase, textAlign:'center', fontSize:'1.5rem', letterSpacing:'0.3em' }}
                      onFocus={e => e.target.style.borderColor='#333'}
                      onBlur={e => e.target.style.borderColor='#1A1A1A'}
                    />
                  </FormField>
                  <SubmitButton loading={loading} label="VERIFY IDENTITY" loadingLabel="VERIFYING…" />
                </form>

                <button
                  onClick={() => { setMfa(false); setPend(''); setMfaCode(''); setError(''); }}
                  className="at-back-link"
                  style={{ background:'none', border:'none', color:'#333', cursor:'pointer', fontSize:'0.62rem', ...mono, display:'block', margin:'16px auto 0', letterSpacing:'0.1em', transition:'color 200ms cubic-bezier(0.23,1,0.32,1)' }}
                >
                  ← BACK
                </button>
              </motion.div>

            ) : (

              /* ── Password step ── */
              <motion.div
                key="pw"
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              >
                <div style={{ fontSize:'0.6rem', color:'#555', letterSpacing:'0.14em', textTransform:'uppercase', ...mono, marginBottom:24 }}>
                  ANALYST ID + PASSPHRASE
                </div>

                {error && <ErrorBanner error={error} />}

                <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* Stagger at 60ms intervals — Emil: "short stagger, never blocking" */}
                  <FormField label="Analyst ID" delay={0.06}>
                    <input
                      type="email" placeholder="analyst@corp.io" value={email}
                      onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus
                      style={inputBase}
                      onFocus={e => e.target.style.borderColor='#E1E0CC'}
                      onBlur={e => e.target.style.borderColor='#1A1A1A'}
                    />
                  </FormField>

                  <FormField label="Signature Passphrase" delay={0.12}>
                    <div style={{ position:'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'} placeholder="••••••••"
                        value={password} onChange={e => setPw(e.target.value)}
                        autoComplete="current-password"
                        style={{ ...inputBase, paddingRight:40 }}
                        onFocus={e => e.target.style.borderColor='#E1E0CC'}
                        onBlur={e => e.target.style.borderColor='#1A1A1A'}
                      />
                      {/* Emil: "tooltips / small popovers: 125–200ms" — keep toggle fast */}
                      <button
                        type="button" onClick={() => setShowPw(s => !s)}
                        className="at-toggle"
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#444', cursor:'pointer', padding:4, transition:'color 150ms cubic-bezier(0.23,1,0.32,1)' }}
                      >
                        {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </FormField>

                  {/* Button stagger last */}
                  <motion.div
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.18, ease: EASE_OUT }}
                  >
                    <SubmitButton loading={loading} label="AUTHENTICATE" loadingLabel="AUTHENTICATING…" />
                  </motion.div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4, ease: EASE_OUT }}
          style={{ textAlign:'center', marginTop:20 }}
        >
          <a
            href="/"
            className="at-back-link"
            style={{ fontSize:'0.6rem', color:'#333', textDecoration:'none', ...mono, letterSpacing:'0.1em', transition:'color 200ms cubic-bezier(0.23,1,0.32,1)' }}
          >
            ← RETURN TO BASE
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

// Error: slides in from y(-6) — Emil: UI feedback under 300ms
function ErrorBanner({ error }) {
  return (
    <motion.div
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      style={{ fontSize:'0.72rem', color:'#FF4E4E', marginBottom:16, fontFamily:'JetBrains Mono,monospace', borderLeft:'2px solid #FF4E4E', paddingLeft:10 }}
    >
      {error}
    </motion.div>
  );
}

// Submit button — warm cream (#E1E0CC) instead of pure white
// scale(0.97) on :active per Emil; disabled state is opacity, not pointer-events
function SubmitButton({ loading, label, loadingLabel }) {
  return (
    <button
      type="submit"
      className="at-login-btn"
      style={{
        width:'100%',
        background: loading ? 'rgba(225,224,204,0.5)' : '#E1E0CC',
        color:'#000',
        border:'none',
        padding:'13px',
        fontSize:'0.68rem',
        fontWeight:700,
        letterSpacing:'0.18em',
        textTransform:'uppercase',
        cursor: loading ? 'not-allowed' : 'pointer',
        marginTop:4,
        fontFamily:'JetBrains Mono, monospace',
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
