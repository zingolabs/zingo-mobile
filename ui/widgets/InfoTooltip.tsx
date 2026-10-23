/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  TextStyle,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  // The bubble prefers to open under the icon instead of above it.
  below?: boolean;
  // Shown before the icon in place of the label text, which then only
  // names the icon for accessibility.
  children?: React.ReactNode;
};

const ARROW = 10;
const GAP = 8;
const BUBBLE_W = 236;
/** The bubble keeps this far from every edge of the screen. */
const EDGE = space16;

type Anchor = { x: number; y: number; w: number; h: number };

/**
 * Where the bubble goes on screen: centred on the icon, shifted to stay
 * EDGE inside both sides, above the icon unless asked for below or there is
 * no room above (inside the safe area), with the arrow under the icon.
 */
export function placeBubble({
  anchor,
  bubbleH,
  screenW,
  screenH,
  insetTop,
  insetBottom,
  below,
}: {
  anchor: Anchor;
  bubbleH: number;
  screenW: number;
  screenH: number;
  insetTop: number;
  insetBottom: number;
  below?: boolean;
}): {
  left: number;
  top: number;
  width: number;
  under: boolean;
  arrowLeft: number;
} {
  const width = Math.min(BUBBLE_W, screenW - EDGE * 2);
  const centre = anchor.x + anchor.w / 2;
  const left = Math.min(
    Math.max(centre - width / 2, EDGE),
    screenW - EDGE - width,
  );
  const roomAbove = anchor.y - insetTop - EDGE;
  const roomBelow = screenH - insetBottom - EDGE - (anchor.y + anchor.h);
  const under =
    (!!below && roomBelow >= bubbleH + GAP) || roomAbove < bubbleH + GAP;
  const top = under ? anchor.y + anchor.h + GAP : anchor.y - GAP - bubbleH;
  const arrowLeft = Math.min(
    Math.max(centre - left - ARROW / 2, space12),
    width - space12 - ARROW,
  );
  return { left, top, width, under, arrowLeft };
}

const bubbleEnter = (rise: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: rise }] },
    100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  })
    .duration(180)
    .reduceMotion(ReduceMotion.System);

/**
 * A label with an info icon; the icon opens a bubble that explains it. The
 * bubble is drawn in a layer over the whole screen, at the icon's place on
 * screen, so no card or sheet clips it, and it stays inside the screen: it
 * shifts sideways near a side and opens below when there is no room above.
 * A tap anywhere closes it.
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
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [openOwn, setOpenOwn] = useState(false);
  const open = openProp ?? openOwn;
  const onToggle = onToggleProp ?? setOpenOwn;
  const iconRef = useRef<View>(null);
  const layerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  /**
   * The layer's own place in the same coordinates as the icon's: the
   * layer may start above the app's window (under a translucent status
   * bar), so the icon is placed relative to it, not to the screen.
   */
  const [layer, setLayer] = useState<Anchor | null>(null);
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
      setAnchor(null);
      setLayer(null);
      setBubbleH(0);
      iconRef.current?.measureInWindow((x, y, w, h) =>
        setAnchor({ x, y, w, h }),
      );
    }
    onToggle(!open);
  };
  const close = () => onToggle(false);

  const place =
    anchor && layer && bubbleH > 0
      ? placeBubble({
          anchor: {
            ...anchor,
            x: anchor.x - layer.x,
            y: anchor.y - layer.y,
          },
          bubbleH,
          screenW: layer.w || screenW,
          screenH: layer.h || screenH,
          insetTop: insets.top,
          insetBottom: insets.bottom,
          below,
        })
      : null;
  const under = !!place?.under;

  return (
    <View
      style={
        alignStart
          ? { alignItems: 'flex-start' }
          : alignEnd
            ? { alignSelf: 'stretch', alignItems: 'flex-end' }
            : { alignSelf: 'stretch', alignItems: 'center' }
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space8 }}>
        {children ?? (
          <Text variant="bodySmall" style={[{ fontWeight: '700' }, labelStyle]}>
            {label}
          </Text>
        )}
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
      </View>
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={close}
      >
        <Pressable
          ref={layerRef}
          testID={testID ? `${testID}-close` : undefined}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={close}
          onLayout={() =>
            layerRef.current?.measureInWindow((x, y, w, h) =>
              setLayer({ x, y, w, h }),
            )
          }
          style={{ flex: 1 }}
        >
          <Animated.View
            entering={bubbleEnter(under ? -4 : 4)}
            onLayout={e => setBubbleH(e.nativeEvent.layout.height)}
            style={{
              position: 'absolute',
              left: place?.left ?? EDGE,
              top: place?.top ?? 0,
              width: place?.width ?? Math.min(BUBBLE_W, screenW - EDGE * 2),
              /** Hidden until the icon and the bubble are both measured. */
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
                ...(under ? { top: -ARROW / 2 } : { bottom: -ARROW / 2 }),
                left: place?.arrowLeft ?? space12,
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
        </Pressable>
      </Modal>
    </View>
  );
};

export default InfoTooltip;
