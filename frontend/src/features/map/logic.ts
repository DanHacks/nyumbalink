import type { MapProperty, PriceTier } from './types';

export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Price tiers are derived from LOCAL market statistics (per town + price unit),
 * never hard-coded globally, so the model works in any African market.
 */
export function buildTierIndex(properties: MapProperty[]) {
  const groups = new Map<string, number[]>();
  for (const p of properties) {
    const key = `${p.town}|${p.priceUnit}`;
    groups.set(key, [...(groups.get(key) ?? []), p.price]);
  }
  const cuts = new Map<string, [number, number, number]>();
  groups.forEach((prices, key) => {
    const sorted = [...prices].sort((a, b) => a - b);
    cuts.set(key, [percentile(sorted, 0.25), percentile(sorted, 0.75), percentile(sorted, 0.9)]);
  });
  return (p: MapProperty): PriceTier => {
    const c = cuts.get(`${p.town}|${p.priceUnit}`);
    if (!c) return 'standard';
    if (p.price <= c[0]) return 'budget';
    if (p.price <= c[1]) return 'standard';
    if (p.price <= c[2]) return 'premium';
    return 'luxury';
  };
}

export const TIER_STYLE: Record<PriceTier, { label: string; className: string }> = {
  budget: { label: 'Budget', className: 'bg-emerald-100 text-emerald-800' },
  standard: { label: 'Standard', className: 'bg-sky-100 text-sky-800' },
  premium: { label: 'Premium', className: 'bg-amber-100 text-amber-900' },
  luxury: { label: 'Luxury', className: 'bg-purple-100 text-purple-800' },
};

export interface Cluster {
  key: string;
  lat: number;
  lng: number;
  items: MapProperty[];
}

/** Grid clustering — cell size shrinks as the user zooms in. */
export function clusterProperties(items: MapProperty[], zoom: number): Cluster[] {
  if (zoom >= 14) return items.map((p) => ({ key: p.id, lat: p.lat, lng: p.lng, items: [p] }));
  const cell = zoom >= 12 ? 0.02 : zoom >= 10 ? 0.08 : zoom >= 8 ? 0.35 : 1.2;
  const buckets = new Map<string, MapProperty[]>();
  for (const p of items) {
    const key = `${Math.floor(p.lat / cell)}:${Math.floor(p.lng / cell)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), p]);
  }
  return [...buckets.entries()].map(([key, group]) => ({
    key,
    lat: group.reduce((s, p) => s + p.lat, 0) / group.length,
    lng: group.reduce((s, p) => s + p.lng, 0) / group.length,
    items: group,
  }));
}

export interface ParsedQuery {
  text: string;
  /**
   * Free-text left AFTER stripping structured tokens (price phrases, place
   * phrases). Used for matching against listing text so queries like
   * "under 12000" or "bedsitter under 8000" don't literal-match nothing.
   */
  keywords: string;
  maxPrice?: number;
  minPrice?: number;
  houseType?: string;
  services: string[];
  place?: string;
}

const HOUSE_WORDS: [RegExp, string][] = [
  [/bed\s?sitter|bedsitter/i, 'Bedsitter'],
  [/single\s?room/i, 'Single Room'],
  [/studio/i, 'Studio'],
  [/(one|1)\s?(bed|bedroom|br)/i, '1 Bedroom'],
  [/(two|2)\s?(bed|bedroom|br)/i, '2 Bedroom'],
  [/(three|3)\s?(bed|bedroom|br)/i, '3 Bedroom'],
  [/hostel/i, 'Hostel Room'],
];

const SERVICE_WORDS: [RegExp, string][] = [
  [/wi-?fi|internet/i, 'Wi-Fi'],
  [/parking/i, 'Parking'],
  [/water/i, 'Water 24/7'],
  [/security|guard/i, 'Security'],
  [/pool/i, 'Pool'],
  [/kitchen/i, 'Kitchen'],
  [/gym/i, 'Gym'],
  [/solar|backup|power/i, 'Backup Power'],
];

/** Lightweight natural-language search: "bedsitter under 8000 near Kisii University". */
export function parseQuery(raw: string): ParsedQuery {
  const text = raw.trim();
  const out: ParsedQuery = { text, keywords: text, services: [] };
  const under = text.match(/(?:under|below|less than|max)\s*(?:kes|ksh)?\s*([\d,]+)\s*(k)?/i);
  if (under) out.maxPrice = Number(under[1].replace(/,/g, '')) * (under[2] ? 1000 : 1);
  const over = text.match(/(?:over|above|from|min)\s*(?:kes|ksh)?\s*([\d,]+)\s*(k)?/i);
  if (over) out.minPrice = Number(over[1].replace(/,/g, '')) * (over[2] ? 1000 : 1);
  for (const [re, label] of HOUSE_WORDS) if (re.test(text)) { out.houseType = label; break; }
  for (const [re, label] of SERVICE_WORDS) if (re.test(text)) out.services.push(label);
  const place = text.match(/(?:near|in|around|at)\s+([a-z\s]{3,30})/i);
  if (place) out.place = place[1].trim();
  // Keywords = whatever the structured parser did not claim. An empty result
  // means the query was entirely structured (e.g. "under 12000") and the price
  // filter should stand alone.
  out.keywords = text
    .replace(/(?:under|below|less than|max|over|above|from|min)\s*(?:kes|ksh)?\s*[\d,]+\s*k?/gi, ' ')
    .replace(/(?:near|in|around|at)\s+[a-z\s]{3,30}/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}
