import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/lib/auth';
import { COLORS, ROLE_LABELS } from '@/lib/theme';
import { LoadingState } from '@/components/States';
import type { UserRole } from '@/lib/types';

const ROLES: UserRole[] = ['student', 'tenant', 'owner', 'agent', 'caretaker'];

export default function SelectRoleScreen() {
  const { user, selectRole } = useAuth();
  const [busy, setBusy] = useState<UserRole | null>(null);
  const [error, setError] = useState('');

  if (!user) return <LoadingState message="Loading…" />;

  const choose = async (role: UserRole) => {
    setError('');
    setBusy(role);
    try {
      await selectRole(role);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not set role.');
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>One last step</Text>
      <Text style={styles.subtitle}>How will you use NyumbaLink?</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.list}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r}
            style={styles.item}
            disabled={busy !== null}
            onPress={() => choose(r)}
          >
            <Text style={styles.itemText}>{ROLE_LABELS[r]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 72, flexGrow: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 18 },
  error: { color: COLORS.danger, textAlign: 'center', marginBottom: 12 },
  list: { gap: 12 },
  item: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  itemText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
});
