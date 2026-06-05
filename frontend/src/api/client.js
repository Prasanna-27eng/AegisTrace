import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
});

// ── In-flight request deduplication ──────────────────────────────────────────
const _inflight = {};

const originalGet = api.get.bind(api);
api.get = (url, config) => {
  const key = url + JSON.stringify(config?.params || {});
  if (_inflight[key]) return _inflight[key];
  const promise = originalGet(url, config).finally(() => {
    delete _inflight[key];
  });
  _inflight[key] = promise;
  return promise;
};

// ── Auth header ───────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  // Use sessionStorage (clears on tab close — more secure than localStorage)
  const token = sessionStorage.getItem('at_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── 401 handler ───────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('at_token');
      sessionStorage.removeItem('at_user');
      window.location.href = '/app/login';
    }
    return Promise.reject(err);
  }
);

export default api;
