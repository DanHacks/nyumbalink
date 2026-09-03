import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, useMap,
  useMapEvents, GeoJSON,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.gridlayer.googlemutant';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { MapPin, Navigation, Satellite, Map as MapIcon, Locate } from 'lucide-react';

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
    ensureGoogleMaps(apiKey).then(() => {
      if (cancelled) return;
      // @ts-ignore
      const layer = (L.gridLayer as any).googleMutant({ type: satellite ? 'hybrid' : 'roadmap' }).addTo(map);
      layerRef.current = layer;
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (layerRef.current) { try { map.removeLayer(layerRef.current); } catch {} layerRef.current = null; }
    };
  }, [map, satellite, apiKey]);
  return null;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const verifiedIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background:#16a34a;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;font-weight:bold;">V</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const defaultIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background:#0f172a;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;font-weight:bold;">H</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const selectedIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background:#ea580c;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(234,88,12,0.5);font-size:16px;font-weight:bold;">H</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

function flyToDefault(lat: number, lng: number, zoom: number = 12) {
  const url = new URL(window.location.href);
  url.hash = `#map=${lat}/${lng}/${zoom}`;
  window.history.replaceState(null, '', url.toString());
}

function RoutingControl({
  origin, destination,
}: {
  origin: [number, number];
  destination: [number, number];
}) {
  const map = useMap();
  const routingRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const Lrm = await import('leaflet-routing-machine');
        if (!active) return;
        if (routingRef.current) {
          map.removeControl(routingRef.current);
        }
        routingRef.current = (Lrm as any).Routing.control({
          waypoints: [
            L.latLng(origin[0], origin[1]),
            L.latLng(destination[0], destination[1]),
          ],
          routeWhileDragging: false,
          showAlternatives: true,
          fitSelectedRoutes: true,
          show: true,
          lineOptions: {
            styles: [
              { color: '#ea580c', opacity: 0.8, weight: 5 },
              { color: '#f97316', opacity: 0.3, weight: 9 },
            ],
          },
        }).addTo(map);
      } catch {
        // routing module not available
      }
    })();
    return () => {
      active = false;
      if (routingRef.current) {
        map.removeControl(routingRef.current);
      }
    };
  }, [map, origin, destination]);

  return null;
}

function LocationMarker({
  onLocationFound, position,
}: {
  onLocationFound: (pos: [number, number]) => void;
  position: [number, number] | null;
}) {
  const map = useMapEvents({
    locationfound(e) {
      onLocationFound([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position ? (
    <Marker
      position={position}
      icon={new L.DivIcon({
        className: 'user-location',
        html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })}
    >
      <Popup>You are here</Popup>
    </Marker>
  ) : null;
}

interface PropertyMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rent: number;
  city: string;
  county: string;
  vacant: number;
  verified: boolean;
}

interface MapDisplayProps {
  properties?: PropertyMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showRoute?: boolean;
  selectedPropertyId?: string | null;
  onPropertySelect?: (id: string) => void;
  className?: string;
}

export default function MapDisplay({
  properties = [],
  center = [-1.286389, 36.817223],
  zoom = 7,
  height = '500px',
  showRoute = false,
  selectedPropertyId = null,
  onPropertySelect,
  className = '',
}: MapDisplayProps) {
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeDest, setRouteDest] = useState<[number, number] | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const { key: mapsKey, loading: mapsLoading } = useGoogleMapsKey();

  const locateUser = useCallback(() => {
    if (map) {
      map.locate({ setView: true, maxZoom: 16 });
    }
  }, [map]);

  const handleRoute = (lat: number, lng: number) => {
    if (userLocation) {
      setRouteDest([lat, lng]);
    } else {
      if (map) {
        map.locate({ setView: true, maxZoom: 14 });
      }
      setRouteDest([lat, lng]);
    }
  };

  const clearRoute = () => setRouteDest(null);

  return (
    <div className={`relative rounded-xl overflow-hidden border ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%', zIndex: 0 }}
        zoomControl={false}
        ref={setMap}
      >
        {mapsKey ? (
          <GoogleBaseLayer satellite={mapType === 'satellite'} apiKey={mapsKey} />
        ) : mapsLoading ? null : mapType === 'street' ? (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
        ) : (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
            />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              opacity={0.35}
              maxZoom={20}
            />
          </>
        )}

        <LocationMarker
          onLocationFound={(pos) => setUserLocation(pos)}
          position={userLocation}
        />

        {properties.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={
              selectedPropertyId === p.id
                ? selectedIcon
                : p.verified
                ? verifiedIcon
                : defaultIcon
            }
            eventHandlers={{
              click: () => onPropertySelect?.(p.id),
            }}
          >
            <Popup maxWidth={280} className="property-popup">
              <div className="p-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <h3 style={{ fontWeight: 600, fontSize: '14px', marginBottom: 4 }}>{p.name}</h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: 4 }}>
                  <MapPin style={{ display: 'inline', width: 12, height: 12, verticalAlign: 'middle' }} />{' '}
                  {p.city}, {p.county}
                </p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                  KES {p.rent.toLocaleString()}/mo
                </p>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {p.verified && (
                    <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 500 }}>
                      Verified
                    </span>
                  )}
                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', padding: '2px 8px', borderRadius: '999px' }}>
                    {p.vacant} vacant
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <a
                    href={`/properties/${p.id}`}
                    style={{
                      flex: 1, textAlign: 'center', background: '#ea580c', color: 'white',
                      padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
                      fontWeight: 500, textDecoration: 'none', display: 'inline-block',
                    }}
                  >
                    View Details
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRoute(p.latitude, p.longitude);
                    }}
                    style={{
                      background: '#f1f5f9', border: 'none', padding: '6px 10px',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                    }}
                    title="Get directions"
                  >
                    <Navigation style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && routeDest && (
          <RoutingControl origin={userLocation} destination={routeDest} />
        )}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
          className="bg-white p-2.5 rounded-lg shadow-md hover:bg-slate-50 transition-colors"
          title={`Switch to ${mapType === 'street' ? 'Satellite' : 'Street'} view`}
        >
          {mapType === 'street' ? (
            <Satellite className="h-5 w-5 text-slate-700" />
          ) : (
            <MapIcon className="h-5 w-5 text-slate-700" />
          )}
        </button>
        <button
          onClick={locateUser}
          className="bg-white p-2.5 rounded-lg shadow-md hover:bg-slate-50 transition-colors"
          title="Find my location"
        >
          <Locate className="h-5 w-5 text-slate-700" />
        </button>
        {routeDest && (
          <button
            onClick={clearRoute}
            className="bg-white p-2.5 rounded-lg shadow-md hover:bg-red-50 transition-colors"
            title="Clear route"
          >
            <Navigation className="h-5 w-5 text-red-500" />
          </button>
        )}
      </div>

      {mapType === 'satellite' && (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <span className="bg-slate-900/80 text-white text-xs px-3 py-1.5 rounded-lg">
            Satellite View
          </span>
        </div>
      )}

      {properties.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <span className="bg-white shadow-md text-slate-600 text-xs px-3 py-1.5 rounded-lg">
            {properties.length} propert{properties.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
      )}
    </div>
  );
}
