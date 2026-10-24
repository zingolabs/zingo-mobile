/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { themeTokens, useTheme } from '@app/theme';
import { PlaneIcon } from '@ui/primitives/Icons/PlaneIcon';
import { samplePath } from './pathPoints';
import MixNode, { NODE_DIM } from './MixNode';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** One trip of the plane, in ms. */
const TRIP_MS = 1700;
const FLY = 'M24 196 C 96 190 118 96 168 86 S 236 40 276 18';
const ROUTE = samplePath(
  [
    [
      [24, 196],
      [96, 190],
      [118, 96],
      [168, 86],
    ],
    [
      [168, 86],
      [218, 76],
      [236, 40],
      [276, 18],
    ],
  ],
  48,
);
const STOPS = ROUTE.points.map((_, i) => i / (ROUTE.points.length - 1));
const XS = ROUTE.points.map(p => p.x - 13);
const YS = ROUTE.points.map(p => p.y - 13);
/** The plane icon points up-right; on the path it turns to face its way. */
const TURNS = ROUTE.points.map(p => p.angle + 45);
/** The mix nodes the plane passes, with where along the trip it reaches them. */
const NODES = [
  { x: 92, y: 183, at: 0.24 },
  { x: 160, y: 88, at: 0.5 },
  { x: 232, y: 48, at: 0.76 },
];
/** Leaves shed on the way, with when in the trip each one falls. */
const LEAVES = [
  { left: 84, top: 168, at: 350 / TRIP_MS },
  { left: 150, top: 96, at: 750 / TRIP_MS },
  { left: 222, top: 50, at: 1100 / TRIP_MS },
];

const Leaf = ({
  left,
  top,
  at,
  clock,
}: {
  left: number;
  top: number;
  at: number;
  clock: SharedValue<number>;
}) => {
  const style = useAnimatedStyle(() => {
    const local = (clock.value + 1 - at) % 1;
    const fall = Easing.out(Easing.ease)(local);
    return {
      opacity: interpolate(fall, [0, 0.25, 1], [0, 0.85, 0]),
      transform: [
        { translateX: interpolate(fall, [0.25, 1], [0, -6], 'clamp') },
        { translateY: interpolate(fall, [0.25, 1], [0, 22], 'clamp') },
        { scale: interpolate(fall, [0, 0.25, 1], [0.3, 1, 0.8]) },
        { rotate: `${interpolate(fall, [0, 0.25, 1], [0, 15, 70])}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: 9,
          height: 13,
          borderTopRightRadius: 9,
          borderBottomLeftRadius: 9,
          backgroundColor: themeTokens.bgAccent,
        },
        style,
      ]}
    />
  );
};

/**
 * Sending, drawn: a paper plane flies a dotted path through three mix
 * nodes, lighting each as it passes and shedding a leaf, again and again
 * until the send settles. 300 x 220, scaled down to `width` when narrower.
 */
export default function SendFlight({ width = 300 }: { width?: number }) {
  const { colors } = useTheme();
  /** Linear time through a trip, for what lights and falls on its own clock. */
  const clock = useSharedValue(0);
  /** The same trip eased, for the plane and the trail it draws. */
  const trip = useSharedValue(0);

  useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, {
        duration: TRIP_MS,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
    );
    trip.value = withRepeat(
      withTiming(1, {
        duration: TRIP_MS,
        easing: Easing.bezier(0.45, 0, 0.25, 1),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
    );
  }, [clock, trip]);

  const trail = useAnimatedProps(() => ({
    strokeDashoffset: ROUTE.length * (1 - trip.value),
    opacity: interpolate(trip.value, [0, 0.82, 1], [1, 1, 0]),
  }));
  const dest = useAnimatedProps(() => {
    const p = clock.value;
    return {
      opacity: interpolate(p, [0, 0.72, 0.84, 1], [0, 0, 1, 0]),
      r: 6 * interpolate(p, [0, 0.72, 1], [0.4, 0.4, 2.6]),
    };
  });
  const plane = useAnimatedStyle(() => {
    const p = trip.value;
    return {
      opacity: interpolate(p, [0, 0.12, 0.82, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(p, STOPS, XS) },
        { translateY: interpolate(p, STOPS, YS) },
        { rotate: `${interpolate(p, STOPS, TURNS)}deg` },
        { scale: interpolate(p, [0, 0.12, 1], [0.7, 1, 0.85]) },
      ],
    };
  });

  const scale = Math.min(1, width / 300);
  return (
    <View
      testID="computing.flight"
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={{ width: 300 * scale, height: 220 * scale }}
    >
      <View
        style={{
          width: 300,
          height: 220,
          transform: [{ scale }],
          transformOrigin: 'top left',
        }}
      >
        <Svg
          width={300}
          height={220}
          viewBox="0 0 300 220"
          style={{ position: 'absolute', overflow: 'visible' }}
        >
          <Path
            d={FLY}
            fill="none"
            stroke={NODE_DIM}
            strokeWidth={2}
            strokeDasharray={[1, 7]}
            strokeLinecap="round"
          />
          <AnimatedPath
            d={FLY}
            fill="none"
            stroke={colors.bgNym}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={[ROUTE.length, ROUTE.length]}
            animatedProps={trail}
          />
          <AnimatedCircle
            cx={276}
            cy={18}
            fill="none"
            stroke={colors.bgNym}
            strokeWidth={2}
            animatedProps={dest}
          />
          {NODES.map(node => (
            <MixNode key={node.at} {...node} clock={clock} />
          ))}
        </Svg>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: 26,
              height: 26,
              alignItems: 'center',
              justifyContent: 'center',
            },
            plane,
          ]}
        >
          <PlaneIcon size={26} color={colors.fgDefault} />
        </Animated.View>
        {LEAVES.map(leaf => (
          <Leaf key={leaf.at} {...leaf} clock={clock} />
        ))}
      </View>
    </View>
  );
}
