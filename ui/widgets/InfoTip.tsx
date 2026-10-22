/* eslint-disable react-native/no-inline-styles */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { Keyframe, ReduceMotion } from 'react-native-reanimated';
import { slopFor, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';

const WIDTH = 250;
const EDGE = 14;
const GAP = 10;
const ARROW = 10;

type Anchor = { x: number; y: number; w: number; h: number };
type Shown = { text: string; anchor: Anchor };

const InfoTipContext = createContext<(shown: Shown) => void>(() => {});

const enter = (rise: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: rise }, { scale: 0.92 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
  })
    .duration(220)
    .reduceMotion(ReduceMotion.System);
const exit = new Keyframe({ 0: { opacity: 1 }, 100: { opacity: 0 } })
  .duration(140)
  .reduceMotion(ReduceMotion.System);

/**
 * Holds the one tooltip a screen shows: a bubble under the icon that opened
 * it, or over it when there is no room below. Any touch outside closes it,
 * the icon included, so it never stays open by mistake.
 */
export function InfoTipHost({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const hostRef = useRef<View>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [shown, setShown] = useState<Shown | null>(null);
  const [bubbleH, setBubbleH] = useState<number>(0);

  const show = useCallback((next: Shown) => {
    hostRef.current?.measureInWindow((x, y) => setOrigin({ x, y }));
    setBubbleH(0);
    setShown(next);
  }, []);
  const hide = useCallback(() => setShown(null), []);

  const layout = useMemo(() => {
    if (!shown) {
      return null;
    }
    const { anchor } = shown;
    const cx = anchor.x + anchor.w / 2;
    const left = Math.max(
      EDGE,
      Math.min(cx - WIDTH / 2, screenW - WIDTH - EDGE),
    );
    const below = anchor.y + anchor.h + GAP;
    const up = bubbleH > 0 && below + bubbleH > screenH - 24;
    const top = up ? anchor.y - bubbleH - GAP : below;
    const arrowX = Math.max(16, Math.min(cx - left, WIDTH - 16));
    return { left: left - origin.x, top: top - origin.y, up, arrowX };
  }, [shown, bubbleH, screenW, screenH, origin]);

  return (
    <InfoTipContext.Provider value={show}>
      <View ref={hostRef} style={{ flex: 1 }} collapsable={false}>
        {children}
        {!!shown && !!layout && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={shown.text}
              onPress={hide}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
            <Animated.View
              key={shown.text}
              entering={enter(layout.up ? 6 : -6)}
              exiting={exit}
              pointerEvents="none"
              onLayout={e => setBubbleH(e.nativeEvent.layout.height)}
              accessibilityRole="text"
              style={{
                position: 'absolute',
                left: layout.left,
                top: layout.top,
                width: WIDTH,
                opacity: bubbleH ? 1 : 0,
                paddingVertical: 11,
                paddingHorizontal: 13,
                borderRadius: 13,
                backgroundColor: colors.bgSurface,
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: layout.arrowX - ARROW / 2,
                  ...(layout.up ? { bottom: -ARROW / 2 } : { top: -ARROW / 2 }),
                  width: ARROW,
                  height: ARROW,
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.bottomSheetBorder,
                  ...(layout.up
                    ? { borderRightWidth: 1, borderBottomWidth: 1 }
                    : { borderLeftWidth: 1, borderTopWidth: 1 }),
                  transform: [{ rotate: '45deg' }],
                }}
              />
              <Text variant="caption" style={{ lineHeight: 18 }}>
                {shown.text}
              </Text>
            </Animated.View>
          </>
        )}
      </View>
    </InfoTipContext.Provider>
  );
}

/** The info icon that opens its text in the screen's tooltip. */
export function InfoTipButton({
  text,
  label,
  testID,
}: {
  text: string;
  /** What the icon is about, for screen readers. */
  label: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const show = useContext(InfoTipContext);
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={slopFor(24)}
      onPress={() =>
        ref.current?.measureInWindow((x, y, w, h) =>
          show({ text, anchor: { x, y, w, h } }),
        )
      }
      style={{
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: -4,
      }}
    >
      <InfoIcon size={14} color={colors.fgMuted} />
    </Pressable>
  );
}
