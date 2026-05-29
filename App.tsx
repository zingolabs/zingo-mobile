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
import ScannerAddress from './components/Send/components/ScannerAddress';
import { ThemeType, AppStackParamList } from './app/types';
import { ModeEnum, RouteEnum } from './app/AppState';

import { BackHandler, LogBox, StatusBar } from 'react-native';
import AppErrorBoundary from './components/ErrorBoundary/AppErrorBoundary';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const advancePalette: string[] = [
  '#010A17',
  '#dadfe1',
  '#43a637',
  '#23692f',
  '#656e77',
  '#183f24',
  '#444b56',
  '#37444e',
  '#7c8494',
  '#041d09',
  '#040C17',
];

const basicPalette: string[] = [
  '#010A17',
  '#dadfe1',
  '#15576f',
  '#4fa254',
  '#14343f',
  '#123a53',
  '#1e6531',
  '#84848a',
  '#444b54',
  '#60849c',
  '#040C17',
];

export const advancedTheme: ThemeType = {
  ...DefaultTheme,
  dark: true,
  colors: {
    background: advancePalette[0],
    card: advancePalette[0],
    border: advancePalette[8],
    primary: advancePalette[2],
    primaryDisabled: advancePalette[3],
    secondary: '#112C51',
    secondaryDisabled: advancePalette[5],
    secondaryBorder: '#293D55',
    tertiary: '#033679',
    text: advancePalette[1],
    zingo: advancePalette[8],
    placeholder: advancePalette[8],
    money: advancePalette[1],
    syncing: '#ebff5a', // yellow
    notification: '',
    sideMenuBackground: advancePalette[10],
    bottomSheetBackground: '#031124',
    bottomSheetBorder: '#05234C',
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

export const basicTheme: ThemeType = {
  ...DefaultTheme,
  dark: true,
  colors: {
    background: basicPalette[0],
    card: basicPalette[0],
    border: basicPalette[7],
    primary: basicPalette[9],
    primaryDisabled: basicPalette[2],
    secondaryDisabled: basicPalette[5],
    text: basicPalette[1],
    zingo: basicPalette[7],
    placeholder: basicPalette[7],
    money: basicPalette[1],
    syncing: '#ebff5a', // yellow
    notification: '',
    sideMenuBackground: basicPalette[10],
    bottomSheetBackground: '#031124',
    bottomSheetBorder: '#05234C',
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
            edges={['top', 'left', 'right']}
            style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              // The system safe-area top inset includes a visual buffer
              // beyond the status bar / notch. We reclaim 10px of that
              // buffer so the Header (and everything below) sits closer
              // to the system chrome without overlapping it. Verified
              // safe on both iOS and Android.
              marginTop: -10,
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
              {/* ScannerAddress lives at the root Stack (above LoadedApp,
                  therefore above the BottomSheetModalProvider portal). Without
                  this, any open BottomSheetModal renders ON TOP of the camera,
                  hiding the preview.
                  presentation: 'transparentModal' avoids the iOS UIKit modal
                  freeze on the underlying view — with 'modal' or default
                  'card' the BottomSheetModal backdrop below stays
                  unresponsive for several seconds after the camera is
                  dismissed because iOS pauses the underlying scene during
                  the native modal presentation. */}
              <Stack.Screen
                name={RouteEnum.ScannerAddress}
                component={ScannerAddress}
                options={{ presentation: 'transparentModal' }}
              />
            </Stack.Navigator>
          </SafeAreaView>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
};

export default App;
