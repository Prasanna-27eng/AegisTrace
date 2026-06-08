import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRight, Award, Crown, X, Menu,
         Shield, Brain, Mail, Github, ExternalLink,
         Check, GraduationCap, Code, Globe, Cpu, Activity,
         Star, Clock, Calendar, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════════════════
   PORTFOLIO — VANGUARD Bold Design
   PODIUM Sharp font · fullscreen video · staggered fade-up · bold type
   Emil Kowalski easing [0.23,1,0.32,1] · Impeccable layout & hierarchy
   ═══════════════════════════════════════════════════════════════════════════ */

const E    = [0.23, 1, 0.32, 1];
const EC   = [0.22, 1, 0.36, 1];
const RED  = '#c0392b';
const MONO = { fontFamily:'JetBrains Mono,monospace' };

/* ──────────────────────────────────────────────────────────────────────────
   SKILL BAR
   ─────────────────────────────────────────────────────────────────────── */
function SkillBar({ skill, pct, delay=0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true });
  return (
    <div ref={ref} style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
        <span style={{ color:'rgba(255,255,255,0.8)' }}>{skill}</span>
        <span style={{ color:RED, ...MONO }}>{pct}%</span>
      </div>
      <div style={{ height:2, background:'rgba(255,255,255,0.08)', borderRadius:9999, overflow:'hidden' }}>
        <motion.div
          initial={{ width:0 }}
          animate={inView ? { width:`${pct}%` } : {}}
          transition={{ duration:1.1, delay, ease:E }}
          style={{ height:'100%', background:`linear-gradient(90deg,${RED},rgba(192,57,43,0.5))`, borderRadius:9999 }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CERT CARD
   ─────────────────────────────────────────────────────────────────────── */
function CertCard({ name, issuer, status, color, delay=0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  return (
    <motion.div ref={ref}
      initial={{ scale:0.94, opacity:0 }}
      animate={inView ? { scale:1, opacity:1 } : {}}
      transition={{ duration:0.6, delay, ease:EC }}
      style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${color}22`, borderRadius:10, padding:18, borderLeft:`3px solid ${color}` }}
    >
      <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:4, lineHeight:1.3 }}>{name}</div>
      <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:8, ...MONO }}>{issuer}</div>
      <div style={{ display:'inline-flex', padding:'3px 8px', borderRadius:9999, background:`${color}18`, fontSize:9, color, ...MONO, letterSpacing:'0.08em' }}>{status}</div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PROJECT CARD
   ─────────────────────────────────────────────────────────────────────── */
function ProjectCard({ title, tags, desc, url, highlight=false, delay=0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  return (
    <motion.div ref={ref}
      initial={{ scale:0.94, opacity:0, y:16 }}
      animate={inView ? { scale:1, opacity:1, y:0 } : {}}
      transition={{ duration:0.65, delay, ease:EC }}
      style={{ background: highlight ? `rgba(192,57,43,0.08)` : 'rgba(255,255,255,0.02)', border:`1px solid ${highlight ? 'rgba(192,57,43,0.22)' : 'rgba(255,255,255,0.06)'}`, borderRadius:12, padding:22, position:'relative', overflow:'hidden' }}
    >
      {highlight && (
        <div style={{ position:'absolute', top:12, right:12, fontSize:9, color:RED, ...MONO, letterSpacing:'0.1em', background:'rgba(192,57,43,0.12)', padding:'3px 8px', borderRadius:9999 }}>FLAGSHIP</div>
      )}
      <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:8, paddingRight:highlight?64:0, lineHeight:1.25 }}>{title}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
        {tags.map(t => (
          <span key={t} style={{ fontSize:9, color:'rgba(192,57,43,0.8)', border:'1px solid rgba(192,57,43,0.2)', borderRadius:9999, padding:'2px 8px', ...MONO }}>{t}</span>
        ))}
      </div>
      <div style={{ fontSize:12, color:'rgba(255,255,255,0.48)', lineHeight:1.55, marginBottom:url?12:0 }}>{desc}</div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:RED, textDecoration:'none' }}>
          View project <ExternalLink size={10}/>
        </a>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SECTION HEADING
   ─────────────────────────────────────────────────────────────────────── */
function SH({ label, title, light=false }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:20 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.7, ease:E }}
      style={{ marginBottom:36 }}
    >
      <div style={{ fontSize:9, color:'rgba(192,57,43,0.85)', ...MONO, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:10 }}>{label}</div>
      <h2 style={{ fontSize:'clamp(22px,3.5vw,40px)', fontWeight:800, color:'#fff', margin:0, letterSpacing:'-0.02em', lineHeight:1.05, fontFamily:'FSP DEMO - PODIUM Sharp 4.11, Almarai, sans-serif', textTransform:'uppercase' }}>{title}</h2>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   REVEAL WRAPPER
   ─────────────────────────────────────────────────────────────────────── */
function Reveal({ children, delay=0, style={} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:28 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.75, delay, ease:E }}
      style={style}
    >{children}</motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════════════════ */
export default function Portfolio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  /* Close menu on escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const NAV_LINKS = [
    { label:'Home',      to:'/' },
    { label:'Mission',   to:'/mission' },
    { label:'Platform',  to:'/app/login' },
  ];

  return (
    <div style={{ background:'#0a0202', overflowX:'hidden', color:'#fff', minHeight:'100vh' }}>
      <style>{`
        /* PODIUM Sharp font */
        @import url('https://db.onlinewebfonts.com/c/8b75d9dcff6a48c35a46656192adf019?family=FSP+DEMO+-+PODIUM+Sharp+4.11');
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

        *,*::before,*::after{ box-sizing:border-box; }
        body{ margin:0; background:#0a0202; }

        .font-podium{ font-family:'FSP DEMO - PODIUM Sharp 4.11','Almarai',sans-serif; }
        .font-inter{ font-family:'Inter','Almarai',sans-serif; }

        /* ─── Fade-up animation classes ─── */
        @keyframes fade-up{
          from{ opacity:0; transform:translateY(30px); }
          to{ opacity:1; transform:translateY(0); }
        }
        @keyframes fade-in{
          from{ opacity:0; }
          to{ opacity:1; }
        }
        @keyframes scale-in{
          from{ opacity:0; transform:scale(0.9); }
          to{ opacity:1; transform:scale(1); }
        }
        @keyframes scan{
          0%{ top:-2px; }
          100%{ top:100%; }
        }
        @keyframes blurFadeUp{
          from{ opacity:0; filter:blur(20px); transform:translateY(40px); }
          to{ opacity:1; filter:blur(0); transform:translateY(0); }
        }
        .blur-fade-up{ opacity:0; animation:blurFadeUp 1s ease-out forwards; }

        /* ─── Liquid glass (cinematic pill buttons) ─── */
        .liquid-glass{
          background:rgba(255,255,255,0.01);
          background-blend-mode:luminosity;
          -webkit-backdrop-filter:blur(4px);
          backdrop-filter:blur(4px);
          border:none;
          box-shadow:inset 0 1px 1px rgba(255,255,255,0.1);
          position:relative; overflow:hidden;
        }
        .liquid-glass::before{
          content:''; position:absolute; inset:0; border-radius:inherit; padding:1.4px;
          background:linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite:xor; mask-composite:exclude;
          pointer-events:none;
        }

        .fade-up-0{ opacity:0; animation:fade-up 0.8s ease-out 0s forwards; }
        .fade-up-1{ opacity:0; animation:fade-up 0.8s ease-out 0.2s forwards; }
        .fade-up-2{ opacity:0; animation:fade-up 0.8s ease-out 0.4s forwards; }
        .fade-up-3{ opacity:0; animation:fade-up 0.8s ease-out 0.6s forwards; }
        .fade-up-4{ opacity:0; animation:fade-up 0.8s ease-out 0.8s forwards; }
        .fade-in-1{ opacity:0; animation:fade-in 0.6s ease-out 0.1s forwards; }

        /* ─── CTA button ─── */
        .cta-black{
          display:inline-flex; align-items:center; gap:8px;
          background:#000; color:#fff;
          padding:12px 24px; border:none; cursor:pointer;
          font-family:'Inter','Almarai',sans-serif; font-weight:600;
          font-size:11px; letter-spacing:0.15em; text-transform:uppercase;
          text-decoration:none;
          transition:background 180ms cubic-bezier(0.23,1,0.32,1);
        }
        .cta-black:hover{ background:#1a1a1a; }
        .cta-black:active{ transform:scale(0.97); }
        .cta-black .arrow{ transition:transform 180ms cubic-bezier(0.23,1,0.32,1); }
        .cta-black:hover .arrow{ transform:translate(2px,-2px); }

        /* ─── Border button ─── */
        .cta-border{
          display:inline-flex; align-items:center; gap:6px;
          background:transparent; color:rgba(255,255,255,0.85);
          padding:11px 22px; border:1px solid rgba(255,255,255,0.28); cursor:pointer;
          font-family:'Inter','Almarai',sans-serif; font-weight:500;
          font-size:11px; letter-spacing:0.15em; text-transform:uppercase;
          text-decoration:none;
          transition:all 180ms cubic-bezier(0.23,1,0.32,1);
        }
        .cta-border:hover{ border-color:rgba(255,255,255,0.65); background:rgba(255,255,255,0.08); color:#fff; }
        .cta-border:active{ transform:scale(0.97); }

        /* ─── Nav link ─── */
        .nl{
          font-family:'Inter','Almarai',sans-serif; font-size:12px;
          color:rgba(255,255,255,0.7); text-decoration:none;
          letter-spacing:0.18em; text-transform:uppercase;
          transition:color 180ms cubic-bezier(0.23,1,0.32,1);
        }
        .nl:hover{ color:#fff; }

        /* ─── Scrollbar ─── */
        ::-webkit-scrollbar{ width:3px; }
        ::-webkit-scrollbar-track{ background:#0a0202; }
        ::-webkit-scrollbar-thumb{ background:#c0392b; border-radius:9999px; }

        @media(prefers-reduced-motion:reduce){
          .fade-up-0,.fade-up-1,.fade-up-2,.fade-up-3,.fade-up-4,.fade-in-1{
            animation:none; opacity:1;
          }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          §1 HERO — fullscreen video + bold stacked heading
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ position:'relative', height:'100vh', minHeight:600, overflow:'hidden', background:'#0a0202' }}>

        {/* Video background */}
        {!videoFailed ? (
          <video
            ref={videoRef}
            autoPlay muted loop playsInline
            onError={() => setVideoFailed(true)}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4"
          />
        ) : (
          /* CSS fallback — red-dark grid bg */
          <div aria-hidden style={{ position:'absolute', inset:0, zIndex:0, background:'#0a0202' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% 60%,rgba(192,57,43,0.45) 0%,rgba(100,10,5,0.22) 45%,transparent 70%)' }}/>
            <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(192,57,43,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(192,57,43,0.18) 1px,transparent 1px)', backgroundSize:'56px 56px' }}/>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 130% 130% at 50% 50%,transparent 36%,rgba(10,2,2,0.96) 100%)' }}/>
            <div aria-hidden style={{ position:'absolute', left:0, right:0, height:2, top:0, background:'linear-gradient(90deg,transparent 5%,rgba(192,57,43,0.75) 35%,#fff 50%,rgba(192,57,43,0.75) 65%,transparent 95%)', animation:'scan 7s linear infinite' }}/>
          </div>
        )}

        {/* Left vignette to make text readable */}
        <div aria-hidden style={{ position:'absolute', inset:0, zIndex:1, background:'linear-gradient(to right,rgba(10,2,2,0.7) 0%,rgba(10,2,2,0.32) 50%,transparent 100%)' }}/>
        {/* Bottom blur-mask overlay — cinematic streaming-hero look (blur only, no dark gradient) */}
        <div aria-hidden style={{
          position:'absolute', inset:0, zIndex:2, pointerEvents:'none',
          WebkitBackdropFilter:'blur(28px)', backdropFilter:'blur(28px)',
          WebkitMaskImage:'linear-gradient(to top, black 0%, transparent 45%)',
          maskImage:'linear-gradient(to top, black 0%, transparent 45%)',
        }}/>

        {/* ── NAVBAR ── */}
        <nav style={{ position:'absolute', top:0, left:0, right:0, zIndex:20, padding:'20px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' }} className="fade-in-1">
          {/* Brand */}
          <Link to="/" style={{ textDecoration:'none', color:'#fff', fontFamily:'FSP DEMO - PODIUM Sharp 4.11,Almarai,sans-serif', fontWeight:700, fontSize:'clamp(18px,2.2vw,26px)', letterSpacing:'0.16em', textTransform:'uppercase' }}>
            PRASANNA
          </Link>

          {/* Desktop nav */}
          <div style={{ display:'flex', gap:40, alignItems:'center' }}>
            {NAV_LINKS.map(({ label, to }) => (
              <Link key={label} to={to} className="nl" style={{ display:'none' }}
                // show only on desktop via style injection below
              >{label}</Link>
            ))}
            {/* Desktop-only group with inline media query equivalent */}
            <div style={{ display:'flex', gap:40, alignItems:'center' }}>
              <style>{`@media(max-width:767px){.desk-nav{display:none!important;}}`}</style>
              <div className="desk-nav" style={{ display:'flex', gap:40, alignItems:'center' }}>
                {NAV_LINKS.map(({ label, to }) => (
                  <Link key={label} to={to} className="nl">{label}</Link>
                ))}
              </div>
              <a href="mailto:prasanna80564@gmail.com" className="cta-border desk-nav" style={{ display:'inline-flex' }}>
                GET IN TOUCH <ArrowUpRight size={13} style={{ flexShrink:0 }}/>
              </a>
            </div>
            {/* Mobile hamburger */}
            <style>{`@media(min-width:768px){.mob-menu-btn{display:none!important;}}`}</style>
            <button
              className="mob-menu-btn"
              onClick={() => setMenuOpen(true)}
              style={{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', flexDirection:'column', gap:5 }}
              aria-label="Open menu"
            >
              <div style={{ width:24, height:2, background:'#fff', borderRadius:2 }}/>
              <div style={{ width:24, height:2, background:'#fff', borderRadius:2 }}/>
              <div style={{ width:16, height:2, background:'#fff', borderRadius:2 }}/>
            </button>
          </div>
        </nav>

        {/* ── HERO CONTENT ── */}
        <div style={{ position:'absolute', inset:0, zIndex:10, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'0 32px 48px' }}>

          {/* Metadata row — cinematic streaming-hero style */}
          <div className="blur-fade-up" style={{ animationDelay:'150ms', display:'flex', flexWrap:'wrap', alignItems:'center', gap:'10px 22px', marginBottom:20, fontFamily:'Inter,Almarai,sans-serif', fontSize:'clamp(10px,1.3vw,13px)', color:'rgba(255,255,255,0.75)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Star size={14} color="#fff" fill="#fff" style={{ flexShrink:0 }}/> <strong style={{ fontWeight:600, color:'#fff' }}>SC-200</strong> Certified Analyst
            </span>
            <span style={{ width:1, height:14, background:'rgba(255,255,255,0.25)' }}/>
            <span style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Clock size={14} style={{ flexShrink:0 }}/> 12+ Cases Investigated
            </span>
            <span style={{ width:1, height:14, background:'rgba(255,255,255,0.25)' }}/>
            <span style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Calendar size={14} style={{ flexShrink:0 }}/> Dublin, Ireland
            </span>
          </div>

          {/* Main heading — VANGUARD style, with subtle 3D tilt */}
          <div className="blur-fade-up" style={{ animationDelay:'280ms', perspective:1000 }}>
            <motion.h1
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                e.currentTarget.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
                e.currentTarget.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.setProperty('--rx', '0deg');
                e.currentTarget.style.setProperty('--ry', '0deg');
              }}
              style={{
                fontFamily:'FSP DEMO - PODIUM Sharp 4.11,Almarai,sans-serif',
                fontWeight:800, textTransform:'uppercase', lineHeight:0.88,
                letterSpacing:'-0.02em', margin:'0 0 24px',
                fontSize:'clamp(52px,10.5vw,130px)',
                color:'#fff', transformStyle:'preserve-3d', cursor:'default',
                '--rx':'0deg', '--ry':'0deg',
                transform:'rotateX(var(--rx)) rotateY(var(--ry))',
                transition:'transform 280ms cubic-bezier(0.23,1,0.32,1)',
              }}
            >
              PRASANNA.<br/>
              <span style={{ color:RED }}>KUMAR.</span><br/>
              SURENDRAN.
            </motion.h1>
          </div>

          {/* Subtext */}
          <div className="blur-fade-up" style={{ animationDelay:'400ms', marginBottom:28 }}>
            <p style={{ fontFamily:'Inter,Almarai,sans-serif', fontSize:'clamp(12px,1.4vw,15px)', color:'rgba(255,255,255,0.7)', lineHeight:1.55, margin:0, maxWidth:480 }}>
              We don't just detect threats —<br/>
              <strong style={{ color:'#fff' }}>we trace them to their source.</strong>
            </p>
          </div>

          {/* CTA row — liquid-glass pills, cinematic style */}
          <div className="blur-fade-up" style={{ animationDelay:'520ms', display:'flex', flexWrap:'wrap', alignItems:'center', gap:14, marginBottom:32 }}>
            <a href="#skills" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'#fff', color:'#000', borderRadius:9999, fontWeight:600,
              padding:'13px 28px', fontFamily:'Inter,Almarai,sans-serif', fontSize:13,
              textDecoration:'none', transition:'background 180ms cubic-bezier(0.23,1,0.32,1)',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='#e2e2e2'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}
            >
              <Play size={16} fill="#000"/> View My Work
            </a>
            <a href="mailto:prasanna80564@gmail.com" className="liquid-glass" style={{
              display:'inline-flex', alignItems:'center', gap:8, borderRadius:9999, fontWeight:500,
              padding:'13px 28px', fontFamily:'Inter,Almarai,sans-serif', fontSize:13,
              color:'#fff', textDecoration:'none',
            }}>
              Get In Touch <ArrowUpRight size={14}/>
            </a>
          </div>

          {/* Stats row */}
          <div className="blur-fade-up" style={{ animationDelay:'650ms', display:'flex', flexWrap:'wrap', gap:'12px 40px', paddingTop:24, borderTop:'1px solid rgba(255,255,255,0.1)' }}>
            {[
              { val:'12+',  label:'Cases Investigated' },
              { val:'847',  label:'IOCs Processed' },
              { val:'SC-200', label:'Microsoft Cert' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{ fontFamily:'FSP DEMO - PODIUM Sharp 4.11,Almarai,sans-serif', fontSize:'clamp(28px,3.5vw,44px)', fontWeight:800, color:'#fff', lineHeight:1, letterSpacing:'-0.02em' }}>{val}</div>
                <div style={{ fontFamily:'Inter,Almarai,sans-serif', fontSize:'9px', color:'rgba(255,255,255,0.45)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subtle red scan line */}
        <div aria-hidden style={{ position:'absolute', bottom:0, left:0, right:0, height:1, zIndex:20, background:`linear-gradient(90deg,transparent,${RED}88,transparent)` }}/>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE MENU OVERLAY
          ════════════════════════════════════════════════════════════════ */}
      <div style={{
        position:'fixed', inset:0, zIndex:50, background:'rgba(10,2,2,0.97)', backdropFilter:'blur(8px)',
        opacity: menuOpen ? 1 : 0,
        visibility: menuOpen ? 'visible' : 'hidden',
        transition:'opacity 400ms cubic-bezier(0.23,1,0.32,1), visibility 400ms',
        display:'flex', flexDirection:'column',
      }}>
        {/* Header row */}
        <div style={{ padding:'20px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'FSP DEMO - PODIUM Sharp 4.11,Almarai,sans-serif', fontWeight:700, fontSize:20, letterSpacing:'0.16em', textTransform:'uppercase', color:'#fff' }}>PRASANNA</span>
          <button onClick={() => setMenuOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#fff', padding:4 }} aria-label="Close menu">
            <X size={22}/>
          </button>
        </div>

        {/* Nav links */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:8, padding:24 }}>
          {[...NAV_LINKS, { label:'Contact', to:null }].map(({ label, to }, i) => (
            <div key={label}
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(20px)',
                transition:`opacity 400ms cubic-bezier(0.23,1,0.32,1) ${i*80+100}ms, transform 400ms cubic-bezier(0.23,1,0.32,1) ${i*80+100}ms`,
              }}
            >
              {to ? (
                <Link to={to} onClick={() => setMenuOpen(false)}
                  style={{ fontFamily:'FSP DEMO - PODIUM Sharp 4.11,Almarai,sans-serif', fontSize:'clamp(32px,8vw,52px)', fontWeight:800, color:'#fff', textDecoration:'none', textTransform:'uppercase', letterSpacing:'-0.02em', display:'block', textAlign:'center', transition:'color 180ms' }}
                >
                  {label}
                </Link>
              ) : (
                <a href="mailto:prasanna80564@gmail.com" onClick={() => setMenuOpen(false)}
                  style={{ fontFamily:'FSP DEMO - PODIUM Sharp 4.11,Almarai,sans-serif', fontSize:'clamp(32px,8vw,52px)', fontWeight:800, color:RED, textDecoration:'none', textTransform:'uppercase', letterSpacing:'-0.02em', display:'block', textAlign:'center' }}
                >
                  {label}
                </a>
              )}
            </div>
          ))}

          <div style={{
            marginTop:24,
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0)' : 'translateY(20px)',
            transition:`opacity 400ms cubic-bezier(0.23,1,0.32,1) 420ms, transform 400ms cubic-bezier(0.23,1,0.32,1) 420ms`,
          }}>
            <a href="mailto:prasanna80564@gmail.com" className="cta-border" onClick={() => setMenuOpen(false)}>
              GET IN TOUCH <ArrowUpRight size={13}/>
            </a>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          §2 FOCUS
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#0a0202', padding:'100px 32px', borderTop:`1px solid rgba(192,57,43,0.15)` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Area of Focus" title="What I do"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
            {[
              { Icon:Shield, c:'#EF4444', l:'Microsoft Sentinel · KQL', d:'SIEM rule authoring, threat hunting, SOC workflow automation and alert triage.' },
              { Icon:Brain,  c:RED,       l:'Incident Response', d:'End-to-end case lifecycle: triage, investigation, containment, evidence preservation.' },
              { Icon:Mail,   c:'#EAB308', l:'Email Forensics', d:'RFC header parsing, SPF/DKIM/DMARC analysis, AI phishing verdict with MITRE mapping.' },
              { Icon:Cpu,    c:'#22C55E', l:'Endpoint Security', d:'EDR operations, Sysmon telemetry, process tree analysis, lateral movement detection.' },
              { Icon:Activity,c:'#8FAFC0',l:'Threat Intelligence', d:'IOC enrichment, TTP attribution, MITRE ATT&CK Navigator, campaign correlation.' },
              { Icon:Code,   c:RED,       l:'React · FastAPI', d:'Full-stack security tooling. AegisTrace: React 18, FastAPI, PostgreSQL, Docker.' },
            ].map(({ Icon, c, l, d }, i) => (
              <Reveal key={l} delay={i*0.06}>
                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:22, borderLeft:`3px solid ${c}22` }}>
                  <Icon size={15} color={c} style={{ marginBottom:12 }}/>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:7 }}>{l}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.46)', lineHeight:1.55 }}>{d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §3 SKILLS
          ════════════════════════════════════════════════════════════════ */}
      <section id="skills" style={{ background:'#0d0303', padding:'100px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Technical Skills" title="Proficiency"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[['Microsoft Sentinel / KQL',88],['Email Forensics',85],['Incident Response',84],['MITRE ATT&CK',82]].map(([s,p],i) => (
                <SkillBar key={s} skill={s} pct={p} delay={i*0.08}/>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[['Threat Intelligence',80],['React / FastAPI',80],['Python (Security)',78],['AWS / Cloud',72]].map(([s,p],i) => (
                <SkillBar key={s} skill={s} pct={p} delay={i*0.08+0.32}/>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §4 CERTIFICATIONS
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#0a0202', padding:'100px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Certifications" title="Credentials"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
            <CertCard name="SC-200 — Microsoft Security Operations Analyst" issuer="Microsoft · 2025"     status="✓ CERTIFIED"      color="#2dd4bf" delay={0}/>
            <CertCard name="CompTIA Security+"                               issuer="CompTIA · 2024"      status="✓ CERTIFIED"      color="#EAB308" delay={0.08}/>
            <CertCard name="TCM Practical Ethical Hacking"                   issuer="TCM Security"        status="✓ CERTIFIED"      color="#8FAFC0" delay={0.16}/>
            <CertCard name="Blue Team Labs Level 1 (BTL1)"                   issuer="Security Blue Team"  status="55% IN PROGRESS"  color={RED}     delay={0.24}/>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §5 PROJECTS
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#0d0303', padding:'100px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Projects" title="What I've built"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:14 }}>
            <ProjectCard highlight
              title="AegisTrace — AI-powered SOC Platform"
              tags={['React 18','FastAPI','PostgreSQL','Docker','Three.js','MITRE ATT&CK']}
              desc="Full-stack security control plane: ITDR, 13-tab case management, 7-source IOC intel, email forensics, explainable AI, identity graph, DORA compliance, endpoint agent v5."
              url="https://github.com/Prasanna-27eng/AegisTrace"
              delay={0}
            />
            <ProjectCard
              title="WebSecGuard — Web Security Scanner"
              tags={['Python','OWASP','Burp Suite','FastAPI']}
              desc="Automated OWASP Top 10 scanner. Header analysis, CORS misconfiguration detection, injection testing, vulnerability reporting."
              delay={0.08}
            />
            <ProjectCard
              title="Grand Line SOC Dashboard"
              tags={['Kibana','Elastic SIEM','Python','KQL']}
              desc="Real-time SOC metrics dashboard. Elastic SIEM aggregation, correlation rules, threat scoring, analyst workload management."
              delay={0.16}
            />
            <ProjectCard
              title="Automated Cloud Security Posture"
              tags={['AWS','Python','boto3','IAM']}
              desc="Cloud security posture checks for AWS. IAM policy analysis, S3 ACL audits, Security Group misconfigs, CIS Benchmark scoring."
              delay={0.24}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §6 EDUCATION
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#0a0202', padding:'100px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Education" title="Academic background"/>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { deg:'MSc Cyber Security',               school:'Dublin Business School, Dublin, Ireland',       dates:'Sep 2024 – Sep 2025 (Expected)' },
              { deg:'B.E. Computer Science & Engineering', school:'PSG College of Technology, Coimbatore, India', dates:'2019 – 2023' },
            ].map(({ deg, school, dates }, i) => (
              <motion.div key={deg}
                initial={{ opacity:0, x:-16 }}
                whileInView={{ opacity:1, x:0 }}
                viewport={{ once:true }}
                transition={{ duration:0.65, delay:i*0.1, ease:E }}
                style={{ display:'flex', gap:20, padding:'24px 0', borderTop:'1px solid rgba(255,255,255,0.06)', alignItems:'flex-start' }}
              >
                <GraduationCap size={16} color={RED} style={{ flexShrink:0, marginTop:2 }}/>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:4, fontFamily:'FSP DEMO - PODIUM Sharp 4.11,Almarai,sans-serif', textTransform:'uppercase' }}>{deg}</div>
                  <div style={{ fontSize:12, color:'rgba(192,57,43,0.8)', marginBottom:3, ...MONO }}>{school}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', ...MONO }}>{dates}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §7 CONTACT CTA
          ════════════════════════════════════════════════════════════════ */}
      <section style={{ background:'#0d0303', padding:'100px 32px' }}>
        <div style={{ maxWidth:840, margin:'0 auto' }}>
          <Reveal>
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:0, padding:'72px 56px', textAlign:'center' }}>
              <div style={{ fontSize:9, color:'rgba(192,57,43,0.82)', ...MONO, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:20 }}>Open to opportunities</div>
              <h2 style={{ fontFamily:'FSP DEMO - PODIUM Sharp 4.11,Almarai,sans-serif', fontWeight:800, textTransform:'uppercase', fontSize:'clamp(28px,5vw,58px)', lineHeight:0.92, margin:'0 0 16px', letterSpacing:'-0.02em', color:'#fff' }}>
                LET'S BUILD<br/>
                <span style={{ color:RED }}>SOMETHING</span><br/>
                SECURE.
              </h2>
              <p style={{ fontFamily:'Inter,Almarai,sans-serif', fontSize:14, color:'rgba(255,255,255,0.48)', maxWidth:420, margin:'0 auto 40px', lineHeight:1.65, fontWeight:400 }}>
                Cyber security analyst specialising in identity threat detection and incident response. Based in Dublin. Available for analyst and engineering roles.
              </p>
              <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
                <a className="cta-black" href="mailto:prasanna80564@gmail.com">
                  prasanna80564@gmail.com
                  <ArrowUpRight size={14} className="arrow" style={{ flexShrink:0 }}/>
                </a>
                <a className="cta-border" href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer">
                  <Github size={13}/> GitHub
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:'#0a0202', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:10, margin:0, ...MONO, letterSpacing:'0.1em' }}>
            PRASANNA KUMAR SURENDRAN · DUBLIN · 2026
          </p>
          <div style={{ display:'flex', gap:24 }}>
            {[['AegisTrace','/'],['Mission','/mission'],['Platform','/app/login']].map(([l,h]) => (
              <Link key={l} to={h} style={{ color:'rgba(255,255,255,0.3)', textDecoration:'none', fontSize:11, fontFamily:'Inter,Almarai,sans-serif', letterSpacing:'0.1em' }}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
