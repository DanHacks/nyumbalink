import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import SearchBar from '@/components/SearchBar';
import NyumbaMap, { type NyumbaMapCameraTarget } from '@/components/NyumbaMap';
import PropertyPreviewSheet from '@/components/PropertyPreviewSheet';
import FilterSheet from '@/components/FilterSheet';
import { getPropertiesInBounds, geocode } from '@/lib/api';
import { deltaToZoom } from '@/lib/maps';
import { COLORS } from '@/lib/theme';
import type { MapBounds, MapProperty, PropertyFilters } from '@/lib/types';

const DEFAULT_REGION = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function regionToBounds(r: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }): MapBounds {
  return {
    north: r.latitude + r.latitudeDelta / 2,
    south: r.latitude - r.latitudeDelta / 2,
    east: r.longitude + r.longitudeDelta / 2,
    west: r.longitude - r.longitudeDelta / 2,
    zoom: Math.round(deltaToZoom(r.latitudeDelta)),
  };
}

function filtersToParams(f: PropertyFilters) {
  const p: Record<string, any> = {};
  if (f.price_max != null) p.price_max = f.price_max;
  if (f.price_min != null) p.price_min = f.price_min;
  if (f.property_type) p.property_type = f.property_type;
  if (f.rooms != null) p.rooms = f.rooms;
  if (f.verified_only) p.verified_only = true;
  if (f.student) p.student = true;
  if (f.gender) p.gender = f.gender;
  if (f.furnished) p.furnished = true;
  if (f.wifi) p.wifi = true;
  if (f.water) p.water = true;
  if (f.parking) p.parking = true;
  if (f.security) p.security = true;
  return p;
}

export default function HomeScreen() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bounds, setBounds] = useState<MapBounds>({
    north: DEFAULT_REGION.latitude + 0.04,
    south: DEFAULT_REGION.latitude - 0.04,
    east: DEFAULT_REGION.longitude + 0.04,
    west: DEFAULT_REGION.longitude - 0.04,
    zoom: 11,
  });
  const [cameraTarget, setCameraTarget] = useState<NyumbaMapCameraTarget | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [selected, setSelected] = useState<MapProperty | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [query, setQuery] = useState('');

  const loadBounds = useCallback(
    async (b: MapBounds) => {
      setLoading(true);
      setError('');
      try {
        const data = await getPropertiesInBounds(b, filtersToParams(filters));
        setProperties(data as MapProperty[]);
        setOffline(false);
      } catch {
        setOffline(true);
        setError('You appear to be offline.');
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({});
          const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserLocation(loc);
          setCameraTarget({ ...loc, zoom: deltaToZoom(0.02) });
          const r = { ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 };
          const b = regionToBounds(r);
          setBounds(b);
          loadBounds(b);
          return;
        } catch {
          /* fall through to default */
        }
      } else {
        setLocationBlocked(true);
      }
      const b = regionToBounds(DEFAULT_REGION);
      setBounds(b);
      loadBounds(b);
    })();
  }, []);

  const onRegionSettled = (b: MapBounds) => {
    setBounds(b);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadBounds(b), 600);
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    try {
      const res = await geocode(query.trim());
      if (res) {
        const loc = { latitude: res.lat, longitude: res.lng };
        setCameraTarget({ ...loc, zoom: deltaToZoom(0.02) });
        const r = { ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 };
        const b = regionToBounds(r);
        setBounds(b);
        loadBounds(b);
      }
    } catch {
      setError('Location not found.');
    }
  };

  const applyFilters = (next: PropertyFilters) => {
    setFilters(next);
    setShowFilters(false);
    loadBounds(bounds);
  };

  const recenter = () => {
    if (userLocation) {
      setCameraTarget({ ...userLocation, zoom: deltaToZoom(0.02) });
      const r = { ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      const b = regionToBounds(r);
      setBounds(b);
      loadBounds(b);
    }
  };

  const retryMap = () => {
    setMapError(false);
    setMapKey((k) => k + 1);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChange={setQuery} onSubmit={runSearch} />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterText}>⚙ Filters</Text>
        </TouchableOpacity>
      </View>

      {locationBlocked ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Location permission is unavailable. You can still search manually.</Text>
        </View>
      ) : null}
      {offline && !mapError ? (
        <View style={[styles.banner, styles.offlineBanner]}>
          <Text style={styles.bannerText}>You appear to be offline.</Text>
        </View>
      ) : null}

      <View style={styles.mapWrap}>
        {mapError ? (
          <View style={styles.mapErrorWrap}>
            <Text style={styles.mapErrorTitle}>Map temporarily unavailable.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={retryMap}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.listBtn} onPress={() => router.push('/explore' as any)}>
              <Text style={styles.listText}>Search properties using list view</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <NyumbaMap
            key={mapKey}
            properties={properties}
            userLocation={userLocation}
            onSelectProperty={(p) => setSelected(p)}
            onRegionSettled={onRegionSettled}
            cameraTarget={cameraTarget}
            onMapError={() => setMapError(true)}
          />
        )}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="small" />
        </View>
      )}
      {error && !mapError ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.locateBtn} onPress={recenter}>
        <Text style={styles.locateText}>📍</Text>
      </TouchableOpacity>

      <PropertyPreviewSheet
        property={selected}
        userLocation={userLocation}
        onClose={() => setSelected(null)}
        onView={(id) => {
          setSelected(null);
          router.push(`/property/${id}`);
        }}
        onBook={(id) => {
          setSelected(null);
          router.push(`/property/${id}/book`);
        }}
      />

      {showFilters && (
        <FilterSheet
          value={filters}
          onApply={applyFilters}
          onReset={() => {
            setFilters({});
            loadBounds(bounds);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: 12,
    paddingTop: 48,
    gap: 8,
    backgroundColor: 'transparent',
  },
  filterBtn: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  mapWrap: { flex: 1 },
  banner: {
    position: 'absolute',
    top: 100,
    left: 12,
    right: 12,
    zIndex: 9,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  offlineBanner: { backgroundColor: '#fee2e2' },
  bannerText: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  mapErrorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
    gap: 16,
  },
  mapErrorTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '800' },
  listBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  listText: { color: COLORS.primary, fontWeight: '700' },
  loadingOverlay: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    padding: 8,
    borderRadius: 20,
  },
  errorText: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    backgroundColor: COLORS.danger,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 12,
  },
  locateBtn: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    backgroundColor: COLORS.card,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  locateText: { fontSize: 22 },
});
