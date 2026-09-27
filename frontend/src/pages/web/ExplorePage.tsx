import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, LayoutList, Map as MapIcon, Columns } from 'lucide-react';
import MapCanvas from '@/features/map/MapCanvas';
import MapHomePage from '@/pages/MapHomePage';
import PropertyPreviewCard from '@/features/map/PropertyPreviewCard';
import PriceIntelligence from '@/features/market/PriceIntelligence';
import FilterSheet, { emptyFilters, type Filters } from '@/features/map/FilterSheet';
import { useAllProperties } from '@/features/map/useAllProperties';
import { buildTierIndex, parseQuery } from '@/features/map/logic';
import type { MapProperty } from '@/features/map/types';
import { Reveal } from '@/components/motion';
import { cn } from '@/lib/utils';

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'cheapest', label: 'Cheapest' },
  { id: 'expensive', label: 'Most expensive' },
  { id: 'rated', label: 'Highest rated' },
  { id: 'trusted', label: 'Most trusted' },
  { id: 'available', label: 'Most available' },
] as const;

type PageView = 'list' | 'map';
type ListLayout = 'split' | 'list';

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [submitted, setSubmitted] = useState(params.get('q') ?? '');
  // Deep links such as /explore?maxPrice=12000 (used by the rent calculator)
  // seed the price filters straight from the URL.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...emptyFilters,
    minPrice: Number(params.get('minPrice')) || null,
    maxPrice: Number(params.get('maxPrice')) || null,
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('recommended');
  const [layout, setLayout] = useState<ListLayout>('split');
  const [selected, setSelected] = useState<MapProperty | null>(null);

  const pageView: PageView = params.get('view') === 'map' ? 'map' : 'list';
  const setPageView = (view: PageView) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (view === 'map') next.set('view', 'map');
      else next.delete('view');
      return next;
    });
  };

  const kind = params.get('kind');
  const { data, isLoading } = useAllProperties();
  const all = useMemo(() => data?.items ?? [], [data]);
  const tierOf = useMemo(() => buildTierIndex(all), [all]);
  const parsed = useMemo(() => parseQuery(submitted), [submitted]);

  const results = useMemo(() => {
    let list = all.filter((p) => p.safety !== 'blacklisted');
    if (kind) list = list.filter((p) => p.kind === kind);
    const q = submitted.trim().toLowerCase();
    if (q) {
      // Match on the place phrase when present, otherwise on the leftover
      // keywords — a fully structured query ("under 12000") has no keywords
      // and must filter by price alone instead of matching no text at all.
      const matchText = (parsed.place ?? parsed.keywords).toLowerCase();
      const terms = matchText.split(/\s+/).filter(Boolean);
      if (terms.length) {
        list = list.filter((p) => {
          const hay = [p.name, p.estate, p.town, p.county, p.houseType, p.nlId, ...p.services]
            .join(' ')
            .toLowerCase();
          return terms.every((t) => hay.includes(t));
        });
      }
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
    if (sort === 'expensive') sorted.sort((a, b) => b.price - a.price);
    if (sort === 'rated') sorted.sort((a, b) => b.rating - a.rating);
    if (sort === 'trusted') sorted.sort((a, b) => b.trustScore - a.trustScore);
    if (sort === 'available') sorted.sort((a, b) => b.availableUnits - a.availableUnits);
    return sorted;
  }, [all, kind, submitted, parsed, filters, tierOf, sort]);

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" role="tablist" aria-label="Explore view">
          {([
            ['list', LayoutList, 'List'],
            ['map', MapIcon, 'Map'],
          ] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={pageView === id}
              onClick={() => setPageView(id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition',
                pageView === id ? 'bg-secondary text-white' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {pageView === 'list' && (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(query);
                setParams(query ? { q: query } : {});
              }}
              className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <Search className="h-4 w-4 text-slate-400" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Bedsitter under 8000 near Kisii University"
                aria-label="Search properties"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </form>

            <button
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
            </button>

            <label className="sr-only" htmlFor="sort">Sort results</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              {([['split', Columns], ['list', LayoutList]] as const).map(([id, Icon]) => (
                <button
                  key={id}
                  onClick={() => setLayout(id)}
                  aria-label={`${id} layout`}
                  className={cn('grid h-9 w-10 place-items-center', layout === id ? 'bg-secondary text-white' : 'text-slate-600')}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {pageView === 'map' ? (
        <div className="-mx-6 -mb-6 overflow-hidden rounded-t-2xl border border-slate-200 [&>div]:!h-[calc(100dvh-12rem)]">
          <MapHomePage />
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {isLoading ? 'Loading verified homes…' : `${results.length} verified homes`}
            {data?.backendDown && ' • could not reach the server'}
          </p>

          <div className={cn('grid gap-6', layout === 'split' && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]')}>
            <div className="space-y-4">
                {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-100" />)}

                {!isLoading && results.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
                    <p className="font-semibold text-slate-800">No verified homes match this search.</p>
                    <p className="mt-1 text-sm text-slate-500">Reset the filters or widen your budget range.</p>
                    <button
                      onClick={() => { setFilters(emptyFilters); setSubmitted(''); setQuery(''); setParams({}); }}
                      className="mt-4 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white"
                    >
                      Reset search
                    </button>
                  </div>
                )}

                <div className={cn('grid gap-4', layout === 'list' && 'sm:grid-cols-2 xl:grid-cols-3')}>
                  {results.map((p, i) => (
                    <Reveal key={p.id} delay={Math.min(i, 8) * 0.05}>
                      <div onMouseEnter={() => setSelected(p)}>
                        <PropertyPreviewCard p={p} tier={tierOf(p)} compact />
                      </div>
                    </Reveal>
                  ))}
                </div>
            </div>

            {layout !== 'list' && (
              <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <div className="h-[620px] overflow-hidden rounded-xl border border-slate-200">
                  <MapCanvas
                    properties={results}
                    selectedId={selected?.id ?? null}
                    onSelect={setSelected}
                    onViewportChange={() => {}}
                    userLocation={null}
                    flyTarget={selected ? [selected.lat, selected.lng] : null}
                    satellite={false}
                    center={[-0.6, 36.8]}
                    route={null}
                    onRouteResult={() => {}}
                    onMapReady={() => {}}
                    onBearingChange={() => {}}
                  />
                </div>
                {selected && <PriceIntelligence property={selected} all={all} />}
              </div>
            )}
          </div>

          <FilterSheet open={filtersOpen} filters={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} resultCount={results.length} />
        </>
      )}
    </div>
  );
}
