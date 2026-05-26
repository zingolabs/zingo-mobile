import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';

/**
 * Human-facing Zingo version, e.g. "2.0.19 (308)".
 *
 * Reads from the native binary at runtime so it reflects the channel the user
 * actually installed (prod vs beta), independent of the JS bundle.
 */
export function getZingoVersion(): string {
  return `${getVersion()} (${getBuildNumber()})`;
}

/**
 * Display name of the running app, e.g. "Zingo" or "Zingo Beta".
 *
 * Reads CFBundleDisplayName (iOS) / app_name resource (Android) at runtime so
 * the in-app UI matches the springboard label of the installed binary.
 */
export function getZingoName(): string {
  return getApplicationName();
}

// `require()` is resolved by Metro at bundle time, so both assets are shipped
// in every build; the runtime check just picks which one to render.
const PROD_LOGO = require('../../assets/img/logobig-zingo.png');
const BETA_LOGO = require('../../assets/img/logobig-zingo-beta.png');

/**
 * Big Zingo logo asset (drawer header, splash, QR center, etc).
 * Returns the beta-specific image when running the beta variant, otherwise the
 * production logo. Detection follows the same runtime app-name signal as
 * `getZingoName()`.
 */
export function getZingoLogo() {
  return getApplicationName() === 'Zingo Beta' ? BETA_LOGO : PROD_LOGO;
}

/**
 * Substitute `{name}` placeholder with the runtime app name in any translation
 * result. Designed to be called from the `translate` wrapper so every i18n
 * lookup transparently picks up "Zingo Beta" when running the beta variant.
 *
 * Handles strings, arrays and nested objects via a single JSON round-trip,
 * skipped when no `{name}` placeholder is present (the common case).
 */
export function substituteZingoName<T>(value: T): T {
  if (typeof value === 'string') {
    return value.includes('{name}')
      ? (value.replaceAll('{name}', getZingoName()) as unknown as T)
      : value;
  }
  const serialized = JSON.stringify(value);
  if (!serialized || !serialized.includes('{name}')) {
    return value;
  }
  return JSON.parse(serialized.replaceAll('{name}', getZingoName())) as T;
}
