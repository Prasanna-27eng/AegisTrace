import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Clock, User, Shield, Brain } from 'lucide-react';
import Logo from '../components/Logo';
import { SeverityBadge, StatusBadge } from '../components/SeverityBadge';
import api from '../api/client';

export default function PublicCaseDetail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get(`/api/public/${token}`).then(r => { setC(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#07080F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A' }}>Loading…</div>;
  if (!c) return <div style={{ minHeight: '100vh', background: '#07080F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A' }}>Case not found or not public.</div>;

  const iocs = Array.isArray(c.iocs) ? c.iocs : [];
  const mitre = Array.isArray(c.mitre_techniques) ? c.mitre_techniques : [];
  const timeline = Array.isArray(c.timeline_events) ? c.timeline_events : [];

  return (
    <div style={{ minHeight: '100vh', background: '#07080F', color: '#F0F0F8' }}>
      <nav style={{ background: '#0F1018', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-ghost" onClick={() => navigate('/public')} style={{ fontSize: '0.8rem' }}><ArrowLeft size={14} /> Back</button>
          <Logo size={22} showText />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={copyLink} style={{ fontSize: '0.8rem' }}><Share2 size={14} /> {copied ? 'Copied!' : 'Share'}</button>
          <a href={`/api/reports/${c.id}/pdf`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: '0.8rem', textDecoration: 'none' }}><Download size={14} /> PDF</a>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <SeverityBadge severity={c.severity} />
            <StatusBadge status={c.status} />
            <span style={{ fontSize: '0.7rem', color: '#71717A', fontFamily: 'JetBrains Mono', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.07)' }}>{c.case_number}</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16, lineHeight: 1.2 }}>{c.title}</h1>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.8rem', color: '#71717A' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={12} /> {c.analyst_name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={12} /> {c.incident_type}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> {new Date(c.created_at).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* AegisTrace watermark */}
        <div style={{ fontSize: '0.65rem', color: 'rgba(192,57,43,0.4)', fontFamily: 'JetBrains Mono', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={14} showText={false} /> Published via AegisTrace SOC Platform
        </div>

        {/* Executive Summary */}
        {c.ai_executive_summary && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Executive Summary</h2>
              <span className="ai-badge"><Brain size={10} /> AI</span>
            </div>
            <div className="at-card" style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: '0.88rem', color: '#B0B0C0', lineHeight: 1.75 }}>{c.ai_executive_summary}</p>
            </div>
          </section>
        )}

        {/* Description */}
        {c.description && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Case Description</h2>
            <p style={{ fontSize: '0.88rem', color: '#71717A', lineHeight: 1.75 }}>{c.description}</p>
          </section>
        )}

        {/* IOCs */}
        {iocs.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Indicators of Compromise</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {iocs.map((ioc, i) => (
                <span key={i} className="ioc-pill" title={`Type: ${ioc.type} | Verdict: ${ioc.verdict}`}>{ioc.ioc}</span>
              ))}
            </div>
          </section>
        )}

        {/* MITRE */}
        {mitre.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>MITRE ATT&CK Techniques</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mitre.map((m, i) => (
                <div key={i} className="at-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.75rem', color: '#A78BFA', fontFamily: 'JetBrains Mono', minWidth: 80 }}>{m.id}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{m.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#71717A', marginLeft: 'auto' }}>{m.tactic}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Investigation Timeline</h2>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 1, background: 'rgba(192,57,43,0.3)' }} />
              {timeline.map((ev, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 16, paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: -4, top: 4, width: 8, height: 8, borderRadius: '50%', background: ev.event_type === 'closure' ? '#22C55E' : ev.event_type === 'escalation' ? '#EF4444' : '#C0392B', border: '2px solid #07080F' }} />
                  <div style={{ fontSize: '0.68rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
                    {new Date(ev.timestamp).toLocaleString('en-IE')} · {ev.event_type?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#B0B0C0', lineHeight: 1.6 }}>{ev.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Findings */}
        {c.findings && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Findings</h2>
            <div className="at-card" style={{ padding: '16px 18px' }}>
              <pre style={{ background: 'none', border: 'none', padding: 0, whiteSpace: 'pre-wrap', fontSize: '0.82rem', color: '#B0B0C0', lineHeight: 1.7, fontFamily: 'Inter' }}>{c.findings}</pre>
            </div>
          </section>
        )}

        {/* Recommendations */}
        {c.recommendations && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Recommendations</h2>
            <div className="at-card" style={{ padding: '16px 18px' }}>
              <pre style={{ background: 'none', border: 'none', padding: 0, whiteSpace: 'pre-wrap', fontSize: '0.82rem', color: '#B0B0C0', lineHeight: 1.7, fontFamily: 'Inter' }}>{c.recommendations}</pre>
            </div>
          </section>
        )}

        {/* Footer */}
        <div style={{ paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#71717A' }}>
            <Logo size={16} showText={false} /> AegisTrace · Prasanna Kumar Surendran · Dublin, Ireland
          </div>
          <button className="btn-ghost" onClick={() => navigate('/portfolio')} style={{ fontSize: '0.78rem' }}>View Portfolio</button>
        </div>
      </div>
    </div>
  );
}
