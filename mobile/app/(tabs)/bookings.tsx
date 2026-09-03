import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { getMyBookings } from '@/lib/api';
import { COLORS } from '@/lib/theme';
import { formatDate } from '@/lib/format';

function statusColor(status: string) {
  switch (status?.toUpperCase()) {
    case 'CONFIRMED':
      return COLORS.success;
    case 'CANCELLED':
      return COLORS.danger;
    case 'CHECKED_IN':
      return COLORS.primary;
    default:
      return COLORS.warning;
  }
}

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <View style={styles.flex}>
        <Text style={styles.heading}>Bookings</Text>
        <View style={styles.center}>
          <Text style={styles.guestTitle}>Sign in to view your bookings</Text>
          <Text style={styles.guestSub}>You need an account to book viewings.</Text>
          <TouchableOpacity style={styles.primary} onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.primaryText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => router.push('/(auth)/register' as any)}>
            <Text style={styles.secondaryText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setBookings(await getMyBookings());
    } catch {
      setError('Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState message="Loading bookings…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (bookings.length === 0)
    return (
      <View style={styles.flex}>
        <Text style={styles.heading}>Bookings</Text>
        <EmptyState message="No bookings yet. Tap a property to book a viewing." />
      </View>
    );

  return (
    <View style={styles.flex}>
      <Text style={styles.heading}>Bookings</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {bookings.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.card}
            onPress={() => router.push(`/property/${b.property_id}`)}
          >
            <View style={styles.row}>
              <Text style={styles.title}>{b.property?.property_name ?? 'Property'}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor(b.status) }]}>
                <Text style={styles.badgeText}>{b.status}</Text>
              </View>
            </View>
            <Text style={styles.sub}>
              {formatDate(b.scheduled_date)} · {b.scheduled_time_start?.slice(11, 16)}–{b.scheduled_time_end?.slice(11, 16)}
            </Text>
            {b.property?.city ? <Text style={styles.sub}>{b.property.city}</Text> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text, padding: 16, paddingTop: 56 },
  list: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1 },
  sub: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  guestTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  guestSub: { fontSize: 14, color: COLORS.muted, textAlign: 'center' },
  primary: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  secondaryText: { color: COLORS.primary, fontWeight: '800' },
});
