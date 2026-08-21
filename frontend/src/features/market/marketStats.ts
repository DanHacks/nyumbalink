import type { MapProperty } from '@/features/map/types';

export interface MarketPosition {
  low: number;
  high: number;
  median: number;
  sample: number;
  /** Percentage difference against the local median. Negative = below market. */
  delta: number;
  verdict: 'below' | 'within' | 'above';
}

/**
 * Decision intelligence: compares a listing against comparable local stock
 * (same town + house type + price unit). Returns null when the sample is too
 * small to be honest about — we never present a guess as a fact.
 */
export function marketPosition(p: MapProperty, all: MapProperty[]): MarketPosition | null {
  const peers = all.filter(
    (c) =>
      c.id !== p.id &&
      c.town === p.town &&
      c.priceUnit === p.priceUnit &&
      c.houseType.toLowerCase() === p.houseType.toLowerCase(),
  );
  if (peers.length < 3) return null;

  const prices = peers.map((c) => c.price).sort((a, b) => a - b);
  const q = (f: number) => {
    const i = (prices.length - 1) * f;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return prices[lo] + (prices[hi] - prices[lo]) * (i - lo);
  };
  const low = Math.round(q(0.2));
  const high = Math.round(q(0.8));
  const median = Math.round(q(0.5));
  const delta = Math.round(((p.price - median) / median) * 100);
  const verdict = p.price < low ? 'below' : p.price > high ? 'above' : 'within';

  return { low, high, median, sample: peers.length, delta, verdict };
}