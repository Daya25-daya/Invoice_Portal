import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function PublicInvoice() {
  const { token } = useParams();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public_invoice.php?token=${token}`)
      .then(res => setInv(res.data.invoice))
      .catch(err => setError(err.response?.data?.error || 'Invoice not found'))
      .finally(() => setLoading(false));
  }, [token]);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

  const handlePrint = () => window.print();

  const handleStripeCheckout = async () => {
    try {
      setLoading(true);
      const res = await api.post('/checkout.php?action=create_session', { invoice_id: inv.id });
      window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initiate Stripe checkout');
      setLoading(false);
    }
  };

  const handleRazorpay = async () => {
    try {
      setLoading(true);
      const orderRes = await api.post('/razorpay.php?action=create_order', { invoice_id: inv.id });
      const orderData = orderRes.data;

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.invoice_number,
        description: 'Invoice Payment',
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            await api.post('/razorpay.php?action=verify_payment', {
              invoice_id: inv.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            alert('Payment Successful!');
            window.location.reload();
          } catch (err) {
            alert('Verification failed. Please contact support.');
          }
        },
        prefill: {
          name: inv.client_name,
          email: inv.client_email,
          contact: inv.client_phone
        },
        theme: { color: '#2563eb' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.error || 'Razorpay is not enabled for this business.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-32"><div className="loading-spinner"></div></div>;
  if (error) return <div className="p-20 text-center text-rose-500 font-bold">{error}</div>;
  if (!inv) return null;

  const balance = (parseFloat(inv.total) || 0) - (parseFloat(inv.total_paid) || 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between mb-2 no-print">
        <div className="text-xl font-black tracking-tighter text-slate-800">
           {inv.admin_company || inv.admin_name}
        </div>
        <button onClick={handlePrint} className="text-xs font-bold px-4 py-2 rounded-lg bg-blue-600 text-white border-none cursor-pointer hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
           🖨️ Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Invoice Card */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card overflow-hidden shadow-sm border border-slate-200 animate-fade-in-up">
            <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center transition-colors">
               <div className="flex items-center gap-4">
                  {inv.admin_logo && <img src={inv.admin_logo} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white p-1" />}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{inv.admin_company || inv.admin_name}</h2>
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
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Bill To</h3>
                  <p className="text-lg font-bold text-slate-900">{inv.client_name}</p>
                  {inv.client_company && <p className="text-sm font-semibold text-slate-600">{inv.client_company}</p>}
                  <div className="mt-3 text-sm text-slate-500 space-y-1">
                    {inv.client_email && <p>{inv.client_email}</p>}
                    {inv.client_phone && <p>{inv.client_phone}</p>}
                    {inv.client_address && <p className="whitespace-pre-wrap mt-2 pt-2 border-t border-slate-100">{inv.client_address}</p>}
                  </div>
               </div>
               <div className="sm:text-right flex flex-col justify-end items-end">
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 w-full max-w-[200px]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Balance Due</p>
                    <p className="text-2xl font-black text-blue-700">{fmt(balance)}</p>
                  </div>
               </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-y border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                       <th className="p-6">Description</th>
                       <th className="p-6 text-center">Qty</th>
                       <th className="p-6 text-right">Unit Price</th>
                       <th className="p-6 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(inv.items || []).map((it, i) => (
                      <tr key={i}>
                        <td className="p-6 text-sm font-bold text-slate-800">{it.description}</td>
                        <td className="p-6 text-sm text-center font-medium text-slate-600">{it.quantity}</td>
                        <td className="p-6 text-sm text-right font-medium text-slate-600">{fmt(it.unit_price)}</td>
                        <td className="p-6 text-sm text-right font-bold text-slate-900">{fmt(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            {/* Totals */}
            <div className="p-8 bg-slate-50/30 border-t border-slate-100 flex flex-col items-end">
               <div className="w-full max-w-[280px] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Sub Total</span>
                    <span className="text-slate-900 font-bold">{fmt(inv.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Discount ({inv.discount_rate}%)</span>
                    <span className="text-rose-600 font-bold">-{fmt(inv.discount_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Tax ({inv.tax_rate}%)</span>
                    <span className="text-slate-900 font-bold">{fmt(inv.tax_amount)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Total Amount</span>
                    <span className="text-2xl font-black text-blue-600">{fmt(inv.total)}</span>
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

        {/* Sidebar: Payment Actions */}
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
             </div>

             {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                <div className="mt-8 space-y-4 pt-6 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pay Securely Online</p>
                  
                  {inv.has_stripe && (
                    <button onClick={handleStripeCheckout} className="btn-primary w-full justify-center text-sm py-4 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                      Pay via Card (Stripe)
                    </button>
                  )}
                  
                  {inv.has_razorpay && (
                    <button onClick={handleRazorpay} className="btn-primary w-full justify-center text-sm py-4 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                      Pay via UPI / Wallet (Razorpay)
                    </button>
                  )}

                  {!inv.has_stripe && !inv.has_razorpay && (
                     <div className="p-4 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium text-center">
                        Online payments are currently unavailable for this invoice. Please contact the sender.
                     </div>
                  )}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
