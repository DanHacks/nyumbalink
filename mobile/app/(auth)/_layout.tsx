import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { user } = useAuth();

  if (user?.role) return <Redirect href="/(tabs)" />;
  if (user && !user.role) return <Redirect href="/(auth)/select-role" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="select-role" />
    </Stack>
  );
}
