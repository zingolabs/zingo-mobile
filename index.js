/**
 * @format
 */

import React from 'react';
import { AppRegistry, Platform, PermissionsAndroid } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

let granted = false;

const requestNofificationPermission = async () => {
  if (Platform === 'ios') {
    // IOS 
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  
    if (enabled) {
      console.log('IOS Authorization status:', authStatus);
      granted = true;
    }
  } else {
    // Android
    const authStatus = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    const enabled = authStatus === PermissionsAndroid.RESULTS_GRANTED;

    if (enabled) {
      console.log('Android Authorization status:', authStatus);
      granted = true;
    }
  }  
};

requestNofificationPermission();

const AppWrapper = () => {
  return <App notificationPermission={granted} />;
};

AppRegistry.registerComponent(appName, () => AppWrapper);
