/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { CardRect } from '@app/types';

const OPEN_MS = 520;
const CLOSE_MS = 440;
const CLOSE_AT = 100;
const CONTENT_IN_MS = 220;
const CONTENT_IN_AT = 260;
const CONTENT_OUT_MS = 120;
const RADIUS = 14;

type CardExpandProps = {
  from: CardRect;
  // false fades the content, shrinks back into the card, then calls onClosed.
  open: boolean;
  onClosed: () => void;
  children: React.ReactNode;
};

type Frame = { x: number; y: number; width: number; height: number };

// Grows a card into the whole screen (container transform) and back.
const CardExpand: React.FunctionComponent<CardExpandProps> = ({
  from,
  open,
  onClosed,
  children,
}) => {
  const { colors } = useTheme();
  const root = useRef<View>(null);
  const [frame, setFrame] = useState<Frame>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const grow = useSharedValue(0);
  const shown = useSharedValue(0);

  useEffect(() => {
    if (frame.width === 0) {
      return;
    }
    const motion = (ms: number) => ({
      duration: ms,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
    if (open) {
      grow.value = withTiming(1, motion(OPEN_MS));
      shown.value = withDelay(
        CONTENT_IN_AT,
        withTiming(1, {
          duration: CONTENT_IN_MS,
          easing: ease.standard,
          reduceMotion: ReduceMotion.System,
        }),
      );
      return;
    }
    shown.value = withTiming(0, {
      duration: CONTENT_OUT_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
    grow.value = withDelay(
      CLOSE_AT,
      withTiming(0, motion(CLOSE_MS), finished => {
        if (finished) {
          runOnJS(onClosed)();
        }
      }),
    );
  }, [open, frame.width, grow, shown, onClosed]);

  const shell = useAnimatedStyle(() => {
    const g = grow.value;
    return {
      left: (from.x - frame.x) * (1 - g),
      top: (from.y - frame.y) * (1 - g),
      width: from.width + (frame.width - from.width) * g,
      height: from.height + (frame.height - from.height) * g,
      borderRadius: RADIUS * (1 - g),
      backgroundColor: interpolateColor(
        g,
        [0, 0.12, 1],
        [`${colors.bgSurface}00`, colors.bgSurface, colors.bgCanvas],
      ),
    };
  });
  const layer = useAnimatedStyle(() => ({ opacity: shown.value }));

  return (
    <View
      ref={root}
      style={StyleSheet.absoluteFill}
      onLayout={() =>
        root.current?.measureInWindow((x, y, width, height) =>
          setFrame({ x, y, width, height }),
        )
      }
    >
      <Animated.View style={[{ position: 'absolute' }, shell]} />
      <Animated.View style={[StyleSheet.absoluteFill, layer]}>
        {children}
      </Animated.View>
    </View>
  );
};

export default CardExpand;
