import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { COLORS } from '@/lib/theme';
import type { PropertyFilters } from '@/lib/types';

const TYPES = ['rental', 'apartment', 'hostel', 'guest_house', 'villa', 'airbnb'];
const GENDERS = ['any', 'male', 'female'];

export default function FilterSheet({
  value,
  onApply,
  onReset,
  onClose,
}: {
  value: PropertyFilters;
  onApply: (next: PropertyFilters) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const snapPoints = useMemo(() => ['70%', '92%'], []);
  const [draft, setDraft] = useState<PropertyFilters>({ ...value });

  const set = (patch: Partial<PropertyFilters>) => setDraft((d) => ({ ...d, ...patch }));

  const toggleType = (t: string) =>
    setDraft((d) => ({
      ...d,
      property_type: d.property_type === t ? undefined : t,
    }));

  const toggleAmenity = (a: keyof PropertyFilters) =>
    setDraft((d) => ({ ...d, [a]: !d[a] }));

  const apply = () => onApply(draft);

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      onClose={onClose}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      )}
      handleIndicatorStyle={{ backgroundColor: COLORS.muted }}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.heading}>Filters</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          <Text style={styles.label}>Max price: KSh {(draft.price_max ?? 100000).toLocaleString('en-KE')}</Text>
          <Slider
            minimumValue={0}
            maximumValue={200000}
            step={1000}
            value={draft.price_max ?? 100000}
            onValueChange={(v) => set({ price_max: v })}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
          />
          <Text style={styles.label}>Property type</Text>
          <View style={styles.chips}>
            {TYPES.map((t) => (
              <Chip key={t} label={t} active={draft.property_type === t} onPress={() => toggleType(t)} />
            ))}
          </View>

          <Text style={styles.label}>Who can stay</Text>
          <View style={styles.chips}>
            {GENDERS.map((g) => (
              <Chip key={g} label={g} active={draft.gender === g} onPress={() => set({ gender: g === 'any' ? undefined : g })} />
            ))}
          </View>

          <Text style={styles.label}>Rooms (min)</Text>
          <View style={styles.stepper}>
            <Stepper value={draft.rooms ?? 0} onChange={(v) => set({ rooms: v })} />
          </View>

          <Toggle label="Verified only" value={!!draft.verified_only} onValueChange={(v) => set({ verified_only: v })} />
          <Toggle label="Student accommodation" value={!!draft.student} onValueChange={(v) => set({ student: v })} />
          <Toggle label="Furnished" value={!!draft.furnished} onValueChange={(v) => set({ furnished: v })} />
          <Toggle label="WiFi" value={!!draft.wifi} onValueChange={(v) => set({ wifi: v })} />
          <Toggle label="Water" value={!!draft.water} onValueChange={(v) => set({ water: v })} />
          <Toggle label="Parking" value={!!draft.parking} onValueChange={(v) => set({ parking: v })} />
          <Toggle label="Security" value={!!draft.security} onValueChange={(v) => set({ security: v })} />
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.reset} onPress={() => { setDraft({}); onReset(); }}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.apply} onPress={apply}>
            <Text style={styles.applyText}>Show results</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} thumbColor={value ? COLORS.primary : '#fff'} trackColor={{ false: COLORS.border, true: '#7dd3fc' }} />
    </View>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(0, value - 1))}>
        <Text style={styles.stepText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value + 1)}>
        <Text style={styles.stepText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#fff',
  },
  stepper: {
    marginBottom: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  stepValue: {
    fontSize: 18,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  toggleLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  reset: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetText: {
    color: COLORS.muted,
    fontWeight: '700',
  },
  apply: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontWeight: '800',
  },
});
