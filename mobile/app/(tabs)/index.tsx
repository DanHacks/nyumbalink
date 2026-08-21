import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator, Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import PropertyCard from '../../src/components/PropertyCard';
import EmptyState from '../../src/components/EmptyState';
import { searchApi, type MapRoom } from '../../src/lib/api';
import { colors } from '../../src/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const NAIROBI = { latitude: -1.2864, longitude: 36.8172 };

export default function MapHome() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    ...NAIROBI,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [rooms, setRooms] = useState<MapRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  const loadProperties = useCallback(async (lat?: number, lon?: number, q?: string) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { radius_km: 5 };
      if (lat != null && lon != null) {
        params.lat = lat;
        params.lon = lon;
      }
      if (q) params.q = q;
      const response = await searchApi.smart(params);
      setRooms(response.data.results ?? []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const userRegion = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(userRegion);
          mapRef.current?.animateToRegion(userRegion, 500);
          await loadProperties(pos.coords.latitude, pos.coords.longitude);
          return;
        } catch {
          // fall through to default
        }
      }
      await loadProperties();
    })();
  }, [loadProperties]);

  const recenter = async () => {
    setLocating(true);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const r = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      mapRef.current?.animateToRegion(r, 500);
      await loadProperties(pos.coords.latitude, pos.coords.longitude, query || undefined);
    } catch {
      // keep current view
    } finally {
      setLocating(false);
    }
  };

  const submitSearch = () => {
    loadProperties(region.latitude, region.longitude, query.trim() || undefined);
  };

  const markers = useMemo(
    () => rooms.filter((r) => r.latitude != null && r.longitude != null),
    [rooms]
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {markers.map((room) => (
          <Marker
            key={room.id}
            coordinate={{
              latitude: room.latitude as number,
              longitude: room.longitude as number,
            }}
            onPress={() => setSelectedId(room.id)}
            tracksViewChanges={false}
          >
            <View style={[styles.marker, selectedId === room.id && styles.markerActive]}>
              <Text style={[styles.markerPrice, selectedId === room.id && styles.markerPriceActive]}>
                {Math.round(room.rent_amount / 1000)}k
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where do you want to live?"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => { setQuery(''); submitSearch(); }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <Pressable style={styles.locateButton} onPress={recenter} disabled={locating}>
        {locating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="locate" size={22} color={colors.primary} />
        )}
      </Pressable>

      <Pressable style={styles.sheetToggle} onPress={() => setSheetOpen((v) => !v)}>
        <Ionicons name={sheetOpen ? 'chevron-down' : 'chevron-up'} size={18} color={colors.foreground} />
        <Text style={styles.sheetToggleText}>
          {loading ? 'Loading…' : `${rooms.length} nearby ${rooms.length === 1 ? 'home' : 'homes'}`}
        </Text>
      </Pressable>

      {sheetOpen && (
        <View style={styles.sheet}>
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} color={colors.primary} />
          ) : rooms.length === 0 ? (
            <EmptyState
              icon="map-outline"
              title="No homes found nearby yet"
              message="Try moving the map or searching a different area."
            />
          ) : (
            <FlatList
              data={rooms}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <PropertyCard
                  room={item}
                  onPress={() => router.push({ pathname: '/property/[id]', params: { id: item.property_id || item.id } })}
                />
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.38);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBarWrap: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
  locateButton: {
    position: 'absolute',
    right: 16,
    bottom: SHEET_HEIGHT + 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  sheetToggle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SHEET_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetToggleText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    elevation: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  marker: {
    backgroundColor: colors.background,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  markerActive: { backgroundColor: colors.primary },
  markerPrice: { fontSize: 12, fontWeight: '800', color: colors.primary },
  markerPriceActive: { color: colors.primaryForeground },
});
