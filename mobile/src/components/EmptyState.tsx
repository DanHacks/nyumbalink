import { Text, View, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export default function EmptyState({ icon = 'home-outline', title, message, style, titleStyle }: Props) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }, style]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[{ fontSize: 17, fontWeight: '700', color: colors.foreground, textAlign: 'center' }, titleStyle]}>
        {title}
      </Text>
      {message ? (
        <Text style={{ marginTop: 6, fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
