import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Globe, FileText, Share2 } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';

export default function CaseList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useStore();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');

  const fetchCases = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (severity) params.set('severity', severity);
    if (status) params.set('status', status);
    params.set('sort', sort);
    api.get(`/api/cases?${params}`).then(r => { setCases(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchCases(); }, [severity, status, sort]);

  const handleSearch = (e) => { if (e.key === 'Enter') fetchCases(); };

  const handleNewCase = async () => {
    try {
      const res = await api.post('/api/cases', { title: 'New Investigation', severity: 'medium', analyst_name: 'Prasanna Kumar' });
      navigate(`/app/cases/${res.data.id}`);
    } catch { addToast('Failed to create case', 'error'); }
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Cases</h1>
          <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: 2 }}>{cases.length} case{cases.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn-accent" onClick={handleNewCase}><Plus size={14} /> New Case</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
          <input className="at-input" placeholder="Search cases…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleSearch} style={{ paddingLeft: 30, fontSize: '0.8rem' }} />
        </div>
        <select className="at-select" value={severity} onChange={e => setSeverity(e.target.value)} style={{ flex: '0 1 130px' }}>
          <option value="">All Severities</option>
          {['critical','high','medium','low','info'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <select className="at-select" value={status} onChange={e => setStatus(e.target.value)} style={{ flex: '0 1 160px' }}>
          <option value="">All Statuses</option>
          {['open','in_progress','pending_closure','closed'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select className="at-select" value={sort} onChange={e => setSort(e.target.value)} style={{ flex: '0 1 130px' }}>
          <option value="newest">Newest First</option>
          <option value="severity">By Severity</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#71717A' }}>Loading…</div>
      ) : cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#71717A' }}>
          <div style={{ marginBottom: 12 }}>No cases found.</div>
          <button className="btn-accent" onClick={handleNewCase}><Plus size={14} /> Create First Case</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cases.map(c => (
            <div
              key={c.id}
              className="at-card"
              style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'border-color 0.15s', position: 'relative' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              onClick={() => navigate(`/app/cases/${c.id}`)}
            >
              {c.severity === 'critical' && <div className="critical-pulse" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '8px 0 0 8px', background: '#C0392B' }} />}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.title}</span>
                  {c.is_public && <Globe size={12} style={{ color: '#22C55E' }} title="Public" />}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: '#71717A' }}>
                  <span style={{ fontFamily: 'JetBrains Mono' }}>{c.case_number}</span>
                  {c.analyst_name && <span>{c.analyst_name}</span>}
                  {c.incident_type && <span>{c.incident_type}</span>}
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <SeverityBadge severity={c.severity} />
                <StatusBadge status={c.status} />
              </div>

              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button
                  className="btn-ghost"
                  style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/public/${c.share_token}`)}
                  title="Copy share link"
                >
                  <Share2 size={12} />
                </button>
                <a href={`/api/reports/${c.id}/pdf`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: '5px 10px', fontSize: '0.72rem', textDecoration: 'none' }} title="Download PDF">
                  <FileText size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
