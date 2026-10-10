/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ease } from '@app/theme/motion';

export const REVEAL_OPEN_MS = 420;
export const REVEAL_CLOSE_MS = 340;

// A point in window coordinates, the centre the circle grows from.
export type RevealOrigin = { x: number; y: number };

type CircularRevealProps = {
  origin: RevealOrigin;
  // false collapses the circle back into the origin, then calls onClosed.
  open: boolean;
  onClosed: () => void;
  children: React.ReactNode;
};

type Frame = { x: number; y: number; width: number; height: number };

// Shows its children through a circle that grows from `origin` to exactly
// the farthest corner of its own frame, and shrinks back into it.
const CircularReveal: React.FunctionComponent<CircularRevealProps> = ({
  origin,
  open,
  onClosed,
  children,
}) => {
  const root = useRef<View>(null);
  const [frame, setFrame] = useState<Frame>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const radius = useSharedValue(0);

  const cx = origin.x - frame.x;
  const cy = origin.y - frame.y;
  const farthest = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(frame.width - cx, cy),
    Math.hypot(cx, frame.height - cy),
    Math.hypot(frame.width - cx, frame.height - cy),
  );

  useEffect(() => {
    if (frame.width === 0) {
      return;
    }
    radius.value = withTiming(
      open ? farthest : 0,
      {
        duration: open ? REVEAL_OPEN_MS : REVEAL_CLOSE_MS,
        easing: ease.standard,
        reduceMotion: ReduceMotion.System,
      },
      finished => {
        if (finished && !open) {
          runOnJS(onClosed)();
        }
      },
    );
  }, [open, farthest, frame.width, radius, onClosed]);

  const circle = useAnimatedStyle(() => ({
    left: cx - radius.value,
    top: cy - radius.value,
    width: radius.value * 2,
    height: radius.value * 2,
    borderRadius: radius.value,
  }));
  const content = useAnimatedStyle(() => ({
    left: radius.value - cx,
    top: radius.value - cy,
  }));

  return (
    <View
      ref={root}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onLayout={() =>
        root.current?.measureInWindow((x, y, width, height) =>
          setFrame({ x, y, width, height }),
        )
      }
    >
      <Animated.View
        style={[{ position: 'absolute', overflow: 'hidden' }, circle]}
      >
        <Animated.View
          style={[
            { position: 'absolute', width: frame.width, height: frame.height },
            content,
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default CircularReveal;
