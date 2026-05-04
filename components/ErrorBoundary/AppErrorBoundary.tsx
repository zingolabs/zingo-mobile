import React, { Component, ErrorInfo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import RNRestart from 'react-native-restart';

type State = { hasError: boolean };

class AppErrorBoundary extends Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AppErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            An unexpected error occurred. Please restart the app.
          </Text>
          <Pressable style={styles.button} onPress={() => RNRestart.Restart()}>
            <Text style={styles.buttonText}>Restart</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06172d',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#dadfe1',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    color: '#7c8494',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#43a637',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#dadfe1',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppErrorBoundary;
