import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/lib/theme';
import { LoadingState } from '@/components/States';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { loading } = useAuth();
  if (loading) return <LoadingState />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: COLORS.border, height: 60, paddingBottom: 8 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: () => <TabIcon emoji="🗺️" /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: () => <TabIcon emoji="🔎" /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: 'Bookings', tabBarIcon: () => <TabIcon emoji="📅" /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: () => <TabIcon emoji="💬" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: () => <TabIcon emoji="👤" /> }}
      />
    </Tabs>
  );
}
