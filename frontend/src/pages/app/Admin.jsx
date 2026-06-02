import React, { useState, useEffect } from 'react';
import {
  Users, Webhook, ScrollText, Activity, Plus, Trash2,
  Edit, X, Shield, Key, CheckCircle, XCircle, Globe,
  AlertTriangle, RefreshCw, Loader2
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const TABS = [
  { id: 'users',    label: 'Users',       Icon: Users },
  { id: 'webhooks', label: 'Webhooks',    Icon: Webhook },
  { id: 'audit',    label: 'Audit Log',   Icon: ScrollText },
  { id: 'system',   label: 'System',      Icon: Activity },
];

const ROLE_COLOR = { admin: '#C0392B', analyst: '#A78BFA', viewer: '#71717A' };
const ACTION_COLOR = {
  login: '#22C55E', case_created: '#A78BFA', case_closed: '#22C55E',
  case_deleted: '#EF4444', user_created: '#A78BFA', user_deleted: '#EF4444',
  ai_generated: '#EAB308', alert_imported: '#C0392B', share_toggled: '#71717A',
  password_changed: '#EAB308', status_changed: '#F0F0F8',
};

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ user, addToast }) {
  const [users, setUsers]     = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEdit]   = useState(null);
  const [showPw, setShowPw]   = useState(false);
  const [form, setForm]       = useState({ email:'', name:'', role:'analyst', password:'' });
  const [pwForm, setPwForm]   = useState({ old_password:'', new_password:'' });
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/api/auth/users').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!form.email || !form.password || !form.name) { addToast('All fields required','error'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/users', form);
      load(); setShowAdd(false);
      setForm({ email:'', name:'', role:'analyst', password:'' });
      addToast('User created','success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed','error'); }
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await api.patch(`/api/auth/users/${editUser.id}`, {
        name: editUser.name, role: editUser.role,
        is_active: editUser.is_active,
        ...(editUser.newPw ? { password: editUser.newPw } : {}),
      });
      load(); setEdit(null);
      addToast('User updated','success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed','error'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await api.delete(`/api/auth/users/${id}`); load(); addToast('Deleted','success'); }
    catch (e) { addToast(e.response?.data?.detail || 'Failed','error'); }
  };

  const changePw = async () => {
    if (!pwForm.old_password || !pwForm.new_password) { addToast('Both passwords required','error'); return; }
    try {
      await api.post('/api/auth/change-password', pwForm);
      setPwForm({ old_password:'', new_password:'' }); setShowPw(false);
      addToast('Password changed','success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed','error'); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* My account */}
      <div className="at-card" style={{ padding:16 }}>
        <div className="section-label">Your Account</div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(192,57,43,0.15)', border:'1px solid rgba(192,57,43,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, color:'#C0392B' }}>{user?.name?.[0]}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{user?.name}</div>
            <div style={{ fontSize:'0.72rem', color:'#71717A' }}>{user?.email}</div>
            <span style={{ fontSize:'0.65rem', fontWeight:600, color:ROLE_COLOR[user?.role], fontFamily:'JetBrains Mono', padding:'1px 6px', background:`${ROLE_COLOR[user?.role]}18`, borderRadius:3 }}>{user?.role?.toUpperCase()}</span>
          </div>
        </div>
        {!showPw ? (
          <button className="btn-ghost" onClick={() => setShowPw(true)} style={{ fontSize:'0.78rem' }}><Key size={13}/> Change Password</button>
        ) : (
          <div style={{ maxWidth:340, display:'flex', flexDirection:'column', gap:8 }}>
            {[['Current Password','old_password'],['New Password','new_password']].map(([lbl,key]) => (
              <div key={key}>
                <label className="at-label">{lbl}</label>
                <input type="password" className="at-input" value={pwForm[key]}
                  onChange={e => setPwForm(p => ({ ...p, [key]:e.target.value }))} style={{ fontSize:'0.8rem' }} />
              </div>
            ))}
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-accent" onClick={changePw} style={{ fontSize:'0.78rem' }}>Update</button>
              <button className="btn-ghost" onClick={() => setShowPw(false)} style={{ fontSize:'0.78rem' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* User list */}
      {user?.role === 'admin' && (
        <div className="at-card" style={{ padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div className="section-label" style={{ margin:0 }}>All Users ({users.length})</div>
            <button className="btn-accent" onClick={() => setShowAdd(true)} style={{ fontSize:'0.75rem', padding:'6px 12px' }}><Plus size={12}/> Add User</button>
          </div>

          {showAdd && (
            <div style={{ padding:14, marginBottom:14, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontSize:'0.82rem', fontWeight:600 }}>New User</div>
                <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', color:'#71717A', cursor:'pointer' }}><X size={14}/></button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                {[['Full Name','name','text'],['Email','email','email'],['Password','password','password']].map(([lbl,key,type]) => (
                  <div key={key} style={key === 'name' ? {} : {}}>
                    <label className="at-label">{lbl} *</label>
                    <input type={type} className="at-input" value={form[key]}
                      onChange={e => setForm(p => ({ ...p, [key]:e.target.value }))} style={{ fontSize:'0.8rem' }} />
                  </div>
                ))}
                <div>
                  <label className="at-label">Role</label>
                  <select className="at-select" value={form.role}
                    onChange={e => setForm(p => ({ ...p, role:e.target.value }))} style={{ width:'100%', fontSize:'0.8rem' }}>
                    <option value="analyst">Analyst</option>
                    <option value="viewer">Viewer (read-only)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button className="btn-accent" onClick={createUser} disabled={loading} style={{ fontSize:'0.78rem' }}>
                {loading ? <Loader2 size={12} className="spinner"/> : 'Create User'}
              </button>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {users.map(u => (
              <div key={u.id}>
                {editUser?.id === u.id ? (
                  <div style={{ padding:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                      <div><label className="at-label">Name</label><input className="at-input" value={editUser.name} onChange={e => setEdit(p => ({...p,name:e.target.value}))} style={{ fontSize:'0.8rem' }}/></div>
                      <div><label className="at-label">Role</label>
                        <select className="at-select" value={editUser.role} onChange={e => setEdit(p => ({...p,role:e.target.value}))} style={{ width:'100%', fontSize:'0.8rem' }}>
                          <option value="analyst">Analyst</option>
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div><label className="at-label">New Password (optional)</label><input type="password" className="at-input" value={editUser.newPw||''} onChange={e => setEdit(p => ({...p,newPw:e.target.value}))} style={{ fontSize:'0.8rem' }} placeholder="Leave blank to keep"/></div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <input type="checkbox" id="active" checked={editUser.is_active} onChange={e => setEdit(p => ({...p,is_active:e.target.checked}))}/>
                      <label htmlFor="active" style={{ fontSize:'0.78rem', color:'#F0F0F8' }}>Active</label>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn-accent" onClick={saveEdit} style={{ fontSize:'0.78rem' }}>Save</button>
                      <button className="btn-ghost" onClick={() => setEdit(null)} style={{ fontSize:'0.78rem' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#0F1018', borderRadius:6, border:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:`${ROLE_COLOR[u.role]}18`, border:`1px solid ${ROLE_COLOR[u.role]}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:600, color:ROLE_COLOR[u.role], flexShrink:0 }}>{u.name?.[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:500, fontSize:'0.84rem' }}>{u.name}</div>
                      <div style={{ fontSize:'0.72rem', color:'#71717A' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize:'0.65rem', fontWeight:600, color:ROLE_COLOR[u.role], fontFamily:'JetBrains Mono', padding:'1px 6px', background:`${ROLE_COLOR[u.role]}15`, borderRadius:3 }}>{u.role?.toUpperCase()}</span>
                    {!u.is_active && <span style={{ fontSize:'0.65rem', color:'#EF4444', fontFamily:'JetBrains Mono' }}>INACTIVE</span>}
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn-ghost" onClick={() => setEdit({...u})} style={{ padding:'4px 8px' }}><Edit size={12}/></button>
                      <button className="btn-ghost" onClick={() => deleteUser(u.id)} style={{ padding:'4px 8px', color:'#EF4444' }}><Trash2 size={12}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Webhooks Tab ──────────────────────────────────────────────────────────────
function WebhooksTab({ addToast }) {
  const [webhooks, setWebhooks] = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name:'', url:'', events:['all'], secret:'' });
  const [testing, setTesting]   = useState(null);

  const EVENTS = ['all','case_created','case_closed','case_status_changed','critical_case','malicious_ioc'];

  const load = () => api.get('/api/webhooks').then(r => setWebhooks(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.url) { addToast('Name and URL required','error'); return; }
    try {
      await api.post('/api/webhooks', form);
      load(); setShowAdd(false);
      setForm({ name:'', url:'', events:['all'], secret:'' });
      addToast('Webhook created','success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed','error'); }
  };

  const toggle = async (wh) => {
    try {
      await api.patch(`/api/webhooks/${wh.id}`, { is_active: !wh.is_active });
      load(); addToast(wh.is_active ? 'Disabled' : 'Enabled','success');
    } catch { addToast('Failed','error'); }
  };

  const test = async (id) => {
    setTesting(id);
    try {
      const res = await api.post(`/api/webhooks/${id}/test`);
      addToast(`Test sent — HTTP ${res.data.status_code}`, res.data.ok ? 'success' : 'error');
    } catch { addToast('Test failed','error'); }
    setTesting(null);
    load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete webhook?')) return;
    try { await api.delete(`/api/webhooks/${id}`); load(); addToast('Deleted','success'); }
    catch { addToast('Failed','error'); }
  };

  const toggleEvent = (ev) => {
    setForm(p => {
      const evs = p.events.includes(ev) ? p.events.filter(e => e !== ev) : [...p.events, ev];
      return { ...p, events: evs };
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="at-card" style={{ padding:16, borderColor:'rgba(192,57,43,0.15)' }}>
        <div style={{ fontSize:'0.78rem', color:'#71717A', lineHeight:1.65, marginBottom:8 }}>
          Webhooks fire HTTP POST requests to your URL when SOC events occur. Supports Slack, Microsoft Teams, and any generic JSON endpoint. HMAC-SHA256 signed if secret is configured.
        </div>
        <button className="btn-accent" onClick={() => setShowAdd(true)} style={{ fontSize:'0.78rem' }}><Plus size={12}/> Add Webhook</button>
      </div>

      {showAdd && (
        <div className="at-card" style={{ padding:16, borderColor:'rgba(192,57,43,0.2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div className="section-label" style={{ margin:0 }}>New Webhook</div>
            <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', color:'#71717A', cursor:'pointer' }}><X size={14}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div><label className="at-label">Name *</label><input className="at-input" value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))} placeholder="Slack Alerts" style={{ fontSize:'0.8rem' }}/></div>
            <div><label className="at-label">Webhook URL *</label><input className="at-input" value={form.url} onChange={e => setForm(p => ({...p,url:e.target.value}))} placeholder="https://hooks.slack.com/..." style={{ fontSize:'0.8rem', fontFamily:'JetBrains Mono' }}/></div>
            <div style={{ gridColumn:'1/-1' }}><label className="at-label">Signing Secret (optional)</label><input className="at-input" value={form.secret} onChange={e => setForm(p => ({...p,secret:e.target.value}))} placeholder="Leave blank for unsigned" style={{ fontSize:'0.8rem', fontFamily:'JetBrains Mono' }}/></div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label className="at-label">Events to trigger</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {EVENTS.map(ev => (
                <button key={ev} onClick={() => toggleEvent(ev)} style={{ fontSize:'0.7rem', padding:'4px 10px', borderRadius:4, fontFamily:'JetBrains Mono', border:`1px solid ${form.events.includes(ev) ? 'rgba(192,57,43,0.5)' : 'rgba(255,255,255,0.1)'}`, background: form.events.includes(ev) ? 'rgba(192,57,43,0.12)' : 'transparent', color: form.events.includes(ev) ? '#C0392B' : '#71717A', cursor:'pointer' }}>
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-accent" onClick={create} style={{ fontSize:'0.78rem' }}>Create Webhook</button>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="at-card" style={{ padding:40, textAlign:'center', color:'#71717A', fontSize:'0.82rem' }}>No webhooks configured yet. Add one to receive real-time SOC alerts.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {webhooks.map(wh => {
            const events = (() => { try { return JSON.parse(wh.events||'[]'); } catch { return []; } })();
            return (
              <div key={wh.id} className="at-card" style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: wh.is_active ? '#22C55E' : '#71717A', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:'0.84rem' }}>{wh.name}</div>
                    <div style={{ fontSize:'0.7rem', color:'#71717A', fontFamily:'JetBrains Mono', marginTop:2 }}>{wh.url.slice(0,60)}{wh.url.length>60?'…':''}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn-ghost" onClick={() => test(wh.id)} disabled={testing===wh.id} style={{ fontSize:'0.72rem', padding:'5px 10px' }}>
                      {testing===wh.id ? <Loader2 size={11} className="spinner"/> : 'Test'}
                    </button>
                    <button className="btn-ghost" onClick={() => toggle(wh)} style={{ fontSize:'0.72rem', padding:'5px 10px' }}>
                      {wh.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn-ghost" onClick={() => del(wh.id)} style={{ padding:'5px 8px', color:'#EF4444' }}><Trash2 size={11}/></button>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                  {events.map(ev => (
                    <span key={ev} style={{ fontSize:'0.65rem', background:'rgba(192,57,43,0.08)', border:'1px solid rgba(192,57,43,0.2)', color:'#C0392B', padding:'2px 7px', borderRadius:3, fontFamily:'JetBrains Mono' }}>{ev}</span>
                  ))}
                  {wh.last_fired_at && (
                    <span style={{ fontSize:'0.68rem', color:'#71717A', marginLeft:'auto', fontFamily:'JetBrains Mono' }}>
                      Last fired: {new Date(wh.last_fired_at).toLocaleString()} · HTTP {wh.last_status_code||'—'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── Audit Log Tab ─────────────────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(7);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/hunt/activity?days=${days}`)
      .then(r => { setLogs(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16 }}>
        <div className="section-label" style={{ margin:0 }}>Audit Log</div>
        <select className="at-select" value={days} onChange={e => setDays(Number(e.target.value))} style={{ fontSize:'0.78rem' }}>
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#71717A' }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#71717A', fontSize:'0.82rem' }}>No activity in this period.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {logs.map(l => (
            <div key={l.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'8px 12px', background:'#0F1018', borderRadius:6, borderLeft:`2px solid ${ACTION_COLOR[l.action]||'#71717A'}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.78rem', fontWeight:500, color:'#F0F0F8', display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ color:ACTION_COLOR[l.action]||'#71717A', fontFamily:'JetBrains Mono', fontSize:'0.7rem' }}>{l.action}</span>
                  <span style={{ color:'#71717A' }}>·</span>
                  <span>{l.entity_type} {l.entity_id}</span>
                  {l.new_value && l.entity_type !== 'user_pw' && <span style={{ color:'#71717A', fontSize:'0.7rem' }}>{l.new_value.slice(0,60)}</span>}
                </div>
                {l.user_email && <div style={{ fontSize:'0.68rem', color:'#71717A', marginTop:2 }}>by {l.user_email}</div>}
              </div>
              <div style={{ fontSize:'0.68rem', color:'#71717A', fontFamily:'JetBrains Mono', flexShrink:0 }}>
                {new Date(l.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── System Tab ────────────────────────────────────────────────────────────────
function SystemTab({ addToast }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const check = () => {
    setLoading(true);
    api.get('/api/health').then(r => { setHealth(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { check(); }, []);

  const checks = health ? [
    { label: 'API Server',        ok: true,           detail: `v${health.version}` },
    { label: 'Groq AI',           ok: health.groq,    detail: health.groq ? 'Connected' : 'API key missing' },
    { label: 'VirusTotal',        ok: health.vt,      detail: health.vt ? 'Connected' : 'API key missing' },
    { label: 'Database',          ok: true,           detail: 'SQLite operational' },
  ] : [];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="at-card" style={{ padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div className="section-label" style={{ margin:0 }}>System Health</div>
          <button className="btn-ghost" onClick={check} style={{ fontSize:'0.75rem', padding:'5px 10px' }}>
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
        {loading ? <div style={{ color:'#71717A', fontSize:'0.8rem' }}>Checking…</div> : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {checks.map(c => (
              <div key={c.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#0F1018', borderRadius:6 }}>
                {c.ok ? <CheckCircle size={16} style={{ color:'#22C55E', flexShrink:0 }}/> : <XCircle size={16} style={{ color:'#EF4444', flexShrink:0 }}/>}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.84rem', fontWeight:500 }}>{c.label}</div>
                  <div style={{ fontSize:'0.72rem', color: c.ok ? '#22C55E' : '#EF4444' }}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="at-card" style={{ padding:16 }}>
        <div className="section-label">Configuration</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:'0.8rem' }}>
          {[
            ['Render URL', 'https://aegistrace-7qvn.onrender.com'],
            ['Admin Email', 'prasanna80564@gmail.com'],
            ['Default PIN', 'aegis2025 (change via ADMIN_PIN env var)'],
            ['JWT Expiry', '7 days'],
            ['Database', 'SQLite · /var/data/aegistrace.db'],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', gap:12, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color:'#71717A', minWidth:110 }}>{k}</span>
              <span style={{ fontFamily:'JetBrains Mono', color:'#F0F0F8', fontSize:'0.75rem' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="at-card" style={{ padding:16, borderColor:'rgba(239,68,68,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <AlertTriangle size={14} style={{ color:'#EF4444' }}/>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#EF4444' }}>Danger Zone</div>
        </div>
        <div style={{ fontSize:'0.78rem', color:'#71717A', marginBottom:10 }}>
          These actions affect live data on the server.
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn-danger" style={{ fontSize:'0.75rem' }}
            onClick={() => { if (window.confirm('Clear ALL VT lookup history? Cannot be undone.')) addToast('Feature coming in next release','info'); }}>
            Clear VT History
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function Admin() {
  const { addToast, user } = useStore();
  const [tab, setTab] = useState('users');

  return (
    <div style={{ padding:'24px 28px' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:'1.3rem', fontWeight:600 }}>Admin Settings</h1>
        <div style={{ fontSize:'0.72rem', color:'#71717A', marginTop:2 }}>Full system control · User management · Webhooks · Audit log</div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', border:'1px solid', fontFamily:'Inter', transition:'all 0.15s',
              background: tab === id ? 'rgba(192,57,43,0.12)' : 'rgba(255,255,255,0.03)',
              borderColor: tab === id ? 'rgba(192,57,43,0.4)' : 'rgba(255,255,255,0.08)',
              color: tab === id ? '#F0F0F8' : '#71717A',
            }}>
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {tab === 'users'    && <UsersTab user={user} addToast={addToast}/>}
      {tab === 'webhooks' && <WebhooksTab addToast={addToast}/>}
      {tab === 'audit'    && <AuditTab/>}
      {tab === 'system'   && <SystemTab addToast={addToast}/>}
    </div>
  );
}
