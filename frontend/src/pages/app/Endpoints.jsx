import React, { useEffect, useState } from 'react';
import { Monitor, RefreshCw, Loader2, AlertTriangle, CheckCircle, Clock, Shield, FileText, ChevronRight, Copy } from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

const OS_ICON = { windows: '🪟', linux: '🐧', mac: '🍎', unknown: '💻' };
const SCORE_COLOR = (s) => s >= 80 ? '#EF4444' : s >= 60 ? '#C0392B' : s >= 40 ? '#EAB308' : s >= 20 ? '#A78BFA' : '#22C55E';
const VERDICT_COLOR = { Malicious:'#EF4444', Suspicious:'#EAB308', Clean:'#22C55E', Unknown:'#71717A' };

function ScoreBar({ score }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${score}%`, background:SCORE_COLOR(score), borderRadius:2, transition:'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize:'0.72rem', fontWeight:700, color:SCORE_COLOR(score), fontFamily:'JetBrains Mono', minWidth:28 }}>{score}</span>
    </div>
  );
}

function BatchRow({ batch, epId, navigate }) {
  return (
    <div className="at-card" style={{ padding:'10px 14px', cursor:'pointer', transition:'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(192,57,43,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}
      onClick={() => navigate(`/app/endpoints/${epId}/batch/${batch.id}`)}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{batch.log_file}</div>
          <div style={{ fontSize:'0.68rem', color:'#71717A', marginTop:2, fontFamily:'JetBrains Mono' }}>{batch.log_type} · {batch.line_count} lines</div>
        </div>
        <div style={{ flexShrink:0, textAlign:'right' }}>
          <div style={{ fontSize:'0.72rem', fontWeight:700, color:VERDICT_COLOR[batch.ai_verdict]||'#71717A' }}>{batch.ai_verdict}</div>
          <div style={{ fontSize:'0.65rem', color:'#71717A', marginTop:2 }}>{new Date(batch.created_at).toLocaleTimeString()}</div>
        </div>
        <ScoreBar score={batch.threat_score} />
        {batch.case_id && <span style={{ fontSize:'0.65rem', background:'rgba(192,57,43,0.1)', border:'1px solid rgba(192,57,43,0.25)', color:'#C0392B', padding:'1px 6px', borderRadius:3, fontFamily:'JetBrains Mono', flexShrink:0 }}>CASE</span>}
      </div>
      {batch.ai_summary && <div style={{ fontSize:'0.72rem', color:'#71717A', marginTop:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{batch.ai_summary}</div>}
    </div>
  );
}

export default function Endpoints() {
  const navigate = useNavigate();
  const { addToast } = useStore();
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [ingestKey, setIngestKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const loadEndpoints = () => {
    setLoading(true);
    api.get('/api/ingest/endpoints').then(r => { setEndpoints(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadEndpoints(); }, []);

  const loadBatches = (ep) => {
    setSelected(ep);
    setLoadingBatches(true);
    api.get(`/api/ingest/endpoints/${ep.id}/batches`).then(r => { setBatches(r.data); setLoadingBatches(false); }).catch(() => setLoadingBatches(false));
  };

  const fetchKey = () => {
    api.get('/api/ingest/key').then(r => { setIngestKey(r.data.ingest_key); setShowKey(true); }).catch(() => addToast('Could not fetch key','error'));
  };

  const isOnline = (ep) => {
    const diff = (Date.now() - new Date(ep.last_seen).getTime()) / 1000;
    return diff < 600; // online if seen in last 10 min
  };

  const online  = endpoints.filter(isOnline).length;
  const offline = endpoints.length - online;

  return (
    <div style={{ padding:'24px 28px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:'1.3rem', fontWeight:600 }}>Endpoints</h1>
          <div style={{ fontSize:'0.72rem', color:'#71717A', marginTop:2 }}>
            {online} online · {offline} offline · {endpoints.length} total
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-ghost" onClick={fetchKey} style={{ fontSize:'0.78rem' }}><Shield size={13}/> Get Ingest Key</button>
          <button className="btn-ghost" onClick={loadEndpoints} style={{ fontSize:'0.78rem' }}><RefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Ingest key panel */}
      {showKey && ingestKey && (
        <div className="at-card" style={{ padding:14, marginBottom:16, borderColor:'rgba(192,57,43,0.2)' }}>
          <div className="section-label">Ingest API Key — paste into agent config</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ flex:1, fontFamily:'JetBrains Mono', fontSize:'0.78rem', color:'#A78BFA', background:'rgba(255,255,255,0.04)', padding:'8px 12px', borderRadius:6, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ingestKey}</code>
            <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(ingestKey); addToast('Key copied!','success'); }} style={{ padding:'6px 10px', flexShrink:0 }}><Copy size={13}/></button>
          </div>
          <div style={{ fontSize:'0.68rem', color:'#71717A', marginTop:8, fontFamily:'JetBrains Mono' }}>
            Set as INGEST_KEY in aegistrace_agent.py · Agent ships to POST /api/ingest/logs
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#71717A' }}><Loader2 size={20} className="spinner" style={{ margin:'0 auto 8px' }}/><div>Loading endpoints…</div></div>
      ) : endpoints.length === 0 ? (
        <div className="at-card" style={{ padding:40, textAlign:'center' }}>
          <Monitor size={32} style={{ color:'rgba(192,57,43,0.3)', margin:'0 auto 12px' }}/>
          <div style={{ fontWeight:600, marginBottom:8 }}>No endpoints connected yet</div>
          <div style={{ fontSize:'0.82rem', color:'#71717A', marginBottom:16 }}>Install the agent on any machine to start collecting logs.</div>
          <a href="/agent/README.md" className="btn-ghost" style={{ textDecoration:'none', fontSize:'0.8rem' }}><FileText size={13}/> Setup Guide</a>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap:16 }}>
          {/* Endpoint list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {endpoints.map(ep => (
              <div key={ep.id} className="at-card" style={{ padding:'14px 16px', cursor:'pointer', transition:'border-color 0.15s', borderColor: selected?.id === ep.id ? 'rgba(192,57,43,0.4)' : 'rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { if(selected?.id!==ep.id) e.currentTarget.style.borderColor='rgba(192,57,43,0.2)'; }}
                onMouseLeave={e => { if(selected?.id!==ep.id) e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}
                onClick={() => loadBatches(ep)}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:18 }}>{OS_ICON[ep.os_type]||OS_ICON.unknown}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'0.86rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ep.hostname}</div>
                    <div style={{ fontSize:'0.68rem', color:'#71717A', fontFamily:'JetBrains Mono', marginTop:1 }}>{ep.ip_address || 'IP unknown'}</div>
                  </div>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:isOnline(ep)?'#22C55E':'#71717A', flexShrink:0 }} title={isOnline(ep)?'Online':'Offline'}/>
                </div>
                <div style={{ marginBottom:6 }}>
                  <ScoreBar score={Math.round(ep.threat_score_avg)} />
                </div>
                <div style={{ display:'flex', gap:8, fontSize:'0.68rem', color:'#71717A', flexWrap:'wrap' }}>
                  <span>{ep.total_batches} batch{ep.total_batches!==1?'es':''}</span>
                  {ep.last_verdict && <span style={{ color:VERDICT_COLOR[ep.last_verdict]||'#71717A' }}>{ep.last_verdict}</span>}
                  <span style={{ marginLeft:'auto' }}>{new Date(ep.last_seen).toLocaleString()}</span>
                </div>
                {ep.tags?.length > 0 && (
                  <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                    {ep.tags.map(t => <span key={t} style={{ fontSize:'0.62rem', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', color:'#A78BFA', padding:'1px 6px', borderRadius:3, fontFamily:'JetBrains Mono' }}>{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Batch detail */}
          {selected && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.92rem' }}>{selected.hostname} — Log Batches</div>
                  <div style={{ fontSize:'0.68rem', color:'#71717A', fontFamily:'JetBrains Mono' }}>Avg threat score: {Math.round(selected.threat_score_avg)}/100</div>
                </div>
                <button className="btn-ghost" onClick={() => setSelected(null)} style={{ fontSize:'0.75rem' }}>Close</button>
              </div>
              {loadingBatches ? (
                <div style={{ textAlign:'center', padding:40, color:'#71717A' }}><Loader2 size={16} className="spinner" style={{ margin:'0 auto 8px' }}/></div>
              ) : batches.length === 0 ? (
                <div className="at-card" style={{ padding:30, textAlign:'center', color:'#71717A' }}>No batches received yet.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {batches.map(b => <BatchRow key={b.id} batch={b} epId={selected.id} navigate={navigate}/>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
