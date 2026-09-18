import { Link } from 'react-router-dom';
import { Star, ShieldCheck, Video, MapPin, X, GitCompare, Navigation, Home } from 'lucide-react';
import type { MapProperty, PriceTier } from './types';
import { KIND_LABEL, VERIFICATION_LABEL } from './types';
import { TIER_STYLE } from './logic';
import { formatCurrency, formatDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function AvailabilityPill({ p }: { p: MapProperty }) {
  if (p.availableUnits > 0)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {p.availableUnits} available now
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      {p.availableFrom ? `Available ${p.availableFrom}` : 'Fully occupied'}
    </span>
  );
}

export default function PropertyPreviewCard({
  p,
  tier,
  distance,
  onClose,
  onCompare,
  onDirections,
  compared,
  compact,
}: {
  p: MapProperty;
  tier: PriceTier;
  distance?: number;
  onClose?: () => void;
  onCompare?: () => void;
  onDirections?: () => void;
  compared?: boolean;
  compact?: boolean;
}) {
  const restricted = p.safety === 'restricted' || p.safety === 'blacklisted';
  return (
    <div className="card-lift overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-primary/30">
      <div className="flex">
        <div className={cn('zoom-frame relative shrink-0', compact ? 'h-28 w-28' : 'h-32 w-36')}>
          {p.photo ? (
            <img src={p.photo} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-orange-100 to-amber-50">
              <Home className="h-8 w-8 text-orange-300" />
            </div>
          )}
          {p.demo && (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Demo
            </span>
          )}
          {p.hasWalkthrough && (
            <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
              <Video className="h-3 w-3" /> Video
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{p.name}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <MapPin className="h-3 w-3 shrink-0" />
                {p.estate}, {p.town}
                {typeof distance === 'number' && <span>• {formatDistance(distance)} away</span>}
              </p>
            </div>
            {onClose && (
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', TIER_STYLE[tier].className)}>
              {TIER_STYLE[tier].label}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              {p.houseType} • {KIND_LABEL[p.kind]}
            </span>
            {p.verification !== 'basic' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <ShieldCheck className="h-3 w-3" /> {VERIFICATION_LABEL[p.verification]}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-base font-extrabold text-slate-900">
                {formatCurrency(p.price)}
                <span className="text-xs font-medium text-slate-500">/{p.priceUnit}</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.rating.toFixed(1)}
                <span className="text-slate-400">({p.reviews})</span>
                <span className="text-slate-300">|</span>
                <span className="font-semibold text-slate-700">Trust {p.trustScore}</span>
              </p>
            </div>
            <AvailabilityPill p={p} />
          </div>

          {restricted && (
            <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
              ⚠ Restricted pending NyumbaLink investigation
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Link
              to={`/properties/${p.id}`}
              className="flex-1 rounded-xl bg-secondary px-3 py-2 text-center text-xs font-semibold text-white hover:bg-secondary/90"
            >
              View property
            </Link>
            {onDirections && (
              <button
                onClick={onDirections}
                title="Get directions and travel time"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Navigation className="h-4 w-4" />
                <span className="hidden sm:inline">Directions</span>
              </button>
            )}
            {onCompare && (
              <button
                onClick={onCompare}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-semibold',
                  compared ? 'border-primary bg-orange-50 text-primary' : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                )}
              >
                <GitCompare className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
