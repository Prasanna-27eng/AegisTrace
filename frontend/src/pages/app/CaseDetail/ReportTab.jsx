import React, { useState } from 'react';
import { Download, FileText, File, Shield, Loader2 } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

// Downloads a report via Axios (carries auth token) and triggers browser save
function useAuthDownload() {
  const { addToast } = useStore();
  const [loading, setLoading] = useState({});

  const download = async (url, filename) => {
    setLoading(p => ({ ...p, [filename]: true }));
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
    } catch (e) {
      addToast(e.response?.status === 401 ? 'Authentication required' : 'Download failed', 'error');
    } finally {
      setLoading(p => ({ ...p, [filename]: false }));
    }
  };

  return { download, loading };
}

export default function ReportTab({ caseId, caseData }) {
  if (!caseData) return null;

  const hasFindings = !!caseData?.findings;
  const hasAI       = !!caseData?.ai_executive_summary;
  const isClosed    = caseData?.status === 'closed';
  const { download, loading } = useAuthDownload();

  const reports = [
    {
      icon: <File size={28} style={{ color: '#4DA3FF', marginBottom: 12 }} />,
      title: 'Standard PDF Report',
      desc: 'Full case report with executive summary, findings, IOC table, MITRE mapping, timeline, and commands.',
      url: `/api/reports/${caseId}/pdf`,
      filename: `${caseData.case_number}-report.pdf`,
      btnClass: 'btn-accent',
      btnStyle: {},
    },
    {
      icon: <FileText size={28} style={{ color: '#A78BFA', marginBottom: 12 }} />,
      title: 'Word Document',
      desc: 'Editable DOCX for sharing with stakeholders or including in SOC documentation.',
      url: `/api/reports/${caseId}/docx`,
      filename: `${caseData.case_number}-report.docx`,
      btnClass: 'btn-ghost',
      btnStyle: {},
    },
    {
      icon: <Shield size={28} style={{ color: '#22C55E', marginBottom: 12 }} />,
      title: 'DORA Compliance Report',
      badge: 'EU',
      desc: 'Article 19 Major ICT Incident Report. Maps the 5 DORA pillars to this case. Required for EU financial services firms.',
      warn: !isClosed ? '⚠ Best to run after case closure for complete data.' : null,
      url: `/api/reports/${caseId}/dora`,
      filename: `${caseData.case_number}-dora.pdf`,
      btnClass: 'btn-ghost',
      btnStyle: { borderColor: 'rgba(34,197,94,0.3)', color: '#22C55E' },
      cardStyle: { borderColor: isClosed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)' },
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 800 }}>
      <div className="section-label">Download Reports</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 28 }}>
        {reports.map(r => (
          <div key={r.filename} className="at-card" style={{ padding: 20, ...(r.cardStyle || {}) }}>
            {r.icon}
            <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 6 }}>
              {r.title}
              {r.badge && <span style={{ marginLeft: 8, fontSize: '0.62rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E', padding: '1px 6px', borderRadius: 3, fontFamily: 'JetBrains Mono', verticalAlign: 'middle' }}>{r.badge}</span>}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#71717A', marginBottom: 16, lineHeight: 1.65 }}>
              {r.desc}
              {r.warn && <div style={{ color: '#EAB308', marginTop: 6 }}>{r.warn}</div>}
            </div>
            <button
              onClick={() => download(r.url, r.filename)}
              disabled={loading[r.filename]}
              className={r.btnClass}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', ...r.btnStyle }}
            >
              {loading[r.filename] ? <Loader2 size={14} className="spinner" /> : <Download size={14} />}
              {loading[r.filename] ? 'Generating…' : `Download ${r.badge ? 'DORA PDF' : r.title.includes('Word') ? 'DOCX' : 'PDF'}`}
            </button>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="at-card" style={{ padding: 16 }}>
        <div className="section-label">Report Contents Preview</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: '#71717A' }}>
          {[
            ['Case Number',    caseData?.case_number, true],
            ['Title',         caseData?.title,        true],
            ['Severity',      caseData?.severity?.toUpperCase(), true],
            ['Analyst',       caseData?.analyst_name, true],
            ['Customer',      caseData?.customer_name || '—', true],
            ['AI Summary',    hasAI ? '✓ Present' : '✗ Not generated — run AI Analysis tab first', hasAI],
            ['Findings',      hasFindings ? '✓ Present' : '✗ Missing — add findings in Investigation tab', hasFindings],
            ['Closure Notes', isClosed ? '✓ Present' : '✗ Case not closed — close case for full DORA report', isClosed],
          ].map(([k, v, ok]) => (
            <div key={k} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#71717A', minWidth: 120 }}>{k}</span>
              <span style={{ color: ok ? '#F0F0F8' : '#EAB308' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
