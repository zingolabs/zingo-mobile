/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo } from 'react';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { LoadedApp } from './LoadedApp';
import { LoadingApp } from './LoadingApp';
import ScannerAddress from '@screens/ScannerAddress';
import { AppStackParamList } from './types';
import { RouteEnum } from './AppState';
import { ThemeProvider, useTheme, navigationTheme } from './theme';

import { BackHandler, LogBox, StatusBar, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import AppErrorBoundary from './AppErrorBoundary';
import BiometricBlankingOverlay from '@ui/widgets/BiometricBlankingOverlay';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const Stack = createStackNavigator<AppStackParamList>();

export const navigationRef = createNavigationContainerRef();

/** Space kept under the system's top inset, which already leaves a little room. */
const TOP_RECLAIM = 10;

/**
 * Pads the app inside the system's safe area. The top keeps the inset minus
 * TOP_RECLAIM and never less than zero: a device that lays the app out below
 * the status bar reports no inset, and a negative offset there would pull the
 * top of every screen under the bar.
 */
const SafeArea: React.FunctionComponent<{
  background: string;
  children: React.ReactNode;
}> = ({ background, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: background,
        paddingTop: Math.max(0, insets.top - TOP_RECLAIM),
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
};

// The provider has to sit above every consumer, so App cannot read the theme it
// renders. The shell is what consumes it.
const AppShell: React.FunctionComponent = () => {
  const { colors } = useTheme();
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
            <SafeArea background={colors.bgCanvas}>
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
                  // Draws its own circle out of the scan button.
                  options={{
                    presentation: 'transparentModal',
                    animation: 'none',
                  }}
                />
              </Stack.Navigator>
            </SafeArea>
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
