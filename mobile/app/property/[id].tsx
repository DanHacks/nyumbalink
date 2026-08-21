import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import EmptyState from '../../src/components/EmptyState';
import {
  propertiesApi, roomsApi, bookingsApi, favoritesApi, type Property, type RoomSummary,
} from '../../src/lib/api';
import { colors, radius, formatCurrency } from '../../src/theme';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [bookingRoom, setBookingRoom] = useState<RoomSummary | null>(null);
  const [viewDate, setViewDate] = useState('');
  const [viewTimeStart, setViewTimeStart] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await propertiesApi.get(id as string);
      setProperty(response.data);
      try {
        const roomsResponse = await roomsApi.listByProperty(id as string);
        setRooms(roomsResponse.data?.rooms ?? roomsResponse.data ?? []);
      } catch {
        setRooms([]);
      }
      try {
        const favs = await favoritesApi.list();
        const list = favs.data?.favorites ?? [];
        setIsSaved(list.some((f: { property?: { id: string } }) => f.property?.id === id));
      } catch {
        setIsSaved(false);
      }
    } catch {
      setError('Something went wrong while loading this property. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const vacantRooms = useMemo(
    () => rooms.filter((r) => r.occupancy_status === 'vacant'),
    [rooms]
  );

  const toggleSave = async () => {
    if (!property) return;
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) await favoritesApi.add(property.id);
      else await favoritesApi.remove(property.id);
    } catch {
      setIsSaved(!next);
    }
  };

  const openDirections = () => {
    if (property?.latitude == null || property?.longitude == null) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`;
    WebBrowser.openBrowserAsync(url);
  };

  const submitBooking = async () => {
    if (!property || !bookingRoom) return;
    if (!viewDate || !viewTimeStart) {
      setSubmitError('Pick a date and start time for your viewing.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const start = new Date(`${viewDate}T${viewTimeStart}:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      await bookingsApi.create({
        property_id: property.id,
        room_id: bookingRoom.id,
        scheduled_date: start.toISOString(),
        scheduled_time_start: start.toISOString(),
        scheduled_time_end: end.toISOString(),
        tenant_notes: notes || undefined,
      });
      setBookingRoom(null);
      setViewDate('');
      setViewTimeStart('');
      setNotes('');
      router.push('/(tabs)/viewings');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setSubmitError(typeof detail === 'string' ? detail : 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
  if (error || !property) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <EmptyState icon="alert-circle-outline" title="Could not load property" message={error || 'Please try again later.'} />
      </SafeAreaView>
    );
  }

  const verified = property.status === 'verified' || property.is_verified;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.hero}>
          <Ionicons name="images-outline" size={40} color={colors.mutedForeground} />
          <Text style={styles.heroHint}>Photos coming from the owner</Text>
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{property.property_name}</Text>
              <Text style={styles.sub}>
                {[property.estate, property.city, property.county].filter(Boolean).join(', ')}
              </Text>
            </View>
            <Pressable onPress={toggleSave} hitSlop={8}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={26} color={isSaved ? colors.destructive : colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.badgeRow}>
            {verified && (
              <View style={[styles.badge, styles.badgeVerified]}>
                <Ionicons name="shield-checkmark" size={12} color={colors.primaryForeground} />
                <Text style={styles.badgeVerifiedText}>Verified Property</Text>
              </View>
            )}
            {!!property.avg_rating && (
              <View style={styles.badge}>
                <Ionicons name="star" size={12} color={colors.star} />
                <Text style={styles.badgeText}>{Number(property.avg_rating).toFixed(1)}</Text>
              </View>
            )}
            {property.vacant_rooms != null && (
              <View style={styles.badge}>
                <Ionicons name="key-outline" size={12} color={colors.teal700} />
                <Text style={styles.badgeText}>{property.vacant_rooms} vacant</Text>
              </View>
            )}
          </View>

          {property.description ? (
            <Text style={styles.description}>{property.description}</Text>
          ) : null}

          <Pressable style={styles.directionsButton} onPress={openDirections}>
            <Ionicons name="navigate" size={16} color={colors.teal700} />
            <Text style={styles.directionsText}>Get directions</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available rooms</Text>
          {vacantRooms.length === 0 ? (
            <Text style={styles.emptyRooms}>No vacant rooms right now.</Text>
          ) : (
            vacantRooms.map((room) => (
              <View key={room.id} style={styles.roomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomTitle}>
                    {room.house_type.replace(/_/g, ' ')} · Room {room.room_number}
                  </Text>
                  <Text style={styles.roomSub}>
                    {formatCurrency(room.rent_amount, room.currency)}
                    {room.deposit_amount ? ` + ${formatCurrency(room.deposit_amount, room.currency)} deposit` : ''}
                  </Text>
                </View>
                <Pressable style={styles.bookSmall} onPress={() => setBookingRoom(room)}>
                  <Text style={styles.bookSmallText}>Book Now</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={!!bookingRoom} animationType="slide" transparent onRequestClose={() => setBookingRoom(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Request a viewing</Text>
            {bookingRoom && (
              <Text style={styles.modalSub}>
                {bookingRoom.house_type.replace(/_/g, ' ')} · {formatCurrency(bookingRoom.rent_amount, bookingRoom.currency)}
              </Text>
            )}

            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-09-01"
              placeholderTextColor={colors.mutedForeground}
              value={viewDate}
              onChangeText={setViewDate}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="14:00"
              placeholderTextColor={colors.mutedForeground}
              value={viewTimeStart}
              onChangeText={setViewTimeStart}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Message to the owner (optional)</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="I would like to view this room…"
              placeholderTextColor={colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
            <Text style={styles.policy}>
              Cancellation: you can cancel free of charge any time before the viewing starts.
            </Text>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setBookingRoom(null)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, submitting && { opacity: 0.7 }]}
                onPress={submitBooking}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm booking</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hero: {
    height: 200,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroHint: { fontSize: 13, color: colors.mutedForeground },
  section: { padding: 16, gap: 10 },
  name: { fontSize: 22, fontWeight: '800', color: colors.foreground },
  sub: { fontSize: 14, color: colors.mutedForeground, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.muted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeVerified: { backgroundColor: colors.primary },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.foreground },
  badgeVerifiedText: { fontSize: 12, fontWeight: '700', color: colors.primaryForeground },
  description: { fontSize: 14, lineHeight: 21, color: colors.foreground },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  directionsText: { fontSize: 13, fontWeight: '700', color: colors.teal700 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.foreground },
  emptyRooms: { fontSize: 14, color: colors.mutedForeground },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    gap: 10,
  },
  roomTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, textTransform: 'capitalize' },
  roomSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  bookSmall: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bookSmallText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 6,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: colors.foreground },
  modalSub: { fontSize: 14, color: colors.mutedForeground, marginBottom: 8, textTransform: 'capitalize' },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.foreground,
  },
  error: { color: colors.destructive, fontSize: 13, marginTop: 8 },
  policy: { fontSize: 12, color: colors.mutedForeground, marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelButtonText: { fontWeight: '700', color: colors.foreground },
  confirmButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmButtonText: { color: colors.primaryForeground, fontWeight: '700' },
});
