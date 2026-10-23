/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import {
  radiusMd,
  radiusPill,
  space12,
  space16,
  space4,
  space8,
  useTheme,
} from '@app/theme';
import type { TokenEntryType } from '@app/swap';
import Text from '@ui/primitives/Text';
import QuoteRefreshRing from '@ui/primitives/QuoteRefreshRing';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
import AssetButton from './AssetButton';
import { ZEC_TOKEN_ENTRY } from '@screens/Swap/swapAssets';

/** How long the two cards take to trade places. */
const FLIP_MS = 360;

export type PairCardsTexts = {
  youSend: string;
  youReceive: string;
  fromOtherWallet: string;
  available: string;
  pickAsset: string;
  flip: string;
  useMax: string;
  switchUnit: string;
  refreshNow: string;
};

type PairCardsProps = {
  isOutbound: boolean;
  token: TokenEntryType | null;
  /** The amount as typed, in the unit on screen. */
  amountText: string;
  onChangeAmountText: (text: string) => void;
  amountPlaceholder: string;
  /** The unit the amount is typed in; USD only while selling ZEC. */
  unit: 'coin' | 'usd';
  /** Switches the unit; absent when no price is available. */
  onToggleUnit?: () => void;
  /** The amount in the other unit, for the line under the field. */
  altText: string;
  /** The spendable balance in the typed unit, outbound only. */
  availableText?: string;
  onUseMax?: () => void;
  invalid: boolean;
  /** What the chosen route expects to deliver, formatted; empty before a quote. */
  receiveText: string;
  receivePlaceholder: string;
  receiveAltText: string;
  /** The refresh ring shows only while a quote is on screen. */
  ring?: {
    resetKey: number;
    durationMs: number;
    fetching: boolean;
    disabled: boolean;
    onPress: () => void;
  };
  onFlip: () => void;
  onPickAsset: () => void;
  texts: PairCardsTexts;
};

/**
 * The two sides of the swap, the one being paid above the one arriving, with
 * the button that swaps them between. ZEC is always one of the two.
 */
export default function PairCards({
  isOutbound,
  token,
  amountText,
  onChangeAmountText,
  amountPlaceholder,
  unit,
  onToggleUnit,
  altText,
  availableText,
  onUseMax,
  invalid,
  receiveText,
  receivePlaceholder,
  receiveAltText,
  ring,
  onFlip,
  onPickAsset,
  texts,
}: PairCardsProps) {
  const { colors } = useTheme();
  const sendSurface = colors.bgCanvas;
  const receiveSurface = colors.bgSurface;
  const sendChip = isOutbound ? (
    <AssetButton token={ZEC_TOKEN_ENTRY} surfaceColor={sendSurface} />
  ) : (
    <AssetButton
      token={token}
      surfaceColor={sendSurface}
      onPress={onPickAsset}
      accessibilityLabel={texts.pickAsset}
      testID="swap.pick-asset"
    />
  );
  const receiveChip = isOutbound ? (
    <AssetButton
      token={token}
      surfaceColor={receiveSurface}
      onPress={onPickAsset}
      accessibilityLabel={texts.pickAsset}
      testID="swap.pick-asset"
    />
  ) : (
    <AssetButton token={ZEC_TOKEN_ENTRY} surfaceColor={receiveSurface} />
  );

  // A flip slides each card into the other's place while the button turns
  // half a turn; nothing else on the screen moves.
  const [sendH, setSendH] = useState<number>(0);
  const progress = useRef(new Animated.Value(1)).current;
  const flipped = useRef(isOutbound);
  useEffect(() => {
    if (flipped.current === isOutbound) {
      return;
    }
    flipped.current = isOutbound;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) {
        return;
      }
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: FLIP_MS,
        easing: Easing.bezier(0.2, 0, 0, 1),
        useNativeDriver: true,
      }).start();
    });
  }, [isOutbound, progress]);
  const travel = sendH > 0 ? sendH - 40 + 20 : 0;
  const sendShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [travel, 0],
  });
  const receiveShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-travel, 0],
  });
  const spin = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  return (
    <View>
      <Animated.View
        style={{ transform: [{ translateY: sendShift }] }}
        onLayout={e => setSendH(e.nativeEvent.layout.height)}
      >
        <View
          style={{
            backgroundColor: sendSurface,
            borderColor: colors.bottomSheetBorder,
            borderWidth: 1,
            borderRadius: radiusMd,
            padding: space16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text variant="caption" tone="muted">
              {texts.youSend}
            </Text>
            {isOutbound && !!availableText && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={texts.useMax}
                onPress={onUseMax}
                hitSlop={8}
                style={{ flexDirection: 'row', columnGap: space4 }}
              >
                <Text variant="caption" tone="muted">
                  {texts.available}
                </Text>
                <Text
                  variant="caption"
                  style={{ textDecorationLine: 'underline' }}
                >
                  {availableText}
                </Text>
              </Pressable>
            )}
            {!isOutbound && (
              <View
                style={{
                  borderRadius: radiusPill,
                  backgroundColor: colors.bgMutedSubtle,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                }}
              >
                <Text variant="caption" tone="muted">
                  {texts.fromOtherWallet}
                </Text>
              </View>
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: space12,
              marginTop: space8,
            }}
          >
            {sendChip}
            {unit === 'usd' && (
              <Text variant="bodyStrong" tone="muted" style={{ fontSize: 24 }}>
                $
              </Text>
            )}
            <TextInput
              testID="swap.amount"
              value={amountText}
              onChangeText={onChangeAmountText}
              placeholder={amountPlaceholder}
              placeholderTextColor={colors.fgMuted}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                textAlign: 'right',
                fontSize: 32,
                fontWeight: '700',
                color: invalid ? colors.fgDanger : colors.fgDefault,
                padding: 0,
              }}
            />
          </View>
          <View style={{ alignItems: 'flex-end', marginTop: space4 }}>
            {onToggleUnit ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={texts.switchUnit}
                onPress={onToggleUnit}
                hitSlop={8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  columnGap: space4,
                }}
              >
                <Text variant="bodySmall" tone="muted">
                  {altText}
                </Text>
                <SwapIcon size={14} color={colors.fgAccent} />
              </Pressable>
            ) : (
              <Text variant="bodySmall" tone="muted">
                {altText}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>

      <View style={{ alignItems: 'center', marginVertical: -20, zIndex: 1 }}>
        <Pressable
          testID="swap.flip"
          accessibilityRole="button"
          accessibilityLabel={texts.flip}
          onPress={onFlip}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.bgSurface,
            borderWidth: 1,
            borderColor: pressed
              ? colors.borderMuted
              : colors.bottomSheetBorder,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <SwapIcon size={18} color={colors.fgAccent} />
            </View>
          </Animated.View>
        </Pressable>
      </View>

      <Animated.View style={{ transform: [{ translateY: receiveShift }] }}>
        <View
          style={{
            borderColor: colors.bottomSheetBorder,
            borderWidth: 1,
            borderRadius: radiusMd,
            padding: space16,
            paddingTop: space16 + space8,
          }}
        >
          <Text variant="caption" tone="muted">
            {texts.youReceive}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: space12,
              marginTop: space8,
            }}
          >
            {receiveChip}
            <View style={{ flex: 1 }} />
            {!!ring && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={texts.refreshNow}
                onPress={ring.onPress}
                disabled={ring.disabled}
                hitSlop={8}
              >
                <QuoteRefreshRing
                  size={16}
                  color={colors.fgMuted}
                  fetchColor={colors.fgAccent}
                  trackColor={colors.borderMuted}
                  durationMs={ring.durationMs}
                  resetKey={ring.resetKey}
                  fetching={ring.fetching}
                />
              </Pressable>
            )}
            <Text
              testID="swap.receive-amount"
              variant="bodyStrong"
              tone={receiveText ? 'default' : 'muted'}
              numberOfLines={1}
              style={{ fontSize: 22, flexShrink: 1 }}
            >
              {receiveText || receivePlaceholder}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', marginTop: space4 }}>
            <Text variant="bodySmall" tone="muted">
              {receiveAltText}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
