import api from './api';

export const getProducts = () => api.get('/products.php');
export const createProduct = (data) => api.post('/products.php', data);
export const updateProduct = (data) => api.put('/products.php', data);
export const deleteProduct = (id) => api.delete(`/products.php?id=${id}`);
