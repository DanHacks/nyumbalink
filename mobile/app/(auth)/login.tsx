import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/lib/theme';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { ErrorState } from '@/components/States';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to find your next home.</Text>

        {error ? <ErrorState message={error} /> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor={COLORS.muted}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={COLORS.muted}
        />

        <TouchableOpacity style={styles.primary} onPress={submit} disabled={busy}>
          <Text style={styles.primaryText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={styles.dividerText}>or</Text>
        </View>

        <GoogleSignInButton onError={setError} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to NyumbaLink? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Create account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: {
    padding: 24,
    paddingTop: 64,
    flexGrow: 1,
  },
  logo: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    marginBottom: 12,
    color: COLORS.text,
  },
  primary: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  divider: {
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
