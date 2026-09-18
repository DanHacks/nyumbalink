import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, BellPlus, ShieldCheck } from 'lucide-react';
import { useAllProperties } from '@/features/map/useAllProperties';
import { buildTierIndex, parseQuery } from '@/features/map/logic';
import FilterSheet, { emptyFilters, type Filters } from '@/features/map/FilterSheet';
import PropertyPreviewCard from '@/features/map/PropertyPreviewCard';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Bedsitter under 8000 near Kisii University',
  'One bedroom in Kisumu with parking',
  'Cheap hostel near campus',
  'Airbnb near Nairobi CBD',
  'Guest house with Wi-Fi under 3000',
];

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'cheapest', label: 'Cheapest' },
  { id: 'rated', label: 'Highest rated' },
  { id: 'trusted', label: 'Most trusted' },
  { id: 'available', label: 'Most available' },
] as const;

export default function MobileSearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('recommended');

  const { data, isLoading } = useAllProperties();
  const all = useMemo(() => data?.items ?? [], [data]);
  const tierOf = useMemo(() => buildTierIndex(all), [all]);
  const parsed = useMemo(() => parseQuery(submitted), [submitted]);
  const savedSearches = useLocalCollection<{ id: string; label: string }>('nl.saved-searches');

  const results = useMemo(() => {
    let list = all.filter((p) => p.safety !== 'blacklisted');
    const q = submitted.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.name, p.estate, p.town, p.county, p.houseType, p.nlId, ...p.services].join(' ').toLowerCase().includes(
          parsed.place?.toLowerCase() ?? q,
        ),
      );
      if (parsed.houseType) list = list.filter((p) => p.houseType === parsed.houseType);
      if (parsed.maxPrice) list = list.filter((p) => p.price <= parsed.maxPrice!);
      if (parsed.minPrice) list = list.filter((p) => p.price >= parsed.minPrice!);
      if (parsed.services.length) list = list.filter((p) => parsed.services.every((s) => p.services.includes(s)));
    }
    if (filters.kinds.length) list = list.filter((p) => filters.kinds.includes(p.kind));
    if (filters.houseTypes.length) list = list.filter((p) => filters.houseTypes.includes(p.houseType));
    if (filters.tiers.length) list = list.filter((p) => filters.tiers.includes(tierOf(p)));
    if (filters.minPrice) list = list.filter((p) => p.price >= filters.minPrice!);
    if (filters.maxPrice) list = list.filter((p) => p.price <= filters.maxPrice!);
    if (filters.services.length) list = list.filter((p) => filters.services.every((s) => p.services.includes(s)));
    if (filters.availableOnly) list = list.filter((p) => p.availableUnits > 0);
    if (filters.verifiedOnly) list = list.filter((p) => p.verification !== 'basic');
    if (filters.videoOnly) list = list.filter((p) => p.hasWalkthrough);

    const sorted = [...list];
    if (sort === 'cheapest') sorted.sort((a, b) => a.price - b.price);
    if (sort === 'rated') sorted.sort((a, b) => b.rating - a.rating);
    if (sort === 'trusted') sorted.sort((a, b) => b.trustScore - a.trustScore);
    if (sort === 'available') sorted.sort((a, b) => b.availableUnits - a.availableUnits);
    return sorted;
  }, [all, submitted, parsed, filters, tierOf, sort]);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 pb-3 pt-4">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSubmitted(query)}
            placeholder="Where do you want to live?"
            aria-label="Search properties"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => setFiltersOpen(true)}
            aria-label="Filters"
            className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold',
                sort === s.id ? 'border-secondary bg-secondary text-white' : 'border-slate-200 text-slate-600',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {!submitted && (
          <section className="mb-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Try searching</h2>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    setSubmitted(s);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm text-slate-700"
                >
                  <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {submitted && (
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{results.length} results</p>
            <button
              onClick={() => savedSearches.add({ id: submitted, label: submitted })}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <BellPlus className="h-3.5 w-3.5" aria-hidden /> Save search
            </button>
          </div>
        )}

        {isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div>}

        {!isLoading && submitted && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-slate-400" aria-hidden />
            <p className="font-semibold text-slate-800">No verified homes match this search.</p>
            <p className="mt-1 text-sm text-slate-500">Try a wider budget or a nearby area.</p>
          </div>
        )}

        <div className="space-y-3">
          {results.map((p) => (
            <div key={p.id}>
              <PropertyPreviewCard p={p} tier={tierOf(p)} compact />
            </div>
          ))}
        </div>

        {savedSearches.items.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Saved searches</h2>
            <div className="space-y-2">
              {savedSearches.items.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <button
                    onClick={() => {
                      setQuery(s.label);
                      setSubmitted(s.label);
                    }}
                    className="truncate text-left text-sm text-slate-700"
                  >
                    {s.label}
                  </button>
                  <button onClick={() => savedSearches.remove(s.id)} className="text-xs font-semibold text-slate-500">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <FilterSheet open={filtersOpen} filters={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} resultCount={results.length} />
    </div>
  );
}