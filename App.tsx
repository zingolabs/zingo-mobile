/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
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
import { ModeEnum, RouteEnum } from './app/AppState';

import { BackHandler, LogBox, StatusBar } from 'react-native';
import AppErrorBoundary from './components/ErrorBoundary/AppErrorBoundary';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const advancedTheme: ThemeType = {
  ...DefaultTheme,
  dark: true,
  colors: {
    background: '#06172d',
    card: '#06172d',
    border: '#a4abad',
    primary: '#43a637',
    primaryDisabled: '#23692f',
    secondary: '#112C51',
    secondaryDisabled: '#183f24',
    secondaryBorder: '#293D55',
    tertiary: '#033679',
    text: '#dadfe1',
    muted: '#7c8494',
    placeholder: '#7c8494',
    active: '#ebff5a',
    notification: '',
    sideMenuBackground: '#040C17',
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

const basicTheme: ThemeType = {
  ...DefaultTheme,
  dark: true,
  colors: {
    background: '#07182e',
    card: '#07182e',
    border: '#84848a',
    primary: '#60849c',
    primaryDisabled: '#15576f',
    secondaryDisabled: '#123a53',
    text: '#dadfe1',
    muted: '#84848a',
    placeholder: '#84848a',
    active: '#ebff5a',
    notification: '',
    sideMenuBackground: '#040C17',
    warning: {
      background: '#262527',
      border: '#65491C',
      primary: '#F99D00',
      primaryDark: '#DD7500',
      title: '#E1AA1B',
      text: '#FEE587',
    },
    danger: {
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
  const [theme, setTheme] = useState<ThemeType>(advancedTheme);

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

  const toggleTheme = (mode: ModeEnum) => {
    setTheme(mode === ModeEnum.advanced ? advancedTheme : basicTheme);
  };

  //console.log('render App - 1');
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar backgroundColor={theme.colors.background} />
        <NavigationContainer ref={navigationRef} theme={theme}>
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: theme.colors.background,
            }}
          >
            <Stack.Navigator
              initialRouteName={RouteEnum.LoadingApp}
              screenOptions={{ headerShown: false, animation: 'none' }}
            >
              <Stack.Screen name={RouteEnum.LoadingApp}>
                {props => <LoadingApp {...props} toggleTheme={toggleTheme} />}
              </Stack.Screen>
              <Stack.Screen name={RouteEnum.LoadedApp}>
                {props => <LoadedApp {...props} toggleTheme={toggleTheme} />}
              </Stack.Screen>
            </Stack.Navigator>
          </SafeAreaView>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
};

export default App;
