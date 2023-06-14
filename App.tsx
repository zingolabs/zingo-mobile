/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoadedApp from './app/LoadedApp';
import LoadingApp from './app/LoadingApp';
import { ThemeType } from './app/types';

const Theme: ThemeType = {
  dark: true,
  colors: {
    background: '#011401', //'#010101',
    card: '#011401', //'#401717',
    border: '#ffffff',
    primary: '#18bd18', //'#df4100',
    primaryDisabled: '#5a8c5a', //'rgba(90, 140, 90, 1)',
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

export default function App() {
  //console.log('render App - 1');
  return (
    <NavigationContainer theme={Theme}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: Theme.colors.card,
        }}>
        <Stack.Navigator initialRouteName="LoadingApp" screenOptions={{ headerShown: false, animationEnabled: false }}>
          <Stack.Screen name="LoadingApp" component={LoadingApp} />
          <Stack.Screen name="LoadedApp" component={LoadedApp} />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}
