/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import TitleBar from '@ui/widgets/TitleBar';
import Text from '@ui/primitives/Text';
import { Keyboard, StyleSheet, View } from 'react-native';
import { radiusSheet, useTheme, iconSizeSm, space12 } from '@app/theme';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { TranslateType } from '@app/AppState';
import Button from '@ui/primitives/Button';
import SheetRim from '@ui/primitives/SheetRim';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';

/**
 * Informational sheet that surfaces the raw error(s) returned by the fee
 * (`sendPropose`) and/or spendable-balance RPC. Both are shown when present —
 * they are frequently the same underlying failure, but showing each under its
 * own label makes that explicit rather than hiding one. Title bar with a
 * close X, the error text, and a one-tap "Support" affordance (opens a
 * pre-filled email).
 */

type SendErrorSheetProps = {
  /** Sheet title. */
  title: string;
  /** Raw fee (`sendPropose`) RPC error, or '' when none. */
  feeError: string;
  /** Raw spendable-balance RPC error, or '' when none. */
  spendableError: string;
  /** Human labels for each section ("Fee" / "Spendable"). */
  feeLabel: string;
  spendableLabel: string;
  /** Compose the support email with the error(s) attached. */
  onSupport: () => void;
  translate: (key: string) => TranslateType;
};

const SendErrorSheet = forwardRef<BottomSheetModal, SendErrorSheetProps>(
  (
    {
      title,
      feeError,
      spendableError,
      feeLabel,
      spendableLabel,
      onSupport,
      translate,
    },
    ref,
  ) => {
    const { colors } = useTheme();

    const t = useCallback(
      (key: string, fallback: string): string =>
        (translate(key) as string) || fallback,
      [translate],
    );

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const onSupportPress = useCallback(() => {
      onSupport();
      dismiss();
    }, [onSupport, dismiss]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    const renderHandle = useCallback(
      () => (
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 6,
            paddingHorizontal: 16,
            backgroundColor: colors.bgSurface,
            borderTopLeftRadius: radiusSheet,
            borderTopRightRadius: radiusSheet,
          }}
        >
          <SheetRim />
          <TitleBar
            title={title}
            right={{
              icon: XIcon,
              accessibilityLabel: title,
              onPress: dismiss,
            }}
          />
        </View>
      ),
      [colors, dismiss, title],
    );

    const section = (label: string, message: string) =>
      message ? (
        <View style={{ rowGap: 6 }}>
          <Text variant="caption" tone="muted">
            {label}
          </Text>
          <View
            style={[
              styles.infoRow,
              {
                backgroundColor: colors.bgCanvas,
                borderColor: colors.borderMuted,
              },
            ]}
          >
            <InfoIcon size={iconSizeSm} color={colors.fgDanger} />
            <Text variant="bodySmall" style={{ flex: 1, marginLeft: space12 }}>
              {message}
            </Text>
          </View>
        </View>
      ) : null;

    return (
      <BottomSheetModal
        ref={ref}
        accessible={false}
        enableDynamicSizing={true}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting a keyboard the sheet itself focuses later.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        handleComponent={renderHandle}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetScrollView
          style={{ backgroundColor: colors.bgSurface }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 24,
            paddingTop: 8,
            rowGap: 16,
          }}
        >
          {section(spendableLabel, spendableError)}
          {section(feeLabel, feeError)}

          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <Button
              variant="primary"
              title={t('support', 'Support')}
              onPress={onSupportPress}
              testID="send.error.support"
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});

export default React.memo(SendErrorSheet);
