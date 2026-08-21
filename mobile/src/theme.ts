export const colors = {
  primary: '#16a34a',
  primaryDark: '#15803d',
  primaryForeground: '#f8fafc',
  teal700: '#0f766e',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  border: '#e2e8f0',
  card: '#ffffff',
  destructive: '#dc2626',
  warning: '#d97706',
  star: '#f59e0b',
};

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 16,
};

export const spacing = (n: number) => n * 4;

export const font = {
  bold: '700',
  semibold: '600',
  medium: '500',
  regular: '400',
} as const;

export const formatCurrency = (amount?: number | null, currency = 'KES') => {
  if (amount == null) return 'Price on request';
  return `${currency} ${Number(amount).toLocaleString('en-KE')}`;
};

export const formatDistance = (km?: number | null) => {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};
