import React, { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Square } from 'lucide-react';

const PLAYBOOKS = {
  phishing: [
    { id: 1, task: 'Identify and quarantine malicious emails', milestone: false },
    { id: 2, task: 'Extract and document all IOCs (sender IP, domains, URLs, hashes)', milestone: false },
    { id: 3, task: 'Check SPF, DKIM, DMARC authentication results', milestone: false },
    { id: 4, task: 'Run VT lookups on all extracted IOCs', milestone: false },
    { id: 5, task: 'Identify all affected users who received the email', milestone: false },
    { id: 6, task: 'Block malicious domains/IPs at email gateway', milestone: true },
    { id: 7, task: 'Reset credentials of targeted users as precaution', milestone: false },
    { id: 8, task: 'Check for any successful logins from malicious IPs', milestone: false },
    { id: 9, task: 'Generate AI analysis and review findings', milestone: false },
    { id: 10, task: 'Document timeline of events', milestone: false },
    { id: 11, task: 'Complete closure checklist and close case', milestone: true },
  ],
  malware: [
    { id: 1, task: 'Isolate affected endpoint(s) from network', milestone: true },
    { id: 2, task: 'Collect memory dump and disk image', milestone: false },
    { id: 3, task: 'Extract file hashes and run VT lookups', milestone: false },
    { id: 4, task: 'Identify malware family and C2 infrastructure', milestone: false },
    { id: 5, task: 'Block C2 IPs/domains at firewall/proxy', milestone: true },
    { id: 6, task: 'Check for lateral movement indicators', milestone: false },
    { id: 7, task: 'Generate YARA rules for detection', milestone: false },
    { id: 8, task: 'Scan environment for similar infections', milestone: false },
    { id: 9, task: 'Remediate affected systems', milestone: true },
    { id: 10, task: 'Close case with full forensic documentation', milestone: false },
  ],
  ransomware: [
    { id: 1, task: 'IMMEDIATELY isolate all affected systems', milestone: true },
    { id: 2, task: 'Identify ransomware variant and encryption scope', milestone: false },
    { id: 3, task: 'Preserve all logs and forensic evidence', milestone: false },
    { id: 4, task: 'Notify legal, management, and relevant authorities', milestone: true },
    { id: 5, task: 'Check backup integrity and restoration feasibility', milestone: false },
    { id: 6, task: 'Identify initial access vector', milestone: false },
    { id: 7, task: 'Block C2 and exfiltration infrastructure', milestone: false },
    { id: 8, task: 'Restore from clean backups after full remediation', milestone: true },
    { id: 9, task: 'Rebuild and harden affected systems', milestone: false },
    { id: 10, task: 'Post-incident review and lessons learned', milestone: true },
  ],
  default: [
    { id: 1, task: 'Document initial alert and assign case', milestone: false },
    { id: 2, task: 'Collect relevant logs and evidence', milestone: false },
    { id: 3, task: 'Identify and document all IOCs', milestone: false },
    { id: 4, task: 'Enrich IOCs with threat intelligence', milestone: false },
    { id: 5, task: 'Assess scope and impact', milestone: true },
    { id: 6, task: 'Contain and remediate threat', milestone: false },
    { id: 7, task: 'Generate AI analysis', milestone: false },
    { id: 8, task: 'Document findings and recommendations', milestone: false },
    { id: 9, task: 'Complete closure checklist', milestone: true },
  ],
};

export default function PlaybookTab({ caseData, updateCase }) {
  const incidentType = caseData?.incident_type || 'default';
  const playbook = PLAYBOOKS[incidentType] || PLAYBOOKS.default;

  // Load saved state from case, fall back to empty
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(caseData?.playbook_state || '{}'); } catch { return {}; }
  });

  // Persist state to case via autosave whenever it changes
  const toggle = useCallback((id) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      updateCase && updateCase({ playbook_state: JSON.stringify(next) });
      return next;
    });
  }, [updateCase]);
  const completed = Object.values(checked).filter(Boolean).length;
  const progress = Math.round((completed / playbook.length) * 100);

  const closureRequired = [
    { id: 'c1', task: 'Final findings documented' },
    { id: 'c2', task: 'Remediation steps completed' },
    { id: 'c3', task: 'Lessons learned recorded' },
    { id: 'c4', task: 'Evidence checklist confirmed' },
    { id: 'c5', task: 'Closure notes saved to case' },
  ];
  const [closureChecked, setClosureChecked] = useState({});
  const closureDone = Object.values(closureChecked).filter(Boolean).length;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 600, textTransform: 'capitalize' }}>{incidentType.replace('_',' ')} Playbook</h3>
            <div style={{ fontSize: '0.72rem', color: '#787878', marginTop: 2 }}>{completed}/{playbook.length} tasks complete</div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: progress === 100 ? '#22C55E' : '#BDD4E8' }}>{progress}%</div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? '#22C55E' : '#4A7EC8', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div className="at-card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {playbook.map(task => (
            <div key={task.id} onClick={() => toggle(task.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ color: checked[task.id] ? '#22C55E' : '#787878', flexShrink: 0, marginTop: 1 }}>
                {checked[task.id] ? <CheckSquare size={16} /> : <Square size={16} />}
              </div>
              <div>
                <span style={{ fontSize: '0.84rem', color: checked[task.id] ? '#787878' : '#BDD4E8', textDecoration: checked[task.id] ? 'line-through' : 'none', transition: 'all 0.2s' }}>{task.task}</span>
                {task.milestone && <div style={{ fontSize: '0.65rem', color: '#4A7EC8', fontFamily: 'JetBrains Mono', marginTop: 2 }}>MILESTONE</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closure checklist */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#EAB308', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          Case Closure Requirements ({closureDone}/{closureRequired.length})
        </div>
        <div className="at-card" style={{ padding: '14px 16px', borderColor: 'rgba(234,179,8,0.2)' }}>
          {closureRequired.map(item => (
            <div key={item.id} onClick={() => setClosureChecked(p => ({ ...p, [item.id]: !p[item.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ color: closureChecked[item.id] ? '#22C55E' : '#787878', flexShrink: 0 }}>
                {closureChecked[item.id] ? <CheckSquare size={15} /> : <Square size={15} />}
              </div>
              <span style={{ fontSize: '0.82rem', color: closureChecked[item.id] ? '#787878' : '#BDD4E8' }}>{item.task}</span>
            </div>
          ))}
        </div>
        {closureDone === closureRequired.length && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, fontSize: '0.82rem', color: '#22C55E' }}>
            ✓ All closure requirements met. Case is ready to close.
          </div>
        )}
      </div>
    </div>
  );
}
