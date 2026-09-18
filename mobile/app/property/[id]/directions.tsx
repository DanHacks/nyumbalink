import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { getProperty, getDirections } from '@/lib/api';
import { COLORS } from '@/lib/theme';
import { formatDistance } from '@/lib/format';
import { LoadingState, ErrorState } from '@/components/States';

export default function DirectionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<{ distance?: number; duration?: number; to?: { lat: number; lng: number }; from?: { lat: number; lng: number } }>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await getProperty(id as string);
        const to = { lat: p.latitude, lng: p.longitude };
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || to.lat == null || to.lng == null) {
          setInfo({ to: to.lat != null && to.lng != null ? to : undefined });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          const d = await getDirections(id as string, from);
          setInfo({ distance: d.walking_distance_km ?? d.driving_distance_km, duration: undefined, to, from });
        } catch {
          setInfo({ to, from });
        }
      } catch {
        setError('Could not load directions.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingState message="Calculating route…" />;
  if (error) return <ErrorState message={error} onRetry={() => router.back()} />;

  const openMaps = () => {
    if (!info.to) return;
    const dest = `${info.to.lat},${info.to.lng}`;
    const src = info.from ? `${info.from.lat},${info.from.lng}` : '';
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}${src ? `&origin=${src}` : ''}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Directions</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Distance</Text>
        <Text style={styles.cardValue}>{info.distance != null ? formatDistance(info.distance) : '—'}</Text>
        <Text style={styles.cardLabel}>Estimated travel</Text>
        <Text style={styles.cardValue}>
          {info.duration != null ? `${Math.round(info.duration)} min` : 'Open map for route'}
        </Text>
      </View>

      {info.to?.lat != null && info.to?.lng != null ? (
        <Text style={styles.coords}>
          Destination: {info.to.lat.toFixed(5)}, {info.to.lng.toFixed(5)}
        </Text>
      ) : null}

      <TouchableOpacity style={styles.primary} onPress={openMaps}>
        <Text style={styles.primaryText}>Open in Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 56, backgroundColor: COLORS.background },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  cardLabel: { fontSize: 13, color: COLORS.muted, marginTop: 8 },
  cardValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  coords: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },
  primary: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
