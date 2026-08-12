/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { LoadedApp } from './LoadedApp';
import { LoadingApp } from './LoadingApp';
import ScannerAddress from '../screens/Send/components/ScannerAddress';
import ScannerUfvk from './LoadingApp/components/ScannerUfvk';
import { AppStackParamList } from './types';
import { RouteEnum } from './AppState';
import { ThemeProvider, useTheme, navigationTheme } from './theme';

import { BackHandler, LogBox, StatusBar } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import AppErrorBoundary from './AppErrorBoundary';
import BiometricBlankingOverlay from './BiometricBlankingOverlay';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const Stack = createStackNavigator<AppStackParamList>();

export const navigationRef = createNavigationContainerRef();

// The provider has to sit above every consumer, so App cannot read the theme it
// renders. The shell is what consumes it.
const AppShell: React.FunctionComponent = () => {
  const { colors, toggleTheme } = useTheme();
  const theme = useMemo(() => navigationTheme(colors), [colors]);

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
    <AppErrorBoundary>
      <KeyboardProvider>
        <SafeAreaProvider>
          <StatusBar backgroundColor={colors.bgCanvas} />
          <BiometricBlankingOverlay />
          <NavigationContainer ref={navigationRef} theme={theme}>
            <SafeAreaView
              edges={['top', 'left', 'right']}
              style={{
                flex: 1,
                backgroundColor: colors.bgCanvas,
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
                <Stack.Screen
                  name={RouteEnum.ScannerUfvk}
                  component={ScannerUfvk}
                  options={{ presentation: 'transparentModal' }}
                />
              </Stack.Navigator>
            </SafeAreaView>
          </NavigationContainer>
        </SafeAreaProvider>
      </KeyboardProvider>
    </AppErrorBoundary>
  );
};

const App: React.FunctionComponent = () => (
  <ThemeProvider>
    <AppShell />
  </ThemeProvider>
);

export default App;
