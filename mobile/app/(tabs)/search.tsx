import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PropertyCard from '../../src/components/PropertyCard';
import EmptyState from '../../src/components/EmptyState';
import { searchApi, type MapRoom } from '../../src/lib/api';
import { colors } from '../../src/theme';

const TYPES = [
  { id: '', label: 'All' },
  { id: 'bedsitter', label: 'Bedsitter' },
  { id: 'single', label: 'Single' },
  { id: 'one_bedroom', label: '1BR' },
  { id: 'two_bedroom', label: '2BR' },
  { id: 'hostel', label: 'Hostel' },
];

const MAX_PRICES = [
  { id: null as number | null, label: 'Any price' },
  { id: 5000, label: '< 5k' },
  { id: 10000, label: '< 10k' },
  { id: 20000, label: '< 20k' },
  { id: 50000, label: '< 50k' },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [houseType, setHouseType] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [rooms, setRooms] = useState<MapRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  const buildParams = useCallback(
    (p: number) => {
      const params: Record<string, unknown> = { page: p, page_size: 20 };
      if (query.trim()) params.q = query.trim();
      if (houseType) params.house_type = houseType;
      if (maxPrice != null) params.max_price = maxPrice;
      return params;
    },
    [query, houseType, maxPrice]
  );

  const runSearch = useCallback(async () => {
    setLoading(true);
    setPage(1);
    try {
      const response = await searchApi.smart(buildParams(1));
      setRooms(response.data.results ?? []);
      setTotal(response.data.total ?? 0);
      setSearched(true);
    } catch {
      setRooms([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    runSearch();
    // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (loadingMore || rooms.length >= total) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const response = await searchApi.smart(buildParams(next));
      const more = response.data.results ?? [];
      setRooms((prev) => [...prev, ...more]);
      setPage(next);
    } catch {
      // keep current list
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search estate, town, university…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
          <Pressable onPress={runSearch}>
            <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={TYPES}
          keyExtractor={(item) => item.id || 'all'}
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setHouseType(item.id); }}
              style={[styles.chip, houseType === item.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, houseType === item.id && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
        <FlatList
          horizontal
          data={MAX_PRICES}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setMaxPrice(item.id); }}
              style={[styles.chip, maxPrice === item.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, maxPrice === item.id && styles.chipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.applyButton} onPress={runSearch}>
          <Text style={styles.applyButtonText}>Apply filters</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={searched ? 'No homes match your search' : 'Start your search'}
          message={
            searched
              ? 'Try different keywords or remove some filters.'
              : 'Search by location, property type or price.'
          }
        />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
          renderItem={({ item }) => (
            <PropertyCard
              room={item}
              onPress={() =>
                router.push({ pathname: '/property/[id]', params: { id: item.property_id || item.id } })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
  chipTextActive: { color: colors.primaryForeground },
  applyButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: colors.muted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  applyButtonText: { fontSize: 13, fontWeight: '700', color: colors.foreground },
});
