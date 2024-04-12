/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView } from 'react-native';
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

type AppProps = {
  notificationPermission: boolean;
};

const App: React.FunctionComponent<AppProps> = ({ notificationPermission }) => {
  const [theme, setTheme] = useState<ThemeType>(advancedTheme);

  useEffect(() => {
    if (notificationPermission) {
      const unsubscribe = messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        Alert.alert('A new FCM message arrived!', JSON.stringify(remoteMessage));
      });

      return unsubscribe;
    }
  }, [notificationPermission]);

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
