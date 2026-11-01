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

export type ScreenLayoutProps = {
  children: React.ReactNode;
  options: { presentation?: string };
};

/** iOS presents a transparent modal over the whole window, outside LoadedApp's root. */
export const isIosModal = (options: { presentation?: string }) =>
  Platform.OS === 'ios' && options.presentation === 'transparentModal';

/**
 * Pads a screen inside the system's safe area. The pad goes on each screen
 * and the sheets' providers span the whole window, as gorhom places a sheet
 * against the window: inside the pad it sat that much too low.
 */
export const ScreenSafeArea = ({ children }: { children: React.ReactNode }) => {
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
