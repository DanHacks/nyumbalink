import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useGoogleAuth, exchangeGoogleToken } from '@/lib/google';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/lib/theme';

export default function GoogleSignInButton({
  label = 'Continue with Google',
  onError,
}: {
  label?: string;
  onError?: (message: string) => void;
}) {
  const { request, response, promptAsync } = useGoogleAuth();
  const { refreshUser } = useAuth();
  const [busy, setBusy] = React.useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        setBusy(true);
        exchangeGoogleToken(idToken)
          .then(() => refreshUser())
          .catch((e) => onError?.(e?.response?.data?.detail || 'Google sign-in failed'))
          .finally(() => setBusy(false));
      }
    } else if (response?.type === 'error') {
      onError?.('Google sign-in was cancelled or failed');
    }
  }, [response]);

  return (
    <TouchableOpacity style={styles.btn} onPress={() => promptAsync()} disabled={!request || busy}>
      {busy ? (
        <ActivityIndicator color={COLORS.muted} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  text: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
  },
});
