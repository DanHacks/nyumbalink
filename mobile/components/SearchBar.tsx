import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/theme';

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, onSubmit, placeholder }: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>🔍</Text>
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? 'Where do you want to live?'}
        placeholderTextColor={COLORS.muted}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} style={styles.clear}>
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconBox: {
    marginRight: 8,
  },
  icon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: COLORS.text,
  },
  clear: {
    padding: 6,
  },
  clearText: {
    color: COLORS.muted,
    fontSize: 14,
  },
});
