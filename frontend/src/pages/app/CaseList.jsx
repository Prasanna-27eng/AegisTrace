import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Globe, FileText, Share2, Trash2, ChevronDown } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';

export default function CaseList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast, user } = useStore();

  const [cases, setCases]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState(searchParams.get('q') || '');
  const [severity, setSeverity] = useState('');
  const [status, setStatus]   = useState('');
  const [sort, setSort]       = useState('newest');

  const fetchCases = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q)        p.set('q', q);
    if (severity) p.set('severity', severity);
    if (status)   p.set('status', status);
    p.set('sort', sort);
    api.get(`/api/cases?${p}`)
      .then(r => { setCases(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchCases(); }, [severity, status, sort]);

  const handleSearch = (e) => { if (e.key === 'Enter') fetchCases(); };

  const handleNewCase = async () => {
    try {
      const res = await api.post('/api/cases', {
        title: 'New Investigation',
        severity: 'medium',
        analyst_name: user?.name || 'Analyst',
      });
      navigate(`/app/cases/${res.data.id}`);
    } catch { addToast('Failed to create case', 'error'); }
  };

  const handleDelete = async (e, caseId, caseNumber) => {
    e.stopPropagation();
    if (!window.confirm(`Delete case ${caseNumber}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/cases/${caseId}`);
      setCases(prev => prev.filter(c => c.id !== caseId));
      addToast('Case deleted', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const handleShare = (e, token) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/public/${token}`);
    addToast('Share link copied!', 'success');
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Cases</h1>
          <div style={{ fontSize: '0.72rem', color: '#71717A', marginTop: 2 }}>
            {cases.length} case{cases.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn-accent" onClick={handleNewCase}>
          <Plus size={14} /> New Case
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717A' }} />
          <input
            className="at-input"
            placeholder="Search cases…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleSearch}
            style={{ paddingLeft: 30, fontSize: '0.8rem' }}
          />
        </div>
        <select className="at-select" value={severity} onChange={e => setSeverity(e.target.value)} style={{ flex: '0 1 130px' }}>
          <option value="">All Severities</option>
          {['critical','high','medium','low','info'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <select className="at-select" value={status} onChange={e => setStatus(e.target.value)} style={{ flex: '0 1 150px' }}>
          <option value="">All Statuses</option>
          {['open','in_progress','pending_closure','closed'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          ))}
        </select>
        <select className="at-select" value={sort} onChange={e => setSort(e.target.value)} style={{ flex: '0 1 130px' }}>
          <option value="newest">Newest First</option>
          <option value="severity">By Severity</option>
        </select>
      </div>

      {/* List */}
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
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color 0.15s', position: 'relative' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              onClick={() => navigate(`/app/cases/${c.id}`)}
            >
              {/* Critical pulse bar */}
              {c.severity === 'critical' && (
                <div className="critical-pulse" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '8px 0 0 8px', background: '#C0392B' }} />
              )}

              {/* Case info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                  {c.is_public && <Globe size={11} style={{ color: '#22C55E', flexShrink: 0 }} title="Public" />}
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.7rem', color: '#71717A', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'JetBrains Mono' }}>{c.case_number}</span>
                  {c.analyst_name && <span>{c.analyst_name}</span>}
                  {c.incident_type && <span style={{ textTransform: 'capitalize' }}>{c.incident_type.replace(/_/g,' ')}</span>}
                  <span>{new Date(c.created_at).toLocaleDateString('en-IE')}</span>
                </div>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                <SeverityBadge severity={c.severity} />
                <StatusBadge status={c.status} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button
                  className="btn-ghost"
                  style={{ padding: '4px 8px' }}
                  onClick={e => handleShare(e, c.share_token)}
                  title="Copy share link"
                >
                  <Share2 size={12} />
                </button>
                <a
                  href={`/api/reports/${c.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                  style={{ padding: '4px 8px', textDecoration: 'none' }}
                  title="Download PDF"
                >
                  <FileText size={12} />
                </a>
                <button
                  className="btn-ghost"
                  style={{ padding: '4px 8px', color: '#EF4444' }}
                  onClick={e => handleDelete(e, c.id, c.case_number)}
                  title="Delete case"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
