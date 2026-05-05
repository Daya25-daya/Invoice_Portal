import api from './api';

export const register = (data) => api.post('/auth.php?action=register', data);
export const login    = (data) => api.post('/auth.php?action=login', data);
export const logout   = ()     => api.post('/auth.php?action=logout');
export const getMe    = ()     => api.get('/auth.php?action=me');
