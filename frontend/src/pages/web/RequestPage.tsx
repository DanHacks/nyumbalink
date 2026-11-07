import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Crosshair, LocateFixed, MapPin, Satellite, Search, X } from 'lucide-react';
import type L from 'leaflet';
import MapCanvas, { type Viewport, type RouteRequest, type RouteResult } from '@/features/map/MapCanvas';
import DirectionsPanel from '@/features/map/DirectionsPanel';
import { useMapProperties } from '@/features/map/useMapProperties';
import { buildTierIndex, distanceKm } from '@/features/map/logic';
import type { MapProperty } from '@/features/map/types';
import RequestSheet, { type SheetStage } from '@/features/booking/RequestSheet';
import { buildRequestTiers, type BookingView, type RequestEvent, type RequestTier } from '@/features/booking/logic';
import { useRealtime, type RealtimeEvent } from '@/lib/realtime';
import { bookingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'rescheduled']);

function viewportAround(c: [number, number], zoom = 13): Viewport {
  const d = zoom >= 13 ? 0.045 : 0.18;
  return { south: c[0] - d, west: c[1] - d * 1.2, north: c[0] + d, east: c[1] + d * 1.2, zoom, center: c };
}

export default function RequestPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();

  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [submitted, setSubmitted] = useState(params.get('q') ?? '');
  const [satellite, setSatellite] = useState(false);

  const [selectedTier, setSelectedTier] = useState<RequestTier['tier'] | null>(null);
  const [stage, setStage] = useState<SheetStage>({ kind: 'choose' });
  const [busy, setBusy] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const [route, setRoute] = useState<RouteRequest | null>(null);
  const [routeTarget, setRouteTarget] = useState<MapProperty | null>(null);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking'>('driving');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const { data } = useMapProperties(viewport);
  const all = data?.items ?? [];
  const tierOf = useMemo(() => buildTierIndex(all), [all]);

  const origin = userLocation ?? viewport?.center ?? null;

  const distanceOf = useCallback(
    (p: MapProperty) => (origin ? distanceKm(origin, [p.lat, p.lng]) : null),
    [origin],
  );

  const nearby = useMemo(() => {
    if (!origin) return all;
    return [...all].sort(
      (a, b) => (distanceOf(a) ?? 0) - (distanceOf(b) ?? 0),
    ).slice(0, 60);
  }, [all, origin, distanceOf]);

  const tiers = useMemo(
    () => buildRequestTiers(nearby, tierOf, distanceOf),
    [nearby, tierOf, distanceOf],
  );

  // Keep the chosen tier valid as listings load in and out.
  useEffect(() => {
    if (tiers.length === 0) return;
    if (!selectedTier || !tiers.some((t) => t.tier === selectedTier)) {
      setSelectedTier(tiers[0].tier);
    }
  }, [tiers, selectedTier]);

  const selectedTierData = tiers.find((t) => t.tier === selectedTier) ?? null;

  useEffect(() => {
    if (selectedTierData) setSelectedProperty(selectedTierData.best);
  }, [selectedTierData?.best.id, selectedTierData?.tier]);

  // Follow the user on first load, unless a ?q= destination was supplied.
  useEffect(() => {
    if (params.get('q')) {
      const q = params.get('q')!.toLowerCase();
      if (q.includes('nairobi') || q.includes('westlands') || q.includes('kilimani')) {
        const c: [number, number] = [-1.286, 36.817];
        setFlyTarget(c);
        setViewport(viewportAround(c));
      } else if (q.includes('mombasa') || q.includes('nyali')) {
        const c: [number, number] = [-4.043, 39.668];
        setFlyTarget(c);
        setViewport(viewportAround(c));
      } else {
        api
          .get('/maps/geocode', { params: { q }, timeout: 8000 })
          .then((res) => {
            if (!res.data?.found) return;
            const c: [number, number] = [res.data.latitude, res.data.longitude];
            setFlyTarget(c);
            setViewport(viewportAround(c));
          })
          .catch(() => {});
      }
      return;
    }
    if (!('geolocation' in navigator)) {
      setViewport(viewportAround([-0.0917, 34.768], 12));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(c);
        setFlyTarget(c);
        setViewport(viewportAround(c));
      },
      () => setViewport(viewportAround([-0.0917, 34.768], 12)),
      { enableHighAccuracy: true, timeout: 8000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!submitted) return;
    api
      .get('/maps/geocode', { params: { q: submitted.trim().toLowerCase() }, timeout: 8000 })
      .then((res) => {
        if (!res.data?.found) return;
        const c: [number, number] = [res.data.latitude, res.data.longitude];
        setFlyTarget(c);
        setViewport(viewportAround(c));
      })
      .catch(() => {});
  }, [submitted]);

  // Resume an in-flight request after a refresh.
  useEffect(() => {
    if (!isAuthenticated) return;
    bookingsApi
      .getMyBookings({ page_size: 10 })
      .then((res) => {
        const active = (res.data as BookingView[]).find((b) => ACTIVE_STATUSES.has(b.status));
        if (active) setStage({ kind: 'live', booking: active });
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const liveStatus = useRealtime(
    useCallback(
      (event: RealtimeEvent) => {
        const e = event as unknown as RequestEvent;
        setStage((prev) => {
          if (prev.kind !== 'live' || !e.booking_id || e.booking_id !== prev.booking.id) return prev;
          const next: BookingView = {
            ...prev.booking,
            status: e.status ?? prev.booking.status,
            scheduled_time_start: e.scheduled_time_start ?? prev.booking.scheduled_time_start,
            scheduled_time_end: e.scheduled_time_end ?? prev.booking.scheduled_time_end,
            responded_at: e.responded_at ?? prev.booking.responded_at,
            decline_reason: e.decline_reason ?? prev.booking.decline_reason,
            proposed_time_start: e.proposed_time_start ?? prev.booking.proposed_time_start,
            proposed_time_end: e.proposed_time_end ?? prev.booking.proposed_time_end,
            qr_code: e.qr_code ?? prev.booking.qr_code,
            owner_notes: e.owner_notes ?? prev.booking.owner_notes,
          };
          if (e.type === 'booking_accepted') toast.success('Owner accepted — viewing confirmed');
          if (e.type === 'booking_declined') toast.error('Owner declined this request');
          if (e.type === 'booking_proposed') toast('Owner suggested a new time', { icon: '🕓' });
          return { kind: next.status === 'cancelled' ? 'done' : 'live', booking: next };
        });
      },
      [],
    ),
  );

  const requestViewing = async (
    property: MapProperty,
    slot: { date: string; start: string; end: string },
    notes: string,
  ) => {
    if (!isAuthenticated) {
      toast.error('Log in to request a viewing');
      navigate('/login');
      return;
    }
    if (['owner', 'caretaker', 'agent', 'host', 'manager', 'admin'].includes(user?.role ?? '')) {
      toast.error('Owner accounts cannot request viewings');
      return;
    }
    if (!slot.start || !slot.end) {
      toast.error('Pick a viewing time');
      return;
    }
    setBusy(true);
    setStage({ kind: 'submitting' });
    try {
      const res = await bookingsApi.create({
        property_id: property.id,
        scheduled_date: new Date(slot.start).toISOString(),
        scheduled_time_start: new Date(slot.start).toISOString(),
        scheduled_time_end: new Date(slot.end).toISOString(),
        tenant_notes: notes.trim() || undefined,
      });
      setStage({ kind: 'live', booking: res.data as BookingView });
      toast.success('Request sent — waiting for the owner');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Could not send the request');
      setStage({ kind: 'choose' });
    } finally {
      setBusy(false);
    }
  };

  const openDirections = (p: MapProperty) => {
    const from: [number, number] = userLocation ?? viewport?.center ?? [-0.0917, 34.768];
    setRouteTarget(p);
    setRouteMode('walking');
    setRouteResult(null);
    setRouteLoading(true);
    setRoute({ origin: from, destination: [p.lat, p.lng], mode: 'walking' });
  };

  const locate = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(c);
        setFlyTarget(c);
        setViewport(viewportAround(c));
      },
      () => toast.error('Location unavailable'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden bg-slate-100">
      <MapCanvas
        properties={all}
        selectedId={selectedProperty?.id ?? null}
        onSelect={(p) => p && setSelectedProperty(p)}
        onViewportChange={setViewport}
        userLocation={userLocation}
        flyTarget={flyTarget}
        satellite={satellite}
        center={viewport?.center ?? [-0.0917, 34.768]}
        route={route}
        onRouteResult={(r) => {
          setRouteResult(r);
          setRouteLoading(false);
        }}
        onMapReady={(m) => {
          mapRef.current = m;
        }}
        onBearingChange={() => {}}
      />

      {/* Destination bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[850] p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(query);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Where do you want to live?"
              aria-label="Destination"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-slate-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear" className="text-slate-400">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
          <button
            onClick={locate}
            title="Use my location"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSatellite((s) => !s)}
            title="Toggle satellite"
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl border',
              satellite ? 'border-secondary bg-secondary text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
            )}
          >
            <Satellite className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selected property chip */}
      {selectedProperty && (
        <button
          onClick={() => setSelectedProperty(null)}
          className="absolute right-3 top-20 z-[840] flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg sm:right-4"
        >
          <MapPin className="h-3 w-3" />
          {selectedProperty.name}
          <Crosshair className="h-3 w-3 opacity-60" />
        </button>
      )}

      <RequestSheet
        tiers={tiers}
        selectedTier={selectedTier}
        onSelectTier={(t) => {
          setSelectedTier(t);
          const tier = tiers.find((x) => x.tier === t);
          if (tier) setFlyTarget([tier.best.lat, tier.best.lng]);
        }}
        stage={stage}
        onRequest={requestViewing}
        liveStatus={liveStatus}
        onDirections={openDirections}
        onOpenProperty={(p) => navigate(`/properties/${p.id}`)}
        onDismiss={() => setStage({ kind: 'choose' })}
        busy={busy}
      />

      {routeTarget && (
        <DirectionsPanel
          originLabel={userLocation ? 'your location' : 'map centre'}
          destinationName={routeTarget.name}
          mode={routeMode}
          onModeChange={(m) => {
            setRouteMode(m);
            setRouteLoading(true);
            setRoute({
              origin: userLocation ?? viewport?.center ?? [-0.0917, 34.768],
              destination: [routeTarget.lat, routeTarget.lng],
              mode: m,
            });
          }}
          result={routeResult}
          loading={routeLoading}
          onClose={() => {
            setRoute(null);
            setRouteTarget(null);
            setRouteResult(null);
          }}
        />
      )}
    </div>
  );
}
