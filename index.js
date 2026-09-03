/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from '@app/App';
import { name as appName } from './app.json';

// STORYBOOK_ENABLED is inlined by Metro (withStorybook) at bundle time.
const Root = process.env.STORYBOOK_ENABLED === 'true'
  ? require('.storybook/index.tsx').default
  : App;

// Audit Issue K — single-point logging facade. Release builds silence
// console.log/debug/info so RPC payloads, wallet state, and other
// potentially sensitive values never reach logcat in production. This is
// the load-bearing barrier the audit's remediation refers to ("logging
// can be disabled at a single point in production builds"); do NOT
// remove it on the assumption that warn/error suffice — they only pass
// through here as crash-diagnostic channels and must not be used to log
// sensitive data either. Call sites that previously dumped sensitive
// payloads (transaction amounts, fees, spendable balance, address book
// items, txids) were also scrubbed in source so debug builds shared
// with QA / support do not carry them.
if (!__DEV__) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

AppRegistry.registerComponent(appName, () => Root);
