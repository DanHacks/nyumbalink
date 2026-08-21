export type PropertyKind =
  | 'rental'
  | 'apartment'
  | 'guest_house'
  | 'airbnb'
  | 'hostel'
  | 'villa'
  | 'commercial';

export type VerificationLevel = 'basic' | 'verified' | 'gold' | 'platinum';

export type SafetyStatus =
  | 'active'
  | 'flagged'
  | 'under_review'
  | 'restricted'
  | 'blacklisted';

export type PriceTier = 'budget' | 'standard' | 'premium' | 'luxury';

export interface MapProperty {
  id: string;
  nlId: string;
  name: string;
  kind: PropertyKind;
  houseType: string;
  estate: string;
  town: string;
  county: string;
  /** Approximate coordinates only — precise location is released after verification. */
  lat: number;
  lng: number;
  locationPrecision: 'approximate' | 'exact';
  price: number;
  priceUnit: 'month' | 'night';
  rating: number;
  reviews: number;
  totalUnits: number;
  occupiedUnits: number;
  reservedUnits: number;
  availableUnits: number;
  availableFrom?: string;
  verification: VerificationLevel;
  hasWalkthrough: boolean;
  trustScore: number;
  ownerTrust: number;
  caretakerScore: number;
  safety: SafetyStatus;
  services: string[];
  photo: string;
  demo: boolean;
}

export const KIND_LABEL: Record<PropertyKind, string> = {
  rental: 'Rental',
  apartment: 'Apartment',
  guest_house: 'Guest House',
  airbnb: 'Airbnb',
  hostel: 'Hostel',
  villa: 'Villa',
  commercial: 'Commercial',
};

export const KIND_EMOJI: Record<PropertyKind, string> = {
  rental: '🏠',
  apartment: '🏢',
  guest_house: '🏨',
  airbnb: '🌴',
  hostel: '🎓',
  villa: '🏡',
  commercial: '🏬',
};

export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  basic: 'Basic',
  verified: 'Verified',
  gold: 'Gold Verified',
  platinum: 'Platinum Verified',
};