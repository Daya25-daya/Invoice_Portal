export default function StatCard({ icon, label, value, color, delay }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
  };

  return (
    <div 
      className="glass-card p-6 flex items-center justify-between animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-white mb-1 transition-colors">{value}</p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">{label}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm transition-colors ${colors[color] || colors.blue}`}>
        {icon}
      </div>
    </div>
  );
}
