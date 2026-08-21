import { useCallback, useEffect, useState } from 'react';
import { Text, View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../src/components/EmptyState';
import { bookingsApi, type Booking } from '../../src/lib/api';
import { colors } from '../../src/theme';

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  confirmed: colors.primary,
  checked_in: colors.teal700,
  completed: colors.mutedForeground,
  cancelled: colors.destructive,
  rejected: colors.destructive,
};

export default function ViewingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await bookingsApi.getMyBookings();
      setBookings(response.data ?? []);
    } catch {
      setError('Could not load your viewings. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Viewings & Bookings</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Something went wrong" message={error} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="You don't have any bookings yet"
          message="Book a viewing from any property page and track it here."
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.property}>{item.property_name || 'Property'}</Text>
                <View style={[styles.statusChip, { backgroundColor: `${STATUS_COLORS[item.status] ?? colors.mutedForeground}1a` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? colors.mutedForeground }]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {formatDate(item.scheduled_time_start)}
                {item.scheduled_time_end ? ` – ${formatDate(item.scheduled_time_end)}` : ''}
              </Text>
              {item.house_type ? <Text style={styles.meta}>Type: {item.house_type}</Text> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', color: colors.foreground, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.card,
    gap: 6,
  },
  property: { fontSize: 15, fontWeight: '700', color: colors.foreground, flexShrink: 1 },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  meta: { fontSize: 13, color: colors.mutedForeground },
});
