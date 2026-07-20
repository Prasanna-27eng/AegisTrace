import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Database, Check, X, ChevronDown, ChevronUp, FileText } from '../../components/icons';
import { SeverityBadge } from '../../components/SeverityBadge';
import api from '../../api/client';
import useStore from '../../store/useStore';

const STATUS_COLOR = {
  imported:       '#06B6D4',
  pending_review: '#EAB308',
  approved:       '#22C55E',
  rejected:       '#EF4444',
  deployed:       'rgba(26,22,18,0.7)',
};

function StatusPill({ status }) {
  const color = STATUS_COLOR[status] || 'rgba(26,22,18,0.5)';
  return (
    <span style={{
      fontSize: '0.62rem', fontFamily: 'JetBrains Mono', fontWeight: 600,
      color, background: `${color}18`, border: `1px solid ${color}40`,
      padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      {status?.replace('_', ' ')}
    </span>
  );
}

const STATUS_FILTERS = ['', 'imported', 'pending_review', 'approved', 'rejected', 'deployed'];

const SORT_FIELDS = [
  { id: 'generated_at', label: 'Date' },
  { id: 'rule_name',    label: 'Name' },
  { id: 'severity',     label: 'Severity' },
];

const columnHelper = createColumnHelper();

export default function DetectionLibrary() {
  useEffect(() => { document.title = 'Detection Library | AegisTrace'; }, []);
  const { addToast } = useStore();

  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [status, setStatus]     = useState('');
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [sorting, setSorting]   = useState([{ id: 'generated_at', desc: true }]);

  const loadRules = useCallback(() => {
    setLoading(true);
    api.get('/api/rules/pending')
      .then(r => { setRules(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const filtered = status ? rules.filter(r => r.status === status) : rules;

  const columns = useMemo(() => [
    columnHelper.accessor('generated_at', { id: 'generated_at' }),
    columnHelper.accessor('rule_name', { id: 'rule_name' }),
    columnHelper.accessor('severity', { id: 'severity', sortUndefined: 'last' }),
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => String(row.id),
  });

  const sortedRules = table.getRowModel().rows.map(r => r.original);
  const currentSort = sorting[0];

  const toggleSort = (fieldId) => {
    setSorting(prev => {
      if (prev[0]?.id === fieldId) return [{ id: fieldId, desc: !prev[0].desc }];
      return [{ id: fieldId, desc: fieldId === 'generated_at' }];
    });
  };

  const toggleExpand = async (rule) => {
    if (expanded === rule.id) { setExpanded(null); setDetail(null); return; }
    setExpanded(rule.id);
    try {
      const res = await api.get(`/api/rules/pending/${rule.id}`);
      setDetail(res.data);
    } catch { addToast('Failed to load rule detail', 'error'); }
  };

  const handleApprove = async (e, ruleId) => {
    e.stopPropagation();
    try {
      await api.post(`/api/rules/pending/${ruleId}/approve`);
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: 'approved' } : r));
      addToast('Rule approved', 'success');
    } catch { addToast('Failed to approve rule', 'error'); }
  };

  const handleReject = async (e, ruleId) => {
    e.stopPropagation();
    try {
      await api.post(`/api/rules/pending/${ruleId}/reject`);
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: 'rejected' } : r));
      addToast('Rule rejected', 'success');
    } catch { addToast('Failed to reject rule', 'error'); }
  };

  const counts = STATUS_FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = rules.filter(r => r.status === s).length;
    return acc;
  }, {});

  return (
    <div className="fade-up" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} style={{ color: 'var(--accent)' }} />
            <h1 className="cd" style={{ fontSize: '1.2rem' }}>Detection Library</h1>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.7rem', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
            <span>{rules.length} total</span>
            {counts.pending_review > 0 && <span style={{ color: '#EAB308' }}>{counts.pending_review} pending review</span>}
          </div>
        </div>
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(s => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            style={{
              fontSize: '0.72rem', padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'JetBrains Mono', border: '1px solid',
              background: status === s ? 'rgba(26,22,18,0.05)' : 'transparent',
              borderColor: status === s ? 'rgba(26,22,18,0.18)' : 'rgba(26,22,18,0.09)',
              color: status === s ? 'var(--text-primary)' : 'rgba(26,22,18,0.5)',
            }}>
            {s === '' ? 'All' : s.replace('_', ' ')}{s && counts[s] ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* Sort control */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {SORT_FIELDS.map(f => (
          <button key={f.id} onClick={() => toggleSort(f.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: '0.72rem', padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'JetBrains Mono', border: '1px solid rgba(26,22,18,0.09)',
              background: currentSort?.id === f.id ? 'rgba(26,22,18,0.05)' : 'transparent',
              color: currentSort?.id === f.id ? 'var(--text-primary)' : 'rgba(26,22,18,0.5)',
            }}>
            {f.label}
            {currentSort?.id === f.id && (currentSort.desc ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="at-card" style={{ padding: '10px 14px', height: 44 }}>
              <div className="skeleton" style={{ height: 13, width: `${45 + (i % 3) * 15}%` }} />
            </div>
          ))}
        </div>
      ) : sortedRules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Database size={36} style={{ color: 'rgba(26,22,18,0.110)', margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 8 }}>
            {status ? 'No rules match this filter' : 'No detection rules yet'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {status ? 'Try a different status filter.' : 'Rules appear here once imported or auto-generated from case investigations.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sortedRules.map(rule => {
            const isExpanded = expanded === rule.id;
            return (
              <div key={rule.id} className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  onClick={() => toggleExpand(rule)}
                  style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.rule_name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.67rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', flexWrap: 'wrap' }}>
                      {rule.trigger_technique && <span>{rule.trigger_technique}</span>}
                      <span>{rule.generated_at ? new Date(rule.generated_at).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                    {rule.severity && <SeverityBadge severity={rule.severity} />}
                    <StatusPill status={rule.status} />
                  </div>

                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {rule.status === 'pending_review' || rule.status === 'imported' ? (
                      <>
                        <button className="btn-ghost" style={{ padding: '3px 7px', color: '#22C55E' }}
                          onClick={e => handleApprove(e, rule.id)} title="Approve">
                          <Check size={11} />
                        </button>
                        <button className="btn-ghost" style={{ padding: '3px 7px', color: '#EF4444' }}
                          onClick={e => handleReject(e, rule.id)} title="Reject">
                          <X size={11} />
                        </button>
                      </>
                    ) : null}
                    {isExpanded ? <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(26,22,18,0.06)' }}>
                    {!detail ? (
                      <div style={{ padding: '12px 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loading…</div>
                    ) : (
                      <>
                        {detail.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '10px 0', whiteSpace: 'pre-wrap' }}>
                            {detail.description}
                          </div>
                        )}
                        {detail.sigma && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
                              <FileText size={11} /> SIGMA
                            </div>
                            <pre style={{
                              fontSize: '0.68rem', fontFamily: 'JetBrains Mono', background: 'rgba(26,22,18,0.04)',
                              padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 320, margin: 0,
                              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>{detail.sigma}</pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
