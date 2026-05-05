import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getInvoice, updateStatus, deleteInvoice, recordPayment, sendEmail } from '../services/invoiceService';
import { createStripeSession } from '../services/stripeService';
import StatusBadge from '../components/StatusBadge';
import { showToast } from '../components/Toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'Bank Transfer', notes: '' });
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getInvoice(id).then(r => setInv(r.data.invoice)).catch(() => navigate('/invoices')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

  const handleStatus = async (status) => {
    try { await updateStatus(id, status); load(); } catch {}
  };

  const handleDemoPay = async () => {
    try {
      setLoading(true);
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const balance = parseFloat(inv.total) - (parseFloat(inv.total_paid) || 0);
      
      await recordPayment({ 
        invoice_id: parseInt(id), 
        amount: balance, 
        payment_date: new Date().toISOString().split('T')[0], 
        method: 'Demo Payment', 
        notes: 'Simulated online payment' 
      });
      
      showToast('Payment successful! (Simulation)', 'success');
      load();
    } catch (err) {
      showToast('Payment simulation failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!window.confirm('Send this invoice to the client via email?')) return;
    try {
      setLoading(true);
      const res = await sendEmail(id);
      showToast(res.data.message || 'Email sent successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this invoice permanently?')) return;
    try { await deleteInvoice(id); navigate('/invoices'); } catch {}
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPayError('');
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { setPayError('Enter a valid amount.'); return; }
    setPaying(true);
    try {
      await recordPayment({ invoice_id: parseInt(id), ...payForm, amount: parseFloat(payForm.amount) });
      setShowPay(false);
      setPayForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'Bank Transfer', notes: '' });
      load();
    } catch (err) { setPayError(err.response?.data?.error || 'Failed.'); }
    finally { setPaying(false); }
  };

  if (loading) return <div className="flex justify-center py-32"><div className="loading-spinner"></div></div>;
  if (!inv) return null;

  const balance = (parseFloat(inv.total) || 0) - (parseFloat(inv.total_paid) || 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header / Breadcrumb */}
      <div className="flex items-center justify-between mb-2 no-print">
        <Link to="/invoices" className="text-sm font-semibold text-slate-500 hover:text-blue-600 no-underline flex items-center gap-2">
          <span>←</span> Back to Invoices
        </Link>
        <div className="flex gap-2">
           {user?.role === 'admin' && (
              <>
                <button onClick={handlePrint} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 border-none cursor-pointer hover:bg-slate-100 transition-colors">🖨️ Print / Download PDF</button>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/pay/${inv.token}`); showToast('Public link copied to clipboard!', 'success'); }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border-none cursor-pointer hover:bg-emerald-100 transition-colors">🔗 Copy Link</button>
                <button 
                  onClick={() => {
                    const msg = encodeURIComponent(`Hello ${inv.client_name}, your invoice ${inv.invoice_number} from ${inv.admin_company || inv.admin_name} is ready. View and pay here: ${window.location.origin}/pay/${inv.token}`);
                    window.open(`https://wa.me/${inv.client_phone ? inv.client_phone.replace(/\D/g, '') : ''}?text=${msg}`, '_blank');
                  }} 
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-50 text-green-600 border-none cursor-pointer hover:bg-green-100 transition-colors"
                >
                  🟢 WhatsApp
                </button>
                <button onClick={handleSendEmail} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border-none cursor-pointer hover:bg-blue-100 transition-colors">✉️ Send Email</button>
                <button 
                  onClick={async () => {
                    if(!window.confirm('Send automated WhatsApp reminder via Twilio?')) return;
                    setLoading(true);
                    try {
                      const res = await api.post('/reminders.php', { invoice_id: id });
                      showToast(res.data?.message || 'Reminder sent!', 'success');
                    } catch(err) {
                      const errMsg = err.response?.data?.error || err.message || 'Failed to send reminder';
                      showToast(errMsg, 'error');
                    } finally {
                      setLoading(false);
                    }
                  }} 
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border-none cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  🤖 Twilio Reminder
                </button>
                <button onClick={handleDelete} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border-none cursor-pointer hover:bg-rose-100 transition-colors">🗑️ Delete</button>
              </>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Invoice Card */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card overflow-hidden shadow-sm border border-slate-200 animate-fade-in-up">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex justify-between items-center transition-colors">
               <div className="flex items-center gap-4">
                  {inv.admin_logo && <img src={inv.admin_logo} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white p-1" />}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{inv.admin_company || inv.admin_name}</h2>
                    <p className="text-xs text-slate-500">{inv.invoice_number}</p>
                  </div>
               </div>
               <div className="text-right">
                  <StatusBadge status={inv.status} />
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Issue Date</p>
                    <p className="text-sm font-bold text-slate-900">{inv.issue_date}</p>
                  </div>
               </div>
            </div>

            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
               <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 transition-colors">Bill To</h3>
                  <p className="text-lg font-bold text-slate-900 dark:text-white transition-colors">{inv.client_name}</p>
                  {inv.client_company && <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 transition-colors">{inv.client_company}</p>}
                  <div className="mt-3 text-sm text-slate-500 dark:text-slate-400 space-y-1 transition-colors">
                    {inv.client_email && <p>{inv.client_email}</p>}
                    {inv.client_phone && <p>{inv.client_phone}</p>}
                    {inv.client_address && <p className="whitespace-pre-wrap mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">{inv.client_address}</p>}
                  </div>
               </div>
               <div className="sm:text-right flex flex-col justify-end items-end">
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 w-full max-w-[200px] transition-colors">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1 transition-colors">Balance Due</p>
                    <p className="text-2xl font-black text-blue-700 dark:text-blue-300 transition-colors">{fmt(balance)}</p>
                  </div>
               </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-widest transition-colors">
                       <th className="p-6">Description</th>
                       <th className="p-6 text-center">Qty</th>
                       <th className="p-6 text-right">Unit Price</th>
                       <th className="p-6 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(inv.items || []).map((it, i) => (
                      <tr key={i}>
                        <td className="p-6 text-sm font-bold text-slate-800 dark:text-slate-300 transition-colors">{it.description}</td>
                        <td className="p-6 text-sm text-center font-medium text-slate-600 dark:text-slate-400 transition-colors">{it.quantity}</td>
                        <td className="p-6 text-sm text-right font-medium text-slate-600 dark:text-slate-400 transition-colors">{fmt(it.unit_price)}</td>
                        <td className="p-6 text-sm text-right font-bold text-slate-900 dark:text-white transition-colors">{fmt(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            {/* Totals */}
            <div className="p-8 bg-slate-50/30 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col items-end transition-colors">
               <div className="w-full max-w-[280px] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Sub Total</span>
                    <span className="text-slate-900 dark:text-white font-bold transition-colors">{fmt(inv.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Discount ({inv.discount_rate}%)</span>
                    <span className="text-rose-600 font-bold transition-colors">-{fmt(inv.discount_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Tax ({inv.tax_rate}%)</span>
                    <span className="text-slate-900 dark:text-white font-bold transition-colors">{fmt(inv.tax_amount)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center transition-colors">
                    <span className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter transition-colors">Total Amount</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 transition-colors">{fmt(inv.total)}</span>
                  </div>
               </div>
            </div>
            
            {inv.notes && (
              <div className="p-8 border-t border-slate-100 bg-white">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notes & Terms</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{inv.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Payment Info & Actions */}
        <div className="space-y-6 no-print">
          <div className="glass-card p-6 shadow-sm border border-slate-200 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
             <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Payment Summary</h2>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 font-medium">Invoice Total</span>
                   <span className="text-slate-900 font-bold">{fmt(inv.total)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 font-medium">Total Paid</span>
                   <span className="text-emerald-600 font-bold">{fmt(inv.total_paid)}</span>
                </div>
                <div className="pt-4 border-t border-slate-100">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-900">Paid Progress</span>
                      <span className="text-xs font-black text-blue-600">{Math.round(((inv.total_paid || 0) / (inv.total || 1)) * 100)}%</span>
                   </div>
                   <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${Math.min(100, ((inv.total_paid || 0) / (inv.total || 1)) * 100)}%` }}></div>
                   </div>
                </div>
             </div>

             <div className="mt-8 space-y-3">
                {user?.role === 'admin' && inv.status !== 'Paid' && (
                  <>
                    <button onClick={() => setShowPay(true)} className="btn-primary w-full justify-center text-sm py-3">💳 Record Payment</button>
                    {inv.status === 'Draft' && <button onClick={() => handleStatus('Sent')} className="btn-secondary w-full justify-center text-sm py-3">📤 Mark as Sent</button>}
                    {inv.status !== 'Cancelled' && <button onClick={() => handleStatus('Cancelled')} className="btn-secondary w-full justify-center text-sm py-3 text-rose-600 hover:bg-rose-50 border-rose-100">Cancel Invoice</button>}
                  </>
                )}
                {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                  <div className="mt-8 space-y-4 pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Demo Actions (Simulation)</p>
                    
                    <button onClick={handleDemoPay} className="btn-primary w-full justify-center text-sm py-4 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                      Mark as Paid (Demo)
                    </button>
                  </div>
                )}
             </div>
          </div>

          {/* Payment History */}
          {(inv.payments || []).length > 0 && (
            <div className="glass-card p-6 shadow-sm border border-slate-200 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-4">Payment History</h3>
              <div className="space-y-4">
                {inv.payments.map((p, i) => (
                  <div key={i} className="flex flex-col gap-1 pb-4 border-b border-slate-50 last:pb-0 last:border-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-slate-900">{fmt(p.amount)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600">SUCCESS</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{p.payment_date} via {p.method}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPay && (
        <div className="modal-overlay" onClick={() => setShowPay(false)}>
          <div className="modal-content !max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
               <button onClick={() => setShowPay(false)} className="bg-transparent border-none text-slate-400 hover:text-slate-600 text-xl cursor-pointer">✕</button>
            </div>
            
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
               <p className="text-xs font-bold text-amber-700 uppercase mb-1">Balance Due</p>
               <p className="text-2xl font-black text-amber-800">{fmt(balance)}</p>
            </div>

            {payError && <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">{payError}</div>}
            
            <form onSubmit={handlePayment} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amount Paid *</label>
                <input type="number" step="0.01" min="0.01" className="form-input" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Payment Date</label>
                  <input type="date" className="form-input" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Payment Method</label>
                  <select className="form-input" value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                    <option>Bank Transfer</option><option>Cash</option><option>Credit Card</option><option>UPI</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notes (Optional)</label>
                <input className="form-input" placeholder="Ref #, Bank Name, etc." value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1 justify-center py-3" disabled={paying}>{paying ? 'Processing...' : 'Record Payment'}</button>
                <button type="button" onClick={() => setShowPay(false)} className="btn-secondary px-6">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
