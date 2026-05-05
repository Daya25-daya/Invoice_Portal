import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
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

      if (user?.role && !['admin', 'staff'].includes(user.role)) {
        setError('Access Denied: This login is for Business Owners only.');
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
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ─── Left Panel (Exact match to image) ─── */}
      <div style={{
        width: '42%',
        background: '#00055eff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 40px',
        position: 'relative',
        overflow: 'hidden'
      }} className="hidden lg:flex">

        {/* Decorative faint circles */}
        <div style={{ position: 'absolute', top: 60, right: 40, width: 50, height: 50, borderRadius: '50%', border: '1px solid rgba(100,160,255,0.15)' }}></div>
        <div style={{ position: 'absolute', top: 90, right: 70, width: 20, height: 20, borderRadius: '50%', background: 'rgba(100,160,255,0.1)' }}></div>
        <div style={{ position: 'absolute', top: 200, left: 30, width: 12, height: 12, borderRadius: '50%', background: 'rgba(100,160,255,0.12)' }}></div>

        {/* Logo Icon */}
        <div style={{ marginBottom: 32 }}>
          <img
            src={`${import.meta.env.BASE_URL}login-logo.png`}
            alt="Logo"
            style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'contain' }}
          />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: 14,
          lineHeight: 1.3,
          letterSpacing: '-0.3px'
        }}>
          Invoice & Billing Portal
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          lineHeight: 1.7,
          maxWidth: 280,
          marginBottom: 48
        }}>
          Simplify your business billing and manage invoices with ease.
        </p>

        {/* Illustration */}
        <div style={{ width: '80%', maxWidth: 300 }}>
          <img
            src={`${import.meta.env.BASE_URL}invoice-illustration.png`}
            alt="Invoice Illustration"
            style={{ width: '100%', display: 'block' }}
          />
        </div>
      </div>

      {/* ─── Right Panel ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 48px',
        background: '#ffffff'
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>Welcome Back!</h2>
            <p style={{ fontSize: 14, color: '#94a3b8' }}>Login to your account</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 18, padding: '10px 14px', borderRadius: 8,
              background: '#fff1f2', border: '1px solid #fecdd3',
              color: '#e11d48', fontSize: 13, textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Email</label>
              <input
                type="text"
                placeholder="Enter your email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
                  outline: 'none', transition: 'border 0.2s', background: '#fff',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px', borderRadius: 8,
                    border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
                    outline: 'none', transition: 'border 0.2s', background: '#fff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 17, color: '#94a3b8', padding: 0
                  }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: 15, height: 15, accentColor: '#3b82f6', cursor: 'pointer' }} />
                Remember me
              </label>
              <a href="#" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 8,
                background: '#2563eb',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', cursor: 'pointer',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseOver={e => e.target.style.background = '#1d4ed8'}
              onMouseOut={e => e.target.style.background = '#2563eb'}
            >
              {loading ? <span className="loading-spinner" style={{ width: '1.25rem', height: '1.25rem' }}></span> : 'Login'}
            </button>
          </form>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Register</Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
            Are you a client?{' '}
            <Link to="/client-login" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>Client Login →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
