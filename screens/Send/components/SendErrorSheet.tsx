/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { radiusSheet, useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { ButtonTypeEnum, TranslateType } from '@app/AppState';
import BoldText from '@ui/primitives/BoldText';
import FadeText from '@ui/primitives/FadeText';
import RegText from '@ui/primitives/RegText';
import Button from '@ui/primitives/Button';
import SheetRim from '@ui/primitives/SheetRim';

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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 48 }} />
            <BoldText
              numberOfLines={1}
              style={{ flex: 1, textAlign: 'center', color: colors.fgDefault }}
            >
              {title}
            </BoldText>
            <Pressable
              onPress={dismiss}
              accessibilityRole="button"
              hitSlop={8}
              style={{ padding: 14 }}
            >
              <FontAwesomeIcon
                icon={faXmark}
                size={20}
                color={colors.fgDefault}
              />
            </Pressable>
          </View>
        </View>
      ),
      [colors, dismiss, title],
    );

    const section = (label: string, message: string) =>
      message ? (
        <View style={{ rowGap: 6 }}>
          <FadeText style={{ fontSize: 12 }}>{label}</FadeText>
          <View
            style={[
              styles.infoRow,
              {
                backgroundColor: colors.bgCanvas,
                borderColor: colors.borderMuted,
              },
            ]}
          >
            <FontAwesomeIcon
              icon={faCircleInfo}
              size={16}
              color={colors.fgDanger}
            />
            <RegText
              style={{
                color: colors.fgDefault,
                flex: 1,
                marginLeft: 10,
                fontSize: 13,
              }}
            >
              {message}
            </RegText>
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
              type={ButtonTypeEnum.Primary}
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
