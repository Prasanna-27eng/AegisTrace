/**
 * InvestigationTemplates — modal template picker for new cases
 * Plus knowledge base tab showing learnings from closed cases.
 */
import React, { useState, useEffect } from 'react';
import {
  Mail, Key, Bug, Database, UserX, Monitor,
  ChevronRight, X, Check, AlertTriangle, BookOpen, RefreshCw
} from './icons';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const TEMPLATES = [
  {
    id: 'phishing',
    label: 'Phishing',
    Icon: Mail,
    color: '#F97316',
    severity: 'high',
    incident_type: 'phishing',
    title: 'Suspected Phishing Email — [User / Domain]',
    description: 'A suspicious email has been reported by [user] containing [link/attachment]. Initial analysis suggests social engineering attempt targeting [system/credentials].',
    mitre: ['T1566 Phishing', 'T1598 Spearphishing', 'T1204 User Execution'],
    evidence: ['Raw email headers (full EML)', 'Screenshot of email body', 'Sender domain WHOIS + VirusTotal', 'Recipient click/action logs', 'Any downloaded files with hashes'],
    steps: ['Quarantine email across all mailboxes', 'Run email through Email Forensics tab', 'Enrich sender IP and domain via VT Lookup', 'Check for other recipients of same campaign', 'Interview recipient — did they click/open?'],
  },
  {
    id: 'brute_force',
    label: 'Brute Force',
    Icon: Key,
    color: '#EF4444',
    severity: 'high',
    incident_type: 'brute_force',
    title: 'Brute Force / Credential Stuffing — [Target Account]',
    description: 'Multiple failed authentication attempts detected against [account/service] from [source IP]. Possible credential stuffing or password spray attack.',
    mitre: ['T1110 Brute Force', 'T1078 Valid Accounts', 'T1021 Remote Services'],
    evidence: ['Auth log export (timestamp, source IP, username, result)', 'Source IP geolocation and ASN', 'Account lockout events', 'Successful logins before/after attacks', 'All affected usernames'],
    steps: ['Export and review auth logs via ITDR module', 'Enrich source IPs via VT + Shodan', 'Check for impossible travel or new device logins', 'Verify if any account was successfully accessed', 'Force password reset on targeted accounts'],
  },
  {
    id: 'malware',
    label: 'Malware / Ransomware',
    Icon: Bug,
    color: '#8FAFC0',
    severity: 'critical',
    incident_type: 'malware',
    title: 'Malware Infection — [Hostname / User]',
    description: 'Suspected malware infection on [host]. Indicators include [suspicious process/file/network connection]. Endpoint may be compromised.',
    mitre: ['T1059 Command Scripting', 'T1055 Process Injection', 'T1071 App Layer Protocol', 'T1486 Data Encrypted'],
    evidence: ['Endpoint agent logs (process tree, persistence)', 'Suspicious file hashes (MD5, SHA256)', 'Network connections to external IPs', 'Running processes at time of detection', 'Registry changes / startup locations'],
    steps: ['Isolate affected endpoint immediately', 'Collect Sysmon process tree via Endpoint Agent', 'Hash suspicious files and submit to VirusTotal', 'Review PCAP for C2 communication patterns', 'Run malware tools for hash and string analysis'],
  },
  {
    id: 'exfiltration',
    label: 'Data Exfiltration',
    Icon: Database,
    color: '#EAB308',
    severity: 'critical',
    incident_type: 'exfiltration',
    title: 'Suspected Data Exfiltration — [User / System]',
    description: 'Unusual outbound data volume or transfer to external destination detected from [user/system]. Possible data theft or insider threat activity.',
    mitre: ['T1041 Exfil over C2', 'T1048 Exfil Alt Protocol', 'T1567 Exfil to Web Service', 'T1530 Data from Cloud Storage'],
    evidence: ['Firewall/proxy logs (destination, bytes, timestamps)', 'DLP alert details', 'Files accessed before the transfer', 'User activity timeline (logins, file access)', 'Destination IP/domain ownership'],
    steps: ['Capture and analyse network traffic via PCAP', 'Enrich destination IPs and domains', 'Map user activity timeline', 'Identify source files or data categories', 'Check access controls and audit trail'],
  },
  {
    id: 'suspicious_login',
    label: 'Suspicious Login',
    Icon: UserX,
    color: '#4E7A8E',
    severity: 'medium',
    incident_type: 'identity',
    title: 'Suspicious Login Activity — [Account]',
    description: 'Unusual authentication behaviour detected for [account]. Possible indicators include login from new geography, new device, or after a period of inactivity.',
    mitre: ['T1078 Valid Accounts', 'T1556 Modify Auth Process', 'T1621 MFA Request Gen'],
    evidence: ['Login events with IP, country, device', 'Previous login history for comparison', 'MFA challenge/response logs', 'VPN usage at time of login', 'Any actions taken post-login'],
    steps: ['Run ITDR analysis on the identity node', 'Check for impossible travel patterns', 'Verify if device is registered', 'Contact account owner for confirmation', 'Review all actions taken in the suspicious session'],
  },
  {
    id: 'endpoint_compromise',
    label: 'Endpoint Compromise',
    Icon: Monitor,
    color: '#22C55E',
    severity: 'critical',
    incident_type: 'endpoint_compromise',
    title: 'Endpoint Compromise — [Hostname]',
    description: 'Evidence of host compromise on [hostname]. Indicators include [persistence mechanism/lateral movement/privilege escalation]. Requires immediate containment.',
    mitre: ['T1053 Scheduled Task', 'T1547 Boot Autostart', 'T1021 Remote Services', 'T1068 Priv Escalation'],
    evidence: ['Full Sysmon event log export', 'Running processes + loaded DLLs', 'Scheduled tasks and startup entries', 'Network connections (established + listening)', 'User account and group membership changes'],
    steps: ['Isolate host from network immediately', 'Deploy Endpoint Agent for full telemetry', 'Review process tree for suspicious parents', 'Check all persistence locations', 'Look for lateral movement to other hosts'],
  },
];

const IDENTITY_TYPE_COLORS = {
  user:            '#4A7EC8',
  service_account: '#F59E0B',
  api_key:         '#22C55E',
  machine:         '#8B5CF6',
  ai_agent:        '#EF4444',
};

function KnowledgeCard({ entry }) {
  return (
    <div style={{ padding: '12px 14px', background: 'rgba(26,22,18,0.03)', border: '1px solid rgba(26,22,18,0.08)', borderRadius: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#E8E8F0', flex: 1 }}>{entry.title}</span>
        <span style={{ fontSize: '0.62rem', ...MONO, padding: '2px 7px', borderRadius: 4, background: `${IDENTITY_TYPE_COLORS[entry.identity_type] || '#6B7280'}18`, color: IDENTITY_TYPE_COLORS[entry.identity_type] || '#6B7280', border: `1px solid ${IDENTITY_TYPE_COLORS[entry.identity_type] || '#6B7280'}33` }}>
          {entry.identity_type}
        </span>
        {entry.times_referenced > 0 && (
          <span style={{ fontSize: '0.62rem', color: '#4B5563', ...MONO }}>{entry.times_referenced}× ref</span>
        )}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 6 }}>{entry.threat_pattern}</div>
      <div style={{ fontSize: '0.68rem', color: '#6B7280', marginBottom: 6 }}>
        <span style={{ color: '#F59E0B' }}>Root cause:</span> {entry.root_cause}
      </div>
      {entry.resolution_steps?.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {entry.resolution_steps.slice(0, 3).map((s, i) => (
            <div key={i} style={{ fontSize: '0.68rem', color: '#6B7280', display: 'flex', gap: 5 }}>
              <span style={{ color: '#22C55E', ...MONO }}>{i + 1}.</span> {s}
            </div>
          ))}
        </div>
      )}
      {entry.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {entry.tags.map(t => (
            <span key={t} style={{ fontSize: '0.6rem', ...MONO, padding: '1px 6px', borderRadius: 3, background: 'rgba(74,126,200,0.1)', color: 'var(--accent)', border: '1px solid rgba(26,22,18,0.14)' }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvestigationTemplates({ onSelect, onClose }) {
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [knowledge, setKnowledge] = useState([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [knowledgeFilter, setKnowledgeFilter] = useState('');

  useEffect(() => {
    if (activeTab === 'knowledge') {
      setLoadingKnowledge(true);
      fetch('/api/knowledge', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      })
        .then(r => r.json())
        .then(data => { setKnowledge(Array.isArray(data) ? data : []); })
        .catch(() => {})
        .finally(() => setLoadingKnowledge(false));
    }
  }, [activeTab]);

  const apply = () => {
    if (!selected) return;
    onSelect(selected);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
      <div style={{ background: 'rgba(26,22,18,0.12)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(26,22,18,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Investigation Templates</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', ...MONO }}>Pick a scaffold to pre-fill your case — you can edit everything after</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(26,22,18,0.05)', borderRadius: 7, padding: 3 }}>
              {[{ id: 'templates', label: 'Templates' }, { id: 'knowledge', label: 'Knowledge Base' }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '4px 12px', borderRadius: 5, border: 'none', background: activeTab === t.id ? 'rgba(26,22,18,0.14)' : 'none', color: activeTab === t.id ? 'rgba(26,22,18,0.7)' : '#787878', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
          </div>
        </div>

        {activeTab === 'knowledge' && (
          <div style={{ padding: '16px 24px', maxHeight: '65vh', overflow: 'auto' }}>
            <div style={{ marginBottom: 14 }}>
              <input
                type="text"
                placeholder="Filter by title, type, or tag…"
                value={knowledgeFilter}
                onChange={e => setKnowledgeFilter(e.target.value)}
                style={{ width: '100%', background: 'rgba(26,22,18,0.05)', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 7, padding: '7px 12px', color: '#E8E8F0', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {loadingKnowledge ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.78rem' }}>Loading knowledge base…</div>
            ) : knowledge.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#4B5563' }}>
                <BookOpen size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: '0.78rem' }}>No knowledge entries yet. Close cases to generate knowledge.</div>
              </div>
            ) : (
              knowledge.filter(k =>
                !knowledgeFilter ||
                k.title?.toLowerCase().includes(knowledgeFilter.toLowerCase()) ||
                k.identity_type?.includes(knowledgeFilter.toLowerCase()) ||
                (k.tags || []).some(t => t.toLowerCase().includes(knowledgeFilter.toLowerCase()))
              ).map(entry => <KnowledgeCard key={entry.id} entry={entry} />)
            )}
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(26,22,18,0.07)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onClose} style={{ fontSize: '0.82rem' }}>Close</button>
          </div>
        )}

        {activeTab === 'templates' && <><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {/* Template list */}
          <div style={{ padding: '16px', borderRight: '1px solid rgba(26,22,18,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TEMPLATES.map(t => (
              <div
                key={t.id}
                onClick={() => { setSelected(t); setPreview(t); }}
                style={{
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: selected?.id === t.id ? `${t.color}10` : 'rgba(26,22,18,0.03)',
                  border: `1px solid ${selected?.id === t.id ? t.color + '30' : 'rgba(26,22,18,0.07)'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.background = 'rgba(26,22,18,0.05)'; }}
                onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.background = 'rgba(26,22,18,0.03)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <t.Icon size={16} style={{ color: t.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{t.label}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', ...MONO }}>
                      Default: <span style={{ color: t.severity === 'critical' ? '#EF4444' : t.severity === 'high' ? '#F97316' : '#EAB308' }}>{t.severity}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div style={{ padding: '16px' }}>
            {!preview ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#404040', fontSize: '0.8rem', ...MONO, flexDirection: 'column', gap: 8 }}>
                <AlertTriangle size={24} style={{ opacity: 0.3 }} />
                Select a template to preview
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '12px 14px', background: `${preview.color}08`, border: `1px solid ${preview.color}20`, borderRadius: 10 }}>
                  <div style={{ fontSize: '0.62rem', color: preview.color, ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Default Title</div>
                  <div style={{ fontSize: '0.8rem', color: '#A8A8A8', lineHeight: 1.5 }}>{preview.title}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>MITRE Techniques</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {preview.mitre.map(m => (
                      <span key={m} style={{ fontSize: '0.65rem', ...MONO, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.18)', padding: '2px 7px', borderRadius: 3 }}>{m}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Evidence to Collect</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {preview.evidence.map(e => (
                      <div key={e} style={{ display: 'flex', gap: 6, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: '#4E7A8E', flexShrink: 0 }}>→</span> {e}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', ...MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>First Steps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {preview.steps.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 7, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: '#22C55E', ...MONO, flexShrink: 0 }}>{i + 1}.</span> {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(26,22,18,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: '0.82rem' }}>Cancel</button>
          <button className="btn-accent" onClick={apply} disabled={!selected} style={{ fontSize: '0.82rem' }}>
            <Check size={13} /> Use Template
          </button>
        </div>
        </>}
      </div>
    </div>
  );
}
