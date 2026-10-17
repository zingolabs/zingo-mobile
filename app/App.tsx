/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo } from 'react';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoadedApp } from './LoadedApp';
import { LoadingApp } from './LoadingApp';
import Scanner from '@screens/Scanner';
import { RootParamList } from './types';
import { Route } from './AppState';
import { ThemeProvider, useTheme, navigationTheme } from './theme';

import { BackHandler, LogBox, StatusBar, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import AppErrorBoundary from './AppErrorBoundary';
import { SessionProvider, useSession } from './navigation/session';
import { navigationRef } from './navigation/navigate';
import BiometricBlankingOverlay from '@ui/widgets/BiometricBlankingOverlay';

LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

const Root = createNativeStackNavigator<RootParamList>();

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
            <SafeArea background={colors.bgCanvas}>
              <Root.Navigator
                screenOptions={{ headerShown: false, animation: 'none' }}
              >
                {/* The session picks the section; the one it leaves is
                  removed from the tree, so it unmounts. */}
                {session.kind === 'wallet' ? (
                  <Root.Screen name={Route.Wallet}>
                    {props => <LoadedApp {...props} wallet={session.params} />}
                  </Root.Screen>
                ) : (
                  <Root.Screen name={Route.Loading}>
                    {props => <LoadingApp {...props} session={session} />}
                  </Root.Screen>
                )}
                {/* The scanner lives at the root, above every section and
                  its bottom-sheet portal, so an open sheet never covers the
                  camera. A transparent modal keeps the screen beneath it
                  mounted and live. */}
                <Root.Screen
                  name={Route.Scanner}
                  component={Scanner}
                  // Draws its own circle out of the scan button.
                  options={{
                    presentation: 'transparentModal',
                    animation: 'none',
                  }}
                />
              </Root.Navigator>
            </SafeArea>
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
