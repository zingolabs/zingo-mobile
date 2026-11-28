/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useRef } from 'react';
import Pressable from '@ui/primitives/Pressable';
import { TextInput, View } from 'react-native';
import {
  chipMinHeight,
  fontScaleDisplay,
  iconSizeSm,
  radiusMd,
  space4,
  space8,
  space12,
  space16,
  textVariants,
  useTheme,
  slopFor,
} from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import Text from '@ui/primitives/Text';
import PrivateAmount from '@ui/widgets/PrivateAmount';
import { useInsetFill } from '@ui/primitives/Surface';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
import { singleLineInput } from '@ui/primitives/singleLineInput';
import KeyboardDone from '@ui/widgets/KeyboardDone';
import { parseAmountInput } from '@app/utils/formatAmount';

/** The amount field's done key on iOS. */
const AMOUNT_DONE = 'send.amount.done-bar';

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
 * in the balance style beside its unit, the converted value under it with
 * the unit switch, and a bottom row with "Available" (tap it to send the most
 * you can) and the network fee.
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
  const input = useRef<TextInput>(null);
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
        <Pressable
          kind="link"
          accessible={false}
          onPress={() => input.current?.focus()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space8 }}
        >
          {unit === 'USD' && (
            <Text
              variant="balance"
              tone="muted"
              maxFontSizeMultiplier={fontScaleDisplay}
            >
              $
            </Text>
          )}
          <TextInput
            ref={input}
            testID="send.amount"
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="0"
            placeholderTextColor={colors.borderFocus}
            keyboardType="decimal-pad"
            inputAccessoryViewID={AMOUNT_DONE}
            maxLength={20}
            maxFontSizeMultiplier={fontScaleDisplay}
            accessibilityLabel={t(
              unit === 'USD' ? 'send.usd-acc' : 'send.zec-acc',
            )}
            style={{
              flexShrink: 1,
              minWidth: space12,
              fontSize: amountStyle.fontSize,
              fontWeight: amountStyle.fontWeight,
              fontVariant: ['tabular-nums'],
              color: invalid ? colors.fgDanger : colors.fgDefault,
              padding: 0,
              ...singleLineInput(amountStyle.lineHeight),
            }}
          />
          {unit !== 'USD' && (
            <Text variant="subtitle" tone="muted">
              {unit}
            </Text>
          )}
        </Pressable>
        <Pressable
          kind="link"
          testID="send.swap-entry"
          accessibilityRole="button"
          accessibilityLabel={t('send.switch-unit-acc')}
          disabled={!onToggleUnit}
          onPress={onToggleUnit}
          hitSlop={slopFor(iconSizeSm)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: space8,
            marginTop: space4,
          }}
        >
          <Text testID="send.zec-derived" variant="bodySmall" tone="muted">
            {converted}
          </Text>
          {!!onToggleUnit && (
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <SwapIcon size={iconSizeSm} color={colors.fgMuted} />
            </View>
          )}
        </Pressable>
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
            kind="link"
            testID="send.max"
            accessibilityRole="button"
            onPress={onMax}
            hitSlop={slopFor(iconSizeSm)}
            style={{ flexDirection: 'row', gap: space4 }}
          >
            <Text
              variant="caption"
              color={availableError ? colors.fgDanger : colors.fgMuted}
            >
              {t('send.available')}
            </Text>
            <PrivateAmount
              text={available}
              variant="caption"
              color={availableError ? colors.fgDanger : colors.fgDefault}
              style={{ fontWeight: '700', textDecorationLine: 'underline' }}
            />
          </Pressable>
          {!!fee && (
            <Text variant="caption" tone="muted">
              {t('send.fee-line').replace('{fee}', fee)}
            </Text>
          )}
        </View>
      </View>
      <KeyboardDone
        nativeID={AMOUNT_DONE}
        testID="send.amount.done"
        labels={{ confirm: t('confirm'), hide: t('hide-keyboard') }}
        ready={parseAmountInput(value) > 0}
      />
    </View>
  );
}
