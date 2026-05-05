import axios from 'axios';

const api = axios.create({
  baseURL: '/invoice-portal/backend/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
