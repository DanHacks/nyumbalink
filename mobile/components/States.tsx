import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/theme';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.msg}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>🏡</Text>
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  msg: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  retry: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
