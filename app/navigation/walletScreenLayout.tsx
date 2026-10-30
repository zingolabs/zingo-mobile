/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import {
  isIosModal,
  ModalSafeArea,
  ScreenLayoutProps,
  skipExitingWithScreen,
} from './screenLayout';
import ConfirmBottomSheet from '@ui/widgets/ConfirmBottomSheet';
import { toastConfig } from '@ui/widgets/toastConfig';
import AddTagModalHost from '@app/LoadedApp/components/AddTagModalHost';

/**
 * An iOS transparent modal sits above everything LoadedApp's root holds, so
 * it brings its own: the safe area for the screen, a home for its sheets,
 * and the confirmation, add-tag and snackbar hosts, which answer while it is
 * on top. The sheets' home spans the whole window, as gorhom places a sheet
 * against the window: inside the padding it sat that much too low.
 */
const IosModal = ({ children }: { children: React.ReactNode }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
      <ModalSafeArea>
        <View style={{ flex: 1 }}>{children}</View>
        <Toast config={toastConfig} />
      </ModalSafeArea>
      <ConfirmBottomSheet />
      <AddTagModalHost />
    </BottomSheetModalProvider>
  </GestureHandlerRootView>
);

/** skipExitingWithScreen, and on iOS what a transparent modal needs. */
export const walletScreenLayout = ({ children, options }: ScreenLayoutProps) =>
  isIosModal(options) ? (
    <IosModal>{skipExitingWithScreen({ children })}</IosModal>
  ) : (
    skipExitingWithScreen({ children })
  );
