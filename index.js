/**
 * @format
 */

import notifee, { EventType } from '@notifee/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    console.log('BACKGROUND PRESS', detail.notification?.data?.deeplink);
    // aquí no navegues con navigationRef
    // solo persiste estado si quieres, o deja que getInitialNotification lo recoja al abrir
  }
});

AppRegistry.registerComponent(appName, () => App);
