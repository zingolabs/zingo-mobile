/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { ThemeType } from '../../../app/types';
import { TranslateType } from '../../../app/AppState';
import BoldText from '../../Components/BoldText';
import RegText from '../../Components/RegText';

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
            color={colors.primary}
          />
          <RegText
            style={{
              color: colors.text,
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
            }}
          >
            {t(
              'swap.insufficient-for-commit',
              'Not enough ZEC to cover amount + network fee.',
            )}
          </RegText>
        </View>

        {maxSpendable > 0 && (
          <Pressable
            onPress={onReducePress}
            accessibilityRole="button"
            testID="swap.insufficient.reduce"
            style={({ pressed }) => [
              styles.reduceBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <BoldText style={{ color: colors.background, textAlign: 'center' }}>
              {`${t('swap.reduce-to', 'Reduce to')} ${maxSpendable.toFixed(
                8,
              )} ZEC`}
            </BoldText>
          </Pressable>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reduceBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(InsufficientFundsSheet);
