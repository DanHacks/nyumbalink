import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { COLORS, ROLE_LABELS } from '@/lib/theme';
import VerifiedBadge from '@/components/VerifiedBadge';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const initials = (user?.full_name || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Text style={styles.name}>{user?.full_name || 'NyumbaLink user'}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{user?.role ? ROLE_LABELS[user.role] : 'No role'}</Text>
      </View>
      <VerifiedBadge level={user?.is_identity_verified ? 'gold' : 'basic'} />

      <View style={styles.section}>
        <Row label="Account" value={user?.is_active ? 'Active' : 'Inactive'} />
        <Row label="Identity" value={user?.is_identity_verified ? 'Verified' : 'Not verified'} />
        <Row label="Trust score" value={String(user?.trust_score ?? '—')} />
      </View>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/(tabs)/bookings' as any)}>
        <Text style={styles.itemText}>My bookings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => router.push('/(tabs)/messages' as any)}>
        <Text style={styles.itemText}>Messages</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>Privacy & Terms</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>Support</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={() => logout()}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 64, flexGrow: 1, backgroundColor: COLORS.background },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginTop: 12 },
  email: { fontSize: 14, color: COLORS.muted, textAlign: 'center' },
  roleBadge: { alignSelf: 'center', marginTop: 8, backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  roleText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  section: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginTop: 20, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.border },
  rowLabel: { color: COLORS.muted, fontSize: 14 },
  rowValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  item: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginTop: 10, borderWidth: 1, borderColor: COLORS.border },
  itemText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  logout: { backgroundColor: '#fee2e2', borderRadius: 14, padding: 16, marginTop: 20, alignItems: 'center' },
  logoutText: { color: COLORS.danger, fontWeight: '800', fontSize: 15 },
});
