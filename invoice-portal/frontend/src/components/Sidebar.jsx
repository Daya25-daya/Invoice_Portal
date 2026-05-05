import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'Dashboard', icon: '📊', roles: ['admin', 'staff'] },
    { to: '/', label: 'My Invoices', icon: '📄', roles: ['client'] },
    { to: '/clients', label: 'Clients', icon: '👥', roles: ['admin', 'staff'] },
    { to: '/products', label: 'Products', icon: '📦', roles: ['admin', 'staff'] },
    { to: '/invoices', label: 'Invoices', icon: '📄', roles: ['admin', 'staff'] },
    { to: '/staff', label: 'Team', icon: '🤝', roles: ['admin'] },
    { to: '/audit-logs', label: 'Audit Logs', icon: '🔎', roles: ['admin'] },
    { to: '/payment-settings', label: 'Payment Methods', icon: '💳', roles: ['admin', 'client'] },
    { to: '/settings', label: 'Settings', icon: '⚙️', roles: ['admin', 'client', 'staff'] },
  ];

  const currentUserRole = user?.role?.toLowerCase()?.trim();
  const visibleLinks = links.filter(l => l.roles.includes(currentUserRole));
  const isActive = (path) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0f172a] text-white">
      <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
          IF
        </div>
        <span className="text-lg sm:text-xl font-bold text-white truncate">Invoice Portal</span>
      </div>

      <div className="flex-1 py-4 sm:py-6 px-3 sm:px-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 sm:mb-4 px-2">Menu</div>
        {visibleLinks.map(link => (
          <Link
            key={link.to + link.label}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 sm:py-2.5 rounded-lg text-sm font-medium transition-colors no-underline
              ${isActive(link.to)
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>

      <div className="p-3 sm:p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 font-medium hover:bg-slate-800 hover:text-white rounded-lg transition-colors border-none cursor-pointer bg-transparent"
        >
          <span className="text-lg">{isDark ? '☀️' : '🌙'}</span> {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold uppercase shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 font-medium hover:bg-slate-800 hover:text-white rounded-lg transition-colors border-none cursor-pointer bg-transparent"
        >
          <span className="text-lg">🚪</span> Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden bg-[#0f172a] text-white border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">IF</div>
          <span className="font-bold text-white text-sm">Invoice Portal</span>
        </div>
        <button 
          onClick={() => setMobileOpen(true)} 
          className="w-10 h-10 flex items-center justify-center text-slate-300 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-800 transition-colors text-xl"
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Overlay Sidebar */}
      {mobileOpen && (
        <>
          <div className="sidebar-overlay md:hidden" onClick={() => setMobileOpen(false)}></div>
          <div className="sidebar-drawer md:hidden">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 bg-slate-800 rounded-lg border-none cursor-pointer z-10 hover:bg-slate-700 transition-colors"
              aria-label="Close menu"
            >
              ✕
            </button>
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
