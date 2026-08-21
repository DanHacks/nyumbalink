import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';

const TAB_ICONS = {
  index: ['map-outline', 'map'] as const,
  search: ['search-outline', 'search'] as const,
  saved: ['heart-outline', 'heart'] as const,
  viewings: ['calendar-outline', 'calendar'] as const,
  account: ['person-outline', 'person'] as const,
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal700,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={TAB_ICONS.index[focused ? 1 : 0]} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={TAB_ICONS.search[focused ? 1 : 0]} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={TAB_ICONS.saved[focused ? 1 : 0]} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="viewings"
        options={{
          title: 'Viewings',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={TAB_ICONS.viewings[focused ? 1 : 0]} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={TAB_ICONS.account[focused ? 1 : 0]} size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
