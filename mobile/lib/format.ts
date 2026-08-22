export function formatPrice(amount?: number, unit: 'month' | 'night' = 'month'): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const value = Math.round(amount).toLocaleString('en-KE');
  return unit === 'month' ? `KSh ${value}/month` : `KSh ${value}/night`;
}

export function formatDistance(km?: number): string {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatRating(rating?: number): string {
  if (rating == null) return 'New';
  return rating.toFixed(1);
}

export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
