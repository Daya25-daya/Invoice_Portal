import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => {
    setLoading(true);
    api.get('/staff.php')
      .then(res => setStaff(res.data.staff || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/staff.php', newStaff);
      setMsg({ type: 'success', text: 'Staff member added successfully!' });
      setShowAdd(false);
      setNewStaff({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to add staff.' });
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    try {
      await api.delete(`/staff.php?id=${id}`);
      load();
    } catch (err) {
      alert('Failed to remove.');
    }
  };

  if (loading) return <div className="p-20 text-center">Loading staff list...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Team Management</h1>
          <p className="text-slate-500">Manage your staff members and their access.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">＋ Add Staff Member</button>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl border ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} text-sm font-medium`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(s => (
          <div key={s.id} className="glass-card p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold mb-4">
              {s.name.charAt(0)}
            </div>
            <h3 className="font-bold text-slate-900">{s.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{s.email}</p>
            <div className="flex gap-2 w-full pt-4 border-t border-slate-50">
              <button className="flex-1 text-xs font-bold py-2 rounded-lg bg-slate-50 text-slate-600 border-none cursor-pointer hover:bg-slate-100">View Logs</button>
              <button onClick={() => handleRemove(s.id)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-rose-50 text-rose-600 border-none cursor-pointer hover:bg-rose-100">Remove</button>
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 italic">No staff members added yet.</div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content !max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">Add New Staff Member</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} required />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} required />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-input" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                  <option value="staff">Staff (Can manage invoices)</option>
                  <option value="client">Client (Can only pay invoices)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Default Password</label>
                <input type="password" placeholder="Staff123!" className="form-input" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="btn-primary flex-1 justify-center py-3">Add Member</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
