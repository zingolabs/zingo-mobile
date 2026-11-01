/* eslint-disable react-native/no-inline-styles */
import React, { createContext, forwardRef, useContext } from 'react';
import Pressable from '@ui/primitives/Pressable';
import { StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import {
  radiusMd,
  radiusXs,
  space12,
  space16,
  space4,
  touchTarget,
  useTheme,
  iconSizeSm,
  space8,
  slopFor,
  fontScaleBody,
  textVariants,
} from '@app/theme';
import Text, { TextScaleContext } from '@ui/primitives/Text';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';
import { SnowflakeIcon } from '@ui/primitives/Icons/SnowflakeIcon';
import { SproutIcon } from '@ui/primitives/Icons/SproutIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import { XIcon } from '@ui/primitives/Icons/XIcon';

/**
 * Set by the notice stack: every banner in it takes the plain card surface
 * and edge, so the stack reads as one deck whatever the notice; only the
 * icon, its tile, the text and the tag change. Outside the stack a banner
 * is a compact note (16 pt icon, caption text, no bold).
 */
export const BannerPlainContext = createContext(false);

/** No danger tone: errors belong next to what failed, or in a sheet. */
export type BannerTone = 'seed' | 'warning' | 'viewOnly' | 'info';

type BannerProps = {
  tone: BannerTone;
  title: string;
  /** The short text, already translated. */
  children?: React.ReactNode;
  /** A `Tag` beside the title. */
  tag?: React.ReactNode;
  /** A `Button` with `size="small"`. */
  action?: React.ReactNode;
  /**
   * Beside the text, centered, instead of under it: a call to act the card
   * is built around (Back up, Start), with an `inline` button.
   */
  actionBeside?: boolean;
  /**
   * The plain card surface and edge instead of the tone's fill; the tone
   * stays in the icon tile. For a prompt that is not an alert.
   */
  plain?: boolean;
  onDismiss?: () => void;
  /**
   * The X in the row, after an `actionBeside` button, instead of in the
   * card's corner: for a card too short to hold a corner X.
   */
  dismissBeside?: boolean;
  dismissLabel?: string;
  dismissTestID?: string;
  /**
   * Fades or moves the contents while the card stays, as when a flow opens
   * over it with a container transform.
   */
  contentStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  testID?: string;
};

/** The icon's tile, in the title row. */
const TILE = 24;

/**
 * A notice at the top of a screen. One at a time: when several are pending,
 * the most important shows first.
 */
const Banner = forwardRef<View, BannerProps>(function BannerCard(
  {
    tone,
    title,
    children,
    tag,
    action,
    onDismiss,
    dismissLabel,
    dismissTestID,
    contentStyle,
    actionBeside = false,
    dismissBeside = false,
    plain = false,
    testID,
  },
  ref,
) {
  const { colors } = useTheme();
  const inStack = useContext(BannerPlainContext);
  /** The compact note's first caption line, as tall as the OS text size makes it. */
  const firstLine =
    textVariants.caption.lineHeight *
    Math.min(
      Math.max(useWindowDimensions().fontScale, useContext(TextScaleContext)),
      fontScaleBody,
    );
  const xBeside =
    !!onDismiss && dismissBeside && actionBeside && action !== undefined;
  const flat = plain || inStack;
  const paint = {
    seed: {
      bg: colors.bgSurface,
      edge: colors.bottomSheetBorder,
      tile: colors.bgAccentSubtle,
      icon: <SproutIcon size={iconSizeSm} color={colors.fgAccent} />,
    },
    warning: {
      bg: colors.bgWarning,
      edge: colors.borderWarning,
      tile: colors.bgWarningSubtle,
      icon: <TriangleAlert size={iconSizeSm} color={colors.fgWarning} />,
    },
    viewOnly: {
      bg: colors.bgSurface,
      edge: colors.bottomSheetBorder,
      tile: colors.bgViewOnlySubtle,
      icon: <SnowflakeIcon size={iconSizeSm} color={colors.fgViewOnly} />,
    },
    info: {
      bg: colors.bgSurface,
      edge: colors.bottomSheetBorder,
      tile: colors.bgMutedSubtle,
      icon: <InfoIcon size={iconSizeSm} color={colors.fgMuted} />,
    },
  }[tone];

  if (!inStack) {
    /**
     * Outside Home's notice stack a banner is a compact note: whole
     * sentences in caption, regular, beside a 16 pt icon with no tile.
     */
    const CompactIcon = {
      seed: SproutIcon,
      warning: TriangleAlert,
      viewOnly: SnowflakeIcon,
      info: InfoIcon,
    }[tone];
    const iconColor = {
      seed: colors.fgAccent,
      warning: colors.fgWarning,
      viewOnly: colors.fgViewOnly,
      info: colors.fgMuted,
    }[tone];
    return (
      <View
        ref={ref}
        testID={testID}
        style={{
          // The text column flexes into the row, so a centred parent must not shrink it.
          alignSelf: 'stretch',
          padding: space12,
          borderRadius: radiusMd,
          borderWidth: 1,
          borderColor: plain ? colors.bottomSheetBorder : paint.edge,
          backgroundColor: plain ? colors.bgSurface : paint.bg,
        }}
      >
        {/* Beside a button the text block centres on it; the icon keeps to the first line. */}
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: actionBeside ? 'center' : 'flex-start',
              gap: space8,
            },
            contentStyle,
          ]}
        >
          <View style={{ flex: 1, flexDirection: 'row', gap: space8 }}>
            <View style={{ height: firstLine, justifyContent: 'center' }}>
              <CompactIcon size={iconSizeSm} color={iconColor} />
            </View>
            <View style={{ flex: 1, gap: space4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: space4,
                }}
              >
                <Text variant="caption" style={{ flexShrink: 1 }}>
                  {title}
                </Text>
                {tag}
              </View>
              {children !== undefined &&
                (typeof children === 'string' ? (
                  <Text variant="caption" tone="muted">
                    {children}
                  </Text>
                ) : (
                  children
                ))}
              {action !== undefined && !actionBeside && <View>{action}</View>}
            </View>
          </View>
          {action !== undefined && actionBeside && <View>{action}</View>}
          {onDismiss && (
            <Pressable
              kind="icon"
              testID={dismissTestID}
              accessibilityRole="button"
              accessibilityLabel={dismissLabel}
              onPress={onDismiss}
              hitSlop={slopFor(iconSizeSm)}
            >
              <XIcon size={iconSizeSm} color={colors.fgMuted} />
            </Pressable>
          )}
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      ref={ref}
      testID={testID}
      style={{
        alignSelf: 'stretch',
        padding: space16,
        borderRadius: radiusMd,
        borderWidth: 1,
        borderColor: flat ? colors.bottomSheetBorder : paint.edge,
        backgroundColor: flat ? colors.bgSurface : paint.bg,
      }}
    >
      <Animated.View
        style={[{ flexDirection: 'row', gap: space12 }, contentStyle]}
      >
        <View style={{ flex: 1, gap: space4 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'nowrap',
              alignItems: 'center',
              columnGap: space8,
              /** Clear of the corner X when nothing sits beside the text. */
              paddingRight:
                onDismiss && !actionBeside ? touchTarget - space16 : 0,
            }}
          >
            <View
              style={{
                width: TILE,
                height: TILE,
                flexShrink: 0,
                borderRadius: radiusXs,
                backgroundColor: paint.tile,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {paint.icon}
            </View>
            <Text
              variant="bodyStrong"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ flexShrink: 1 }}
            >
              {title}
            </Text>
            {tag}
          </View>
          {children !== undefined && (
            <Text variant="bodySmall" tone="muted">
              {children}
            </Text>
          )}
          {action !== undefined && !actionBeside && (
            <View style={{ marginTop: space4 }}>{action}</View>
          )}
        </View>
        {action !== undefined && actionBeside && (
          <View
            style={{
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              /** 5, off the spacing scale on purpose: the X sits close to the button it dismisses with, in this notice only. */
              gap: 5,
            }}
          >
            {action}
            {xBeside && (
              <Pressable
                kind="icon"
                testID={dismissTestID}
                accessibilityRole="button"
                accessibilityLabel={dismissLabel}
                onPress={onDismiss}
                /** Only 5 toward the button, so a tap on its edge never dismisses the notice. */
                hitSlop={{ top: 14, bottom: 14, left: 5, right: 14 }}
              >
                <XIcon size={iconSizeSm} color={colors.fgMuted} />
              </Pressable>
            )}
          </View>
        )}
      </Animated.View>
      {/* In the card's corner, outside the row, so the action keeps its place. */}
      {onDismiss && !xBeside && (
        <Pressable
          kind="icon"
          testID={dismissTestID}
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
          onPress={onDismiss}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: touchTarget,
            height: touchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <XIcon size={iconSizeSm} color={colors.fgMuted} />
        </Pressable>
      )}
    </View>
  );
});

export default Banner;
