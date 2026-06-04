import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Activity, Shield, AlertTriangle, Network, Globe,
  Server, FileText, ChevronDown, ChevronRight, Loader2, ExternalLink
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const VERDICT_COLOR = {
  Malicious:   '#4DA3FF',
  Suspicious:  '#EAB308',
  Clean:       '#22C55E',
  Unknown:     '#71717A',
};

function ScoreBar({ score }) {
  const color = score > 70 ? '#4DA3FF' : score > 40 ? '#EAB308' : '#22C55E';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono', color, minWidth: 28 }}>{score}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="at-card" style={{ padding: '12px 16px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', marginBottom: open ? 12 : 0 }}
        onClick={() => setOpen(v => !v)}
      >
        <Icon size={13} style={{ color: '#A78BFA' }} />
        <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>{title}</span>
        <span style={{ marginLeft: 'auto' }}>
          {open ? <ChevronDown size={12} style={{ color: '#71717A' }} /> : <ChevronRight size={12} style={{ color: '#71717A' }} />}
        </span>
      </div>
      {open && children}
    </div>
  );
}

export default function PcapAnalysis() {
  const navigate    = useNavigate();
  const { addToast } = useStore();
  const fileRef     = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]     = useState(null);
  const [history, setHistory]   = useState([]);
  const [caseId, setCaseId]     = useState('');

  useEffect(() => {
    api.get('/api/pcap/history?limit=10').then(r => setHistory(r.data)).catch(() => {});
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(pcap|pcapng|cap)$/i)) {
      addToast('Only .pcap / .pcapng / .cap files are accepted', 'error');
      return;
    }
    setUploading(true);
    setResult(null);
    const form = new FormData();
    form.append('file', file);
    if (caseId) form.append('case_id', caseId);
    try {
      const res = await api.post('/api/pcap/analyse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,  // 2 min — large pcaps take time
      });
      setResult(res.data);
      addToast('PCAP analysed successfully', 'success');
      api.get('/api/pcap/history?limit=10').then(r => setHistory(r.data)).catch(() => {});
    } catch (e) {
      addToast(e.response?.data?.detail || 'Analysis failed', 'error');
    }
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>PCAP / Network Traffic Analysis</h1>
        <div style={{ fontSize: '0.72rem', color: '#71717A', marginTop: 3 }}>
          Upload a packet capture for forensic analysis — protocols, top talkers, DNS, HTTP, C2 detection, IOC extraction
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* Main upload + results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Upload zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'rgba(77,163,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(77,163,255,0.04)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
            }}
          >
            <input ref={fileRef} type="file" accept=".pcap,.pcapng,.cap" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#71717A' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#A78BFA' }} />
                <div style={{ fontSize: '0.82rem' }}>Parsing packets and running AI analysis…</div>
                <div style={{ fontSize: '0.72rem' }}>Large captures may take up to 2 minutes</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Upload size={28} style={{ color: 'rgba(167,139,250,0.4)' }} />
                <div style={{ fontSize: '0.84rem', fontWeight: 500 }}>Drop a .pcap file here or click to browse</div>
                <div style={{ fontSize: '0.72rem', color: '#71717A' }}>Supports .pcap · .pcapng · .cap &nbsp;|&nbsp; Max 50 MB</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    value={caseId}
                    onChange={e => { e.stopPropagation(); setCaseId(e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    placeholder="Link to case ID (optional)"
                    style={{
                      padding: '5px 10px', background: '#0D111C',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5,
                      color: '#F0F0F8', fontSize: '0.75rem', fontFamily: 'JetBrains Mono', width: 200,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Verdict banner */}
              <div style={{
                padding: '14px 18px', borderRadius: 8,
                background: `${VERDICT_COLOR[result.ai_verdict] || '#71717A'}11`,
                border: `1px solid ${VERDICT_COLOR[result.ai_verdict] || '#71717A'}33`,
                display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Verdict</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: VERDICT_COLOR[result.ai_verdict] || '#F0F0F8', fontFamily: 'JetBrains Mono' }}>
                    {result.ai_verdict}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: '0.68rem', color: '#71717A', marginBottom: 4 }}>Threat Score</div>
                  <ScoreBar score={result.ai_threat_score} />
                </div>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <div style={{ fontSize: '0.68rem', color: '#71717A', marginBottom: 3 }}>AI Summary</div>
                  <div style={{ fontSize: '0.78rem', color: '#D0D0E0', lineHeight: 1.5 }}>{result.ai_summary}</div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                {[
                  { label: 'Packets',    value: result.packet_count.toLocaleString() },
                  { label: 'Duration',   value: `${result.duration_secs}s` },
                  { label: 'IOCs Found', value: result.extracted_iocs.length },
                  { label: 'Suspicious', value: result.suspicious_flows.length, color: result.suspicious_flows.length > 0 ? '#EF4444' : '#22C55E' },
                  { label: 'DNS Queries',value: result.dns_queries.length },
                  { label: 'HTTP Hosts', value: result.http_hosts.length },
                ].map(s => (
                  <div key={s.label} className="at-card" style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: s.color || '#F0F0F8' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* AI findings */}
              {result.ai_findings?.length > 0 && (
                <Section title="AI Key Findings" icon={Shield} defaultOpen={true}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {result.ai_findings.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.78rem' }}>
                        <span style={{ color: '#4DA3FF', flexShrink: 0 }}>→</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    {result.ai_likely_attack && result.ai_likely_attack !== 'None' && (
                      <div style={{ marginTop: 4, fontSize: '0.75rem', padding: '5px 10px', background: 'rgba(77,163,255,0.06)', borderRadius: 4, color: '#EF4444' }}>
                        Likely attack: <strong>{result.ai_likely_attack}</strong>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Suspicious flows */}
              {result.suspicious_flows?.length > 0 && (
                <Section title={`⚠ Suspicious Flows (${result.suspicious_flows.length})`} icon={AlertTriangle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.suspicious_flows.map((f, i) => (
                      <div key={i} style={{
                        padding: '8px 10px', borderRadius: 5, fontSize: '0.75rem',
                        background: f.severity === 'high' ? 'rgba(77,163,255,0.07)' : 'rgba(234,179,8,0.06)',
                        border: `1px solid ${f.severity === 'high' ? 'rgba(77,163,255,0.2)' : 'rgba(234,179,8,0.2)'}`,
                      }}>
                        <div style={{ fontWeight: 600, color: f.severity === 'high' ? '#EF4444' : '#EAB308', marginBottom: 3 }}>
                          [{f.type.toUpperCase()}] {f.description}
                        </div>
                        {f.src && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.68rem', color: '#71717A' }}>{f.src} → {f.dst}{f.port ? ':' + f.port : ''}</span>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Protocol breakdown */}
              <Section title="Protocol Breakdown" icon={Activity}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(result.protocols).map(([proto, count]) => (
                    <div key={proto} style={{
                      padding: '4px 10px', borderRadius: 4, fontSize: '0.72rem',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                      fontFamily: 'JetBrains Mono',
                    }}>
                      <span style={{ color: '#A78BFA' }}>{proto}</span>
                      <span style={{ color: '#71717A' }}> · {count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Top talkers */}
              {result.top_talkers?.length > 0 && (
                <Section title="Top Talkers" icon={Server}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {result.top_talkers.slice(0, 10).map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', color: t.is_private ? '#71717A' : '#EF4444', minWidth: 120 }}>{t.ip}</span>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((t.bytes / (result.top_talkers[0]?.bytes || 1)) * 100, 100)}%`, height: '100%', background: t.is_private ? '#A78BFA' : '#EF4444', borderRadius: 2 }} />
                        </div>
                        <span style={{ color: '#71717A', minWidth: 60, textAlign: 'right' }}>{(t.bytes / 1024).toFixed(1)} KB</span>
                        <span style={{ color: '#71717A', minWidth: 55, textAlign: 'right' }}>{t.packets} pkts</span>
                        {!t.is_private && <ExternalLink size={10} style={{ color: '#71717A', cursor: 'pointer' }} onClick={() => window.open(`https://www.virustotal.com/gui/ip-address/${t.ip}`, '_blank')} />}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* DNS queries */}
              {result.dns_queries?.length > 0 && (
                <Section title={`DNS Queries (${result.dns_queries.length})`} icon={Globe} defaultOpen={false}>
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {result.dns_queries.map((d, i) => (
                      <span key={i} style={{
                        fontSize: '0.68rem', fontFamily: 'JetBrains Mono', padding: '2px 7px', borderRadius: 3,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                      }}>{d}</span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Extracted IOCs */}
              {result.extracted_iocs?.length > 0 && (
                <Section title={`Extracted IOCs (${result.extracted_iocs.length})`} icon={Shield} defaultOpen={false}>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {result.extracted_iocs.map((ioc, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: '0.62rem', fontWeight: 600,
                          background: 'rgba(167,139,250,0.12)', color: '#A78BFA',
                        }}>{ioc.type}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', flex: 1 }}>{ioc.ioc}</span>
                        <span style={{ color: '#71717A', fontSize: '0.62rem' }}>{ioc.source}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Recommendations */}
              {result.ai_recommended?.length > 0 && (
                <Section title="Recommended Actions" icon={FileText}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {result.ai_recommended.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 7, fontSize: '0.78rem' }}>
                        <span style={{ color: '#22C55E', flexShrink: 0 }}>{i + 1}.</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: history */}
        <div className="at-card" style={{ padding: '14px 16px', position: 'sticky', top: 20 }}>
          <div className="section-label">Recent Analyses</div>
          {history.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: '#71717A' }}>No analyses yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map(h => (
                <div
                  key={h.id}
                  onClick={() => api.get(`/api/pcap/${h.id}`).then(r => setResult(r.data)).catch(() => {})}
                  style={{ cursor: 'pointer', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{h.filename}</span>
                    <span style={{
                      fontSize: '0.62rem', fontFamily: 'JetBrains Mono', padding: '1px 5px', borderRadius: 3,
                      background: `${VERDICT_COLOR[h.ai_verdict] || '#71717A'}22`,
                      color: VERDICT_COLOR[h.ai_verdict] || '#71717A',
                    }}>{h.ai_verdict}</span>
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                    {h.packet_count.toLocaleString()} pkts · {new Date(h.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
