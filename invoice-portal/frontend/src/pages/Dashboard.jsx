// v2.1 - Enhanced Analytics
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../services/invoiceService';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(res => setData(res.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const graphData = data?.revenue_trend?.length > 0 ? data.revenue_trend : [
    { month: 'Jan', total: 0 }, { month: 'Feb', total: 0 }, { month: 'Mar', total: 0 },
    { month: 'Apr', total: 0 }, { month: 'May', total: 0 }, { month: 'Jun', total: 0 },
  ];

  const statusData = [
    { name: 'Paid', value: data?.status_counts?.Paid || 0, color: '#10b981' },
    { name: 'Pending', value: data?.status_counts?.Pending || 0, color: '#f59e0b' },
    { name: 'Overdue', value: data?.status_counts?.Overdue || 0, color: '#ef4444' },
    { name: 'Draft', value: data?.status_counts?.Draft || 0, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  if (statusData.length === 0) statusData.push({ name: 'No Data', value: 1, color: '#f1f5f9' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-600 uppercase tracking-widest">
              {user?.role === 'admin' ? 'Admin Control' : 'Staff Access'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white transition-colors">Business Overview</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 transition-colors">Welcome back, {user?.name}. Manage your invoices and analytics here.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/invoices/create" className="btn-primary no-underline text-sm px-6 py-3 shadow-lg shadow-blue-100">
            ＋ Create New Invoice
          </Link>
        </div>
      </div>

      {/* Stat Cards - 4 in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon="💰" label="Total Revenue" value={fmt(data?.total_revenue)} color="emerald" delay={0} />
        <StatCard icon="⌛" label="Pending Payments" value={fmt(data?.pending_amount)} color="amber" delay={100} />
        <StatCard icon="👥" label="Total Clients" value={data?.total_clients || 0} color="indigo" delay={200} />
        <StatCard icon="✅" label="Transactions" value={data?.total_transactions || 0} color="blue" delay={300} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Recent Invoices Table (Full Width style) */}
        <div className="lg:col-span-3 space-y-8">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            {/* Revenue Graph */}
            <div className="lg:col-span-2 glass-card p-4 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight transition-colors">Revenue Analytics</h2>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span> Last 6 Months
                </div>
              </div>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={32}>
                      {graphData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === graphData.length - 1 ? '#2563eb' : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="glass-card p-4 sm:p-8 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight mb-8 transition-colors">Invoice Status</h2>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Invoices */}
            <div className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 transition-colors">
                <h2 className="text-base font-bold text-slate-800 dark:text-white transition-colors">Recent Invoices</h2>
                <Link to="/invoices" className="text-xs font-bold text-blue-600 hover:text-blue-700 no-underline">View All →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <tr>
                      <th className="p-4 pl-8">Invoice</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4 pr-8">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {data?.recent_invoices?.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 pl-8 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors">{inv.invoice_number}</td>
                        <td className="p-4 text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors">{inv.client_name}</td>
                        <td className="p-4 text-sm font-bold text-slate-900 dark:text-white transition-colors">{fmt(inv.total)}</td>
                        <td className="p-4 pr-8"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '600ms' }}>
              <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 transition-colors">
                <h2 className="text-base font-bold text-slate-800 dark:text-white transition-colors">Transaction History</h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Updates</span>
              </div>
              <div className="p-4 space-y-3">
                {data?.recent_payments?.length > 0 ? data.recent_payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black transition-colors">₹</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white transition-colors">{p.client_name}</p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">{p.payment_date} via {p.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">+{fmt(p.amount)}</p>
                      <p className="text-[10px] font-bold text-slate-400">{p.invoice_number}</p>
                    </div>
                  </div>
                )) : <div className="py-20 text-center text-slate-400 italic text-sm">No recent transactions.</div>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Aging Report */}
            <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '650ms' }}>
              <h2 className="text-base font-bold text-slate-800 dark:text-white mb-6">Aging Report (Overdue)</h2>
              <div className="space-y-4">
                {Object.entries(data?.aging_report || {}).map(([range, amount]) => (
                  <div key={range}>
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-widest">{range} Days</span>
                      <span className="font-black text-rose-600">{fmt(amount)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, (amount / (data?.overdue_amount || 1)) * 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Clients */}
            <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '680ms' }}>
              <h2 className="text-base font-bold text-slate-800 dark:text-white mb-6">Top Clients by Revenue</h2>
              <div className="space-y-4">
                {data?.top_clients?.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{i+1}</div>
                      <span className="text-sm font-bold text-slate-700">{c.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{fmt(c.total_spent)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profitability Card */}
            <div className="glass-card p-8 bg-emerald-50/30 border-emerald-100/50 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
              <h2 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-4">Net Profit</h2>
              <p className="text-4xl font-black text-emerald-600 mb-2">{fmt(data?.net_profit)}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{data?.profit_margin?.toFixed(1)}% Margin</span>
              </div>
            </div>

            {/* LTV Card */}
            <div className="glass-card p-8 bg-blue-50/30 border-blue-100/50 animate-fade-in-up" style={{ animationDelay: '750ms' }}>
              <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4">Customer LTV</h2>
              <p className="text-4xl font-black text-blue-600 mb-2">{fmt(data?.ltv)}</p>
              <p className="text-xs text-blue-700 font-medium italic">Average revenue per client</p>
            </div>

            {/* Cost Summary */}
            <div className="glass-card p-8 bg-slate-50/30 border-slate-100/50 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Total COGS</h2>
              <p className="text-4xl font-black text-slate-700 mb-2">{fmt(data?.estimated_cost)}</p>
              <p className="text-xs text-slate-500 font-medium">Estimated cost of goods sold</p>
            </div>
          </div>

          {/* User Interaction Analysis - Unified Feed */}
          <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Interaction Analysis</h2>
            <div className="space-y-6">
              {[...(data?.recent_invoices || []).map(i => ({ ...i, type: 'invoice' })), ...(data?.recent_payments || []).map(p => ({ ...p, type: 'payment' }))].sort((a, b) => new Date(b.created_at || b.payment_date) - new Date(a.created_at || a.payment_date)).slice(0, 6).map((item, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== 5 && <div className="absolute top-8 left-4 w-px h-full bg-slate-100 dark:bg-slate-800"></div>}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${item.type === 'invoice' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {item.type === 'invoice' ? '📄' : '💰'}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {item.type === 'invoice' ? `New Invoice Created: ${item.invoice_number}` : `Payment Received from ${item.client_name}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.type === 'invoice' ? `Billed to ${item.client_name} for ${fmt(item.total)}` : `Received ${fmt(item.amount)} via ${item.method}`}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{item.created_at || item.payment_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
