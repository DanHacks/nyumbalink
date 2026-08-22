import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingState } from '@/components/States';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState message="Starting NyumbaLink…" />;
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
