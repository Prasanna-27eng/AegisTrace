import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, Activity, Shield, Mail, BarChart2, ExternalLink } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';

function StatCard({ icon: Icon, label, value, sub, subColor, color }) {
  return (
    <div className="at-card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.72rem', color: '#71717A' }}>{label}</span>
        <Icon size={14} style={{ color: color || '#71717A' }} />
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: color || '#F0F0F8' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', marginTop: 4, color: subColor || '#71717A' }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [cases, setCases] = useState([]);
  const [vtHistory, setVtHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/cases'),
      api.get('/api/vt/history'),
      api.get('/api/portfolio/stats'),
    ]).then(([casesRes, vtRes, statsRes]) => {
      setCases(casesRes.data);
      setVtHistory(vtRes.data.slice(0, 5));
      setStats(statsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeCases = cases.filter(c => c.status !== 'closed');
  const critical = cases.filter(c => c.severity === 'critical');
  const pending = cases.filter(c => c.status === 'pending_closure');
  const recent = [...cases].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);
  const maliciousVt = vtHistory.filter(v => v.verdict === 'malicious').length;

  if (loading) return <div style={{ padding: 40, color: '#71717A', textAlign: 'center' }}>Loading dashboard…</div>;

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Dashboard</h1>
          <div style={{ fontSize: '0.75rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-IE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <button className="btn-accent" onClick={() => navigate('/app/cases/new')}>
          <Plus size={14} /> New Case
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon={BarChart2}  label="Active Cases"     value={activeCases.length}  sub={`${critical.length} critical`} subColor="#C0392B" color="#F0F0F8" />
        <StatCard icon={AlertTriangle} label="Critical"      value={critical.length}     sub="Needs attention"                subColor="#EF4444" color="#C0392B" />
        <StatCard icon={Shield}     label="VT Lookups"        value={vtHistory.length}   sub={`${maliciousVt} malicious`}    subColor="#EF4444" color="#A78BFA" />
        <StatCard icon={Activity}   label="Pending Closure"  value={pending.length}      sub="Awaiting review"                subColor="#EAB308" color="#EAB308" />
        <StatCard icon={Mail}       label="Total IOCs"        value={stats.total_iocs || 0} sub="Tracked"                    color="#22C55E" />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Recent Cases */}
        <div className="at-card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-label" style={{ margin: 0 }}>Recent Cases</div>
            <button onClick={() => navigate('/app/cases')} style={{ fontSize: '0.72rem', color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ExternalLink size={11} />
            </button>
          </div>
          {recent.length === 0 ? (
            <div style={{ color: '#71717A', fontSize: '0.82rem', padding: '20px 0', textAlign: 'center' }}>No cases yet. <span style={{ color: '#C0392B', cursor: 'pointer' }} onClick={() => navigate('/app/cases/new')}>Create one →</span></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/app/cases/${c.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0F1018', borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0F1018'}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: '0.68rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>{c.case_number}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <SeverityBadge severity={c.severity} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* VT Recent */}
          <div className="at-card" style={{ padding: '16px 18px' }}>
            <div className="section-label">Recent VT Lookups</div>
            {vtHistory.length === 0 ? (
              <div style={{ color: '#71717A', fontSize: '0.8rem', padding: '8px 0' }}>No lookups yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {vtHistory.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', color: '#B0B0C0', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{v.ioc}</span>
                    <span className={`verdict-${v.verdict}`} style={{ fontSize: '0.68rem', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{v.verdict?.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending closure alert */}
          {pending.length > 0 && (
            <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#EAB308', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> {pending.length} case{pending.length > 1 ? 's' : ''} pending closure
              </div>
              {pending.slice(0, 2).map(c => (
                <div key={c.id} onClick={() => navigate(`/app/cases/${c.id}`)} style={{ fontSize: '0.78rem', color: '#71717A', cursor: 'pointer', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {c.case_number} — {c.title.slice(0, 40)}…
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="at-card" style={{ padding: '14px 16px' }}>
            <div className="section-label">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'New Case', path: '/app/cases/new' },
                { label: 'VT Lookup', path: '/app/vt-lookup' },
                { label: 'Email Analysis', path: '/app/email' },
                { label: 'Tools Hub', path: '/app/tools' },
              ].map(({ label, path }) => (
                <button key={path} onClick={() => navigate(path)} className="btn-ghost" style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '7px 10px' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
