/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { LoadedApp } from './app/LoadedApp';
import { LoadingApp } from './app/LoadingApp';
import { ThemeType } from './app/types';
import { ModeEnum, RouteEnums } from './app/AppState';

import { LogBox } from 'react-native';

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
  dark: true,
  colors: {
    background: advancePalette[0],
    card: advancePalette[0],
    border: advancePalette[8],
    primary: advancePalette[2],
    primaryDisabled: advancePalette[3],
    secondaryDisabled: advancePalette[5],
    text: advancePalette[1],
    zingo: advancePalette[8],
    placeholder: advancePalette[8],
    money: advancePalette[1],
    syncing: '#ebff5a', // yellow
    notification: '',
    sideMenuBackground: advancePalette[10],
  },
};

const basicTheme: ThemeType = {
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
    <NavigationContainer theme={theme}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: theme.colors.card,
        }}>
        <Stack.Navigator
          initialRouteName={RouteEnums.LoadingApp}
          screenOptions={{ headerShown: false, animationEnabled: false }}>
          <Stack.Screen name={RouteEnums.LoadingApp}>
            {props => <LoadingApp {...props} toggleTheme={toggleTheme} />}
          </Stack.Screen>
          <Stack.Screen name={RouteEnums.LoadedApp}>
            {props => <LoadedApp {...props} toggleTheme={toggleTheme} />}
          </Stack.Screen>
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

export default App;
