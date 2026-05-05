import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients } from '../services/clientService';
import { createInvoice, sendEmail } from '../services/invoiceService';
import { getProducts } from '../services/productService';

const emptyItem = { description: '', quantity: 1, unit_price: 0 };

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: '', issue_date: new Date().toISOString().split('T')[0],
    due_date: '', tax_rate: 0, discount_rate: 0, notes: '',
    is_recurring: false, recurring_frequency: 'monthly',
    send_email: true
  });
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getClients().catch(() => ({ data: { clients: [] } })),
      getProducts().catch(() => ({ data: [] }))
    ]).then(([clientsRes, productsRes]) => {
      setClients(clientsRes.data.clients || []);
      setProducts(productsRes.data || []);
    });
  }, []);

  const updateItem = (i, field, value) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [field]: value };
    setItems(copy);
  };

  const handleProductSelect = (i, productId) => {
    const p = products.find(prod => prod.id == productId);
    if (p) {
      const copy = [...items];
      copy[i] = { ...copy[i], description: p.name, unit_price: p.price };
      if (Number(p.tax_rate) > 0 && Number(form.tax_rate) === 0) {
        setForm(prev => ({ ...prev, tax_rate: p.tax_rate }));
      }
      setItems(copy);
    }
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0);
  const discountAmt = subtotal * ((parseFloat(form.discount_rate) || 0) / 100);
  const taxableAmt = subtotal - discountAmt;
  const taxAmt = taxableAmt * ((parseFloat(form.tax_rate) || 0) / 100);
  const total = taxableAmt + taxAmt;
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.client_id) { setError('Please select a client.'); return; }
    if (!form.due_date) { setError('Please set a due date.'); return; }
    if (items.some(it => !it.description.trim())) { setError('All items need a description.'); return; }
    setSaving(true);
    try {
      const res = await createInvoice({ ...form, items });
      
      if (form.send_email && res.data?.invoice_id) {
        try {
          await sendEmail(res.data.invoice_id);
        } catch (err) {
          console.error("Failed to send automatic email:", err);
        }
      }

      navigate(`/invoices/${res.data.invoice_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice.');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Create Invoice</h1>
          <p className="text-slate-500">Generate a new billing request for your client</p>
        </div>
        <button type="button" onClick={() => navigate('/invoices')} className="text-sm font-semibold text-slate-500 hover:text-slate-700 bg-transparent border-none cursor-pointer underline">
          Cancel & Exit
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium animate-slide-down">{error}</div>}

        {/* Invoice Details Card */}
        <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Client & Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Client *</label>
              <select className="form-input bg-slate-50" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required>
                <option value="">Choose a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Issue Date</label>
              <input type="date" className="form-input bg-slate-50" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Due Date *</label>
              <input type="date" className="form-input bg-slate-50 border-blue-100 focus:border-blue-600" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Line Items</h2>
            <button type="button" onClick={addItem} className="text-xs font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors border-none cursor-pointer">
              ＋ Add New Row
            </button>
          </div>
          
          <div className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="p-6">Item Description</th>
                  <th className="p-6 w-24 text-center">Qty</th>
                  <th className="p-6 w-40 text-right">Price</th>
                  <th className="p-6 w-40 text-right">Amount</th>
                  <th className="p-6 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, i) => (
                  <tr key={i} className="group">
                    <td className="p-6 align-top">
                      <div className="space-y-2">
                        <select 
                          className="w-full text-xs p-2 rounded bg-slate-100 border-none text-slate-600 focus:ring-1 focus:ring-blue-500"
                          onChange={e => handleProductSelect(i, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Load from saved products...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
                        </select>
                        <input className="form-input !text-sm" placeholder="Enter item name or description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                      </div>
                    </td>
                    <td className="p-6 align-top">
                      <input type="number" min="1" className="form-input text-center !text-sm" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                    </td>
                    <td className="p-6 align-top">
                      <input type="number" step="0.01" className="form-input text-right !text-sm" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                    </td>
                    <td className="p-6 align-top text-right">
                      <span className="text-sm font-bold text-slate-900 block mt-2">
                        {fmt((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                      </span>
                    </td>
                    <td className="p-6 align-top text-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="mt-1 w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors border-none cursor-pointer">
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer: Notes & Recurring & Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Additional Info</h2>
              <textarea className="form-input" rows={4} placeholder="Terms, notes, or payment instructions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
              <div className="flex items-center gap-4">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="is_recurring" 
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    checked={form.is_recurring}
                    onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
                  />
                </div>
                <label htmlFor="is_recurring" className="text-sm font-bold text-slate-800 cursor-pointer">Enable Recurring Billing</label>
              </div>
              
              {form.is_recurring && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-slide-down">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Repeat Frequency</label>
                  <select className="form-input bg-slate-50" value={form.recurring_frequency} onChange={e => setForm({ ...form, recurring_frequency: e.target.value })}>
                    <option value="weekly">Every Week</option>
                    <option value="monthly">Every Month</option>
                    <option value="yearly">Every Year</option>
                  </select>
                  <p className="mt-3 text-[11px] text-slate-500 font-medium">A new invoice will be generated automatically based on this schedule.</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-8 bg-blue-50/30 border-blue-100/50 animate-fade-in-up h-fit" style={{ animationDelay: '400ms' }}>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 text-right">Invoice Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Sub Total</span>
                <span className="text-slate-900 font-bold">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                   <span className="text-slate-500 font-medium">Discount Rate</span>
                   <div className="flex items-center border border-slate-200 rounded overflow-hidden">
                      <input type="number" min="0" max="100" className="w-12 text-center text-xs py-1 px-1 bg-white border-none focus:ring-0" value={form.discount_rate} onChange={e => setForm({ ...form, discount_rate: e.target.value })} />
                      <span className="bg-slate-100 px-2 py-1 text-[10px] font-bold">%</span>
                   </div>
                </div>
                <span className="text-rose-600 font-bold">-{fmt(discountAmt)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                   <span className="text-slate-500 font-medium">Tax Rate</span>
                   <div className="flex items-center border border-slate-200 rounded overflow-hidden">
                      <input type="number" min="0" max="100" className="w-12 text-center text-xs py-1 px-1 bg-white border-none focus:ring-0" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} />
                      <span className="bg-slate-100 px-2 py-1 text-[10px] font-bold">%</span>
                   </div>
                </div>
                <span className="text-slate-900 font-bold">{fmt(taxAmt)}</span>
              </div>
              <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Grand Total</span>
                <span className="text-3xl font-black text-blue-600 tracking-tighter">{fmt(total)}</span>
              </div>
            </div>
            
            <div className="mt-6 flex items-center gap-3">
               <input 
                 type="checkbox" 
                 id="send_email_now" 
                 className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 checked={form.send_email}
                 onChange={e => setForm({...form, send_email: e.target.checked})}
               />
               <label htmlFor="send_email_now" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Send Invoice to Client via Email immediately
               </label>
            </div>

            <button type="submit" className="w-full btn-primary text-base py-4 mt-8 flex justify-center items-center gap-2 shadow-lg shadow-blue-200" disabled={saving}>
               {saving ? 'Creating Invoice...' : <><span className="text-xl">📄</span> Create & Save Invoice</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
