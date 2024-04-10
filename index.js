/**
 * @format
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from 'react-native-firebase/messaging';

let granted = false;

const requestNofificationPermission = async () => {
  try {
    granted = await messaging().requestNofificationPermission();
    if (granted) {
      console.log('permission granted');
      // Register background handler
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);
      });
    } else {
      console.log('permission  denied');
    }
  } catch (error) {
    console.log('permission error:', error);
  }
};

requestNofificationPermission();

AppRegistry.registerComponent(appName, () => <App notificationPermission={granted} />);
