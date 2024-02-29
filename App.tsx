/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { LoadedApp } from './app/LoadedApp';
import { LoadingApp } from './app/LoadingApp';
import { ThemeType } from './app/types';
import SettingsFileImpl from './components/Settings/SettingsFileImpl';

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
    primary: '#7cffff', // new
    primaryDisabled: '#adcbcb', // new
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
      const settings = await SettingsFileImpl.readSettings();
      if (!!settings && !!settings.mode && settings.mode === 'advanced') {
        setTheme(advancedTheme);
      } else {
        setTheme(basicTheme);
      }
    })();
  }, []);

  const toggleMode = (newMode: 'basic' | 'advanced') => {
    setTheme(newMode === 'advanced' ? advancedTheme : basicTheme);
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
          <Stack.Screen name="LoadingApp">{props => <LoadingApp {...props} toggleMode={toggleMode} />}</Stack.Screen>
          <Stack.Screen name="LoadedApp">{props => <LoadedApp {...props} toggleMode={toggleMode} />}</Stack.Screen>
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

export default App;
