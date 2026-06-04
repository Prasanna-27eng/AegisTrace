import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Wifi, Radio, HardDrive, Network, Tag, Monitor, Bot,
         Play, Loader2, Copy, CheckCircle, ExternalLink, AlertTriangle,
         Shield, ChevronRight, Search, X } from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

// ── Tool catalogue ────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'wifi', label: 'WiFi Attack', icon: Wifi, color: '#4DA3FF',
    tools: [
      { key: 'probe_request_analyser',   name: 'Probe Request Analyser',   desc: 'Identify aggressive WiFi scanners from PineAP logs', hint: 'Paste WiFi Pineapple PineAP log output.\nSupports JSON lines, CSV, or plain text.\n\nExample:\n{"type":"probe","client_mac":"AA:BB:CC:11:22:33","ssid":"HomeNet","channel":6}' },
      { key: 'evil_twin_detector',       name: 'Evil Twin Detector',       desc: 'Find rogue APs claiming a legitimate SSID',           hint: 'Paste beacon/AP scan log showing SSIDs and BSSIDs.\n\nExample:\nSSID: HomeNet | BSSID: AA:BB:CC:DD:EE:FF | Channel: 6' },
      { key: 'deauth_timeline',          name: 'Deauth Attack Timeline',   desc: 'Visualise deauthentication frame bursts',             hint: 'Paste deauthentication frame log.\n\nExample:\n[14:32:01] DEAUTH AA:BB:CC → DD:EE:FF on BSSID 11:22:33' },
      { key: 'handshake_inspector',      name: 'Handshake Inspector',      desc: 'Assess WPA handshake completeness and timing',        hint: 'Paste WPA handshake capture log or EAPOL frame data.' },
    ],
  },
  {
    id: 'rf', label: 'RF / Radio', icon: Radio, color: '#A78BFA',
    tools: [
      { key: 'spectrum_analyser',        name: 'Spectrum Analyser',        desc: 'Map signal activity across RF bands',                 hint: 'Paste hackrf_sweep CSV output or RF spectrum scan data.\n\nhackrf_sweep format: date,time,hz_low,hz_high,hz_bin,samples,dBm...' },
      { key: 'replay_attack_detector',   name: 'Replay Attack Detector',   desc: 'Detect repeated RF signals (car fobs, remotes)',      hint: 'Paste RF signal capture log with frequency, strength, and timing data.' },
      { key: 'jamming_detector',         name: 'Jamming Detector',         desc: 'Identify broadband or targeted RF jamming',           hint: 'Paste RF spectrum scan data. High dBm values across wide frequency ranges indicate jamming.' },
    ],
  },
  {
    id: 'usb', label: 'USB / HID', icon: HardDrive, color: '#EAB308',
    tools: [
      { key: 'keystroke_injection_analyser', name: 'Keystroke Injection Analyser', desc: 'Reconstruct injected commands, detect automation', hint: 'Paste HID event log or Rubber Ducky payload output.\n\nExample:\n{"timestamp":"2024-01-01T10:00:00","key":"G","modifier":"GUI"}\n{"timestamp":"2024-01-01T10:00:00.001","key":"r","modifier":""}' },
      { key: 'payload_decoder',           name: 'Payload Decoder',           desc: 'Decode DuckyScript step-by-step with MITRE mapping',  hint: 'Paste DuckyScript payload or Bash Bunny script.\n\nExample:\nDELAY 1000\nGUI r\nDELAY 500\nSTRING cmd.exe\nENTER' },
      { key: 'encoded_command_decoder',   name: 'Encoded Command Decoder',   desc: 'Auto-detect Base64/Hex/PS/ROT13/char() obfuscation',  hint: 'Paste any encoded or obfuscated command string.\n\nSupports: Base64, PowerShell -EncodedCommand, Hex, URL-encoded, ROT13, char() obfuscation.' },
    ],
  },
  {
    id: 'network', label: 'Network', icon: Network, color: '#22C55E',
    tools: [
      { key: 'suricata_parser',          name: 'Suricata IDS Parser',       desc: 'Parse eve.json — alerts, DNS, HTTP, C2, DGA',        hint: 'Paste Suricata eve.json log output (one JSON object per line).\nInclude alert, dns, http, and flow events for best results.' },
      { key: 'arp_poison_detector',      name: 'ARP Poison Detector',       desc: 'Detect ARP cache poisoning and MITM patterns',        hint: 'Paste ARP log from tcpdump, Wireshark, or network monitor.\n\nExample:\n14:32:01.123 ARP Reply: 192.168.1.1 is-at AA:BB:CC:DD:EE:FF' },
      { key: 'dns_analyser',             name: 'DNS Query Analyser',         desc: 'Find DGA domains, DNS tunnelling, suspicious TLDs',   hint: 'Paste DNS query logs from Suricata eve.json, tcpdump, or DNS server logs.' },
      { key: 'lateral_movement_tracer',  name: 'Lateral Movement Tracer',   desc: 'Map internal connections on SMB/RDP/WinRM',           hint: 'Paste network flow/connection logs (src IP, dst IP, port).\nSuricata flow events work well.' },
    ],
  },
  {
    id: 'rfid', label: 'RFID / NFC', icon: Tag, color: '#00bfff',
    tools: [
      { key: 'card_clone_detector',      name: 'Card Clone Detector',       desc: 'Impossible travel and rapid re-read detection',       hint: 'Paste RFID card read log from Proxmark 3 or access control system.\nInclude reader ID, card UID, and timestamp.' },
      { key: 'rfid_brute_force_detector',name: 'RFID Brute Force Detector', desc: 'Detect UID enumeration and automated scanning',       hint: 'Paste RFID reader log showing all card read attempts.\nInclude timestamps for read rate calculation.' },
    ],
  },
  {
    id: 'endpoint', label: 'Endpoint', icon: Monitor, color: '#4DA3FF',
    tools: [
      { key: 'sysmon_parser',            name: 'Sysmon Event Parser',        desc: 'LOLBin detection, LSASS access, process injection',   hint: 'Paste Windows Sysmon event log in XML or JSON format.\nEventIDs 1,3,7,8,10,11,12,13,22 are fully supported.' },
      { key: 'process_tree_analyser',    name: 'Process Tree Analyser',      desc: 'Risk-score every process, flag suspicious spawning',   hint: 'Paste process list from aegistrace_agent.py or any JSON/CSV/text with PID, PPID, and process name.' },
    ],
  },
  {
    id: 'ai', label: 'Universal', icon: Bot, color: '#A78BFA',
    tools: [
      { key: 'ai_universal_parser',      name: 'AI Universal Parser',        desc: 'Any log format → auto-parsed, MITRE-tagged by AI',   hint: 'Paste ANY log from ANY security tool.\nAI will automatically identify the format, extract fields,\nand map to MITRE ATT&CK. Works on completely unknown formats.' },
    ],
  },
];

// flat lookup
const TOOL_MAP = {};
CATEGORIES.forEach(cat => cat.tools.forEach(t => { TOOL_MAP[t.key] = { ...t, category: cat }; }));

// ── Severity colour ───────────────────────────────────────────────────────────
const SEV_COLOR = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#A78BFA', info:'#71717A' };
const sevStyle = (s) => ({
  color: SEV_COLOR[s] || '#71717A',
  background: `${SEV_COLOR[s] || '#71717A'}18`,
  border: `1px solid ${SEV_COLOR[s] || '#71717A'}40`,
});

function SevBadge({ s }) {
  return <span className="sev-badge" style={sevStyle(s)}>{s}</span>;
}

function VerdictBadge({ v }) {
  const cls = v?.includes('detected') ? 'verdict-detected' : v === 'clean' ? 'verdict-clean' : v === 'suspicious' || v?.includes('possible') ? 'verdict-suspicious' : 'verdict-unknown';
  return <span className={`sev-badge ${cls}`}>{v}</span>;
}

// ── Generic KV renderer ───────────────────────────────────────────────────────
function KVPairs({ data, skip = [] }) {
  const entries = Object.entries(data).filter(([k]) => !skip.includes(k) && !Array.isArray(data[k]) && typeof data[k] !== 'object');
  return (
    <div>
      {entries.map(([k, v]) => (
        <div key={k} className="hw-kv-row">
          <span className="hw-kv-key">{k.replace(/_/g, ' ')}</span>
          <span className="hw-kv-val">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Table renderer ────────────────────────────────────────────────────────────
function DataTable({ rows, cols }) {
  if (!rows || !rows.length) return <div style={{ padding: 16, color: '#71717A', fontSize: '0.8rem' }}>No data.</div>;
  const keys = cols || Object.keys(rows[0]).slice(0, 6);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="hw-table">
        <thead>
          <tr>{keys.map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((r, i) => (
            <tr key={i}>
              {keys.map(k => (
                <td key={k}>
                  {k === 'severity' ? <SevBadge s={r[k]} /> :
                   k === 'verdict'  ? <VerdictBadge v={r[k]} /> :
                   k.includes('mitre') ? (r[k] ? <span className="hw-mitre-tag">{r[k]}</span> : '—') :
                   Array.isArray(r[k]) ? r[k].join(', ') :
                   String(r[k] ?? '—').slice(0, 120)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Result renderers per tool ─────────────────────────────────────────────────
function ResultRenderer({ toolKey, result }) {
  if (result.error) return <div className="hw-alert-banner critical"><AlertTriangle size={15}/>{result.error}</div>;

  // Summary banner always shown
  const Summary = () => result.summary ? (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
      {result.summary}
    </div>
  ) : null;

  // VERDICT / THREAT banner
  const VerdictBanner = () => {
    const v = result.verdict || result.overall_threat_level || result.overall_risk_level;
    if (!v) return null;
    const isBAD = ['poisoning_detected','evil_twin_detected','replay_attack_confirmed','clone_detected','jamming_detected'].includes(v) || ['critical','high'].includes(v) || result.is_attack || result.jamming_detected;
    return (
      <div className={`hw-alert-banner ${isBAD ? 'critical' : v === 'clean' || v === 'low' ? 'success' : 'warning'}`} style={{ margin: '12px 16px 0' }}>
        <Shield size={15}/>
        <strong>Verdict: {v.replace(/_/g,' ').toUpperCase()}</strong>
        {result.is_attack && ' — ATTACK CONFIRMED'}
        {result.jamming_detected && ` — ${result.jamming_type?.toUpperCase()} JAMMING`}
      </div>
    );
  };

  // LSASS / Injection alert
  const CriticalAlerts = () => (
    <>
      {result.lsass_access_events?.length > 0 && <div className="hw-alert-banner critical" style={{margin:'10px 16px 0'}}><AlertTriangle size={15}/>LSASS Access Detected — Possible Credential Dumping (T1003.001)</div>}
      {result.injection_events?.length > 0 && <div className="hw-alert-banner critical" style={{margin:'10px 16px 0'}}><AlertTriangle size={15}/>Process Injection Detected (T1055)</div>}
      {result.beaconing_detected && <div className="hw-alert-banner warning" style={{margin:'10px 16px 0'}}><AlertTriangle size={15}/>C2 Beaconing Pattern Detected</div>}
      {result.automated && toolKey === 'keystroke_injection_analyser' && <div className="hw-alert-banner critical" style={{margin:'10px 16px 0'}}><AlertTriangle size={15}/>Automated Injection Detected — {result.typing_speed_wpm} WPM (Human max ~150)</div>}
      {result.is_malicious && toolKey === 'encoded_command_decoder' && <div className="hw-alert-banner critical" style={{margin:'10px 16px 0'}}><AlertTriangle size={15}/>Malicious Command Decoded — {result.malicious_indicators?.join(', ')}</div>}
    </>
  );

  const inner = (() => {
    switch (toolKey) {
      case 'probe_request_analyser':
        return (
          <>
            <KVPairs data={result} skip={['client_profiles','suspicious_clients','top_probed_ssids','summary']} />
            {result.suspicious_clients?.length > 0 && (
              <div style={{margin:'14px 16px 0'}}>
                <div style={{fontSize:'0.68rem',color:'#4DA3FF',fontWeight:700,marginBottom:6,fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em'}}>Suspicious Clients</div>
                <DataTable rows={result.suspicious_clients} />
              </div>
            )}
            {result.client_profiles?.length > 0 && (
              <div style={{margin:'14px 16px 0'}}>
                <div style={{fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:600,marginBottom:6,fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em'}}>Client Profiles</div>
                <DataTable rows={result.client_profiles} cols={['mac','probe_count','unique_ssids','flagged','flag_reason']} />
              </div>
            )}
          </>
        );
      case 'evil_twin_detector':
        return (
          <>
            <KVPairs data={result} skip={['evil_twin_suspects','summary']} />
            {result.evil_twin_suspects?.length > 0 && (
              <div style={{margin:'14px 16px 0'}}>
                <div style={{fontSize:'0.68rem',color:'#4DA3FF',fontWeight:700,marginBottom:6,fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em'}}>Evil Twin Suspects</div>
                <DataTable rows={result.evil_twin_suspects} cols={['ssid','bssid_count','channels','verdict','reason']} />
              </div>
            )}
          </>
        );
      case 'spectrum_analyser':
        return (
          <>
            <KVPairs data={result} skip={['bands','active_bands','anomaly_bands','strongest_signal','summary']} />
            {result.bands?.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8,padding:'14px 16px 0'}}>
                {result.bands.map(b => (
                  <div key={b.name} className="at-card" style={{padding:'12px',border:`1px solid ${b.is_anomaly?'rgba(239,68,68,0.4)':b.is_active?'rgba(34,197,94,0.25)':'var(--border)'}`}}>
                    <div style={{fontWeight:600,fontSize:'0.82rem',marginBottom:4}}>{b.name}</div>
                    <div style={{fontSize:'0.68rem',color:'var(--text-muted)',fontFamily:'JetBrains Mono',marginBottom:4}}>{b.freq_range}</div>
                    <div style={{fontSize:'0.9rem',fontWeight:700,fontFamily:'JetBrains Mono',color:b.is_anomaly?'#EF4444':b.is_active?'#22C55E':'var(--text-muted)'}}>{b.peak_dbm} dBm</div>
                    <div style={{display:'flex',gap:4,marginTop:6}}>
                      {b.is_active  && <span className="sev-badge" style={{color:'#22C55E',background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.25)'}}>ACTIVE</span>}
                      {b.is_anomaly && <span className="sev-badge" style={{color:'#EF4444',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)'}}>ANOMALY</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      case 'payload_decoder':
        return (
          <>
            <KVPairs data={result} skip={['payload_steps','attack_phases_detected','embedded_iocs','mitre_techniques','summary']} />
            {result.attack_phases_detected?.length > 0 && (
              <div style={{padding:'10px 16px',display:'flex',gap:6,flexWrap:'wrap'}}>
                {result.attack_phases_detected.map(p => (
                  <span key={p} className="sev-badge verdict-detected">{p.replace('STAGE_','Stage ').replace(/_/g,' ')}</span>
                ))}
              </div>
            )}
            {result.payload_steps?.length > 0 && (
              <div style={{margin:'0 16px 0'}}>
                <DataTable rows={result.payload_steps} cols={['line_number','command','argument','human_explanation','mitre']} />
              </div>
            )}
            {result.embedded_iocs?.urls?.length > 0 && (
              <div style={{padding:'10px 16px'}}>
                <div style={{fontSize:'0.68rem',color:'var(--text-muted)',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Embedded URLs</div>
                {result.embedded_iocs.urls.map(u => <div key={u} className="hw-mono-box" style={{padding:'4px 8px',marginBottom:2,maxHeight:'none'}}>{u}</div>)}
              </div>
            )}
          </>
        );
      case 'encoded_command_decoder':
        return (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,padding:'14px 16px 0'}}>
              <div>
                <div style={{fontSize:'0.65rem',color:'var(--text-muted)',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Original ({result.encoding_detected})</div>
                <div className="hw-mono-box" style={{maxHeight:120}}>{result.original}</div>
              </div>
              <div>
                <div style={{fontSize:'0.65rem',color:'#22C55E',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Decoded ({result.layers_count} layer{result.layers_count!==1?'s':''})</div>
                <div className="hw-mono-box" style={{maxHeight:120}}>{result.final_decoded}</div>
              </div>
            </div>
            {result.ai_explanation && (
              <div style={{margin:'12px 16px 0',padding:'10px 14px',background:'rgba(167,139,250,0.06)',border:'1px solid rgba(167,139,250,0.15)',borderRadius:6,fontSize:'0.8rem',color:'#A78BFA',fontStyle:'italic'}}>{result.ai_explanation}</div>
            )}
            {result.mitre_technique && <div style={{padding:'8px 16px'}}><span className="hw-mitre-tag">{result.mitre_technique}</span></div>}
          </>
        );
      case 'suricata_parser':
        return (
          <>
            <div style={{display:'flex',gap:10,padding:'12px 16px',flexWrap:'wrap'}}>
              {Object.entries(result.event_types||{}).map(([k,v]) => (
                <div key={k} style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 14px',textAlign:'center'}}>
                  <div style={{fontSize:'1.1rem',fontWeight:700,fontFamily:'JetBrains Mono',color:'var(--text-primary)'}}>{v}</div>
                  <div style={{fontSize:'0.62rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{k}</div>
                </div>
              ))}
            </div>
            {result.alerts?.length > 0 && (
              <div style={{margin:'0 16px'}}>
                <div style={{fontSize:'0.68rem',color:'var(--text-muted)',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',margin:'8px 0 4px'}}>Alerts</div>
                <DataTable rows={result.alerts.slice(0,20)} cols={['signature','severity','src_ip','dest_ip','dest_port','mitre_technique']} />
              </div>
            )}
            {result.dns_analysis?.dga_suspects?.length > 0 && (
              <div style={{margin:'12px 16px 0'}}>
                <div style={{fontSize:'0.68rem',color:'#EAB308',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>DGA Suspects</div>
                <DataTable rows={result.dns_analysis.dga_suspects} cols={['domain','entropy','confidence']} />
              </div>
            )}
            {result.c2_candidates?.length > 0 && (
              <div style={{padding:'10px 16px'}}>
                <div style={{fontSize:'0.68rem',color:'#EF4444',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>C2 Candidates</div>
                {result.c2_candidates.map(ip => <div key={ip} className="hw-mono-box" style={{padding:'4px 8px',marginBottom:2,maxHeight:'none',color:'#EF4444'}}>{ip}</div>)}
              </div>
            )}
          </>
        );
      case 'sysmon_parser':
        return (
          <>
            <div style={{padding:'12px 16px',display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontWeight:700,fontSize:'1rem'}}>Threat Level:</span>
              <span className="sev-badge" style={sevStyle(result.overall_threat_level || 'info')}>{(result.overall_threat_level||'unknown').toUpperCase()}</span>
            </div>
            {result.lolbin_hits?.length > 0 && (
              <div style={{margin:'0 16px'}}>
                <div style={{fontSize:'0.68rem',color:'#EF4444',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',margin:'4px 0'}}>LOLBin Hits</div>
                <DataTable rows={result.lolbin_hits} cols={['process','lolbin_name','parent','mitre_technique','risk']} />
              </div>
            )}
            {result.suspicious_parent_child?.length > 0 && (
              <div style={{margin:'12px 16px 0'}}>
                <div style={{fontSize:'0.68rem',color:'#EAB308',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Suspicious Process Chains</div>
                <DataTable rows={result.suspicious_parent_child} cols={['parent','child','reason','mitre_technique']} />
              </div>
            )}
            {result.mitre_techniques?.length > 0 && (
              <div style={{padding:'10px 16px',display:'flex',flexWrap:'wrap',gap:4}}>
                {result.mitre_techniques.map(t => <span key={t} className="hw-mitre-tag">{t}</span>)}
              </div>
            )}
          </>
        );
      case 'process_tree_analyser':
        return (
          <>
            <div style={{padding:'12px 16px',display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontWeight:700,fontSize:'1rem'}}>Risk Level:</span>
              <span className="sev-badge" style={sevStyle(result.overall_risk_level || 'info')}>{(result.overall_risk_level||'unknown').toUpperCase()}</span>
              <span style={{fontSize:'0.78rem',color:'var(--text-muted)',marginLeft:8}}>{result.total_processes} total processes</span>
            </div>
            {result.high_risk_processes?.length > 0 && (
              <div style={{margin:'0 16px'}}>
                <DataTable rows={result.high_risk_processes} cols={['name','pid','user','cpu','memory','risk_score']} />
              </div>
            )}
            {result.anomalous_spawn?.length > 0 && (
              <div style={{margin:'12px 16px 0'}}>
                <div style={{fontSize:'0.68rem',color:'#EAB308',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>Anomalous Spawning</div>
                <DataTable rows={result.anomalous_spawn} cols={['parent','child','reason']} />
              </div>
            )}
          </>
        );
      default:
        return (
          <div style={{padding:'14px 16px'}}>
            <KVPairs data={result} skip={['summary','error']} />
            {Object.entries(result).map(([k, v]) => {
              if (!Array.isArray(v) || !v.length || k === 'summary') return null;
              if (typeof v[0] === 'object') return (
                <div key={k} style={{marginTop:12}}>
                  <div style={{fontSize:'0.68rem',color:'var(--text-muted)',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{k.replace(/_/g,' ')}</div>
                  <DataTable rows={v} />
                </div>
              );
              return (
                <div key={k} style={{marginTop:10}}>
                  <div style={{fontSize:'0.68rem',color:'var(--text-muted)',fontFamily:'JetBrains Mono',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{k.replace(/_/g,' ')}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {v.map((item, i) => <span key={i} className="hw-mono-box" style={{padding:'2px 8px',maxHeight:'none',display:'inline'}}>{String(item)}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        );
    }
  })();

  return (
    <div>
      <VerdictBanner />
      <CriticalAlerts />
      <Summary />
      {inner}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function HardwareTools() {
  const { addToast } = useStore();
  const [selected, setSelected]   = useState(null);
  const [input, setInput]         = useState('');
  const [alertId, setAlertId]     = useState('');
  const [caseId, setCaseId]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [runId, setRunId]         = useState(null);
  const [search, setSearch]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [copied, setCopied]       = useState(false);
  const textareaRef               = useRef(null);

  const tool = selected ? TOOL_MAP[selected] : null;
  const MAX_BYTES = 512000;
  const inputBytes = new TextEncoder().encode(input).length;

  const filteredCategories = CATEGORIES.map(cat => ({
    ...cat,
    tools: search ? cat.tools.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.key.includes(search.toLowerCase())) : cat.tools,
  })).filter(cat => !search || cat.tools.length > 0);

  const handleRun = async () => {
    if (!input.trim()) { addToast('Paste some log data first', 'error'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/api/hardware/tools/run', {
        tool_type: selected, input_data: input,
        alert_id: alertId ? parseInt(alertId) : null,
        case_id:  caseId  ? parseInt(caseId)  : null,
      });
      setResult(res.data.result);
      setRunId(res.data.run_id);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      if (e.response?.status === 429) addToast('Rate limit — wait 60 seconds', 'error');
      else addToast(msg || 'Tool run failed', 'error');
      setResult({ error: msg });
    } finally { setLoading(false); }
  };

  const handleSaveToCase = async () => {
    if (!caseId) { addToast('Enter a Case ID first', 'error'); return; }
    setSaving(true);
    try {
      await api.post(`/api/cases/${caseId}/evidence`, {
        artifact_type:    'hardware_tool_result',
        source_module:    selected,
        raw_input:        input.slice(0, 5000),
        normalized_output: JSON.stringify(result).slice(0, 10000),
        verdict: result?.verdict || result?.overall_threat_level || 'unknown',
      });
      addToast('Saved to case', 'success');
    } catch (e) { addToast('Save failed', 'error'); }
    setSaving(false);
  };

  const handleCopy = () => {
    const md = `## ${tool?.name} — Result\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
    navigator.clipboard.writeText(md);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    addToast('Copied as Markdown', 'success');
  };

  useEffect(() => {
    if (selected && textareaRef.current) textareaRef.current.focus();
    setResult(null); setRunId(null);
  }, [selected]);

  return (
    <div className="hw-layout">
      {/* LEFT PANEL */}
      <aside className="hw-left">
        <div className="hw-left-search">
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
            <input
              className="at-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools…"
              style={{ paddingLeft: 30, fontSize: '0.78rem' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:0 }}><X size={12}/></button>}
          </div>
        </div>
        <div className="hw-left-scroll">
          {filteredCategories.map(cat => (
            <div key={cat.id}>
              <div className="hw-category-header">
                <cat.icon size={11} style={{ color: cat.color }} />
                {cat.label}
                <span style={{ marginLeft:'auto', opacity:0.5 }}>{cat.tools.length}</span>
              </div>
              {cat.tools.map(t => (
                <div
                  key={t.key}
                  className={`hw-tool-row ${selected === t.key ? 'active' : ''}`}
                  onClick={() => setSelected(t.key)}
                >
                  <div>
                    <div className="hw-tool-name">{t.name}</div>
                    <div className="hw-tool-key">{t.key}</div>
                  </div>
                  {selected === t.key && <ChevronRight size={12} style={{ color: '#4DA3FF', flexShrink:0 }} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <div className="hw-right">
        {!selected ? (
          <div className="hw-placeholder">
            <Cpu size={40} style={{ opacity: 0.15 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select a tool from the left panel</div>
            <div style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono' }}>{Object.keys(TOOL_MAP).length} forensic analysis tools available</div>
          </div>
        ) : (
          <>
            {/* Tool header */}
            <div className="at-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {React.createElement(tool.category.icon, { size: 18, style: { color: tool.category.color } })}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{tool.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{tool.desc}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4 }}>
                  {tool.category.label}
                </span>
              </div>
            </div>

            {/* Input section */}
            <div className="at-card" style={{ padding: 16 }}>
              <div className="at-field">
                <label className="at-label">Input Data</label>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{tool.hint}</div>
                <textarea
                  ref={textareaRef}
                  className="at-textarea"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  rows={8}
                  style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', minHeight: 200 }}
                  placeholder={`Paste ${tool.name} data here…`}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.68rem', color: inputBytes > MAX_BYTES ? '#EF4444' : 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  <span>{inputBytes.toLocaleString()} / {(MAX_BYTES/1024).toFixed(0)}KB</span>
                  {inputBytes > MAX_BYTES && <span>⚠ Exceeds limit — will be truncated</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <div className="at-field" style={{ margin: 0, flex: 1 }}>
                  <label className="at-label">Alert ID (optional)</label>
                  <input className="at-input" type="number" value={alertId} onChange={e => setAlertId(e.target.value)} placeholder="Link to alert" />
                </div>
                <div className="at-field" style={{ margin: 0, flex: 1 }}>
                  <label className="at-label">Case ID (optional)</label>
                  <input className="at-input" type="number" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Save to case" />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <button className="btn-accent" onClick={handleRun} disabled={loading || !input.trim()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
                  {loading ? 'Analysing…' : 'Run Analysis'}
                </button>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="hw-result-section">
                <div className="hw-result-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={14} style={{ color: '#4DA3FF' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{tool.name} — Analysis Complete</span>
                    {runId && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Run #{runId}</span>}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{new Date().toLocaleTimeString()}</span>
                </div>
                <ResultRenderer toolKey={selected} result={result} />
                <div className="hw-result-actions" style={{ padding: '12px 16px' }}>
                  {runId && (
                    <button className="btn-ghost" onClick={() => window.open(`/app/hardware/tools/${runId}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                      <ExternalLink size={13} />Open in New Tab
                    </button>
                  )}
                  <button className="btn-ghost" onClick={handleSaveToCase} disabled={saving || !caseId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    {saving ? <Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> : <Shield size={13}/>}
                    Save to Case
                  </button>
                  <button className="btn-ghost" onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                    {copied ? <CheckCircle size={13} style={{ color: '#22C55E' }} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy as Markdown'}
                  </button>
                  <button className="btn-ghost" onClick={() => { setResult(null); setRunId(null); }} style={{ fontSize: '0.78rem' }}>
                    Run Again
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
