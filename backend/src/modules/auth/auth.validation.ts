import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(7).max(30).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
