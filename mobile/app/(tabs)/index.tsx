import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import SearchBar from '@/components/SearchBar';
import PropertyMarker from '@/components/PropertyMarker';
import PropertyPreviewSheet from '@/components/PropertyPreviewSheet';
import FilterSheet from '@/components/FilterSheet';
import { getPropertiesInBounds, geocode } from '@/lib/api';
import { COLORS } from '@/lib/theme';
import type { MapProperty, PropertyFilters } from '@/lib/types';

const DEFAULT_REGION: Region = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function regionToBounds(r: Region) {
  return {
    north: r.latitude + r.latitudeDelta / 2,
    south: r.latitude - r.latitudeDelta / 2,
    east: r.longitude + r.longitudeDelta / 2,
    west: r.longitude - r.longitudeDelta / 2,
    zoom: Math.round(12 - r.latitudeDelta * 100),
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
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<MapProperty | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [query, setQuery] = useState('');

  const loadBounds = useCallback(
    async (r: Region) => {
      setLoading(true);
      setError('');
      try {
        const data = await getPropertiesInBounds(regionToBounds(r), filtersToParams(filters));
        setProperties(data as MapProperty[]);
      } catch {
        setError('Could not load properties. Check your connection.');
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
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserLocation(loc);
          const r: Region = { ...loc, latitudeDelta: 0.02, longitudeDelta: 0.02 };
          setRegion(r);
          mapRef.current?.animateToRegion(r, 500);
          loadBounds(r);
          return;
        } catch {
          /* fall through to default */
        }
      }
      loadBounds(DEFAULT_REGION);
    })();
  }, []);

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadBounds(r), 600);
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    try {
      const res = await geocode(query.trim());
      if (res) {
        const r: Region = {
          latitude: res.lat,
          longitude: res.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(r);
        mapRef.current?.animateToRegion(r, 600);
        loadBounds(r);
      }
    } catch {
      setError('Location not found.');
    }
  };

  const applyFilters = (next: PropertyFilters) => {
    setFilters(next);
    setShowFilters(false);
    loadBounds(region);
  };

  const recenter = () => {
    if (userLocation) {
      const r: Region = { ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      setRegion(r);
      mapRef.current?.animateToRegion(r, 500);
      loadBounds(r);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChange={setQuery} onSubmit={runSearch} />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterText}>⚙ Filters</Text>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {properties.map((p) => (
          <PropertyMarker
            key={p.id}
            property={p}
            selected={selected?.id === p.id}
            onPress={() => setSelected(p)}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="small" />
        </View>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.locateBtn} onPress={recenter}>
        <Text style={styles.locateText}>📍</Text>
      </TouchableOpacity>

      <PropertyPreviewSheet
        property={selected}
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
            loadBounds(region);
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
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  loadingOverlay: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    padding: 8,
    borderRadius: 20,
  },
  errorText: {
    position: 'absolute',
    top: 110,
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
