import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEFAULT_BASE = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api/v1'
  : 'http://localhost:8000/api/v1';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE;

export const tokenStore = {
  async getAccessToken() {
    return SecureStore.getItemAsync('access_token');
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync('refresh_token');
  },
  async setTokens(access: string, refresh: string) {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
  },
  async clearTokens() {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  },
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await tokenStore.getRefreshToken();

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: newRefresh } = response.data;
          await tokenStore.setTokens(access_token, newRefresh);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch {
          await tokenStore.clearTokens();
          onSessionExpired?.();
        }
      } else {
        onSessionExpired?.();
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: RegisterPayload) => api.post('/auth/register', data),
  login: (data: { email?: string; phone?: string; password: string }) =>
    api.post('/auth/login', data),
  logout: (data: { refresh_token: string }) => api.post('/auth/logout', data),
  me: () => api.get<User>('/auth/me'),
};

export const propertiesApi = {
  list: (params?: Record<string, unknown>) => api.get('/properties', { params }),
  search: (params?: Record<string, unknown>) => api.get('/properties/search', { params }),
  get: (id: string) => api.get<Property>(`/properties/${id}`),
};

export const roomsApi = {
  listByProperty: (propertyId: string, params?: Record<string, unknown>) =>
    api.get(`/rooms/property/${propertyId}`, { params }),
  getVacant: (params?: Record<string, unknown>) => api.get('/rooms/vacant', { params }),
};

export const searchApi = {
  smart: (params: Record<string, unknown>) => api.get<SmartSearchResponse>('/search/smart', { params }),
  autocomplete: (q: string) => api.get('/search/autocomplete', { params: { q } }),
};

export const bookingsApi = {
  create: (data: BookingCreatePayload) => api.post('/bookings', data),
  getMyBookings: (params?: Record<string, unknown>) =>
    api.get('/bookings/my-bookings', { params }),
  cancel: (id: string, reason = '') =>
    api.post(`/bookings/${id}/cancel`, { reason }),
};

export const favoritesApi = {
  list: () => api.get('/favorites'),
  add: (propertyId: string) => api.post(`/favorites/${propertyId}`),
  remove: (propertyId: string) => api.delete(`/favorites/${propertyId}`),
};

export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string | null;
  is_verified_owner?: boolean;
  is_identity_verified?: boolean;
  trust_score?: number | null;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

export interface MapRoom {
  id: string;
  room_number: string;
  house_type: string;
  rent_amount: number;
  currency: string;
  property_id?: string;
  property_name: string;
  city?: string | null;
  county?: string | null;
  latitude: number | null;
  longitude: number | null;
  location_visibility?: string | null;
  distance_km?: number | null;
  student_friendly?: boolean;
  internet_available?: boolean;
  water_available?: boolean;
}

export interface SmartSearchResponse {
  total: number;
  page: number;
  page_size: number;
  results: MapRoom[];
}

export interface Property {
  id: string;
  property_name: string;
  description?: string | null;
  property_type?: string;
  status?: string;
  county?: string | null;
  city?: string | null;
  estate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  avg_rating?: number | null;
  total_reviews?: number;
  vacant_rooms?: number;
  total_rooms?: number;
  is_verified?: boolean;
  photos?: { id: string; photo_url?: string; thumbnail_url?: string }[];
  rooms?: RoomSummary[];
}

export interface RoomSummary {
  id: string;
  room_number: string;
  house_type: string;
  rent_amount: number;
  deposit_amount?: number | null;
  currency: string;
  occupancy_status: string;
}

export interface BookingCreatePayload {
  property_id: string;
  room_id?: string | null;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  tenant_notes?: string;
}

export interface Booking {
  id: string;
  property_id: string;
  room_id?: string | null;
  status: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  created_at: string;
  tenant_name?: string | null;
  property_name?: string | null;
  house_type?: string | null;
  tenant_notes?: string | null;
  owner_notes?: string | null;
}
