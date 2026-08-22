import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { COLORS, KIND_EMOJI } from '@/lib/theme';
import { formatPrice, formatRating, formatDistance } from '@/lib/format';
import VerifiedBadge from './VerifiedBadge';
import type { MapProperty } from '@/lib/types';

export default function PropertyPreviewSheet({
  property,
  onClose,
  onView,
  onBook,
}: {
  property: MapProperty | null;
  onClose: () => void;
  onView: (id: string) => void;
  onBook: (id: string) => void;
}) {
  const snapPoints = useMemo(() => ['32%', '58%'], []);
  if (!property) return null;

  const anyP = property as any;
  const image = anyP.photo_url || null;
  const price = anyP.price ?? anyP.min_rent ?? anyP.max_rent;
  const verified = anyP.verification_level ?? (anyP.has_verified_photos ? 'verified' : 'basic');

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      )}
      handleIndicatorStyle={{ backgroundColor: COLORS.muted }}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <Text style={styles.emoji}>{KIND_EMOJI[anyP.kind ?? 'rental'] ?? '🏠'}</Text>
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.row}>
              <Text numberOfLines={1} style={styles.title}>
                {property.property_name}
              </Text>
              <VerifiedBadge level={verified} />
            </View>
            <Text style={styles.price}>
              {formatPrice(price, anyP.price_unit === 'night' ? 'night' : 'month')}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>★ {formatRating(anyP.average_rating)}</Text>
              {property.distance_km != null && (
                <Text style={styles.meta}>{formatDistance(property.distance_km)} away</Text>
              )}
              {anyP.vacant_rooms != null && (
                <Text style={styles.meta}>{anyP.vacant_rooms} rooms free</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewBtn} onPress={() => onView(property.id)}>
            <Text style={styles.viewText}>View Property</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bookBtn} onPress={() => onBook(property.id)}>
            <Text style={styles.bookText}>Book viewing</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 12,
  },
  imageFallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 40,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  meta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  viewBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewText: {
    color: '#fff',
    fontWeight: '800',
  },
  bookBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
