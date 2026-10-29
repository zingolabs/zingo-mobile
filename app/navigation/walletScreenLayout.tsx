/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { contentTopPad } from './safeArea';
import { skipExitingWithScreen } from './screenLayout';
import ConfirmBottomSheet from '@ui/widgets/ConfirmBottomSheet';
import { toastConfig } from '@ui/widgets/toastConfig';
import AddTagModalHost from '@app/LoadedApp/components/AddTagModalHost';

/**
 * iOS presents a transparent modal over the whole window, outside what
 * LoadedApp's root holds, so the modal brings its own: the app's safe-area
 * padding, a home for its sheets, and the confirmation, add-tag and
 * snackbar hosts, which answer while it is on top.
 */
const IosModal = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        paddingTop: contentTopPad(insets.top),
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <BottomSheetModalProvider>
        <View style={{ flex: 1 }}>{children}</View>
        <ConfirmBottomSheet />
        <AddTagModalHost />
      </BottomSheetModalProvider>
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
};

/** skipExitingWithScreen, and on iOS what a transparent modal needs. */
export const walletScreenLayout = ({
  children,
  options,
}: {
  children: React.ReactNode;
  options: { presentation?: string };
}) =>
  Platform.OS === 'ios' && options.presentation === 'transparentModal' ? (
    <IosModal>{skipExitingWithScreen({ children })}</IosModal>
  ) : (
    skipExitingWithScreen({ children })
  );
