import React from 'react';
import { Marker } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/theme';
import { formatPrice } from '@/lib/format';
import type { MapProperty } from '@/lib/types';

export default function PropertyMarker({
  property,
  onPress,
  selected,
}: {
  property: MapProperty;
  onPress?: () => void;
  selected?: boolean;
}) {
  const price = property.price ?? (property as any).min_rent ?? (property as any).max_rent;
  const short = price != null ? `KSh ${Math.round(price).toLocaleString('en-KE')}` : '—';
  return (
    <Marker
      coordinate={{ latitude: property.latitude, longitude: property.longitude }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={[styles.bubble, selected && styles.selected]}>
        <Text style={[styles.price, selected && styles.selectedPrice]}>{short}</Text>
        <View style={[styles.tail, selected && styles.selectedTail]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  selected: {
    backgroundColor: COLORS.accent,
  },
  price: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  selectedPrice: {
    color: '#1f2937',
  },
  tail: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#fff',
  },
  selectedTail: {
    backgroundColor: COLORS.accent,
  },
});
