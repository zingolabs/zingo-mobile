/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoadedApp } from './LoadedApp';
import { LoadingApp } from './LoadingApp';
import ScannerAddress from '@screens/ScannerAddress';
import ScannerUfvk from '@screens/ScannerUfvk';
import { AppStackParamList } from './types';
import { RouteEnum } from './AppState';
import { ThemeProvider, useTheme, navigationTheme } from './theme';

import { BackHandler, LogBox, StatusBar } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import AppErrorBoundary from './AppErrorBoundary';
import { SessionProvider, useSession } from './navigation/session';
import BiometricBlankingOverlay from '@ui/widgets/BiometricBlankingOverlay';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const Stack = createNativeStackNavigator<AppStackParamList>();

export const navigationRef = createNavigationContainerRef();

const SCANNER_OPTIONS = {
  presentation: 'transparentModal',
  animation: 'slide_from_bottom',
} as const;

// The provider has to sit above every consumer, so App cannot read the theme it
// renders. The shell is what consumes it.
const AppShell: React.FunctionComponent = () => {
  const { colors } = useTheme();
  const theme = useMemo(() => navigationTheme(colors), [colors]);
  const { session } = useSession();

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
                screenOptions={{ headerShown: false, animation: 'none' }}
              >
                {/* The session picks the section; the one it leaves is
                  removed from the tree, so it unmounts. */}
                {session.kind === 'wallet' ? (
                  <Stack.Screen
                    name={RouteEnum.LoadedApp}
                    initialParams={session.params}
                  >
                    {props => <LoadedApp {...props} />}
                  </Stack.Screen>
                ) : (
                  <Stack.Screen
                    name={RouteEnum.LoadingApp}
                    initialParams={session.params}
                  >
                    {props => <LoadingApp {...props} />}
                  </Stack.Screen>
                )}
                {/* The scanners live at the root, above every section and
                  its bottom-sheet portal, so an open sheet never covers the
                  camera. A transparent modal keeps the screen beneath it
                  mounted and live. */}
                <Stack.Screen
                  name={RouteEnum.ScannerAddress}
                  component={ScannerAddress}
                  options={SCANNER_OPTIONS}
                />
                <Stack.Screen
                  name={RouteEnum.ScannerUfvk}
                  component={ScannerUfvk}
                  options={SCANNER_OPTIONS}
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
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  </ThemeProvider>
);

export default App;
