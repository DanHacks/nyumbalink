import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAllProperties } from '@/features/map/useAllProperties';
import { buildTierIndex } from '@/features/map/logic';
import PropertyPreviewCard from '@/features/map/PropertyPreviewCard';
import { useLocalCollection } from '@/hooks/useLocalCollection';

export default function SavedPage() {
  const saved = useLocalCollection<{ id: string }>('nl.saved-properties');
  const { data, isLoading } = useAllProperties();
  const all = useMemo(() => data?.items ?? [], [data]);
  const tierOf = useMemo(() => buildTierIndex(all), [all]);
  const items = all.filter((p) => saved.has(p.id));

  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <h1 className="text-lg font-bold text-slate-900">Saved properties</h1>
      <p className="mb-4 text-sm text-slate-500">Price and availability changes are tracked for saved homes.</p>

      {isLoading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>}

      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <Heart className="mx-auto mb-2 h-6 w-6 text-slate-400" aria-hidden />
          <p className="font-semibold text-slate-800">Nothing saved yet</p>
          <p className="mt-1 text-sm text-slate-500">Tap the heart on any property to keep it here.</p>
          <Link to="/" className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Open the map
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id}>
            <PropertyPreviewCard p={p} tier={tierOf(p)} compact />
            <button onClick={() => saved.remove(p.id)} className="mt-1 text-xs font-semibold text-slate-500">
              Remove from saved
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}