/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, iconSize } from '@app/theme';
import { SproutIcon } from '@ui/primitives/Icons/SproutIcon';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING = 2 * Math.PI * 44;
const TICK = 60;
const CROSS = 80;

/**
 * Done, drawn: the ring draws itself, the check follows it, and a sprout
 * pops on its shoulder. Failed, the same ring draws a red cross, and no
 * sprout.
 */
export default function SentMark({
  kind = 'sent',
}: {
  kind?: 'sent' | 'failed';
}) {
  const { colors } = useTheme();
  const failed = kind === 'failed';
  const tone = failed ? colors.fgDanger : colors.fgAccent;
  const mark = failed ? CROSS : TICK;
  const ring = useSharedValue(0);
  const tick = useSharedValue(0);
  const sprout = useSharedValue(0);

  useEffect(() => {
    const motion = { reduceMotion: ReduceMotion.System };
    ring.value = withTiming(1, {
      duration: 600,
      easing: Easing.bezier(0.2, 0, 0, 1),
      ...motion,
    });
    tick.value = withDelay(
      500,
      withTiming(1, {
        duration: 350,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        ...motion,
      }),
    );
    sprout.value = withDelay(
      850,
      withTiming(1, {
        duration: 450,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        ...motion,
      }),
    );
  }, [ring, tick, sprout]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING * (1 - ring.value),
  }));
  const tickProps = useAnimatedProps(() => ({
    strokeDashoffset: mark * (1 - tick.value),
  }));
  const sproutStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sprout.value },
      { rotate: `${-20 * (1 - sprout.value)}deg` },
    ],
  }));

  return (
    <View
      testID={failed ? 'computing.failed' : 'computing.sent'}
      style={{ width: 96, height: 96 }}
    >
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <AnimatedCircle
          cx={48}
          cy={48}
          r={44}
          fill={failed ? colors.bgDangerSubtle : colors.bgAccentSubtle}
          stroke={tone}
          strokeWidth={3}
          strokeDasharray={[RING, RING]}
          rotation={-90}
          origin="48, 48"
          animatedProps={ringProps}
        />
        <AnimatedPath
          d={failed ? 'M35 35 L61 61 M61 35 L35 61' : 'M30 49 l12 12 24-26'}
          fill="none"
          stroke={tone}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[mark, mark]}
          animatedProps={tickProps}
        />
      </Svg>
      {!failed && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              right: -16,
              top: -18,
              transformOrigin: '20% 100%',
            },
            sproutStyle,
          ]}
        >
          <SproutIcon size={iconSize} color={colors.fgAccent} />
        </Animated.View>
      )}
    </View>
  );
}
