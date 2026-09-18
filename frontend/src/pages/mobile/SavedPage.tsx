import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useAllProperties } from '@/features/map/useAllProperties';
import { buildTierIndex } from '@/features/map/logic';
import PropertyPreviewCard from '@/features/map/PropertyPreviewCard';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import { favoritesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function SavedPage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const saved = useLocalCollection<{ id: string }>('nl.saved-properties');
  const { data, isLoading } = useAllProperties();
  const all = useMemo(() => data?.items ?? [], [data]);
  const tierOf = useMemo(() => buildTierIndex(all), [all]);

  const { data: favData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.list(),
    enabled: isAuthenticated,
  });
  const serverIds: string[] = (favData?.data?.favorites ?? []).map((f: any) => f.property?.id).filter(Boolean);
  const serverIdSet = useMemo(() => new Set(serverIds), [favData]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => favoritesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Could not remove'),
  });

  const localItems = all.filter((p) => saved.has(p.id));
  const serverItems = all.filter((p) => serverIdSet.has(p.id));
  const merged = useMemo(() => {
    const seen = new Set<string>();
    return [...serverItems, ...localItems].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [serverItems, localItems]);

  const items = isAuthenticated && serverIds.length > 0 ? merged : localItems;

  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <h1 className="text-lg font-bold text-slate-900">Saved properties</h1>
      <p className="mb-4 text-sm text-slate-500">
        {isAuthenticated ? 'Synced to your account (plus anything saved on this device).' : 'Sign in to sync saved homes across devices.'}
      </p>

      {isLoading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>}

      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <Heart className="mx-auto mb-2 h-6 w-6 text-slate-400" aria-hidden />
          <p className="font-semibold text-slate-800">Nothing saved yet</p>
          <p className="mt-1 text-sm text-slate-500">Tap the heart on any property to keep it here.</p>
          <Link to="/explore?view=map" className="mt-4 inline-block rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white">
            Open the map
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id}>
            <PropertyPreviewCard p={p} tier={tierOf(p)} compact />
            <button
              onClick={() => {
                saved.remove(p.id);
                if (isAuthenticated && serverIdSet.has(p.id)) removeMutation.mutate(p.id);
              }}
              className="mt-1 text-xs font-semibold text-slate-500"
            >
              Remove from saved
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
