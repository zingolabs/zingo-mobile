/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
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
import { TooltipHostContext } from './TooltipHost';

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
  // The bubble prefers to open under the icon instead of above it.
  below?: boolean;
  // Shown before the icon in place of the label text, which then only
  // names the icon for accessibility.
  children?: React.ReactNode;
};

const ARROW = 10;
const GAP = 8;
const BUBBLE_W = 236;
/** The bubble keeps this far from the edges of the area it opens in. */
const EDGE = space16;

/**
 * Where the bubble goes across: centred on the icon and shifted to stay
 * EDGE inside both sides of an area `areaW` wide, with the arrow kept under
 * the icon. `iconX` is the icon's left edge in the area; `left` is in the
 * area too.
 */
export function placeBubble({
  iconX,
  iconW,
  areaW,
}: {
  iconX: number;
  iconW: number;
  areaW: number;
}): { left: number; width: number; arrowLeft: number } {
  const width = Math.min(BUBBLE_W, areaW - EDGE * 2);
  const centre = iconX + iconW / 2;
  const left = Math.min(
    Math.max(centre - width / 2, EDGE),
    areaW - EDGE - width,
  );
  const arrowLeft = Math.min(
    Math.max(centre - left - ARROW / 2, space12),
    width - space12 - ARROW,
  );
  return { left, width, arrowLeft };
}

/**
 * Whether the bubble opens under the icon: when asked and there is room
 * below, or when there is no room above, within an area `areaH` high.
 */
export function opensBelow({
  iconY,
  iconH,
  bubbleH,
  areaH,
  below,
}: {
  iconY: number;
  iconH: number;
  bubbleH: number;
  areaH: number;
  below?: boolean;
}): boolean {
  const roomAbove = iconY - EDGE;
  const roomBelow = areaH - EDGE - (iconY + iconH);
  return (!!below && roomBelow >= bubbleH + GAP) || roomAbove < bubbleH + GAP;
}

const bubbleEnter = (rise: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: rise }] },
    100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  })
    .duration(180)
    .reduceMotion(ReduceMotion.System);

type Box = { x: number; y: number; w: number; h: number };

/**
 * A label with an info icon; the icon opens a bubble that explains it.
 * Inside a TooltipHost (every panel and sheet has one) the bubble opens in
 * the host's layer: over everything in the screen, beside the icon, inside
 * the screen's edges, and closed by a tap anywhere. Without a host it hangs
 * from the icon and closes with a second tap.
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
  const host = useContext(TooltipHostContext);
  const { width: screenW } = useWindowDimensions();
  const [openOwn, setOpenOwn] = useState(false);
  const open = openProp ?? openOwn;
  const onToggle = onToggleProp ?? setOpenOwn;
  const iconRef = useRef<View>(null);
  const owner = useRef({}).current;
  const [icon, setIcon] = useState<Box | null>(null);
  const [bubbleH, setBubbleH] = useState(0);
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
      setIcon(null);
      setBubbleH(0);
      const node = iconRef.current;
      if (host?.hostRef.current && node) {
        node.measureLayout(host.hostRef.current, (x, y, w, h) =>
          setIcon({ x, y, w, h }),
        );
      } else {
        node?.measureInWindow((x, y, w, h) => setIcon({ x, y, w, h }));
      }
    }
    onToggle(!open);
  };

  /** Across: inside the host, or inside the screen when hanging from the icon. */
  const across = icon
    ? placeBubble({
        iconX: icon.x,
        iconW: icon.w,
        areaW: host ? host.hostWidth || screenW : screenW,
      })
    : null;
  const under =
    !!host && !!icon && bubbleH > 0
      ? opensBelow({
          iconY: icon.y,
          iconH: icon.h,
          bubbleH,
          areaH: host.hostHeight,
          below,
        })
      : !!below;
  const ready = !!icon && (!host || bubbleH > 0);

  const bubble = (
    <Animated.View
      entering={bubbleEnter(under ? -4 : 4)}
      pointerEvents="none"
      onLayout={e => setBubbleH(e.nativeEvent.layout.height)}
      style={{
        position: 'absolute',
        width: across?.width ?? Math.min(BUBBLE_W, screenW - EDGE * 2),
        ...(host
          ? {
              left: across?.left ?? EDGE,
              top: icon
                ? under
                  ? icon.y + icon.h + GAP
                  : icon.y - GAP - bubbleH
                : 0,
            }
          : {
              /** Hanging from the icon: left is relative to the icon. */
              left: across && icon ? across.left - icon.x : 0,
              ...(under
                ? { top: '100%', marginTop: GAP }
                : { bottom: '100%', marginBottom: GAP }),
            }),
        /** Hidden until it is measured and placed. */
        opacity: ready ? 1 : 0,
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
          ...(under ? { top: -ARROW / 2 } : { bottom: -ARROW / 2 }),
          left: across?.arrowLeft ?? space12,
          width: ARROW,
          height: ARROW,
          backgroundColor: colors.bgSurface,
          borderColor: colors.bottomSheetBorder,
          ...(under
            ? { borderLeftWidth: 1, borderTopWidth: 1 }
            : { borderRightWidth: 1, borderBottomWidth: 1 }),
          transform: [{ rotate: '45deg' }],
        }}
      />
    </Animated.View>
  );

  /** In a host, the bubble is drawn there, and redrawn as it is measured. */
  useEffect(() => {
    if (!host) {
      return;
    }
    if (open) {
      host.show({ owner, node: bubble, onClose: () => onToggle(false) });
    } else {
      host.hide(owner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, open, icon, bubbleH, under, title, text]);
  useEffect(() => () => host?.hide(owner), [host, owner]);

  return (
    <View
      style={[
        alignStart
          ? { alignItems: 'flex-start' }
          : alignEnd
            ? { alignSelf: 'stretch', alignItems: 'flex-end' }
            : { alignSelf: 'stretch', alignItems: 'center' },
        open && !host ? { zIndex: 10, elevation: 10 } : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space8 }}>
        {children ?? (
          <Text variant="bodySmall" style={[{ fontWeight: '700' }, labelStyle]}>
            {label}
          </Text>
        )}
        <View style={open && !host ? { zIndex: 10, elevation: 10 } : null}>
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
          {open && !host && bubble}
        </View>
      </View>
    </View>
  );
};

export default InfoTooltip;
