import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import SearchBar from '@/components/SearchBar';
import PropertyCard from '@/components/PropertyCard';
import FilterSheet from '@/components/FilterSheet';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { getPropertiesInBounds, geocode } from '@/lib/api';
import { COLORS } from '@/lib/theme';
import type { MapProperty, PropertyFilters, Region } from '@/lib/types';

const EXPLORE_REGION: Region = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 3,
  longitudeDelta: 3,
};

function filtersToParams(f: PropertyFilters) {
  const p: Record<string, any> = {};
  if (f.price_max != null) p.price_max = f.price_max;
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

export default function ExploreScreen() {
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(
    async (region: Region, f: PropertyFilters) => {
      setLoading(true);
      setError('');
      try {
        const data = await getPropertiesInBounds(
          {
            north: region.latitude + region.latitudeDelta / 2,
            south: region.latitude - region.latitudeDelta / 2,
            east: region.longitude + region.longitudeDelta / 2,
            west: region.longitude - region.longitudeDelta / 2,
          },
          filtersToParams(f),
        );
        setProperties(data as MapProperty[]);
      } catch {
        setError('Could not load listings.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(EXPLORE_REGION, filters);
  }, [filters, load]);

  const runSearch = async () => {
    if (!query.trim()) {
      load(EXPLORE_REGION, filters);
      return;
    }
    try {
      const res = await geocode(query.trim());
      if (res) {
        const r: Region = { latitude: res.lat, longitude: res.lng, latitudeDelta: 0.5, longitudeDelta: 0.5 };
        load(r, filters);
      }
    } catch {
      setError('Location not found.');
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.heading}>Explore</Text>
        <SearchBar value={query} onChange={setQuery} onSubmit={runSearch} placeholder="Search town, estate, campus…" />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Text style={styles.filterText}>⚙ Filters</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState message="Finding homes…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(EXPLORE_REGION, filters)} />
      ) : properties.length === 0 ? (
        <EmptyState message="No properties match your search." />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </ScrollView>
      )}

      {showFilters && (
        <FilterSheet
          value={filters}
          onApply={(next) => {
            setFilters(next);
            setShowFilters(false);
          }}
          onReset={() => {
            setFilters({});
            setShowFilters(false);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, paddingTop: 56, gap: 10, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  filterBtn: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  filterText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  list: { padding: 16, paddingBottom: 40 },
});
