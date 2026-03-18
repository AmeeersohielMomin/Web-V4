import axios from 'axios';
import { clearAuthStorage, getToken } from '@/lib/auth';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const requestUrl = String(err?.config?.url || '');
    const isAuthRequest =
      requestUrl.includes('/api/platform/auth/login') ||
      requestUrl.includes('/api/platform/auth/register');

    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Do not force-redirect on expected auth failures from login/register forms.
      if (!isAuthRequest) {
        clearAuthStorage();
      }
      if (!isAuthRequest && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
