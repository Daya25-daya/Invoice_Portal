import api from './api';

export const getClients   = ()         => api.get('/clients.php');
export const getClient    = (id)       => api.get(`/clients.php?id=${id}`);
export const createClient = (data)     => api.post('/clients.php', data);
export const updateClient = (id, data) => api.put(`/clients.php?id=${id}`, data);
export const deleteClient = (id)       => api.delete(`/clients.php?id=${id}`);
