import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ClientLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form);
      const user = res?.data?.user;
      
      if (user?.role && user.role !== 'client') {
        setError('Access Denied: This portal is for clients only.');
        setLoading(false);
        return;
      }
      
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* ─── Left Panel (Emerald) ─── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #059669 0%, #047857 50%, #064e3b 100%)' }}>
        
        <div className="z-10 mt-12">
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 28
          }}>
            👤
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>
            Client Portal
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 320 }}>
            View your invoices, track payments, and manage your billing securely.
          </p>
        </div>

        <div className="z-10" style={{ marginBottom: 20 }}>
          <img 
            src={`${import.meta.env.BASE_URL}invoice-illustration.png`} 
            alt="Invoice Illustration" 
            style={{ width: '85%', maxWidth: 340, display: 'block' }}
          />
        </div>

        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(16,185,129,0.3)', filter: 'blur(80px)' }}></div>
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(6,78,59,0.4)', filter: 'blur(60px)' }}></div>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-slate-950">
        <div className="w-full max-w-[420px]">
          
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>Welcome, Client!</h2>
            <p style={{ fontSize: 15, color: '#94a3b8' }}>Access your billing dashboard</p>
          </div>

          {error && (
            <div style={{
              marginBottom: 20, padding: '10px 14px', borderRadius: 10,
              background: '#fff1f2', border: '1px solid #fecdd3',
              color: '#e11d48', fontSize: 13, textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Client Email</label>
              <input
                type="text"
                placeholder="Enter your email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
                  outline: 'none', transition: 'border 0.2s', background: '#fff',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = '#10b981'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
                    outline: 'none', transition: 'border 0.2s', background: '#fff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, color: '#94a3b8', padding: 0
                  }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }} />
                Remember me
              </label>
              <a href="#" style={{ fontSize: 13, color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10,
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#fff', fontWeight: 700, fontSize: 16,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseOver={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(5,150,105,0.4)'; }}
              onMouseOut={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(5,150,105,0.3)'; }}
            >
              {loading ? <span className="loading-spinner" style={{ width: '1.25rem', height: '1.25rem' }}></span> : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b', marginTop: 28 }}>
            Are you a Business Owner?{' '}
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Admin Login →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
