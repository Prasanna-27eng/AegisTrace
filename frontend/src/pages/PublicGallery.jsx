import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, User, Lock } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../api/client';

export default function PublicGallery() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/public/cases').then(r => { setCases(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#EBEBEB' }}>
      <nav style={{ background: '#111111', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px' }}>
        <Logo size={24} showText />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => navigate('/')} style={{ fontSize: '0.8rem' }}>Home</button>
          <button className="btn-ghost" onClick={() => navigate('/portfolio')} style={{ fontSize: '0.8rem' }}>Portfolio</button>
          <button className="btn-accent" onClick={() => navigate('/app/login')} style={{ fontSize: '0.8rem' }}>Launch App</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.68rem', color: '#787878', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>Public Case Library</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Investigation Case Studies</h1>
          <p style={{ color: '#787878', fontSize: '0.88rem', marginTop: 8 }}>Real-world SOC investigations published as public case studies. Read-only, anonymised where required.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#787878' }}>Loading cases…</div>
        ) : cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Lock size={32} style={{ color: '#787878', margin: '0 auto 12px' }} />
            <div style={{ color: '#787878' }}>No public cases yet.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {cases.map(c => (
              <div key={c.id} className="at-card" style={{ padding: '20px 22px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                onClick={() => navigate(`/public/${c.share_token}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.7rem', color: '#787878', fontFamily: 'JetBrains Mono' }}>{c.case_number}</span>
                  <span className={`badge sev-${c.severity}`}>{c.severity?.toUpperCase()}</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 8, lineHeight: 1.4 }}>{c.title}</h3>
                {c.ai_executive_summary && (
                  <p style={{ fontSize: '0.78rem', color: '#787878', lineHeight: 1.65, marginBottom: 14 }}>
                    {c.ai_executive_summary.slice(0, 140)}…
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: '#787878' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} />{c.analyst_name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#C0392B', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Read Case <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
