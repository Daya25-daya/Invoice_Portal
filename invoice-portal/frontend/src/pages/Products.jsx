import { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import { useAuth } from '../context/AuthContext';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', description: '', price: '', tax_rate: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProducts();
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) { await updateProduct(form); }
      else { await createProduct(form); }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const openNew = () => {
    setForm({ id: '', name: '', description: '', price: '', tax_rate: '' });
    setEditing(false);
    setError('');
    setShowModal(true);
  };

  const openEdit = (p) => {
    setForm(p);
    setEditing(true);
    setError('');
    setShowModal(true);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (user?.role !== 'admin') return <div className="p-8 text-center text-rose-500 font-bold">Unauthorized Access</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Products & Services</h1>
          <p className="text-slate-500">{products.length} total item{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew} className="btn-primary no-underline text-sm px-5 py-2.5">
          ＋ Add Item
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input 
          type="text" 
          placeholder="Search products or services..." 
          className="form-input pl-10 text-sm py-2.5 bg-white border-slate-200" 
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
                  <th className="p-4 font-bold">Item Name</th>
                  <th className="p-4 font-bold">Description</th>
                  <th className="p-4 font-bold">Price</th>
                  <th className="p-4 font-bold">Tax</th>
                  <th className="p-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                       <p className="text-sm font-bold text-slate-800">{p.name}</p>
                    </td>
                    <td className="p-4">
                       <p className="text-xs text-slate-500 truncate max-w-xs">{p.description || '—'}</p>
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-900">₹{Number(p.price).toLocaleString()}</td>
                    <td className="p-4 text-xs font-bold text-slate-500">{Number(p.tax_rate) > 0 ? `${Number(p.tax_rate)}%` : '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors border-none cursor-pointer" title="Edit">✏️</button>
                        <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors border-none cursor-pointer" title="Delete">🗑️</button>
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
          <p className="text-5xl mb-4">📦</p>
          <p className="text-slate-500 font-medium">{search ? 'No items match your search.' : 'No items yet.'}</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content !max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{editing ? 'Edit Item' : 'New Item'}</h2>
              <button onClick={() => setShowModal(false)} className="bg-transparent border-none text-slate-400 hover:text-slate-600 text-xl cursor-pointer">✕</button>
            </div>
            {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Item Name *</label>
                <input type="text" className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Website Design" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                <textarea className="form-input" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What's included?"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Base Price *</label>
                  <input type="number" step="0.01" className="form-input" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tax Rate (%)</label>
                  <input type="number" step="0.01" className="form-input" placeholder="e.g. 18" value={form.tax_rate} onChange={e => setForm({...form, tax_rate: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1 justify-center py-3">
                  {editing ? 'Save Changes' : 'Add Item'}
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
