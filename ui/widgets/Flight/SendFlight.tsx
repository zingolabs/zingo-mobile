/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { themeTokens, useTheme, radiusPill, radiusXs } from '@app/theme';
import { ease } from '@app/theme/motion';
import { PlaneIcon } from '@ui/primitives/Icons/PlaneIcon';
import { samplePath } from './pathPoints';
import MixNode, { NODE_DIM } from './MixNode';

/** Drawn art, not UI: the leaf's two round corners and the plane. */
const LEAF_CORNER = 9;
const PLANE = 26;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** One trip of the plane, in ms. */
const TRIP_MS = 1700;
/** One turn of the ring around the plane while the proof is made. */
const RING_MS = 1600;
/** One turn of the mempool. */
const POOL_MS = 6000;
/** One breath of what waits: the plane bobbing, the transactions in the pool. */
const BEAT_MS = 1200;
const POP_MS = 320;
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
/** The mempool, where the trail ends: its place, the others waiting in it, and ours. */
const POOL = { left: 238, top: 6, size: 48 };
const WAITING = [
  { x: 12, y: 16, at: 0 },
  { x: 35, y: 18, at: 0.25 },
  { x: 18, y: 35, at: 0.5 },
  { x: 33, y: 33, at: 0.75 },
];
const OURS = [
  { x: 24, y: 24, at: 0 },
  { x: 14, y: 28, at: 0.35 },
];
/** The three blocks under the mempool, filled one by one as they confirm. */
const BLOCKS = [214, 243, 272];
const BLOCK_TOP = 104;
const BLOCK = 22;

/** The steps of a send this draws; once sent, the check takes its place. */
export type FlightStep = 'build' | 'nym' | 'pool' | 'conf';

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
          borderTopRightRadius: LEAF_CORNER,
          borderBottomLeftRadius: LEAF_CORNER,
          backgroundColor: themeTokens.bgAccent,
        },
        style,
      ]}
    />
  );
};

/** A dot in the mempool: it jiggles, or ours pulses, a fraction `at` out of step with the others. */
const PoolDot = ({
  x,
  y,
  at,
  r,
  color,
  beat,
  pulse,
}: {
  x: number;
  y: number;
  at: number;
  r: number;
  color: string;
  beat: SharedValue<number>;
  pulse: boolean;
}) => {
  const style = useAnimatedStyle(() => {
    const wave = Math.sin(((beat.value + at) % 1) * 2 * Math.PI);
    const up = (wave + 1) / 2;
    return pulse
      ? {
          opacity: 1 - 0.4 * up,
          transform: [{ scale: 1 + 0.5 * up }],
        }
      : { transform: [{ translateX: 2 * up }, { translateY: -2 * up }] };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - r,
          top: y - r,
          width: 2 * r,
          height: 2 * r,
          borderRadius: radiusPill,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

/** A block under the mempool: it fills green with a small pop when it confirms. */
const Block = ({ left, filled }: { left: number; filled: boolean }) => {
  const { colors } = useTheme();
  const pop = useSharedValue(1);
  useEffect(() => {
    if (filled) {
      const motion = { easing: ease.spring, reduceMotion: ReduceMotion.System };
      pop.value = withSequence(
        withTiming(1.15, { duration: POP_MS / 2, ...motion }),
        withTiming(1, { duration: POP_MS / 2, ...motion }),
      );
    }
  }, [filled, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.View
      testID={filled ? 'computing.block-filled' : undefined}
      style={[
        {
          position: 'absolute',
          left,
          top: BLOCK_TOP,
          width: BLOCK,
          height: BLOCK,
          borderRadius: radiusXs,
          borderWidth: 2,
          borderColor: filled ? colors.fgAccent : NODE_DIM,
          backgroundColor: filled ? colors.bgAccentSubtle : colors.bgSurface,
        },
        style,
      ]}
    />
  );
};

/** Runs `value` from 0 to 1 every `ms`, again and again, while `on`. */
const useLoop = (
  value: SharedValue<number>,
  ms: number,
  on: boolean,
  easing: NonNullable<WithTimingConfig['easing']> = Easing.linear,
) =>
  useEffect(() => {
    if (!on) {
      return;
    }
    value.value = 0;
    value.value = withRepeat(
      withTiming(1, {
        duration: ms,
        easing,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
    );
    return () => cancelAnimation(value);
  }, [value, ms, on, easing]);

const TRIP_EASE = Easing.bezier(0.45, 0, 0.25, 1);

/**
 * A send on its way, drawn on one path. Creating it, the paper plane waits
 * at the start while a dashed ring turns around it: the proof being made.
 * Through NYM, it flies the dotted path through three mix nodes, lighting
 * each and shedding a leaf, again and again. In the mempool it has landed:
 * the trail stays, the nodes stay lit, and our transaction (two, for a TEX
 * send) pulses among others waiting. Confirming, three blocks under the
 * pool fill one by one. 300 x 220, scaled down to `width` when narrower.
 */
export default function SendFlight({
  step = 'nym',
  confirmations = 0,
  pair = false,
  width = 300,
}: {
  step?: FlightStep;
  /** Blocks filled while confirming. */
  confirmations?: number;
  /** A TEX send: two transactions wait in the pool. */
  pair?: boolean;
  width?: number;
}) {
  const { colors } = useTheme();
  /** Linear time through a trip, for what lights and falls on its own clock. */
  const clock = useSharedValue(0);
  /** The same trip eased, for the plane and the trail it draws. */
  const trip = useSharedValue(0);
  /** The turn of the ring, or of the pool. */
  const spin = useSharedValue(0);
  const beat = useSharedValue(0);

  const flying = step === 'nym';
  const landed = step === 'pool' || step === 'conf';
  useLoop(clock, TRIP_MS, flying);
  useLoop(trip, TRIP_MS, flying, TRIP_EASE);
  useLoop(spin, step === 'pool' ? POOL_MS : RING_MS, !flying);
  useLoop(beat, BEAT_MS, step === 'build' || step === 'pool');

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
    if (step === 'build') {
      const bob = (Math.sin(beat.value * 2 * Math.PI) - 1) * 2;
      return {
        opacity: 1,
        transform: [
          { translateX: XS[0] },
          { translateY: YS[0] + bob },
          { rotate: `${TURNS[0]}deg` },
        ],
      };
    }
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
  const turning = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const scale = Math.min(1, width / 300);
  return (
    <View
      testID="computing.flight"
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={{ width: 300 * scale, height: 220 * scale }}
    >
      <View
        testID={`computing.flight.${step}`}
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
          {flying && (
            <>
              <AnimatedPath
                d={FLY}
                fill="none"
                stroke={colors.fgNym}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={[ROUTE.length, ROUTE.length]}
                animatedProps={trail}
              />
              <AnimatedCircle
                cx={276}
                cy={18}
                fill="none"
                stroke={colors.fgNym}
                strokeWidth={2}
                animatedProps={dest}
              />
              {NODES.map(node => (
                <MixNode key={node.at} {...node} clock={clock} />
              ))}
            </>
          )}
          {landed && (
            <Path
              d={FLY}
              fill="none"
              stroke={colors.fgNym}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.35}
            />
          )}
          {!flying &&
            NODES.map(node => (
              <Circle
                key={node.at}
                cx={node.x}
                cy={node.y}
                r={5}
                fill={landed ? colors.bgNymSubtle : colors.bgSurface}
                stroke={landed ? colors.fgNym : NODE_DIM}
                strokeWidth={2}
              />
            ))}
          {step === 'conf' &&
            BLOCKS.slice(1).map(left => (
              <Path
                key={left}
                d={`M${left - 7} ${BLOCK_TOP + BLOCK / 2}h7`}
                stroke={NODE_DIM}
                strokeWidth={2}
                strokeDasharray={[2, 3]}
              />
            ))}
        </Svg>
        {step === 'build' && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 3,
                top: 175,
                width: 42,
                height: 42,
                borderRadius: radiusPill,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: colors.fgAccent,
                opacity: 0.7,
              },
              turning,
            ]}
          />
        )}
        {landed && (
          <View
            style={{
              position: 'absolute',
              left: POOL.left,
              top: POOL.top,
              width: POOL.size,
              height: POOL.size,
              opacity: step === 'conf' ? 0.35 : 1,
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: POOL.size,
                  height: POOL.size,
                  borderRadius: radiusPill,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: NODE_DIM,
                },
                turning,
              ]}
            />
            {WAITING.map(dot => (
              <PoolDot
                key={dot.at}
                {...dot}
                r={3}
                color={colors.borderMuted}
                beat={beat}
                pulse={false}
              />
            ))}
            {step === 'pool' &&
              OURS.slice(0, pair ? 2 : 1).map(dot => (
                <PoolDot
                  key={dot.at}
                  {...dot}
                  r={5}
                  color={colors.fgAccent}
                  beat={beat}
                  pulse={true}
                />
              ))}
          </View>
        )}
        {step === 'conf' &&
          BLOCKS.map((left, i) => (
            <Block key={left} left={left} filled={i < confirmations} />
          ))}
        {(step === 'build' || flying) && (
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
            <PlaneIcon size={PLANE} color={colors.fgDefault} />
          </Animated.View>
        )}
        {flying &&
          LEAVES.map(leaf => <Leaf key={leaf.at} {...leaf} clock={clock} />)}
      </View>
    </View>
  );
}
