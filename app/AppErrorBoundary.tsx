import React, { Component, ErrorInfo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import RNRestart from 'react-native-restart';

import RPCModule from './RPCModule';
import { advancedTokens } from './theme';
import { sendEmail } from './services/sendEmail';
import { TranslateType } from './AppState';
import { sanitizePaths } from './utils/sanitizePaths';
import { getZingoName, getZingoVersion } from './utils/ZingoAppData';

// The boundary is the React root, so the i18n context may not be mounted by
// the time we crash. sendEmail only looks up the support address and the
// "couldn't open email" dialog keys (subject/body are always provided by us
// explicitly, so their translate calls never fire). Hardcoding English
// fallbacks keeps Report functional even on early-bootstrap crashes.
const boundaryTranslate = (key: string): TranslateType => {
  switch (key) {
    case 'email':
      return 'support@zingolabs.org';
    case 'loadedapp.email-error-title':
      return 'Email error';
    case 'loadedapp.email-error-body':
      return 'Could not open the email client.';
    case 'close':
      return 'Close';
    default:
      return key;
  }
};

type State = {
  hasError: boolean;
  error: Error | null;
  zingolibVersion: string;
};

class AppErrorBoundary extends Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, error: null, zingolibVersion: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, zingolibVersion: '' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AppErrorBoundary caught:', error, info.componentStack);
    // Best-effort fetch of the rust layer version so the report carries the
    // same identity info Settings would. Bounded by a 2s timeout because the
    // native bridge could be in a degraded state after a crash; on failure
    // the report still goes out, just without the zingolib line.
    Promise.race<string>([
      RPCModule.getVersionInfo(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 2000),
      ),
    ])
      .then(v => this.setState({ zingolibVersion: v }))
      .catch(() => {
        /* leave zingolibVersion empty */
      });
  }

  // Body for the support email. sendEmail prepends device/app/zingolib info
  // automatically, so we only contribute the error specifics here.
  // Paths are sanitized so the report doesn't leak the developer's username
  // (Hermes bakes the compile-time absolute path into release stacks).
  private buildReport(): string {
    const { error } = this.state;
    const name = error?.name ?? 'Error';
    const message = error?.message ?? 'unknown error';
    const stack = error?.stack ?? '';
    return sanitizePaths(`${name}: ${message}\n${stack}`);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const { error, zingolibVersion } = this.state;
    const appLabel = `${getZingoName()} ${getZingoVersion()}`;
    const header = sanitizePaths(
      error ? `${error.name}: ${error.message}` : 'Unknown error',
    );
    const stack = sanitizePaths(error?.stack ?? '');
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          An unexpected error occurred. Please restart the app.
        </Text>
        <View style={styles.versionBlock}>
          <Text style={styles.versionLine}>{appLabel}</Text>
          {zingolibVersion ? (
            <Text
              style={styles.versionLine}
            >{`Zingolib: ${zingolibVersion}`}</Text>
          ) : null}
        </View>
        <ScrollView
          style={styles.detailsBox}
          contentContainerStyle={styles.detailsContent}
        >
          <Text style={styles.detailsHeader}>{header}</Text>
          {stack ? <Text style={styles.detailsStack}>{stack}</Text> : null}
        </ScrollView>
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() =>
              sendEmail(
                boundaryTranslate,
                zingolibVersion,
                `${getZingoName()} crash: ${error?.name ?? 'Error'}`,
                this.buildReport(),
              )
            }
          >
            <Text style={styles.buttonText}>Report</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => RNRestart.Restart()}>
            <Text style={styles.buttonText}>Restart</Text>
          </Pressable>
        </View>
      </View>
    );
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
    color: advancedTokens.fgDefault,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    color: advancedTokens.fgMuted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  versionBlock: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  versionLine: {
    color: advancedTokens.fgMuted,
    fontSize: 13,
  },
  detailsBox: {
    alignSelf: 'stretch',
    maxHeight: 240,
    backgroundColor: '#0d2645',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 24,
  },
  detailsContent: {
    paddingBottom: 4,
  },
  detailsHeader: {
    color: advancedTokens.fgDefault,
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  detailsStack: {
    color: advancedTokens.fgMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    // The boundary renders when the tree (and its providers) may be broken, so
    // it reads the advanced accent statically instead of following the mode.
    backgroundColor: advancedTokens.bgAccent,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#37548a',
  },
  buttonText: {
    color: advancedTokens.fgDefault,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppErrorBoundary;
