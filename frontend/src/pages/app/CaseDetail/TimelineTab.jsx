import React, { useState, useEffect } from 'react';
import { Plus, X, Clock, AlertCircle, CheckCircle, TrendingUp, Search, Wrench, Shield } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

const EVENT_TYPES = ['detection','action','escalation','closure','intel','remediation'];

const TYPE_CONFIG = {
  detection:   { color: '#6366F1', bg: 'rgba(99,102,241,0.12)',   Icon: AlertCircle,  label: 'Detection'   },
  action:      { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', Icon: Wrench,        label: 'Action'      },
  escalation:  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   Icon: TrendingUp,    label: 'Escalation'  },
  closure:     { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   Icon: CheckCircle,   label: 'Closure'     },
  intel:       { color: '#EAB308', bg: 'rgba(234,179,8,0.12)',   Icon: Search,        label: 'Intel'       },
  remediation: { color: '#71717A', bg: 'rgba(113,113,122,0.12)', Icon: Shield,        label: 'Remediation' },
};

function timeDiff(a, b) {
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / 1000;
  if (diff <= 0) return null;
  if (diff < 60)    return `+${Math.round(diff)}s`;
  if (diff < 3600)  return `+${Math.round(diff / 60)}m`;
  if (diff < 86400) return `+${Math.round(diff / 3600)}h`;
  return `+${Math.round(diff / 86400)}d`;
}

export default function TimelineTab({ caseId }) {
  const { addToast } = useStore();
  const [events, setEvents]     = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
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
    <div style={{ padding: '20px 24px', maxWidth: 740 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Investigation Timeline</h3>
          <div style={{ fontSize: '0.7rem', color: '#71717A', marginTop: 2 }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
            {events.length > 1 && (() => { const d = timeDiff(events[0]?.timestamp, events[events.length-1]?.timestamp); return d ? <span style={{ marginLeft: 8, fontFamily: 'JetBrains Mono' }}>· span {d}</span> : null; })()}
          </div>
        </div>
        <button className="btn-accent" onClick={() => setShowAdd(s => !s)} style={{ fontSize: '0.78rem' }}>
          <Plus size={13} /> Add Event
        </button>
      </div>

      {showAdd && (
        <div className="at-card" style={{ padding: 14, marginBottom: 24, borderColor: 'rgba(99,102,241,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="section-label" style={{ margin: 0 }}>New Timeline Event</div>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="at-label">Timestamp</label>
              <input type="datetime-local" className="at-input" value={newEvent.timestamp}
                onChange={e => setNewEvent(p => ({ ...p, timestamp: e.target.value }))} style={{ fontSize: '0.8rem' }} />
            </div>
            <div>
              <label className="at-label">Event Type</label>
              <select className="at-select" value={newEvent.event_type}
                onChange={e => setNewEvent(p => ({ ...p, event_type: e.target.value }))} style={{ width: '100%', fontSize: '0.8rem' }}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="at-label">Description</label>
            <textarea className="at-textarea" rows={3} value={newEvent.description}
              onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe what happened at this point…" style={{ fontSize: '0.82rem' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-accent" onClick={addEvent} style={{ fontSize: '0.8rem' }}>Add Event</button>
            <button className="btn-ghost" onClick={() => setShowAdd(false)} style={{ fontSize: '0.8rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="at-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Clock size={28} style={{ color: 'rgba(167,139,250,0.25)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>No timeline events yet</div>
          <div style={{ fontSize: '0.78rem', color: '#71717A', marginBottom: 16 }}>
            Document detections, actions taken, escalations, and findings as the investigation unfolds.
          </div>
          <button className="btn-ghost" onClick={() => setShowAdd(true)} style={{ fontSize: '0.8rem' }}>
            <Plus size={13} /> Add First Event
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 36 }}>
          {/* Spine */}
          <div style={{ position: 'absolute', left: 11, top: 16, bottom: 20, width: 2, background: 'linear-gradient(180deg, rgba(99,102,241,0.5) 0%, rgba(99,102,241,0.05) 100%)', borderRadius: 1 }} />

          {events.map((ev, i) => {
            const cfg = TYPE_CONFIG[ev.event_type] || TYPE_CONFIG.action;
            const { Icon } = cfg;
            const diff = i > 0 ? timeDiff(events[i-1].timestamp, ev.timestamp) : null;

            return (
              <div key={ev.id || i} style={{ position: 'relative', marginBottom: 20 }}>
                {/* Time gap label */}
                {diff && (
                  <div style={{ marginBottom: 8, marginLeft: 0, fontSize: '0.62rem', color: 'rgba(113,113,122,0.5)', fontFamily: 'JetBrains Mono', paddingLeft: 0 }}>
                    <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 6px' }}>{diff}</span>
                  </div>
                )}

                {/* Node */}
                <div style={{ position: 'absolute', left: -36, top: 10, width: 24, height: 24, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px #07080F, 0 0 10px ${cfg.color}30` }}>
                  <Icon size={11} style={{ color: cfg.color }} />
                </div>

                {/* Card */}
                <div
                  style={{ background: 'rgba(15,16,24,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${cfg.color}35`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: cfg.color, fontFamily: 'JetBrains Mono', padding: '1px 7px', background: cfg.bg, borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: '0.67rem', color: '#71717A', fontFamily: 'JetBrains Mono', marginLeft: 'auto' }}>
                      {new Date(ev.timestamp).toLocaleString('en-IE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#C8C8D8', lineHeight: 1.65 }}>{ev.description}</div>
                  <div style={{ marginTop: 5, fontSize: '0.6rem', color: 'rgba(113,113,122,0.35)', fontFamily: 'JetBrains Mono' }}>Event {i+1} of {events.length}</div>
                </div>
              </div>
            );
          })}

          {/* End cap */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: -36, top: 0, width: 24, height: 24, borderRadius: '50%', background: 'rgba(113,113,122,0.08)', border: '2px solid rgba(113,113,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#71717A', opacity: 0.4 }} />
            </div>
            <div style={{ paddingTop: 4, fontSize: '0.68rem', color: 'rgba(113,113,122,0.4)', fontFamily: 'JetBrains Mono' }}>
              Last: {new Date(events[events.length-1]?.timestamp).toLocaleString('en-IE')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
