import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Shield, Brain, Terminal, GitMerge, Activity,
         Award, Code, MapPin, GraduationCap, Mail, Github,
         ExternalLink, ChevronRight, Cpu, Globe, Lock,
         Layers, TrendingUp, Zap, Eye, Server, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════════════════
   AEGISTRACE PORTFOLIO — Cyberpunk Command Center
   Three.js procedural city · Mission-control HUD · framer-motion
   Emil Kowalski easing [0.23, 1, 0.32, 1] · Impeccable layout
   ═══════════════════════════════════════════════════════════════════════════ */

const E    = [0.23, 1, 0.32, 1];
const EC   = [0.22, 1, 0.36, 1];
const TEAL = '#2dd4bf';
const DIM  = 'rgba(45,212,191,0.65)';
const BG   = '#020a10';
const MONO = { fontFamily:'JetBrains Mono,monospace' };

/* ──────────────────────────────────────────────────────────────────────────
   THREE.JS 3D CITY BACKGROUND
   Procedural buildings, particle system, rotating camera
   ─────────────────────────────────────────────────────────────────────── */
function CityCanvas() {
  const mountRef = useRef(null);
  const animRef  = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (failed) return;
    let THREE;
    try { THREE = require('three'); } catch { setFailed(true); return; }

    const container = mountRef.current;
    if (!container) return;

    let renderer, scene, camera, frame;

    try {
      /* ── Renderer ── */
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setClearColor(0x020a10, 1);
      container.appendChild(renderer.domElement);

      /* ── Scene ── */
      scene  = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x020a10, 0.022);

      /* ── Camera ── */
      camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 400);
      camera.position.set(0, 22, 52);
      camera.lookAt(0, 4, 0);

      /* ── Ambient + directional lights ── */
      scene.add(new THREE.AmbientLight(0x0a1520, 1.4));
      const dirLight = new THREE.DirectionalLight(0x2dd4bf, 1.8);
      dirLight.position.set(8, 18, 12);
      scene.add(dirLight);
      const redLight = new THREE.PointLight(0xff2200, 3.2, 60);
      redLight.position.set(-18, 8, 0);
      scene.add(redLight);
      const blueLight = new THREE.PointLight(0x003366, 2.2, 50);
      blueLight.position.set(18, 6, -10);
      scene.add(blueLight);

      /* ── Ground grid ── */
      const grid = new THREE.GridHelper(120, 40, 0x0d3030, 0x061515);
      grid.position.y = -0.05;
      scene.add(grid);

      /* ── Procedural city ── */
      const buildingMat = new THREE.MeshLambertMaterial({ color:0x0a1a1a });
      const glowMat     = new THREE.MeshBasicMaterial({ color:0x2dd4bf, wireframe:true });
      const redMat      = new THREE.MeshBasicMaterial({ color:0xff3300, wireframe:true });

      const GRID = 9;
      const SPACING = 8;
      const buildingGroup = new THREE.Group();
      for (let x = -GRID; x <= GRID; x += 2) {
        for (let z = -GRID; z <= GRID; z += 2) {
          const w  = 1.2 + Math.random() * 2;
          const d  = 1.2 + Math.random() * 2;
          const h  = 2   + Math.random() * 18;
          const bx = x * SPACING * 0.5 + (Math.random() - 0.5) * 2;
          const bz = z * SPACING * 0.5 + (Math.random() - 0.5) * 2;

          const geo  = new THREE.BoxGeometry(w, h, d);
          const mesh = new THREE.Mesh(geo, buildingMat.clone());
          mesh.position.set(bx, h/2, bz);
          buildingGroup.add(mesh);

          /* glowing top edges */
          const edges    = new THREE.EdgesGeometry(geo);
          const mat      = Math.random() > 0.7 ? redMat : glowMat;
          const wireframe = new THREE.LineSegments(edges, mat);
          wireframe.position.copy(mesh.position);
          wireframe.material = wireframe.material.clone();
          wireframe.material.opacity = 0.06 + Math.random() * 0.14;
          wireframe.material.transparent = true;
          buildingGroup.add(wireframe);
        }
      }
      scene.add(buildingGroup);

      /* ── Particle data nodes ── */
      const PARTICLES = 420;
      const pPositions = new Float32Array(PARTICLES * 3);
      for (let i = 0; i < PARTICLES; i++) {
        pPositions[i*3]   = (Math.random() - 0.5) * 90;
        pPositions[i*3+1] = Math.random() * 30;
        pPositions[i*3+2] = (Math.random() - 0.5) * 90;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      const pMat = new THREE.PointsMaterial({ color:0x2dd4bf, size:0.28, transparent:true, opacity:0.7 });
      scene.add(new THREE.Points(pGeo, pMat));

      /* ── Floating data lines (vertical) ── */
      for (let i = 0; i < 18; i++) {
        const x = (Math.random() - 0.5) * 70;
        const z = (Math.random() - 0.5) * 70;
        const h = 2 + Math.random() * 12;
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, 0, z),
          new THREE.Vector3(x, h, z),
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: Math.random() > 0.5 ? 0x2dd4bf : 0xff3300, transparent:true, opacity:0.35 });
        scene.add(new THREE.Line(lineGeo, lineMat));
      }

      /* ── Animate ── */
      let t = 0;
      const animate = () => {
        frame = requestAnimationFrame(animate);
        t += 0.005;
        camera.position.x = Math.sin(t * 0.3) * 22;
        camera.position.z = 52 + Math.cos(t * 0.2) * 10;
        camera.position.y = 22 + Math.sin(t * 0.18) * 4;
        camera.lookAt(0, 4, 0);
        buildingGroup.rotation.y = t * 0.02;
        renderer.render(scene, camera);
      };
      animate();

      /* ── Resize ── */
      const onResize = () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', onResize);

      animRef.current = { frame, cleanup: () => {
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(frame);
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      }};
    } catch {
      setFailed(true);
    }

    return () => {
      if (animRef.current?.cleanup) animRef.current.cleanup();
    };
  }, [failed]);

  if (failed) {
    return (
      <div aria-hidden style={{ position:'absolute', inset:0, background:BG }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(45,212,191,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(45,212,191,0.12) 1px,transparent 1px)', backgroundSize:'60px 60px' }}/>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 50% at 50% 60%,rgba(45,212,191,0.2) 0%,transparent 65%)' }}/>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 130% 130% at 50% 50%,transparent 35%,rgba(2,10,16,0.95) 100%)' }}/>
        <div style={{ position:'absolute', left:0, right:0, height:2, top:0, background:'linear-gradient(90deg,transparent,rgba(45,212,191,0.9) 50%,transparent)', animation:'scan 6s linear infinite' }}/>
        <style>{`@keyframes scan{0%{top:-2px}100%{top:100%}}`}</style>
      </div>
    );
  }

  return <div ref={mountRef} aria-hidden style={{ position:'absolute', inset:0 }}/>;
}

/* ──────────────────────────────────────────────────────────────────────────
   HUD COMPONENTS — mission-control sci-fi overlays
   ─────────────────────────────────────────────────────────────────────── */
function HudCorner({ pos }) {
  const corners = {
    'tl': { top:16, left:16, borderTop:`2px solid ${TEAL}`, borderLeft:`2px solid ${TEAL}` },
    'tr': { top:16, right:16, borderTop:`2px solid ${TEAL}`, borderRight:`2px solid ${TEAL}` },
    'bl': { bottom:16, left:16, borderBottom:`2px solid ${TEAL}`, borderLeft:`2px solid ${TEAL}` },
    'br': { bottom:16, right:16, borderBottom:`2px solid ${TEAL}`, borderRight:`2px solid ${TEAL}` },
  };
  return <div aria-hidden style={{ position:'absolute', width:22, height:22, ...corners[pos], zIndex:10 }}/>;
}

function HudStatus() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t+1), 1200); return () => clearInterval(id); }, []);
  return (
    <div aria-hidden style={{ position:'absolute', bottom:24, left:24, zIndex:10, display:'flex', flexDirection:'column', gap:4 }}>
      {[
        { k:'SYS', v:'OPERATIONAL', c:TEAL },
        { k:'TGT', v:`33.0486°N 35.0456°E`, c:DIM },
        { k:'SEQ', v:String(tick).padStart(4,'0'), c:DIM },
      ].map(({ k,v,c }) => (
        <div key={k} style={{ display:'flex', gap:8, fontSize:9, ...MONO }}>
          <span style={{ color:'rgba(45,212,191,0.45)', letterSpacing:'0.1em' }}>{k}</span>
          <span style={{ color:c, letterSpacing:'0.07em' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function HudRadar() {
  return (
    <div aria-hidden style={{ position:'absolute', top:72, right:24, width:72, height:72, zIndex:10 }}>
      <div style={{ width:'100%', height:'100%', border:`1px solid rgba(45,212,191,0.3)`, borderRadius:'50%', position:'relative' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', width:'66%', height:'66%', transform:'translate(-50%,-50%)', border:`1px solid rgba(45,212,191,0.18)`, borderRadius:'50%' }}/>
        <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'rgba(45,212,191,0.15)', marginTop:-0.5 }}/>
        <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:'rgba(45,212,191,0.15)', marginLeft:-0.5 }}/>
        {/* Rotating sweep */}
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', overflow:'hidden' }}>
          <div style={{
            position:'absolute', top:'50%', left:'50%', width:'50%', height:2, transformOrigin:'0% 50%',
            background:`linear-gradient(90deg,rgba(45,212,191,0.6),transparent)`,
            animation:'radar-sweep 3s linear infinite',
          }}/>
        </div>
        {/* Blips */}
        {[[55,30],[20,60],[70,68]].map(([x,y],i) => (
          <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:3, height:3, borderRadius:'50%', background:TEAL, boxShadow:`0 0 4px ${TEAL}`, transform:'translate(-50%,-50%)' }}/>
        ))}
      </div>
      <style>{`@keyframes radar-sweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   TERMINAL WINDOW
   ─────────────────────────────────────────────────────────────────────── */
function TerminalWindow({ lines }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const id = setTimeout(() => setShown(s => s+1), 80);
    return () => clearTimeout(id);
  }, [shown, lines.length]);
  return (
    <div style={{ background:'rgba(0,0,0,0.7)', border:'1px solid rgba(45,212,191,0.2)', borderRadius:10, overflow:'hidden', backdropFilter:'blur(12px)' }}>
      <div style={{ padding:'8px 14px', borderBottom:'1px solid rgba(45,212,191,0.1)', display:'flex', gap:6, alignItems:'center' }}>
        {['#EF4444','#EAB308','#22C55E'].map(c => <div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c }}/>)}
        <span style={{ fontSize:10, color:'rgba(45,212,191,0.45)', ...MONO, marginLeft:6, letterSpacing:'0.08em' }}>aegistrace :: analyst terminal</span>
      </div>
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:3 }}>
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} style={{ fontSize:11, ...MONO, color: l.startsWith('>') ? TEAL : l.startsWith('#') ? 'rgba(45,212,191,0.45)' : 'rgba(225,224,204,0.7)', lineHeight:1.5 }}>
            {l}
          </div>
        ))}
        {shown < lines.length && <div style={{ fontSize:11, ...MONO, color:TEAL }}>▊</div>}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SKILL BAR
   ─────────────────────────────────────────────────────────────────────── */
function SkillBar({ skill, pct, delay=0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true });
  return (
    <div ref={ref} style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
        <span style={{ color:'rgba(225,224,204,0.8)' }}>{skill}</span>
        <span style={{ ...MONO, color:TEAL }}>{pct}%</span>
      </div>
      <div style={{ height:3, background:'rgba(45,212,191,0.08)', borderRadius:9999, overflow:'hidden' }}>
        <motion.div
          initial={{ width:0 }}
          animate={inView ? { width:`${pct}%` } : {}}
          transition={{ duration:1.1, delay, ease:E }}
          style={{ height:'100%', background:`linear-gradient(90deg,${TEAL},rgba(45,212,191,0.6))`, borderRadius:9999 }}
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
      initial={{ scale:0.95, opacity:0 }}
      animate={inView ? { scale:1, opacity:1 } : {}}
      transition={{ duration:0.6, delay, ease:EC }}
      style={{ background:'rgba(4,14,22,0.85)', border:`1px solid ${color}22`, borderRadius:12, padding:18, borderLeft:`3px solid ${color}` }}
    >
      <div style={{ fontSize:11, fontWeight:700, color:'#E1E0CC', marginBottom:4, lineHeight:1.3 }}>{name}</div>
      <div style={{ fontSize:10, color:'rgba(225,224,204,0.45)', marginBottom:8, ...MONO }}>{issuer}</div>
      <div style={{ display:'inline-flex', padding:'3px 8px', borderRadius:9999, background:`${color}18`, fontSize:9, color, ...MONO, letterSpacing:'0.08em' }}>
        {status}
      </div>
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
      initial={{ scale:0.95, opacity:0, y:16 }}
      animate={inView ? { scale:1, opacity:1, y:0 } : {}}
      transition={{ duration:0.65, delay, ease:EC }}
      style={{ background: highlight ? 'rgba(45,212,191,0.06)' : 'rgba(4,14,22,0.85)', border:`1px solid ${highlight ? 'rgba(45,212,191,0.22)' : 'rgba(255,255,255,0.06)'}`, borderRadius:14, padding:22, position:'relative', overflow:'hidden' }}
    >
      {highlight && (
        <div style={{ position:'absolute', top:12, right:12, fontSize:9, color:TEAL, ...MONO, letterSpacing:'0.1em', background:'rgba(45,212,191,0.1)', padding:'3px 8px', borderRadius:9999 }}>
          FLAGSHIP
        </div>
      )}
      <div style={{ fontSize:14, fontWeight:700, color:'#E1E0CC', marginBottom:8, paddingRight:highlight?64:0, lineHeight:1.25 }}>{title}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
        {tags.map(t => (
          <span key={t} style={{ fontSize:9, color:'rgba(45,212,191,0.7)', border:'1px solid rgba(45,212,191,0.2)', borderRadius:9999, padding:'2px 8px', ...MONO }}>{t}</span>
        ))}
      </div>
      <div style={{ fontSize:12, color:'rgba(225,224,204,0.5)', lineHeight:1.55, marginBottom:url?12:0 }}>{desc}</div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:TEAL, textDecoration:'none' }}>
          View project <ExternalLink size={10}/>
        </a>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SECTION HEADING
   ─────────────────────────────────────────────────────────────────────── */
function SH({ label, title }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:20 }}
      animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.7, ease:E }}
      style={{ marginBottom:36 }}
    >
      <div style={{ fontSize:9, color:'rgba(45,212,191,0.7)', ...MONO, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:10 }}>{label}</div>
      <h2 style={{ fontSize:'clamp(22px,3.5vw,40px)', fontWeight:700, color:'#E1E0CC', margin:0, letterSpacing:'-0.02em', lineHeight:1.1 }}>{title}</h2>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   MAIN PORTFOLIO
═════════════════════════════════════════════════════════════════════════ */
export default function Portfolio() {
  const TERM_LINES = [
    '# aegistrace :: analyst terminal v2.0',
    '> whoami',
    'prasanna_kumar_surendran',
    '> status',
    'LOCATION   :: Dublin, Ireland',
    'ROLE       :: Cyber Security Analyst',
    'FOCUS      :: Identity Threat Detection · Incident Response',
    'CERT       :: SC-200 Microsoft Security Operations Analyst',
    '> project --active',
    'AegisTrace v4.2 :: LIVE  [aegistraceproject.onrender.com]',
    '> scan --identity-threats --live',
    'Scanning... 847 IOCs processed · 12 cases · 3 critical',
    '> _',
  ];

  return (
    <div style={{ background:BG, overflowX:'hidden', color:'#E1E0CC', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Instrument+Serif:ital@1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;font-family:'Almarai',-apple-system,sans-serif;}
        .serif{font-family:'Instrument Serif',serif;font-style:italic;}
        .label{font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(45,212,191,0.72);}

        .cta{display:inline-flex;align-items:center;gap:10px;background:#2dd4bf;border-radius:9999px;padding:10px 14px 10px 22px;border:none;cursor:pointer;font-weight:700;font-size:13px;color:#000;transition:gap 180ms cubic-bezier(0.23,1,0.32,1);}
        .cta .circle{background:#000;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform 180ms cubic-bezier(0.23,1,0.32,1);}
        .cta:hover{gap:15px;} .cta:hover .circle{transform:scale(1.1);}

        .ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;border-radius:9999px;padding:10px 22px;border:1px solid rgba(45,212,191,0.22);color:rgba(45,212,191,0.7);font-size:13px;cursor:pointer;text-decoration:none;transition:all 180ms cubic-bezier(0.23,1,0.32,1);}
        .ghost:hover{color:#2dd4bf;border-color:rgba(45,212,191,0.45);}

        .nl{font-size:12px;color:rgba(225,224,204,0.62);text-decoration:none;transition:color 180ms cubic-bezier(0.23,1,0.32,1);}
        .nl:hover{color:#E1E0CC;}

        @media(prefers-reduced-motion:reduce){*[style*="animation"]{animation:none!important;}}
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ height:'100vh', padding:16, position:'relative' }}>
        <div style={{ position:'relative', width:'100%', height:'100%', borderRadius:28, overflow:'hidden' }}>

          <CityCanvas />

          {/* Gradient overlay */}
          <div aria-hidden style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(2,10,16,0.1) 0%,transparent 30%,rgba(2,10,16,0.75) 100%)', zIndex:2 }}/>

          {/* HUD corners */}
          {['tl','tr','bl','br'].map(p => <HudCorner key={p} pos={p}/>)}
          <HudStatus/>
          <HudRadar/>

          {/* Navbar */}
          <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', zIndex:20 }}>
            <nav style={{ background:'rgba(2,10,16,0.92)', backdropFilter:'blur(16px)', borderRadius:'0 0 22px 22px', padding:'12px 32px', display:'flex', gap:36, alignItems:'center' }}>
              <Link to="/"          className="nl">← Back</Link>
              <Link to="/mission"   className="nl">Mission</Link>
              <Link to="/app/login" className="nl" style={{ color:'#2dd4bf' }}>Platform →</Link>
            </nav>
          </div>

          {/* Hero content */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20, padding:'0 32px 32px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, alignItems:'flex-end' }}>
              <div>
                <motion.div
                  initial={{ opacity:0, y:20 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ duration:0.65, delay:0.2, ease:E }}
                  style={{ fontSize:9, color:'rgba(45,212,191,0.72)', ...MONO, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:12 }}
                >
                  Cyber Security Analyst · Dublin, Ireland
                </motion.div>
                <h1 style={{ margin:0, fontSize:'clamp(48px,7vw,100px)', fontWeight:800, lineHeight:0.88, letterSpacing:'-0.04em', color:'#E1E0CC' }}>
                  <motion.span
                    initial={{ y:60, opacity:0 }}
                    animate={{ y:0, opacity:1 }}
                    transition={{ duration:0.78, delay:0.3, ease:E }}
                    style={{ display:'block' }}
                  >
                    Prasanna
                  </motion.span>
                  <motion.span
                    initial={{ y:60, opacity:0 }}
                    animate={{ y:0, opacity:1 }}
                    transition={{ duration:0.78, delay:0.42, ease:E }}
                    style={{ display:'block', color:TEAL }}
                  >
                    Kumar
                  </motion.span>
                </h1>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:16, paddingBottom:8 }}>
                <TerminalWindow lines={TERM_LINES}/>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <motion.a
                    className="cta"
                    href="mailto:prasanna80564@gmail.com"
                    initial={{ y:16, opacity:0 }}
                    animate={{ y:0, opacity:1 }}
                    transition={{ duration:0.65, delay:1.2, ease:E }}
                    whileTap={{ scale:0.97 }}
                  >
                    CONTACT ME
                    <span className="circle"><ArrowUpRight size={13}/></span>
                  </motion.a>
                  <motion.a
                    className="ghost"
                    href="https://github.com/Prasanna-27eng"
                    target="_blank" rel="noopener noreferrer"
                    initial={{ y:16, opacity:0 }}
                    animate={{ y:0, opacity:1 }}
                    transition={{ duration:0.65, delay:1.4, ease:E }}
                  >
                    <Github size={13}/> GitHub
                  </motion.a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOCUS ────────────────────────────────────────────────────────── */}
      <section style={{ background:'rgba(4,10,18,0.98)', padding:'100px 24px', borderTop:'1px solid rgba(45,212,191,0.1)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Area of Focus" title="Identity-centric security operations"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
            {[
              { Icon:Shield,      l:'Microsoft Sentinel',  d:'KQL threat hunting, SIEM rule authoring, SOC workflow automation and alert triage.', c:TEAL },
              { Icon:Mail,        l:'Email Forensics',     d:'RFC header parsing, SPF/DKIM/DMARC analysis, phishing verdict with MITRE mapping.', c:'#EAB308' },
              { Icon:Activity,    l:'Incident Response',   d:'End-to-end case lifecycle: triage, investigation, containment, evidence preservation.', c:'#EF4444' },
              { Icon:Cpu,         l:'Endpoint Security',   d:'EDR operations, Sysmon telemetry, process tree analysis, lateral movement detection.', c:TEAL },
              { Icon:Brain,       l:'Threat Intelligence', d:'IOC enrichment, TTP attribution, MITRE ATT&CK Navigator, campaign correlation.', c:'#8FAFC0' },
              { Icon:Code,        l:'React · FastAPI',     d:'Full-stack security tooling. AegisTrace built with React 18, FastAPI, PostgreSQL, Docker.', c:'#22C55E' },
            ].map(({ Icon, l, d, c }, i) => (
              <motion.div key={l}
                initial={{ scale:0.94, opacity:0 }}
                whileInView={{ scale:1, opacity:1 }}
                viewport={{ once:true, margin:'-60px' }}
                transition={{ duration:0.6, delay:i*0.06, ease:EC }}
                style={{ background:'rgba(4,14,22,0.8)', border:`1px solid rgba(255,255,255,0.05)`, borderRadius:14, padding:22, borderLeft:`3px solid ${c}25` }}
              >
                <Icon size={16} color={c} style={{ marginBottom:12 }}/>
                <div style={{ fontSize:13, fontWeight:700, color:'#E1E0CC', marginBottom:7 }}>{l}</div>
                <div style={{ fontSize:12, color:'rgba(225,224,204,0.48)', lineHeight:1.55 }}>{d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SKILLS ───────────────────────────────────────────────────────── */}
      <section style={{ background:BG, padding:'100px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Technical Skills" title="Proficiency overview"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[
                ['Microsoft Sentinel / KQL', 88],
                ['Email Forensics',           85],
                ['Incident Response',         84],
                ['MITRE ATT&CK',              82],
              ].map(([s,p], i) => <SkillBar key={s} skill={s} pct={p} delay={i*0.08}/>)}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[
                ['Threat Intelligence',  80],
                ['React / FastAPI',      80],
                ['Python (Security)',    78],
                ['AWS / Cloud',         72],
              ].map(([s,p], i) => <SkillBar key={s} skill={s} pct={p} delay={i*0.08+0.32}/>)}
            </div>
          </div>
        </div>
      </section>

      {/* ── CERTIFICATIONS ───────────────────────────────────────────────── */}
      <section style={{ background:'rgba(4,10,18,0.98)', padding:'100px 24px', borderTop:'1px solid rgba(45,212,191,0.08)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Certifications" title="Credentials & active studies"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
            <CertCard name="SC-200 — Microsoft Security Operations Analyst" issuer="Microsoft · 2025" status="✓ CERTIFIED" color={TEAL}   delay={0}/>
            <CertCard name="CompTIA Security+"                               issuer="CompTIA · 2024"    status="✓ CERTIFIED" color="#EAB308" delay={0.08}/>
            <CertCard name="TCM Practical Ethical Hacking"                   issuer="TCM Security"      status="✓ CERTIFIED" color="#8FAFC0" delay={0.16}/>
            <CertCard name="Blue Team Labs Level 1 (BTL1)"                   issuer="Security Blue Team" status="55% IN PROGRESS" color="#EF4444" delay={0.24}/>
          </div>
        </div>
      </section>

      {/* ── PROJECTS ─────────────────────────────────────────────────────── */}
      <section style={{ background:BG, padding:'100px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Projects" title="Security tooling I've built"/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
            <ProjectCard
              highlight
              title="AegisTrace — AI-powered SOC Platform"
              tags={['React 18','FastAPI','PostgreSQL','Docker','Three.js','MITRE ATT&CK']}
              desc="Full-stack security control plane: ITDR with 4 live detectors, 13-tab case management, 7-source IOC intel, email forensics, explainable AI (Groq), identity graph, DORA compliance, endpoint agent v5. Zero licensing cost."
              url="https://github.com/Prasanna-27eng/AegisTrace"
              delay={0}
            />
            <ProjectCard
              title="WebSecGuard — Web Security Scanner"
              tags={['Python','OWASP','Burp Suite','FastAPI']}
              desc="Automated web application security scanner covering OWASP Top 10. Header analysis, CORS misconfiguration detection, injection testing, vulnerability reporting."
              delay={0.08}
            />
            <ProjectCard
              title="Grand Line SOC Dashboard"
              tags={['Kibana','Elastic SIEM','Python','KQL']}
              desc="Real-time SOC metrics dashboard. Aggregates alerts from Elastic SIEM, correlation rules, threat scoring, analyst workload management."
              delay={0.16}
            />
            <ProjectCard
              title="Automated Cloud Security Posture"
              tags={['AWS','Python','boto3','IAM']}
              desc="Automated cloud security posture checks for AWS environments. IAM policy analysis, S3 bucket ACL audits, Security Group misconfigurations, CIS Benchmark scoring."
              delay={0.24}
            />
          </div>
        </div>
      </section>

      {/* ── EDUCATION ────────────────────────────────────────────────────── */}
      <section style={{ background:'rgba(4,10,18,0.98)', padding:'100px 24px', borderTop:'1px solid rgba(45,212,191,0.08)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <SH label="Education" title="Academic background"/>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { deg:'MSc Cyber Security',                   school:'Dublin Business School, Dublin, Ireland',   dates:'Sep 2024 – Sep 2025 (Expected)' },
              { deg:'B.E. Computer Science & Engineering',  school:'PSG College of Technology, Coimbatore, India', dates:'2019 – 2023' },
            ].map(({ deg, school, dates }, i) => (
              <motion.div key={deg}
                initial={{ opacity:0, x:-16 }}
                whileInView={{ opacity:1, x:0 }}
                viewport={{ once:true }}
                transition={{ duration:0.65, delay:i*0.1, ease:E }}
                style={{ display:'flex', gap:20, padding:'24px 0', borderTop:'1px solid rgba(45,212,191,0.08)', alignItems:'flex-start' }}
              >
                <GraduationCap size={16} color={TEAL} style={{ flexShrink:0, marginTop:2 }}/>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#E1E0CC', marginBottom:4 }}>{deg}</div>
                  <div style={{ fontSize:12, color:'rgba(45,212,191,0.65)', marginBottom:3, ...MONO }}>{school}</div>
                  <div style={{ fontSize:11, color:'rgba(225,224,204,0.38)', ...MONO }}>{dates}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────────────────── */}
      <section style={{ background:BG, padding:'100px 24px' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <motion.div
            initial={{ opacity:0, y:28 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.75, ease:E }}
          >
            <div style={{ background:'rgba(4,14,22,0.9)', border:`1px solid rgba(45,212,191,0.15)`, borderRadius:28, padding:'72px 60px', textAlign:'center' }}>
              <div style={{ fontSize:9, color:'rgba(45,212,191,0.72)', ...MONO, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:20 }}>
                Open to opportunities
              </div>
              <h2 style={{ fontSize:'clamp(26px,4.5vw,48px)', fontWeight:700, lineHeight:0.95, margin:'0 0 16px', letterSpacing:'-0.03em', color:'#E1E0CC' }}>
                Let's build something<br/><span style={{ color:TEAL }}>secure together.</span>
              </h2>
              <p style={{ fontSize:14, color:'rgba(225,224,204,0.5)', maxWidth:460, margin:'0 auto 40px', lineHeight:1.62, fontWeight:300 }}>
                Cyber security analyst specialising in identity threat detection, incident response, and security tooling. Based in Dublin. Available for analyst and engineering roles.
              </p>
              <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
                <motion.a className="cta" href="mailto:prasanna80564@gmail.com" whileTap={{ scale:0.97 }}>
                  prasanna80564@gmail.com
                  <span className="circle"><Mail size={13}/></span>
                </motion.a>
                <a className="ghost" href="https://github.com/Prasanna-27eng" target="_blank" rel="noopener noreferrer">
                  <Github size={13}/> GitHub
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:'rgba(4,10,18,0.98)', borderTop:'1px solid rgba(45,212,191,0.08)', padding:'32px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <p style={{ color:'rgba(45,212,191,0.3)', fontSize:10, margin:0, ...MONO }}>PRASANNA KUMAR SURENDRAN · DUBLIN · 2026</p>
          <div style={{ display:'flex', gap:24 }}>
            <Link to="/"          className="nl" style={{ fontSize:11 }}>AegisTrace</Link>
            <Link to="/mission"   className="nl" style={{ fontSize:11 }}>Mission</Link>
            <Link to="/app/login" className="nl" style={{ fontSize:11, color:'rgba(45,212,191,0.6)' }}>Platform →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
