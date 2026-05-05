import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ ...form });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* Left Panel - Blue Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-700 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-4xl mb-8 mx-auto backdrop-blur-sm border border-white/20">
            🏢
          </div>
          <h1 className="text-4xl font-bold mb-4">Create Your Account</h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Start managing your invoices today.
          </p>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
           <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
           <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-blue-900/50 to-transparent"></div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-12">
        <div className="w-full max-w-md animate-fade-in-up">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">Register</h2>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg border text-sm animate-slide-down bg-rose-50 border-rose-100 text-rose-600 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors" htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type="password"
                  className="form-input"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full justify-center text-base py-3 rounded-lg font-medium text-white transition-colors flex items-center gap-2 border-none cursor-pointer bg-blue-700 hover:bg-blue-800 mt-2" 
              disabled={loading}
            >
              {loading ? <span className="loading-spinner" style={{ width: '1.25rem', height: '1.25rem' }}></span> : 'Register'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-8 transition-colors">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold no-underline text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
