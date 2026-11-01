import type { CookieOptions } from 'express';
import { env } from './env.js';

export const COOKIE_NAME = 'token';

// Secure active uniquement en production (HTTPS). SameSite=Strict et HttpOnly toujours actifs.
export function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  };
}