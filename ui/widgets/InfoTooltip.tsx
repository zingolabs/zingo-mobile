/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState } from 'react';
import { Pressable, TextStyle, View, useWindowDimensions } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  iconSizeSm,
  radiusMd,
  space4,
  space8,
  space12,
  space16,
  useTheme,
} from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import Text from '@ui/primitives/Text';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';

type InfoTooltipProps = {
  label: string;
  title?: string;
  text: string;
  /** Controlled from outside, to keep one bubble open at a time; absent, it keeps its own state. */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  testID?: string;
  // Label and icon sit at the start of the row instead of centred.
  alignStart?: boolean;
  // Label and icon sit at the end of the row.
  alignEnd?: boolean;
  labelStyle?: TextStyle;
  // The bubble opens under the icon instead of above it.
  below?: boolean;
  // Shown before the icon in place of the label text, which then only
  // names the icon for accessibility.
  children?: React.ReactNode;
};

const ARROW = 10;
const GAP = 8;
const BUBBLE_W = 236;
/** The bubble keeps this far from both sides of the screen. */
const EDGE = space16;

/**
 * Where the bubble goes across: centred on the icon, shifted to stay EDGE
 * inside both sides of the screen, with the arrow kept under the icon.
 * `iconX` is the icon's left edge on screen; the result is relative to it.
 * Only the horizontal place is read from the screen: a sheet moves its
 * content with an animated transform the layout tree does not see, so a
 * measured height would be off, while across nothing moves.
 */
export function placeBubble({
  iconX,
  iconW,
  screenW,
}: {
  iconX: number;
  iconW: number;
  screenW: number;
}): { left: number; width: number; arrowLeft: number } {
  const width = Math.min(BUBBLE_W, screenW - EDGE * 2);
  const centre = iconX + iconW / 2;
  const onScreen = Math.min(
    Math.max(centre - width / 2, EDGE),
    screenW - EDGE - width,
  );
  const arrowLeft = Math.min(
    Math.max(centre - onScreen - ARROW / 2, space12),
    width - space12 - ARROW,
  );
  return { left: onScreen - iconX, width, arrowLeft };
}

const bubbleEnter = (rise: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: rise }] },
    100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  })
    .duration(180)
    .reduceMotion(ReduceMotion.System);
const bubbleExit = (rise: number) =>
  new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
    100: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: rise }] },
  })
    .duration(120)
    .reduceMotion(ReduceMotion.System);

/**
 * A label with an info icon; the icon opens a bubble that explains it. The
 * bubble hangs from the icon itself, GAP above it (or below), so it is
 * always right beside it, and it shifts sideways to stay inside the screen.
 */
const InfoTooltip: React.FunctionComponent<InfoTooltipProps> = ({
  label,
  title,
  text,
  open: openProp,
  onToggle: onToggleProp,
  testID,
  alignStart,
  alignEnd,
  labelStyle,
  below,
  children,
}) => {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const [openOwn, setOpenOwn] = useState(false);
  const open = openProp ?? openOwn;
  const onToggle = onToggleProp ?? setOpenOwn;
  const iconRef = useRef<View>(null);
  const [place, setPlace] = useState<ReturnType<typeof placeBubble> | null>(
    null,
  );
  const spin = useSharedValue(0);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const toggle = () => {
    if (!open) {
      spin.value = 0;
      spin.value = withTiming(360, {
        duration: duration.emphasized,
        easing: ease.out,
      });
      setPlace(null);
      iconRef.current?.measureInWindow((x, _y, w) =>
        setPlace(placeBubble({ iconX: x, iconW: w, screenW })),
      );
    }
    onToggle(!open);
  };

  return (
    <View
      style={[
        alignStart
          ? { alignItems: 'flex-start' }
          : alignEnd
            ? { alignSelf: 'stretch', alignItems: 'flex-end' }
            : { alignSelf: 'stretch', alignItems: 'center' },
        open ? { zIndex: 10, elevation: 10 } : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space8 }}>
        {children ?? (
          <Text variant="bodySmall" style={[{ fontWeight: '700' }, labelStyle]}>
            {label}
          </Text>
        )}
        <View style={{ zIndex: 10, elevation: 10 }}>
          <Pressable
            ref={iconRef}
            testID={testID}
            onPress={toggle}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ expanded: open }}
          >
            <Animated.View style={spinStyle}>
              <InfoIcon size={iconSizeSm} color={colors.fgMuted} />
            </Animated.View>
          </Pressable>
          {open && (
            <Animated.View
              entering={bubbleEnter(below ? -4 : 4)}
              exiting={bubbleExit(below ? -4 : 4)}
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                ...(below
                  ? { top: '100%', marginTop: GAP }
                  : { bottom: '100%', marginBottom: GAP }),
                left: place?.left ?? 0,
                width: place?.width ?? Math.min(BUBBLE_W, screenW - EDGE * 2),
                /** Hidden until the icon is measured across. */
                opacity: place ? 1 : 0,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.bottomSheetBorder,
                  borderWidth: 1,
                  borderRadius: radiusMd,
                  paddingHorizontal: space12,
                  paddingVertical: space8,
                  gap: space4,
                }}
              >
                {!!title && (
                  <Text variant="caption" style={{ fontWeight: '700' }}>
                    {title}
                  </Text>
                )}
                <Text variant="caption" tone="muted">
                  {text}
                </Text>
              </View>
              <View
                style={{
                  position: 'absolute',
                  ...(below ? { top: -ARROW / 2 } : { bottom: -ARROW / 2 }),
                  left: place?.arrowLeft ?? space12,
                  width: ARROW,
                  height: ARROW,
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.bottomSheetBorder,
                  ...(below
                    ? { borderLeftWidth: 1, borderTopWidth: 1 }
                    : { borderRightWidth: 1, borderBottomWidth: 1 }),
                  transform: [{ rotate: '45deg' }],
                }}
              />
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
};

export default InfoTooltip;
