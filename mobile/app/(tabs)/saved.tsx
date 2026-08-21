import { useCallback, useEffect, useState } from 'react';
import { Text, View, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import EmptyState from '../../src/components/EmptyState';
import { favoritesApi } from '../../src/lib/api';
import { colors } from '../../src/theme';

interface FavoriteRow {
  favorited_at?: string;
  property: {
    id: string;
    property_name: string;
    city?: string | null;
    county?: string | null;
  };
}

export default function SavedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await favoritesApi.list();
      setItems(response.data?.favorites ?? []);
    } catch {
      setError('Could not load saved properties. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (propertyId: string) => {
    setItems((prev) => prev.filter((i) => i.property.id !== propertyId));
    try {
      await favoritesApi.remove(propertyId);
    } catch {
      load();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Saved</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Something went wrong" message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No saved properties yet"
          message="Save properties you love and find them here later."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.property.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/property/[id]', params: { id: item.property.id } })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.property.property_name || 'Property'}</Text>
                <Text style={styles.sub}>
                  {[item.property.city, item.property.county].filter(Boolean).join(', ') || 'Location not set'}
                </Text>
              </View>
              <Pressable onPress={() => remove(item.property.id)} hitSlop={10}>
                <Ionicons name="heart" size={22} color={colors.destructive} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', color: colors.foreground, paddingHorizontal: 16, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.card,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  sub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
});
