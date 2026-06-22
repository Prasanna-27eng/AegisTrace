import React, { useState } from 'react';
import { Download, FileText, File, Shield, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

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
  const { addToast } = useStore();

  const [dpdpaReport, setDpdpaReport] = useState(null);
  const [dpdpaLoading, setDpdpaLoading] = useState(false);

  const generateDpdpa = async () => {
    setDpdpaLoading(true);
    try {
      const r = await api.get(`/api/reports/dpdpa/${caseId}`);
      setDpdpaReport(r.data);
    } catch (e) {
      addToast('Failed to generate DPDPA report', 'error');
    } finally {
      setDpdpaLoading(false);
    }
  };

  const [regPackage, setRegPackage] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regScope, setRegScope]     = useState('all');

  const generateRegPackage = async () => {
    setRegLoading(true);
    try {
      const r = await api.get(`/api/reports/regulatory-package/${caseId}?regulation=${regScope}`);
      setRegPackage(r.data);
    } catch (e) {
      addToast('Failed to generate package', 'error');
    } finally {
      setRegLoading(false);
    }
  };

  const downloadPackage = () => {
    if (!regPackage) return;
    const blob = new Blob([JSON.stringify(regPackage, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `regulatory-evidence-${regPackage.case?.case_number || caseId}-${regScope}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reports = [
    {
      icon: <File size={28} style={{ color: '#4A7EC8', marginBottom: 12 }} />,
      title: 'Standard PDF Report',
      desc: 'Full case report with executive summary, findings, IOC table, MITRE mapping, timeline, and commands.',
      url: `/api/reports/${caseId}/pdf`,
      filename: `${caseData.case_number}-report.pdf`,
      btnClass: 'btn-accent',
      btnStyle: {},
    },
    {
      icon: <FileText size={28} style={{ color: '#8BB8E8', marginBottom: 12 }} />,
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
            <div style={{ fontSize: '0.78rem', color: '#787878', marginBottom: 16, lineHeight: 1.65 }}>
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

      {/* ── DPDPA 2023 Compliance Section ── */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-label">Regulatory Compliance</div>
        <div className="at-card" style={{ padding: 20, borderColor: 'rgba(37,99,235,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Shield size={28} style={{ color: '#60A5FA', marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                DPDPA 2023 Compliance Report
                <span style={{ fontSize: '0.62rem', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', color: '#60A5FA', padding: '1px 6px', borderRadius: 3, fontFamily: 'JetBrains Mono', verticalAlign: 'middle' }}>IN</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#787878', marginBottom: 16, lineHeight: 1.65 }}>
                Digital Personal Data Protection Act 2023. Maps this investigation to DPDPA obligations including breach notification (Section 8(6)), data retention (Section 8(5)), and DPIA requirements (Section 10). Required for organisations processing personal data of Indian residents.
              </div>
              <button
                onClick={generateDpdpa}
                disabled={dpdpaLoading}
                className="btn-ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', borderColor: 'rgba(37,99,235,0.3)', color: '#60A5FA' }}
              >
                {dpdpaLoading ? <Loader2 size={14} className="spinner" /> : '📋'}
                {dpdpaLoading ? 'Generating…' : 'DPDPA 2023 Report'}
              </button>
            </div>
          </div>
        </div>

        {dpdpaReport && (
          <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'rgba(37,99,235,0.08)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                DPDPA 2023 — Digital Personal Data Protection Act
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#60A5FA', marginTop: 4 }}>
                ⚠ Notification deadline: {dpdpaReport.notification_deadline}
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 14, color: '#7A9DB8', lineHeight: 1.7, marginBottom: 20 }}>
                {dpdpaReport.executive_summary}
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Section', 'Title', 'Status', 'Evidence'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#787878', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dpdpaReport.dpdpa_obligations.map((o, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{o.section}</td>
                      <td style={{ padding: '10px 12px', color: '#BDD4E8' }}>{o.title}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px',
                          background: o.status === 'APPLICABLE' ? 'rgba(239,68,68,0.1)' : o.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(37,99,235,0.1)',
                          color: o.status === 'APPLICABLE' ? '#F87171' : o.status === 'PENDING' ? '#FBBF24' : '#60A5FA',
                          borderRadius: 3,
                        }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#787878', fontSize: 12 }}>{o.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Regulatory Evidence Package ── */}
      <div style={{ marginTop: 24, marginBottom: 28, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', background: 'rgba(74,126,200,0.06)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Regulatory Evidence Package
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Hash-chained AI decisions · Human approvals · Delegation tokens · ATSP standard
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Scope selector */}
            <select value={regScope} onChange={e => setRegScope(e.target.value)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '6px 10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <option value="all">All Regulations</option>
              <option value="eu_ai_act">EU AI Act</option>
              <option value="dora">DORA</option>
              <option value="dpdpa">DPDPA</option>
            </select>
            <button onClick={generateRegPackage} disabled={regLoading}
              style={{ background: '#4A7EC8', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: regLoading ? 0.6 : 1 }}>
              {regLoading ? 'Generating...' : 'Generate Package'}
            </button>
            {regPackage && (
              <button onClick={downloadPackage}
                style={{ background: 'none', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 6, padding: '7px 14px', color: '#10B981', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}>
                Download JSON
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {regPackage && (
          <div style={{ padding: '16px 20px' }}>
            {/* Completeness score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '12px 16px', background: 'var(--surface)', borderRadius: 6 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: regPackage.evidence_completeness.score_pct >= 80 ? '#10B981' : regPackage.evidence_completeness.score_pct >= 50 ? '#F59E0B' : '#EF4444' }}>
                  {regPackage.evidence_completeness.score_pct}%
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>COMPLETE</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{regPackage.evidence_completeness.summary}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(regPackage.evidence_completeness.checks).map(([k, v]) => (
                    <span key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 7px', borderRadius: 3, background: v ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', color: v ? '#10B981' : '#EF4444', border: `1px solid ${v ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}` }}>
                      {v ? '✓' : '✗'} {k.replace(/_/g,' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Chain integrity */}
            <div style={{ marginBottom: 16, padding: '10px 14px', background: regPackage.chain_integrity.valid ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${regPackage.chain_integrity.valid ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 6 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: regPackage.chain_integrity.valid ? '#10B981' : '#EF4444', marginBottom: 4 }}>
                {regPackage.chain_integrity.valid ? 'Chain Integrity Verified' : 'Chain Integrity Violation'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                Fingerprint: {regPackage.chain_integrity.chain_fingerprint}
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {regPackage.chain_integrity.entries_chained} chained entries · {regPackage.chain_integrity.algorithm}
              </div>
            </div>

            {/* Regulatory mapping tables */}
            {Object.entries(regPackage.regulatory_mapping).map(([reg, articles]) => (
              <div key={reg} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8BB8E8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {reg.replace(/_/g,' ')}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 12 }}>
                  <tbody>
                    {Object.entries(articles).map(([article, result]) => (
                      <tr key={article} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 10px', color: 'var(--text-secondary)' }}>{article}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: result.satisfied ? '#10B981' : '#F59E0B', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {result.satisfied ? '✓ Evidenced' : '⚠ Gap'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Notification deadlines */}
            <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#F59E0B', letterSpacing: '0.1em', marginBottom: 6 }}>NOTIFICATION DEADLINES</div>
              {Object.entries(regPackage.notification_deadlines).map(([reg, deadline]) => (
                <div key={reg} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-secondary)', paddingBottom: 3 }}>
                  <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: 9 }}>{reg.replace(/_/g,' ')}</span>
                  <span style={{ color: '#F59E0B' }}>{deadline}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Completeness Preview ── */}
      {(() => {
        const hasDescription = !!(caseData?.description && caseData.description.length > 20);
        const hasIOCs        = (() => { try { return JSON.parse(caseData?.iocs || '[]').length > 0; } catch { return false; } })();
        const hasMITRE       = (() => { try { return JSON.parse(caseData?.mitre_techniques || '[]').length > 0; } catch { return false; } })();
        const hasRecommendations = !!(caseData?.recommendations && caseData.recommendations.length > 10);

        const sections = [
          { label: 'Case description',     done: hasDescription,                       hint: 'Add description in Overview tab' },
          { label: 'Investigation findings', done: hasFindings,                         hint: 'Add findings in Investigation tab' },
          { label: 'IOC enrichment',        done: hasIOCs,                             hint: 'Add IOCs in IOCs tab' },
          { label: 'MITRE ATT&CK mapping',  done: hasMITRE,                            hint: 'Add MITRE techniques via AI Analysis' },
          { label: 'AI executive summary',  done: hasAI,                               hint: 'Generate in AI Analysis tab' },
          { label: 'Recommendations',       done: hasRecommendations,                  hint: 'Add in Investigation tab' },
          { label: 'Case closed',           done: isClosed,                            hint: 'Close the case when investigation complete' },
        ];
        const complete = sections.filter(s => s.done).length;
        const pct = Math.round((complete / sections.length) * 100);
        const isReady = pct >= 85;

        return (
          <div className="at-card" style={{ padding: 16 }}>
            {/* Score bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="section-label" style={{ margin: 0 }}>Report Completeness</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isReady ? '#22C55E' : pct >= 57 ? '#EAB308' : '#EF4444', ...MONO }}>{pct}%</span>
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 12, background: isReady ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: isReady ? '#22C55E' : '#F5B84B', border: `1px solid ${isReady ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`, ...MONO, fontWeight: 600 }}>
                      {isReady ? '✓ Ready to Export' : `${complete}/${sections.length} sections`}
                    </span>
                  </div>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: isReady ? '#22C55E' : pct >= 57 ? '#EAB308' : '#EF4444', borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            </div>

            {/* Section checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sections.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {s.done
                    ? <CheckCircle size={13} style={{ color: '#22C55E', flexShrink: 0 }} />
                    : <XCircle size={13} style={{ color: '#EF4444', opacity: 0.5, flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontSize: '0.78rem', color: s.done ? '#7A9DB8' : '#787878' }}>{s.label}</span>
                  {!s.done && <span style={{ fontSize: '0.65rem', color: '#404040', ...MONO }}>{s.hint}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
