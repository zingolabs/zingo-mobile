/* eslint-disable react-native/no-inline-styles */
/**
 * @format
 */
import React from 'react';
import { SafeAreaView } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoadedApp from './app/LoadedApp';
import LoadingApp from './app/LoadingApp';
import { ThemeType } from '.app/types';

const Theme: ThemeType = {
  colors: {
    background: '#011401', //'#010101',
    card: '#011401', //'#401717',
    border: '#ffffff',
    primary: '#18bd18', //'#df4100',
    primaryDisabled: 'rgba(24, 189, 24, 0.3)',
    text: '#c3c3c3',
    zingo: '#777777',
    placeholder: '#333333',
    money: '#ffffff',
  },
};

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer theme={Theme}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: Theme.colors.card,
        }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="LoadingApp" component={LoadingApp} />
          <Stack.Screen name="LoadedApp" component={LoadedApp} />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}
