import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, type Region } from 'react-native-maps';
import PropertyMarker from './PropertyMarker';
import { deltaToZoom, zoomToDelta, clusterProperties } from '@/lib/maps';
import { COLORS } from '@/lib/theme';
import type { MapProperty, MapBounds } from '@/lib/types';

const INITIAL_CENTER = { latitude: -1.2921, longitude: 36.8219 };
const INITIAL_DELTA = 0.08;
const INITIAL_REGION: Region = {
  latitude: INITIAL_CENTER.latitude,
  longitude: INITIAL_CENTER.longitude,
  latitudeDelta: INITIAL_DELTA,
  longitudeDelta: INITIAL_DELTA,
};

export interface NyumbaMapCameraTarget {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface NyumbaMapProps {
  properties: MapProperty[];
  userLocation: { latitude: number; longitude: number } | null;
  onSelectProperty: (p: MapProperty) => void;
  onRegionSettled: (bounds: MapBounds) => void;
  cameraTarget?: NyumbaMapCameraTarget | null;
  onMapError?: () => void;
  onMapReady?: () => void;
}

export default function NyumbaMap({
  properties,
  userLocation,
  onSelectProperty,
  onRegionSettled,
  cameraTarget,
  onMapError,
  onMapReady,
}: NyumbaMapProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const lastTarget = useRef<string>('');

  const zoom = useMemo(() => deltaToZoom(region.latitudeDelta), [region.latitudeDelta]);
  const clusters = useMemo(() => clusterProperties(properties, zoom), [properties, zoom]);

  const handleRegionChangeComplete = useCallback(
    (r: Region) => {
      setRegion(r);
      onRegionSettled({
        north: r.latitude + r.latitudeDelta / 2,
        south: r.latitude - r.latitudeDelta / 2,
        east: r.longitude + r.longitudeDelta / 2,
        west: r.longitude - r.longitudeDelta / 2,
        zoom: Math.round(deltaToZoom(r.latitudeDelta)),
      });
    },
    [onRegionSettled],
  );

  useEffect(() => {
    if (!cameraTarget) return;
    const key = `${cameraTarget.latitude},${cameraTarget.longitude},${cameraTarget.zoom}`;
    if (key === lastTarget.current) return;
    lastTarget.current = key;
    const delta = zoomToDelta(cameraTarget.zoom);
    mapRef.current?.animateToRegion(
      {
        latitude: cameraTarget.latitude,
        longitude: cameraTarget.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      500,
    );
  }, [cameraTarget]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={INITIAL_REGION}
      onRegionChangeComplete={handleRegionChangeComplete}
      onMapReady={onMapReady}
      showsUserLocation={!!userLocation}
      showsMyLocationButton={false}
      showsCompass
    >
      {clusters.map((item) => {
        if ('isCluster' in item && (item as any).isCluster) {
          const c = item as any;
          return (
            <Marker
              key={c.id}
              coordinate={{ latitude: c.latitude, longitude: c.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => {
                const newZoom = Math.min(18, zoom + 2);
                const delta = zoomToDelta(newZoom);
                mapRef.current?.animateToRegion(
                  {
                    latitude: c.latitude,
                    longitude: c.longitude,
                    latitudeDelta: delta,
                    longitudeDelta: delta,
                  },
                  400,
                );
              }}
              tracksViewChanges={false}
            >
              <View style={styles.cluster}>
                <Text style={styles.clusterText}>{c.count}</Text>
              </View>
            </Marker>
          );
        }
        const p = item as MapProperty;
        return (
          <PropertyMarker
            key={p.id}
            property={p}
            selected={false}
            onPress={() => onSelectProperty(p)}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  cluster: {
    backgroundColor: COLORS.primary,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clusterText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
