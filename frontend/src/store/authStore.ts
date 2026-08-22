import { create } from 'zustand';
import { User, AuthState } from '@/types';
import { authApi } from '@/lib/api';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  selectRole: (role: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User) => void;
  initialize: () => Promise<void>;
}

/** Server is the source of truth for the role. Map the authenticated user's
 *  role to their post-login home route. A null/unset role means the user must
 *  complete role selection first. */
export function homeRouteFor(role: string | null | undefined): string {
  switch (role) {
    case 'student':
      return '/student';
    case 'tenant':
      return '/tenant';
    case 'owner':
      return '/owner';
    case 'agent':
      return '/agent';
    case 'caretaker':
      return '/caretaker';
    case 'admin':
    case 'superadmin':
    case 'moderator':
    case 'verification_officer':
      return '/admin';
    default:
      return '/choose-role';
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { access_token, refresh_token } = response.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    set({
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
    });

    await get().fetchUser();
  },

  register: async (data: any) => {
    const response = await authApi.register(data);
    const { access_token, refresh_token } = response.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    set({
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
    });

    await get().fetchUser();
  },

  googleLogin: async (idToken: string) => {
    const response = await authApi.google({ id_token: idToken });
    const { access_token, refresh_token } = response.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    set({
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
    });

    await get().fetchUser();
  },

  selectRole: async (role: string) => {
    await authApi.selectRole({ role });
    await get().fetchUser();
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authApi.logout({ refresh_token: refreshToken });
      }
    } catch {
      // ignore
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  fetchUser: async () => {
    try {
      const response = await authApi.me();
      set({ user: response.data, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  setUser: (user: User) => set({ user }),

  initialize: async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      await get().fetchUser();
    } else {
      set({ isLoading: false });
    }
  },
}));
