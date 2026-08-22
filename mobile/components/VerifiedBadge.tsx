import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/theme';

export default function VerifiedBadge({ level }: { level?: string }) {
  if (!level || level === 'basic') return null;
  const isGold = level === 'gold' || level === 'platinum';
  return (
    <View style={[styles.badge, isGold ? styles.gold : styles.verified]}>
      <Text style={styles.text}>{isGold ? '✓ Gold' : '✓ Verified'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verified: {
    backgroundColor: '#dcfce7',
  },
  gold: {
    backgroundColor: '#fef3c7',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
  },
});
