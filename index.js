/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Audit Issue K: silence debug logs in release builds so RPC payloads, wallet
// state, and other potentially sensitive values never reach logcat in
// production. console.warn/error are kept for crash diagnostics.
if (!__DEV__) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

AppRegistry.registerComponent(appName, () => App);
