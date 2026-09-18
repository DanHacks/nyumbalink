import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingState, ErrorState, EmptyState } from '@/components/States';
import { getConversations } from '@/lib/api';
import { COLORS } from '@/lib/theme';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await getConversations());
    } catch {
      setError('Could not load conversations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      load();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  if (!user) {
    return (
      <View style={styles.flex}>
        <Text style={styles.heading}>Messages</Text>
        <View style={styles.center}>
          <Text style={styles.guestTitle}>Sign in to view messages</Text>
          <TouchableOpacity style={styles.primary} onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.primaryText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) return <LoadingState message="Loading messages…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items.length === 0)
    return (
      <View style={styles.flex}>
        <Text style={styles.heading}>Messages</Text>
        <EmptyState message="No conversations yet." />
      </View>
    );

  return (
    <View style={styles.flex}>
      <Text style={styles.heading}>Messages</Text>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/messages/${item.id}` as any)}>
            <Text style={styles.name}>{item.other_user_name ?? item.participant_name ?? 'Conversation'}</Text>
            <Text style={styles.last} numberOfLines={1}>
              {item.last_message_preview ?? item.last_message ?? 'No messages yet'}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text, padding: 16, paddingTop: 56 },
  list: { padding: 16, paddingTop: 0 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  last: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  guestTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  primary: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  primaryText: { color: '#fff', fontWeight: '800' },
});
