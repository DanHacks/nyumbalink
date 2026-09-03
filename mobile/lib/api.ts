import axios from 'axios';
import Constants from 'expo-constants';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  'https://nyumba.hytechsolution.co.ke';

export const API_BASE = `${API_URL}/api/v1`;
export const MEDIA_BASE = API_URL;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function getAuthToken(): string | null {
  return _token;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user?: any;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: string;
}

/* ---------------- Auth ---------------- */
export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/login', { email, password });
  return res.data;
}

export async function register(payload: RegisterPayload): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/register', payload);
  return res.data;
}

export async function selectRole(role: string): Promise<any> {
  const res = await api.post('/auth/select-role', { role });
  return res.data;
}

export async function fetchMe(): Promise<any> {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    /* ignore */
  }
}

/* ---------------- Map / Properties ---------------- */
export async function getPropertiesInBounds(
  bounds: { north: number; south: number; east: number; west: number; zoom?: number },
  filters?: Record<string, any>,
): Promise<any[]> {
  const res = await api.get('/maps/properties-in-bounds', {
    params: { ...bounds, ...filters },
  });
  return res.data?.properties ?? [];
}

export async function getProperty(id: string): Promise<any> {
  const res = await api.get(`/properties/${id}`);
  return res.data;
}

export async function getPropertyTrust(id: string): Promise<any> {
  const res = await api.get(`/reports/properties/${id}/trust`);
  return res.data;
}

export async function searchAutocomplete(q: string): Promise<any[]> {
  if (!q) return [];
  const res = await api.get('/search/autocomplete', { params: { q } });
  return res.data?.suggestions ?? res.data ?? [];
}

export async function geocode(q: string): Promise<{ lat: number; lng: number; label?: string } | null> {
  const res = await api.get('/maps/geocode', { params: { q } });
  const data = res.data;
  if (!data || data.lat == null) return null;
  return { lat: data.lat, lng: data.lng, label: data.label };
}

export async function getDirections(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<any> {
  const res = await api.get('/maps/directions', {
    params: {
      from_lat: from.lat,
      from_lng: from.lng,
      to_lat: to.lat,
      to_lng: to.lng,
    },
  });
  return res.data;
}

/* ---------------- Bookings ---------------- */
export async function createBooking(payload: {
  property_id: string;
  room_id?: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  tenant_notes?: string;
}): Promise<any> {
  const res = await api.post('/bookings', payload);
  return res.data;
}

export async function getMyBookings(): Promise<any[]> {
  const res = await api.get('/bookings/my-bookings');
  return res.data ?? [];
}

/* ---------------- Reviews ---------------- */
export async function createReview(
  propertyId: string,
  payload: { rating: number; comment?: string; positive_factors?: string[] },
): Promise<any> {
  const res = await api.post(`/reviews/property/${propertyId}`, payload);
  return res.data;
}

export async function getReviews(propertyId: string): Promise<any[]> {
  const res = await api.get(`/reviews/property/${propertyId}`);
  return res.data ?? [];
}

/* ---------------- Reports ---------------- */
export async function createReport(
  propertyId: string,
  payload: {
    report_category: string;
    description: string;
    evidence?: string[];
    wrong_photos?: boolean;
    wrong_rent?: boolean;
    wrong_location?: boolean;
    occupied_room?: boolean;
    broken_house?: boolean;
    fake_listing?: boolean;
    duplicate_listing?: boolean;
    other_issue?: boolean;
    reporter_gps_lat?: number;
    reporter_gps_lon?: number;
  },
): Promise<any> {
  const res = await api.post(`/reports/properties/${propertyId}/reports`, payload);
  return res.data;
}

/* ---------------- Favorites ---------------- */
export async function getFavorites(): Promise<any[]> {
  const res = await api.get('/favorites');
  return res.data ?? [];
}

export async function addFavorite(propertyId: string): Promise<void> {
  await api.post(`/favorites/${propertyId}`);
}

/* ---------------- Chat ---------------- */
export async function getConversations(): Promise<any[]> {
  const res = await api.get('/chat/conversations');
  return res.data ?? [];
}

export async function getMessages(conversationId: string): Promise<any[]> {
  const res = await api.get(`/chat/conversations/${conversationId}/messages`);
  return res.data ?? [];
}

export async function sendMessage(conversationId: string, body: string): Promise<any> {
  const res = await api.post(`/chat/conversations/${conversationId}/messages`, { body });
  return res.data;
}

/* ---------------- Universities ---------------- */
export async function getUniversities(): Promise<any[]> {
  const res = await api.get('/universities');
  return res.data ?? [];
}
