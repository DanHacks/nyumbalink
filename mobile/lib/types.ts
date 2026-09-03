export type UserRole =
  | 'student'
  | 'tenant'
  | 'owner'
  | 'agent'
  | 'caretaker'
  | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole | null;
  is_active?: boolean;
  is_identity_verified?: boolean;
  trust_score?: number;
  profile_image_url?: string;
}

export type PropertyKind =
  | 'rental'
  | 'apartment'
  | 'guest_house'
  | 'airbnb'
  | 'hostel'
  | 'villa'
  | 'commercial';

export type VerificationLevel = 'basic' | 'verified' | 'gold' | 'platinum';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom?: number;
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapProperty {
  id: string;
  property_code?: string;
  property_name: string;
  kind?: PropertyKind;
  house_type?: string;
  city?: string;
  county?: string;
  latitude: number;
  longitude: number;
  price?: number;
  price_unit?: 'month' | 'night';
  average_rating?: number;
  vacant_rooms?: number;
  total_rooms?: number;
  has_video?: boolean;
  has_verified_photos?: boolean;
  trust_score?: number;
  photo_url?: string;
  location_visibility?: string;
  distance_km?: number;
}

export interface PropertyImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  is_verified?: boolean;
}

export interface PropertyVideo {
  id: string;
  url: string;
  thumbnail_url?: string;
}

export interface Room {
  id: string;
  room_label?: string;
  rent_amount?: number;
  occupancy_status?: string;
  room_type?: string;
  capacity?: number;
}

export interface Property {
  id: string;
  property_code?: string;
  property_name: string;
  description?: string;
  kind?: PropertyKind;
  house_type?: string;
  property_type?: string;
  city?: string;
  county?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  location_visibility?: string;
  min_rent?: number;
  max_rent?: number;
  price_unit?: string;
  deposit_amount?: number;
  average_rating?: number;
  total_reviews?: number;
  vacant_rooms?: number;
  total_rooms?: number;
  has_video?: boolean;
  has_verified_photos?: boolean;
  trust_score?: number;
  verification_level?: VerificationLevel;
  status?: string;
  images?: PropertyImage[];
  videos?: PropertyVideo[];
  amenities?: string[];
  rooms?: Room[];
  owner?: {
    id: string;
    full_name?: string;
    trust_score?: number;
    is_identity_verified?: boolean;
  };
  caretaker?: { id: string; full_name?: string; trust_score?: number };
  distance_km?: number;
  created_at?: string;
  rules?: string[];
}

export interface Booking {
  id: string;
  property_id: string;
  room_id?: string;
  status: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  tenant_notes?: string;
  created_at?: string;
  property?: { id: string; property_name: string; city?: string };
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at?: string;
  author_name?: string;
  is_verified?: boolean;
}

export interface Conversation {
  id: string;
  participant_name?: string;
  last_message?: string;
  updated_at?: string;
}

export interface PropertyFilters {
  price_min?: number;
  price_max?: number;
  property_type?: string;
  rooms?: number;
  bedrooms?: number;
  amenities?: string[];
  verified_only?: boolean;
  student?: boolean;
  gender?: string;
  furnished?: boolean;
  wifi?: boolean;
  water?: boolean;
  parking?: boolean;
  security?: boolean;
}
