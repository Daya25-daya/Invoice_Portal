import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function Settings() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState({ name: '', email: '', company: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setProfile({ 
        name: user.name || '', 
        email: user.email || '', 
        company_name: user.company_name || '',
        company_logo: user.company_logo || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      await api.post('/settings.php?action=profile', profile);
      setMsg({ type: 'success', text: 'Profile & Branding updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-1 transition-colors">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 transition-colors">Manage your account and preferences.</p>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl border ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} text-sm font-medium animate-slide-down`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-8">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Profile Information</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Company Name</label>
                <input className="form-input" value={profile.company_name} onChange={e => setProfile({...profile, company_name: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Company Logo URL</label>
                <input className="form-input" placeholder="https://example.com/logo.png" value={profile.company_logo} onChange={e => setProfile({...profile, company_logo: e.target.value})} />
              </div>
              <div className="pt-4">
                <button type="submit" className="btn-primary px-8 py-3" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Security</h2>
            <p className="text-sm text-slate-500 mb-4">Update your password to keep your account secure.</p>
            <button className="btn-secondary">Change Password</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Preferences</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Dark Mode</p>
                <p className="text-xs text-slate-500">Switch between themes</p>
              </div>
              <button 
                onClick={toggleTheme}
                className={`w-12 h-6 rounded-full transition-colors relative ${isDark ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isDark ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
