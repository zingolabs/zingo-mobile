/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { ThemeType } from '../../../app/types';
import { ButtonTypeEnum, TranslateType } from '../../../app/AppState';
import BoldText from '../../Components/BoldText';
import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import Button from '../../Components/Button';

/**
 * Informational sheet that surfaces the raw error(s) returned by the fee
 * (`sendPropose`) and/or spendable-balance RPC. Both are shown when present —
 * they are frequently the same underlying failure, but showing each under its
 * own label makes that explicit rather than hiding one. Modelled on the swap
 * `InsufficientFundsSheet`: title bar with a close X, the error text, and a
 * one-tap "Support" affordance (opens a pre-filled email).
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
    const { colors } = useTheme() as ThemeType;

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
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            borderTopWidth: 1,
            borderLeftWidth: 0.5,
            borderRightWidth: 0.5,
            borderTopColor: colors.bottomSheetBorder,
            borderLeftColor: colors.bottomSheetBorder,
            borderRightColor: colors.bottomSheetBorder,
          }}
        >
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
              style={{ flex: 1, textAlign: 'center', color: colors.text }}
            >
              {title}
            </BoldText>
            <Pressable
              onPress={dismiss}
              accessibilityRole="button"
              hitSlop={8}
              style={{ padding: 14 }}
            >
              <FontAwesomeIcon icon={faXmark} size={20} color={colors.text} />
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
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <FontAwesomeIcon
              icon={faCircleInfo}
              size={16}
              color={colors.danger.text}
            />
            <RegText
              style={{
                color: colors.text,
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
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetScrollView
          style={{ backgroundColor: colors.bottomSheetBackground }}
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
