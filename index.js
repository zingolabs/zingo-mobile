/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import BackgroundSync from './app/BackgroundSync';

AppRegistry.registerHeadlessTask('BackgroundSync', () => BackgroundSync);
AppRegistry.registerComponent(appName, () => App);
