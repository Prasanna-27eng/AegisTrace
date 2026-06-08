import React, { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────────
   AEGISTRACE — Main Landing Page
   Design system: Cinematic dark + warm cream (Prisma visual language)
   Fonts: Almarai (global) + Instrument Serif (italic accents)
   Motion: framer-motion with Emil Kowalski intentional easing
   Principles applied:
     • Strong ease-out cubic-bezier(0.23,1,0.32,1) — "instant response"
     • scale(0.97) on :active — "buttons must feel responsive to press"
     • Elements enter from scale(0.95)+opacity:0 — "nothing appears from nothing"
     • Hover gated on (hover:hover) and (pointer:fine)
     • prefers-reduced-motion: replace movement with crossfades
     • Stagger delays 50-80ms max — "decorative, never blocking"
   ───────────────────────────────────────────────────────────────────────────── */

const EASE_OUT  = [0.23, 1, 0.32, 1];
const EASE_CARD = [0.22, 1, 0.36, 1];

/* ── WordsPullUp ─────────────────────────────────────────────────────────── */
function WordsPullUp({ text, className = '', showAsterisk = false }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const words  = text.split(' ');
  return (
    <span ref={ref} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0 0.28em' }} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} style={{ overflow: 'hidden', display: 'inline-flex' }}>
          <motion.span
            className={`inline-block relative ${className}`}
            initial={{ y: '110%', opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: i * 0.08, ease: EASE_OUT }}
          >
            {word}
            {showAsterisk && i === words.length - 1 && (
              <sup style={{ position: 'absolute', top: '0.65em', right: '-0.3em', fontSize: '0.31em', fontWeight: 300 }}>*</sup>
            )}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ── WordsPullUpMultiStyle ───────────────────────────────────────────────── */
function WordsPullUpMultiStyle({ segments }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const allWords = segments.flatMap(({ text, style, className }) =>
    text.split(' ').filter(Boolean).map(word => ({ word, style, className }))
  );
  return (
    <span ref={ref} style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.28em' }}>
      {allWords.map(({ word, style, className }, i) => (
        <span key={i} style={{ overflow: 'hidden', display: 'inline-flex' }}>
          <motion.span
            className={className || ''}
            style={{ display: 'inline-block', ...style }}
            initial={{ y: '110%', opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: i * 0.07, ease: EASE_OUT }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ── ScrollRevealParagraph ───────────────────────────────────────────────── */
function AnimatedChar({ char, scrollYProgress, index, total }) {
  const p = index / total;
  const opacity = useTransform(scrollYProgress, [Math.max(0, p - 0.12), Math.min(1, p + 0.04)], [0.12, 1]);
  return <motion.span style={{ opacity, display: 'inline' }}>{char}</motion.span>;
}

function ScrollRevealParagraph({ text, sectionRef }) {
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 0.85', 'end 0.15'] });
  return (
    <p style={{ color: '#DEDBC8', lineHeight: 1.65, margin: 0 }}>
      {text.split('').map((char, i) => (
        <AnimatedChar key={i} char={char} scrollYProgress={scrollYProgress} index={i} total={text.length} />
      ))}
    </p>
  );
}

/* ── FeatureCard ─────────────────────────────────────────────────────────── */
function FeatureCard({ children, delay = 0, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.95, opacity: 0, y: 16 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: EASE_CARD }}
      style={{ borderRadius: 20, overflow: 'hidden', ...style }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const aboutRef = useRef(null);

  return (
    <div style={{ background: '#000', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Instrument+Serif:ital@1&display=swap');
        body,*{font-family:'Almarai',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
        .at-serif{font-family:'Instrument Serif',serif;font-style:italic;}
        .at-noise-hero{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-repeat:repeat;background-size:200px;}
        .at-noise-section{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-repeat:repeat;background-size:200px;}
        .at-btn{display:inline-flex;align-items:center;gap:8px;background:#DEDBC8;border-radius:9999px;padding:10px 14px 10px 22px;text-decoration:none;font-weight:700;font-size:14px;color:#000;border:none;cursor:pointer;transition:transform 160ms cubic-bezier(0.23,1,0.32,1),gap 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-btn:active{transform:scale(0.97);}
        .at-circle{background:#000;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-nav{font-size:12px;color:rgba(225,224,204,0.8);text-decoration:none;white-space:nowrap;transition:color 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-chk{display:flex;align-items:flex-start;gap:8px;padding:5px 0;}
        .at-learn{display:flex;align-items:center;gap:6px;font-size:13px;color:#666;text-decoration:none;opacity:.7;transition:opacity 200ms cubic-bezier(0.23,1,0.32,1);}
        .at-fcard{padding:24px;height:100%;min-height:480px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px;background:#161616;transition:background 200ms cubic-bezier(0.23,1,0.32,1);}
        @media(hover:hover)and(pointer:fine){
          .at-btn:hover{gap:14px;}
          .at-btn:hover .at-circle{transform:scale(1.1);}
          .at-nav:hover{color:#E1E0CC!important;}
          .at-learn:hover{opacity:1!important;}
          .at-fcard:hover{background:#1c1c1c!important;}
        }
        @media(prefers-reduced-motion:reduce){
          .at-btn{transition:opacity 200ms;}
          .at-btn:active{transform:none;opacity:.8;}
        }
      `}</style>

      {/* ═══ HERO ═════════════════════════════════════════════════════════ */}
      <section style={{ height: '100vh', padding: 16, boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden' }}>
          <video
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
            autoPlay loop muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div className="at-noise-hero" style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.65, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(to bottom,rgba(0,0,0,.28) 0%,transparent 38%,rgba(0,0,0,.65) 100%)' }} />

          {/* Navbar */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
            <nav style={{ background: '#000', borderRadius: '0 0 24px 24px', padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 56 }}>
              {['Our story', 'Platform', 'Agents', 'Enterprise'].map(item => (
                <a key={item} href="#" className="at-nav">{item}</a>
              ))}
              <Link to="/login" className="at-nav">Login</Link>
            </nav>
          </div>

          {/* Bottom content */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '0 28px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 24, alignItems: 'flex-end' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(130px, 19vw, 280px)', fontWeight: 500, lineHeight: 0.85, letterSpacing: '-0.07em', color: '#E1E0CC' }}>
                <WordsPullUp text="AegisTrace" showAsterisk />
              </h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 6 }}>
                <motion.p
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.55, ease: EASE_OUT }}
                  style={{ color: 'rgba(222,219,200,.72)', fontSize: 14, lineHeight: 1.3, margin: 0, fontWeight: 300 }}
                >
                  A worldwide network of security engineers, AI researchers and threat hunters — bound not by perimeter, but by the relentless pursuit to detect, trace and eliminate threats before they land.
                </motion.p>
                <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.75, ease: EASE_OUT }}>
                  <Link to="/login" className="at-btn">
                    Enter the platform
                    <span className="at-circle"><ArrowRight size={15} color="#DEDBC8" /></span>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ABOUT ════════════════════════════════════════════════════════ */}
      <section ref={aboutRef} style={{ background: '#000', padding: '120px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', background: '#101010', borderRadius: 28, padding: 'clamp(48px,8vw,96px)', textAlign: 'center' }}>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            style={{ fontSize: 11, color: '#DEDBC8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 28, fontWeight: 300 }}
          >
            Security Intelligence
          </motion.p>

          <h2 style={{ fontSize: 'clamp(28px,5.5vw,72px)', lineHeight: 0.95, fontWeight: 400, maxWidth: 820, margin: '0 auto 48px', letterSpacing: '-0.03em' }}>
            <WordsPullUpMultiStyle segments={[
              { text: 'We built AegisTrace', style: { color: '#E1E0CC', fontWeight: 400 } },
              { text: 'to make the invisible,', className: 'at-serif', style: { color: '#E1E0CC' } },
              { text: 'visible.', className: 'at-serif', style: { color: '#E1E0CC' } },
              { text: 'AI that detects threats before analysts can blink.', style: { color: '#E1E0CC', fontWeight: 300 } },
            ]} />
          </h2>

          <div style={{ maxWidth: 680, margin: '0 auto', fontSize: 'clamp(13px,1.5vw,16px)' }}>
            <ScrollRevealParagraph
              text="Over three years we have worked alongside the world's most demanding security teams — Fortune 100 enterprises, national CERTs, and elite red teams. Together we built something that stops what others miss: AegisTrace, the autonomous threat intelligence and response platform."
              sectionRef={aboutRef}
            />
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═════════════════════════════════════════════════════ */}
      <section style={{ background: '#000', padding: '80px 24px 120px', position: 'relative' }}>
        <div className="at-noise-section" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.12 }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(22px,3.5vw,44px)', fontWeight: 400, lineHeight: 1.1, margin: 0 }}>
            <WordsPullUpMultiStyle segments={[
              { text: 'Detection workflows for security teams that move fast.', style: { color: '#E1E0CC', display: 'block' } },
              { text: 'Autonomous by design. Precise by necessity.', style: { color: '#555', display: 'block', marginTop: '0.3em' } },
            ]} />
          </h2>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>

          {/* Video card */}
          <FeatureCard delay={0} style={{ minHeight: 480 }}>
            <div style={{ position: 'relative', height: '100%', minHeight: 480 }}>
              <video src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4" autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%)' }} />
              <p style={{ position: 'absolute', bottom: 20, left: 20, color: '#E1E0CC', fontSize: 16, fontWeight: 500, margin: 0 }}>Your threat canvas.</p>
            </div>
          </FeatureCard>

          {/* Card 2 */}
          <FeatureCard delay={0.12}>
            <div className="at-fcard">
              <img src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85" alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
              <div><span style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em' }}>01</span><h3 style={{ fontSize: 18, fontWeight: 600, color: '#E1E0CC', margin: '6px 0 0' }}>Autonomous Detection.</h3></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Real-time signal correlation across 50+ data sources','AI agents that triage alerts without analyst intervention','Behavioral baselines updated every 15 minutes','Zero-day pattern recognition from provenance graphs'].map((item, i) => (
                  <div key={i} className="at-chk"><Check size={14} color="#DEDBC8" style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>{item}</span></div>
                ))}
              </div>
              <a href="#" className="at-learn">Learn more <ArrowRight size={13} style={{ transform: 'rotate(-45deg)' }} /></a>
            </div>
          </FeatureCard>

          {/* Card 3 */}
          <FeatureCard delay={0.24}>
            <div className="at-fcard">
              <img src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85" alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
              <div><span style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em' }}>02</span><h3 style={{ fontSize: 18, fontWeight: 600, color: '#E1E0CC', margin: '6px 0 0' }}>AI Agent Mesh.</h3></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Multi-agent investigation across identity, network, and endpoint','Natural-language threat summaries with chain of evidence','Integrates with CrowdStrike, SentinelOne, Splunk, and 40+ tools'].map((item, i) => (
                  <div key={i} className="at-chk"><Check size={14} color="#DEDBC8" style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>{item}</span></div>
                ))}
              </div>
              <a href="#" className="at-learn">Learn more <ArrowRight size={13} style={{ transform: 'rotate(-45deg)' }} /></a>
            </div>
          </FeatureCard>

          {/* Card 4 */}
          <FeatureCard delay={0.36}>
            <div className="at-fcard">
              <img src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85" alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
              <div><span style={{ fontSize: 11, color: '#444', letterSpacing: '0.1em' }}>03</span><h3 style={{ fontSize: 18, fontWeight: 600, color: '#E1E0CC', margin: '6px 0 0' }}>Immersive Response.</h3></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Silent non-critical alerts during active investigations','Ambient threat cues — auditory severity indicators','Auto-schedules analyst shifts around incident windows'].map((item, i) => (
                  <div key={i} className="at-chk"><Check size={14} color="#DEDBC8" style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>{item}</span></div>
                ))}
              </div>
              <a href="#" className="at-learn">Learn more <ArrowRight size={13} style={{ transform: 'rotate(-45deg)' }} /></a>
            </div>
          </FeatureCard>
        </div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════════════════ */}
      <footer style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,.06)', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#333', fontSize: 12, margin: 0, letterSpacing: '0.08em' }}>
          © 2026 AegisTrace — All threats traced.
        </p>
      </footer>
    </div>
  );
}
