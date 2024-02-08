/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import BackgroundSync from './app/BackgroundSync';
import notifee from '@notifee/react-native';

notifee.registerForegroundService(BackgroundSync);
AppRegistry.registerComponent(appName, () => App);
