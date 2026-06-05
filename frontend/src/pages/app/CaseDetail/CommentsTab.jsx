import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Pin, Trash2, Loader2, Edit, X, Check } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const MONO = { fontFamily: 'JetBrains Mono, monospace' };

const TYPE_COLOR = {
  note:       { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', color: '#A78BFA', label: 'Note' },
  handoff:    { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)',   color: '#EAB308', label: 'Handoff' },
  escalation: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   color: '#EF4444', label: 'Escalation' },
  decision:   { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   color: '#22C55E', label: 'Decision' },
};

function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

export default function CommentsTab({ caseId }) {
  const { addToast, user } = useStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [body, setBody]         = useState('');
  const [type, setType]         = useState('note');
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(null); // { id, body }

  const load = () => {
    api.get(`/api/cases/${caseId}/comments`)
      .then(r => { setComments(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (caseId && caseId !== 'new') load(); }, [caseId]);

  const addComment = async () => {
    if (!body.trim()) { addToast('Comment cannot be empty', 'error'); return; }
    setSaving(true);
    try {
      await api.post(`/api/cases/${caseId}/comments`, { body, comment_type: type });
      setBody(''); load();
      addToast('Comment added', 'success');
    } catch (e) { addToast(e.response?.data?.detail || 'Failed', 'error'); }
    setSaving(false);
  };

  const togglePin = async (c) => {
    try {
      await api.patch(`/api/cases/${caseId}/comments/${c.id}`, { is_pinned: !c.is_pinned });
      load();
    } catch { addToast('Update failed', 'error'); }
  };

  const saveEdit = async () => {
    if (!editing?.body.trim()) return;
    try {
      await api.patch(`/api/cases/${caseId}/comments/${editing.id}`, { body: editing.body });
      setEditing(null); load();
      addToast('Updated', 'success');
    } catch { addToast('Update failed', 'error'); }
  };

  const deleteComment = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/api/cases/${caseId}/comments/${id}`);
      load(); addToast('Deleted', 'success');
    } catch { addToast('Delete failed', 'error'); }
  };

  const pinned   = comments.filter(c => c.is_pinned);
  const unpinned = comments.filter(c => !c.is_pinned);

  return (
    <div style={{ padding: '20px 24px', maxWidth: 800 }}>
      {/* Composer */}
      <div className="at-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(77,163,255,0.15)', border: '1px solid rgba(77,163,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#4DA3FF', fontSize: '0.8rem', flexShrink: 0 }}>
            {user?.name?.[0] || 'A'}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {Object.entries(TYPE_COLOR).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setType(k)}
                  style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: '0.68rem', cursor: 'pointer',
                    border: `1px solid ${type === k ? v.border : 'rgba(255,255,255,0.08)'}`,
                    background: type === k ? v.bg : 'transparent',
                    color: type === k ? v.color : '#787878',
                    ...MONO,
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add a note, handoff, escalation, or decision record…"
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) addComment(); }}
              style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#EBEBEB', fontSize: '0.82rem', padding: '10px 12px', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn-accent" onClick={addComment} disabled={saving} style={{ fontSize: '0.78rem' }}>
                {saving ? <Loader2 size={12} className="spinner" /> : <Plus size={12} />} Add Comment
              </button>
              <span style={{ fontSize: '0.68rem', color: '#787878', ...MONO }}>Ctrl+Enter to submit</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#787878' }}><Loader2 size={18} className="spinner" /></div>
      ) : comments.length === 0 ? (
        <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#787878' }}>
          <MessageSquare size={28} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
          <div style={{ fontSize: '0.82rem' }}>No comments yet. Add investigation notes, handoff context, or decision records.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Pinned first */}
          {pinned.map(c => <CommentCard key={c.id} c={c} editing={editing} setEditing={setEditing} saveEdit={saveEdit} togglePin={togglePin} deleteComment={deleteComment} currentUser={user} />)}
          {/* Then rest */}
          {unpinned.map(c => <CommentCard key={c.id} c={c} editing={editing} setEditing={setEditing} saveEdit={saveEdit} togglePin={togglePin} deleteComment={deleteComment} currentUser={user} />)}
        </div>
      )}
    </div>
  );
}

function CommentCard({ c, editing, setEditing, saveEdit, togglePin, deleteComment, currentUser }) {
  const meta = TYPE_COLOR[c.comment_type] || TYPE_COLOR.note;
  const isEditing = editing?.id === c.id;

  return (
    <div style={{ background: c.is_pinned ? 'rgba(255,255,255,0.025)' : 'rgba(240,240,248,0.02)', border: `1px solid ${c.is_pinned ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'}`, borderLeft: `3px solid ${meta.color}`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${meta.color}18`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: meta.color, flexShrink: 0 }}>
          {c.author_name?.[0] || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{c.author_name || c.author_email}</span>
          <span style={{ fontSize: '0.7rem', color: '#787878', marginLeft: 8, ...MONO }}>{timeAgo(c.created_at)}</span>
        </div>
        <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 3, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, ...MONO }}>{meta.label}</span>
        {c.is_pinned && <Pin size={11} style={{ color: '#EAB308' }} />}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => togglePin(c)} style={{ background: 'none', border: 'none', color: c.is_pinned ? '#EAB308' : '#787878', cursor: 'pointer', padding: 3 }} title="Pin"><Pin size={11} /></button>
          <button onClick={() => setEditing({ id: c.id, body: c.body })} style={{ background: 'none', border: 'none', color: '#787878', cursor: 'pointer', padding: 3 }}><Edit size={11} /></button>
          <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 3 }}><Trash2 size={11} /></button>
        </div>
      </div>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={editing.body}
            onChange={e => setEditing(p => ({ ...p, body: e.target.value }))}
            rows={3}
            style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#EBEBEB', fontSize: '0.8rem', padding: '8px 10px', resize: 'vertical', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 7 }}>
            <button className="btn-accent" onClick={saveEdit} style={{ fontSize: '0.72rem' }}><Check size={11} /> Save</button>
            <button className="btn-ghost" onClick={() => setEditing(null)} style={{ fontSize: '0.72rem' }}><X size={11} /> Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.82rem', color: 'rgba(240,240,248,0.8)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{c.body}</div>
      )}
    </div>
  );
}
