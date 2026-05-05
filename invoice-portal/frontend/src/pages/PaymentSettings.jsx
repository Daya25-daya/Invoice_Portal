import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { showToast } from '../components/Toast';

export default function PaymentSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ 
    razorpay_key: '', stripe_key: '', twilio_sid: '', twilio_auth: '', twilio_from: '',
    smtp_email: '', smtp_password: '' 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Masking function for account numbers
  const maskAccount = (acc) => {
    if (!acc) return '';
    if (user?.role === 'admin') return acc;
    if (acc.length < 5) return 'XXXX' + acc;
    return 'XXXX' + acc.slice(-4);
  };

  useEffect(() => {
    api.get('/settings.php')
      .then(res => {
        if (res.data.settings) setSettings(res.data.settings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Validations
    if (settings.ifsc && settings.ifsc.length !== 11) {
      showToast('IFSC code must be exactly 11 characters.', 'error');
      return;
    }
    if (settings.upi_id && !settings.upi_id.includes('@')) {
      showToast('Invalid UPI format (must contain @).', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/settings.php', settings);
      showToast('Payment methods updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-32"><div className="loading-spinner"></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-1 transition-colors">Payment Methods</h1>
        <p className="text-slate-500 dark:text-slate-400 transition-colors">
          {user?.role === 'admin' 
            ? 'Configure how you receive payments from your clients.' 
            : 'View available payment methods to settle your invoices.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">🏦</div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Bank Transfer</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Bank Name</label>
              <input 
                className="form-input" 
                value={settings.bank_name} 
                readOnly={user?.role !== 'admin'}
                onChange={e => setSettings({...settings, bank_name: e.target.value})} 
              />
            </div>
            <div>
              <label className="form-label">Account Number</label>
              <input 
                className="form-input" 
                value={user?.role === 'admin' ? (settings.account_number || '') : maskAccount(settings.account_number)} 
                readOnly={user?.role !== 'admin'}
                onChange={e => setSettings({...settings, account_number: e.target.value})} 
              />
            </div>
            <div>
              <label className="form-label">IFSC Code</label>
              <input 
                className="form-input" 
                value={settings.ifsc} 
                readOnly={user?.role !== 'admin'}
                onChange={e => setSettings({...settings, ifsc: e.target.value})} 
              />
            </div>
            {user?.role === 'admin' && (
              <div className="pt-4">
                <button type="submit" className="btn-primary w-full justify-center" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Bank Details'}
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">📱</div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">UPI Payment</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">UPI ID</label>
              <input 
                className="form-input" 
                value={settings.upi_id} 
                readOnly={user?.role !== 'admin'}
                onChange={e => setSettings({...settings, upi_id: e.target.value})} 
              />
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-4">
                <div className="w-32 h-32 bg-white dark:bg-slate-700 rounded-lg shadow-sm flex items-center justify-center text-slate-300">
                {settings.upi_id ? (
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${settings.upi_id}`} alt="UPI QR Code" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-center p-4">Enter UPI ID to preview QR</span>
                )}
                </div>
                <p className="text-[10px] text-slate-500 text-center">Clients can scan this QR code to pay instantly via any UPI app.</p>
            </div>
            {user?.role === 'admin' && (
              <div className="pt-4">
                <button onClick={handleSubmit} className="btn-secondary w-full justify-center" disabled={saving}>
                  Update UPI ID
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Stripe Section */}
        <div className="glass-card p-8 border-l-4 border-l-blue-600">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">💳 Stripe (Global Cards)</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Accept major credit and debit cards globally. Payments are automatically recorded and invoices are marked as paid.
            </p>
            {user?.role === 'admin' ? (
              <div className="space-y-4">
                <div>
                  <label className="form-label">Stripe Secret Key</label>
                  <input 
                    className="form-input" 
                    placeholder="sk_test_..."
                    value={settings.stripe_key || ''} 
                    onChange={e => setSettings({...settings, stripe_key: e.target.value})} 
                  />
                </div>
                <button onClick={handleSubmit} className="btn-primary bg-indigo-600 hover:bg-indigo-700 w-full justify-center">Save Stripe Key</button>
              </div>
            ) : (
              <div className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                <span>●</span> Active
              </div>
            )}
        </div>

        {/* Razorpay Section */}
        <div className="glass-card p-8 border-l-4 border-l-emerald-600">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">🇮🇳 Razorpay (India UPI/Cards)</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">Razorpay Key ID</label>
                <input 
                  className="form-input" 
                  placeholder="rzp_test_..."
                  value={settings.razorpay_key} 
                  readOnly={user?.role !== 'admin'}
                  onChange={e => setSettings({...settings, razorpay_key: e.target.value})} 
                />
              </div>
              {user?.role === 'admin' && (
                <button onClick={handleSubmit} className="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full justify-center">Save Razorpay Key</button>
              )}
            </div>
        </div>
      </div>

      {/* Reminders / Twilio Section */}
      {user?.role === 'admin' && (
        <div className="glass-card p-8 border-l-4 border-l-green-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xl">💬</div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">WhatsApp Reminders (Twilio)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Twilio SID</label>
                <input 
                  className="form-input" 
                  value={settings.twilio_sid} 
                  onChange={e => setSettings({...settings, twilio_sid: e.target.value})} 
                />
              </div>
              <div>
                <label className="form-label">Twilio Auth Token</label>
                <input 
                  type="password"
                  className="form-input" 
                  value={settings.twilio_auth} 
                  onChange={e => setSettings({...settings, twilio_auth: e.target.value})} 
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Twilio WhatsApp Number (e.g. whatsapp:+14155238886)</label>
                <input 
                  className="form-input" 
                  placeholder="whatsapp:+1..."
                  value={settings.twilio_from} 
                  onChange={e => setSettings({...settings, twilio_from: e.target.value})} 
                />
              </div>
            </div>
            <div className="mt-6">
              <button onClick={handleSubmit} className="btn-primary bg-green-600 hover:bg-green-700">Save Twilio Config</button>
            </div>
            <p className="mt-4 text-[11px] text-slate-500 italic">This will enable automated WhatsApp reminders for overdue invoices.</p>
        </div>
      )}

      {/* Email / SMTP Section */}
      {user?.role === 'admin' && (
        <div className="glass-card p-8 border-l-4 border-l-blue-400 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">📧</div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Email Configuration (SMTP)</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Use your Gmail or Outlook to send real invoices. For Gmail, use a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Google App Password</a>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">SMTP Email (e.g. Gmail)</label>
                <input 
                  className="form-input" 
                  placeholder="your-email@gmail.com"
                  value={settings.smtp_email} 
                  onChange={e => setSettings({...settings, smtp_email: e.target.value})} 
                />
              </div>
              <div>
                <label className="form-label">SMTP App Password</label>
                <input 
                  type="password"
                  className="form-input" 
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={settings.smtp_password} 
                  onChange={e => setSettings({...settings, smtp_password: e.target.value})} 
                />
              </div>
            </div>
            <div className="mt-6">
              <button onClick={handleSubmit} className="btn-primary bg-blue-600 hover:bg-blue-700">Save SMTP Config</button>
            </div>
        </div>
      )}
    </div>
  );
}
