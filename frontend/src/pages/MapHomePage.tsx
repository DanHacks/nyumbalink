import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Locate, Layers, Compass, ShieldCheck,
  RefreshCw, GitCompare, X, Loader2, MapPinOff, Navigation, Plus, Minus,
} from 'lucide-react';
import L from 'leaflet';
import MapCanvas, { type Viewport, type RouteRequest, type RouteResult } from '@/features/map/MapCanvas';
import BottomSheet, { type Snap } from '@/features/map/BottomSheet';
import PropertyPreviewCard from '@/features/map/PropertyPreviewCard';
import DirectionsPanel from '@/features/map/DirectionsPanel';
import FilterSheet, { emptyFilters, type Filters } from '@/features/map/FilterSheet';
import { useMapProperties } from '@/features/map/useMapProperties';
import api from '@/lib/api';
import { buildTierIndex, distanceKm, parseQuery } from '@/features/map/logic';
import type { MapProperty } from '@/features/map/types';
import { formatCurrency, formatDistance, cn } from '@/lib/utils';

const MODES = [
  { id: 'near', label: 'Near me' },
  { id: 'explore', label: 'Explore' },
  { id: 'move', label: 'Move' },
  { id: 'stay', label: 'Stay' },
  { id: 'budget', label: 'Budget' },
] as const;
type Mode = (typeof MODES)[number]['id'];

const PLACES: Record<string, [number, number]> = {
  nairobi: [-1.2864, 36.8172], cbd: [-1.2841, 36.8233], westlands: [-1.2649, 36.8032],
  kilimani: [-1.2894, 36.7855], karen: [-1.3191, 36.7062], kasarani: [-1.2202, 36.8968],
  kisumu: [-0.0917, 34.768], milimani: [-0.1005, 34.7534], manyatta: [-0.0982, 34.7712],
  nyalenda: [-0.1163, 34.7639], kisii: [-0.6817, 34.7667], 'kisii university': [-0.6785, 34.7735],
  nyanchwa: [-0.6905, 34.7842], nakuru: [-0.3031, 36.08], mombasa: [-4.0435, 39.6682],
  nyali: [-4.0435, 39.7003], eldoret: [0.5143, 35.2698], thika: [-1.0388, 37.0834], machakos: [-1.5177, 37.2634],
};

function normalizeBearing(deg: number) {
  return ((deg % 360) + 360) % 360;
}

/** Viewport box (~35 km wide at zoom 12) so a search result triggers a fresh property fetch. */
function viewportAround(c: [number, number]): Viewport {
  return {
    south: c[0] - 0.18,
    west: c[1] - 0.22,
    north: c[0] + 0.18,
    east: c[1] + 0.22,
    zoom: 12,
    center: c,
  };
}

export default function MapHomePage() {
  const [urlParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [pendingViewport, setPendingViewport] = useState<Viewport | null>(null);
  const [query, setQuery] = useState(urlParams.get('q') ?? '');
  const [submitted, setSubmitted] = useState(urlParams.get('q') ?? '');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<MapProperty | null>(null);
  const [snap, setSnap] = useState<Snap>('peek');
  const [satellite, setSatellite] = useState(false);
  const [mode, setMode] = useState<Mode>('explore');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [compare, setCompare] = useState<MapProperty[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const [bearing, setBearing] = useState(0);
  const [route, setRoute] = useState<RouteRequest | null>(null);
  const [routeTarget, setRouteTarget] = useState<MapProperty | null>(null);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking'>('driving');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const { data, isLoading, isFetching, refetch } = useMapProperties(viewport);
  const all = data?.items ?? [];
  const tierOf = useMemo(() => buildTierIndex(all), [all]);

  const parsed = useMemo(() => parseQuery(submitted), [submitted]);

  useEffect(() => {
    if (!submitted) return;
    const key = (parsed.place ?? submitted).toLowerCase().trim();
    const hit = Object.keys(PLACES).find((k) => key.includes(k) || k.includes(key));
    if (hit) {
      setFlyTarget(PLACES[hit]);
      setMode('explore');
      setViewport(viewportAround(PLACES[hit]));
      return;
    }
    let cancelled = false;
    api
      .get('/maps/geocode', { params: { q: key }, timeout: 8000 })
      .then((res) => {
        if (cancelled || !res.data?.found) return;
        const c: [number, number] = [res.data.latitude, res.data.longitude];
        setFlyTarget(c);
        setMode('explore');
        setViewport(viewportAround(c));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [submitted, parsed.place]);

  /** Ask for GPS without moving the map (used when a route is opened). */
  function requestLocation(onFound?: (c: [number, number]) => void) {
    if (!('geolocation' in navigator)) { setLocationError('Location is not supported on this device.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(c); setLocationError(null);
        onFound?.(c);
      },
      () => setLocationError('Location access is optional. Search manually or choose an area.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function locate() {
    requestLocation((c) => { setFlyTarget(c); setMode('near'); setViewport(viewportAround(c)); });
  }

  // Uber-style: center on the tenant as soon as the screen opens —
  // unless they arrived with a destination query (?q=), which wins.
  useEffect(() => {
    if (urlParams.get('q')) return;
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Smoothly animate the map back to north-up (Google-Maps-style compass reset). */
  function resetNorth() {
    const map = mapRef.current;
    if (!map) return;
    const start = normalizeBearing(map.getBearing());
    if (start === 0) return;
    const duration = 350;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const target = start > 180 ? start - 360 : start;
      map.setBearing(target * (1 - eased));
      if (t < 1) requestAnimationFrame(step);
      else map.setBearing(0);
    };
    requestAnimationFrame(step);
  }

  function openDirections(p: MapProperty) {
    const origin: [number, number] = userLocation ?? viewport?.center ?? [-0.0917, 34.768];
    // No fix yet? Ask for one — the route re-anchors as soon as it arrives.
    if (!userLocation) requestLocation();
    setRouteTarget(p);
    setRouteMode('driving');
    setRouteResult(null);
    setRouteLoading(true);
    setRoute({ origin, destination: [p.lat, p.lng], mode: 'driving' });
  }

  function closeDirections() {
    setRoute(null);
    setRouteTarget(null);
    setRouteResult(null);
    setRouteLoading(false);
  }

  // Live tracking while a route is open: the blue dot follows the tenant and the
  // route is recalculated from the new position (>= 20 m movement, no jitter).
  const routeActive = route !== null;
  useEffect(() => {
    if (!routeActive || !('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation((prev) => (prev && distanceKm(prev, next) < 0.02 ? prev : next));
      },
      () => { /* permission denied / no fix — keep the last known origin */ },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [routeActive]);

  // Re-anchor the route origin as soon as a fix arrives (or the tenant moves).
  useEffect(() => {
    if (!route || !userLocation) return;
    if (route.origin[0] === userLocation[0] && route.origin[1] === userLocation[1]) return;
    setRoute((r) => (r ? { ...r, origin: userLocation } : r));
  }, [route, userLocation]);

  const results = useMemo(() => {
    const q = submitted.toLowerCase();
    let list = all.filter((p) => p.safety !== 'blacklisted');

    if (q) {
      list = list.filter((p) =>
        [p.name, p.estate, p.town, p.county, p.houseType, p.nlId, ...p.services]
          .join(' ').toLowerCase().includes(parsed.place ? parsed.place.toLowerCase() : q) ||
        [p.name, p.estate, p.town, p.houseType].join(' ').toLowerCase().includes(q),
      );
      if (parsed.houseType) list = list.filter((p) => p.houseType === parsed.houseType && p.safety !== 'blacklisted');
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

    if (mode === 'stay') list = list.filter((p) => p.priceUnit === 'night');
    if (mode === 'move') list = list.filter((p) => p.priceUnit === 'month');
    if (mode === 'budget') list = list.filter((p) => tierOf(p) === 'budget' || tierOf(p) === 'standard');

    const origin = userLocation ?? viewport?.center;
    if (mode === 'near' && origin) {
      list = list
        .filter((p) => distanceKm(origin as [number, number], [p.lat, p.lng]) < 25)
        .sort((a, b) => distanceKm(origin as [number, number], [a.lat, a.lng]) - distanceKm(origin as [number, number], [b.lat, b.lng]));
    }
    return list;
  }, [all, submitted, parsed, filters, mode, tierOf, userLocation, viewport?.center]);

  const inViewport = useMemo(() => {
    if (!viewport) return results;
    return results.filter(
      (p) => p.lat >= viewport.south && p.lat <= viewport.north && p.lng >= viewport.west && p.lng <= viewport.east,
    );
  }, [results, viewport]);

  const origin = userLocation ?? viewport?.center ?? null;
  // Uber sorts cars by pickup time — we sort houses by distance from the tenant.
  const listed = useMemo(() => {
    const base = inViewport.length ? inViewport : results;
    if (!origin) return base;
    return [...base].sort(
      (a, b) => distanceKm(origin, [a.lat, a.lng]) - distanceKm(origin, [b.lat, b.lng]),
    );
  }, [inViewport, results, origin]);

  // Uber-style option rail: house types act like vehicle classes —
  // each shows live availability count + entry price from current results.
  const typeOptions = useMemo(() => {
    const groups = new Map<string, { count: number; min: number }>();
    for (const p of all.filter((x) => x.safety !== 'blacklisted')) {
      const g = groups.get(p.houseType) ?? { count: 0, min: Infinity };
      g.count += 1;
      g.min = Math.min(g.min, p.price);
      groups.set(p.houseType, g);
    }
    return [...groups.entries()]
      .map(([type, g]) => ({ type, count: g.count, min: g.min }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [all]);

  const activeType = filters.houseTypes.length === 1 ? filters.houseTypes[0] : null;
  const toggleType = (t: string) =>
    setFilters((f) => ({ ...f, houseTypes: activeType === t ? [] : [t] }));

  const summary = useMemo(() => {
    const groups = new Map<string, number>();
    for (const p of listed) {
      const key = `${p.houseType}|${p.priceUnit}`;
      groups.set(key, Math.min(groups.get(key) ?? Infinity, p.price));
    }
    return [...groups.entries()]
      .map(([k, price]) => ({ label: k.split('|')[0], unit: k.split('|')[1], price }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);
  }, [listed]);

  const activeFilterCount =
    filters.kinds.length + filters.houseTypes.length + filters.tiers.length + filters.services.length +
    (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0) +
    [filters.availableOnly, filters.verifiedOnly, filters.videoOnly].filter(Boolean).length;

  const isRotated = Math.abs(bearing % 360) > 0.5;

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-slate-100">
      <div className="absolute inset-0">
        <MapCanvas
          properties={listed}
          selectedId={selected?.id ?? null}
          onSelect={(p) => { setSelected(p); setSnap('peek'); }}
          onViewportChange={(v) => { setPendingViewport(v); if (!viewport) setViewport(v); }}
          userLocation={userLocation}
          flyTarget={flyTarget}
          satellite={satellite}
          center={[-0.0917, 34.768]}
          route={route}
          onRouteResult={(r) => { setRouteResult(r); setRouteLoading(false); }}
          onMapReady={(map) => { mapRef.current = map; }}
          onBearingChange={(b) => setBearing(b)}
        />
      </div>

      {/* Top search layer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 lg:right-[min(40%,460px)]">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl space-y-2">
          <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white/95 p-2 shadow-lg backdrop-blur">
            <Link to="/welcome" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-white shadow-sm">
              NL
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSubmitted(query)}
                placeholder="Where do you want to live?"
                aria-label="Search NyumbaLink"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              {query && (
                <button onClick={() => { setQuery(''); setSubmitted(''); }} aria-label="Clear search" className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="relative shrink-0 rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); if (m.id === 'near') locate(); }}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur',
                  mode === m.id ? 'border-primary bg-primary text-white' : 'border-black/5 bg-white/95 text-slate-700',
                )}
              >
                {m.label}
              </button>
            ))}
            {['bedsitter under 8000 near Kisii University', 'airbnb near Nairobi CBD', 'one bedroom in Kisumu with parking'].map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); setSubmitted(s); }}
                className="shrink-0 rounded-full border border-black/5 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur"
              >
                {s}
              </button>
            ))}
          </div>

          {/* House-type rail — the "choose your ride" row: vehicles → houses */}
          {typeOptions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {typeOptions.map((t) => {
                const active = activeType === t.type;
                return (
                  <button
                    key={t.type}
                    onClick={() => toggleType(t.type)}
                    aria-pressed={active}
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-2xl border px-3 py-2 text-left shadow-sm backdrop-blur transition active:scale-95',
                      active ? 'border-primary bg-secondary text-white' : 'border-black/5 bg-white/95 text-slate-800 hover:border-primary/40',
                    )}
                  >
                    <span className={cn('grid h-9 w-9 place-items-center rounded-xl text-base', active ? 'bg-white/15' : 'bg-orange-100')}>
                      🏠
                    </span>
                    <span>
                      <span className="block text-xs font-bold capitalize leading-tight">{t.type.replace(/_/g, ' ')}</span>
                      <span className={cn('block text-[11px] leading-tight', active ? 'text-slate-300' : 'text-slate-500')}>
                        {t.count} near you • from {formatCurrency(t.min)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {locationError && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 shadow-sm">
              <MapPinOff className="h-4 w-4" /> {locationError}
            </div>
          )}
        </div>
      </div>

      {/* Search this area */}
      {pendingViewport && viewport && pendingViewport.center.join() !== viewport.center.join() && (
        <button
          onClick={() => setViewport(pendingViewport)}
          className="absolute left-1/2 top-32 z-[1000] -translate-x-1/2 lg:left-[30%] rounded-full bg-secondary px-4 py-2 text-xs font-bold text-white shadow-xl"
        >
          <RefreshCw className="mr-1 inline h-3.5 w-3.5" /> Search this area
        </button>
      )}

      {/* Map controls */}
      <div className="absolute right-3 top-40 z-[1000] flex flex-col gap-2 lg:right-[calc(min(40%,460px)+12px)]">
        <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-lg">
          <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" className="grid h-10 w-10 place-items-center text-slate-700 hover:bg-slate-50">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" className="grid h-10 w-10 place-items-center border-t border-slate-100 text-slate-700 hover:bg-slate-50">
            <Minus className="h-4 w-4" />
          </button>
        </div>
        <button onClick={locate} aria-label="Use my location" className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-700 shadow-lg hover:bg-slate-50">
          <Locate className="h-4 w-4" />
        </button>
        <button onClick={() => setSatellite((s) => !s)} aria-label="Toggle satellite" className={cn('grid h-10 w-10 place-items-center rounded-xl shadow-lg', satellite ? 'bg-secondary text-white' : 'bg-white text-slate-700')}>
          <Layers className="h-4 w-4" />
        </button>
        <Link to="/properties" aria-label="Browse all verified listings" className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-700 shadow-lg hover:bg-slate-50">
          <ShieldCheck className="h-4 w-4" />
        </Link>
      </div>

      {/* Compass / north restore — rotates with the map like Google Maps */}
      <button
        onClick={resetNorth}
        aria-label={isRotated ? `Reset north (${Math.round(bearing) % 360}°)` : 'Map is north-up'}
        className={cn(
          'absolute left-3 top-40 z-[1000] grid h-10 w-10 place-items-center rounded-full bg-white shadow-lg transition',
          isRotated ? 'text-red-600 hover:bg-red-50' : 'text-slate-400',
        )}
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        <Compass className="h-5 w-5" />
      </button>
      {isRotated && (
        <div className="absolute left-3 top-[13.5rem] z-[1000] flex items-center gap-1.5 rounded-full bg-secondary/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
          <Navigation className="h-3 w-3" />
          {Math.round(((bearing % 360) + 360) % 360)}° — tap compass to reset north
        </div>
      )}

      {/* Directions panel */}
      {routeTarget && route && (
        <DirectionsPanel
          originLabel={route.origin.join() === (userLocation?.join() ?? '') ? 'My location' : 'Map center'}
          destinationName={routeTarget.name}
          mode={routeMode}
          onModeChange={(m) => {
            setRouteMode(m);
            setRouteLoading(true);
            setRoute((r) => (r ? { ...r, mode: m } : r));
          }}
          result={routeResult}
          loading={routeLoading}
          onClose={closeDirections}
        />
      )}

      {/* Selected marker card — the "your ride is here" panel: price, distance, request CTA */}
      {selected && !routeTarget && (
        <div className="absolute inset-x-3 bottom-[22vh] z-[950] mx-auto max-w-md lg:bottom-6 lg:right-[calc(min(40%,460px)+12px)] lg:left-auto lg:mx-0 lg:w-[380px]">
          <PropertyPreviewCard
            p={selected}
            tier={tierOf(selected)}
            distance={origin ? distanceKm(origin, [selected.lat, selected.lng]) : undefined}
            onClose={() => setSelected(null)}
            onDirections={() => openDirections(selected)}
            compared={compare.some((c) => c.id === selected.id)}
            onCompare={() =>
              setCompare((c) => (c.some((x) => x.id === selected.id) ? c.filter((x) => x.id !== selected.id) : [...c, selected].slice(-3)))
            }
          />
          <button
            onClick={() => navigate(`/properties/${selected.id}`)}
            className="btn-sheen mt-2 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-xl transition hover:bg-primary/90 active:scale-[0.99]"
          >
            Request viewing
            {origin && (
              <span className="font-medium text-white/85"> • {formatDistance(distanceKm(origin, [selected.lat, selected.lng]))} away</span>
            )}
          </button>
        </div>
      )}

      {/* Bottom sheet */}
      <BottomSheet snap={snap} onSnapChange={setSnap}>
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="font-bold text-slate-900">
              {mode === 'near' ? 'Near you' : submitted ? `Results for “${submitted}”` : 'Homes in this area'}
            </h2>
            <p className="text-xs text-slate-500">
              {isLoading ? 'Loading verified homes…' : `${listed.length} verified homes`}
              {data?.backendDown && ' • could not reach the server'}
              {isFetching && !isLoading && ' • updating'}
            </p>
          </div>
          <button onClick={() => setSnap(snap === 'full' ? 'peek' : 'full')} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {snap === 'full' ? 'Show map' : 'Show list'}
          </button>
        </div>

        {summary.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {summary.map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="truncate text-xs font-semibold text-slate-700">{s.label}</p>
                <p className="text-sm font-extrabold text-slate-900">
                  from {formatCurrency(s.price)}
                  <span className="text-[10px] font-medium text-slate-500">/{s.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        )}

        {!isLoading && listed.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <Compass className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="font-semibold text-slate-800">No verified homes in this area yet.</p>
            <p className="mt-1 text-sm text-slate-500">Move the map or expand your search radius.</p>
            <button onClick={() => { setFilters(emptyFilters); setSubmitted(''); setQuery(''); refetch(); }} className="mt-4 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white">
              Reset search
            </button>
          </div>
        )}

        <div className="space-y-3">
          {listed.map((p) => (
            <div key={p.id} onClick={() => { setSelected(p); setFlyTarget([p.lat, p.lng]); }}>
              <PropertyPreviewCard
                p={p}
                tier={tierOf(p)}
                distance={origin ? distanceKm(origin, [p.lat, p.lng]) : undefined}
                onDirections={() => openDirections(p)}
                compared={compare.some((c) => c.id === p.id)}
                onCompare={() => setCompare((c) => (c.some((x) => x.id === p.id) ? c.filter((x) => x.id !== p.id) : [...c, p].slice(-3)))}
                compact
              />
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
          Residential pins show an <strong>approximate</strong> area. Exact directions are released after a
          confirmed viewing. Never send a deposit before verifying a property in person.
        </p>
      </BottomSheet>

      {/* Compare tray */}
      {compare.length > 0 && (
        <button
          onClick={() => setCompareOpen(true)}
          className="absolute bottom-[calc(18vh+16px)] left-3 z-[1000] inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-white shadow-xl"
        >
          <GitCompare className="h-4 w-4" /> Compare {compare.length}
        </button>
      )}

      {compareOpen && (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-secondary/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[85vh] w-full overflow-auto rounded-t-3xl bg-white p-5 sm:max-w-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Compare properties</h2>
              <button onClick={() => setCompareOpen(false)} aria-label="Close compare" className="rounded-full p-1.5 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-2 text-xs uppercase tracking-wide text-slate-400">Metric</th>
                  {compare.map((p) => <th key={p.id} className="py-2 font-semibold text-slate-900">{p.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {([
                  ['Rent', (p: MapProperty) => `${formatCurrency(p.price)}/${p.priceUnit}`],
                  ['Tier', (p: MapProperty) => tierOf(p)],
                  ['Available', (p: MapProperty) => (p.availableUnits > 0 ? `${p.availableUnits} units` : 'None')],
                  ['Wi-Fi', (p: MapProperty) => (p.services.includes('Wi-Fi') ? '✓' : '✕')],
                  ['Water', (p: MapProperty) => (p.services.includes('Water 24/7') ? '✓' : '✕')],
                  ['Parking', (p: MapProperty) => (p.services.includes('Parking') ? '✓' : '✕')],
                  ['Rating', (p: MapProperty) => p.rating.toFixed(1)],
                  ['Trust', (p: MapProperty) => `${p.trustScore}/100`],
                  ['Distance', (p: MapProperty) => (origin ? formatDistance(distanceKm(origin, [p.lat, p.lng])) : '—')],
                ] as [string, (p: MapProperty) => string][]).map(([label, fn]) => (
                  <tr key={label}>
                    <td className="py-2 text-slate-500">{label}</td>
                    {compare.map((p) => <td key={p.id} className="py-2 font-medium text-slate-800">{fn(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => { setCompare([]); setCompareOpen(false); }} className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700">
              Clear comparison
            </button>
          </div>
        </div>
      )}

      <FilterSheet open={filtersOpen} filters={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} resultCount={listed.length} />

      {isFetching && (
        <div className="absolute left-14 top-40 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating map
        </div>
      )}
    </div>
  );
}