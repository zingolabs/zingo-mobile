/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { LoadedApp } from './app/LoadedApp';
import { LoadingApp } from './app/LoadingApp';
import { ThemeType, AppStackParamList } from './app/types';
import { RouteEnum } from './app/AppState';

import { BackHandler, LogBox, StatusBar } from 'react-native';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const zingoTheme: ThemeType = {
  ...DefaultTheme,
  dark: true,
  colors: {
    background: '#0f0f0f',
    card: '#0f0f0f',
    border: '#333333ff',
    primary: '#1c78d2',
    primaryDisabled: '#b4b4b4',
    secondary: '#1e1e1e',
    secondaryDisabled: '#b4b4b4',
    text: '#ffffff',
    zingo: '#b4b4b4',
    placeholder: 'rgba(235, 235, 245, 0.3)',
    money: '#b4b4b4',
    syncing: '#ebff5a', // yellow
    notification: '',
    sideMenuBackground: '#0f0f0f',
    warning: {
      background: '#262527',
      border: '#65491C',
      primary: '#F99D00',
      primaryDark: '#DD7500',
      title: '#E1AA1B',
      text: '#FEE587',
    },
    danger: {
      primary: '#dc2626',
      background: '#240E0C',
      border: '#572317',
      text: '#FFB972',
    },
    modal: '#1e293b',
  },
};

const Stack = createStackNavigator<AppStackParamList>();

export const navigationRef = createNavigationContainerRef();

const App: React.FunctionComponent = () => {
  // avoid to close the App when the user tap on
  // the back button of the device.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }
      return true;
    });
    return () => sub.remove();
  }, []);

  //console.log('render App - 1');
  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={zingoTheme.colors.background} />
      <NavigationContainer ref={navigationRef} theme={zingoTheme}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: zingoTheme.colors.background,
          }}
        >
          <Stack.Navigator
            initialRouteName={RouteEnum.LoadingApp}
            screenOptions={{ headerShown: false, animation: 'none' }}
          >
            <Stack.Screen name={RouteEnum.LoadingApp}>
              {props => <LoadingApp {...props} />}
            </Stack.Screen>
            <Stack.Screen name={RouteEnum.LoadedApp}>
              {props => <LoadedApp {...props} />}
            </Stack.Screen>
          </Stack.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
