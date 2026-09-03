import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingState } from '@/components/States';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState message="Starting NyumbaLink…" />;
  // Guest-first: show the map even without sign-in. Only force role selection for signed-in users without a role.
  if (user && !user.role) return <Redirect href="/(auth)/select-role" />;
  return <Redirect href="/(tabs)" />;
}
