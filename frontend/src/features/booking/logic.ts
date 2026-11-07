import type { MapProperty, PriceTier } from '@/features/map/types';

export type RequestStatus =
  | 'pending'
  | 'confirmed'
  | 'rescheduled'
  | 'checked_in'
  | 'cancelled'
  | 'no_show'
  | 'completed';

export interface BookingView {
  id: string;
  property_id: string;
  room_id: string | null;
  status: RequestStatus;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  created_at?: string | null;
  tenant_name?: string | null;
  property_name?: string | null;
  house_type?: string | null;
  tenant_notes?: string | null;
  owner_notes?: string | null;
  qr_code?: string | null;
  expires_at?: string | null;
  requested_at?: string | null;
  responded_at?: string | null;
  decline_reason?: string | null;
  proposed_time_start?: string | null;
  proposed_time_end?: string | null;
}

/** Payload the backend pushes over the socket for request lifecycle events. */
export interface RequestEvent {
  type: string;
  booking_id?: string;
  status?: RequestStatus;
  property_name?: string | null;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  responded_at?: string | null;
  decline_reason?: string | null;
  proposed_time_start?: string | null;
  proposed_time_end?: string | null;
  qr_code?: string | null;
  reason?: string;
  tenant_name?: string | null;
  owner_notes?: string | null;
  expires_at?: string | null;
}

export interface RequestTier {
  tier: PriceTier;
  label: string;
  icon: string;
  etaMin: number;
  fromPrice: number;
  count: number;
  distanceKm: number | null;
  /** The closest / cheapest listing that will be requested for this tier. */
  best: MapProperty;
}

const TIER_META: Record<PriceTier, { label: string; icon: string; rank: number }> = {
  budget: { label: 'Budget', icon: '🏠', rank: 0 },
  standard: { label: 'Standard', icon: '🏢', rank: 1 },
  premium: { label: 'Premium', icon: '🏡', rank: 2 },
  luxury: { label: 'Luxury', icon: '🏰', rank: 3 },
};

/**
 * Group nearby listings into the ride-style tiers the request sheet shows.
 * Ordering is budget → luxury and follows each market's own price bands
 * (buildTierIndex), so the rail is never hard-coded to Nairobi prices.
 */
export function buildRequestTiers(
  properties: MapProperty[],
  currentTier: (p: MapProperty) => PriceTier,
  distanceOf: (p: MapProperty) => number | null,
): RequestTier[] {
  const groups = new Map<PriceTier, { items: MapProperty[]; distances: (number | null)[] }>();
  for (const p of properties) {
    if (p.availableUnits <= 0 || p.safety === 'blacklisted' || p.safety === 'restricted') continue;
    const tier = currentTier(p);
    const group = groups.get(tier) ?? { items: [], distances: [] };
    group.items.push(p);
    group.distances.push(distanceOf(p));
    groups.set(tier, group);
  }

  return [...groups.entries()]
    .map(([tier, group]) => {
      const known = group.distances.filter((d): d is number => d != null);
      const nearest = known.length ? Math.min(...known) : null;
      const closest = group.items
        .slice()
        .sort((a, b) => (distanceOf(a) ?? Infinity) - (distanceOf(b) ?? Infinity) || a.price - b.price)[0];
      return {
        tier,
        label: TIER_META[tier].label,
        icon: TIER_META[tier].icon,
        // Ride-style "pickup in N min": from walking distance to the nearest
        // listing in the tier (≈ 12 min per km, rounded up).
        etaMin: nearest == null ? 10 : Math.max(1, Math.ceil(nearest * 12)),
        fromPrice: Math.min(...group.items.map((p) => p.price)),
        count: group.items.length,
        distanceKm: nearest,
        best: closest,
      } as RequestTier;
    })
    .sort((a, b) => TIER_META[a.tier].rank - TIER_META[b.tier].rank);
}

export function defaultViewingSlot(now = new Date()) {
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    date: toLocalInput(start).slice(0, 10),
    start: toLocalInput(start),
    end: toLocalInput(end),
  };
}

/** Human status copy shared by the tenant sheet and the owner inbox. */
export const STATUS_COPY: Record<RequestStatus, { label: string; tone: 'live' | 'good' | 'wait' | 'bad' | 'done' }> = {
  pending: { label: 'Waiting for owner', tone: 'wait' },
  confirmed: { label: 'Viewing confirmed', tone: 'good' },
  rescheduled: { label: 'New time proposed', tone: 'wait' },
  checked_in: { label: 'Checked in', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  no_show: { label: 'No show', tone: 'bad' },
  completed: { label: 'Completed', tone: 'done' },
};

export function minutesLeft(expiresAt?: string | null, now = Date.now()): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  return Math.max(0, Math.ceil(ms / 60_000));
}

export function formatSlot(start?: string | null, end?: string | null) {
  if (!start) return '';
  const s = new Date(start);
  const day = s.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = s.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (!end) return `${day} · ${time}`;
  const e = new Date(end).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}–${e}`;
}
