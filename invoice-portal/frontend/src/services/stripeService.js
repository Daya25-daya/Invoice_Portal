import api from './api';

export const createStripeSession = (invoiceId) => {
  return api.post('/checkout.php?action=create_session', { invoice_id: invoiceId });
};

export const verifyStripeSession = (sessionId, invoiceId) => {
  return api.post('/checkout.php?action=verify_session', { session_id: sessionId, invoice_id: invoiceId });
};
