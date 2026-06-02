import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, X, Shield, Key } from 'lucide-react';
import api from '../../api/client';
import useStore from '../../store/useStore';

export default function Admin() {
  const { addToast, user } = useStore();
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'analyst', password: '' });
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '' });
  const [showPw, setShowPw] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      api.get('/api/auth/users').then(r => setUsers(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  const createUser = async () => {
    if (!form.email || !form.password || !form.name) { addToast('All fields required', 'error'); return; }
    try {
      const res = await api.post('/api/auth/users', form);
      setUsers(p => [...p, res.data]);
      setShowAdd(false);
      setForm({ email: '', name: '', role: 'analyst', password: '' });
      addToast('User created', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed to create user', 'error'); }
  };

  const updateUser = async () => {
    if (!editUser) return;
    try {
      const res = await api.patch(`/api/auth/users/${editUser.id}`, { name: editUser.name, role: editUser.role, is_active: editUser.is_active, ...(editUser.new_password ? { password: editUser.new_password } : {}) });
      setUsers(p => p.map(u => u.id === editUser.id ? { ...u, ...res.data } : u));
      setEditUser(null);
      addToast('User updated', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Update failed', 'error'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/api/auth/users/${id}`);
      setUsers(p => p.filter(u => u.id !== id));
      addToast('User deleted', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Delete failed', 'error'); }
  };

  const changePassword = async () => {
    if (!pwForm.old_password || !pwForm.new_password) { addToast('Both passwords required', 'error'); return; }
    try {
      await api.post('/api/auth/change-password', pwForm);
      setPwForm({ old_password: '', new_password: '' });
      setShowPw(false);
      addToast('Password changed successfully', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Password change failed', 'error'); }
  };

  const roleColor = { admin: '#C0392B', analyst: '#A78BFA', viewer: '#71717A' };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Admin Settings</h1>
        <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: 2 }}>User management · Security settings</div>
      </div>

      {/* Your account */}
      <div className="at-card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="section-label">Your Account</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#C0392B' }}>{user?.name?.[0]}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#71717A' }}>{user?.email}</div>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: roleColor[user?.role], fontFamily: 'JetBrains Mono', padding: '1px 6px', background: `${roleColor[user?.role]}18`, borderRadius: 3 }}>{user?.role?.toUpperCase()}</span>
          </div>
        </div>

        {!showPw ? (
          <button className="btn-ghost" onClick={() => setShowPw(true)} style={{ fontSize: '0.8rem' }}><Key size={13} /> Change Password</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Current Password</label>
              <input type="password" className="at-input" value={pwForm.old_password} onChange={e => setPwForm(p => ({ ...p, old_password: e.target.value }))} style={{ fontSize: '0.8rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>New Password</label>
              <input type="password" className="at-input" value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} style={{ fontSize: '0.8rem' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-accent" onClick={changePassword} style={{ fontSize: '0.78rem' }}>Update Password</button>
              <button className="btn-ghost" onClick={() => setShowPw(false)} style={{ fontSize: '0.78rem' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* User Management (admin only) */}
      {isAdmin && (
        <div className="at-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-label" style={{ margin: 0 }}>User Management</div>
            <button className="btn-accent" onClick={() => setShowAdd(true)} style={{ fontSize: '0.78rem', padding: '6px 12px' }}><Plus size={13} /> Add User</button>
          </div>

          {/* Credentials hint */}
          <div style={{ padding: '10px 12px', background: 'rgba(192,57,43,0.05)', border: '1px solid rgba(192,57,43,0.12)', borderRadius: 6, marginBottom: 14, fontSize: '0.72rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>
            // admin: prasanna80564@gmail.com / aegis2025 (change in .env)
          </div>

          {/* Add user form */}
          {showAdd && (
            <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>New User</div>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}><X size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Full Name *</label>
                  <input className="at-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" style={{ fontSize: '0.8rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Email *</label>
                  <input type="email" className="at-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="analyst@company.com" style={{ fontSize: '0.8rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Password *</label>
                  <input type="password" className="at-input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Strong password" style={{ fontSize: '0.8rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Role</label>
                  <select className="at-select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                    <option value="analyst">Analyst</option>
                    <option value="viewer">Viewer (read-only)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button className="btn-accent" onClick={createUser} style={{ fontSize: '0.8rem' }}>Create User</button>
            </div>
          )}

          {/* User list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => (
              <div key={u.id}>
                {editUser?.id === u.id ? (
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 3 }}>Name</label>
                        <input className="at-input" value={editUser.name} onChange={e => setEditUser(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '0.8rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 3 }}>Role</label>
                        <select className="at-select" value={editUser.role} onChange={e => setEditUser(p => ({ ...p, role: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                          <option value="analyst">Analyst</option>
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 3 }}>New Password</label>
                        <input type="password" className="at-input" value={editUser.new_password || ''} onChange={e => setEditUser(p => ({ ...p, new_password: e.target.value }))} placeholder="Leave blank to keep" style={{ fontSize: '0.8rem' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-accent" onClick={updateUser} style={{ fontSize: '0.78rem' }}>Save</button>
                      <button className="btn-ghost" onClick={() => setEditUser(null)} style={{ fontSize: '0.78rem' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#0F1018', borderRadius: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${roleColor[u.role]}20`, border: `1px solid ${roleColor[u.role]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: roleColor[u.role], flexShrink: 0 }}>{u.name?.[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{u.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#71717A' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: roleColor[u.role], fontFamily: 'JetBrains Mono', padding: '1px 6px', background: `${roleColor[u.role]}15`, borderRadius: 3 }}>{u.role?.toUpperCase()}</span>
                    {!u.is_active && <span style={{ fontSize: '0.65rem', color: '#EF4444', fontFamily: 'JetBrains Mono' }}>INACTIVE</span>}
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button onClick={() => setEditUser({ ...u })} className="btn-ghost" style={{ padding: '4px 8px' }}><Edit size={12} /></button>
                      <button onClick={() => deleteUser(u.id)} className="btn-ghost" style={{ padding: '4px 8px', color: '#EF4444' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="at-card" style={{ padding: 20, textAlign: 'center', color: '#71717A' }}>
          <Shield size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <div>Admin access required to manage users.</div>
        </div>
      )}
    </div>
  );
}
