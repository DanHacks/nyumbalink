import { Car, Footprints, X, MapPin, Navigation, Loader2 } from 'lucide-react';
import type { RouteResult } from './MapCanvas';
import { formatDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';

function formatEta(min: number) {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export default function DirectionsPanel({
  originLabel,
  destinationName,
  mode,
  onModeChange,
  result,
  loading,
  onClose,
}: {
  originLabel: string;
  destinationName: string;
  mode: 'driving' | 'walking';
  onModeChange: (m: 'driving' | 'walking') => void;
  result: RouteResult | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-[18vh] z-[1000] mx-auto max-w-md lg:inset-x-auto lg:bottom-6 lg:left-[max(12px,calc(50vw-620px))] lg:mx-0 lg:w-[380px]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-3">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange-100 text-primary">
              <Navigation className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">Directions to {destinationName}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <MapPin className="h-3 w-3 shrink-0" /> From {originLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close directions" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 p-2">
          {(['driving', 'walking'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold',
                mode === m ? 'bg-secondary text-white' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {m === 'driving' ? <Car className="h-4 w-4" /> : <Footprints className="h-4 w-4" />}
              {m === 'driving' ? 'Driving' : 'Walking'}
            </button>
          ))}
        </div>

        <div className="space-y-2 p-3">
          {loading || !result ? (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculating route…
            </div>
          ) : null}

          {!loading && result && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{formatEta(result.durationMin)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDistance(result.distanceKm)}
                    {mode === 'walking' ? ' • ~5 km/h' : ''}
                  </p>
                </div>
                {result.estimated && (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                    Estimated route
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                <span className="truncate">{originLabel}</span>
                <span className="mx-1 shrink-0 text-slate-300">→</span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
                <span className="truncate font-medium text-slate-800">{destinationName}</span>
              </div>
            </>
          )}

          {!loading && result && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${result.coordinates[0][0]},${result.coordinates[0][1]}&destination=${result.coordinates[result.coordinates.length - 1][0]},${result.coordinates[result.coordinates.length - 1][1]}&travelmode=${mode}`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl bg-secondary py-2.5 text-center text-xs font-bold text-white hover:bg-secondary/90"
            >
              Open in Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}