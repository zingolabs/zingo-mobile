/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

import { LoadedApp } from './app/LoadedApp';
import { LoadingApp } from './app/LoadingApp';
import { ThemeType } from './app/types';

const advancedTheme: ThemeType = {
  dark: true,
  colors: {
    background: '#011401',
    card: '#011401',
    border: '#ffffff',
    primary: '#18bd18',
    primaryDisabled: '#5a8c5a',
    secondaryDisabled: '#233623',
    text: '#c3c3c3',
    zingo: '#888888',
    placeholder: '#888888',
    money: '#ffffff',
    syncing: '#ebff5a',
    notification: '',
  },
};

const basicTheme: ThemeType = {
  dark: true,
  colors: {
    background: '#011401',
    card: '#011401',
    border: '#ffffff',
    primary: '#0ef8f8', // new tron color
    primaryDisabled: '#a0dcdc', // new tron color disable
    secondaryDisabled: '#233623',
    text: '#c3c3c3',
    zingo: '#888888',
    placeholder: '#888888',
    money: '#ffffff',
    syncing: '#ebff5a',
    notification: '',
  },
};

const Stack = createStackNavigator();

const App: React.FunctionComponent = () => {
  const [theme, setTheme] = useState<ThemeType>(advancedTheme);

  useEffect(() => {
    (async () => {
      const granted = await requestNofificationPermission();
      if (granted) {
        const unsubscribe = messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          Alert.alert('A new FCM message arrived!', JSON.stringify(remoteMessage));
        });

        return unsubscribe;
      }
    })();
  }, []);

  const requestNofificationPermission = async (): Promise<boolean> => {
    let granted = false;
    if (Platform.OS === 'ios') {
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
      const authStatusCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

      console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&', authStatusCheck);

      if (!authStatusCheck) {
        const authStatus = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        const enabled = authStatus === 'granted';

        if (enabled) {
          console.log('Android Authorization status:', authStatus);
          granted = true;
        }
      } else {
        console.log('Android Authorization status:', authStatusCheck);
        granted = true;
      }
    }
    return granted;
  };

  const toggleTheme = (mode: 'basic' | 'advanced') => {
    setTheme(mode === 'advanced' ? advancedTheme : basicTheme);
  };

  //console.log('render App - 1');
  return (
    <NavigationContainer theme={theme}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: theme.colors.card,
        }}>
        <Stack.Navigator initialRouteName="LoadingApp" screenOptions={{ headerShown: false, animationEnabled: false }}>
          <Stack.Screen name="LoadingApp">{props => <LoadingApp {...props} toggleTheme={toggleTheme} />}</Stack.Screen>
          <Stack.Screen name="LoadedApp">{props => <LoadedApp {...props} toggleTheme={toggleTheme} />}</Stack.Screen>
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

export default App;
