"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "@/lib/api/auth";
import { setAccessToken, setRefreshHandler } from "@/lib/api/client";

const REFRESH_TOKEN_KEY = "rental_platform_refresh_token";

// Module-level (not per-component) so concurrent refresh attempts — e.g. React
// Strict Mode's double effect invocation in development, or two effects firing
// around the same navigation — share one in-flight request instead of each
// submitting the same refresh token. The server rotates+invalidates a refresh
// token on first use, so a second call with the same token would otherwise be
// read as reuse/theft and revoke every session for that user.
let inFlightRefresh: Promise<authApi.AuthSession> | null = null;

function refreshTokensOnce(token: string): Promise<authApi.AuthSession> {
  if (!inFlightRefresh) {
    inFlightRefresh = authApi.refreshTokens(token).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

interface AuthContextValue {
  user: authApi.AuthUser | null;
  isLoading: boolean;
  login: (input: authApi.LoginInput) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (input: authApi.RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((session: authApi.AuthSession) => {
    setAccessToken(session.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setRefreshHandler(async () => {
      const stored = window.localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!stored) return null;
      try {
        const session = await refreshTokensOnce(stored);
        applySession(session);
        return session.accessToken;
      } catch {
        clearSession();
        return null;
      }
    });
    return () => setRefreshHandler(null);
  }, [applySession, clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = window.localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!stored) return;
      try {
        const session = await refreshTokensOnce(stored);
        if (!cancelled) applySession(session);
      } catch {
        if (!cancelled) clearSession();
      }
    }

    bootstrap().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (input: authApi.LoginInput) => {
      applySession(await authApi.login(input));
    },
    [applySession],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      applySession(await authApi.loginWithGoogle(idToken));
    },
    [applySession],
  );

  const register = useCallback(
    async (input: authApi.RegisterInput) => {
      applySession(await authApi.register(input));
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const stored = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    if (stored) {
      try {
        await authApi.logout(stored);
      } catch {
        // Token may already be invalid/expired — clearing local state is enough.
      }
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { user } = await authApi.getMe();
    setUser(user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
