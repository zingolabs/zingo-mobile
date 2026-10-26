import React from 'react';
import { LayoutAnimationConfig } from 'react-native-reanimated';

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
