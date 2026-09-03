import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingState } from '@/components/States';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState message="Starting NyumbaLink…" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.role) return <Redirect href="/(auth)/select-role" />;
  return <Redirect href="/(tabs)" />;
}
