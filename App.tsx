/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { LoadedApp } from './app/LoadedApp';
import { LoadingApp } from './app/LoadingApp';
import { ThemeType } from './app/types';
import { ModeEnum, RouteEnums } from './app/AppState';

import { LogBox, StatusBar } from 'react-native';
import { ToastProvider } from 'react-native-toastier';

LogBox.ignoreLogs(['[Reanimated] Reduced motion setting is enabled on this device.']);

const advancePalette: string[] = [
  '#06172d',
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
  '#07182e',
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

const advancedTheme: ThemeType = {
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

const Stack = createStackNavigator();

const App: React.FunctionComponent = () => {
  const [theme, setTheme] = useState<ThemeType>(advancedTheme);

  const toggleTheme = (mode: ModeEnum) => {
    setTheme(mode === ModeEnum.advanced ? advancedTheme : basicTheme);
  };

  //console.log('render App - 1');
  return (
    <ToastProvider>
      <SafeAreaProvider>
        <StatusBar backgroundColor={theme.colors.background} />
        <NavigationContainer theme={theme}>
          <SafeAreaView
            style={{
              flex: 1,
              backgroundColor: theme.colors.background,
            }}>
            <Stack.Navigator
              initialRouteName={RouteEnums.LoadingApp}
              screenOptions={{ headerShown: false, animation: 'none' }}>
              <Stack.Screen name={RouteEnums.LoadingApp} options={{ animation: 'none' }}>
                {props => <LoadingApp {...props} toggleTheme={toggleTheme} />}
              </Stack.Screen>
              <Stack.Screen name={RouteEnums.LoadedApp} options={{ animation: 'none' }}>
                {props => <LoadedApp {...props} toggleTheme={toggleTheme} />}
              </Stack.Screen>
            </Stack.Navigator>
          </SafeAreaView>
        </NavigationContainer>
      </SafeAreaProvider>
    </ToastProvider>
  );
};

export default App;
