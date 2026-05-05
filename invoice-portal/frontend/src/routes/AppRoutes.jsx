import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import ClientDashboard from '../pages/ClientDashboard';
import Settings from '../pages/Settings';
import Clients from '../pages/Clients';
import Invoices from '../pages/Invoices';
import CreateInvoice from '../pages/CreateInvoice';
import InvoiceDetail from '../pages/InvoiceDetail';
import PaymentSuccess from '../pages/PaymentSuccess';
import PaymentSettings from '../pages/PaymentSettings';
import Products from '../pages/Products';
import AuditLogs from '../pages/AuditLogs';
import Staff from '../pages/Staff';
import PublicInvoice from '../pages/PublicInvoice';
import ClientLogin from '../pages/ClientLogin';

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Debug Role Info */}
      {/* <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-[10px] z-[9999] rounded">
        User: {user?.name} | Role: {user?.role} | IsAdmin: {user?.role === 'admin' ? 'YES' : 'NO'}
      </div> */}
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/client-login" element={user ? <Navigate to="/" replace /> : <ClientLogin />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/pay/:token" element={<PublicInvoice />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={['admin', 'staff'].includes(user?.role?.toLowerCase()) ? <Dashboard /> : <ClientDashboard />} />
        <Route path="/clients" element={['admin', 'staff'].includes(user?.role?.toLowerCase()) ? <Clients /> : <Navigate to="/" />} />
        <Route path="/products" element={['admin', 'staff'].includes(user?.role?.toLowerCase()) ? <Products /> : <Navigate to="/" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/create" element={['admin', 'staff'].includes(user?.role?.toLowerCase()) ? <CreateInvoice /> : <Navigate to="/invoices" />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment-settings" element={<PaymentSettings />} />
        <Route path="/audit-logs" element={user?.role === 'admin' ? <AuditLogs /> : <Navigate to="/" />} />
        <Route path="/staff" element={user?.role === 'admin' ? <Staff /> : <Navigate to="/" />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
