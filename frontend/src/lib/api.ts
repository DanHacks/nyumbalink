import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  google: (data: any) => api.post('/auth/google', data),
  selectRole: (data: any) => api.post('/auth/select-role', data),
  refresh: (data: any) => api.post('/auth/refresh', data),
  logout: (data: any) => api.post('/auth/logout', data),
  me: () => api.get('/auth/me'),
};

export const propertiesApi = {
  list: (params?: any) => api.get('/properties', { params }),
  search: (params?: any) => api.get('/properties/search', { params }),
  get: (id: string) => api.get(`/properties/${id}`),
  create: (data: any) => api.post('/properties', data),
  update: (id: string, data: any) => api.put(`/properties/${id}`, data),
  delete: (id: string) => api.delete(`/properties/${id}`),
};

export const roomsApi = {
  listByProperty: (propertyId: string, params?: any) =>
    api.get(`/rooms/property/${propertyId}`, { params }),
  getVacant: (params?: any) => api.get('/rooms/vacant', { params }),
  get: (id: string) => api.get(`/rooms/${id}`),
  update: (id: string, data: any) => api.put(`/rooms/${id}`, data),
  markOccupied: (id: string) => api.post(`/rooms/${id}/mark-occupied`),
  markVacant: (id: string) => api.post(`/rooms/${id}/mark-vacant`),
};

export const bookingsApi = {
  create: (data: any) => api.post('/bookings', data),
  getMyBookings: (params?: any) => api.get('/bookings/my-bookings', { params }),
  getMyPropertyBookings: (params?: any) =>
    api.get('/bookings/my-property-bookings', { params }),
  get: (id: string) => api.get(`/bookings/${id}`),
  updateStatus: (id: string, data: any) =>
    api.put(`/bookings/${id}/status`, data),
  checkIn: (id: string, data: any) =>
    api.post(`/bookings/${id}/check-in`, data),
  cancel: (id: string, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { reason }),
};

export const verificationApi = {
  getStatus: (propertyId: string) =>
    api.get(`/verification/property/${propertyId}/status`),
  uploadPhoto: (formData: FormData) =>
    api.post('/verification/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  approvePhoto: (photoId: string) =>
    api.post(`/verification/photos/${photoId}/approve`),
  rejectPhoto: (photoId: string, reason: string) =>
    api.post(`/verification/photos/${photoId}/reject`, { reason }),
  verifyProperty: (propertyId: string) =>
    api.post(`/verification/property/${propertyId}/verify`),
};

export const searchApi = {
  smart: (params: any) => api.get('/search/smart', { params }),
  autocomplete: (q: string) => api.get('/search/autocomplete', { params: { q } }),
};

export interface MapRoom {
  id: string;
  room_number?: string;
  house_type?: string;
  rent_amount: number;
  currency?: string;
  property_id?: string;
  property_name?: string;
  city?: string | null;
  county?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  student_friendly?: boolean;
  internet_available?: boolean;
  water_available?: boolean;
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

export const favoritesApi = {
  list: (params?: any) => api.get('/favorites', { params }),
  add: (propertyId: string) => api.post(`/favorites/${propertyId}`),
  remove: (propertyId: string) => api.delete(`/favorites/${propertyId}`),
};

export const analyticsApi = {
  getPropertyAnalytics: (propertyId: string, params?: any) =>
    api.get(`/analytics/property/${propertyId}`, { params }),
  getOwnerDashboard: (params?: any) =>
    api.get('/analytics/owner/dashboard', { params }),
  trackView: (propertyId: string) =>
    api.post('/analytics/track/view', { property_id: propertyId }),
  trackClick: (propertyId: string, clickType: string) =>
    api.post('/analytics/track/click', { property_id: propertyId, click_type: clickType }),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  listUsers: (params?: any) => api.get('/admin/users', { params }),
  updateUserRole: (userId: string, role: string) =>
    api.put(`/admin/users/${userId}/role`, { role }),
  toggleUserActive: (userId: string) =>
    api.put(`/admin/users/${userId}/toggle-active`),
  getVerificationQueue: (params?: any) =>
    api.get('/admin/verification-queue', { params }),
  listScamReports: (params?: any) =>
    api.get('/admin/scam-reports', { params }),
  resolveScamReport: (reportId: string, action: string, notes?: string) =>
    api.put(`/admin/scam-reports/${reportId}/resolve`, { action, notes }),
  listProperties: (params?: any) =>
    api.get('/admin/properties', { params }),
};

export const paymentsApi = {
  getHistory: () => api.get('/payments/history'),
  stkPush: (amount: number, phone: string, paymentType: string) =>
    api.post('/payments/mpesa/stk-push', { amount, phone, payment_type: paymentType }),
  subscribePremium: (planType: string, amount: number) =>
    api.post('/payments/premium/subscribe', { plan_type: planType, amount }),
};

export const chatApi = {
  listConversations: (params?: any) => api.get('/chat/conversations', { params }),
  startConversation: (data: { property_id?: string; user_id?: string }) =>
    api.post('/chat/conversations', data),
  getMessages: (conversationId: string, params?: any) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId: string, data: { content?: string; media_url?: string; message_type?: string }) =>
    api.post(`/chat/conversations/${conversationId}/messages`, data),
};

export const notificationsApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: any) => api.put('/notifications/preferences', data),
};

export const universitiesApi = {
  list: (q?: string) => api.get('/universities', { params: q ? { q } : undefined }),
  get: (id: string) => api.get(`/universities/${id}`),
  nearbyAccommodation: (campusId: string, params?: any) =>
    api.get(`/universities/campuses/${campusId}/nearby-accommodation`, { params }),
  createUniversity: (data: any) => api.post('/universities', data),
  createCampus: (universityId: string, data: any) =>
    api.post(`/universities/${universityId}/campuses`, data),
};
