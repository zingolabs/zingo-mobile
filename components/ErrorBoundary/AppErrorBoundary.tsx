import React, { Component, ErrorInfo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import RNRestart from 'react-native-restart';

import RPCModule from '../../app/RPCModule';
import { sendEmail } from '../../app/sendEmail';
import { TranslateType } from '../../app/AppState';
import { getZingoName, getZingoVersion } from '../../app/utils/ZingoAppData';

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
  private buildReport(): string {
    const { error } = this.state;
    const name = error?.name ?? 'Error';
    const message = error?.message ?? 'unknown error';
    const stack = error?.stack ?? '';
    return `${name}: ${message}\n${stack}`;
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const { error, zingolibVersion } = this.state;
    const appLabel = `${getZingoName()} ${getZingoVersion()}`;
    const header = error ? `${error.name}: ${error.message}` : 'Unknown error';
    const stack = error?.stack ?? '';
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
    color: '#dadfe1',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    color: '#7c8494',
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
    color: '#7c8494',
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
    color: '#dadfe1',
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  detailsStack: {
    color: '#7c8494',
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
    backgroundColor: '#43a637',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#37548a',
  },
  buttonText: {
    color: '#dadfe1',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppErrorBoundary;
