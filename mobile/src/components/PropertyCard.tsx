import { Text, View, Image, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, formatCurrency } from '../theme';
import type { MapRoom } from '../lib/api';

interface Props {
  room: MapRoom;
  onPress?: () => void;
  style?: ViewStyle;
}

const HOUSE_LABELS: Record<string, string> = {
  bedsitter: 'Bedsitter',
  single: 'Single Room',
  one_bedroom: '1 Bedroom',
  two_bedroom: '2 Bedroom',
  three_bedroom: '3 Bedroom',
  hostel: 'Hostel',
  house: 'House',
  villa: 'Villa',
  apartment: 'Apartment',
};

export default function PropertyCard({ room, onPress, style }: Props) {
  const photo = null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, style]}
    >
      <View style={styles.thumb}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.thumbImage} />
        ) : (
          <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
            <Ionicons name="home-outline" size={26} color={colors.mutedForeground} />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.title}>
          {room.property_name || HOUSE_LABELS[room.house_type] || 'Property'}
        </Text>
        {!!room.city && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {[room.city, room.county].filter(Boolean).join(', ')}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.price}>{formatCurrency(room.rent_amount, room.currency)}</Text>
          <Text style={styles.type}>
            {HOUSE_LABELS[room.house_type] || room.house_type}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          {room.internet_available ? (
            <View style={styles.badge}>
              <Ionicons name="wifi-outline" size={11} color={colors.teal700} />
              <Text style={styles.badgeText}>WiFi</Text>
            </View>
          ) : null}
          {room.water_available ? (
            <View style={styles.badge}>
              <Ionicons name="water-outline" size={11} color={colors.teal700} />
              <Text style={styles.badgeText}>Water</Text>
            </View>
          ) : null}
          {room.student_friendly ? (
            <View style={styles.badge}>
              <Ionicons name="school-outline" size={11} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Student</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary },
  type: { fontSize: 12, color: colors.mutedForeground },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.muted,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: colors.teal700 },
});
