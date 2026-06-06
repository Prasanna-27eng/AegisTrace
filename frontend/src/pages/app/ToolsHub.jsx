import React, { useState } from 'react';
import { ExternalLink, Copy, Search } from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const TOOLS = [
  { id: 'whois', name: 'WHOIS / RDAP Lookup', desc: 'Domain registration and ownership lookup', inputs: ['domain'], link: 'https://lookup.icann.org', linkLabel: 'ICANN RDAP', color: '#5A8A9F' },
  { id: 'dns', name: 'DNS Lookup', desc: 'Query DNS records — A, MX, TXT, NS, CNAME', inputs: ['domain'], link: 'https://toolbox.googleapps.com/apps/dig/', linkLabel: 'Google Dig', color: '#8FAFC0' },
  { id: 'domain-age', name: 'Domain Age Checker', desc: 'Check when a domain was registered', inputs: ['domain'], link: 'https://www.whois.com/whois/', linkLabel: 'WHOIS.com', color: '#EAB308' },
  { id: 'ip-geo', name: 'IP Geolocation & Reputation', desc: 'Locate IP and check basic reputation', inputs: ['ip'], link: 'https://www.abuseipdb.com/', linkLabel: 'IP Lookup', color: '#22C55E' },
  { id: 'urlscan', name: 'URL Scanner', desc: 'Submit URL for sandboxed scanning', inputs: ['url'], link: 'https://urlscan.io/', linkLabel: 'urlscan.io', color: '#5A8A9F' },
  { id: 'otx', name: 'AlienVault OTX', desc: 'Open threat intelligence platform', inputs: ['ip','domain','hash'], link: 'https://otxr.alienvault.com', linkLabel: 'OTX Pulse', color: '#8FAFC0' },
  { id: 'cert', name: 'Certificate Transparency', desc: 'Search SSL certificate logs for subdomains', inputs: ['domain'], link: 'https://crt.sh/', linkLabel: 'crt.sh', color: '#EAB308' },
  { id: 'shodan', name: 'Shodan Search', desc: 'Search internet-connected device exposure', inputs: ['ip','domain'], link: 'https://www.shodan.io/', linkLabel: 'Shodan', color: '#22C55E' },
  { id: 'mxtoolbox', name: 'MX Toolbox', desc: 'Email delivery and blacklist checks', inputs: ['domain','ip'], link: 'https://mxtoolbox.com/', linkLabel: 'MX Toolbox', color: '#5A8A9F' },
  { id: 'vt-link', name: 'VirusTotal Search', desc: 'Search VirusTotal for any IOC', inputs: ['ip','domain','hash','url'], link: 'https://www.virustotal.com/', linkLabel: 'VirusTotal', color: '#8FAFC0' },
  { id: 'ioc-extract', name: 'Raw IOC Extractor', desc: 'Extract all IOCs from pasted text', inputs: ['raw text'], color: '#EAB308', internal: true },
  { id: 'defang-tool', name: 'Defang / Refang', desc: 'Safely defang IOCs for documentation', inputs: ['ip','domain','url'], color: '#22C55E', internal: true },
];

export default function ToolsHub() {
  const { addToast } = useStore();
  const [iocText, setIocText] = useState('');
  const [iocResult, setIocResult] = useState(null);
  const [defangInput, setDefangInput] = useState('');
  const [defangResult, setDefangResult] = useState('');
  const [activeInternal, setActiveInternal] = useState(null);

  const extractIOCs = async () => {
    try { const r = await api.post('/api/ioc/extract', { text: iocText }); setIocResult(r.data); } catch {}
  };
  const defang = async () => {
    try { const r = await api.post('/api/malware/defang', { input: defangInput }); setDefangResult(r.data.defanged); } catch {}
  };
  const refang = async () => {
    try { const r = await api.post('/api/malware/refang', { input: defangInput }); setDefangResult(r.data.refanged); } catch {}
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Tools Hub</h1>
        <div style={{ fontSize: '0.75rem', color: '#787878', marginTop: 2 }}>Free tools and public intelligence sources</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {TOOLS.map(tool => (
          <div key={tool.id} className="at-card" style={{ padding: '14px 16px', transition: 'border-color 0.2s', cursor: tool.internal ? 'pointer' : 'default' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${tool.color}40`}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
            onClick={() => tool.internal && setActiveInternal(activeInternal === tool.id ? null : tool.id)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#EBEBEB' }}>{tool.name}</div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: tool.color, flexShrink: 0, marginTop: 3 }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#787878', marginBottom: 10, lineHeight: 1.5 }}>{tool.desc}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {tool.inputs.map(inp => <span key={inp} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#787878', padding: '2px 6px', borderRadius: 3, fontFamily: 'JetBrains Mono' }}>{inp}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {tool.link && (
                <a href={tool.link} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: '0.75rem', textDecoration: 'none', padding: '5px 10px' }} onClick={e => e.stopPropagation()}>
                  {tool.linkLabel} <ExternalLink size={11} />
                </a>
              )}
              {tool.internal && (
                <button className="btn-accent" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                  {activeInternal === tool.id ? 'Close' : 'Open Tool'}
                </button>
              )}
            </div>

            {/* Internal tool panels */}
            {tool.id === 'ioc-extract' && activeInternal === tool.id && (
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }} onClick={e => e.stopPropagation()}>
                <textarea className="at-textarea" rows={4} value={iocText} onChange={e => setIocText(e.target.value)} placeholder="Paste raw text…" style={{ fontSize: '0.78rem', marginBottom: 8 }} />
                <button className="btn-accent" onClick={extractIOCs} style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', marginBottom: 8 }}>Extract IOCs</button>
                {iocResult && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#787878', marginBottom: 6 }}>{iocResult.count} IOCs found</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {iocResult.iocs.map((ioc, i) => (
                        <span key={i} className="ioc-pill" style={{ cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(ioc.ioc); addToast('Copied!', 'success'); }}>{ioc.ioc}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tool.id === 'defang-tool' && activeInternal === tool.id && (
              <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }} onClick={e => e.stopPropagation()}>
                <input className="at-input" value={defangInput} onChange={e => setDefangInput(e.target.value)} placeholder="http://evil.com" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button className="btn-accent" onClick={defang} style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}>Defang</button>
                  <button className="btn-ghost" onClick={refang} style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}>Refang</button>
                </div>
                {defangResult && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#111111', padding: '6px 10px', borderRadius: 5 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', flex: 1, color: '#22C55E' }}>{defangResult}</span>
                    <button onClick={() => { navigator.clipboard.writeText(defangResult); addToast('Copied!', 'success'); }} className="btn-ghost" style={{ padding: '2px 6px' }}><Copy size={11} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
