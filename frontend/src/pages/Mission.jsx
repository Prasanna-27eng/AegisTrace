import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Github, Shield, Brain, Users, Code,
  GitMerge, Layers, Fingerprint, Database, ChevronRight,
  AlertTriangle, TrendingUp, Clock, CheckCircle, Target,
  BookOpen, Zap, Globe, Lock, Bot, Activity, Menu, XCircle,
  ArrowRight
} from 'lucide-react';
import Logo from '../components/Logo';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };
const SERIF = { fontFamily: 'Instrument Serif, Georgia, serif' };
const CONTACT_EMAIL = 'prasanna80564@gmail.com';

/* ── Hero particles ───────────────────────────────────────────────────── */
function HeroParticles() {
  const ref = useRef(null);
  const mRef = useRef({ x:0.5, y:0.5 });
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    let aid;
    const pts = Array.from({ length:60 }, ()=>({ x:Math.random(), y:Math.random(), vx:(Math.random()-0.5)*0.0002, vy:(Math.random()-0.5)*0.0002, r:Math.random()*1.6+0.5, a:Math.random()*0.45+0.35 }));
    function resize() { const dpr=Math.min(window.devicePixelRatio||1,2); cv.width=cv.offsetWidth*dpr; cv.height=cv.offsetHeight*dpr; ctx.scale(dpr,dpr); }
    resize(); window.addEventListener('resize',resize);
    const onM=e=>{ mRef.current={x:e.clientX/window.innerWidth,y:e.clientY/window.innerHeight}; };
    window.addEventListener('mousemove',onM);
    let mx=0.5,my=0.5;
    function frame() {
      const W=cv.offsetWidth,H=cv.offsetHeight;
      mx+=(mRef.current.x-mx)*0.03; my+=(mRef.current.y-my)*0.03;
      const ox=(mx-0.5)*20,oy=(my-0.5)*14;
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#040812'; ctx.fillRect(0,0,W,H);
      pts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=1; if(p.x>1)p.x=0; if(p.y<0)p.y=1; if(p.y>1)p.y=0; });
      const T=Math.min(W,H)*0.18;
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++) {
        const a=pts[i],b=pts[j];
        const ax=a.x*W+ox,ay=a.y*H+oy,bx=b.x*W+ox,by=b.y*H+oy;
        const d=Math.sqrt((ax-bx)**2+(ay-by)**2);
        if(d<T){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.strokeStyle=`rgba(74,142,219,${(1-d/T)*0.32})`;ctx.lineWidth=0.7;ctx.stroke();}
      }
      pts.forEach(p=>{ const px=p.x*W+ox,py=p.y*H+oy; ctx.beginPath();ctx.arc(px,py,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(74,142,219,${p.a})`;ctx.fill(); });
      const vig=ctx.createRadialGradient(W/2,H/2,H*0.1,W/2,H/2,H*0.85);
      vig.addColorStop(0,'transparent'); vig.addColorStop(1,'rgba(4,8,18,0.8)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
      aid=requestAnimationFrame(frame);
    }
    aid=requestAnimationFrame(frame);
    return()=>{ cancelAnimationFrame(aid); window.removeEventListener('resize',resize); window.removeEventListener('mousemove',onM); };
  },[]);
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>;
}

/* ── Big stat ─────────────────────────────────────────────────────────── */
function BigStat({ number, label, sub, color='#4A8EDB' }) {
  return (
    <div style={{borderLeft:`3px solid ${color}`,paddingLeft:20}}>
      <div style={{...SERIF,fontSize:'clamp(2.4rem,4vw,3rem)',fontWeight:400,color,fontStyle:'italic',lineHeight:1}}>{number}</div>
      <div style={{fontSize:'0.85rem',color:'rgba(245,247,250,0.85)',marginTop:8,fontWeight:500}}>{label}</div>
      {sub&&<div style={{fontSize:'0.7rem',color:'#6F7A8F',marginTop:4,...MONO}}>{sub}</div>}
    </div>
  );
}

/* ── Contrib card ─────────────────────────────────────────────────────── */
function ContribCard({ Icon, title, desc, action, href, color='#4A8EDB' }) {
  return (
    <div style={{padding:'22px',background:'rgba(12,18,32,0.6)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,display:'flex',flexDirection:'column',gap:12,transition:'border-color 0.2s'}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=`${color}35`}
      onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
      <div style={{width:40,height:40,borderRadius:10,background:`${color}18`,border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Icon size={18} style={{color}}/>
      </div>
      <div>
        <div style={{fontWeight:600,fontSize:'0.9rem',marginBottom:6}}>{title}</div>
        <div style={{fontSize:'0.78rem',color:'#8A95A8',lineHeight:1.65}}>{desc}</div>
      </div>
      {action&&(
        <a href={href||`mailto:${CONTACT_EMAIL}`} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:'0.76rem',color,textDecoration:'none',marginTop:'auto',...MONO}}
          target={href?.startsWith('http')?'_blank':undefined} rel="noreferrer">
          {action} <ChevronRight size={12}/>
        </a>
      )}
    </div>
  );
}

/* ── Pillar card ──────────────────────────────────────────────────────── */
function Pillar({ Icon, label, desc }) {
  return (
    <div style={{padding:'20px',background:'rgba(74,142,219,0.03)',border:'1px solid rgba(74,142,219,0.1)',borderRadius:10,transition:'all 0.2s'}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(74,142,219,0.25)';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(74,142,219,0.1)';e.currentTarget.style.transform='translateY(0)';}}>
      <Icon size={18} style={{color:'#4A8EDB',marginBottom:10}}/>
      <div style={{fontWeight:600,fontSize:'0.88rem',marginBottom:6}}>{label}</div>
      <div style={{fontSize:'0.75rem',color:'#8A95A8',lineHeight:1.6}}>{desc}</div>
    </div>
  );
}

export default function Mission() {
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);

  const NAV_ITEMS = [
    {id:'problem',  label:'The Problem'},
    {id:'vision',   label:'Our Vision'},
    {id:'contribute',label:'Contribute'},
    {id:'roadmap',  label:'Roadmap'},
    {id:'about',    label:'About'},
  ];

  const scrollTo = id => { document.getElementById(id)?.scrollIntoView({behavior:'smooth'}); setMobileNav(false); };

  return (
    <div style={{background:'#040812',color:'#F5F7FA',minHeight:'100vh',overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&family=Inter:wght@300;400;500;600;700&display=swap');
        ::selection{background:rgba(74,142,219,0.3);color:#fff}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.2)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .mission-label{font-size:10px;color:#4A8EDB;letter-spacing:0.25em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .mission-label::before{content:'';display:block;width:22px;height:1px;background:#4A8EDB}
        .mission-body{font-size:0.9rem;color:#A6AFBF;line-height:1.85;max-width:680px;margin-bottom:16px}
        .mission-section{padding:90px 48px;border-top:1px solid rgba(255,255,255,0.05)}
        .mobile-nav-drawer{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(4,8,18,0.97);z-index:200;display:flex;flex-direction:column;padding:24px;backdrop-filter:blur(20px)}
        .nav-tab{color:rgba(245,247,250,0.45);text-decoration:none;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;transition:color 0.2s;cursor:pointer;background:none;border:none;padding:4px 0}
        .nav-tab:hover{color:#4A8EDB}
        @media(max-width:860px){
          .mission-section{padding:52px 20px!important}
          .lp-2col{grid-template-columns:1fr!important;gap:32px!important}
          .lp-3col{grid-template-columns:1fr!important}
          .lp-4col{grid-template-columns:1fr 1fr!important}
          .desktop-nav-tabs{display:none!important}
        }
        @media(min-width:861px){.mobile-menu-btn{display:none!important}}
      `}</style>

      {/* ── STICKY NAV ── */}
      <nav style={{position:'sticky',top:0,zIndex:50,background:'rgba(4,8,18,0.92)',backdropFilter:'blur(14px)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'14px 48px',display:'flex',alignItems:'center',gap:20}}>
        <Logo size={22} showText/>
        <button onClick={()=>navigate('/')} style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'none',color:'#6F7A8F',cursor:'pointer',fontSize:'0.72rem',...MONO,marginLeft:4}}>
          <ArrowLeft size={12}/> Back
        </button>

        {/* Desktop nav tabs */}
        <div className="desktop-nav-tabs" style={{display:'flex',gap:20,marginLeft:16}}>
          {NAV_ITEMS.map(({id,label})=>(
            <button key={id} onClick={()=>scrollTo(id)} className="nav-tab">{label}</button>
          ))}
        </div>

        <div style={{marginLeft:'auto',display:'flex',gap:12,alignItems:'center'}}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{fontSize:'0.75rem',color:'#6F7A8F',textDecoration:'none',...MONO,display:'flex',alignItems:'center',gap:5}}
            onMouseEnter={e=>e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e=>e.currentTarget.style.color='#6F7A8F'}>
            <Mail size={12}/> Contact
          </a>
          <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer" style={{fontSize:'0.75rem',color:'#6F7A8F',textDecoration:'none',...MONO,display:'flex',alignItems:'center',gap:5}}
            onMouseEnter={e=>e.currentTarget.style.color='#F5F7FA'} onMouseLeave={e=>e.currentTarget.style.color='#6F7A8F'}>
            <Github size={12}/> GitHub
          </a>
          <button className="mobile-menu-btn" onClick={()=>setMobileNav(true)} style={{background:'none',border:'1px solid rgba(240,240,248,0.15)',borderRadius:6,padding:'7px 9px',cursor:'pointer',color:'#F0F0F8',display:'flex',alignItems:'center'}}>
            <Menu size={16}/>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileNav&&(
        <div className="mobile-nav-drawer">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
            <Logo size={22} showText/>
            <button onClick={()=>setMobileNav(false)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(240,240,248,0.6)'}}><XCircle size={22}/></button>
          </div>
          {NAV_ITEMS.map(({id,label})=>(
            <button key={id} onClick={()=>scrollTo(id)}
              style={{display:'block',padding:'14px 0',fontSize:15,color:'rgba(240,240,248,0.75)',background:'none',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,0.05)',width:'100%',...MONO,letterSpacing:'0.08em',textTransform:'uppercase'}}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{position:'relative',height:'75vh',minHeight:540,overflow:'hidden',display:'flex',alignItems:'center'}}>
        <HeroParticles/>
        <div style={{position:'relative',zIndex:10,maxWidth:1100,margin:'0 auto',padding:'0 48px',width:'100%'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'6px 14px',background:'rgba(74,142,219,0.1)',border:'1px solid rgba(74,142,219,0.25)',borderRadius:20,marginBottom:28}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#4A8EDB',animation:'pulse 2s ease-in-out infinite'}}/>
            <span style={{fontSize:'0.68rem',color:'#6BABEC',...MONO,letterSpacing:'0.15em',textTransform:'uppercase'}}>The Industrial Revolution in Cybersecurity</span>
          </div>

          <h1 style={{...SERIF,fontSize:'clamp(2.8rem,7vw,5.5rem)',fontWeight:400,lineHeight:0.96,letterSpacing:'-0.015em',marginBottom:24}}>
            <div style={{color:'#F5F7FA'}}>Building the Future of</div>
            <div style={{color:'#4A8EDB',fontStyle:'italic'}}>AI-Augmented Security.</div>
          </h1>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'flex-end',maxWidth:900}} className="lp-2col">
            <p style={{fontSize:'0.95rem',color:'#A6AFBF',lineHeight:1.85,...MONO,fontWeight:300,margin:0}}>
              AegisTrace isn't just a product. It's a movement to redefine how humanity defends itself in the AI-agent era — where identity, trust, and provenance become the new perimeter.
            </p>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <a href={`mailto:${CONTACT_EMAIL}?subject=I want to join the AegisTrace mission`}
                style={{display:'inline-flex',alignItems:'center',gap:8,background:'#4A8EDB',color:'white',border:'none',borderRadius:8,padding:'12px 24px',fontSize:'0.85rem',fontWeight:600,cursor:'pointer',textDecoration:'none'}}>
                <Mail size={15}/> Join the Mission
              </a>
              <button onClick={()=>scrollTo('vision')}
                style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.05)',color:'#D7DCE6',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'12px 24px',fontSize:'0.85rem',cursor:'pointer'}}>
                <BookOpen size={15}/> Read the Vision
              </button>
            </div>
          </div>
        </div>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'28%',background:'linear-gradient(to top,#040812 0%,transparent 100%)'}}/>
      </section>

      {/* ── THE PROBLEM ── */}
      <section id="problem" className="mission-section" style={{padding:'90px 48px',background:'#040812'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:56,alignItems:'start'}} className="lp-2col">
            <div>
              <div className="mission-label">The Problem</div>
              <h2 style={{...SERIF,fontSize:'clamp(2rem,4vw,3.2rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:20}}>
                The world is changing.<br/><span style={{color:'#4A8EDB',fontStyle:'italic'}}>Security isn't keeping up.</span>
              </h2>
              <p className="mission-body">
                The SOC model built in the 2000s — tracking machines, IPs, and endpoints — is <strong style={{color:'#F5F7FA'}}>fundamentally broken</strong>. Attackers no longer breach perimeters. They log in. The real attack surface has shifted entirely.
              </p>
              {/* Problem tiles */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:24}}>
                {[
                  {icon:Fingerprint, label:'User identities',     desc:'Stolen credentials = instant access to everything'},
                  {icon:Bot,         label:'AI agents',           desc:'70% of organisations using AI lack security controls'},
                  {icon:Lock,        label:'Service accounts',    desc:'Rogue tokens operating at machine speed, undetected'},
                  {icon:Activity,    label:'Machine-speed attacks',desc:'Executed in milliseconds — humans cannot respond alone'},
                ].map(({icon:Icon,label,desc})=>(
                  <div key={label} style={{padding:'14px 16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,borderTop:'2px solid rgba(74,142,219,0.35)'}}>
                    <Icon size={14} style={{color:'#4A8EDB',marginBottom:6}}/>
                    <div style={{fontWeight:600,fontSize:'0.82rem',marginBottom:4}}>{label}</div>
                    <div style={{fontSize:'0.72rem',color:'#8A95A8',lineHeight:1.55}}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{display:'flex',flexDirection:'column',gap:28,paddingTop:8}}>
              <BigStat number="83%" label="of breaches involve stolen credentials or identity abuse" sub="Verizon DBIR 2025" color="#4A8EDB"/>
              <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)'}}/>
              <BigStat number="70%" label="of organisations using AI lack proper security controls" sub="Gartner 2025" color="#9C7CFF"/>
              <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)'}}/>
              <BigStat number="30 min" label="average human triage time vs 30 seconds for AI-augmented" sub="SOC Analyst Survey 2025" color="#F5B84B"/>
              <div style={{width:'100%',height:1,background:'rgba(255,255,255,0.06)'}}/>
              <BigStat number="10×" label="productivity gap between human-only and AI-augmented SOC" sub="Industry benchmark" color="#4Be38A"/>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR VISION ── */}
      <section id="vision" className="mission-section" style={{padding:'90px 48px',background:'#060A16'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div className="mission-label" style={{color:'#9C7CFF'}}>
            <span style={{display:'block',width:22,height:1,background:'#9C7CFF'}}/>Our Vision
          </div>
          <h2 style={{...SERIF,fontSize:'clamp(2rem,4vw,3.4rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:48}}>
            From case manager to<br/><span style={{color:'#9C7CFF',fontStyle:'italic'}}>trust control plane.</span>
          </h2>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:56,marginBottom:52}} className="lp-2col">
            <div>
              <p className="mission-body">
                AegisTrace started as an open-source case manager. But the future is far bigger.
              </p>
              <p className="mission-body">
                We're building the <strong style={{color:'#4A8EDB'}}>control plane for the AI-agent era</strong> — where every action is traced to an identity, every AI decision is explainable and auditable, and every agent operates within human-defined trust boundaries.
              </p>
              {/* Pull quote */}
              <blockquote style={{margin:'24px 0 0',padding:'16px 20px',background:'rgba(74,142,219,0.04)',borderLeft:'3px solid rgba(74,142,219,0.5)',borderRadius:'0 8px 8px 0'}}>
                <em style={{color:'rgba(245,247,250,0.85)',fontSize:'0.92rem',lineHeight:1.7}}>"Which identity, agent, workflow, or prompt caused this breach?"</em>
                <div style={{fontSize:'0.68rem',color:'#6F7A8F',marginTop:8,...MONO}}>The question the next decade of security will be built around</div>
              </blockquote>
            </div>

            <div>
              {[
                {from:'IOC dashboard',         to:'Identity investigation platform', c:'#4A8EDB'},
                {from:'Case manager',           to:'Trust orchestration platform',    c:'#9C7CFF'},
                {from:'Alert viewer',           to:'Agent supervision console',       c:'#4Be38A'},
                {from:'Manual triage',          to:'Autonomous + human-approved',     c:'#F5B84B'},
                {from:'Black-box AI verdicts',  to:'Explainable provenance chains',   c:'#4A8EDB'},
                {from:'Static reports',         to:'Future-narrative intelligence',   c:'#9C7CFF'},
              ].map(({from,to,c})=>(
                <div key={from} style={{display:'flex',alignItems:'center',gap:0,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{flex:1,fontSize:'0.78rem',color:'rgba(245,247,250,0.25)',textDecoration:'line-through',...MONO}}>{from}</div>
                  <div style={{width:24,height:1,background:`linear-gradient(90deg,${c}40,${c})`,margin:'0 12px',flexShrink:0}}/>
                  <div style={{flex:1,fontSize:'0.78rem',color:'rgba(245,247,250,0.9)',...MONO,fontWeight:500}}>{to}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pillars */}
          <div className="lp-3col" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
            <Pillar Icon={Fingerprint}  label="Identity First"   desc="Every actor — human, service, agent, token — is modelled as a first-class entity with a risk score and a trust history."/>
            <Pillar Icon={Database}     label="Provenance"       desc="Every AI output, tool result, and case action carries full provenance: who, what model, what evidence, what confidence."/>
            <Pillar Icon={GitMerge}     label="Trust"            desc="Trust is tracked, inherited, challenged, and revocable. A trust timeline sits beside every incident."/>
            <Pillar Icon={Brain}        label="Explainability"   desc="No black boxes. Every AI verdict shows its reasoning chain, evidence used, and what could be wrong."/>
            <Pillar Icon={Shield}       label="Human Control"    desc="AI suggests. Humans confirm. Every automation has an approval layer and a complete audit trail."/>
            <Pillar Icon={TrendingUp}   label="Future-Ready"     desc="Designed to remain relevant 10–15 years from now — when quantum threats and AI-native adversaries are the norm."/>
          </div>
        </div>
      </section>

      {/* ── HOW TO CONTRIBUTE ── */}
      <section id="contribute" className="mission-section" style={{padding:'90px 48px',background:'#040812'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div className="mission-label">Contribute</div>
          <h2 style={{...SERIF,fontSize:'clamp(2rem,4vw,3.4rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:16}}>
            Six ways to<br/><span style={{color:'#4A8EDB',fontStyle:'italic'}}>join the mission.</span>
          </h2>
          <p className="mission-body">
            AegisTrace is built by one analyst in Dublin — but the vision is bigger than one person. Whether you're an analyst, developer, designer, researcher, writer, or enterprise buyer, there's a place for you here.
          </p>

          <div className="lp-3col" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:32}}>
            <ContribCard Icon={Code}     color="#4A8EDB" title="Build Features"        action="Email to discuss →"
              desc="Help build the v4.1+ features: Shadow AI Detection, AI Agent Security, SOAR Playbooks, Attacker Path Reconstruction, AI Memory across cases."/>
            <ContribCard Icon={Shield}   color="#9C7CFF" title="Security Research"     action="Share your research →"
              desc="Contribute AI threat models, identity attack patterns, MITRE mappings, or research on emerging threats in the AI-agent era."/>
            <ContribCard Icon={Brain}    color="#4Be38A" title="AI / ML Engineering"   action="Email to collaborate →"
              desc="Help improve the multi-model AI router, explainability layer, proactive triage engine, and AI memory across cases."/>
            <ContribCard Icon={Users}    color="#F5B84B" title="SOC Analyst Input"     action="Share your pain points →"
              desc="You use tools like this every day. Tell us what's broken, what's missing, and what would make your investigations 10× faster."/>
            <ContribCard Icon={BookOpen} color="#4A8EDB" title="Documentation"         action="Help write docs →"
              desc="Write guides, walkthroughs, deployment docs, or use-case narratives that help analysts get value out of AegisTrace faster."/>
            <ContribCard Icon={Globe}    color="#9C7CFF" title="Enterprise Partnership" action="Let's talk →"
              desc="Using AegisTrace in a real SOC environment? We want to hear from you. Your feedback shapes the enterprise roadmap."/>
          </div>

          {/* CTA */}
          <div style={{marginTop:52,padding:'36px 44px',background:'rgba(74,142,219,0.04)',border:'1px solid rgba(74,142,219,0.18)',borderRadius:14,display:'grid',gridTemplateColumns:'1fr auto',gap:24,alignItems:'center',flexWrap:'wrap'}} className="lp-2col">
            <div>
              <div style={{fontWeight:700,fontSize:'1.05rem',marginBottom:8}}>Ready to contribute?</div>
              <div style={{fontSize:'0.85rem',color:'#A6AFBF',maxWidth:480,lineHeight:1.7}}>
                Send an email with a short intro — who you are, what you do, and how you'd like to be involved. Every message is read personally.
              </div>
              <div style={{marginTop:8,fontSize:'0.78rem',color:'#4A8EDB',...MONO}}>{CONTACT_EMAIL}</div>
            </div>
            <a href={`mailto:${CONTACT_EMAIL}?subject=I want to contribute to AegisTrace`}
              style={{display:'inline-flex',alignItems:'center',gap:8,background:'#4A8EDB',color:'white',borderRadius:8,padding:'13px 28px',fontSize:'0.88rem',fontWeight:600,textDecoration:'none',flexShrink:0}}>
              <Mail size={16}/> Send Introduction
            </a>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section id="roadmap" className="mission-section" style={{padding:'90px 48px',background:'#060A16'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div className="mission-label" style={{color:'#9C7CFF'}}>
            <span style={{display:'block',width:22,height:1,background:'#9C7CFF'}}/>Roadmap
          </div>
          <h2 style={{...SERIF,fontSize:'clamp(2rem,4vw,3.4rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:48}}>
            What we're building.<br/><span style={{color:'#9C7CFF',fontStyle:'italic'}}>In the open.</span>
          </h2>

          <div className="lp-3col" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {[
              {phase:'Live — v2.0 → v4.0',status:'live',color:'#4Be38A',items:['ITDR — credential stuffing, impossible travel, new device, privilege escalation','Identity Graph + Pluggable Risk Engine + Policy Engine','Trust Timeline + Provenance Ledger (AI action audit)','Terminal Lab — private analyst workspace','Explainable AI — reasoning chain, evidence, confidence on every verdict','Case management (13 tabs) + comments + investigation templates','Analytics dashboard — severity, SLA, MITRE heatmap, throughput','7-source IOC enrichment + 18 hardware forensic tools','Email forensics (SPF/DKIM/DMARC) + PCAP + DORA compliance','Endpoint agent v2 + webhook alerting + audit logs']},
              {phase:'In Progress — v4.1',status:'building',color:'#F5B84B',items:['Shadow AI Detection — detect data sent to unauthorised AI services','AI Agent Security — bounded autonomy + human approval workflows','SOAR Playbooks — automated response sequences per incident type','Control Plane view — live trust, policy, and agent health dashboard','Report narrative mode — attacker story for board-level audiences']},
              {phase:'Planned — v5.0',status:'planned',color:'#9C7CFF',items:['Agent Supervision Console — kill switches + task scope','Attacker Path Reconstruction — visual kill-chain across actors','AI Memory across cases — pattern recognition from history','Crypto + Quantum Readiness — certificate inventory, PQ flags','Machine Identity incidents — rogue API keys, service accounts','Future-narrative reporting — board-level attacker stories']},
            ].map(({phase,status,color,items})=>(
              <div key={phase} style={{background:'rgba(12,18,32,0.5)',border:`1px solid ${color}20`,borderRadius:12,padding:24,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color}70,transparent)`}}/>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:color,boxShadow:status==='live'?`0 0 8px ${color}`:'none'}}/>
                  <div style={{fontWeight:700,fontSize:'0.85rem'}}>{phase}</div>
                  <div style={{marginLeft:'auto',fontSize:'0.62rem',...MONO,padding:'2px 8px',borderRadius:3,background:`${color}18`,color,border:`1px solid ${color}30`,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                    {status==='live'?'Live':status==='building'?'Building':'Planned'}
                  </div>
                </div>
                {items.map(item=>(
                  <div key={item} style={{display:'flex',alignItems:'flex-start',gap:7,padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:status==='live'?color:'rgba(255,255,255,0.15)',flexShrink:0,marginTop:5}}/>
                    <div style={{fontSize:'0.75rem',color:status==='live'?'rgba(245,247,250,0.8)':'rgba(245,247,250,0.5)',lineHeight:1.4,...MONO}}>{item}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="mission-section" style={{padding:'80px 48px',background:'#040812'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:56,alignItems:'center'}} className="lp-2col">
          <div>
            <div className="mission-label">Who's Building This</div>
            <h2 style={{...SERIF,fontSize:'clamp(1.8rem,3.5vw,3rem)',fontWeight:400,letterSpacing:'-0.02em',lineHeight:1.15,marginBottom:20}}>
              One analyst.<br/><span style={{color:'#4A8EDB',fontStyle:'italic'}}>One ambitious mission.</span>
            </h2>
            <p style={{fontSize:'0.9rem',color:'#A6AFBF',lineHeight:1.85,marginBottom:18}}>
              Prasanna Kumar Surendran — Blue Team analyst and security tooling developer, Dublin, Ireland. AegisTrace started as a personal investigation platform and grew into a full SOC control plane benchmarked against commercial products.
            </p>
            <p style={{fontSize:'0.9rem',color:'#A6AFBF',lineHeight:1.85,marginBottom:28}}>
              The platform is self-funded, free to use, and open in philosophy. The goal is to prove that a solo analyst can build SOC tooling that rivals commercial products — and that the next generation of security platforms must be built around identity, trust, and explainability from the ground up.
            </p>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <a href={`mailto:${CONTACT_EMAIL}`} style={{display:'inline-flex',alignItems:'center',gap:7,background:'#4A8EDB',color:'white',borderRadius:8,padding:'11px 22px',fontSize:'0.82rem',fontWeight:600,textDecoration:'none'}}><Mail size={14}/> Get in Touch</a>
              <a href="https://github.com/Prasanna-27eng" target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.05)',color:'#D7DCE6',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'11px 22px',fontSize:'0.82rem',textDecoration:'none'}}><Github size={14}/> GitHub</a>
              <a href="https://www.linkedin.com/in/prasannakumarsurendran" target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,0.05)',color:'#D7DCE6',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'11px 22px',fontSize:'0.82rem',textDecoration:'none'}}><Users size={14}/> LinkedIn</a>
            </div>
          </div>

          {/* Quick facts panel */}
          <div style={{background:'rgba(12,18,32,0.6)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'28px'}}>
            <div style={{fontSize:10,color:'#4A8EDB',letterSpacing:'0.18em',textTransform:'uppercase',...MONO,marginBottom:20}}>◇ Platform Stats</div>
            {[
              {label:'Lines of code',          val:'~18,000+',    color:'#4A8EDB'},
              {label:'Features shipped',       val:'12 major',   color:'#9C7CFF'},
              {label:'AI models integrated',   val:'4 via Groq', color:'#4Be38A'},
              {label:'Threat intel sources',   val:'7 APIs',     color:'#F5B84B'},
              {label:'Hardware tools',         val:'18 parsers', color:'#4A8EDB'},
              {label:'Infrastructure cost',    val:'$0 / month', color:'#22C55E'},
            ].map(({label,val,color})=>(
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <span style={{fontSize:'0.8rem',color:'rgba(245,247,250,0.55)',...MONO}}>{label}</span>
                <span style={{fontSize:'0.82rem',fontWeight:600,color,...MONO}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{padding:'28px 48px',borderTop:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14}}>
        <Logo size={18} showText/>
        <div style={{fontSize:'0.72rem',color:'#3A4556',...MONO}}>Prasanna Kumar Surendran · Dublin, Ireland · 2025–2026</div>
        <button onClick={()=>navigate('/')} style={{fontSize:'0.75rem',color:'#6F7A8F',background:'none',border:'none',cursor:'pointer',...MONO}}>← Back to AegisTrace</button>
      </footer>
    </div>
  );
}
