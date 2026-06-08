import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Shield, Activity, Zap, Eye, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════════════════
   AEGISTRACE — Portfolio / Platform Showcase
   ───────────────────────────────────────────────────────────────────────────
   Three.js procedural city + GSAP ScrollTrigger camera fly-through
   Cyberpunk command-center aesthetic: black + red + cyan
   Emil / Impeccable: all animations intentional, ease-out, under 300ms
   ═══════════════════════════════════════════════════════════════════════════ */

const EASE_OUT = [0.23, 1, 0.32, 1];

/* ─── 3D City Scene ──────────────────────────────────────────────────────── */
function CityCanvas({ scrollRef }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // ── Renderer ────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    // ── Scene + fog ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.018);

    // ── Camera ──────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 22, 52);
    camera.lookAt(0, 8, 0);

    // ── Lights ──────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x0a0a0a, 1);
    scene.add(ambient);

    // Red directional — cyberpunk key light
    const redLight = new THREE.DirectionalLight(0xff2222, 1.8);
    redLight.position.set(-30, 50, 10);
    redLight.castShadow = true;
    scene.add(redLight);

    // Cyan fill
    const cyanLight = new THREE.PointLight(0x00ffe5, 2.5, 80);
    cyanLight.position.set(20, 30, 20);
    scene.add(cyanLight);

    // Deep blue hemisphere
    const hemi = new THREE.HemisphereLight(0x001133, 0x000000, 0.6);
    scene.add(hemi);

    // ── Ground grid ──────────────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(200, 80, 0x1a0000, 0x0d0d0d);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Procedural city buildings ────────────────────────────────────────
    const buildings = [];
    const buildingMats = [
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8, metalness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x080d10, roughness: 0.7, metalness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: 0x0d0a0a, roughness: 0.8, metalness: 0.3 }),
    ];

    const GRID = 10, SPACING = 7, COUNT = 9;
    for (let gx = -COUNT; gx <= COUNT; gx++) {
      for (let gz = -COUNT; gz <= COUNT; gz++) {
        const dist = Math.sqrt(gx * gx + gz * gz);
        if (dist < 2.5) continue; // empty centre plaza
        const r = Math.random();
        if (r < 0.28) continue; // gaps for streets

        const w = 1.8 + Math.random() * 2.8;
        const d = 1.8 + Math.random() * 2.8;
        // Taller near centre
        const h = Math.max(1, (12 - dist * 0.7) + Math.random() * 18);

        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = buildingMats[Math.floor(Math.random() * buildingMats.length)];
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(gx * SPACING + (Math.random()-0.5)*2, h/2, gz * SPACING + (Math.random()-0.5)*2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        buildings.push({ mesh, h });

        // Window lights on building faces (points)
        if (h > 4) {
          const winCount = Math.floor(h * 0.6);
          for (let ww = 0; ww < winCount; ww++) {
            const winGeo = new THREE.PlaneGeometry(0.22, 0.14);
            const isRed = Math.random() < 0.08;
            const winMat = new THREE.MeshBasicMaterial({
              color: isRed ? 0xff2200 : (Math.random() < 0.15 ? 0x00ffe5 : 0x3366aa),
              transparent: true,
              opacity: 0.55 + Math.random() * 0.4,
            });
            const win = new THREE.Mesh(winGeo, winMat);
            const side = Math.floor(Math.random() * 4);
            const wy = 1 + Math.random() * (h - 2);
            if (side === 0) { win.position.set(mesh.position.x, mesh.position.y - h/2 + wy, mesh.position.z + d/2 + 0.01); }
            else if (side === 1) { win.position.set(mesh.position.x, mesh.position.y - h/2 + wy, mesh.position.z - d/2 - 0.01); win.rotation.y = Math.PI; }
            else if (side === 2) { win.position.set(mesh.position.x + w/2 + 0.01, mesh.position.y - h/2 + wy, mesh.position.z); win.rotation.y = Math.PI/2; }
            else { win.position.set(mesh.position.x - w/2 - 0.01, mesh.position.y - h/2 + wy, mesh.position.z); win.rotation.y = -Math.PI/2; }
            scene.add(win);
          }
        }
      }
    }

    // ── Network connection lines between buildings ──────────────────────
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.25 });
    const connections = [];
    const topBuildings = buildings.sort((a,b) => b.h - a.h).slice(0, 20);
    for (let i = 0; i < topBuildings.length; i++) {
      const a = topBuildings[i].mesh.position;
      const b = topBuildings[(i+1) % topBuildings.length].mesh.position;
      const pts = [
        new THREE.Vector3(a.x, topBuildings[i].h, a.z),
        new THREE.Vector3(b.x, topBuildings[(i+1)%topBuildings.length].h, b.z),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, lineMat.clone());
      scene.add(line);
      connections.push(line);
    }

    // ── Particle system — data packets ──────────────────────────────────
    const particleCount = 800;
    const pPositions = new Float32Array(particleCount * 3);
    const pVelocities = [];
    for (let i = 0; i < particleCount; i++) {
      pPositions[i*3]   = (Math.random()-0.5)*120;
      pPositions[i*3+1] = Math.random()*40;
      pPositions[i*3+2] = (Math.random()-0.5)*120;
      pVelocities.push({
        x: (Math.random()-0.5)*0.04,
        y: (Math.random()-0.5)*0.02,
        z: (Math.random()-0.5)*0.04,
      });
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x00ffe5, size: 0.18, transparent: true, opacity: 0.6, sizeAttenuation: true });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── Scanning beam ───────────────────────────────────────────────────
    const scanGeo = new THREE.PlaneGeometry(200, 0.4);
    const scanMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const scanBeam = new THREE.Mesh(scanGeo, scanMat);
    scanBeam.rotation.x = -Math.PI / 2;
    scanBeam.position.y = 0.1;
    scene.add(scanBeam);

    // ── GSAP scroll-driven camera fly-through ───────────────────────────
    const scrollEl = scrollRef?.current || document.documentElement;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollEl,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
      },
    });
    tl.to(camera.position, { x: -18, y: 16, z: 30, duration: 1, ease: 'power2.inOut' }, 0)
      .to(camera.position, { x: 10, y: 10, z: 18, duration: 1, ease: 'power2.inOut' }, 1)
      .to(camera.position, { x: 0, y: 40, z: 5, duration: 1, ease: 'power2.inOut' }, 2)
      .to(camera.position, { x: 0, y: 22, z: 52, duration: 0.5, ease: 'power2.out' }, 3);

    // ── Resize handler ──────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ──────────────────────────────────────────────────
    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Particle drift
      const pos = pGeo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        pos.array[i*3]   += pVelocities[i].x;
        pos.array[i*3+1] += pVelocities[i].y;
        pos.array[i*3+2] += pVelocities[i].z;
        // Wrap bounds
        if (Math.abs(pos.array[i*3]) > 60)   pVelocities[i].x *= -1;
        if (pos.array[i*3+1] > 45 || pos.array[i*3+1] < 0) pVelocities[i].y *= -1;
        if (Math.abs(pos.array[i*3+2]) > 60) pVelocities[i].z *= -1;
      }
      pos.needsUpdate = true;

      // Scanning beam sweep
      scanBeam.position.z = Math.sin(t * 0.4) * 60;

      // Pulse network connections
      connections.forEach((line, i) => {
        line.material.opacity = 0.12 + 0.18 * Math.sin(t * 1.2 + i * 0.4);
      });

      // Slow camera orbit (subtle, between scroll positions)
      if (!ScrollTrigger.isScrolling()) {
        camera.position.x += Math.sin(t * 0.08) * 0.005;
      }

      camera.lookAt(0, 8, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      tl.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

/* ─── HUD Element ────────────────────────────────────────────────────────── */
function HudBox({ children, style }) {
  return (
    <div style={{
      border: '1px solid rgba(255,34,34,0.3)',
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(16px)',
      padding: '12px 16px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      color: '#888',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Metric ticker ──────────────────────────────────────────────────────── */
function MetricTicker({ label, value, unit, color = '#ff2222' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = value / 60;
    const id = setInterval(() => {
      current = Math.min(current + step, value);
      setDisplay(Math.round(current));
      if (current >= value) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{display.toLocaleString()}<span style={{ fontSize: 13 }}>{unit}</span></div>
      <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.1em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ─── Scan line overlay ──────────────────────────────────────────────────── */
function ScanLines() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
    }} />
  );
}

/* ─── Section wrapper with reveal ───────────────────────────────────────── */
function RevealSection({ children, style }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: EASE_OUT }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════════ */
export default function Portfolio() {
  const scrollRef = useRef(null);
  const mono = { fontFamily: 'JetBrains Mono, monospace' };

  return (
    <div ref={scrollRef} style={{ position: 'relative', background: '#000' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');
        body,*{font-family:'Almarai',-apple-system,sans-serif;}

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes scan-h {
          0%   { transform: translateY(-100%) }
          100% { transform: translateY(100vh) }
        }
        @keyframes pulse-red { 0%,100%{box-shadow:0 0 0 0 rgba(255,34,34,0)} 50%{box-shadow:0 0 0 8px rgba(255,34,34,0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

        .at-blink { animation: blink 1.4s step-end infinite; }
        .at-float { animation: float 4s ease-in-out infinite; }

        .at-enter-btn {
          display:inline-flex;align-items:center;gap:10px;
          border:1px solid rgba(255,34,34,0.5);
          color:#ff2222;
          background:transparent;
          padding:12px 24px;
          font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;
          text-decoration:none;cursor:pointer;
          transition: all 220ms cubic-bezier(0.23,1,0.32,1);
          font-family:inherit;
        }
        .at-enter-btn:active{transform:scale(0.97);}

        @media(hover:hover)and(pointer:fine){
          .at-enter-btn:hover{background:rgba(255,34,34,0.1);border-color:#ff2222;color:#ff4444;}
        }
        @media(prefers-reduced-motion:reduce){
          .at-blink,.at-float{animation:none;}
          .at-enter-btn:active{transform:none;}
        }
      `}</style>

      {/* Fixed 3D city canvas */}
      <CityCanvas scrollRef={scrollRef} />
      <ScanLines />

      {/* ── Fixed HUD corners ──────────────────────────────────────────── */}
      <div style={{ position:'fixed', top:20, left:20, zIndex:10, display:'flex', flexDirection:'column', gap:8 }}>
        <HudBox>
          <div style={{ color:'#ff2222', letterSpacing:'0.2em', fontSize:10, marginBottom:6 }}>AEGISTRACE // PLATFORM</div>
          <div style={{ display:'flex', gap:16 }}>
            <div><span style={{ color:'#ff2222' }}>●</span> ACTIVE</div>
            <div>AGENTS: <span style={{ color:'#E1E0CC' }}>247</span></div>
            <div>THREATS: <span style={{ color:'#ff4444' }}>3</span></div>
          </div>
        </HudBox>
      </div>

      <div style={{ position:'fixed', top:20, right:20, zIndex:10 }}>
        <HudBox style={{ textAlign:'right' }}>
          <div style={{ color:'#00ffe5', letterSpacing:'0.12em', fontSize:10, marginBottom:4 }}>SYS.STATUS</div>
          <div style={{ color:'#00ffe5' }}>ALL SYSTEMS NOMINAL <span className="at-blink">█</span></div>
        </HudBox>
      </div>

      {/* ── Scrollable content on top of 3D scene ── */}

      {/* ─── SECTION 1: HERO ─────────────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:5, height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', textAlign:'center', padding:'0 24px' }}>
        <motion.div
          initial={{ opacity:0, y:40 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.8, delay:0.3, ease:EASE_OUT }}
        >
          <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:24, ...mono }}>
            COMMAND CENTER // ACTIVE
          </div>
          <h1 style={{
            fontSize: 'clamp(52px,10vw,140px)',
            fontWeight:800,
            lineHeight:0.88,
            letterSpacing:'-0.04em',
            color:'#E1E0CC',
            margin:'0 0 32px',
            textShadow:'0 0 80px rgba(255,34,34,0.2)',
          }}>
            Observe.<br />
            <span style={{ color:'#ff2222' }}>Detect.</span><br />
            Respond.
          </h1>
          <p style={{ fontSize:16, color:'rgba(225,224,204,0.6)', maxWidth:480, lineHeight:1.5, margin:'0 auto 40px', fontWeight:300 }}>
            The autonomous threat intelligence platform built for the next generation of security operations.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/login" className="at-enter-btn">
              Enter Platform <ArrowRight size={14} />
            </Link>
            <button className="at-enter-btn" style={{ borderColor:'rgba(255,255,255,0.15)', color:'rgba(225,224,204,0.6)' }} onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}>
              Explore Mission
            </button>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <div style={{ fontSize:9, color:'#333', letterSpacing:'0.2em', ...mono }}>SCROLL TO EXPLORE</div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width:1, height:40, background:'linear-gradient(to bottom,#ff2222,transparent)' }}
          />
        </div>
      </section>

      {/* ─── SECTION 2: CAPABILITIES ──────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:5, minHeight:'100vh', padding:'120px 24px', display:'flex', alignItems:'center' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', width:'100%' }}>
          <RevealSection>
            <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.25em', ...mono, marginBottom:16 }}>// CAPABILITIES</div>
            <h2 style={{ fontSize:'clamp(36px,6vw,80px)', fontWeight:700, color:'#E1E0CC', letterSpacing:'-0.04em', lineHeight:0.92, margin:'0 0 64px' }}>
              Built for<br /><span className="at-float" style={{ display:'inline-block', color:'#ff2222' }}>hostile</span> environments.
            </h2>
          </RevealSection>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:2 }}>
            {[
              { icon: <Shield size={20} />, num:'01', title:'Threat Detection', desc:'Real-time signal correlation across 50+ data sources with sub-second latency.' },
              { icon: <Activity size={20} />, num:'02', title:'AI Agent Mesh', desc:'Coordinated multi-agent investigations that run 24/7 without analyst fatigue.' },
              { icon: <Eye size={20} />, num:'03', title:'Identity Tracing', desc:'Full provenance graph — trace every action to its origin across cloud and on-prem.' },
              { icon: <Zap size={20} />, num:'04', title:'Autonomous Response', desc:'Contain threats in seconds with policy-driven, AI-verified containment actions.' },
            ].map((cap, i) => (
              <RevealSection key={i} style={{ background:'rgba(5,5,5,0.88)', border:'1px solid rgba(255,34,34,0.12)', padding:32, backdropFilter:'blur(8px)' }}>
                <div style={{ color:'#ff2222', marginBottom:16 }}>{cap.icon}</div>
                <div style={{ fontSize:11, color:'#333', ...mono, marginBottom:8, letterSpacing:'0.1em' }}>{cap.num}</div>
                <h3 style={{ fontSize:20, fontWeight:700, color:'#E1E0CC', margin:'0 0 12px' }}>{cap.title}</h3>
                <p style={{ fontSize:14, color:'#666', lineHeight:1.5, margin:0, fontWeight:300 }}>{cap.desc}</p>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: METRICS ───────────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:5, padding:'120px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <RevealSection>
            <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.25em', ...mono, marginBottom:32 }}>// PLATFORM METRICS</div>
          </RevealSection>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:2 }}>
            {[
              { label:'THREATS DETECTED', value:2847312, unit:'', color:'#ff2222' },
              { label:'AGENTS DEPLOYED', value:247, unit:'', color:'#00ffe5' },
              { label:'MEAN TIME TO DETECT', value:4, unit:'s', color:'#E1E0CC' },
              { label:'UPTIME', value:99, unit:'%', color:'#E1E0CC' },
            ].map((m, i) => (
              <RevealSection key={i} style={{ background:'rgba(5,5,5,0.9)', border:'1px solid rgba(255,255,255,0.06)', padding:'32px 16px', backdropFilter:'blur(8px)' }}>
                <MetricTicker {...m} />
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: CTA ───────────────────────────────────────────── */}
      <section style={{ position:'relative', zIndex:5, minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 24px' }}>
        <RevealSection style={{ textAlign:'center', maxWidth:700 }}>
          <div style={{ fontSize:11, color:'#ff2222', letterSpacing:'0.25em', ...mono, marginBottom:24 }}>// ACCESS CONTROL</div>
          <h2 style={{ fontSize:'clamp(36px,7vw,96px)', fontWeight:800, color:'#E1E0CC', letterSpacing:'-0.05em', lineHeight:0.88, margin:'0 0 32px' }}>
            Your mission<br />starts here.
          </h2>
          <p style={{ fontSize:16, color:'rgba(225,224,204,0.5)', lineHeight:1.5, margin:'0 auto 48px', fontWeight:300 }}>
            Request access to the AegisTrace platform and deploy your first autonomous agent in under 10 minutes.
          </p>
          <Link to="/login" className="at-enter-btn" style={{ fontSize:14, padding:'16px 40px' }}>
            Request Access <ArrowRight size={16} />
          </Link>
        </RevealSection>
      </section>

      {/* Bottom spacer so scroll triggers have room */}
      <div style={{ height:200, position:'relative', zIndex:5 }} />
    </div>
  );
}
