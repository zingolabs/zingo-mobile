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

LogBox.ignoreLogs(['Require cycle: app\\uris\\serverUris.mock.ts -> app\\uris\\serverUris.mock.ts']);
LogBox.ignoreLogs(['[Reanimated] Reduced motion setting is enabled on this device.']);

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
