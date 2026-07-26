import axios from 'axios';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
export const UPLOADS_BASE = API_ORIGIN;

export function resolveImagenUrl(imagen) {
  if (!imagen) return null;
  if (/^https?:\/\//i.test(imagen)) return imagen;
  return `${API_ORIGIN}/uploads/${imagen}`;
}

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pf_token');
      localStorage.removeItem('pf_user');
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
