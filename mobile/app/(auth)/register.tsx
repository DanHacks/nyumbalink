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
import { COLORS, ROLE_LABELS } from '@/lib/theme';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { ErrorState } from '@/components/States';
import type { UserRole } from '@/lib/types';

const ROLES: UserRole[] = ['student', 'tenant', 'owner', 'agent'];

export default function RegisterScreen() {
  const { register } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!role) {
      setError('Choose how you will use NyumbaLink.');
      return;
    }
    if (!fullName || !email || !password) {
      setError('Name, email and password are required.');
      return;
    }
    setBusy(true);
    try {
      await register({
        full_name: fullName,
        email: email.trim().toLowerCase(),
        password,
        phone: phone || undefined,
        role,
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Registration failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Sign in as</Text>

        <View style={styles.roles}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.role, role === r && styles.roleActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                {ROLE_LABELS[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <ErrorState message={error} /> : null}

        <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} placeholderTextColor={COLORS.muted} />
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholderTextColor={COLORS.muted} />
        <TextInput style={styles.input} placeholder="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholderTextColor={COLORS.muted} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor={COLORS.muted} />

        <TouchableOpacity style={styles.primary} onPress={submit} disabled={busy}>
          <Text style={styles.primaryText}>{busy ? 'Creating…' : 'Create account'}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={styles.dividerText}>or</Text>
        </View>
        <GoogleSignInButton onError={setError} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 24, paddingTop: 56, flexGrow: 1 },
  logo: { width: 88, height: 88, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 10 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 8 },
  role: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  roleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  roleTextActive: { color: '#fff' },
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
  primary: { backgroundColor: COLORS.primary, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  divider: { alignItems: 'center', marginVertical: 14 },
  dividerText: { color: COLORS.muted, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  footerText: { color: COLORS.muted, fontSize: 14 },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
