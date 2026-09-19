import { apiRequest } from "./client";

export type TrustLevel = "new" | "trusted" | "highly_trusted";

export interface TrustInfo {
  score: number;
  level: TrustLevel;
  canRentHighRisk: boolean;
  highRiskMinScore: number;
  breakdown: { rentals: number; ratings: number; verification: number; accountAge: number; penalty: number };
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  district: string | null;
  ratingAvg: number;
  ratingCount: number;
  verificationLevel: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  role: string;
  status: string;
  createdAt: string;
  /** Only present on /users/me responses (not on login/register/refresh). */
  trust?: TrustInfo;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string | null;
  bio?: string | null;
  city?: string | null;
  district?: string | null;
  avatarUrl?: string | null;
}

export function register(input: RegisterInput) {
  return apiRequest<AuthSession>("/api/auth/register", { method: "POST", body: input, auth: false });
}

export function login(input: LoginInput) {
  return apiRequest<AuthSession>("/api/auth/login", { method: "POST", body: input, auth: false });
}

export function loginWithGoogle(idToken: string) {
  return apiRequest<AuthSession>("/api/auth/google", { method: "POST", body: { idToken }, auth: false });
}

export function refreshTokens(refreshToken: string) {
  return apiRequest<AuthSession>("/api/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    auth: false,
  });
}

export function logout(refreshToken: string) {
  return apiRequest<void>("/api/auth/logout", {
    method: "POST",
    body: { refreshToken },
    auth: false,
  });
}

export function getMe() {
  return apiRequest<{ user: AuthUser }>("/api/users/me");
}

export function updateMe(input: UpdateProfileInput) {
  return apiRequest<{ user: AuthUser }>("/api/users/me", { method: "PATCH", body: input });
}
