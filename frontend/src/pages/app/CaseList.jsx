import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Globe, FileText, Share2, Trash2, Lock, Clock, AlertTriangle, FolderOpen, Layers } from '../../components/icons';
import { SeverityBadge, StatusBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';
import InvestigationTemplates from '../../components/InvestigationTemplates';

function caseAge(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

function ageColor(dateStr, severity) {
  const hrs = (Date.now() - new Date(dateStr).getTime()) / 3600000;
  const limit = { critical: 4, high: 8, medium: 48, low: 168 }[severity] || 48;
  if (hrs > limit) return '#EF4444';
  if (hrs > limit * 0.8) return '#EAB308';
  return '#888888';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return `${Math.round(diff)}s ago`;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function ConfirmModal({ caseNumber, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '24px 28px', maxWidth: 400, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
      >
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8, color: '#BDD4E8' }}>Delete case?</h3>
        <p style={{ fontSize: '0.8rem', color: '#787878', marginBottom: 24, lineHeight: 1.55 }}>
          <span style={{ fontFamily: 'JetBrains Mono', color: '#7A9DB8' }}>{caseNumber}</span> will be permanently deleted. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel} style={{ fontSize: '0.8rem' }}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm} style={{ fontSize: '0.8rem' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

const QUICK_FILTERS = [
  { label: 'All',              status: '',                severity: '' },
  { label: 'Open',             status: 'open',            severity: '' },
  { label: 'In Progress',      status: 'in_progress',     severity: '' },
  { label: 'Pending Closure',  status: 'pending_closure', severity: '' },
  { label: 'Critical',         status: '',                severity: 'critical' },
  { label: 'Closed',           status: 'closed',          severity: '' },
];

export default function CaseList() {
  useEffect(() => { document.title = 'Cases | AegisTrace'; }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast, user } = useStore();

  const [cases, setCases]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [q, setQ]                   = useState(searchParams.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(searchParams.get('q') || '');
  const [severity, setSeverity]     = useState(searchParams.get('severity') || '');
  const [status, setStatus]         = useState(searchParams.get('status') || '');
  const [sort, setSort]             = useState('newest');
  const [activeChip, setActiveChip] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [confirmModal, setConfirmModal]   = useState(null);

  // Debounce q → debouncedQ
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 320);
    return () => clearTimeout(t);
  }, [q]);

  const fetchCases = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (debouncedQ) p.set('q', debouncedQ);
    if (severity)   p.set('severity', severity);
    if (status)     p.set('status', status);
    p.set('sort', sort);
    api.get(`/api/cases?${p}`)
      .then(r => { setCases(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [debouncedQ, severity, status, sort]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const applyChip = (idx, f) => {
    setActiveChip(idx);
    setSeverity(f.severity);
    setStatus(f.status);
  };

  const handleSearch = () => {}; // live search handles it — kept for onKeyDown compatibility

  const handleNewCase = async () => {
    try {
      const res = await api.post('/api/cases', { title: 'New Investigation', severity: 'medium', analyst_name: user?.name || 'Analyst' });
      navigate(`/app/cases/${res.data.id}`);
    } catch { addToast('Failed to create case', 'error'); }
  };

  const handleTemplateSelect = async (template) => {
    setShowTemplates(false);
    try {
      const res = await api.post('/api/cases', {
        title: template.title,
        description: template.description,
        severity: template.severity,
        incident_type: template.incident_type,
        analyst_name: user?.name || 'Analyst',
      });
      addToast(`Case created from ${template.label} template`, 'success');
      navigate(`/app/cases/${res.data.id}`);
    } catch { addToast('Failed to create case from template', 'error'); }
  };

  const handleDelete = (e, caseId, caseNumber) => {
    e.stopPropagation();
    setConfirmModal({ caseId, caseNumber });
  };

  const confirmDelete = async () => {
    const { caseId } = confirmModal;
    setConfirmModal(null);
    try {
      await api.delete(`/api/cases/${caseId}`);
      setCases(prev => prev.filter(c => c.id !== caseId));
      addToast('Case deleted', 'success');
    } catch (err) { addToast(err.response?.data?.detail || 'Delete failed', 'error'); }
  };

  const handleShare = (e, token) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/public/${token}`);
    addToast('Share link copied!', 'success');
  };

  const handleDownloadPdf = async (e, caseId, caseNumber) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/api/reports/${caseId}/pdf`, { responseType: 'blob' });
      const href = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = href; a.download = `${caseNumber}-report.pdf`; a.click();
      URL.revokeObjectURL(href);
    } catch { addToast('Download failed', 'error'); }
  };

  const handleTogglePublic = async (e, caseId) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/api/cases/${caseId}/share`);
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, is_public: res.data.is_public } : c));
      addToast(res.data.is_public ? 'Case is now public' : 'Case is now private', 'success');
    } catch { addToast('Failed to change visibility', 'error'); }
  };

  // Stats for header
  const open      = cases.filter(c => c.status === 'open').length;
  const critical  = cases.filter(c => c.severity === 'critical' && c.status !== 'closed').length;
  const pending   = cases.filter(c => c.status === 'pending_closure').length;

  return (
    <div className="fade-up" style={{ padding: '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/assets/brand/aegistrace-icon-transparent.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain', opacity: 0.8, filter: 'drop-shadow(0 0 4px rgba(74,126,200,0.5))' }}/>
            <h1 className="cd" style={{ fontSize: '1.2rem' }}>Cases</h1>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.7rem', fontFamily: 'JetBrains Mono' }}>
            <span style={{ color: '#787878' }}>{cases.length} total</span>
            {open > 0 && <span style={{ color: '#EF4444' }}>{open} open</span>}
            {critical > 0 && <span style={{ color: '#4A7EC8' }}>{critical} critical</span>}
            {pending > 0 && <span style={{ color: '#EAB308' }}>{pending} pending</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setShowTemplates(true)} style={{ fontSize: '0.78rem' }}>
            <Layers size={13} /> Templates
          </button>
          <button className="btn-accent" onClick={handleNewCase} style={{ fontSize: '0.8rem' }}>
            <Plus size={13} /> New Case
          </button>
        </div>
      </div>

      {/* Delete confirm modal */}
      {confirmModal && (
        <ConfirmModal
          caseNumber={confirmModal.caseNumber}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Investigation Templates modal */}
      {showTemplates && (
        <InvestigationTemplates
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Quick filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {QUICK_FILTERS.map((f, idx) => (
          <button
            key={f.label}
            onClick={() => applyChip(idx, f)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: activeChip === idx ? 600 : 400, transition: 'all 0.15s',
              background: activeChip === idx ? '#4A7EC8' : 'rgba(255,255,255,0.04)',
              color: activeChip === idx ? '#fff' : '#787878',
              border: activeChip === idx ? '1px solid #4A7EC8' : '1px solid rgba(74,126,200,0.1)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + filters row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#787878' }} />
          <input className="at-input" placeholder="Search title, case number, analyst, findings…" value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 30, paddingRight: q ? 28 : 12, fontSize: '0.8rem' }} />
          {q && (
            <button onClick={() => setQ('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#686868', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <select className="at-select" value={severity} onChange={e => { setSeverity(e.target.value); setActiveChip(-1); }} style={{ flex: '0 1 130px' }}>
          <option value="">All Severities</option>
          {['critical','high','medium','low','info'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <select className="at-select" value={sort} onChange={e => setSort(e.target.value)} style={{ flex: '0 1 130px' }}>
          <option value="newest">Newest First</option>
          <option value="severity">By Severity</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0,1,2,3,4,5,6,7].map(i => (
            <div key={i} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, background: '#141420', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 13, width: `${45 + (i % 3) * 15}%`, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 9, width: `${25 + (i % 4) * 8}%` }} />
              </div>
              <div className="skeleton" style={{ height: 22, width: 54 }} />
              <div className="skeleton" style={{ height: 22, width: 80 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2,3].map(j => <div key={j} className="skeleton" style={{ height: 26, width: 28, borderRadius: 6 }} />)}
              </div>
            </div>
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FolderOpen size={36} style={{ color: 'rgba(90,138,159,0.2)', margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 8 }}>
            {q || severity || status ? 'No cases match your filters' : 'No cases yet'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#787878', marginBottom: 16, maxWidth: 340, margin: '0 auto 16px' }}>
            {q || severity || status
              ? 'Try adjusting your filters or clearing the search.'
              : 'Create your first investigation case to start building your SOC queue.'}
          </div>
          {(q || severity || status) ? (
            <button className="btn-ghost" onClick={() => { setQ(''); setSeverity(''); setStatus(''); setActiveChip(0); }} style={{ fontSize: '0.8rem' }}>
              Clear filters
            </button>
          ) : (
            <button className="btn-accent" onClick={handleNewCase} style={{ fontSize: '0.8rem' }}>
              <Plus size={13} /> Create First Case
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cases.map(c => {
            const age     = caseAge(c.created_at);
            const aColor  = ageColor(c.created_at, c.severity);
            const updated = timeAgo(c.updated_at);
            const isSlaBreached = (() => {
              const hrs = (Date.now() - new Date(c.created_at).getTime()) / 3600000;
              const limit = { critical:4, high:8, medium:48, low:168 }[c.severity] || 48;
              return c.status !== 'closed' && hrs > limit;
            })();
            const pendingApproval = c.status === 'pending_closure';

            return (
              <div
                key={c.id}
                className={`at-card${pendingApproval ? ' signal-gold' : ''}`}
                onClick={() => navigate(`/app/cases/${c.id}`)}
                style={{
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: '#141420',
                  ...(isSlaBreached && !pendingApproval ? { borderColor: 'rgba(239,68,68,0.2)' } : {}),
                  borderRadius: 8, position: 'relative', overflow: 'hidden'
                }}
              >
                {/* Severity left bar */}
                {!pendingApproval && c.severity === 'critical' && (
                  <div className="critical-pulse" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '8px 0 0 8px', background: '#4A7EC8' }} />
                )}
                {!pendingApproval && isSlaBreached && c.severity !== 'critical' && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '8px 0 0 8px', background: '#EF4444', opacity: 0.6 }} />
                )}

                {/* Case info */}
                <div style={{ flex: 1, minWidth: 0, paddingLeft: (c.severity === 'critical' || isSlaBreached || pendingApproval) ? 6 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    {c.is_public && <Globe size={10} style={{ color: '#22C55E', flexShrink: 0 }} title="Public" />}
                    {isSlaBreached && <span title="SLA breach"><AlertTriangle size={11} style={{ color: '#EF4444', flexShrink: 0 }} /></span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: '0.67rem', color: '#787878', fontFamily: 'JetBrains Mono', flexWrap: 'wrap' }}>
                    <span>{c.case_number}</span>
                    {c.analyst_name && <span>· {c.analyst_name}</span>}
                    {c.incident_type && <span style={{ textTransform: 'capitalize' }}>· {c.incident_type.replace(/_/g,' ')}</span>}
                  </div>
                </div>

                {/* Age + updated */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.67rem', color: aColor, fontFamily: 'JetBrains Mono' }}>
                    <Clock size={10} />
                    <span>{age}</span>
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#787878', fontFamily: 'JetBrains Mono' }}>{updated}</div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                  {pendingApproval && <span className="signal-dot" title="Pending approval" />}
                  {isSlaBreached && (
                    <span style={{ fontSize: '0.6rem', fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '1px 6px', borderRadius: 3, letterSpacing: '0.06em' }}>
                      SLA BREACH
                    </span>
                  )}
                  <SeverityBadge severity={c.severity} />
                  <StatusBadge status={c.status} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn-ghost" style={{ padding: '3px 7px', color: c.is_public ? '#22C55E' : '#787878' }}
                    onClick={e => handleTogglePublic(e, c.id)} title={c.is_public ? 'Public' : 'Private'}>
                    {c.is_public ? <Globe size={11} /> : <Lock size={11} />}
                  </button>
                  <button className="btn-ghost" style={{ padding: '3px 7px' }} onClick={e => handleShare(e, c.share_token)} title="Copy share link">
                    <Share2 size={11} />
                  </button>
                  <button className="btn-ghost" style={{ padding: '3px 7px' }} onClick={e => handleDownloadPdf(e, c.id, c.case_number)} title="Download PDF">
                    <FileText size={11} />
                  </button>
                  <button className="btn-ghost" style={{ padding: '3px 7px', color: '#EF4444' }} onClick={e => handleDelete(e, c.id, c.case_number)} title="Delete">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
