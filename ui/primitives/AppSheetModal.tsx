import React from 'react';
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
};

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
      accessible,
      renderFooter,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const fixed = snapPoints !== undefined;

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
        ref={ref}
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
