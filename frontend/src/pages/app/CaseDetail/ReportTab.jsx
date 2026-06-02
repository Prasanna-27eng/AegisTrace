import React from 'react';
import { Download, FileText, File } from 'lucide-react';

export default function ReportTab({ caseId, caseData }) {
  return (
    <div style={{ padding: '24px', maxWidth: 700 }}>
      <div className="section-label">Generate Report</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="at-card" style={{ padding: 20 }}>
          <File size={28} style={{ color: '#C0392B', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 6 }}>PDF Report</div>
          <div style={{ fontSize: '0.8rem', color: '#71717A', marginBottom: 16 }}>Professional branded PDF with executive summary, findings, IOCs, MITRE mapping, and timeline.</div>
          <a href={`/api/reports/${caseId}/pdf`} target="_blank" rel="noreferrer" className="btn-accent" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
            <Download size={14} /> Download PDF
          </a>
        </div>
        <div className="at-card" style={{ padding: 20 }}>
          <FileText size={28} style={{ color: '#A78BFA', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 6 }}>Word Document</div>
          <div style={{ fontSize: '0.8rem', color: '#71717A', marginBottom: 16 }}>Editable DOCX report with all case details. Share with stakeholders or include in SOC documentation.</div>
          <a href={`/api/reports/${caseId}/docx`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
            <Download size={14} /> Download DOCX
          </a>
        </div>
      </div>

      <div className="at-card" style={{ padding: 16 }}>
        <div className="section-label">Report Preview</div>
        <div style={{ fontSize: '0.8rem', color: '#71717A', lineHeight: 1.7 }}>
          <strong style={{ color: '#F0F0F8' }}>Case:</strong> {caseData?.case_number}<br />
          <strong style={{ color: '#F0F0F8' }}>Title:</strong> {caseData?.title}<br />
          <strong style={{ color: '#F0F0F8' }}>Severity:</strong> {caseData?.severity?.toUpperCase()}<br />
          <strong style={{ color: '#F0F0F8' }}>Analyst:</strong> {caseData?.analyst_name}<br />
          <strong style={{ color: '#F0F0F8' }}>Customer:</strong> {caseData?.customer_name}<br />
          <strong style={{ color: '#F0F0F8' }}>AI Summary:</strong> {caseData?.ai_executive_summary ? '✓ Present' : '✗ Not generated'}<br />
          <strong style={{ color: '#F0F0F8' }}>Findings:</strong> {caseData?.findings ? '✓ Present' : '✗ Missing'}<br />
        </div>
      </div>
    </div>
  );
}
