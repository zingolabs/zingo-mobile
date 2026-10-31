import React, { useCallback, useContext, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  LayoutRectangle,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@app/theme';
import { duration } from '@app/theme/motion';
import { SurfaceContext, SurfaceKind } from '@ui/primitives/Surface';

/** How far content fades into the fixed bar above or below it. */
export const EDGE_FADE = 24;

/** What the scroll view passes on, to report where it is. */
export type ScrollEdgeProps = {
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onLayout: (e: LayoutChangeEvent) => void;
  onContentSizeChange: (w: number, h: number) => void;
  scrollEventThrottle: number;
};

/** `color` with no alpha, so the fade stays in its hue rather than greying. */
const clear = (color: string) =>
  /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : 'transparent';

const Fade: React.FunctionComponent<{
  shown: boolean;
  side: 'top' | 'bottom';
  color: string;
  top: number;
  left: number;
  width: number;
}> = ({ shown, side, color, top, left, width }) => {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(shown ? 1 : 0, {
      duration: duration.fast,
      reduceMotion: ReduceMotion.System,
    }),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fade, { top, left, width }, style]}
    >
      <LinearGradient
        colors={side === 'top' ? [color, clear(color)] : [clear(color), color]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </Animated.View>
  );
};

/**
 * Makes a scroll view's content fade, over 24, into the fixed title above it
 * and the actions below it, instead of being cut by a straight line. Each
 * fade shows only while content runs under it, and ends in what the scroll
 * sits on: the canvas, or the surface of a panel or sheet.
 *
 * Spread `edges` on the scroll view and render `fades` right after it, in the
 * same parent: they take their place from the scroll view's layout. A scroll
 * view with its own `onScroll` or the rest calls these from its own.
 * `bottomInset` lifts the bottom fade above a footer laid over the scroll;
 * `surface` names what the scroll sits on where the context does not yet.
 */
export function useScrollEdges({
  bottomInset = 0,
  surface: on,
}: { bottomInset?: number; surface?: SurfaceKind } = {}): {
  edges: ScrollEdgeProps;
  fades: React.ReactNode;
} {
  const { colors } = useTheme();
  const context = useContext(SurfaceContext);
  const surface = on ?? context;
  const color = surface === 'surface' ? colors.bgSurface : colors.bgCanvas;

  const offset = useRef(0);
  const frame = useRef(0);
  const content = useRef(0);
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const [above, setAbove] = useState(false);
  const [below, setBelow] = useState(false);

  const update = useCallback(() => {
    setAbove(offset.current > 1);
    setBelow(offset.current + frame.current < content.current - 1);
  }, []);

  const edges: ScrollEdgeProps = {
    onScroll: e => {
      offset.current = e.nativeEvent.contentOffset.y;
      frame.current = e.nativeEvent.layoutMeasurement.height;
      content.current = e.nativeEvent.contentSize.height;
      update();
    },
    onLayout: e => {
      const layout = e.nativeEvent.layout;
      frame.current = layout.height;
      setBox(layout);
      update();
    },
    onContentSizeChange: (_w, h) => {
      content.current = h;
      update();
    },
    scrollEventThrottle: 16,
  };

  const fades = box && (
    <>
      <Fade
        shown={above}
        side="top"
        color={color}
        top={box.y}
        left={box.x}
        width={box.width}
      />
      <Fade
        shown={below}
        side="bottom"
        color={color}
        top={box.y + box.height - bottomInset - EDGE_FADE}
        left={box.x}
        width={box.width}
      />
    </>
  );

  return { edges, fades };
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', height: EDGE_FADE },
});
