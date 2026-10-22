import React, { useContext, useRef } from 'react';
import { Keyboard, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetBackgroundProps,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { radiusSheet, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';

/** Every sheet opens and closes in 420 ms on (.2,0,0,1). */
const SHEET_MOTION = { duration: duration.sheet, easing: ease.emphasized };
import SheetRim from './SheetRim';
import { SheetPresence } from './SheetPresence';

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
  // Shows the grab pill at the top, drawn by the library.
  handle?: boolean;
};

// The sheet's fill with its rim on top, for sheets whose handle sits above the content.
const HandledBackground: React.FunctionComponent<
  BottomSheetBackgroundProps
> = ({ style }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        style,
        {
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        },
      ]}
    >
      <SheetRim />
    </View>
  );
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
      // Defaults off for the same reason AppSheet does: an accessible
      // container collapses its contents out of the iOS accessibility
      // tree. The call sites passing false explicitly predate this.
      accessible = false,
      renderFooter,
      handle,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const fixed = snapPoints !== undefined;
    const presence = useContext(SheetPresence);
    const wasOpen = useRef(false);
    /** Reports opening and closing once each, not every snap in between. */
    const changed = (index: number) => {
      const open = index >= 0;
      if (open !== wasOpen.current) {
        wasOpen.current = open;
        presence(open);
      }
      onChange?.(index);
    };

    const body = (
      <>
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
        {!handle && <SheetRim />}
      </>
    );

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
        animationConfigs={SHEET_MOTION}
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
        onChange={changed}
        onDismiss={onDismiss}
        handleComponent={handle ? undefined : null}
        handleStyle={styles.handle}
        handleIndicatorStyle={[
          styles.indicator,
          { backgroundColor: colors.sheetHandle },
        ]}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
        backgroundComponent={handle ? HandledBackground : undefined}
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
      >
        {fixed ? (
          /** A fixed sheet holds a list: BottomSheetView measures static content and stops a scroll view inside it. */
          <View style={styles.fill}>{body}</View>
        ) : (
          <BottomSheetView>{body}</BottomSheetView>
        )}
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
  handle: { paddingTop: 10, paddingBottom: 6 },
  indicator: { width: 36, height: 4, borderRadius: 2 },
});

export default AppSheetModal;
