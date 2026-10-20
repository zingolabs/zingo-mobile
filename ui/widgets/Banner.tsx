/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import {
  iconSizeMd,
  iconSizeSm,
  radiusMd,
  radiusSm,
  space12,
  space16,
  space4,
  touchTarget,
  useTheme,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';
import { SnowflakeIcon } from '@ui/primitives/Icons/SnowflakeIcon';
import { SproutIcon } from '@ui/primitives/Icons/SproutIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import { XIcon } from '@ui/primitives/Icons/XIcon';

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
  dismissLabel?: string;
  dismissTestID?: string;
  /**
   * Fades or moves the contents while the card stays, as when a flow opens
   * over it with a container transform.
   */
  contentStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  testID?: string;
};

const TILE = 36;

/**
 * A notice at the top of a screen. One at a time: when several are pending,
 * the most important shows first.
 */
const Banner = forwardRef<View, BannerProps>(function Banner(
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
    plain = false,
    testID,
  },
  ref,
) {
  const { colors } = useTheme();
  const paint = {
    seed: {
      bg: colors.bgSurface,
      edge: colors.bottomSheetBorder,
      tile: colors.bgAccentSubtle,
      icon: <SproutIcon size={iconSizeMd} color={colors.fgAccent} />,
    },
    warning: {
      bg: colors.bgWarning,
      edge: colors.borderWarning,
      tile: colors.bgWarningSubtle,
      icon: <TriangleAlert size={iconSizeMd} color={colors.fgWarning} />,
    },
    viewOnly: {
      bg: colors.bgSurface,
      edge: colors.bottomSheetBorder,
      tile: colors.bgViewOnlySubtle,
      icon: <SnowflakeIcon size={iconSizeMd} color={colors.fgViewOnly} />,
    },
    info: {
      bg: colors.bgSurface,
      edge: colors.bottomSheetBorder,
      tile: colors.bgMutedSubtle,
      icon: <InfoIcon size={iconSizeMd} color={colors.fgMuted} />,
    },
  }[tone];

  return (
    <View
      ref={ref}
      testID={testID}
      style={{
        padding: space16,
        borderRadius: radiusMd,
        borderWidth: 1,
        borderColor: plain ? colors.bottomSheetBorder : paint.edge,
        backgroundColor: plain ? colors.bgSurface : paint.bg,
      }}
    >
      <Animated.View
        style={[{ flexDirection: 'row', gap: space12 }, contentStyle]}
      >
        <View
          style={{
            width: TILE,
            height: TILE,
            borderRadius: radiusSm,
            backgroundColor: paint.tile,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {paint.icon}
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
            <Text variant="bodyStrong">{title}</Text>
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
          <View style={{ alignSelf: 'center' }}>{action}</View>
        )}
        {onDismiss && (
          <Pressable
            testID={dismissTestID}
            accessibilityRole="button"
            accessibilityLabel={dismissLabel}
            onPress={onDismiss}
            style={{
              width: touchTarget,
              height: touchTarget,
              marginTop: -space12,
              marginRight: -space12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XIcon size={iconSizeSm} color={colors.fgMuted} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
});

export default Banner;
