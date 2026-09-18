import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { createReport } from '@/lib/api';
import { COLORS } from '@/lib/theme';
import { LoadingState, ErrorState } from '@/components/States';

const REASONS: { value: string; label: string }[] = [
  { value: 'fake_property', label: 'Fake property' },
  { value: 'fake_photos', label: 'Fake photos' },
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'wrong_rent', label: 'Wrong price' },
  { value: 'room_unavailable', label: 'Property unavailable' },
  { value: 'owner_fraud', label: 'Fraud / scam' },
  { value: 'misleading_description', label: 'Misleading information' },
  { value: 'payment_scam', label: 'Payment scam' },
  { value: 'unsafe_property', label: 'Unsafe property' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
];

const FLAGS: { value: string; label: string }[] = [
  { value: 'wrong_photos', label: 'Photos are wrong' },
  { value: 'wrong_rent', label: 'Price is wrong' },
  { value: 'wrong_location', label: 'Location is wrong' },
  { value: 'occupied_room', label: 'Room not available' },
  { value: 'broken_house', label: 'House is broken' },
  { value: 'fake_listing', label: 'Listing is fake' },
  { value: 'duplicate_listing', label: 'Duplicate listing' },
];

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [evidence, setEvidence] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const toggleFlag = (f: string) => setFlags((prev) => ({ ...prev, [f]: !prev[f] }));

  const addPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
    if (!res.canceled) setEvidence((e) => [...e, res.assets[0].uri]);
  };

  const submit = async () => {
    setError('');
    if (!reason) {
      setError('Please choose a reason.');
      return;
    }
    if (reason === 'other' && description.trim().length < 5) {
      setError('Please describe the issue.');
      return;
    }
    setBusy(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      let gps: { lat: number; lon: number } | undefined;
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        gps = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      }
      await createReport(id as string, {
        report_category: reason,
        description: description.trim() || 'Reported via mobile app',
        evidence,
        ...flags,
        reporter_gps_lat: gps?.lat,
        reporter_gps_lon: gps?.lon,
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Report could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>✅</Text>
        <Text style={styles.doneTitle}>Report submitted</Text>
        <Text style={styles.doneText}>NyumbaLink will investigate. Your identity stays private.</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.back()}>
          <Text style={styles.primaryText}>Back to property</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Report property</Text>
      <Text style={styles.sub}>Your report is private and helps keep NyumbaLink safe.</Text>
      {error ? <ErrorState message={error} /> : null}

      <Text style={styles.label}>Reason</Text>
      <View style={styles.chips}>
        {REASONS.map((r) => (
          <TouchableOpacity key={r.value} style={[styles.chip, reason === r.value && styles.chipActive]} onPress={() => setReason(r.value)}>
            <Text style={[styles.chipText, reason === r.value && styles.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description {reason === 'other' ? '(required)' : '(optional)'}</Text>
      <TextInput
        style={styles.textarea}
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
        placeholder="Add details…"
        placeholderTextColor={COLORS.muted}
        textAlignVertical="top"
      />

      <Text style={styles.label}>What's wrong?</Text>
      {FLAGS.map((f) => (
        <View key={f.value} style={styles.toggle}>
          <Text style={styles.toggleLabel}>{f.label}</Text>
          <Switch value={!!flags[f.value]} onValueChange={() => toggleFlag(f.value)} thumbColor={flags[f.value] ? COLORS.primary : '#fff'} trackColor={{ false: COLORS.border, true: '#7dd3fc' }} />
        </View>
      ))}

      <Text style={styles.label}>Evidence (optional)</Text>
      <TouchableOpacity style={styles.photoBtn} onPress={addPhoto}>
        <Text style={styles.photoText}>+ Add photo</Text>
      </TouchableOpacity>
      <View style={styles.evidenceRow}>
        {evidence.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.evidenceThumb} />
        ))}
      </View>

      <TouchableOpacity style={styles.primary} onPress={submit} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Submitting…' : 'Submit report'}</Text>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  textarea: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 96 },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.border },
  toggleLabel: { fontSize: 14, color: COLORS.text },
  photoBtn: { borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.muted, borderRadius: 12, padding: 14, alignItems: 'center' },
  photoText: { color: COLORS.primary, fontWeight: '700' },
  evidenceRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  evidenceThumb: { width: 64, height: 64, borderRadius: 10 },
  primary: { backgroundColor: COLORS.danger, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  doneEmoji: { fontSize: 48 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  doneText: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginVertical: 8 },
});
