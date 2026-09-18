import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Updates from 'expo-updates';
import { AuthProvider } from '@/lib/auth';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function RootLayout() {
  useEffect(() => {
    let active = true;
    if (!Updates.isEnabled) return;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!active || !result.isAvailable) return;
        Alert.alert(
          'Update available',
          'A new version of NyumbaLink is available. Download and install it now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch {
                  /* ignore */
                }
              },
            },
          ]
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar style="dark" />
          <Slot />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
