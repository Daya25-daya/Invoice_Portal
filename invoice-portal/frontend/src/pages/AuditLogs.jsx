import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard.php?action=audit_logs')
      .then(res => setLogs(res.data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading audit logs...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Audit Logs</h1>
        <p className="text-slate-500">Track all administrative and system actions.</p>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <tr>
              <th className="p-4 pl-8">Timestamp</th>
              <th className="p-4">Action</th>
              <th className="p-4 pr-8">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/50">
                <td className="p-4 pl-8 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                    log.action.includes('DELETE') ? 'bg-rose-100 text-rose-600' : 
                    log.action.includes('CREATE') ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-4 pr-8 text-sm text-slate-700">{log.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="3" className="p-20 text-center text-slate-400 italic">No logs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
