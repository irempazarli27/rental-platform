import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { googleAuthSchema, loginSchema, refreshSchema, registerSchema } from "./auth.validation";

export const authController = {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  },

  async google(req: Request, res: Response) {
    const { idToken } = googleAuthSchema.parse(req.body);
    const result = await authService.loginWithGoogle(idToken);
    res.json(result);
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.status(204).send();
  },
};
