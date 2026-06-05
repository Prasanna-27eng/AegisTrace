import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Globe, Share2, Download, Save, Loader2 } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../../components/SeverityBadge';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

import OverviewTab      from './OverviewTab';
import InvestigationTab from './InvestigationTab';
import IOCsTab          from './IOCsTab';
import TerminalTab      from './TerminalTab';
import TimelineTab      from './TimelineTab';
import PlaybookTab      from './PlaybookTab';
import AIAnalysisTab    from './AIAnalysisTab';
import AIChatTab        from './AIChatTab';
import ReportTab        from './ReportTab';
import CommentsTab      from './CommentsTab';
import TrustTimelineTab from './TrustTimelineTab';
import ProvenanceTab    from './ProvenanceTab';

const TABS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'investigation', label: 'Investigation' },
  { id: 'iocs',          label: 'IOCs' },
  { id: 'terminal',      label: 'Terminal' },
  { id: 'timeline',      label: 'Timeline' },
  { id: 'trust',         label: 'Trust' },
  { id: 'playbook',      label: 'Playbook' },
  { id: 'ai',            label: 'AI Analysis' },
  { id: 'chat',          label: 'AI Chat' },
  { id: 'comments',      label: 'Comments' },
  { id: 'provenance',    label: 'Provenance' },
  { id: 'report',        label: 'Report' },
  { id: 'edr',           label: '🛡 EDR', newTab: true },
];

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast, autosaveStatus, setAutosaveStatus } = useStore();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const debounceTimer = useRef(null);

  const isNew = id === 'new';

  const loadCase = useCallback(async () => {
    if (isNew) { setLoading(false); return; }
    try {
      const res = await api.get(`/api/cases/${id}`);
      setCaseData(res.data);
    } catch { addToast('Failed to load case', 'error'); }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadCase(); }, [loadCase]);

  // Autosave with 2-second debounce — useRef ensures clearTimeout works reliably
  const autosave = useCallback((updates) => {
    if (isNew) return;
    clearTimeout(debounceTimer.current);
    setAutosaveStatus('saving');
    debounceTimer.current = setTimeout(async () => {
      try {
        await api.patch(`/api/cases/${id}`, updates);
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus('idle'), 2000);
      } catch { setAutosaveStatus('idle'); }
    }, 2000);
  }, [id, isNew]);

  const updateCase = useCallback((updates) => {
    setCaseData(prev => ({ ...prev, ...updates }));
    autosave(updates);
  }, [autosave]);

  const saveNow = async () => {
    if (!caseData || isNew) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/cases/${id}`, caseData);
      setCaseData(res.data);
      addToast('Case saved', 'success');
    } catch { addToast('Save failed', 'error'); }
    setSaving(false);
  };

  const togglePublic = async () => {
    try {
      const res = await api.post(`/api/cases/${id}/share`);
      setCaseData(prev => ({ ...prev, is_public: res.data.is_public }));
      addToast(res.data.is_public ? 'Case made public' : 'Case made private', 'success');
    } catch { addToast('Failed to toggle visibility', 'error'); }
  };

  const copyShareLink = () => {
    if (!caseData) return;
    navigator.clipboard.writeText(`${window.location.origin}/public/${caseData.share_token}`);
    addToast('Share link copied!', 'success');
  };

  if (loading) return <div style={{ padding: 40, color: '#787878', textAlign: 'center' }}>Loading case…</div>;
  if (!caseData && !isNew) return <div style={{ padding: 40, color: '#787878' }}>Case not found.</div>;

  const tabProps = { caseData, updateCase, reload: loadCase, caseId: id };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Case header */}
      <div style={{ background: '#111111', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={() => navigate('/app/cases')} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}>
            <ChevronLeft size={14} /> Cases
          </button>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span style={{ fontSize: '0.78rem', color: '#787878', fontFamily: 'JetBrains Mono' }}>{caseData?.case_number}</span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            {autosaveStatus === 'saving' && <span style={{ fontSize: '0.7rem', color: '#787878', display: 'flex', alignItems: 'center', gap: 4 }}><Loader2 size={11} className="spinner" /> Saving…</span>}
            {autosaveStatus === 'saved' && <span style={{ fontSize: '0.7rem', color: '#22C55E' }}>✓ Saved</span>}
            <button className="btn-ghost" onClick={saveNow} disabled={saving} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
              {saving ? <Loader2 size={12} className="spinner" /> : <Save size={12} />}
            </button>
            <button className="btn-ghost" onClick={copyShareLink} style={{ padding: '5px 10px', fontSize: '0.75rem' }}><Share2 size={12} /></button>
            <button onClick={togglePublic} className={caseData?.is_public ? 'btn-accent' : 'btn-ghost'} style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Globe size={12} /> {caseData?.is_public ? 'Public' : 'Private'}
            </button>
            <a href={`/api/reports/${id}/pdf`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem', textDecoration: 'none' }}><Download size={12} /></a>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, flex: 1 }}>{caseData?.title || 'New Case'}</h2>
          {caseData && <SeverityBadge severity={caseData.severity} />}
          {caseData && <StatusBadge status={caseData.status} />}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#111111', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            title={t.newTab ? 'Opens in a new tab' : undefined}
            onClick={() => {
              if (t.newTab) {
                window.open(`${window.location.origin}/app/edr/${id}`, '_blank', 'noopener,noreferrer');
              } else {
                setTab(t.id);
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'overview'      && <OverviewTab {...tabProps} />}
        {tab === 'investigation' && <InvestigationTab {...tabProps} />}
        {tab === 'iocs'          && <IOCsTab {...tabProps} />}
        {tab === 'terminal'      && <TerminalTab {...tabProps} />}
        {tab === 'timeline'      && <TimelineTab {...tabProps} />}
        {tab === 'trust'         && <TrustTimelineTab caseId={id} />}
        {tab === 'playbook'      && <PlaybookTab {...tabProps} />}
        {tab === 'ai'            && <AIAnalysisTab {...tabProps} />}
        {tab === 'chat'          && <AIChatTab {...tabProps} />}
        {tab === 'comments'      && <CommentsTab caseId={id} />}
        {tab === 'provenance'    && <ProvenanceTab caseId={id} />}
        {tab === 'report'        && <ReportTab {...tabProps} />}
      </div>
    </div>
  );
}
