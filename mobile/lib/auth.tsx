import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken, login as apiLogin, register as apiRegister, selectRole as apiSelectRole, fetchMe, logout as apiLogout, refreshTokens } from '@/lib/api';
import type { User, UserRole } from '@/lib/types';

const ACCESS_KEY = 'nl_access_token';
const REFRESH_KEY = 'nl_refresh_token';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; first_name: string; last_name: string; phone: string; role?: string }) => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  selectRole: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTokens = useCallback(async (access?: string | null, refresh?: string | null) => {
    if (access) {
      await SecureStore.setItemAsync(ACCESS_KEY, access);
      setAuthToken(access);
    } else {
      setAuthToken(null);
    }
    if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
      setAuthToken(null);
      try {
        await SecureStore.deleteItemAsync(ACCESS_KEY);
      } catch {}
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(ACCESS_KEY);
      if (token) {
        setAuthToken(token);
        await refreshUser();
      }
      setLoading(false);
    })();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiLogin(email, password);
      await applyTokens(data.access_token, data.refresh_token);
      await refreshUser();
    },
    [applyTokens, refreshUser],
  );

  const register = useCallback(
    async (payload: { email: string; password: string; first_name: string; last_name: string; phone: string; role?: string }) => {
      const data = await apiRegister(payload);
      await applyTokens(data.access_token, data.refresh_token);
      await refreshUser();
    },
    [applyTokens, refreshUser],
  );

  const selectRole = useCallback(
    async (role: UserRole) => {
      const me = await apiSelectRole(role);
      setUser(me);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
      await apiLogout(refresh);
    } catch {}
    try {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
    } catch {}
    try {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } catch {}
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, selectRole, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
