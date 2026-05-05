import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyStripeSession } from '../services/stripeService';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const verified = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const invoiceId = searchParams.get('invoice_id');

    if (!sessionId || !invoiceId) {
      setStatus('error');
      setMessage('Invalid payment parameters.');
      return;
    }

    if (verified.current) return;
    verified.current = true;

    verifyStripeSession(sessionId, invoiceId)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Payment verified successfully!');
        // Redirect back to invoice after 3 seconds
        setTimeout(() => {
          navigate(`/invoices/${invoiceId}`);
        }, 3000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Failed to verify payment.');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="glass-card max-w-md w-full p-8 text-center animate-fade-in-up">
        {status === 'verifying' && (
          <>
            <div className="loading-spinner mx-auto mb-4 border-blue-600"></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifying Payment</h2>
            <p className="text-slate-500">Please wait while we confirm your payment with Stripe...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h2>
            <p className="text-slate-500 mb-6">{message}</p>
            <p className="text-sm text-slate-400">Redirecting you back to your invoice...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-4">
              ✕
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Verification Failed</h2>
            <p className="text-slate-500 mb-6">{message}</p>
            <Link to="/invoices" className="btn-primary no-underline inline-block">Return to Invoices</Link>
          </>
        )}
      </div>
    </div>
  );
}
