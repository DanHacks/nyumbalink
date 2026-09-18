import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LoadingState, ErrorState } from '@/components/States';
import { getMessages, sendMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/lib/theme';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setMessages(await getMessages(id as string));
    } catch {
      setError('Could not load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const send = async () => {
    if (!draft.trim()) return;
    try {
      await sendMessage(id as string, draft.trim());
      setDraft('');
      await load();
    } catch {
      setError('Message failed to send.');
    }
  };

  if (loading) return <LoadingState message="Loading chat…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={styles.flex}>
      <Text style={styles.heading}>Messages</Text>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id ?? String(Math.random())}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const mine = user ? item.sender_id === user.id : !!item.from_me;
          const body = item.content ?? item.body ?? '';
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={mine ? styles.mineText : styles.theirText}>{body}</Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          placeholderTextColor={COLORS.muted}
        />
        <TouchableOpacity style={styles.send} onPress={send}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  heading: { fontSize: 20, fontWeight: '800', color: COLORS.text, padding: 16, paddingTop: 56 },
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 14 },
  mine: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  mineText: { color: '#fff' },
  theirText: { color: COLORS.text },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 12, height: 44, color: COLORS.text },
  send: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '800' },
});
