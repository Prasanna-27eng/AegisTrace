import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertTriangle } from 'lucide-react';
import api from '../../../api/client';
import useStore from '../../../store/useStore';

export default function AIChatTab({ caseId, caseData }) {
  const { addToast } = useStore();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `I'm AegisTrace AI, scoped to case ${caseData?.case_number || caseId}. I can only answer questions based on the evidence in this case. What would you like to know?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const msg = input.trim();
  if (!caseData) return null;
    if (!msg || loading) return;
    setInput('');
    const updated = [...messages, { role: 'user', content: msg }];
    setMessages(updated);
    setLoading(true);
    try {
      const history = updated.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post(`/api/cases/${caseId}/chat`, { message: msg, history: history.slice(-8) });
      setMessages(p => [...p, { role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      addToast('Chat error', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 200px)' }}>
      {/* Disclaimer */}
      <div style={{ padding: '10px 20px', background: 'rgba(234,179,8,0.04)', borderBottom: '1px solid rgba(234,179,8,0.12)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#71717A', flexShrink: 0 }}>
        <AlertTriangle size={12} style={{ color: '#EAB308', flexShrink: 0 }} />
        AI responses are scoped to case evidence only. No automatic writes without analyst approval.
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={14} style={{ color: '#A78BFA' }} />
              </div>
            )}
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.role === 'user' ? 'rgba(77,163,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(77,163,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
              fontSize: '0.84rem',
              lineHeight: 1.65,
              color: '#F0F0F8',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
              {msg.role === 'assistant' && (
                <div style={{ fontSize: '0.65rem', color: 'rgba(167,139,250,0.6)', marginTop: 6, fontFamily: 'JetBrains Mono' }}>
                  AegisTrace AI · case-scoped
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(77,163,255,0.15)', border: '1px solid rgba(77,163,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={14} style={{ color: '#4DA3FF' }} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} style={{ color: '#A78BFA' }} />
            </div>
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px 12px 12px 4px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', animation: `spin 1s ease ${d * 0.2}s infinite`, opacity: 0.6 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', gap: 8 }}>
        <input
          className="at-input"
          placeholder="Ask about this case…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          style={{ flex: 1, fontSize: '0.84rem' }}
          disabled={loading}
        />
        <button className="btn-accent" onClick={send} disabled={loading || !input.trim()} style={{ padding: '8px 14px', flexShrink: 0 }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
