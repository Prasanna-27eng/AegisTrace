import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Share2, Clock, User, Shield, Brain,
  AlertTriangle, Target, CheckCircle, BookOpen, Lightbulb,
  Search, Flag, ChevronRight, Lock, Globe
} from '../components/icons';
import Logo from '../components/Logo';
import { SeverityBadge, StatusBadge } from '../components/SeverityBadge';
import api from '../api/client';

/* ── Story step component ─────────────────────────────────────────────── */
function StoryStep({ n, label, icon: Icon, color, children }) {
  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 36 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}18`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 8, minHeight: 20 }} />
      </div>
      <div style={{ flex: 1, paddingBottom: 8, paddingTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', color, textTransform: 'uppercase', letterSpacing: '0.12em', background: `${color}14`, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 3 }}>Step {n}</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#EBEBEB' }}>{label}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── IOC pill ─────────────────────────────────────────────────────────── */
function IocPill({ ioc }) {
  const verdictColor = { malicious: '#EF4444', suspicious: '#EAB308', clean: '#22C55E' };
  const color = verdictColor[ioc.verdict?.toLowerCase()] || '#787878';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`, color: '#909090', padding: '3px 10px', borderRadius: 4, margin: '0 4px 4px 0' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {ioc.ioc}
      {ioc.verdict && <span style={{ color, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ioc.verdict}</span>}
    </span>
  );
}

export default function PublicCaseDetail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get(`/api/public/${token}`)
      .then(r => { setC(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#787878', fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
      Loading investigation…
    </div>
  );
  if (!c) return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#787878', flexDirection: 'column', gap: 12 }}>
      <Lock size={28} style={{ color: 'rgba(90,138,159,0.2)' }} />
      <div style={{ fontSize: '0.88rem' }}>Case not found or not public.</div>
      <button onClick={() => navigate('/public')} style={{ fontSize: '0.8rem', color: '#5A8A9F', background: 'none', border: '1px solid rgba(90,138,159,0.25)', borderRadius: 6, padding: '7px 16px', cursor: 'pointer' }}>← Case Library</button>
    </div>
  );

  const iocs      = Array.isArray(c.iocs)             ? c.iocs             : [];
  const mitre     = Array.isArray(c.mitre_techniques)  ? c.mitre_techniques  : [];
  const timeline  = Array.isArray(c.timeline_events)   ? c.timeline_events   : [];
  const malicious = iocs.filter(i => i.verdict?.toLowerCase() === 'malicious');

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#EBEBEB' }}>

      {/* ── NAV ── */}
      <nav style={{ background: 'rgba(15,16,24,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-ghost" onClick={() => navigate('/public')} style={{ fontSize: '0.8rem' }}>
            <ArrowLeft size={14} /> Case Library
          </button>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
          <Logo size={20} showText />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={copyLink} style={{ fontSize: '0.8rem' }}>
            <Share2 size={13} /> {copied ? 'Copied!' : 'Share'}
          </button>
          <a href={`/api/reports/${c.id}/pdf`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
            <Download size={13} /> PDF
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '44px 32px 80px' }}>

        {/* ── CASE HEADER ── */}
        <div style={{ marginBottom: 36 }}>
          {/* Meta badges */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <SeverityBadge severity={c.severity} />
            <StatusBadge status={c.status} />
            <span style={{ fontSize: '0.68rem', color: '#787878', fontFamily: 'JetBrains Mono', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.07)' }}>{c.case_number}</span>
            {c.incident_type && (
              <span style={{ fontSize: '0.68rem', color: '#8FAFC0', fontFamily: 'JetBrains Mono', padding: '2px 8px', background: 'rgba(143,175,192,0.08)', borderRadius: 4, border: '1px solid rgba(143,175,192,0.2)', textTransform: 'capitalize' }}>
                {c.incident_type.replace(/_/g, ' ')}
              </span>
            )}
            <span style={{ fontSize: '0.62rem', color: 'rgba(90,138,159,0.5)', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Globe size={10} /> Public Investigation
            </span>
          </div>

          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.2 }}>{c.title}</h1>

          {/* Analyst + date row */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.8rem', color: '#787878', marginBottom: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={12} /> {c.analyst_name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> {new Date(c.created_at).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            {iocs.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={12} /> {iocs.length} IOCs tracked</span>}
            {mitre.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={12} /> {mitre.length} MITRE techniques</span>}
          </div>

          {/* AegisTrace watermark */}
          <div style={{ fontSize: '0.62rem', color: 'rgba(90,138,159,0.35)', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Logo size={12} showText={false} /> Published via AegisTrace SOC Platform
          </div>
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 40 }} />

        {/* ── AI EXECUTIVE SUMMARY — full width callout ── */}
        {c.ai_executive_summary && (
          <div style={{ marginBottom: 44, padding: '20px 24px', background: 'rgba(90,138,159,0.04)', border: '1px solid rgba(90,138,159,0.18)', borderRadius: 12, borderLeft: '3px solid rgba(90,138,159,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Brain size={14} style={{ color: '#5A8A9F' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#5A8A9F', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono' }}>AI Executive Summary</span>
              <span style={{ fontSize: '0.62rem', color: 'rgba(90,138,159,0.5)', fontFamily: 'JetBrains Mono', marginLeft: 4 }}>Generated by AegisTrace AI</span>
            </div>
            <p style={{ fontSize: '0.92rem', color: '#C8D0E0', lineHeight: 1.8, margin: 0 }}>{c.ai_executive_summary}</p>
          </div>
        )}

        {/* ── INVESTIGATION STORY ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: '0.65rem', color: '#5A8A9F', fontFamily: 'JetBrains Mono', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 1, background: '#5A8A9F' }} />Investigation Narrative
          </div>

          {/* Step 1: Trigger */}
          <StoryStep n={1} label="Trigger — What Was Detected" icon={AlertTriangle} color="#EF4444">
            {c.description ? (
              <div style={{ fontSize: '0.88rem', color: '#909090', lineHeight: 1.8 }}>{c.description}</div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#787878', fontStyle: 'italic' }}>No initial trigger description provided.</div>
            )}
            {malicious.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.65rem', color: '#EF4444', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Malicious Indicators Identified</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {malicious.map((ioc, i) => <IocPill key={i} ioc={ioc} />)}
                </div>
              </div>
            )}
          </StoryStep>

          {/* Step 2: Investigation Steps (timeline) */}
          {timeline.length > 0 && (
            <StoryStep n={2} label="Investigation — Key Steps" icon={Search} color="#5A8A9F">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {timeline.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: ev.event_type === 'closure' ? '#22C55E' : ev.event_type === 'escalation' ? '#EF4444' : '#5A8A9F', flexShrink: 0 }} />
                      {i < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 5, minHeight: 10 }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.65rem', color: '#787878', fontFamily: 'JetBrains Mono', marginBottom: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>{new Date(ev.timestamp).toLocaleString('en-IE')}</span>
                        <span style={{ color: '#5A8A9F', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{ev.event_type?.replace(/_/g, ' ')}</span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#909090', lineHeight: 1.65 }}>{ev.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </StoryStep>
          )}

          {/* Step 3: Findings */}
          {c.findings && (
            <StoryStep n={timeline.length > 0 ? 3 : 2} label="Findings — What Was Discovered" icon={Flag} color="#EAB308">
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '14px 18px' }}>
                <pre style={{ background: 'none', border: 'none', padding: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#909090', lineHeight: 1.75, fontFamily: 'Inter, system-ui', margin: 0 }}>{c.findings}</pre>
              </div>
              {/* All IOCs */}
              {iocs.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: '0.65rem', color: '#EAB308', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>All Indicators of Compromise ({iocs.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {iocs.map((ioc, i) => <IocPill key={i} ioc={ioc} />)}
                  </div>
                </div>
              )}
              {/* MITRE */}
              {mitre.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: '0.65rem', color: '#EAB308', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>MITRE ATT&CK Techniques ({mitre.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {mitre.map((m, i) => (
                      <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', background: 'rgba(143,175,192,0.07)', border: '1px solid rgba(143,175,192,0.18)', borderRadius: 5, padding: '4px 10px' }}>
                        <span style={{ color: '#8FAFC0', fontFamily: 'JetBrains Mono', fontSize: '0.68rem' }}>{m.id}</span>
                        <span style={{ color: '#A8A8A8' }}>{m.name}</span>
                        {m.tactic && <span style={{ color: '#787878', fontSize: '0.65rem' }}>{m.tactic}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </StoryStep>
          )}

          {/* Step 4: Outcome */}
          {c.closure_notes && (
            <StoryStep n={[c.findings, timeline.length > 0].filter(Boolean).length + 2} label="Outcome — How It Was Resolved" icon={CheckCircle} color="#22C55E">
              <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '14px 18px' }}>
                <pre style={{ background: 'none', border: 'none', padding: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#909090', lineHeight: 1.75, fontFamily: 'Inter, system-ui', margin: 0 }}>{c.closure_notes}</pre>
              </div>
            </StoryStep>
          )}

          {/* Step 5: Lessons Learned */}
          {c.recommendations && (
            <StoryStep n={[c.findings, timeline.length > 0, c.closure_notes].filter(Boolean).length + 2} label="Lessons Learned — Recommendations" icon={Lightbulb} color="#8FAFC0">
              <div style={{ background: 'rgba(143,175,192,0.04)', border: '1px solid rgba(143,175,192,0.15)', borderRadius: 8, padding: '14px 18px' }}>
                <pre style={{ background: 'none', border: 'none', padding: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#909090', lineHeight: 1.75, fontFamily: 'Inter, system-ui', margin: 0 }}>{c.recommendations}</pre>
              </div>
            </StoryStep>
          )}
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 32 }} />

        {/* ── FOOTER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.72rem', color: '#787878' }}>
            <Logo size={16} showText={false} />
            <span>AegisTrace · Prasanna Kumar Surendran · Dublin, Ireland</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => navigate('/public')} style={{ fontSize: '0.78rem' }}>
              <BookOpen size={12} /> Case Library
            </button>
            <button className="btn-ghost" onClick={() => navigate('/portfolio')} style={{ fontSize: '0.78rem' }}>
              View Portfolio <ChevronRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
