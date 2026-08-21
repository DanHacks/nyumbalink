export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  role: 'tenant' | 'owner' | 'caretaker' | 'manager' | 'host' | 'agent' | 'admin' | 'moderator' | 'verification_officer' | 'superadmin';
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_verified_owner: boolean;
  verification_badge: boolean;
  avatar_url?: string;
  trust_score: number;
  is_premium: boolean;
  created_at: string;
  is_active?: boolean;
}

export interface Property {
  id: string;
  property_type: string;
  property_name: string;
  property_code: string;
  status: string;
  latitude: number;
  longitude: number;
  city: string;
  county: string;
  min_rent?: number;
  max_rent?: number;
  currency: string;
  total_rooms: number;
  vacant_rooms: number;
  last_vacancy_update?: string;
  has_verified_photos: boolean;
  has_video: boolean;
  is_featured: boolean;
  total_views: number;
  occupancy_rate: number;
  created_at: string;
  description?: string;
  year_built?: number;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  owner?: User;
  buildings?: Building[];
  photos?: VerificationPhoto[];
  nearby_places?: NearbyPlace[];
}

export interface Building {
  id: string;
  building_name: string;
  building_code?: string;
  total_floors: number;
  total_rooms: number;
  vacant_rooms: number;
  floors?: Floor[];
}

export interface Floor {
  id: string;
  floor_number: number;
  floor_name?: string;
  total_rooms: number;
  vacant_rooms: number;
  rooms?: Room[];
}

export interface Room {
  id: string;
  room_number: string;
  room_name?: string;
  house_type: string;
  rent_amount: number;
  deposit_amount?: number;
  currency: string;
  occupancy_status: string;
  furnishing?: string;
  size_sqm?: number;
  water_available: boolean;
  electricity_available: boolean;
  internet_available: boolean;
  parking_available: boolean;
  pet_friendly: boolean;
  student_friendly: boolean;
  building_name?: string;
  floor_number?: number;
}

export interface VerificationPhoto {
  id: string;
  property_id: string;
  category: string;
  storage_url: string;
  thumbnail_url?: string;
  verification_status: string;
  is_primary: boolean;
}

export interface Booking {
  id: string;
  property_id: string;
  room_id?: string;
  status: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  actual_check_in?: string;
  qr_code?: string;
  qr_code_scanned: boolean;
}

export interface NearbyPlace {
  place_type: string;
  place_name: string;
  distance_km: number;
  latitude?: number;
  longitude?: number;
}

export interface Review {
  id: string;
  tenant_name: string;
  overall_rating: number;
  comment?: string;
  categories: Record<string, number>;
  created_at: string;
}

export interface SearchFilters {
  query?: string;
  property_type?: string;
  house_type?: string;
  min_price?: number;
  max_price?: number;
  county?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  pet_friendly?: boolean;
  student_friendly?: boolean;
  parking?: boolean;
  internet?: boolean;
  water?: boolean;
  verified_only?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
