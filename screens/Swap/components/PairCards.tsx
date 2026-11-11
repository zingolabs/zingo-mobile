/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Pressable from '@ui/primitives/Pressable';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
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
import PrivateAmount from '@ui/widgets/PrivateAmount';
import QuoteRefreshRing from '@ui/primitives/QuoteRefreshRing';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import AssetButton from './AssetButton';
import { ZEC_TOKEN_ENTRY } from '@screens/Swap/swapAssets';
import { singleLineInput } from '@ui/primitives/singleLineInput';

/** The flip: the coins trade places while the words that differ cross-fade. */
const FLIP_MS = 360;
/** The cards sit this close, with the flip button over the seam. */
const SEAM = 4;
/** The flip button: 40 visible, a 44 pt target. */
const FLIP_SIZE = 40;
/** A fresh price flashes green, at its strongest 30% of the way. */
const FLASH_MS = 1100;

/** Where a coin row sits in its card. */
type RowBox = { x: number; y: number; height: number };
const NO_ROW: RowBox = { x: 0, y: 0, height: 0 };
const boxOf = ({ x, y, height }: RowBox): RowBox => ({ x, y, height });
/** A chip on its way, centred on a row's height as the row centres it. */
const travellingChip = (row: RowBox) => ({
  position: 'absolute' as const,
  top: 0,
  left: row.x,
  height: row.height,
  justifyContent: 'center' as const,
});
/** The boxes a flip travels between, held still while it runs. */
type FlipBoxes = { sendH: number; sendRow: RowBox; receiveRow: RowBox };

/** Out of reach while the other version is on screen. */
const offscreen = (off: boolean) =>
  off
    ? {
        pointerEvents: 'none' as const,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      }
    : {};

/**
 * Both directions' versions of a cell, stacked in one place so its size never
 * changes across a flip; the one on screen fades in, the other out.
 */
function Stacked({
  showFirst,
  first,
  second,
  fadeIn,
  fadeOut,
  align,
}: {
  showFirst: boolean;
  first: React.ReactNode;
  second: React.ReactNode;
  fadeIn: Animated.AnimatedInterpolation<number>;
  fadeOut: Animated.AnimatedInterpolation<number>;
  align: 'flex-start' | 'flex-end';
}) {
  const layer = (shown: boolean, under: boolean) => ({
    width: '100%' as const,
    marginLeft: under ? ('-100%' as const) : 0,
    alignItems: align,
    justifyContent: 'center' as const,
    opacity: shown ? fadeIn : fadeOut,
  });
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <Animated.View style={layer(showFirst, false)} {...offscreen(!showFirst)}>
        {first}
      </Animated.View>
      <Animated.View style={layer(!showFirst, true)} {...offscreen(showFirst)}>
        {second}
      </Animated.View>
    </View>
  );
}

export type PairCardsTexts = {
  youSend: string;
  youReceive: string;
  /** The receive label when buying ZEC. */
  receiveInZingo: string;
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
  /** The spendable balance in the typed unit, shown when selling. */
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
 * coins slide past each other and the words that differ cross-fade.
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
  /** The picker as it looks, edge and chevron included, for the copy that travels. */
  const tokenChip = (surface: string) => (
    <AssetButton token={token} surfaceColor={surface} onPress={onPickAsset} />
  );

  const [sendH, setSendH] = useState<number>(0);
  const [sendRow, setSendRow] = useState<RowBox>(NO_ROW);
  const [receiveRow, setReceiveRow] = useState<RowBox>(NO_ROW);
  const [progress] = useState(() => new Animated.Value(1));
  /**
   * Read once: asked on the press, the answer came after the flipped layout
   * had painted, which showed the end state before the animation.
   */
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);
  /**
   * Layout that changes mid-flight (the receive tip, the ring) would move
   * the ends of the travel, so they are taken when the flip starts.
   */
  const [frozen, setFrozen] = useState<FlipBoxes | null>(null);
  const flipPending = useRef(false);
  const flip = () => {
    if (!reduceMotion) {
      setFrozen({ sendH, sendRow, receiveRow });
      flipPending.current = true;
    }
    onFlip();
  };
  /**
   * Started once the flipped direction has committed, before it paints: run
   * from the press, the chips swapped mid-flight, or the animation was over
   * before a busy JS thread committed.
   */
  useLayoutEffect(() => {
    if (!flipPending.current) {
      return;
    }
    flipPending.current = false;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: FLIP_MS,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    }).start(() => setFrozen(null));
  }, [isOutbound, progress]);
  const boxes = frozen ?? { sendH, sendRow, receiveRow };
  /** The receive card's coin row, measured from the top of the send card. */
  const receiveTop = boxes.sendH + SEAM + boxes.receiveRow.y;
  const sendChipShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [receiveTop, boxes.sendRow.y],
  });
  const receiveChipShift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [boxes.sendRow.y, receiveTop],
  });
  /** The chips in the rows stand in for the travelling ones once they land. */
  const landed = progress.interpolate({
    inputRange: [0, 0.999, 1],
    outputRange: [0, 0, 1],
  });
  const travelling = progress.interpolate({
    inputRange: [0, 0.999, 1],
    outputRange: [1, 1, 0],
  });
  /** The words that differ cross in place: out at once, in after a beat. */
  const fadeIn = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });
  const fadeOut = progress.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
    extrapolate: 'clamp',
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
        <View style={header}>
          <Text variant="bodySmall" tone="muted" style={{ fontWeight: '600' }}>
            {texts.youSend}
          </Text>
          <Stacked
            showFirst={isOutbound}
            align="flex-end"
            fadeIn={fadeIn}
            fadeOut={fadeOut}
            first={
              !!availableText && (
                <Pressable
                  kind="link"
                  accessibilityRole="button"
                  accessibilityLabel={texts.useMax}
                  onPress={onUseMax}
                  hitSlop={8}
                  style={{ flexDirection: 'row', columnGap: space4 }}
                >
                  <Text variant="caption" tone="muted">
                    {texts.available}
                  </Text>
                  <PrivateAmount
                    text={availableText}
                    variant="caption"
                    style={{
                      fontWeight: '700',
                      textDecorationLine: 'underline',
                    }}
                  />
                </Pressable>
              )
            }
            second={
              <Text variant="caption" tone="muted">
                {texts.fromOtherWallet}
              </Text>
            }
          />
        </View>
        <View
          style={coinRow}
          onLayout={e => setSendRow(boxOf(e.nativeEvent.layout))}
        >
          <Animated.View style={{ opacity: landed }}>
            {isOutbound ? zecChip : pickChip(sendSurface)}
          </Animated.View>
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
                fontWeight: textVariants.balance.fontWeight,
                fontVariant: ['tabular-nums'],
                color: invalid ? colors.fgDanger : colors.fgDefault,
                padding: 0,
                ...singleLineInput(textVariants.balance.lineHeight),
              }}
            />
          </View>
        </View>
        <View style={underRow}>
          {onToggleUnit ? (
            <Pressable
              kind="link"
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
              <Text variant="bodySmall" tone="muted">
                {altText}
              </Text>
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <SwapIcon size={iconSizeSm} color={colors.fgMuted} />
              </View>
            </Pressable>
          ) : (
            <Text variant="bodySmall" tone="muted">
              {altText}
            </Text>
          )}
        </View>
      </View>

      <View style={{ height: 0, alignItems: 'center', zIndex: 4 }}>
        <Pressable
          kind="button"
          testID="swap.flip"
          accessibilityRole="button"
          accessibilityLabel={texts.flip}
          onPress={flip}
          hitSlop={(touchTarget - FLIP_SIZE) / 2}
          style={{
            position: 'absolute',
            top: -FLIP_SIZE / 2 + SEAM / 2,
            width: FLIP_SIZE,
            height: FLIP_SIZE,
            borderRadius: radiusPill,
            backgroundColor: colors.bgSurface,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <SwapIcon size={iconSizeMd} color={colors.fgAccent} />
            </View>
          </Animated.View>
        </Pressable>
      </View>

      <View style={[card(receiveSurface), { marginTop: SEAM }]}>
        <View style={header}>
          <Stacked
            showFirst={isOutbound}
            align="flex-start"
            fadeIn={fadeIn}
            fadeOut={fadeOut}
            first={
              <Text
                variant="bodySmall"
                tone="muted"
                style={{ fontWeight: '600' }}
              >
                {texts.youReceive}
              </Text>
            }
            second={
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  columnGap: space4,
                }}
              >
                <Text
                  variant="bodySmall"
                  tone="muted"
                  style={{ fontWeight: '600' }}
                >
                  {texts.receiveInZingo}
                </Text>
                {!!texts.receiveTip && (
                  <InfoTooltip
                    testID="swap.receive-info"
                    label={texts.receiveInZingo}
                    text={texts.receiveTip}
                  >
                    <></>
                  </InfoTooltip>
                )}
              </View>
            }
          />
        </View>
        <View
          style={coinRow}
          onLayout={e => setReceiveRow(boxOf(e.nativeEvent.layout))}
        >
          <Animated.View style={{ opacity: landed }}>
            {isOutbound ? pickChip(receiveSurface) : zecChip}
          </Animated.View>
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
                kind="icon"
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
        </View>
        <View style={underRow}>
          <Text variant="bodySmall" tone="muted">
            {receiveAltText}
          </Text>
        </View>
      </View>

      {/* Only the coins travel, over both cards, so neither hides behind
          the other at the seam. */}
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, { opacity: travelling, zIndex: 5 }]}
      >
        <Animated.View
          style={[
            travellingChip(boxes.sendRow),
            { transform: [{ translateY: sendChipShift }] },
          ]}
        >
          {isOutbound ? zecChip : tokenChip(sendSurface)}
        </Animated.View>
        <Animated.View
          style={[
            travellingChip(boxes.receiveRow),
            { transform: [{ translateY: receiveChipShift }] },
          ]}
        >
          {isOutbound ? tokenChip(receiveSurface) : zecChip}
        </Animated.View>
      </Animated.View>
    </View>
  );
}
