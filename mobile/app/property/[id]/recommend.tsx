import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createReview } from '@/lib/api';
import { COLORS } from '@/lib/theme';
import { ErrorState } from '@/components/States';

const FACTORS = ['Affordable', 'Good water', 'Good security', 'Clean', 'Good location', 'Reliable electricity', 'Good caretaker'];

export default function RecommendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [factors, setFactors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const toggleFactor = (f: string) =>
    setFactors((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const submit = async () => {
    setError('');
    if (rating < 1) {
      setError('Please add a rating.');
      return;
    }
    setBusy(true);
    try {
      await createReview(id as string, { rating, comment: comment.trim(), positive_factors: factors });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Recommendation could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>⭐</Text>
        <Text style={styles.doneTitle}>Thanks for the recommendation!</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.back()}>
          <Text style={styles.primaryText}>Back to property</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Recommend this property</Text>
      <Text style={styles.sub}>Share what makes it a good place to live.</Text>
      {error ? <ErrorState message={error} /> : null}

      <Text style={styles.label}>Your rating</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, n <= rating ? styles.starActive : null]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Comment</Text>
      <TextInput
        style={styles.textarea}
        multiline
        numberOfLines={4}
        value={comment}
        onChangeText={setComment}
        placeholder="What did you like?"
        placeholderTextColor={COLORS.muted}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Positive factors</Text>
      <View style={styles.chips}>
        {FACTORS.map((f) => (
          <TouchableOpacity key={f} style={[styles.chip, factors.includes(f) && styles.chipActive]} onPress={() => toggleFactor(f)}>
            <Text style={[styles.chipText, factors.includes(f) && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primary} onPress={submit} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Submitting…' : 'Submit recommendation'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56, flexGrow: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.muted, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 36, color: COLORS.border },
  starActive: { color: COLORS.accent },
  textarea: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 96 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  primary: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 8 },
});
