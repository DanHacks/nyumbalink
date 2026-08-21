import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme';

export default function AccountPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Account</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user ? `${user.first_name} ${user.last_name}` : 'Guest'}</Text>
          <Text style={styles.sub}>{user?.email}</Text>
          <View style={styles.chipsRow}>
            <View style={styles.roleChip}>
              <Text style={styles.roleText}>{user?.role ?? 'tenant'}</Text>
            </View>
            {user?.is_identity_verified || user?.is_verified_owner ? (
              <View style={[styles.roleChip, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                <Text style={[styles.roleText, { color: colors.primary }]}>Verified</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Pressable style={styles.action} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.actionText, { color: colors.destructive }]}>Sign out</Text>
      </Pressable>

      <Text style={styles.version}>NyumbaLink v1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', color: colors.foreground, paddingHorizontal: 16, paddingTop: 12 },
  profileCard: {
    flexDirection: 'row',
    gap: 14,
    margin: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primaryForeground, fontSize: 20, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '700', color: colors.foreground },
  sub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  chipsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.muted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: { fontSize: 11, fontWeight: '700', color: colors.mutedForeground, textTransform: 'capitalize' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  actionText: { fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', marginTop: 'auto', marginBottom: 20, fontSize: 12, color: colors.mutedForeground },
});
