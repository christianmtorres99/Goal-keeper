import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={s.container}>
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.message}>{this.state.message}</Text>
        <TouchableOpacity style={s.btn} onPress={this.handleReload}>
          <Text style={s.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080C', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:    { color: '#ECEEF5', fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  message:  { color: '#8A94A8', fontSize: 13, textAlign: 'center', marginBottom: 32 },
  btn:      { backgroundColor: '#5551E8', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  btnText:  { color: '#ECEEF5', fontSize: 15, fontWeight: '700' },
});
