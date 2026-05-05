import api from './api';

export const getInvoices    = (status)   => api.get('/invoices.php' + (status ? `?status=${status}` : ''));
export const getInvoice     = (id)       => api.get(`/invoices.php?id=${id}`);
export const createInvoice  = (data)     => api.post('/invoices.php', data);
export const updateInvoice  = (id, data) => api.put(`/invoices.php?id=${id}`, data);
export const deleteInvoice  = (id)       => api.delete(`/invoices.php?id=${id}`);
export const updateStatus   = (id, status) => api.put(`/invoices.php?id=${id}&action=status`, { status });

export const getPayments   = (invoiceId) => api.get(`/payments.php?invoice_id=${invoiceId}`);
export const recordPayment = (data)      => api.post('/payments.php', data);

export const sendEmail     = (invoiceId) => api.post('/send_email.php', { invoice_id: invoiceId });

export const getDashboard  = ()          => api.get('/dashboard.php');
