import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/theme';

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surfaces in adb logcat (release) and dev tools (development).
    console.error('[NyumbaLink] Fatal error:', error?.message, info?.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>NyumbaLink</Text>
          <Text style={styles.msg}>Something went wrong.</Text>
          {__DEV__ && this.state.error?.message ? (
            <Text style={styles.detail}>{this.state.error.message}</Text>
          ) : null}
          <TouchableOpacity style={styles.retry} onPress={this.reset}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  msg: { fontSize: 15, color: COLORS.muted, marginTop: 8 },
  detail: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  retry: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
