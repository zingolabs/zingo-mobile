import React from 'react';
import { Circle } from 'react-native-svg';
import Animated, {
  interpolate,
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import { themeTokens, useTheme } from '@app/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A mix node at rest, and the dotted track between them. */
export const NODE_DIM = themeTokens.sheetHandle;

/**
 * A mix node on a flight's path: it lights up in Nym green when what flies
 * passes it, a fraction `at` into the trip on `clock`, and dims again.
 */
export default function MixNode({
  x,
  y,
  at,
  clock,
}: {
  x: number;
  y: number;
  at: number;
  clock: SharedValue<number>;
}) {
  const lit = useAnimatedProps(() => {
    const local = (clock.value + 1 - at) % 1;
    const on = interpolate(local, [0, 0.04, 0.2, 1], [1, 1, 0, 0]);
    return { opacity: on, r: 5 * (1 + 0.35 * on) };
  });
  const { colors } = useTheme();
  return (
    <>
      <Circle
        cx={x}
        cy={y}
        r={5}
        fill={colors.bgSurface}
        stroke={NODE_DIM}
        strokeWidth={2}
      />
      <AnimatedCircle
        cx={x}
        cy={y}
        fill={colors.bgNymSubtle}
        stroke={colors.bgNym}
        strokeWidth={2}
        animatedProps={lit}
      />
    </>
  );
}
