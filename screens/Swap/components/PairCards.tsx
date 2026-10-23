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
  iconSizeMd,
  iconSizeSm,
  radiusMd,
  radiusPill,
  space4,
  space8,
  space12,
  space16,
  textVariants,
  touchTarget,
  useTheme,
} from '@app/theme';
import type { TokenEntryType } from '@app/swap';
import Text from '@ui/primitives/Text';
import QuoteRefreshRing from '@ui/primitives/QuoteRefreshRing';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import AssetButton from './AssetButton';
import { ZEC_TOKEN_ENTRY } from '@screens/Swap/swapAssets';

/** The flip: rows trade places while the words cross-fade. */
const FLIP_MS = 360;
/** The cards sit this close, with the flip button over the seam. */
const SEAM = 4;
/** The flip button: 40 visible, a 44 pt target. */
const FLIP_SIZE = 40;
/** A fresh price flashes green, at its strongest 30% of the way. */
const FLASH_MS = 1100;

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
  /** What "You get in Zingo" means, shown by its info icon when buying. */
  receiveTip?: string;
};

type PairCardsProps = {
  isOutbound: boolean;
  token: TokenEntryType | null;
  /** The amount as typed, in the unit on screen. */
  amountText: string;
  onChangeAmountText: (text: string) => void;
  amountPlaceholder: string;
  /** The unit the amount is typed in; USD once the coin has a price. */
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
    paused: boolean;
    onPress: () => void;
  };
  onFlip: () => void;
  onPickAsset: () => void;
  texts: PairCardsTexts;
};

/**
 * The two sides of the swap, what you send on the dark card over what you
 * get on the panel's colour, with the flip button over the seam. ZEC is
 * always one of the two. Flipping leaves the cards where they are: the two
 * coin rows slide past each other and the words cross-fade.
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
  const zecChip = (
    <AssetButton token={ZEC_TOKEN_ENTRY} surfaceColor={sendSurface} />
  );
  const pickChip = (surface: string) => (
    <AssetButton
      token={token}
      surfaceColor={surface}
      onPress={onPickAsset}
      accessibilityLabel={texts.pickAsset}
      testID="swap.pick-asset"
    />
  );

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
  /** Each row starts where the other one was, a card and the seam away. */
  const travel = sendH + SEAM;
  const sendRowShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [travel, 0],
  });
  const receiveRowShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-travel, 0],
  });
  const words = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0, 1],
  });
  const spin = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  const flash = useRef(new Animated.Value(0)).current;
  const lastQuote = useRef(ring?.resetKey);
  useEffect(() => {
    const key = ring?.resetKey;
    if (key === lastQuote.current) {
      return;
    }
    const first = lastQuote.current === undefined;
    lastQuote.current = key;
    if (first || !receiveText) {
      return;
    }
    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: FLASH_MS * 0.3,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(flash, {
        toValue: 0,
        duration: FLASH_MS * 0.7,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [ring?.resetKey, receiveText, flash]);
  const receiveColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.fgDefault, colors.fgAccent],
  });

  const card = (surface: string) => ({
    backgroundColor: surface,
    borderColor: colors.bottomSheetBorder,
    borderWidth: 1,
    borderRadius: radiusMd,
    padding: space16,
  });
  const header = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  };
  const coinRow = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    columnGap: space12,
    marginTop: space8,
    zIndex: 3,
  };
  const underRow = {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    marginTop: space4,
  };

  return (
    <View>
      <View
        style={card(sendSurface)}
        onLayout={e => setSendH(e.nativeEvent.layout.height)}
      >
        <Animated.View style={[header, { opacity: words }]}>
          <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
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
                style={{ fontWeight: '700', textDecorationLine: 'underline' }}
              >
                {availableText}
              </Text>
            </Pressable>
          )}
          {!isOutbound && (
            <Text variant="caption" tone="muted">
              {texts.fromOtherWallet}
            </Text>
          )}
        </Animated.View>
        <Animated.View
          style={[coinRow, { transform: [{ translateY: sendRowShift }] }]}
        >
          {isOutbound ? zecChip : pickChip(sendSurface)}
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              columnGap: space8,
            }}
          >
            {unit === 'usd' && (
              <Text variant="balance" tone="muted">
                $
              </Text>
            )}
            <TextInput
              testID="swap.amount"
              value={amountText}
              onChangeText={onChangeAmountText}
              placeholder={amountPlaceholder}
              placeholderTextColor={colors.borderFocus}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'right',
                fontSize: textVariants.balance.fontSize,
                lineHeight: textVariants.balance.lineHeight,
                fontWeight: textVariants.balance.fontWeight,
                fontVariant: ['tabular-nums'],
                color: invalid ? colors.fgDanger : colors.fgDefault,
                padding: 0,
              }}
            />
          </View>
        </Animated.View>
        <Animated.View style={[underRow, { opacity: words }]}>
          {onToggleUnit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={texts.switchUnit}
              onPress={onToggleUnit}
              hitSlop={8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: space8,
              }}
            >
              <Text variant="caption" tone="muted">
                {altText}
              </Text>
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <SwapIcon size={iconSizeSm} color={colors.fgMuted} />
              </View>
            </Pressable>
          ) : (
            <Text variant="caption" tone="muted">
              {altText}
            </Text>
          )}
        </Animated.View>
      </View>

      <View style={{ height: 0, alignItems: 'center', zIndex: 4 }}>
        <Pressable
          testID="swap.flip"
          accessibilityRole="button"
          accessibilityLabel={texts.flip}
          onPress={onFlip}
          hitSlop={(touchTarget - FLIP_SIZE) / 2}
          style={({ pressed }) => ({
            position: 'absolute',
            top: -FLIP_SIZE / 2 + SEAM / 2,
            width: FLIP_SIZE,
            height: FLIP_SIZE,
            borderRadius: radiusPill,
            backgroundColor: pressed ? colors.bgCanvas : colors.bgSurface,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <SwapIcon size={iconSizeMd} color={colors.fgAccent} />
            </View>
          </Animated.View>
        </Pressable>
      </View>

      <View style={[card(receiveSurface), { marginTop: SEAM }]}>
        <Animated.View style={[header, { opacity: words }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: space4,
            }}
          >
            <Text variant="caption" tone="muted" style={{ fontWeight: '600' }}>
              {texts.youReceive}
            </Text>
            {!isOutbound && !!texts.receiveTip && (
              <InfoTooltip
                testID="swap.receive-info"
                label={texts.youReceive}
                text={texts.receiveTip}
              >
                <></>
              </InfoTooltip>
            )}
          </View>
        </Animated.View>
        <Animated.View
          style={[coinRow, { transform: [{ translateY: receiveRowShift }] }]}
        >
          {isOutbound ? pickChip(receiveSurface) : zecChip}
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              columnGap: space8,
            }}
          >
            {!!ring && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={texts.refreshNow}
                onPress={ring.onPress}
                disabled={ring.disabled}
                hitSlop={8}
                style={{
                  width: touchTarget,
                  height: touchTarget,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QuoteRefreshRing
                  size={iconSizeSm}
                  color={colors.fgMuted}
                  fetchColor={colors.fgAccent}
                  trackColor={colors.sheetHandle}
                  durationMs={ring.durationMs}
                  resetKey={ring.resetKey}
                  fetching={ring.fetching}
                  paused={ring.paused}
                />
              </Pressable>
            )}
            <Animated.Text
              testID="swap.receive-amount"
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: textVariants.screenTitle.fontSize,
                lineHeight: textVariants.screenTitle.lineHeight,
                fontWeight: textVariants.screenTitle.fontWeight,
                fontVariant: ['tabular-nums'],
                color: receiveText ? receiveColor : colors.borderFocus,
              }}
            >
              {receiveText || receivePlaceholder}
            </Animated.Text>
          </View>
        </Animated.View>
        <Animated.View style={[underRow, { opacity: words }]}>
          <Text variant="caption" tone="muted">
            {receiveAltText}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
