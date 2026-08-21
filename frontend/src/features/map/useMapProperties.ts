import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { demoProperties } from './demoProperties';
import type { MapProperty, PropertyKind, VerificationLevel } from './types';
import type { Viewport } from './MapCanvas';

/**
 * Viewport-scoped query. The backend (FastAPI + PostGIS) owns the geospatial
 * search — the client only sends bounds + zoom + filters.
 *
 * Demo fallback policy: demo seed data is used ONLY when the backend is
 * unreachable (network error). A legitimately empty area returns an empty
 * result — it is never replaced with demo listings.
 */

const KIND_MAP: Record<string, PropertyKind> = {
  apartment: 'apartment',
  house: 'rental',
  hostel: 'hostel',
  guest_house: 'guest_house',
  airbnb: 'airbnb',
  villa: 'villa',
  commercial: 'commercial',
  student_housing: 'hostel',
  land: 'commercial',
  office: 'commercial',
  warehouse: 'commercial',
};

function mapLiveProperty(raw: any): MapProperty {
  const kind = raw.kind ?? KIND_MAP[raw.property_type] ?? 'rental';
  const verified = Boolean(raw.has_verified_photos);
  const verification: VerificationLevel = verified && raw.has_video ? 'gold' : verified ? 'verified' : 'basic';
  const total = raw.total_rooms ?? 0;
  const vacant = raw.vacant_rooms ?? 0;
  return {
    id: raw.id,
    nlId: raw.property_code ?? raw.id,
    name: raw.property_name ?? 'Untitled property',
    kind,
    houseType: raw.house_type_label ?? raw.house_type ?? raw.property_type ?? kind,
    estate: raw.city ?? '',
    town: raw.county ?? '',
    county: raw.county ?? '',
    lat: raw.latitude ?? 0,
    lng: raw.longitude ?? 0,
    locationPrecision: raw.location_visibility === 'exact' ? 'exact' : 'approximate',
    price: raw.min_rent ?? raw.max_rent ?? 0,
    priceUnit: 'month',
    rating: raw.average_rating ?? 0,
    reviews: 0,
    totalUnits: total,
    occupiedUnits: total - vacant,
    reservedUnits: 0,
    availableUnits: vacant,
    verification,
    hasWalkthrough: Boolean(raw.has_video),
    trustScore: raw.trust_score ?? 50,
    ownerTrust: 0,
    caretakerScore: 0,
    safety: 'active',
    services: [],
    photo: raw.photo_url ?? '',
    demo: false,
  };
}

function isNetworkError(error: any): boolean {
  if (!error) return true;
  return (
    !error.response ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error'
  );
}

export function useMapProperties(viewport: Viewport | null) {
  const key = viewport
    ? [viewport.south, viewport.west, viewport.north, viewport.east].map((n) => n.toFixed(2)).join(',')
    : 'initial';

  return useQuery<{ items: MapProperty[]; source: 'live' | 'demo'; backendDown: boolean }>({
    queryKey: ['map-properties', key, viewport?.zoom ?? 0],
    queryFn: async () => {
      if (!viewport) return { items: [], source: 'live' as const, backendDown: false };
      try {
        const res = await api.get('/maps/properties-in-bounds', {
          params: {
            south: viewport.south,
            west: viewport.west,
            north: viewport.north,
            east: viewport.east,
            zoom: viewport.zoom,
          },
          timeout: 6000,
        });
        const rawItems: any[] = res.data?.properties ?? [];
        return { items: rawItems.map(mapLiveProperty), source: 'live' as const, backendDown: false };
      } catch (error: any) {
        // Frontend-only mode: any backend failure (offline or 5xx) falls back to seed data.
        return {
          items: demoProperties,
          source: 'demo' as const,
          backendDown: isNetworkError(error) || true,
        };
      }
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}