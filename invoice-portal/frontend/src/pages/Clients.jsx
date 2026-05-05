import { useState, useEffect } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../services/clientService';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    getClients().then(r => setClients(r.data.clients || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', email: '', phone: '', company: '', address: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '', address: c.address || '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Client name is required.'); return; }
    setSaving(true);
    try {
      if (editId) { await updateClient(editId, form); }
      else { await createClient(form); }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save client.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client? This will also delete all their invoices.')) return;
    try { await deleteClient(id); load(); } catch {}
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Clients</h1>
          <p className="text-slate-500">{clients.length} total client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary no-underline text-sm px-5 py-2.5">
          ＋ Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          className="form-input pl-10 text-sm py-2.5 bg-white border-slate-200"
          placeholder="Search clients by name, email, or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="loading-spinner"></div></div>
      ) : filtered.length > 0 ? (
        <div className="glass-card overflow-hidden animate-fade-in-up shadow-sm border border-slate-200" style={{ animationDelay: '200ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="p-4 font-bold">#</th>
                  <th className="p-4 font-bold">Client Name</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold">Phone</th>
                  <th className="p-4 font-bold">Company</th>
                  <th className="p-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-bold text-slate-400">{i + 1}</td>
                    <td className="p-4 text-sm font-bold text-slate-800">{c.name}</td>
                    <td className="p-4 text-sm text-slate-600">{c.email || '—'}</td>
                    <td className="p-4 text-sm text-slate-600">{c.phone || '—'}</td>
                    <td className="p-4 text-sm font-medium text-slate-500">{c.company || '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openEdit(c)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors border-none cursor-pointer" title="Edit">
                           ✏️
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors border-none cursor-pointer" title="Delete">
                           🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card p-20 text-center border-slate-200">
          <p className="text-5xl mb-4">👥</p>
          <p className="text-slate-500 font-medium">{search ? 'No matches found.' : 'No clients yet.'}</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content !max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{editId ? 'Edit Client' : 'New Client'}</h2>
              <button onClick={() => setShowModal(false)} className="bg-transparent border-none text-slate-400 hover:text-slate-600 text-xl cursor-pointer">✕</button>
            </div>
            {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 00000 00000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Company</label>
                <input className="form-input" value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Company Name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Address</label>
                <textarea className="form-input" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Billing Address" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1 justify-center py-3" disabled={saving}>
                  {saving ? 'Saving...' : (editId ? 'Update Client' : 'Add Client')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-6">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
