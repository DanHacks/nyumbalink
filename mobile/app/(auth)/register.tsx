import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link, Stack } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius } from '../../src/theme';

const ROLES = [
  { id: 'tenant', label: 'Tenant' },
  { id: 'owner', label: 'Owner' },
];

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'tenant',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await register(form);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>NyumbaLink</Text>
            <Text style={styles.tagline}>Join NyumbaLink today</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Create Account</Text>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jane"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.first_name}
                  onChangeText={(v) => set('first_name', v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Doe"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.last_name}
                  onChangeText={(v) => set('last_name', v)}
                />
              </View>
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(v) => set('email', v)}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+254712345678"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={form.password}
              onChangeText={(v) => set('password', v)}
            />

            <Text style={styles.label}>I am a</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => set('role', r.id)}
                  style={[styles.roleChip, form.role === r.id && styles.roleChipActive]}
                >
                  <Text style={[styles.roleText, form.role === r.id && styles.roleTextActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={[styles.button, isLoading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isLoading}>
              <Text style={styles.buttonText}>{isLoading ? 'Creating account…' : 'Sign Up'}</Text>
            </Pressable>

            <Text style={styles.footer}>
              Already have an account?{' '}
              <Link href="/(auth)/login" style={styles.link}>
                Sign in
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 28, fontWeight: '800', color: colors.primary },
  tagline: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  form: { gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 12 },
  error: {
    color: colors.destructive,
    backgroundColor: '#fef2f2',
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleChipActive: { borderColor: colors.primary, backgroundColor: '#f0fdf4' },
  roleText: { fontWeight: '600', color: colors.mutedForeground },
  roleTextActive: { color: colors.primary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 16 },
  footer: { textAlign: 'center', marginTop: 18, color: colors.mutedForeground, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '700' },
});
