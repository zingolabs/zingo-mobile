/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faWallet, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { ThemeType } from '../../../app/types';
import { ButtonTypeEnum, TranslateType } from '../../../app/AppState';
import BoldText from '../../Components/BoldText';
import RegText from '../../Components/RegText';
import Button from '../../Components/Button';

/**
 * Informational sheet shown when the requested swap amount + network fee
 * exceeds the spendable balance. Modelled on `SlippageSheet` (title bar with a
 * close X, dynamic-sized bottom sheet).
 *
 * The insufficient-funds explanation used to render as loose text under the
 * CTA; it now lives here so the CTA can stay compact ("Fondos insuficientes ⓘ")
 * and the long copy — plus the "reduce to max" recovery action — is one tap
 * away.
 */

type InsufficientFundsSheetProps = {
  /** Max ZEC that can be swapped (spendable − fees). 0 when nothing fits. */
  maxSpendable: number;
  /** Apply the max-spendable amount to the source field. */
  onReduceToMax: () => void;
  translate: (key: string) => TranslateType;
};

const InsufficientFundsSheet = forwardRef<
  BottomSheetModal,
  InsufficientFundsSheetProps
>(({ maxSpendable, onReduceToMax, translate }, ref) => {
  const { colors } = useTheme() as ThemeType;

  const t = useCallback(
    (key: string, fallback: string): string =>
      (translate(key) as string) || fallback,
    [translate],
  );

  const dismiss = useCallback(() => {
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  }, [ref]);

  const onReducePress = useCallback(() => {
    onReduceToMax();
    dismiss();
  }, [onReduceToMax, dismiss]);

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
            {t('swap.insufficient-title', 'Insufficient funds')}
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
    [colors, dismiss, t],
  );

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
      <BottomSheetView
        style={{
          backgroundColor: colors.bottomSheetBackground,
          paddingHorizontal: 20,
          paddingBottom: 24,
          paddingTop: 8,
          rowGap: 16,
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: 4 }}>
          <FontAwesomeIcon
            icon={faWallet}
            size={44}
            color={colors.warning.primary}
          />
        </View>
        <RegText
          style={{
            color: colors.text,
            textAlign: 'center',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {t(
            'swap.insufficient-desc',
            "Your available ZEC doesn't cover this amount plus the network fee. Lower the amount to swap, or add more ZEC to your wallet, and try again.",
          )}
        </RegText>

        {maxSpendable > 0 && (
          <View style={{ alignItems: 'center', marginHorizontal: -20 }}>
            <Button
              type={ButtonTypeEnum.Primary}
              title={`${t('swap.reduce-to', 'Reduce to')} ${maxSpendable.toFixed(
                8,
              )} ZEC`}
              onPress={onReducePress}
              testID="swap.insufficient.reduce"
            />
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default React.memo(InsufficientFundsSheet);
