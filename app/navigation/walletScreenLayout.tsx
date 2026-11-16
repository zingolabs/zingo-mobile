/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  isIosModal,
  ScreenLayoutProps,
  ScreenSafeArea,
  skipExitingWithScreen,
} from './screenLayout';
import ConfirmBottomSheet from '@ui/widgets/ConfirmBottomSheet';
import AddTagModalHost from '@app/LoadedApp/components/AddTagModalHost';

/**
 * An iOS transparent modal sits above everything LoadedApp's root holds, so
 * it brings its own: a home for its sheets and the confirmation and add-tag
 * hosts, which answer while it is on top. Snackbars keep the one root host,
 * which draws above every modal.
 */
const IosModal = ({ children }: { children: React.ReactNode }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <ScreenSafeArea>
        <View style={{ flex: 1 }}>{children}</View>
      </ScreenSafeArea>
      <ConfirmBottomSheet />
      <AddTagModalHost />
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

/** The safe area and skipExitingWithScreen, and on iOS what a transparent modal needs. */
export const walletScreenLayout = ({ children, options }: ScreenLayoutProps) =>
  isIosModal(options) ? (
    <IosModal>{skipExitingWithScreen({ children })}</IosModal>
  ) : (
    <ScreenSafeArea>{skipExitingWithScreen({ children })}</ScreenSafeArea>
  );
