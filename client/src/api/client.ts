import axios, { AxiosError } from 'axios';
import type { ApiError } from '@/types/api';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/me');
    if (status === 401 && !isAuthRoute) {
      window.dispatchEvent(new CustomEvent('rsi:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export function extraireMessageErreur(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const data = error.response?.data;
    if (data?.details && typeof data.details === 'object') {
      const details = data.details as Record<string, string[]>;
      const premierChamp = Object.keys(details)[0];
      if (premierChamp && details[premierChamp]?.[0]) {
        return `${data.message ?? 'Erreur de validation'} : ${details[premierChamp][0]}`;
      }
    }
    if (data?.message) return data.message;
    if (error.code === 'ERR_NETWORK') return 'Impossible de joindre le serveur.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Erreur inconnue.';
}