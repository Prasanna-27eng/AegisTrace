import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const EVENT_TYPES = ['detection','action','escalation','closure','intel','remediation'];
const typeColor = { detection:'#C0392B', action:'#A78BFA', escalation:'#EF4444', closure:'#22C55E', intel:'#EAB308', remediation:'#71717A' };

export default function TimelineTab({ caseId }) {
  const { addToast } = useStore();
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ timestamp: new Date().toISOString().slice(0,16), event_type: 'action', description: '' });

  useEffect(() => {
    if (caseId && caseId !== 'new') {
      api.get(`/api/cases/${caseId}/timeline`).then(r => setEvents(r.data)).catch(() => {});
    }
  }, [caseId]);

  const addEvent = async () => {
    if (!newEvent.description.trim()) return;
    try {
      const res = await api.post(`/api/cases/${caseId}/timeline`, newEvent);
      setEvents(p => [...p, res.data].sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp)));
      setShowAdd(false);
      setNewEvent({ timestamp: new Date().toISOString().slice(0,16), event_type: 'action', description: '' });
      addToast('Event added', 'success');
    } catch { addToast('Failed to add event', 'error'); }
  };

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Investigation Timeline</h3>
          <div style={{ fontSize: '0.72rem', color: '#71717A', marginTop: 2 }}>{events.length} event{events.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn-accent" onClick={() => setShowAdd(true)} style={{ fontSize: '0.78rem' }}><Plus size={13} /> Add Event</button>
      </div>

      {showAdd && (
        <div className="at-card" style={{ padding: 14, marginBottom: 20, borderColor: 'rgba(192,57,43,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="section-label" style={{ margin: 0 }}>Add Timeline Event</div>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Timestamp</label>
              <input type="datetime-local" className="at-input" value={newEvent.timestamp} onChange={e => setNewEvent(p => ({ ...p, timestamp: e.target.value }))} style={{ fontSize: '0.8rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Event Type</label>
              <select className="at-select" value={newEvent.event_type} onChange={e => setNewEvent(p => ({ ...p, event_type: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: '0.7rem', color: '#71717A', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea className="at-textarea" rows={3} value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder="Describe what happened…" style={{ fontSize: '0.82rem' }} />
          </div>
          <button className="btn-accent" onClick={addEvent}>Add Event</button>
        </div>
      )}

      {events.length === 0 ? (
        <div className="at-card" style={{ padding: 40, textAlign: 'center', color: '#71717A' }}>
          No timeline events yet. Add your first event.
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 28, maxWidth: 700 }}>
          <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 1, background: 'linear-gradient(180deg, #C0392B, rgba(192,57,43,0.1))' }} />
          {events.map((ev, i) => (
            <div key={ev.id || i} style={{ position: 'relative', marginBottom: 20, paddingLeft: 20 }}>
              <div style={{ position: 'absolute', left: -5, top: 6, width: 10, height: 10, borderRadius: '50%', background: typeColor[ev.event_type] || '#71717A', border: '2px solid #07080F', boxShadow: `0 0 0 2px ${typeColor[ev.event_type] || '#71717A'}30` }} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>
                  {new Date(ev.timestamp).toLocaleString('en-IE')}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: typeColor[ev.event_type], fontFamily: 'JetBrains Mono', padding: '1px 6px', background: `${typeColor[ev.event_type]}18`, borderRadius: 3 }}>
                  {ev.event_type?.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#B0B0C0', lineHeight: 1.65 }}>{ev.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
