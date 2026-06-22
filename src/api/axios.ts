import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../config/env';
import { useAuthStore } from '../store/auth.store';

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Refresh-token handling -------------------------------------------------
let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

const flushQueue = (token: string | null) => {
  queue.forEach((resolve) => resolve(token));
  queue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const store = useAuthStore.getState();

    // Only attempt a single refresh, and never for the refresh call itself.
    if (
      status === 401 &&
      original &&
      !original._retry &&
      store.refreshToken &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;

      if (isRefreshing) {
        // Wait for the in-flight refresh to finish.
        return new Promise((resolve, reject) => {
          queue.push((token) => {
            if (!token) return reject(error);
            original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(`${env.apiUrl}/auth/refresh`, {
          refreshToken: store.refreshToken,
        });
        const { accessToken, refreshToken } = data.data;
        store.setTokens(accessToken, refreshToken);
        flushQueue(accessToken);
        original.headers = { ...original.headers, Authorization: `Bearer ${accessToken}` };
        return api(original);
      } catch (refreshErr) {
        flushQueue(null);
        useAuthStore.getState().clear();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
