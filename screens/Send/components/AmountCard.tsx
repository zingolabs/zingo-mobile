/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import {
  chipMinHeight,
  fontScaleDisplay,
  iconSizeSm,
  radiusMd,
  radiusPill,
  space4,
  space8,
  space12,
  space16,
  textVariants,
  useTheme,
} from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import Text from '@ui/primitives/Text';
import { useInsetFill } from '@ui/primitives/Surface';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';

type AmountCardProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** ZEC or USD: what the number is typed in. */
  unit: string;
  /** Switches the unit; absent when there is no price to convert with. */
  onToggleUnit?: () => void;
  /** The amount in the other unit. */
  converted: string;
  /** What can be sent at most, already formatted. */
  available: string;
  /** Red when the spendable balance could not be worked out. */
  availableError: boolean;
  onMax: () => void;
  fee: string;
  invalid: boolean;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
};

/**
 * Send's amount (the designer's exception C): a dark card with the number
 * in the balance style and its unit pill (ZEC or USD), the converted value
 * under it, and a bottom row with "Available" (tap it to send the most you
 * can) and the network fee.
 */
export default function AmountCard({
  value,
  onChangeText,
  unit,
  onToggleUnit,
  converted,
  available,
  availableError,
  onMax,
  fee,
  invalid,
  focused,
  onFocus,
  onBlur,
}: AmountCardProps) {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const inset = useInsetFill();
  const t = (key: string) => (translate(key) as string).trim();
  const amountStyle = textVariants.balance;
  return (
    <View style={{ gap: space8, marginTop: space16 }}>
      <Text variant="bodySmall" tone="muted" style={{ fontWeight: '600' }}>
        {t('send.amount')}
      </Text>
      <View
        style={{
          borderRadius: radiusMd,
          borderWidth: 1,
          borderColor: invalid
            ? colors.borderDanger
            : focused
              ? colors.borderFocus
              : colors.bottomSheetBorder,
          backgroundColor: inset,
          paddingTop: space16,
          paddingHorizontal: space16,
          paddingBottom: space4,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: space12 }}
        >
          <TextInput
            testID="send.amount"
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="0"
            placeholderTextColor={colors.borderFocus}
            keyboardType="decimal-pad"
            maxLength={20}
            maxFontSizeMultiplier={fontScaleDisplay}
            accessibilityLabel={t(
              unit === 'USD' ? 'send.usd-acc' : 'send.zec-acc',
            )}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: amountStyle.fontSize,
              lineHeight: amountStyle.lineHeight,
              fontWeight: amountStyle.fontWeight,
              fontVariant: ['tabular-nums'],
              color: invalid ? colors.fgDanger : colors.fgDefault,
              padding: 0,
            }}
          />
          <Pressable
            testID="send.swap-entry"
            accessibilityRole="button"
            accessibilityLabel={t('send.switch-unit-acc')}
            disabled={!onToggleUnit}
            onPress={onToggleUnit}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space4,
              minHeight: chipMinHeight,
              paddingHorizontal: space12,
              borderRadius: radiusPill,
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
            }}
          >
            <Text variant="bodySmall" style={{ fontWeight: '700' }}>
              {unit}
            </Text>
            {!!onToggleUnit && (
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <SwapIcon size={iconSizeSm} color={colors.fgMuted} />
              </View>
            )}
          </Pressable>
        </View>
        <Text
          testID="send.zec-derived"
          variant="bodySmall"
          tone="muted"
          style={{ marginTop: space4 }}
        >
          {converted}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: chipMinHeight,
            marginTop: space8,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
          }}
        >
          <Pressable
            testID="send.max"
            accessibilityRole="button"
            onPress={onMax}
            hitSlop={space8}
            style={{ flexDirection: 'row', gap: space4 }}
          >
            <Text
              variant="caption"
              color={availableError ? colors.fgDanger : colors.fgMuted}
            >
              {t('send.available')}
            </Text>
            <Text
              variant="caption"
              color={availableError ? colors.fgDanger : colors.fgDefault}
              style={{ fontWeight: '700', textDecorationLine: 'underline' }}
            >
              {available}
            </Text>
          </Pressable>
          {!!fee && (
            <Text variant="caption" tone="muted">
              {t('send.fee-line').replace('{fee}', fee)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
