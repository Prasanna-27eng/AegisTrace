import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Monitor, RefreshCw, Loader2, AlertTriangle, CheckCircle, Shield,
  FileText, ChevronRight, Copy, X, Download, Terminal, Activity,
  Wifi, Lock, Unlock, Zap, Eye, Clock, User, Server, Database
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

const OS_ICON   = { windows:'🪟', linux:'🐧', mac:'🍎', unknown:'💻' };
const MONO      = { fontFamily:'JetBrains Mono,monospace' };
const SEV_CLR   = { critical:'#EF4444', high:'#F97316', medium:'#EAB308', low:'#22C55E', info:'#5A8A9F', debug:'#555' };
const CAT_ICON  = { auth:'🔐', kernel:'⚙', service:'🔄', package:'📦', cron:'⏰', network:'🌐', ssh:'🔑', privilege:'⚡', user_mgmt:'👤', system:'💻' };
const LOG_CATS  = ['all','auth','kernel','service','package','cron','network'];

const ALERT_LABELS = {
  honey_token_access:'Honey Token Accessed', suspicious_process:'Suspicious Process',
  fim_change:'File Integrity Change', failed_login:'Failed Login', yara_match:'YARA Match',
  dga_domain:'DGA Domain', suspicious_port:'Suspicious Port', privilege_escalation:'Privilege Escalation',
  user_management:'User Account Change', suspicious_lineage:'Suspicious Process Chain',
};

function RiskGauge({ score }) {
  const color = score >= 80 ? '#EF4444' : score >= 60 ? '#F97316' : score >= 40 ? '#EAB308' : score >= 20 ? '#8FAFC0' : '#22C55E';
  const label = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : score >= 20 ? 'LOW' : 'CLEAN';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ position:'relative', width:80, height:80 }}>
        <svg viewBox="0 0 80 80" style={{ width:80, height:80, transform:'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${(score/100)*201} 201`} strokeLinecap="round"
            style={{ transition:'stroke-dasharray 0.8s ease' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:'1.2rem', fontWeight:800, color, ...MONO, lineHeight:1 }}>{score}</span>
          <span style={{ fontSize:'0.5rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.06em' }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize:'0.6rem', fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.1em', ...MONO }}>{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = '#5A8A9F', sub }) {
  return (
    <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'12px 14px', flex:1, minWidth:100 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <Icon size={13} style={{ color }}/>
        <span style={{ fontSize:'0.62rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.08em', ...MONO }}>{label}</span>
      </div>
      <div style={{ fontSize:'1.4rem', fontWeight:700, color, ...MONO, lineHeight:1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize:'0.6rem', color:'#555', marginTop:3, ...MONO }}>{sub}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ENDPOINT DETAIL — full enterprise view
───────────────────────────────────────────────────────────────────────────── */
function EndpointDetail({ ep, onClose, onDelete, addToast }) {
  const navigate = useNavigate();
  const [tab, setTab]           = useState('overview');
  const [detail, setDetail]     = useState(null);
  const [rawLogs, setRawLogs]   = useState([]);
  const [logFilter, setLogFilter] = useState('all');
  const [logsLoading, setLogsLoading] = useState(false);
  const [cmdLoading, setCmdLoading]   = useState('');
  const [expandedAlert, setExpandedAlert] = useState(null);
  const logsRef = useRef(null);

  const loadDetail = useCallback((silent = false) => {
    if (!silent) setDetail(null);
    api.get(`/api/ingest/endpoints/${ep.id}/detail`)
      .then(r => setDetail(r.data))
      .catch(() => {});
  }, [ep.id]);

  const loadLogs = useCallback((filter = logFilter, silent = false) => {
    if (!silent) setLogsLoading(true);
    const params = filter !== 'all' ? `?category=${filter}&limit=300` : '?limit=300';
    api.get(`/api/ingest/raw-logs/${ep.id}${params}`)
      .then(r => {
        setRawLogs(r.data || []);
        setLogsLoading(false);
        setTimeout(() => { if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight; }, 50);
      })
      .catch(() => setLogsLoading(false));
  }, [ep.id, logFilter]);

  useEffect(() => { loadDetail(); loadLogs(); }, [ep.id]);

  // Real-time: refresh detail every 10s, logs every 3s
  useEffect(() => {
    const d = setInterval(() => loadDetail(true), 10000);
    return () => clearInterval(d);
  }, [loadDetail]);

  useEffect(() => {
    if (tab !== 'logs') return;
    const l = setInterval(() => loadLogs(logFilter, true), 3000);
    return () => clearInterval(l);
  }, [tab, logFilter, loadLogs]);

  const dispatch = async (command, payload = {}, label = command) => {
    setCmdLoading(command);
    try {
      await api.post('/api/ingest/agent/command/dispatch', { agent_id: ep.id, command, payload });
      addToast(`Command dispatched — agent will execute "${label}" within 10s`, 'success');
    } catch (e) {
      addToast(e.response?.data?.detail || `Failed to dispatch "${label}"`, 'error');
    }
    setCmdLoading('');
  };

  const isOnline = detail?.is_active ?? ((Date.now() - new Date(ep.last_seen).getTime()) / 1000 < 120);
  const sys = detail?.system_info || {};
  const TABS = [
    { id:'overview',  label:'Overview' },
    { id:'logs',      label:'Live Logs' },
    { id:'processes', label:'Processes' },
    { id:'network',   label:'Network' },
    { id:'alerts',    label:'Alerts' },
    { id:'response',  label:'Response' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0A0A0A', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, overflow:'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.4)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:28 }}>{OS_ICON[ep.os_type] || '💻'}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontWeight:700, fontSize:'1.05rem' }}>{ep.hostname}</span>
              <span style={{ width:8, height:8, borderRadius:'50%', background: isOnline ? '#22C55E' : '#555', display:'inline-block', boxShadow: isOnline ? '0 0 6px #22C55E' : 'none' }}/>
              <span style={{ fontSize:'0.65rem', color: isOnline ? '#22C55E' : '#555', ...MONO, textTransform:'uppercase' }}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div style={{ fontSize:'0.7rem', color:'#555', ...MONO, marginTop:2 }}>
              {ep.ip_address} · {ep.os_type} · Agent v{ep.agent_version}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => { loadDetail(); loadLogs(); }}
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 10px', cursor:'pointer', color:'#787878', display:'flex', alignItems:'center', gap:5, fontSize:'0.72rem', ...MONO }}
              onMouseEnter={e => e.currentTarget.style.color='#EBEBEB'} onMouseLeave={e => e.currentTarget.style.color='#787878'}>
              <RefreshCw size={11}/> Refresh
            </button>
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 9px', cursor:'pointer', color:'#787878' }}>
              <X size={14}/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', fontSize:'0.76rem', cursor:'pointer', ...MONO, whiteSpace:'nowrap',
              borderBottom: tab===t.id ? '2px solid #5A8A9F' : '2px solid transparent',
              color: tab===t.id ? '#5A8A9F' : '#555', transition:'color 0.15s' }}>
            {t.label}
            {t.id === 'alerts' && detail?.recent_alerts?.filter(a=>a.status==='open').length > 0 &&
              <span style={{ marginLeft:5, background:'#EF4444', color:'#fff', borderRadius:'50%', fontSize:'0.55rem', padding:'1px 5px', verticalAlign:'middle' }}>
                {detail.recent_alerts.filter(a=>a.status==='open').length}
              </span>
            }
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>

        {/* ══ OVERVIEW ══ */}
        {tab === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Risk + stats row */}
            <div style={{ display:'flex', gap:14, alignItems:'stretch', flexWrap:'wrap' }}>
              <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'16px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:120 }}>
                <div style={{ fontSize:'0.6rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.1em', ...MONO }}>Risk Score</div>
                <RiskGauge score={detail?.local_risk_score ?? ep.local_risk_score ?? 0} />
              </div>
              <div style={{ flex:1, display:'flex', gap:10, flexWrap:'wrap' }}>
                <StatCard icon={Activity}       label="Processes"       value={detail?.processes?.length ?? '…'} color="#5A8A9F" sub="running"/>
                <StatCard icon={Wifi}           label="Connections"     value={detail?.connections?.length ?? '…'} color="#8FAFC0" sub="active"/>
                <StatCard icon={AlertTriangle}  label="Open Alerts"     value={detail ? (detail.open_critical + detail.open_high) : '…'} color={detail?.open_critical > 0 ? '#EF4444' : '#EAB308'} sub="critical+high"/>
                <StatCard icon={Shield}         label="Failed Logins"   value={detail?.failed_logins_24h ?? '…'} color={detail?.failed_logins_24h > 5 ? '#EF4444' : '#8FAFC0'} sub="last 24h"/>
                <StatCard icon={Terminal}       label="Sudo Commands"   value={detail?.sudo_commands_24h ?? '…'} color="#F97316" sub="last 24h"/>
              </div>
            </div>

            {/* System info */}
            {sys.cpu_percent !== undefined && (
              <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'14px 16px' }}>
                <div style={{ fontSize:'0.65rem', color:'#5A8A9F', textTransform:'uppercase', letterSpacing:'0.1em', ...MONO, marginBottom:12 }}>◇ System Resources</div>
                <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                  {[
                    { label:'CPU', value: sys.cpu_percent, unit:'%', color: sys.cpu_percent > 90 ? '#EF4444' : sys.cpu_percent > 70 ? '#F97316' : '#22C55E' },
                    { label:'Memory', value: sys.mem_percent, unit:'%', color: sys.mem_percent > 90 ? '#EF4444' : sys.mem_percent > 70 ? '#F97316' : '#22C55E' },
                    { label:'Disk', value: sys.disk_percent, unit:'%', color: sys.disk_percent > 90 ? '#EF4444' : '#22C55E' },
                  ].map(m => m.value !== undefined && (
                    <div key={m.label} style={{ flex:1, minWidth:120 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:'0.7rem', color:'#787878', ...MONO }}>
                        <span>{m.label}</span>
                        <span style={{ color: m.color, fontWeight:600 }}>{m.value}{m.unit}</span>
                      </div>
                      <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${m.value}%`, background: m.color, borderRadius:3, transition:'width 0.6s ease' }}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap', fontSize:'0.68rem', color:'#555', ...MONO }}>
                  {sys.uptime_hours !== undefined && <span>⏱ Uptime: {sys.uptime_hours}h</span>}
                  {sys.logged_in_users?.length > 0 && <span>👤 Logged in: {sys.logged_in_users.join(', ')}</span>}
                  {sys.mem_total_mb && <span>🧠 RAM: {Math.round(sys.mem_total_mb/1024)}GB total</span>}
                </div>
              </div>
            )}

            {/* Recent alerts */}
            {detail?.recent_alerts?.length > 0 && (
              <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'14px 16px' }}>
                <div style={{ fontSize:'0.65rem', color:'#5A8A9F', textTransform:'uppercase', letterSpacing:'0.1em', ...MONO, marginBottom:10 }}>◇ Recent Alerts</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {detail.recent_alerts.slice(0,5).map(a => {
                    const sc = SEV_CLR[a.severity] || '#787878';
                    return (
                      <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'rgba(255,255,255,0.02)', borderRadius:6, border:`1px solid rgba(255,255,255,0.05)`, borderLeft:`3px solid ${sc}` }}>
                        <span style={{ fontSize:'0.6rem', fontWeight:700, color:sc, textTransform:'uppercase', ...MONO, minWidth:60 }}>{a.severity}</span>
                        <span style={{ fontSize:'0.76rem', flex:1, color:'#EBEBEB' }}>{ALERT_LABELS[a.alert_type] || a.alert_type?.replace(/_/g,' ')}</span>
                        <span style={{ fontSize:'0.62rem', color:'#555', ...MONO, flexShrink:0 }}>
                          {new Date(a.detected_at).toLocaleTimeString(undefined, {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent sudo */}
            {detail?.recent_sudo?.length > 0 && (
              <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'14px 16px' }}>
                <div style={{ fontSize:'0.65rem', color:'#F97316', textTransform:'uppercase', letterSpacing:'0.1em', ...MONO, marginBottom:10 }}>◇ Recent sudo Commands</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {detail.recent_sudo.map((s,i) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'5px 8px', background:'rgba(249,115,22,0.03)', borderRadius:5, alignItems:'flex-start' }}>
                      <span style={{ color:'#555', fontSize:'0.62rem', ...MONO, flexShrink:0, minWidth:70 }}>
                        {s.ts ? new Date(s.ts).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}) : ''}
                      </span>
                      {s.username && <span style={{ color:'#EAB308', fontSize:'0.68rem', ...MONO, flexShrink:0 }}>{s.username}</span>}
                      <span style={{ color:'#F97316', fontSize:'0.68rem', ...MONO, wordBreak:'break-all', lineHeight:1.5 }}>{s.raw}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!detail && <div style={{ textAlign:'center', padding:40 }}><Loader2 size={20} className="spinner" style={{ color:'#787878' }}/></div>}
          </div>
        )}

        {/* ══ LIVE LOGS ══ */}
        {tab === 'logs' && (
          <div>
            <div style={{ display:'flex', gap:4, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
              {LOG_CATS.map(c => (
                <button key={c} onClick={() => { setLogFilter(c); loadLogs(c); }}
                  style={{ padding:'3px 10px', borderRadius:5, border:'1px solid', fontSize:'0.65rem', cursor:'pointer', ...MONO, textTransform:'uppercase',
                    background: logFilter===c ? 'rgba(90,138,159,0.12)' : 'transparent',
                    color: logFilter===c ? '#5A8A9F' : '#555',
                    borderColor: logFilter===c ? 'rgba(90,138,159,0.3)' : 'rgba(255,255,255,0.07)' }}>
                  {CAT_ICON[c] || ''} {c}
                </button>
              ))}
              <span style={{ marginLeft:'auto', fontSize:'0.6rem', color:'#555', ...MONO }}>
                {rawLogs.length} events · auto-refresh 3s
                <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#22C55E', marginLeft:6, animation:'pulse 2s infinite', verticalAlign:'middle' }}/>
              </span>
            </div>
            {logsLoading ? (
              <div style={{ textAlign:'center', padding:30 }}><Loader2 size={16} className="spinner" style={{ color:'#787878' }}/></div>
            ) : rawLogs.length === 0 ? (
              <div style={{ padding:30, textAlign:'center', color:'#555', fontSize:'0.8rem', ...MONO }}>
                Waiting for logs — agent ships every 3s via real-time stream.
              </div>
            ) : (
              <div ref={logsRef} style={{ background:'#030303', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, maxHeight:560, overflowY:'auto', ...MONO, fontSize:'0.7rem' }}>
                {rawLogs.map((log, i) => {
                  const sc = SEV_CLR[log.severity] || '#555';
                  const ts = log.ts ? new Date(log.ts).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}) : '';
                  const isBad = log.event_type === 'failed_login';
                  const isSudo = log.event_type === 'sudo_command';
                  return (
                    <div key={i} style={{ display:'flex', gap:8, padding:'4px 10px', borderBottom:'1px solid rgba(255,255,255,0.025)', alignItems:'flex-start',
                      background: isBad ? 'rgba(239,68,68,0.05)' : isSudo ? 'rgba(249,115,22,0.04)' : 'transparent' }}>
                      <span style={{ color:'#333', flexShrink:0, minWidth:62 }}>{ts}</span>
                      <span style={{ flexShrink:0, minWidth:14 }}>{CAT_ICON[log.category] || '●'}</span>
                      <span style={{ color:sc, flexShrink:0, minWidth:52, textTransform:'uppercase', fontSize:'0.58rem', paddingTop:1 }}>{log.severity}</span>
                      <span style={{ color:'#5A8A9F', flexShrink:0, minWidth:55, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.source}</span>
                      {log.username  && <span style={{ color:'#EAB308', flexShrink:0 }}>{log.username}</span>}
                      {log.source_ip && <span style={{ color:'#22C55E', flexShrink:0 }}>← {log.source_ip}</span>}
                      <span style={{ color: isBad ? '#EF4444' : isSudo ? '#F97316' : '#666', flex:1, wordBreak:'break-all', lineHeight:1.5 }}>{log.raw}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ PROCESSES ══ */}
        {tab === 'processes' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center' }}>
              <span style={{ fontSize:'0.68rem', color:'#555', ...MONO }}>{detail?.processes?.length ?? 0} processes · updated every 10s</span>
              <button onClick={() => dispatch('collect_now', {}, 'Collect Now')} disabled={cmdLoading==='collect_now'}
                style={{ fontSize:'0.68rem', background:'rgba(90,138,159,0.1)', border:'1px solid rgba(90,138,159,0.25)', color:'#5A8A9F', borderRadius:5, padding:'4px 10px', cursor:'pointer', ...MONO, display:'flex', alignItems:'center', gap:5 }}>
                {cmdLoading==='collect_now' ? <Loader2 size={10} className="spinner"/> : <RefreshCw size={10}/>} Collect Now
              </button>
            </div>
            <div style={{ background:'#030303', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.72rem', ...MONO }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.03)' }}>
                    {['PID','Process','User','CPU %','Mem %','Action'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'8px 10px', color:'#555', fontWeight:600, fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(detail?.processes || []).map((p,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.03)', background: p.suspicious ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td style={{ padding:'6px 10px', color:'#555' }}>{p.pid}</td>
                      <td style={{ padding:'6px 10px', color: p.suspicious ? '#EF4444' : '#EBEBEB', fontWeight: p.suspicious ? 700 : 400 }}>
                        {p.suspicious && '⚠ '}{p.name}
                      </td>
                      <td style={{ padding:'6px 10px', color:'#EAB308' }}>{p.username || p.user || '—'}</td>
                      <td style={{ padding:'6px 10px', color: (p.cpu_percent||0) > 80 ? '#EF4444' : '#787878' }}>{p.cpu_percent?.toFixed(1) ?? '—'}</td>
                      <td style={{ padding:'6px 10px', color: (p.memory_percent||0) > 50 ? '#EAB308' : '#787878' }}>{p.memory_percent?.toFixed(1) ?? '—'}</td>
                      <td style={{ padding:'6px 10px' }}>
                        <button onClick={() => { if(window.confirm(`Kill process ${p.name} (PID ${p.pid})?`)) dispatch('kill_process', {pid:p.pid}, `Kill ${p.name}`); }}
                          disabled={!!cmdLoading}
                          style={{ fontSize:'0.6rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', borderRadius:4, padding:'2px 7px', cursor:'pointer', ...MONO }}>
                          Kill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!detail && <div style={{ textAlign:'center', padding:30 }}><Loader2 size={16} className="spinner" style={{ color:'#787878' }}/></div>}
              {detail && detail.processes.length === 0 && <div style={{ padding:20, textAlign:'center', color:'#555', fontSize:'0.8rem' }}>No process data yet — click Collect Now</div>}
            </div>
          </div>
        )}

        {/* ══ NETWORK ══ */}
        {tab === 'network' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center' }}>
              <span style={{ fontSize:'0.68rem', color:'#555', ...MONO }}>{detail?.connections?.length ?? 0} active connections</span>
            </div>
            <div style={{ background:'#030303', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.72rem', ...MONO }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.03)' }}>
                    {['Process','Local','Remote IP','Port','Status','Action'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'8px 10px', color:'#555', fontWeight:600, fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(detail?.connections || []).map((c,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.03)', background: c.suspicious ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      <td style={{ padding:'6px 10px', color: c.suspicious ? '#EF4444' : '#EBEBEB' }}>{c.process_name || '—'}</td>
                      <td style={{ padding:'6px 10px', color:'#555' }}>{c.local_ip}:{c.local_port}</td>
                      <td style={{ padding:'6px 10px', color:'#22C55E' }}>{c.remote_ip || '—'}</td>
                      <td style={{ padding:'6px 10px', color: c.suspicious ? '#EF4444' : '#5A8A9F', fontWeight: c.suspicious ? 700 : 400 }}>
                        {c.suspicious && '⚠ '}{c.remote_port}
                      </td>
                      <td style={{ padding:'6px 10px', color:'#555' }}>{c.status || '—'}</td>
                      <td style={{ padding:'6px 10px' }}>
                        {c.remote_ip && (
                          <button onClick={() => { if(window.confirm(`Block IP ${c.remote_ip}?`)) dispatch('block_ip', {ip:c.remote_ip}, `Block ${c.remote_ip}`); }}
                            style={{ fontSize:'0.6rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', borderRadius:4, padding:'2px 7px', cursor:'pointer', ...MONO }}>
                            Block
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!detail && <div style={{ textAlign:'center', padding:30 }}><Loader2 size={16} className="spinner" style={{ color:'#787878' }}/></div>}
              {detail && detail.connections.length === 0 && <div style={{ padding:20, textAlign:'center', color:'#555', fontSize:'0.8rem' }}>No active connections</div>}
            </div>
          </div>
        )}

        {/* ══ ALERTS ══ */}
        {tab === 'alerts' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(detail?.recent_alerts || []).length === 0 && (
              <div style={{ padding:40, textAlign:'center', color:'#555' }}>
                <CheckCircle size={32} style={{ margin:'0 auto 12px', opacity:0.3, color:'#22C55E' }}/>
                <div>No alerts for this endpoint</div>
              </div>
            )}
            {(detail?.recent_alerts || []).map(a => {
              const sc = SEV_CLR[a.severity] || '#787878';
              const isExp = expandedAlert === a.id;
              let ev = {};
              try { ev = JSON.parse(a.evidence || '{}'); } catch {}
              const ts = a.detected_at ? new Date(a.detected_at) : null;
              const precise = ts ? `${ts.toLocaleDateString()} ${ts.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}` : '';
              return (
                <div key={a.id} style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, overflow:'hidden', borderLeft:`3px solid ${sc}` }}>
                  <div onClick={() => setExpandedAlert(isExp ? null : a.id)}
                    style={{ padding:'12px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:600, fontSize:'0.82rem', color:'#EBEBEB' }}>{ALERT_LABELS[a.alert_type] || a.alert_type?.replace(/_/g,' ')}</span>
                        <span style={{ fontSize:'0.6rem', color:sc, background:`${sc}14`, padding:'1px 7px', borderRadius:3, ...MONO, textTransform:'uppercase' }}>{a.severity}</span>
                        <span style={{ fontSize:'0.6rem', color: a.status==='open'?'#EF4444':'#555', background:'rgba(255,255,255,0.04)', padding:'1px 7px', borderRadius:3, ...MONO, marginLeft:'auto' }}>{a.status}</span>
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'#787878' }}>{a.description}</div>
                      <div style={{ fontSize:'0.62rem', color:'#444', marginTop:4, ...MONO }}>🕐 {precise}</div>
                    </div>
                    <span style={{ color:'#555', fontSize:'0.8rem' }}>{isExp ? '▲' : '▼'}</span>
                  </div>
                  {isExp && (
                    <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'12px 16px', background:'rgba(0,0,0,0.2)' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, ...MONO, fontSize:'0.7rem', marginBottom:12 }}>
                        {ev.process_name && <div style={{ display:'flex', gap:10 }}><span style={{ color:'#555', minWidth:100 }}>Process</span><span style={{ color:'#EBEBEB' }}>{ev.process_name} (PID {ev.process_pid})</span></div>}
                        {ev.username     && <div style={{ display:'flex', gap:10 }}><span style={{ color:'#555', minWidth:100 }}>User</span><span style={{ color:'#EAB308' }}>{ev.username}</span></div>}
                        {ev.cmdline      && <div style={{ display:'flex', gap:10 }}><span style={{ color:'#555', minWidth:100 }}>Cmdline</span><span style={{ color:'#EBEBEB', wordBreak:'break-all' }}>{ev.cmdline}</span></div>}
                        {ev.honey_file   && <div style={{ display:'flex', gap:10 }}><span style={{ color:'#555', minWidth:100 }}>Honey File</span><span style={{ color:'#EF4444' }}>{ev.honey_file}</span></div>}
                        {ev.path         && <div style={{ display:'flex', gap:10 }}><span style={{ color:'#555', minWidth:100 }}>Path</span><span style={{ color:'#EBEBEB' }}>{ev.path}</span></div>}
                        {ev.remote_ip    && <div style={{ display:'flex', gap:10 }}><span style={{ color:'#555', minWidth:100 }}>Remote IP</span><span style={{ color:'#22C55E' }}>{ev.remote_ip}:{ev.remote_port}</span></div>}
                        {ev.source_ip    && <div style={{ display:'flex', gap:10 }}><span style={{ color:'#555', minWidth:100 }}>Source IP</span><span style={{ color:'#22C55E' }}>{ev.source_ip}</span></div>}
                        {ev.old_hash     && <div style={{ display:'flex', gap:10 }}><span style={{ color:'#555', minWidth:100 }}>Hash Change</span><span style={{ color:'#EAB308' }}>{ev.old_hash} → {ev.new_hash}</span></div>}
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {ev.process_pid && <button onClick={() => dispatch('kill_process',{pid:ev.process_pid},`Kill PID ${ev.process_pid}`)} style={{ fontSize:'0.65rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#EF4444', borderRadius:5, padding:'3px 10px', cursor:'pointer', ...MONO }}>⚡ Kill Process</button>}
                        {ev.remote_ip   && <button onClick={() => dispatch('block_ip',{ip:ev.remote_ip},`Block ${ev.remote_ip}`)} style={{ fontSize:'0.65rem', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', color:'#F97316', borderRadius:5, padding:'3px 10px', cursor:'pointer', ...MONO }}>🚫 Block IP</button>}
                        <button onClick={() => dispatch('collect_now',{},'Collect Now')} style={{ fontSize:'0.65rem', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', color:'#22C55E', borderRadius:5, padding:'3px 10px', cursor:'pointer', ...MONO }}>⚡ Collect Now</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ RESPONSE ══ */}
        {tab === 'response' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, padding:'16px' }}>
              <div style={{ fontSize:'0.65rem', color:'#5A8A9F', textTransform:'uppercase', letterSpacing:'0.1em', ...MONO, marginBottom:14 }}>◇ Immediate Response Actions</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
                {[
                  { cmd:'collect_now',    label:'Force Collect',    desc:'Trigger immediate telemetry cycle', color:'#22C55E', icon:'⚡' },
                  { cmd:'fim_check_now',  label:'FIM Scan Now',     desc:'Check all monitored file paths', color:'#5A8A9F', icon:'📁' },
                  { cmd:'ping',           label:'Ping Agent',       desc:'Verify agent is alive and responsive', color:'#8FAFC0', icon:'🔔' },
                  { cmd:'honey_status',   label:'Honey Token Status',desc:'Check honey token file status', color:'#EAB308', icon:'🍯' },
                  { cmd:'get_blocked_ips',label:'List Blocked IPs', desc:'Show all currently blocked IPs', color:'#F97316', icon:'🚫' },
                  { cmd:'set_poll_interval',label:'Set Fast Mode', desc:'Reduce poll interval to 10s for intensive monitoring', color:'#8FAFC0', icon:'⚡', payload:{seconds:10} },
                ].map(({ cmd, label, desc, color, icon, payload: p }) => (
                  <button key={cmd} onClick={() => dispatch(cmd, p || {}, label)} disabled={!!cmdLoading}
                    style={{ background:'rgba(255,255,255,0.02)', border:`1px solid rgba(255,255,255,0.07)`, borderRadius:8, padding:'14px', cursor:'pointer', textAlign:'left', transition:'border-color 0.15s', display:'flex', flexDirection:'column', gap:4 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor=`${color}40`}
                    onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
                    <div style={{ fontSize:'1.2rem', marginBottom:2 }}>{icon}</div>
                    <div style={{ fontSize:'0.78rem', fontWeight:600, color:'#EBEBEB' }}>{label}</div>
                    <div style={{ fontSize:'0.66rem', color:'#555', ...MONO }}>{desc}</div>
                    {cmdLoading === cmd && <Loader2 size={12} className="spinner" style={{ color, marginTop:4 }}/>}

                  </button>
                ))}
              </div>
            </div>

            <div style={{ background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:8, padding:'16px' }}>
              <div style={{ fontSize:'0.65rem', color:'#EF4444', textTransform:'uppercase', letterSpacing:'0.1em', ...MONO, marginBottom:14 }}>◇ Containment — Use with Caution</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button onClick={() => { if(window.confirm(`ISOLATE ${ep.hostname}?\n\nThis blocks ALL outbound traffic except AegisTrace. The machine will lose internet access until you unisolate it.`)) dispatch('isolate_device', {}, 'Network Isolation'); }}
                  style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444', borderRadius:7, padding:'10px 18px', cursor:'pointer', fontWeight:600, fontSize:'0.8rem', display:'flex', alignItems:'center', gap:8, ...MONO }}>
                  <Lock size={14}/> Isolate Device
                </button>
                <button onClick={() => { if(window.confirm(`Unisolate ${ep.hostname}? This restores full network access.`)) dispatch('unisolate_device', {}, 'Remove Isolation'); }}
                  style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', color:'#22C55E', borderRadius:7, padding:'10px 18px', cursor:'pointer', fontWeight:600, fontSize:'0.8rem', display:'flex', alignItems:'center', gap:8, ...MONO }}>
                  <Unlock size={14}/> Unisolate Device
                </button>
              </div>
              <div style={{ fontSize:'0.66rem', color:'#555', marginTop:10, ...MONO }}>
                Isolation uses iptables to block all traffic except to the AegisTrace backend. Agent remains reachable for further commands.
              </div>
            </div>

            <div style={{ background:'rgba(239,68,68,0.03)', border:'1px solid rgba(239,68,68,0.1)', borderRadius:8, padding:'16px' }}>
              <div style={{ fontSize:'0.65rem', color:'#EF4444', textTransform:'uppercase', letterSpacing:'0.1em', ...MONO, marginBottom:14 }}>◇ Agent Lifecycle</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button onClick={() => { if(window.confirm(`Stop the AegisTrace agent on ${ep.hostname}?\n\nMonitoring will pause until the agent is restarted manually.`)) dispatch('stop_agent', {reason:'Stopped from dashboard'}, 'Stop Agent'); }}
                  style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#EF4444', borderRadius:7, padding:'10px 18px', cursor:'pointer', fontWeight:600, fontSize:'0.8rem', display:'flex', alignItems:'center', gap:8, ...MONO }}>
                  ⏹ Stop Agent
                </button>
                <button onClick={() => { if(window.confirm(`UNINSTALL the AegisTrace agent from ${ep.hostname}?\n\nThis will:\n• Stop monitoring\n• Remove honey token files\n• Clear the log cursor\n\nYou will need to redeploy to resume monitoring.`)) dispatch('uninstall_agent', {reason:'Uninstalled from dashboard'}, 'Uninstall Agent'); }}
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', color:'#787878', borderRadius:7, padding:'10px 18px', cursor:'pointer', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:8, ...MONO }}>
                  🗑 Uninstall Agent
                </button>
              </div>
              <div style={{ fontSize:'0.66rem', color:'#555', marginTop:10, ...MONO }}>
                Stop pauses monitoring — agent can be restarted manually on the machine. Uninstall removes all agent files and stops monitoring permanently.
              </div>
            </div>

            <div style={{ background:'rgba(239,68,68,0.02)', border:'1px solid rgba(239,68,68,0.08)', borderRadius:8, padding:'16px' }}>
              <div style={{ fontSize:'0.65rem', color:'#EF4444', textTransform:'uppercase', letterSpacing:'0.1em', ...MONO, marginBottom:14 }}>◇ Delete Endpoint</div>
              <button
                onClick={() => {
                  if (window.confirm(
                    `DELETE ENDPOINT: ${ep.hostname}\n\n` +
                    `This will:\n` +
                    `• Send uninstall command to the agent (self-destructs)\n` +
                    `• Delete ALL endpoint data (logs, alerts, processes)\n` +
                    `• Remove the endpoint permanently from the dashboard\n\n` +
                    `This cannot be undone. Continue?`
                  )) onDelete(ep.id);
                }}
                style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444', borderRadius:7, padding:'10px 18px', cursor:'pointer', fontWeight:600, fontSize:'0.8rem', display:'flex', alignItems:'center', gap:8, ...MONO }}>
                🗑 Delete Endpoint & Destroy Agent
              </button>
              <div style={{ fontSize:'0.66rem', color:'#555', marginTop:10, ...MONO }}>
                Sends uninstall command to the agent, then permanently removes all data for this endpoint from the database. Cannot be undone.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SETUP GUIDE MODAL (kept for deploy button)
───────────────────────────────────────────────────────────────────────────── */
function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{ position:'relative', marginTop:8 }}>
      {label && <div style={{ fontSize:'0.65rem', color:'#787878', marginBottom:4, fontFamily:'JetBrains Mono', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>}
      <pre style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'12px 40px 12px 14px', margin:0, fontFamily:'JetBrains Mono', fontSize:'0.76rem', color:'#A8A8A8', overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{code}</pre>
      <button onClick={copy} style={{ position:'absolute', top:8, right:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:4, padding:'3px 6px', cursor:'pointer', color:copied?'#22C55E':'#787878', fontSize:'0.65rem', display:'flex', alignItems:'center', gap:4 }}>
        {copied ? <CheckCircle size={11}/> : <Copy size={11}/>} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function SetupGuideModal({ onClose, ingestKey, onFetchKey }) {
  const [os, setOs] = useState('linux');
  const [copied, setCopied] = useState(false);
  const AEGISTRACE_URL = 'https://aegistrace-7qvn.onrender.com';
  const token = ingestKey || null;

  // The single install command — fetches everything from backend, no manual steps
  const installUrl = token
    ? `${AEGISTRACE_URL}/api/install/${token}`
    : null;

  const commands = {
    linux:   installUrl ? `python3 -c "import urllib.request; exec(urllib.request.urlopen('${installUrl}').read())"` : null,
    mac:     installUrl ? `python3 -c "import urllib.request; exec(urllib.request.urlopen('${installUrl}').read())"` : null,
    windows: installUrl ? `python -c "import urllib.request; exec(urllib.request.urlopen('${installUrl}').read())"` : null,
  };

  const cmd = commands[os];

  const copy = () => {
    if (!cmd) return;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)', padding:20 }}
      onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, width:'100%', maxWidth:660, boxShadow:'0 30px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ padding:'20px 22px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:9, background:'rgba(90,138,159,0.12)', border:'1px solid rgba(90,138,159,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Terminal size={17} style={{ color:'#5A8A9F' }}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.95rem' }}>Deploy Endpoint Agent</div>
            <div style={{ fontSize:'0.7rem', color:'#555', marginTop:2, fontFamily:'JetBrains Mono' }}>One command · no files · no config · works on any machine</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#555', padding:4 }}><X size={16}/></button>
        </div>

        <div style={{ padding:'22px' }}>

          {/* Step 1 — get token */}
          {!ingestKey && (
            <div style={{ marginBottom:20, padding:'14px 16px', background:'rgba(234,179,8,0.05)', border:'1px solid rgba(234,179,8,0.18)', borderRadius:9 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.82rem', color:'#EAB308', marginBottom:3 }}>Step 1 — Load your deploy token</div>
                  <div style={{ fontSize:'0.7rem', color:'#787878', fontFamily:'JetBrains Mono' }}>Your token will be embedded in the command automatically</div>
                </div>
                <button onClick={onFetchKey}
                  style={{ background:'#5A8A9F', border:'none', borderRadius:7, padding:'8px 16px', cursor:'pointer', color:'#fff', fontSize:'0.76rem', fontWeight:600, flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                  <Shield size={12}/> Load Token
                </button>
              </div>
            </div>
          )}

          {/* OS selector */}
          <div style={{ display:'flex', gap:6, marginBottom:16 }}>
            {[['linux','🐧 Linux / Ubuntu'],['mac','🍎 macOS'],['windows','🪟 Windows']].map(([id,label]) => (
              <button key={id} onClick={() => setOs(id)}
                style={{ padding:'7px 14px', borderRadius:7, border:'1px solid', fontSize:'0.74rem', cursor:'pointer', fontFamily:'JetBrains Mono',
                  background: os===id ? 'rgba(90,138,159,0.1)' : 'transparent',
                  color: os===id ? '#5A8A9F' : '#555',
                  borderColor: os===id ? 'rgba(90,138,159,0.3)' : 'rgba(255,255,255,0.06)' }}>{label}</button>
            ))}
          </div>

          {/* The command */}
          {!cmd ? (
            <div style={{ padding:'20px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:9, textAlign:'center', color:'#555', fontSize:'0.8rem', fontFamily:'JetBrains Mono' }}>
              Load your token above to generate the install command
            </div>
          ) : (
            <div style={{ position:'relative' }}>
              <div style={{ padding:'16px 100px 16px 16px', background:'#030303', border:'1px solid rgba(90,138,159,0.2)', borderRadius:9, fontFamily:'JetBrains Mono', fontSize:'0.72rem', color:'#8FAFC0', wordBreak:'break-all', lineHeight:1.7 }}>
                {cmd}
              </div>
              <button onClick={copy}
                style={{ position:'absolute', top:'50%', right:10, transform:'translateY(-50%)', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(90,138,159,0.15)', border:`1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(90,138,159,0.35)'}`, borderRadius:7, padding:'8px 14px', cursor:'pointer', color: copied ? '#22C55E' : '#5A8A9F', fontSize:'0.72rem', fontWeight:700, fontFamily:'JetBrains Mono', display:'flex', alignItems:'center', gap:5, transition:'all 0.15s', whiteSpace:'nowrap' }}>
                {copied ? <><CheckCircle size={12}/>Copied!</> : <><Copy size={12}/>Copy</>}
              </button>
            </div>
          )}

          {/* What it does */}
          {cmd && (
            <div style={{ marginTop:14, display:'flex', gap:10, flexWrap:'wrap' }}>
              {['① Installs psutil', '② Downloads agent', '③ Token pre-embedded', '④ Starts in background', '⑤ Appears in dashboard < 60s'].map(s => (
                <span key={s} style={{ fontSize:'0.65rem', color:'#555', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:5, padding:'3px 8px', fontFamily:'JetBrains Mono' }}>{s}</span>
              ))}
            </div>
          )}

          {/* Requirement note */}
          <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:7, fontSize:'0.68rem', color:'#555', fontFamily:'JetBrains Mono', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'#5A8A9F' }}>ℹ</span>
            Requires Python 3.8+ · Works on Linux, macOS, Windows · No curl or wget needed
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function Endpoints() {
  const { addToast } = useStore();
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [ingestKey, setIngestKey] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const loadEndpoints = () => {
    setLoading(true);
    api.get('/api/ingest/endpoints').then(r => { setEndpoints(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => {
    loadEndpoints();
    // Auto-refresh endpoint list every 30s so online/offline status stays current
    const interval = setInterval(loadEndpoints, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchKey = () => {
    api.get('/api/ingest/key')
      .then(r => { setIngestKey(r.data.ingest_key); addToast('Agent token loaded successfully', 'success'); })
      .catch(() => addToast('Unable to retrieve agent token — check your session', 'error'));
  };

  const deleteEndpoint = (epId) => {
    api.delete(`/api/ingest/endpoints/${epId}`)
      .then(() => {
        addToast('Uninstall command sent — agent will self-destruct. All data wiped in 30s.', 'success');
        setSelected(null);
        loadEndpoints();
      })
      .catch(e => addToast(e.response?.data?.detail || 'Delete failed', 'error'));
  };

  const isOnline = (ep) => (Date.now() - new Date(ep.last_seen).getTime()) / 1000 < 120;
  const online  = endpoints.filter(isOnline).length;
  const offline = endpoints.length - online;

  return (
    <div style={{ padding:'24px 28px', height:'calc(100vh - 56px)', display:'flex', flexDirection:'column' }}>
      {showGuide && <SetupGuideModal onClose={() => setShowGuide(false)} ingestKey={ingestKey} onFetchKey={fetchKey}/>}

      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:'1.3rem', fontWeight:700, margin:0 }}>Endpoints</h1>
          <div style={{ fontSize:'0.72rem', color:'#555', marginTop:3, fontFamily:'JetBrains Mono' }}>
            <span style={{ color:'#22C55E' }}>●</span> {online} online &nbsp;
            <span style={{ color:'#555' }}>●</span> {offline} offline &nbsp;·&nbsp; {endpoints.length} total
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { fetchKey(); setShowGuide(true); }} style={{ background:'rgba(90,138,159,0.1)', border:'1px solid rgba(90,138,159,0.25)', color:'#5A8A9F', borderRadius:7, padding:'7px 14px', cursor:'pointer', fontSize:'0.76rem', display:'flex', alignItems:'center', gap:6, fontFamily:'JetBrains Mono' }}>
            <Download size={13}/> Deploy Agent
          </button>
          <button onClick={loadEndpoints} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#787878', borderRadius:7, padding:'7px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:'0.76rem' }}>
            <RefreshCw size={13}/>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#555' }}><Loader2 size={20} className="spinner"/></div>
      ) : endpoints.length === 0 ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, color:'#555' }}>
          <Monitor size={40} style={{ opacity:0.2 }}/>
          <div style={{ fontWeight:600, color:'#EBEBEB' }}>No endpoints connected</div>
          <div style={{ fontSize:'0.82rem' }}>Deploy the agent on any machine to start monitoring.</div>
          <button onClick={() => { fetchKey(); setShowGuide(true); }} style={{ background:'#5A8A9F', color:'#fff', border:'none', borderRadius:7, padding:'9px 20px', cursor:'pointer', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:7 }}>
            <Download size={14}/> Deploy Agent
          </button>
        </div>
      ) : (
        <div style={{ flex:1, display:'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap:16, overflow:'hidden' }}>

          {/* Endpoint list */}
          <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            {endpoints.map(ep => {
              const online_ = isOnline(ep);
              const risk = ep.local_risk_score ?? 0;
              const riskColor = risk >= 80 ? '#EF4444' : risk >= 60 ? '#F97316' : risk >= 40 ? '#EAB308' : '#22C55E';
              return (
                <div key={ep.id}
                  onClick={() => setSelected(selected?.id === ep.id ? null : ep)}
                  style={{ background: selected?.id===ep.id ? 'rgba(90,138,159,0.06)' : 'rgba(255,255,255,0.02)', border:`1px solid ${selected?.id===ep.id ? 'rgba(90,138,159,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius:9, padding:'14px 16px', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => { if(selected?.id!==ep.id) e.currentTarget.style.borderColor='rgba(90,138,159,0.2)'; }}
                  onMouseLeave={e => { if(selected?.id!==ep.id) e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:20 }}>{OS_ICON[ep.os_type]||'💻'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:'0.86rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ep.hostname}</div>
                      <div style={{ fontSize:'0.66rem', color:'#555', fontFamily:'JetBrains Mono', marginTop:1 }}>{ep.ip_address || '—'}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'1.1rem', fontWeight:800, color:riskColor, fontFamily:'JetBrains Mono', lineHeight:1 }}>{risk}</div>
                      <div style={{ fontSize:'0.55rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.06em' }}>risk</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.65rem', color:'#555', fontFamily:'JetBrains Mono' }}>
                    <span style={{ color: online_ ? '#22C55E' : '#555' }}>● {online_ ? 'Online' : 'Offline'}</span>
                    <span>agent {ep.agent_version}</span>
                    <ChevronRight size={12} style={{ color: selected?.id===ep.id ? '#5A8A9F' : '#444' }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise detail panel */}
          {selected && (
            <EndpointDetail
              key={selected.id}
              ep={selected}
              onClose={() => setSelected(null)}
              onDelete={deleteEndpoint}
              addToast={addToast}
            />
          )}
        </div>
      )}
    </div>
  );
}
