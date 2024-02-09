/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import BackgroundSync, { ForegroundService } from './app/BackgroundSync';
import notifee from '@notifee/react-native';

AppRegistry.registerHeadlessTask('BackgroundSync', () => BackgroundSync);
notifee.registerForegroundService(ForegroundService);
AppRegistry.registerComponent(appName, () => App);
