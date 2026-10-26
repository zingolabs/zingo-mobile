import React, { Component, ErrorInfo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import RNRestart from 'react-native-restart';
import * as RNLocalize from 'react-native-localize';

import RPCModule from './RPCModule';
import {
  fieldMinHeight,
  radiusSm,
  space8,
  space12,
  space16,
  space24,
  themeTokens,
} from './theme';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import { sendEmail } from './services/sendEmail';
import { TranslateType } from './AppState';
import { sanitizePaths } from './utils/sanitizePaths';
import { getZingoName, getZingoVersion } from './utils/ZingoAppData';

/**
 * The boundary is the React root, so the i18n context may not be mounted when
 * it catches. It reads the bundled files by the device language instead, with
 * English behind every key.
 */
const files: Record<string, object> = {
  en: require('./translations/en.json'),
  es: require('./translations/es.json'),
  pt: require('./translations/pt.json'),
  ru: require('./translations/ru.json'),
  tr: require('./translations/tr.json'),
};
const lookup = (file: object, key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (o, k) =>
        o && typeof o === 'object'
          ? (o as Record<string, unknown>)[k]
          : undefined,
      file,
    );
const boundaryTranslate = (key: string): TranslateType => {
  let language = 'en';
  try {
    language =
      RNLocalize.findBestLanguageTag(Object.keys(files))?.languageTag ?? 'en';
  } catch {
    /* English */
  }
  const value = lookup(files[language], key) ?? lookup(files.en, key);
  return typeof value === 'string' ? value : key;
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
        <Text variant="screenTitle" style={styles.title}>
          {boundaryTranslate('errorboundary.title') as string}
        </Text>
        <Text variant="body" tone="muted" style={styles.message}>
          {boundaryTranslate('errorboundary.message') as string}
        </Text>
        <View style={styles.versionBlock}>
          <Text variant="bodySmall" tone="muted">
            {appLabel}
          </Text>
          {zingolibVersion ? (
            <Text variant="bodySmall" tone="muted">
              {`Zingolib: ${zingolibVersion}`}
            </Text>
          ) : null}
        </View>
        <ScrollView
          style={styles.detailsBox}
          contentContainerStyle={styles.detailsContent}
        >
          <Text variant="address" style={styles.header}>
            {header}
          </Text>
          {stack ? (
            <Text variant="address" tone="muted">
              {stack}
            </Text>
          ) : null}
        </ScrollView>
        <ButtonStack>
          <Button
            variant="secondary"
            title={boundaryTranslate('errorboundary.report') as string}
            onPress={() =>
              sendEmail(
                boundaryTranslate,
                zingolibVersion,
                `${getZingoName()} crash: ${error?.name ?? 'Error'}`,
                this.buildReport(),
              )
            }
          />
          <Button
            variant="primary"
            title={boundaryTranslate('errorboundary.restart') as string}
            onPress={() => RNRestart.Restart()}
          />
        </ButtonStack>
      </View>
    );
  }
}

/** Static tokens: the boundary renders when the providers may be broken. */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeTokens.bgCanvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space24,
  },
  title: { marginBottom: space12 },
  message: { textAlign: 'center', marginBottom: space8 },
  header: { marginBottom: space8 },
  versionBlock: {
    alignItems: 'center',
    marginTop: space12,
    marginBottom: space16,
  },
  detailsBox: {
    alignSelf: 'stretch',
    maxHeight: fieldMinHeight * 5,
    backgroundColor: themeTokens.bgSurface,
    borderRadius: radiusSm,
    paddingHorizontal: space12,
    paddingVertical: space12,
    marginBottom: space24,
  },
  detailsContent: {
    paddingBottom: space8,
  },
});

export default AppErrorBoundary;
