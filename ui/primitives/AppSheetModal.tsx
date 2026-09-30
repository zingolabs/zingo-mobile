import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Keyboard, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { radiusSheet, useTheme } from '@app/theme';
import SheetRim from './SheetRim';

type AppSheetModalProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
  onChange?: (index: number) => void;
  enablePanDownToClose?: boolean;
  dismissable?: boolean;
  accessible?: boolean;
  renderFooter?: (props: BottomSheetFooterProps) => React.ReactElement;
  // A sheet mounted once per launch presents itself when it mounts, so no
  // caller holds its ref.
  presentOnMount?: boolean;
};

// The dismiss of the enclosing AppSheetModal instance. Outside a sheet it is
// a no-op.
const SheetDismissContext = createContext<() => void>(() => {});

export const useSheetDismiss = (): (() => void) =>
  useContext(SheetDismissContext);

const AppSheetModal = React.forwardRef<BottomSheetModal, AppSheetModalProps>(
  (
    {
      header,
      children,
      contentStyle,
      snapPoints,
      onDismiss,
      onChange,
      enablePanDownToClose = true,
      dismissable = true,
      // Defaults off for the same reason AppSheet does: an accessible
      // container collapses its contents out of the iOS accessibility
      // tree. The call sites passing false explicitly predate this.
      accessible = false,
      renderFooter,
      presentOnMount = false,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const fixed = snapPoints !== undefined;
    const sheet = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => sheet.current as BottomSheetModal);

    useEffect(() => {
      if (presentOnMount) {
        sheet.current?.present();
      }
    }, [presentOnMount]);

    const dismiss = useCallback(() => {
      sheet.current?.dismiss();
    }, []);

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissable ? 'close' : 'none'}
      />
    );

    return (
      <BottomSheetModal
        ref={sheet}
        accessible={accessible}
        enableDynamicSizing={!fixed}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        stackBehavior="push"
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onAnimate={(from, to) => {
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        onChange={onChange}
        onDismiss={onDismiss}
        handleComponent={null}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
      >
        <SheetDismissContext.Provider value={dismiss}>
          <BottomSheetView style={fixed ? styles.fill : undefined}>
            <View
              style={[
                fixed ? styles.maskFill : styles.mask,
                { backgroundColor: colors.bgSurface },
                contentStyle,
              ]}
            >
              {header}
              {children}
            </View>
            <SheetRim />
          </BottomSheetView>
        </SheetDismissContext.Provider>
      </BottomSheetModal>
    );
  },
);

AppSheetModal.displayName = 'AppSheetModal';

const roundedClip = {
  borderTopLeftRadius: radiusSheet,
  borderTopRightRadius: radiusSheet,
  overflow: 'hidden',
} as const;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  mask: roundedClip,
  maskFill: { flex: 1, ...roundedClip },
});

export default AppSheetModal;
