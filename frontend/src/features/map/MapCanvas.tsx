import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import 'leaflet.gridlayer.googlemutant';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import type { MapProperty } from './types';
import { KIND_EMOJI } from './types';
import { clusterProperties } from './logic';

let googleMapsPromise: Promise<void> | null = null;
let configuredKey: string | null = null;
function ensureGoogleMaps(apiKey: string): Promise<void> {
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key'));
  if (configuredKey !== apiKey) {
    setOptions({ key: apiKey, v: 'weekly' });
    configuredKey = apiKey;
    googleMapsPromise = null;
  }
  if (googleMapsPromise) return googleMapsPromise;
  googleMapsPromise = importLibrary('maps').then(() => {}) as Promise<void>;
  return googleMapsPromise;
}

function GoogleBaseLayer({ satellite, apiKey }: { satellite: boolean; apiKey: string | null }) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    ensureGoogleMaps(apiKey)
      .then(() => {
        if (cancelled) return;
        // @ts-ignore - added by leaflet.gridlayer.googlemutant
        const layer = (L.gridLayer as any).googleMutant({ type: satellite ? 'hybrid' : 'roadmap' }).addTo(map);
        layerRef.current = layer;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }
    };
  }, [map, satellite, apiKey]);
  return null;
}

export interface Viewport {
  south: number;
  west: number;
  north: number;
  east: number;
  zoom: number;
  center: [number, number];
}

export interface RouteRequest {
  origin: [number, number];
  destination: [number, number];
  mode: 'driving' | 'walking';
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][];
  estimated: boolean;
}

function clusterIcon(count: number) {
  const size = count > 99 ? 62 : count > 24 ? 54 : 46;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:rgba(5,150,105,.95);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 8px 20px rgba(4,120,87,.35);font-weight:800;line-height:1">
      <span style="font-size:${size > 50 ? 16 : 14}px">${count}</span>
      <span style="font-size:8px;letter-spacing:.08em;opacity:.85">HOMES</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function priceIcon(p: MapProperty, active: boolean) {
  const price = p.price >= 1000 ? `${Math.round(p.price / 1000)}K` : `${p.price}`;
  const bg = active ? '#0f766e' : p.safety === 'active' ? '#ffffff' : '#fef2f2';
  const fg = active ? '#ffffff' : '#0f172a';
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9999px;background:${bg};color:${fg};border:1.5px solid ${active ? '#0f766e' : 'rgba(15,23,42,.12)'};box-shadow:0 6px 16px rgba(15,23,42,.18);font-weight:700;font-size:12px;white-space:nowrap">
      <span style="font-size:13px">${KIND_EMOJI[p.kind]}</span>
      <span>${price}</span>
      ${p.availableUnits > 0 ? '<span style="width:7px;height:7px;border-radius:9999px;background:#22c55e"></span>' : ''}
    </div>`,
    iconSize: [86, 32],
    iconAnchor: [43, 32],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.2)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:#dc2626;border:3px solid #fff;box-shadow:0 4px 12px rgba(220,38,38,.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const originIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function ViewportWatcher({ onChange }: { onChange: (v: Viewport) => void }) {
  const map = useMapEvents({
    moveend: () => emit(),
    zoomend: () => emit(),
    rotate: () => emit(),
  } as any);
  function emit() {
    const b = map.getBounds();
    const c = map.getCenter();
    onChange({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
      zoom: map.getZoom(),
      center: [c.lat, c.lng],
    });
  }
  useEffect(() => { emit(); /* eslint-disable-next-line */ }, []);
  return null;
}

function FlyTo({ target, zoom }: { target: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, zoom ?? Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [target?.[0], target?.[1], zoom]);
  return null;
}

/** Wires the raw Leaflet map to the parent and syncs bearing changes. */
function RotationController({
  onReady,
  onBearingChange,
}: {
  onReady: (map: L.Map) => void;
  onBearingChange: (bearing: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    if (map.touchRotate) map.touchRotate.enable();
    const sync = () => onBearingChange(map.getBearing());
    map.on('rotate', sync);
    sync();
    return () => {
      map.off('rotate', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Google-Maps-style route layer: drives OSRM (driving/foot profiles) and
 *  falls back to an estimated straight line when the router is unreachable. */
function RoutingLayer({
  route,
  onResult,
}: {
  route: RouteRequest | null;
  onResult: (r: RouteResult | null) => void;
}) {
  const map = useMap();
  const layersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!layersRef.current) {
      layersRef.current = L.layerGroup().addTo(map);
    }
    const group = layersRef.current;
    group.clearLayers();

    if (!route) {
      onResult(null);
      return;
    }

    let cancelled = false;
    const { origin, destination, mode } = route;
    const profile = mode === 'walking' ? 'foot' : 'driving';
    const [oLon, oLat] = [origin[1], origin[0]];
    const [dLon, dLat] = [destination[1], destination[0]];

    const drawStraightLine = () => {
      const km = haversineKm(origin, destination);
      const speed = mode === 'walking' ? 5 : 35;
      const coords: [number, number][] = [origin, destination];
      L.polyline(coords, {
        color: mode === 'walking' ? '#0ea5e9' : '#2563eb',
        weight: 5,
        opacity: 0.85,
        dashArray: mode === 'walking' ? '8 8' : undefined,
      }).addTo(group);
      L.marker(origin, { icon: originIcon }).addTo(group);
      L.marker(destination, { icon: destinationIcon }).addTo(group);
      onResult({
        distanceKm: km,
        durationMin: (km / speed) * 60,
        coordinates: coords,
        estimated: true,
      });
    };

    fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${oLon},${oLat};${dLon},${dLat}?overview=full&geometries=geojson&steps=false`,
      { signal: AbortSignal.timeout(9000) },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('router unavailable'))))
      .then((json) => {
        if (cancelled) return;
        const routeData = json?.routes?.[0];
        if (!routeData) return drawStraightLine();
        const coords = (routeData.geometry.coordinates as [number, number][]).map(
          ([lon, lat]) => [lat, lon] as [number, number],
        );
        L.polyline(coords, {
          color: mode === 'walking' ? '#0ea5e9' : '#2563eb',
          weight: 5,
          opacity: 0.9,
          dashArray: mode === 'walking' ? '8 8' : undefined,
        }).addTo(group);
        L.marker(origin, { icon: originIcon }).addTo(group);
        L.marker(destination, { icon: destinationIcon }).addTo(group);
        onResult({
          distanceKm: routeData.distance / 1000,
          durationMin: routeData.duration / 60,
          coordinates: coords,
          estimated: false,
        });
      })
      .catch(() => {
        if (!cancelled) drawStraightLine();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.origin?.[0], route?.origin?.[1], route?.destination?.[0], route?.destination?.[1], route?.mode, map, onResult]);

  return null;
}

export default function MapCanvas({
  properties,
  selectedId,
  onSelect,
  onViewportChange,
  userLocation,
  flyTarget,
  satellite,
  center,
  route,
  onRouteResult,
  onMapReady,
  onBearingChange,
}: {
  properties: MapProperty[];
  selectedId: string | null;
  onSelect: (p: MapProperty | null) => void;
  onViewportChange: (v: Viewport) => void;
  userLocation: [number, number] | null;
  flyTarget: [number, number] | null;
  satellite: boolean;
  center: [number, number];
  route: RouteRequest | null;
  onRouteResult: (r: RouteResult | null) => void;
  onMapReady: (map: L.Map) => void;
  onBearingChange: (bearing: number) => void;
}) {
  const [zoom, setZoom] = useState(13);
  const clusters = useMemo(() => clusterProperties(properties, zoom), [properties, zoom]);
  const { key: mapsKey, loading: mapsLoading } = useGoogleMapsKey();

  return (
    <MapContainer
      center={center}
      zoom={13}
      zoomControl={false}
      rotateControl={false}
      touchRotate
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer
        url={satellite ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
        attribution={satellite ? "&copy; Esri" : "&copy; OpenStreetMap"}
        maxZoom={20}
      />
      {mapsKey && <GoogleBaseLayer satellite={satellite} apiKey={mapsKey} />}

      <ViewportWatcher onChange={(v) => { setZoom(v.zoom); onViewportChange(v); }} />
      <FlyTo target={flyTarget} />
      <RotationController onReady={onMapReady} onBearingChange={onBearingChange} />
      <RoutingLayer route={route} onResult={onRouteResult} />

      {userLocation && <Marker position={userLocation} icon={userIcon} />}

      {clusters.map((c) =>
        c.items.length > 1 ? (
          <Marker
            key={c.key}
            position={[c.lat, c.lng]}
            icon={clusterIcon(c.items.length)}
            eventHandlers={{ click: (e) => e.target._map.flyTo([c.lat, c.lng], Math.min(17, zoom + 3)) }}
          />
        ) : (
          <Marker
            key={c.items[0].id}
            position={[c.items[0].lat, c.items[0].lng]}
            icon={priceIcon(c.items[0], c.items[0].id === selectedId)}
            eventHandlers={{ click: () => onSelect(c.items[0]) }}
          />
        ),
      )}

      {/* Residential listings are shown as an approximate radius, never an exact door. */}
      {selectedId &&
        properties
          .filter((p) => p.id === selectedId && p.locationPrecision === 'approximate')
          .map((p) => (
            <Circle
              key={`halo-${p.id}`}
              center={[p.lat, p.lng]}
              radius={320}
              pathOptions={{ color: '#0f766e', fillColor: '#0f766e', fillOpacity: 0.12, weight: 1 }}
            />
          ))}
    </MapContainer>
  );
}