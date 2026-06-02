import React from 'react';
import { Download, FileText, File, Shield } from 'lucide-react';

export default function ReportTab({ caseId, caseData }) {
  const hasFindings    = !!caseData?.findings;
  const hasAI          = !!caseData?.ai_executive_summary;
  const isClosed       = caseData?.status === 'closed';

  return (
    <div style={{ padding: '24px', maxWidth: 800 }}>
      <div className="section-label">Download Reports</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 28 }}>

        {/* PDF */}
        <div className="at-card" style={{ padding: 20 }}>
          <File size={28} style={{ color: '#C0392B', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 6 }}>Standard PDF Report</div>
          <div style={{ fontSize: '0.78rem', color: '#71717A', marginBottom: 16, lineHeight: 1.65 }}>
            Full case report with executive summary, findings, IOC table, MITRE mapping, timeline, and commands.
          </div>
          <a href={`/api/reports/${caseId}/pdf`} target="_blank" rel="noreferrer"
            className="btn-accent" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
            <Download size={14} /> Download PDF
          </a>
        </div>

        {/* DOCX */}
        <div className="at-card" style={{ padding: 20 }}>
          <FileText size={28} style={{ color: '#A78BFA', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 6 }}>Word Document</div>
          <div style={{ fontSize: '0.78rem', color: '#71717A', marginBottom: 16, lineHeight: 1.65 }}>
            Editable DOCX for sharing with stakeholders or including in SOC documentation.
          </div>
          <a href={`/api/reports/${caseId}/docx`} target="_blank" rel="noreferrer"
            className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
            <Download size={14} /> Download DOCX
          </a>
        </div>

        {/* DORA */}
        <div className="at-card" style={{ padding: 20, borderColor: isClosed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)' }}>
          <Shield size={28} style={{ color: '#22C55E', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 6 }}>
            DORA Compliance Report
            <span style={{ marginLeft: 8, fontSize: '0.62rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E', padding: '1px 6px', borderRadius: 3, fontFamily: 'JetBrains Mono', verticalAlign: 'middle' }}>EU</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#71717A', marginBottom: 16, lineHeight: 1.65 }}>
            Article 19 Major ICT Incident Report. Maps the 5 DORA pillars to this case. Required for EU financial services firms.
            {!isClosed && <div style={{ color: '#EAB308', marginTop: 6 }}>⚠ Best to run after case closure for complete data.</div>}
          </div>
          <a href={`/api/reports/${caseId}/dora`} target="_blank" rel="noreferrer"
            className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', borderColor: 'rgba(34,197,94,0.3)', color: '#22C55E' }}>
            <Download size={14} /> Download DORA PDF
          </a>
        </div>
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
