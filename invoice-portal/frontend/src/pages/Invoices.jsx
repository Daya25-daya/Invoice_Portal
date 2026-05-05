import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice } from '../services/invoiceService';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = (status) => {
    setLoading(true);
    getInvoices(status).then(r => setInvoices(r.data.invoices || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice permanently?')) return;
    try { await deleteInvoice(id); load(filter); } catch {}
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const filtered = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const statuses = ['', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} total invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'admin' && (
          <Link to="/invoices/create" className="btn-primary no-underline text-sm px-5 py-2.5 sm:w-auto">＋ New Invoice</Link>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <select 
          className="form-input text-sm py-2 px-3 bg-white border-slate-200"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {statuses.filter(s => s !== '').map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text" 
            className="form-input pl-10 text-sm py-2 bg-white border-slate-200"
            placeholder="Search invoice or client..."
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="loading-spinner"></div></div>
      ) : filtered.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block glass-card overflow-hidden animate-fade-in-up shadow-sm border border-slate-200" style={{ animationDelay: '200ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                    <th className="p-4 font-bold">Invoice #</th>
                    <th className="p-4 font-bold">Client</th>
                    <th className="p-4 font-bold">Date</th>
                    <th className="p-4 font-bold">Due Date</th>
                    <th className="p-4 font-bold">Amount</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <span className="text-sm font-bold text-slate-700">{inv.invoice_number}</span>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-600">{inv.client_name}</td>
                      <td className="p-4 text-xs text-slate-500 font-medium">{inv.issue_date}</td>
                      <td className="p-4 text-xs text-slate-500 font-medium">{inv.due_date}</td>
                      <td className="p-4 text-sm font-bold text-slate-900">{fmt(inv.total)}</td>
                      <td className="p-4"><StatusBadge status={inv.status} /></td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link to={`/invoices/${inv.id}`} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors no-underline" title="View">
                            👁️
                          </Link>
                          {user?.role === 'admin' && (
                            <button onClick={() => handleDelete(inv.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors border-none cursor-pointer" title="Delete">
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {filtered.map(inv => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="glass-card p-4 block no-underline border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{inv.client_name}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Due: {inv.due_date}</p>
                  </div>
                  <p className="text-base font-bold text-slate-900">{fmt(inv.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card p-12 sm:p-20 text-center border-slate-200">
          <p className="text-5xl mb-4">📄</p>
          <p className="text-slate-500 font-medium">{search || filter ? 'No matches found.' : 'No invoices here yet.'}</p>
        </div>
      )}
    </div>
  );
}
