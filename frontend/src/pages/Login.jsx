import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';
import WireframeBackground from '../components/WireframeBackground';
import api from '../api/client';
import useStore from '../store/useStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password required'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email: email.trim().toLowerCase(), password: password.trim() });
      setAuth(res.data.token, res.data.user);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#07080F', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <WireframeBackground opacity={0.85} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: '0 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Logo size={40} showText={false} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>AegisTrace</div>
          <div style={{ fontSize: '0.8rem', color: '#71717A', fontFamily: 'JetBrains Mono' }}>SOC Investigation Platform</div>
        </div>

        {/* Card */}
        <div className="at-card fade-up" style={{ padding: 32 }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717A', fontFamily: 'JetBrains Mono', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={12} />
            Secure Access
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#EF4444' }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#71717A', display: 'block', marginBottom: 6 }}>Email Address</label>
              <input
                type="email"
                className="at-input"
                placeholder="analyst@aegistrace.io"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#71717A', display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="at-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 4 }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-accent"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 4 }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} /> Authenticating…</>
              ) : 'Sign In'}
            </button>
          </form>

        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ fontSize: '0.75rem', color: '#71717A', textDecoration: 'none' }}>← Back to landing</a>
        </div>
      </div>
    </div>
  );
}
