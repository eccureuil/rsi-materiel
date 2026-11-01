import type { Request, Response } from 'express';
import { COOKIE_NAME, baseCookieOptions } from '../config/cookie.js';
import { AppError } from '../middlewares/errorHandler.js';
import { loginSchema } from '../models/auth.js';
import type { AuthService } from '../services/AuthService.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const dto = loginSchema.parse(req.body);
    const result = await this.authService.login(dto);

    res.cookie(COOKIE_NAME, result.token, {
      ...baseCookieOptions(),
      maxAge: Math.max(result.expiresAtMs - Date.now(), 0),
    });
    res.json({ user: result.user });
  };

  logout = (_req: Request, res: Response): void => {
    res.clearCookie(COOKIE_NAME, baseCookieOptions());
    res.status(204).send();
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, 'Authentification requise.');
    }
    const user = await this.authService.getProfile(req.user.matricule);
    res.json({ user });
  };
}