import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link, Stack } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius } from '../../src/theme';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
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
            <Text style={styles.tagline}>Find your place. Live your way.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Welcome back</Text>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Your password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Pressable style={[styles.button, isLoading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isLoading}>
              <Text style={styles.buttonText}>{isLoading ? 'Signing in…' : 'Sign In'}</Text>
            </Pressable>

            <Text style={styles.footer}>
              New to NyumbaLink?{' '}
              <Link href="/(auth)/register" style={styles.link}>
                Create an account
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 28, fontWeight: '800', color: colors.primary },
  tagline: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  form: { gap: 6 },
  title: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 12 },
  error: {
    color: colors.destructive,
    backgroundColor: '#fef2f2',
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
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
