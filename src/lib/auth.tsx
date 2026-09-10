"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type AdminUser,
  clearAllAuth,
  fetchMe,
  getAdminKey,
  getSessionToken,
  logoutSession,
  setSessionToken,
} from "@/lib/api";

type AuthState = {
  user: AdminUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  loginWithToken: (token: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getSessionToken();
    const legacyKey = getAdminKey();
    if (!token && !legacyKey) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      if (token) {
        const data = await fetchMe();
        setUser(data.user);
      } else {
        // Legacy API key path — treat as authenticated service user
        setUser({
          id: "api-key",
          email: "api-key",
          name: "API Key",
          role: "service",
        });
      }
    } catch {
      clearAllAuth();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginWithToken = useCallback(async (token: string) => {
    setSessionToken(token);
    const data = await fetchMe();
    setUser(data.user);
    setLoading(false);
    return data.user as AdminUser;
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      refresh,
      loginWithToken,
      logout,
    }),
    [user, loading, refresh, loginWithToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
