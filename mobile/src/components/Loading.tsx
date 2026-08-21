import { ActivityIndicator, Text, View } from 'react-native';
import { colors } from '../theme';

export default function Loading({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? (
        <Text style={{ marginTop: 12, color: colors.mutedForeground, fontSize: 14 }}>{label}</Text>
      ) : null}
    </View>
  );
}
