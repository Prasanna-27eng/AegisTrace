import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('at_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('at_token');
      localStorage.removeItem('at_user');
      window.location.href = '/app/login';
    }
    return Promise.reject(err);
  }
);

export default api;
