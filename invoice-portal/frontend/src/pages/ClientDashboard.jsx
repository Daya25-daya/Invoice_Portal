import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices } from '../services/invoiceService';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoices().then(res => setInvoices(res.data.invoices || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const totalInvoices = invoices.length;
  const pendingAmount = invoices.reduce((acc, inv) => inv.status !== 'Paid' && inv.status !== 'Cancelled' ? acc + (parseFloat(inv.total) || 0) : acc, 0);
  const paidCount = invoices.filter(inv => inv.status === 'Paid').length;

  if (loading) return <div className="flex justify-center py-32"><div className="loading-spinner"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-1 transition-colors">Client Portal</h1>
        <p className="text-slate-500 dark:text-slate-400 transition-colors">Welcome back, {user?.name}. Here is an overview of your account.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard icon="📄" label="Total Invoices" value={totalInvoices} color="indigo" delay={0} />
        <StatCard icon="⌛" label="Outstanding Balance" value={fmt(pendingAmount)} color="amber" delay={100} />
        <StatCard icon="✅" label="Paid Invoices" value={paidCount} color="emerald" delay={200} />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center justify-between transition-colors">
          <h2 className="text-base font-bold text-slate-800 dark:text-white transition-colors">My Recent Invoices</h2>
          <Link to="/invoices" className="text-xs font-bold text-blue-600 hover:text-blue-700 no-underline">View Detailed List →</Link>
        </div>
          <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-widest transition-colors">
                <th className="p-4 sm:p-6 pl-6 sm:pl-8">Invoice #</th>
                <th className="p-4 sm:p-6">Amount</th>
                <th className="p-4 sm:p-6">Due Date</th>
                <th className="p-4 sm:p-6">Status</th>
                <th className="p-4 sm:p-6 pr-6 sm:pr-8 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 sm:p-6 pl-6 sm:pl-8 font-bold text-slate-700 dark:text-slate-300 transition-colors">{inv.invoice_number}</td>
                  <td className="p-4 sm:p-6 text-sm font-bold text-slate-900 dark:text-white transition-colors">{fmt(inv.total)}</td>
                  <td className="p-4 sm:p-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">{inv.due_date}</td>
                  <td className="p-4 sm:p-6"><StatusBadge status={inv.status} /></td>
                  <td className="p-4 sm:p-6 pr-6 sm:pr-8 text-center">
                    <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-500 font-bold text-sm no-underline">
                      View & Pay →
                    </Link>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-16 sm:p-20 text-center text-slate-400 italic text-sm">No invoices found in your account.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden p-3 space-y-3">
            {invoices.map(inv => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="block p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 no-underline">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Due: {inv.due_date}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900 dark:text-white">{fmt(inv.total)}</span>
                  <span className="text-xs font-bold text-blue-600">View & Pay →</span>
                </div>
              </Link>
            ))}
            {invoices.length === 0 && (
              <div className="p-12 text-center text-slate-400 italic text-sm">No invoices found.</div>
            )}
          </div>
      </div>
    </div>
  );
}
