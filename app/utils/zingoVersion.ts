import { getVersion, getBuildNumber } from 'react-native-device-info';

/**
 * Human-facing Zingo version, e.g. "zingo-2.0.19 (308)".
 *
 * Reads from the native binary at runtime so it reflects the channel the user
 * actually installed (prod vs beta), independent of the JS bundle.
 */
export function getZingoVersion(): string {
  const version = getVersion();
  const build = getBuildNumber();
  const prefixed = version.startsWith('zingo-') ? version : `zingo-${version}`;
  return `${prefixed} (${build})`;
}
