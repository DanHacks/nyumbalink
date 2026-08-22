import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createBooking } from '@/lib/api';
import { COLORS } from '@/lib/theme';
import { ErrorState } from '@/components/States';

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('09:30');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Enter a move-in date as YYYY-MM-DD.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
      setError('Enter times as HH:MM.');
      return;
    }
    setBusy(true);
    try {
      await createBooking({
        property_id: id,
        scheduled_date: date,
        scheduled_time_start: `1970-01-01T${start}:00`,
        scheduled_time_end: `1970-01-01T${end}:00`,
        tenant_notes: notes.trim() || undefined,
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Booking could not be created.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>📅</Text>
        <Text style={styles.doneTitle}>Viewing requested</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.push('/(tabs)/bookings' as any)}>
          <Text style={styles.primaryText}>View my bookings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Book a viewing</Text>
      {error ? <ErrorState message={error} /> : null}

      <Text style={styles.label}>Move-in / viewing date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-09-01" placeholderTextColor={COLORS.muted} />

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Start (HH:MM)</Text>
          <TextInput style={styles.input} value={start} onChangeText={setStart} placeholder="09:00" placeholderTextColor={COLORS.muted} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>End (HH:MM)</Text>
          <TextInput style={styles.input} value={end} onChangeText={setEnd} placeholder="09:30" placeholderTextColor={COLORS.muted} />
        </View>
      </View>

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={styles.textarea} multiline numberOfLines={3} value={notes} onChangeText={setNotes} placeholder="Anything the owner should know…" placeholderTextColor={COLORS.muted} textAlignVertical="top" />

      <TouchableOpacity style={styles.primary} onPress={submit} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Requesting…' : 'Request viewing'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56, flexGrow: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 15, color: COLORS.text },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  textarea: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 80 },
  primary: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 8 },
});
