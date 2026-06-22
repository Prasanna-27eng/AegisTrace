import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Webhook, ScrollText, Activity, Plus, Trash2,
  Edit, X, Shield, Key, CheckCircle, XCircle, Globe,
  AlertTriangle, RefreshCw, Loader2, Mail, Plug, Copy,
  ExternalLink, Terminal, ChevronDown, ChevronRight, Lock, Smartphone
} from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

const TABS = [
  { id: 'users',        label: 'Users',            Icon: Users },
  { id: 'integrations', label: 'Integrations',     Icon: Plug },
  { id: 'webhooks',     label: 'Webhooks',         Icon: Webhook },
  { id: 'schedules',    label: 'Report Schedules', Icon: Mail },
  { id: 'audit',        label: 'Audit Log',        Icon: ScrollText },
  { id: 'system',       label: 'System',           Icon: Activity },
];

const ROLE_COLOR = { admin: '#4A7EC8', analyst: '#8BB8E8', viewer: '#787878' };
const ACTION_COLOR = {
  login: '#22C55E', case_created: '#8BB8E8', case_closed: '#22C55E',
  case_deleted: '#EF4444', user_created: '#8BB8E8', user_deleted: '#EF4444',
  ai_generated: '#EAB308', alert_imported: '#4A7EC8', share_toggled: '#888888',
  password_changed: '#EAB308', status_changed: '#FFFFFF',
};

// ── Users Tab ─────────────────────────────────────────────────────────────────
/* ── MFA Panel (self-contained) ─────────────────────────────────────────── */
function MFAPanel({ addToast }) {
  const MONO = { fontFamily: 'JetBrains Mono, monospace' };
  const [mfaEnabled, setEnabled]  = useState(false);
  const [step, setStep]           = useState('idle'); // idle | setup | verify | disable
  const [secret, setSecret]       = useState('');
  const [otpUri, setOtpUri]       = useState('');
  const [code, setCode]           = useState('');
  const [loading, setLoad]        = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const r = await api.get('/api/auth/mfa/status');
      setEnabled(r.data.mfa_enabled);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const startSetup = async () => {
    setLoad(true);
    try {
      const r = await api.post('/api/auth/mfa/setup');
      setSecret(r.data.secret);
      setOtpUri(r.data.otpauth_uri);
      setStep('setup');
    } catch (e) { addToast(e.response?.data?.detail || 'Setup failed', 'error'); }
    setLoad(false);
  };

  const verify = async () => {
    const clean = code.replace(/\s/g, '');
    if (clean.length !== 6) { addToast('Enter the 6-digit code', 'error'); return; }
    setLoad(true);
    try {
      await api.post('/api/auth/mfa/verify', { code: clean });
      setEnabled(true); setStep('idle'); setCode(''); setSecret(''); setOtpUri('');
      addToast('2FA enabled — your account is now protected', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Invalid code', 'error'); }
    setLoad(false);
  };

  const disable = async () => {
    const clean = code.replace(/\s/g, '');
    if (clean.length !== 6) { addToast('Enter the 6-digit code to confirm', 'error'); return; }
    setLoad(true);
    try {
      await api.post('/api/auth/mfa/disable', { code: clean });
      setEnabled(false); setStep('idle'); setCode('');
      addToast('2FA disabled', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Invalid code', 'error'); }
    setLoad(false);
  };

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: step !== 'idle' ? 16 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Smartphone size={14} style={{ color: mfaEnabled ? '#22C55E' : '#787878' }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>Two-Factor Authentication</div>
            <div style={{ fontSize: '0.68rem', color: mfaEnabled ? '#22C55E' : '#787878', ...MONO }}>
              {mfaEnabled ? '● ENABLED — TOTP authenticator active' : '○ DISABLED — adds extra login security'}
            </div>
          </div>
        </div>
        {step === 'idle' && (
          mfaEnabled
            ? <button className="btn-ghost" onClick={() => setStep('disable')} style={{ fontSize: '0.75rem', color: '#EF4444' }}>Disable 2FA</button>
            : <button className="btn-ghost" onClick={startSetup} disabled={loading} style={{ fontSize: '0.75rem' }}>
                {loading ? <Loader2 size={12} className="spinner" /> : <Lock size={12} />} Enable 2FA
              </button>
        )}
      </div>

      {/* ── Setup: show secret ── */}
      {step === 'setup' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '0.76rem', color: '#7A9DB8', lineHeight: 1.6 }}>
            Open your authenticator app (Google Authenticator, Authy, or any TOTP app) and add a new account. Choose <strong style={{ color: '#BDD4E8' }}>Enter setup key</strong> and paste the secret below, or scan the QR code if your app supports otpauth:// links.
          </div>
          <div>
            <div style={{ fontSize: '0.64rem', color: '#787878', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Secret Key</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ flex: 1, background: '#0E0E16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 12px', fontSize: '0.88rem', letterSpacing: '0.15em', color: '#BDD4E8', ...MONO, wordBreak: 'break-all' }}>
                {secret}
              </code>
              <button className="btn-ghost" style={{ padding: '7px 10px', flexShrink: 0 }}
                onClick={() => { navigator.clipboard.writeText(secret); addToast('Secret copied', 'success'); }}>
                <Copy size={12} />
              </button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.64rem', color: '#787878', ...MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>OTPAuth URI (for QR scanners)</div>
            <div style={{ fontSize: '0.62rem', color: '#555', ...MONO, wordBreak: 'break-all', background: '#0E0E16', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '6px 10px' }}>
              {otpUri}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <div style={{ fontSize: '0.72rem', color: '#7A9DB8', marginBottom: 8 }}>Enter the 6-digit code your app shows to confirm setup:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="at-input" type="text" inputMode="numeric" maxLength={7}
                placeholder="000 000" value={code} onChange={e => setCode(e.target.value)}
                style={{ width: 130, textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.2em', ...MONO }} />
              <button className="btn-accent" onClick={verify} disabled={loading} style={{ fontSize: '0.78rem' }}>
                {loading ? <Loader2 size={12} className="spinner" /> : <CheckCircle size={12} />} Activate 2FA
              </button>
              <button className="btn-ghost" onClick={() => { setStep('idle'); setCode(''); setSecret(''); }} style={{ fontSize: '0.78rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Disable: confirm with code ── */}
      {step === 'disable' && (
        <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: '0.76rem', color: '#7A9DB8', marginBottom: 10 }}>
            Enter your current authenticator code to confirm disabling 2FA:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="at-input" type="text" inputMode="numeric" maxLength={7}
              placeholder="000 000" value={code} onChange={e => setCode(e.target.value)} autoFocus
              style={{ width: 130, textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.2em', ...MONO }} />
            <button className="btn-danger" onClick={disable} disabled={loading} style={{ fontSize: '0.78rem' }}>
              {loading ? <Loader2 size={12} className="spinner" /> : <XCircle size={12} />} Disable
            </button>
            <button className="btn-ghost" onClick={() => { setStep('idle'); setCode(''); }} style={{ fontSize: '0.78rem' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Users Tab ─────────────────────────────────────────────────────────── */
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
          <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(90,138,159,0.15)', border:'1px solid rgba(90,138,159,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, color:'#4A7EC8' }}>{user?.name?.[0]}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{user?.name}</div>
            <div style={{ fontSize:'0.72rem', color:'#787878' }}>{user?.email}</div>
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
        {/* 2FA Section */}
        <MFAPanel addToast={addToast} />
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
                <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', color:'#787878', cursor:'pointer' }}><X size={14}/></button>
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
                      <label htmlFor="active" style={{ fontSize:'0.78rem', color:'#BDD4E8' }}>Active</label>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn-accent" onClick={saveEdit} style={{ fontSize:'0.78rem' }}>Save</button>
                      <button className="btn-ghost" onClick={() => setEdit(null)} style={{ fontSize:'0.78rem' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#0E0E16', borderRadius:6, border:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:`${ROLE_COLOR[u.role]}18`, border:`1px solid ${ROLE_COLOR[u.role]}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:600, color:ROLE_COLOR[u.role], flexShrink:0 }}>{u.name?.[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:500, fontSize:'0.84rem' }}>{u.name}</div>
                      <div style={{ fontSize:'0.72rem', color:'#787878' }}>{u.email}</div>
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
      <div className="at-card" style={{ padding:16, borderColor:'rgba(90,138,159,0.15)' }}>
        <div style={{ fontSize:'0.78rem', color:'#787878', lineHeight:1.65, marginBottom:8 }}>
          Webhooks fire HTTP POST requests to your URL when SOC events occur. Supports Slack, Microsoft Teams, and any generic JSON endpoint. HMAC-SHA256 signed if secret is configured.
        </div>
        <button className="btn-accent" onClick={() => setShowAdd(true)} style={{ fontSize:'0.78rem' }}><Plus size={12}/> Add Webhook</button>
      </div>

      {showAdd && (
        <div className="at-card" style={{ padding:16, borderColor:'rgba(90,138,159,0.2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <div className="section-label" style={{ margin:0 }}>New Webhook</div>
            <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', color:'#787878', cursor:'pointer' }}><X size={14}/></button>
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
                <button key={ev} onClick={() => toggleEvent(ev)} style={{ fontSize:'0.7rem', padding:'4px 10px', borderRadius:4, fontFamily:'JetBrains Mono', border:`1px solid ${form.events.includes(ev) ? 'rgba(90,138,159,0.5)' : 'rgba(255,255,255,0.1)'}`, background: form.events.includes(ev) ? 'rgba(90,138,159,0.12)' : 'transparent', color: form.events.includes(ev) ? '#4A7EC8' : '#787878', cursor:'pointer' }}>
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-accent" onClick={create} style={{ fontSize:'0.78rem' }}>Create Webhook</button>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="at-card" style={{ padding:40, textAlign:'center', color:'#787878', fontSize:'0.82rem' }}>No webhooks configured yet. Add one to receive real-time SOC alerts.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {webhooks.map(wh => {
            const events = (() => { try { return JSON.parse(wh.events||'[]'); } catch { return []; } })();
            return (
              <div key={wh.id} className="at-card" style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: wh.is_active ? '#22C55E' : '#888888', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:'0.84rem' }}>{wh.name}</div>
                    <div style={{ fontSize:'0.7rem', color:'#787878', fontFamily:'JetBrains Mono', marginTop:2 }}>{wh.url.slice(0,60)}{wh.url.length>60?'…':''}</div>
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
                    <span key={ev} style={{ fontSize:'0.65rem', background:'rgba(90,138,159,0.08)', border:'1px solid rgba(90,138,159,0.2)', color:'#4A7EC8', padding:'2px 7px', borderRadius:3, fontFamily:'JetBrains Mono' }}>{ev}</span>
                  ))}
                  {wh.last_fired_at && (
                    <span style={{ fontSize:'0.68rem', color:'#787878', marginLeft:'auto', fontFamily:'JetBrains Mono' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px', background: '#0E0E16', borderRadius: 6 }}>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 11, width: `${40 + (i % 3) * 15}%`, marginBottom: 5 }} />
                <div className="skeleton" style={{ height: 9, width: '25%' }} />
              </div>
              <div className="skeleton" style={{ height: 9, width: 120 }} />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#787878', fontSize:'0.82rem' }}>No activity in this period.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {logs.map(l => (
            <div key={l.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'8px 12px', background:'#0E0E16', borderRadius:6, borderLeft:`2px solid ${ACTION_COLOR[l.action]||'#888888'}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'0.78rem', fontWeight:500, color:'#BDD4E8', display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ color:ACTION_COLOR[l.action]||'#787878', fontFamily:'JetBrains Mono', fontSize:'0.7rem' }}>{l.action}</span>
                  <span style={{ color:'#787878' }}>·</span>
                  <span>{l.entity_type} {l.entity_id}</span>
                  {l.new_value && l.entity_type !== 'user_pw' && <span style={{ color:'#787878', fontSize:'0.7rem' }}>{l.new_value.slice(0,60)}</span>}
                </div>
                {l.user_email && <div style={{ fontSize:'0.68rem', color:'#787878', marginTop:2 }}>by {l.user_email}</div>}
              </div>
              <div style={{ fontSize:'0.68rem', color:'#787878', fontFamily:'JetBrains Mono', flexShrink:0 }}>
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
        {loading ? <div style={{ color:'#787878', fontSize:'0.8rem' }}>Checking…</div> : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {checks.map(c => (
              <div key={c.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#0E0E16', borderRadius:6 }}>
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
              <span style={{ color:'#787878', minWidth:110 }}>{k}</span>
              <span style={{ fontFamily:'JetBrains Mono', color:'#BDD4E8', fontSize:'0.75rem' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ITDR Email Notifications */}
      <div className="at-card" style={{ padding:'20px 24px' }}>
        <div style={{ fontSize:'0.88rem', fontWeight:600, color:'#BDD4E8', marginBottom:4 }}>
          ITDR Email Notifications
        </div>
        <p style={{ fontSize:'0.78rem', color:'#787878', margin:'0 0 16px', lineHeight:1.6 }}>
          Sends email alerts to admin and analyst accounts when CRITICAL or HIGH severity ITDR events are detected.
          Requires <code style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.74rem', background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:3 }}>SENDGRID_API_KEY</code> or SMTP config on the server.
        </p>
        <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.72rem', padding:'8px 12px', background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.08)', borderRadius:4, color:'#787878', display:'inline-block' }}>
          Configure: Set SENDGRID_API_KEY environment variable on the VPS
        </div>
      </div>

      <div className="at-card" style={{ padding:16, borderColor:'rgba(239,68,68,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <AlertTriangle size={14} style={{ color:'#EF4444' }}/>
          <div style={{ fontSize:'0.8rem', fontWeight:600, color:'#EF4444' }}>Danger Zone</div>
        </div>
        <div style={{ fontSize:'0.78rem', color:'#787878', marginBottom:10 }}>
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


// ── Report Schedules Tab ──────────────────────────────────────────────────────
function SchedulesTab({ addToast }) {
  const [schedules, setSchedules] = useState([]);
  const [emailConfig, setEmailConfig] = useState(null);
  const [form, setForm] = useState({ name:'', recipient_emails:'', schedule_type:'weekly', schedule_day:0, schedule_hour:8, report_type:'digest' });
  const load = () => {
    api.get('/api/report-schedules').then(r => setSchedules(r.data)).catch(() => {});
    api.get('/api/report-schedules/email-config').then(r => setEmailConfig(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const emails = form.recipient_emails.split(',').map(e => e.trim()).filter(Boolean);
    if (!form.name || !emails.length) { addToast('Name and at least one email required','error'); return; }
    try {
      await api.post('/api/report-schedules', { ...form, recipient_emails: emails });
      addToast('Schedule created','success'); load();
      setForm({ name:'', recipient_emails:'', schedule_type:'weekly', schedule_day:0, schedule_hour:8, report_type:'digest' });
    } catch(e) { addToast(e.response?.data?.detail || 'Error','error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    await api.delete(`/api/report-schedules/${id}`);
    addToast('Deleted','success'); load();
  };

  const handleSendNow = async (id) => {
    try {
      await api.post(`/api/report-schedules/${id}/send-now`);
      addToast('Report queued for delivery','success');
    } catch(e) { addToast('Send failed','error'); }
  };

  const handleToggle = async (sched) => {
    await api.patch(`/api/report-schedules/${sched.id}`, { is_active: !sched.is_active });
    addToast(sched.is_active ? 'Schedule paused' : 'Schedule activated','success'); load();
  };

  const inp = { background:'#0E0E16', border:'1px solid rgba(255,255,255,0.1)', borderRadius:5, color:'#BDD4E8', fontSize:'0.78rem', padding:'6px 10px' };
  const sel = { ...inp, cursor:'pointer' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:720 }}>
      {/* Email config status */}
      {emailConfig && (
        <div style={{ padding:'10px 14px', borderRadius:7, background: emailConfig.configured ? 'rgba(34,197,94,0.06)' : 'rgba(234,179,8,0.06)', border:`1px solid ${emailConfig.configured ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}`, fontSize:'0.75rem' }}>
          {emailConfig.configured ? (
            <span style={{ color:'#22C55E' }}>✓ Email configured via {emailConfig.sendgrid ? 'SendGrid' : `SMTP (${emailConfig.smtp_host})`} — from {emailConfig.smtp_from}</span>
          ) : (
            <span style={{ color:'#EAB308' }}>⚠ No email transport configured. Add SENDGRID_API_KEY or SMTP_* variables to .env to enable delivery.</span>
          )}
        </div>
      )}

      {/* Create form */}
      <div className="at-card" style={{ padding:'14px 16px' }}>
        <div className="section-label">New Schedule</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <input style={inp} placeholder="Schedule name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          <input style={inp} placeholder="Emails (comma separated)" value={form.recipient_emails} onChange={e => setForm(f => ({...f, recipient_emails: e.target.value}))} />
          <select style={sel} value={form.schedule_type} onChange={e => setForm(f => ({...f, schedule_type: e.target.value}))}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select style={sel} value={form.report_type} onChange={e => setForm(f => ({...f, report_type: e.target.value}))}>
            <option value="digest">Full Digest (all open cases)</option>
            <option value="critical_only">Critical Cases Only</option>
            <option value="open_cases">Open Cases Only</option>
          </select>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:'0.72rem', color:'#787878' }}>
              {form.schedule_type === 'weekly' ? 'Day of week:' : form.schedule_type === 'monthly' ? 'Day of month:' : ''}
            </span>
            {form.schedule_type === 'weekly' && (
              <select style={{...sel, flex:1}} value={form.schedule_day} onChange={e => setForm(f => ({...f, schedule_day: parseInt(e.target.value)}))}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d,i) => <option key={i} value={i}>{d}</option>)}
              </select>
            )}
            {form.schedule_type === 'monthly' && (
              <input type="number" min="1" max="28" style={{...inp, width:60}} value={form.schedule_day} onChange={e => setForm(f => ({...f, schedule_day: parseInt(e.target.value)}))} />
            )}
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:'0.72rem', color:'#787878' }}>Send at (UTC):</span>
            <input type="number" min="0" max="23" style={{...inp, width:60}} value={form.schedule_hour} onChange={e => setForm(f => ({...f, schedule_hour: parseInt(e.target.value)}))} />
            <span style={{ fontSize:'0.72rem', color:'#787878' }}>:00 UTC</span>
          </div>
        </div>
        <button className="btn-accent" onClick={handleCreate} style={{ marginTop:10, fontSize:'0.78rem' }}>
          <Plus size={13} /> Create Schedule
        </button>
      </div>

      {/* Existing schedules */}
      {schedules.length === 0 ? (
        <div className="at-card" style={{ padding:32, textAlign:'center', color:'#787878', fontSize:'0.82rem' }}>
          No report schedules yet. Create one to receive automated PDF digests.
        </div>
      ) : (
        schedules.map(s => {
          const emails = JSON.parse(s.recipient_emails || '[]');
          return (
            <div key={s.id} className="at-card" style={{ padding:'12px 16px', opacity: s.is_active ? 1 : 0.55 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:600, fontSize:'0.84rem' }}>{s.name}</span>
                  <span style={{ fontSize:'0.65rem', fontFamily:'JetBrains Mono', padding:'2px 6px', borderRadius:3, background:s.is_active?'rgba(34,197,94,0.12)':'rgba(136,136,136,0.12)', color:s.is_active?'#22C55E':'#787878' }}>
                    {s.is_active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
                <div style={{ display:'flex', gap:5 }}>
                  <button onClick={() => handleSendNow(s.id)} className="btn-ghost" style={{ fontSize:'0.72rem', padding:'4px 8px' }}>Send now</button>
                  <button onClick={() => handleToggle(s)} className="btn-ghost" style={{ fontSize:'0.72rem', padding:'4px 8px' }}>{s.is_active ? 'Pause' : 'Resume'}</button>
                  <button onClick={() => handleDelete(s.id)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', padding:'4px 6px' }}><Trash2 size={13}/></button>
                </div>
              </div>
              <div style={{ fontSize:'0.7rem', color:'#787878', display:'flex', gap:14, flexWrap:'wrap' }}>
                <span>📬 {emails.join(', ')}</span>
                <span>🗓 {s.schedule_type} · {s.report_type.replace('_',' ')}</span>
                <span>🕐 {s.schedule_hour}:00 UTC</span>
                {s.next_run_at && <span style={{ color:'#8BB8E8' }}>Next: {new Date(s.next_run_at).toLocaleString()}</span>}
                {s.last_sent_at && <span>Last sent: {new Date(s.last_sent_at).toLocaleString()}</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}


// ── Integrations Tab ──────────────────────────────────────────────────────────
const EDR_PLATFORMS = [
  {
    id: 'crowdstrike',
    name: 'CrowdStrike Falcon',
    color: '#4A7EC8',
    docs: 'https://developer.crowdstrike.com/crowdstrike/docs/authentication-overview',
    envVars: [
      { key: 'CROWDSTRIKE_CLIENT_ID',     desc: 'OAuth2 Client ID from Falcon API Clients page' },
      { key: 'CROWDSTRIKE_CLIENT_SECRET', desc: 'OAuth2 Client Secret (shown once on creation)' },
      { key: 'CROWDSTRIKE_BASE_URL',      desc: 'API base URL — defaults to https://api.crowdstrike.com' },
    ],
    steps: [
      'In Falcon console → Support → API Clients and Keys',
      'Create a new OAuth2 client with Read scope on Hosts and RTR',
      'Copy the Client ID and Client Secret immediately (secret shown once)',
      'Add all three env vars to Render → Your Service → Environment',
      'Redeploy the service for the vars to take effect',
    ],
  },
  {
    id: 'sentinelone',
    name: 'SentinelOne',
    color: '#8BB8E8',
    docs: 'https://usea1-partners.sentinelone.net/docs/en/generating-api-tokens.html',
    envVars: [
      { key: 'SENTINELONE_BASE_URL',  desc: 'Your console URL e.g. https://usea1.sentinelone.net' },
      { key: 'SENTINELONE_API_TOKEN', desc: 'API token from Settings → Users → Generate API Token' },
    ],
    steps: [
      'In SentinelOne console → Settings → Users → select your user',
      'Click "Generate API Token" — copy the token shown',
      'Add SENTINELONE_BASE_URL (your console domain) and SENTINELONE_API_TOKEN',
      'Add both env vars to Render → Your Service → Environment',
      'Redeploy the service',
    ],
  },
  {
    id: 'carbonblack',
    name: 'VMware Carbon Black Cloud',
    color: '#22C55E',
    docs: 'https://developer.carbonblack.com/reference/carbon-black-cloud/authentication/',
    envVars: [
      { key: 'CARBONBLACK_BASE_URL',    desc: 'API URL e.g. https://defense.conferdeploy.net' },
      { key: 'CARBONBLACK_ORG_KEY',     desc: 'Org Key from Settings → API Access → API Keys' },
      { key: 'CARBONBLACK_API_ID',      desc: 'API ID from the created access level' },
      { key: 'CARBONBLACK_API_SECRET',  desc: 'API Secret (shown once on creation)' },
    ],
    steps: [
      'In CBC console → Settings → API Access → Add API Key',
      'Select "Carbon Black Cloud API" access level type',
      'Copy Org Key, API ID, and API Secret',
      'Add all four env vars to Render → Your Service → Environment',
      'Redeploy the service',
    ],
  },
];

function IntegrationsTab({ addToast }) {
  const [edrStatus, setEdrStatus]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [testing, setTesting]       = useState(null);
  const [expanded, setExpanded]     = useState({});

  const load = () => {
    setLoading(true);
    api.get('/api/edr/status')
      .then(r => { setEdrStatus(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const testConnection = async (platformId) => {
    setTesting(platformId);
    try {
      // Re-fetch status which pings each platform
      const r = await api.get('/api/edr/status');
      setEdrStatus(r.data);
      const info = r.data.platforms[platformId];
      if (info?.connected) addToast(`${platformId} — connected`, 'success');
      else if (info?.configured) addToast(`${platformId} — configured but unreachable: ${info.error || 'check credentials'}`, 'error');
      else addToast(`${platformId} — not configured (set env vars and redeploy)`, 'error');
    } catch { addToast('Test failed', 'error'); }
    setTesting(null);
  };

  const copyEnvKey = (key) => {
    navigator.clipboard.writeText(key);
    addToast(`Copied ${key}`, 'success');
  };

  const toggleExpanded = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const mono = { fontFamily: 'JetBrains Mono, monospace' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>

      {/* Intro banner */}
      <div className="at-card" style={{ padding: '14px 18px', borderColor: 'rgba(143,175,192,0.2)', background: 'rgba(143,175,192,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Terminal size={15} style={{ color: '#8BB8E8', marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.86rem', marginBottom: 4 }}>EDR Integration — Environment Variables</div>
            <div style={{ fontSize: '0.78rem', color: '#787878', lineHeight: 1.65 }}>
              AegisTrace connects to EDR platforms via API credentials stored as environment variables — not in the database.
              On Render, add them at <strong style={{ color: '#8BB8E8' }}>Dashboard → Your Service → Environment</strong> then redeploy.
              Credentials are never logged or stored in SQLite.
            </div>
          </div>
        </div>
      </div>

      {/* Render quick link */}
      <div style={{ display: 'flex', gap: 10 }}>
        <a href="https://dashboard.render.com" target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#BDD4E8', fontSize: '0.78rem', textDecoration: 'none', ...mono }}>
          <ExternalLink size={12} style={{ color: '#8BB8E8' }} /> Open Render Dashboard
        </a>
        <button className="btn-ghost" onClick={load} style={{ fontSize: '0.78rem', padding: '8px 14px' }}>
          <RefreshCw size={12} /> Refresh Status
        </button>
      </div>

      {/* Platform cards */}
      {EDR_PLATFORMS.map(platform => {
        const status = edrStatus?.platforms?.[platform.id];
        const isOpen = expanded[platform.id];

        const statusColor = !status ? '#787878'
          : status.connected ? '#22C55E'
          : status.configured ? '#EF4444'
          : '#888888';

        const statusLabel = loading ? 'Checking…'
          : !status ? 'Unknown'
          : status.connected ? 'Connected'
          : status.configured ? 'Credentials set — unreachable'
          : 'Not configured';

        return (
          <div key={platform.id} className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header row */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}
              onClick={() => toggleExpanded(platform.id)}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, flexShrink: 0,
                boxShadow: status?.connected ? `0 0 8px ${statusColor}66` : 'none' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{platform.name}</div>
                <div style={{ fontSize: '0.7rem', color: statusColor, ...mono, marginTop: 2 }}>
                  {status?.error ? `${statusLabel} — ${status.error}` : statusLabel}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '5px 10px' }}
                  onClick={e => { e.stopPropagation(); testConnection(platform.id); }}
                  disabled={testing === platform.id}
                >
                  {testing === platform.id ? <Loader2 size={11} className="spinner" /> : 'Test Connection'}
                </button>
                {isOpen ? <ChevronDown size={13} style={{ color: '#787878' }} /> : <ChevronRight size={13} style={{ color: '#787878' }} />}
              </div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Env vars */}
                <div style={{ marginTop: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, ...mono }}>Required Environment Variables</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {platform.envVars.map(({ key, desc }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#050505', borderRadius: 6, border: '1px solid rgba(74,126,200,0.08)' }}>
                        <code style={{ flex: '0 0 auto', fontSize: '0.75rem', color: platform.color, ...mono, minWidth: 260 }}>{key}</code>
                        <div style={{ flex: 1, fontSize: '0.72rem', color: '#787878' }}>{desc}</div>
                        <button
                          onClick={() => copyEnvKey(key)}
                          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '3px 8px', color: '#787878', cursor: 'pointer', fontSize: '0.68rem', ...mono, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Copy size={10} /> Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setup steps */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#787878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, ...mono }}>Setup Steps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {platform.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.78rem', color: '#BDD4E8', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: platform.color, ...mono, minWidth: 18 }}>{i + 1}.</span>
                        <span style={{ color: 'rgba(240,240,248,0.7)' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Docs link */}
                <a href={platform.docs} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', color: '#8BB8E8', textDecoration: 'none', ...mono }}>
                  <ExternalLink size={11} /> {platform.name} API Documentation
                </a>
              </div>
            )}
          </div>
        );
      })}

      {/* Important note */}
      <div style={{ padding: '12px 16px', borderRadius: 7, background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)', fontSize: '0.76rem', color: '#EAB308', lineHeight: 1.6 }}>
        <strong>After adding env vars on Render:</strong> go to your service → click "Manual Deploy" → "Deploy latest commit". The new env vars take effect only after a redeploy. You will see "Connected" in this panel once the service restarts with valid credentials.
      </div>
    </div>
  );
}


// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function Admin() {
  const { addToast, user } = useStore();
  // Support ?tab=integrations deep-link from dashboard EDR widget
  const defaultTab = new URLSearchParams(window.location.search).get('tab') || 'users';
  const [tab, setTab] = useState(defaultTab);

  return (
    <div style={{ padding:'24px 28px' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:'1.3rem', fontWeight:600 }}>Admin Settings</h1>
        <div style={{ fontSize:'0.72rem', color:'#787878', marginTop:2 }}>Full system control · User management · Webhooks · Audit log</div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:6, fontSize:'0.8rem', cursor:'pointer', border:'1px solid', fontFamily:'Inter', transition:'all 0.15s',
              background: tab === id ? 'rgba(90,138,159,0.12)' : 'rgba(255,255,255,0.03)',
              borderColor: tab === id ? 'rgba(90,138,159,0.4)' : 'rgba(255,255,255,0.08)',
              color: tab === id ? '#BDD4E8' : '#787878',
            }}>
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {tab === 'users'        && <UsersTab user={user} addToast={addToast}/>}
      {tab === 'integrations' && <IntegrationsTab addToast={addToast}/>}
      {tab === 'webhooks'     && <WebhooksTab addToast={addToast}/>}
      {tab === 'schedules'    && <SchedulesTab addToast={addToast}/>}
      {tab === 'audit'        && <AuditTab/>}
      {tab === 'system'       && <SystemTab addToast={addToast}/>}
    </div>
  );
}
