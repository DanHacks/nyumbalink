import { create } from 'zustand';
import { authApi, tokenStore, setSessionExpiredHandler, type User } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await authApi.login({ email, password });
    const { access_token, refresh_token } = response.data;
    await tokenStore.setTokens(access_token, refresh_token);
    set({ isAuthenticated: true });
    await get().fetchUser();
  },

  register: async (data) => {
    const response = await authApi.register(data);
    const { access_token, refresh_token } = response.data;
    await tokenStore.setTokens(access_token, refresh_token);
    set({ isAuthenticated: true });
    await get().fetchUser();
  },

  logout: async () => {
    try {
      const refreshToken = await tokenStore.getRefreshToken();
      if (refreshToken) {
        await authApi.logout({ refresh_token: refreshToken });
      }
    } catch {
      // ignore network/auth errors on logout
    }
    await tokenStore.clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchUser: async () => {
    try {
      const response = await authApi.me();
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      await tokenStore.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  initialize: async () => {
    setSessionExpiredHandler(() => {
      set({ user: null, isAuthenticated: false });
    });
    const token = await tokenStore.getAccessToken();
    if (token) {
      await get().fetchUser();
    } else {
      set({ isLoading: false });
    }
  },
}));
