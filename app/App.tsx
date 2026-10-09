/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoadedApp } from './LoadedApp';
import { LoadingApp } from './LoadingApp';
import ScannerAddress from '@screens/ScannerAddress';
import ScannerUfvk from '@screens/ScannerUfvk';
import { RootParamList } from './types';
import { RouteEnum } from './AppState';
import { ThemeProvider, useTheme, navigationTheme } from './theme';

import { BackHandler, LogBox, StatusBar } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import AppErrorBoundary from './AppErrorBoundary';
import { SessionProvider, useSession } from './navigation/session';
import { navigationRef } from './navigation/navigate';
import BiometricBlankingOverlay from '@ui/widgets/BiometricBlankingOverlay';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const Root = createNativeStackNavigator<RootParamList>();

// The provider has to sit above every consumer, so App cannot read the theme it
// renders. The shell is what consumes it.
const AppShell: React.FunctionComponent = () => {
  const { colors } = useTheme();
  const theme = useMemo(() => navigationTheme(colors), [colors]);
  const { session } = useSession();

  // Hardware back never closes the app; the user swipes it away like any
  // other.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
      }
      return true;
    });
    return () => sub.remove();
  }, []);

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
              <Root.Navigator
                screenOptions={{ headerShown: false, animation: 'none' }}
              >
                {/* The session picks the section; the one it leaves is
                  removed from the tree, so it unmounts. */}
                {session.kind === 'wallet' ? (
                  <Root.Screen name={RouteEnum.Wallet}>
                    {props => <LoadedApp {...props} wallet={session.params} />}
                  </Root.Screen>
                ) : (
                  <Root.Screen name={RouteEnum.Loading}>
                    {props => <LoadingApp {...props} session={session} />}
                  </Root.Screen>
                )}
                {/* The scanners live at the root, above every section and
                  its bottom-sheet portal, so an open sheet never covers the
                  camera. A transparent modal keeps the screen beneath it
                  mounted and live. */}
                <Root.Group
                  screenOptions={{
                    presentation: 'transparentModal',
                    animation: 'slide_from_bottom',
                  }}
                >
                  <Root.Screen
                    name={RouteEnum.ScannerAddress}
                    component={ScannerAddress}
                  />
                  <Root.Screen
                    name={RouteEnum.ScannerUfvk}
                    component={ScannerUfvk}
                  />
                </Root.Group>
              </Root.Navigator>
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
