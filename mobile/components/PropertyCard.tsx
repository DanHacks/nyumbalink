import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { COLORS, KIND_EMOJI } from '@/lib/theme';
import { formatPrice, formatRating, formatDistance } from '@/lib/format';
import VerifiedBadge from './VerifiedBadge';
import type { MapProperty, Property } from '@/lib/types';

export default function PropertyCard({ property }: { property: MapProperty | Property }) {
  const router = useRouter();
  const anyP = property as any;
  const image =
    anyP.photo_url ||
    anyP.images?.[0]?.thumbnail_url ||
    anyP.images?.[0]?.url ||
    null;
  const price = anyP.price ?? anyP.min_rent ?? anyP.max_rent;
  const rating = anyP.average_rating ?? 0;
  const verified = anyP.verification_level ?? (anyP.has_verified_photos ? 'verified' : 'basic');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => router.push(`/property/${property.id}`)}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Text style={styles.imageEmoji}>{KIND_EMOJI[anyP.kind ?? 'rental'] ?? '🏠'}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.row}>
          <Text numberOfLines={1} style={styles.title}>
            {property.property_name}
          </Text>
          <VerifiedBadge level={verified} />
        </View>
        <Text numberOfLines={1} style={styles.sub}>
          {anyP.house_type || anyP.kind || 'Property'} · {anyP.city || anyP.county || ''}
        </Text>
        <View style={styles.row}>
          <Text style={styles.price}>{formatPrice(price, anyP.price_unit === 'night' ? 'night' : 'month')}</Text>
          <Text style={styles.rating}>★ {formatRating(rating)}</Text>
        </View>
        {property.distance_km != null && (
          <Text style={styles.distance}>{formatDistance(property.distance_km)} away</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: {
    width: '100%',
    height: 150,
  },
  imageFallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEmoji: {
    fontSize: 48,
  },
  body: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  sub: {
    fontSize: 12,
    color: COLORS.muted,
    marginVertical: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  rating: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  distance: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
});
