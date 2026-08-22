import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image as RNImage } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { getProperty, getPropertyTrust } from '@/lib/api';
import { COLORS, KIND_EMOJI } from '@/lib/theme';
import { formatPrice, formatRating, formatDistance } from '@/lib/format';
import { LoadingState, ErrorState } from '@/components/States';
import VerifiedBadge from '@/components/VerifiedBadge';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [trust, setTrust] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, t] = await Promise.all([getProperty(id), getPropertyTrust(id).catch(() => null)]);
        setProperty(p);
        setTrust(t);
      } catch {
        setError('Could not load this property.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingState message="Loading property…" />;
  if (error || !property) return <ErrorState message={error || 'Property not found'} onRetry={() => router.back()} />;

  const p = property as any;
  const price = p.min_rent ?? p.max_rent;
  const images: any[] = p.images ?? [];
  const videos: any[] = p.videos ?? [];
  const amenities: string[] = p.amenities ?? [];
  const verified = trust?.verification_level ?? (p.has_verified_photos ? 'verified' : 'basic');

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <VerifiedBadge level={verified} />
        </View>

        {images.length > 0 ? (
          <ScrollView horizontal pagingEnabled style={styles.gallery}>
            {images.map((img) => (
              <Image key={img.id} source={{ uri: img.thumbnail_url || img.url }} style={styles.galleryImg} contentFit="cover" cachePolicy="memory-disk" />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.gallery, styles.galleryFallback]}>
            <Text style={styles.galleryEmoji}>{KIND_EMOJI[p.kind ?? 'rental'] ?? '🏠'}</Text>
          </View>
        )}

        {videos.length > 0 && (
          <View style={styles.videoWrap}>
            <Text style={styles.sectionTitle}>Walkthrough video</Text>
            <Video
              source={{ uri: videos[0].url }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{p.property_name}</Text>
          <Text style={styles.sub}>
            {p.house_type || p.kind || 'Property'} · {p.neighborhood || p.city || p.county || ''}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>{formatPrice(price, p.price_unit === 'night' ? 'night' : 'month')}</Text>
            <Text style={styles.rating}>★ {formatRating(p.average_rating)} ({p.total_reviews ?? 0})</Text>
          </View>
          {p.distance_km != null && <Text style={styles.distance}>{formatDistance(p.distance_km)} away</Text>}
          {p.deposit_amount != null && <Text style={styles.distance}>Deposit: {formatPrice(p.deposit_amount)}</Text>}

          {p.description ? (
            <View style={styles.block}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.text}>{p.description}</Text>
            </View>
          ) : null}

          {amenities.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.chips}>
                {amenities.map((a) => (
                  <View key={a} style={styles.chip}>
                    <Text style={styles.chipText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {trust?.caretaker && (
            <View style={styles.block}>
              <Text style={styles.sectionTitle}>Caretaker</Text>
              <Text style={styles.text}>
                {trust.caretaker.name} · trust {trust.caretaker.score}
                {trust.caretaker.is_verified ? ' ✓' : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={() => router.push(`/property/${id}/book` as any)}>
            <Text style={styles.actionText}>Book viewing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionOutline} onPress={() => router.push(`/property/${id}/recommend` as any)}>
            <Text style={styles.actionOutlineText}>Recommend</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionGhost} onPress={() => router.push(`/property/${id}/report` as any)}>
            <Text style={styles.actionGhostText}>Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionGhost} onPress={() => router.push(`/property/${id}/directions` as any)}>
            <Text style={styles.actionGhostText}>Directions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52 },
  back: { backgroundColor: COLORS.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  backText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  gallery: { width: '100%', height: 240 },
  galleryImg: { width: 360, height: 240 },
  galleryFallback: { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  galleryEmoji: { fontSize: 64 },
  videoWrap: { padding: 16 },
  video: { width: '100%', height: 220, borderRadius: 14, backgroundColor: '#000' },
  body: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  price: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  rating: { fontSize: 15, fontWeight: '800', color: COLORS.accent },
  distance: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  block: { marginTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, color: COLORS.text },
  actions: { padding: 16, gap: 10 },
  action: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  actionOutline: { borderWidth: 1, borderColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionOutlineText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  actionGhost: { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionGhostText: { color: COLORS.muted, fontWeight: '700', fontSize: 14 },
});
