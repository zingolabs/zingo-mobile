/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { radiusMd, radiusPill, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import Text from '@ui/primitives/Text';
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
 * Send's amount: the number at 36 with its unit pill (ZEC or USD), the
 * converted value under it, and "Available" (tap it to send the most you
 * can) with the network fee on the right.
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
  const t = (key: string) => (translate(key) as string).trim();
  return (
    <View>
      <Text
        variant="caption"
        tone="muted"
        style={{ fontWeight: '600', marginBottom: 8, marginTop: 14 }}
      >
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
          backgroundColor: colors.bgCanvas,
          paddingTop: 14,
          paddingHorizontal: 14,
          paddingBottom: 4,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10 }}
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
            accessibilityLabel={t(
              unit === 'USD' ? 'send.usd-acc' : 'send.zec-acc',
            )}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 36,
              lineHeight: 40,
              fontWeight: '600',
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
              columnGap: 4,
              height: 32,
              paddingHorizontal: 10,
              borderRadius: radiusPill,
              backgroundColor: colors.borderSubtle,
            }}
          >
            <Text variant="bodyStrong">{unit}</Text>
            {!!onToggleUnit && (
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <SwapIcon size={16} color={colors.fgMuted} />
              </View>
            )}
          </Pressable>
        </View>
        <Text
          testID="send.zec-derived"
          variant="body"
          tone="muted"
          style={{ marginTop: 4 }}
        >
          {converted}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 40,
          }}
        >
          <Pressable
            testID="send.max"
            accessibilityRole="button"
            onPress={onMax}
            hitSlop={8}
            style={{ flexDirection: 'row', columnGap: 4, paddingVertical: 6 }}
          >
            <Text
              variant="caption"
              style={{
                color: availableError ? colors.fgDanger : colors.fgMuted,
              }}
            >
              {t('send.available')}
            </Text>
            <Text
              variant="caption"
              style={{
                fontWeight: '700',
                textDecorationLine: 'underline',
                color: availableError ? colors.fgDanger : colors.fgDefault,
              }}
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
