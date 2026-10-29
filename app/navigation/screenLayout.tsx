/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Platform, View } from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { contentTopPad } from './safeArea';

/**
 * Wraps every screen of a navigator: when a screen leaves whole, its views
 * skip their exiting animations; a view leaving a screen that stays still
 * animates. Exits running in a screen react-native-screens is removing
 * crash Fabric on Android ("Cannot remove child at index 0 … FragmentManager
 * is already executing transactions").
 */
export const skipExitingWithScreen = ({
  children,
}: {
  children: React.ReactNode;
}) => <LayoutAnimationConfig skipExiting>{children}</LayoutAnimationConfig>;

/** The app's safe-area padding, as App's root gives every other screen. */
const ModalSafeArea = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        paddingTop: contentTopPad(insets.top),
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
};

/**
 * skipExitingWithScreen, and on iOS the app's safe-area padding for a
 * transparent modal: iOS presents it over the whole window, outside the
 * padding App's root gives the rest; Android keeps it inside.
 */
export const walletScreenLayout = ({
  children,
  options,
}: {
  children: React.ReactNode;
  options: { presentation?: string };
}) =>
  Platform.OS === 'ios' && options.presentation === 'transparentModal' ? (
    <ModalSafeArea>{skipExitingWithScreen({ children })}</ModalSafeArea>
  ) : (
    skipExitingWithScreen({ children })
  );
