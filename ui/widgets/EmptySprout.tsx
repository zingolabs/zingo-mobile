import React, { useEffect } from 'react';
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  type ColumnMajorTransformMatrix,
} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { emptyHistoryArt as art } from '@app/theme/emptyHistoryArt';

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** A group whose `matrix`, the native transform, can be animated. */
const AnimatedG = Animated.createAnimatedComponent(
  G<{ matrix?: ColumnMajorTransformMatrix }>,
);

/**
 * The art is 206 × 227; the padding leaves room for the leaves that bob and
 * turn past its edges.
 */
const PAD = 12;
const VIEW_BOX = `${-PAD} ${-PAD} ${206 + 2 * PAD} ${227 + 2 * PAD}`;
/** Points per viewBox unit. */
const SCALE = 0.68;
const WIDTH = Math.round((206 + 2 * PAD) * SCALE);
const HEIGHT = Math.round((227 + 2 * PAD) * SCALE);
/** The leaf that got away weighs the art to the right; this centres the sprout. */
const NUDGE = { marginLeft: 11 };

type Vec = [number, number];
/** The stem: a rising cubic up to the top of the arch, then the drooping head. */
const BASE: Vec[] = [
  [110, 194.086],
  [107, 165.086],
  [128, 139.086],
  [124, 115.086],
];
const HEAD: Vec[] = [
  [121, 98.086],
  [95, 98.086],
  [90, 116.086],
  [86, 128.086],
  [96, 137.086],
  [93, 151.086],
];
/** The top of the arch, which the head turns around. */
const PV: Vec = [124, 115.086];
const FOOT: Vec = [110, 194.086];

/** One try to stand up, in seconds. */
const CYCLE = 7.8;
/**
 * The clock loops every four tries. The breathing of the leaves fits whole
 * periods in it, so the wrap never shows.
 */
const LOOP = CYCLE * 4;
const turnsPerLoop = (n: number) => (2 * Math.PI * n) / LOOP;
const W_LEFT_LEAF = turnsPerLoop(8);
const W_RIGHT_LEAF = turnsPerLoop(7);
const W_GROUND_1 = turnsPerLoop(5);
const W_GROUND_2 = turnsPerLoop(6);
const W_GROUND_3 = turnsPerLoop(4);
const W_AWAY_BOB = turnsPerLoop(4);
const W_AWAY_TURN = turnsPerLoop(3);
/** How far the head lifts at the top of a try, in degrees. */
const MAX = 40;
const TRAIL_MS = 9000;
/** Ten dash periods (1.6 + 7), so the drifting trail loops seamlessly. */
const TRAIL_SHIFT = -86;

const multiply = (
  m: ColumnMajorTransformMatrix,
  n: ColumnMajorTransformMatrix,
): ColumnMajorTransformMatrix => {
  'worklet';
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
};

const turnAbout = (
  deg: number,
  cx: number,
  cy: number,
): ColumnMajorTransformMatrix => {
  'worklet';
  const cos = Math.cos((deg * Math.PI) / 180);
  const sin = Math.sin((deg * Math.PI) / 180);
  return [
    cos,
    sin,
    -sin,
    cos,
    cx - cos * cx + sin * cy,
    cy - sin * cx - cos * cy,
  ];
};

const turnPoint = ([x, y]: Vec, rad: number): Vec => {
  'worklet';
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - PV[0];
  const dy = y - PV[1];
  return [PV[0] + dx * cos - dy * sin, PV[1] + dx * sin + dy * cos];
};

const pair = (p: Vec) => {
  'worklet';
  return `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
};

/** The stem with its head turned by `deg`; the curve into the arch turns along, so it stays smooth. */
const stemPath = (deg: number): string => {
  'worklet';
  const rad = (deg * Math.PI) / 180;
  const c2 = turnPoint(BASE[2], rad * 0.55);
  const h = HEAD.map(p => turnPoint(p, rad));
  return `M${pair(BASE[0])} C${pair(BASE[1])} ${pair(c2)} ${pair(PV)} C${pair(h[0])} ${pair(h[1])} ${pair(h[2])} C${pair(h[3])} ${pair(h[4])} ${pair(h[5])}`;
};

const easeInOut = (x: number) => {
  'worklet';
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};

/** Rest, push up with a small strain, give up, sink back with a soft bounce. */
const angleAt = (s: number): number => {
  'worklet';
  if (s < 1.6) {
    return 0;
  }
  if (s < 4) {
    return MAX * easeInOut((s - 1.6) / 2.4);
  }
  if (s < 4.6) {
    return MAX + Math.sin((s - 4) * 30) * 0.8 * (1 - (s - 4) / 0.6);
  }
  if (s < 6) {
    return MAX * (1 - easeInOut((s - 4.6) / 1.4));
  }
  const x = (s - 6) / 1.8;
  return -4 * Math.exp(-3.5 * x) * Math.sin(x * Math.PI * 2);
};

const STILL_STEM = stemPath(0);

/**
 * The empty history: a sprout that tries to stand up, can't yet, and settles
 * back down, while the fallen leaves breathe and one that got away drifts.
 * Still under reduce motion.
 */
export default function EmptySprout() {
  const still = useReducedMotion();
  const clock = useSharedValue<number>(0);
  const trail = useSharedValue<number>(0);

  useEffect(() => {
    if (still) {
      return;
    }
    clock.value = withRepeat(
      withTiming(LOOP, { duration: LOOP * 1000, easing: Easing.linear }),
      -1,
    );
    trail.value = withRepeat(
      withTiming(TRAIL_SHIFT, { duration: TRAIL_MS, easing: Easing.linear }),
      -1,
    );
    return () => {
      cancelAnimation(clock);
      cancelAnimation(trail);
    };
  }, [still, clock, trail]);

  const stemProps = useAnimatedProps(() => ({
    d: stemPath(angleAt(clock.value % CYCLE)),
  }));
  const plantProps = useAnimatedProps(() => {
    const lift = Math.max(0, angleAt(clock.value % CYCLE)) / MAX;
    const sx = 1 + 0.02 * lift;
    const sy = 1 + 0.06 * lift;
    const matrix: ColumnMajorTransformMatrix = [
      sx,
      0,
      0,
      sy,
      FOOT[0] - sx * FOOT[0],
      FOOT[1] - sy * FOOT[1],
    ];
    return { matrix };
  });
  /** The left leaf hangs from the head and lags behind it. */
  const leftLeafProps = useAnimatedProps(() => {
    const t = clock.value;
    const deg = angleAt(t % CYCLE);
    return {
      matrix: multiply(
        turnAbout(deg, PV[0], PV[1]),
        turnAbout(-deg * 0.28 + Math.sin(t * W_LEFT_LEAF) * 1.2, 94, 130.086),
      ),
    };
  });
  /** The side branch lifts its leaf a little. */
  const branchProps = useAnimatedProps(() => ({
    matrix: turnAbout(-angleAt(clock.value % CYCLE) * 0.16, 116, 155.086),
  }));
  const rightLeafProps = useAnimatedProps(() => {
    const t = clock.value;
    return {
      matrix: turnAbout(
        -angleAt(t % CYCLE) * 0.22 + Math.sin(t * W_RIGHT_LEAF + 1) * 1.4,
        146,
        135.086,
      ),
    };
  });
  const ground1Props = useAnimatedProps(() => ({
    matrix: turnAbout(Math.sin(clock.value * W_GROUND_1) * 3, 30, 194),
  }));
  const ground2Props = useAnimatedProps(() => ({
    matrix: turnAbout(Math.sin(clock.value * W_GROUND_2 + 1) * 2.5, 173, 203),
  }));
  const ground3Props = useAnimatedProps(() => ({
    matrix: turnAbout(Math.sin(clock.value * W_GROUND_3 + 2) * 2, 51, 221),
  }));
  const awayProps = useAnimatedProps(() => {
    const t = clock.value;
    return {
      matrix: multiply(
        [1, 0, 0, 1, 0, Math.sin(t * W_AWAY_BOB) * 3],
        turnAbout(Math.sin(t * W_AWAY_TURN) * 5, 186, 20),
      ),
    };
  });
  const trailProps = useAnimatedProps(() => ({
    strokeDashoffset: trail.value,
  }));

  return (
    <Svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={VIEW_BOX}
      fill="none"
      style={NUDGE}
    >
      <Defs>
        <LinearGradient
          id="emptySproutGround"
          x1="20"
          y1="181.086"
          x2="20"
          y2="217.086"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={art.groundTop} />
          <Stop offset="1" stopColor={art.groundBottom} />
        </LinearGradient>
        <LinearGradient
          id="emptySproutStem"
          x1="89.041"
          y1="102.458"
          x2="124.509"
          y2="102.458"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={art.stemDeep} />
          <Stop offset=".5" stopColor={art.stemLight} />
          <Stop offset="1" stopColor={art.stemOuter} />
        </LinearGradient>
        <LinearGradient
          id="emptySproutBranch"
          x1="116"
          y1="135.204"
          x2="147"
          y2="135.204"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={art.stemDeep} />
          <Stop offset=".5" stopColor={art.stemLight} />
          <Stop offset="1" stopColor={art.stemOuter} />
        </LinearGradient>
        <LinearGradient
          id="emptySproutLeftLeaf"
          x1="52.7012"
          y1="119.9"
          x2="113.339"
          y2="156.904"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={art.leafLight} />
          <Stop offset=".52" stopColor={art.leafMid} />
          <Stop offset="1" stopColor={art.leafDeep} />
        </LinearGradient>
        <LinearGradient
          id="emptySproutRightLeaf"
          x1="145.686"
          y1="131.69"
          x2="200.52"
          y2="164.313"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={art.leafLight} />
          <Stop offset=".52" stopColor={art.leafMid} />
          <Stop offset="1" stopColor={art.leafDeep} />
        </LinearGradient>
      </Defs>

      <AnimatedG animatedProps={awayProps}>
        <Path
          d="M168 27.0864C175.333 11.0864 187.333 2.41976 204 1.08643C203.333 19.7531 194 32.0864 176 38.0864"
          strokeWidth={2}
          stroke={art.away}
        />
      </AnimatedG>
      <AnimatedPath
        animatedProps={trailProps}
        d="M176 37.1C164 44 150 54 148.8 65.9C148 76 154 90 167.5 102.2C180 110 192 120 191.8 128.1C191.6 135 187 141 181 145.1"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray={[1.6, 7]}
        stroke={art.away}
      />

      <Path
        opacity={0.75}
        d="M109 217.086C158.153 217.086 198 209.028 198 199.086C198 189.145 158.153 181.086 109 181.086C59.8467 181.086 20 189.145 20 199.086C20 209.028 59.8467 217.086 109 217.086Z"
        fill="url(#emptySproutGround)"
      />
      <Path
        d="M47 201.086C57.6667 189.086 67 186.42 75 193.086C82.3333 180.42 90.6667 177.42 100 184.086C108.667 172.086 118.333 171.086 129 181.086C141 173.753 151 176.753 159 190.086C167.667 188.753 174 192.086 178 200.086"
        fill={art.groundTop}
        stroke={art.moundStroke}
      />
      <Path
        d="M66 204.086L74 195.086L82 203.086M103 206.086L112 193.086L120 206.086M137 204.086L145 194.086L153 203.086"
        strokeWidth={1.3}
        stroke={art.moundStroke}
      />

      <AnimatedG animatedProps={plantProps}>
        <AnimatedPath
          animatedProps={stemProps}
          d={STILL_STEM}
          strokeWidth={13}
          strokeLinecap="round"
          stroke={art.stemOuter}
        />
        <AnimatedPath
          animatedProps={stemProps}
          d={STILL_STEM}
          strokeWidth={8}
          strokeLinecap="round"
          stroke="url(#emptySproutStem)"
        />
        <AnimatedG animatedProps={branchProps}>
          <Path
            d="M116 155.086C128 137.753 138.333 131.753 147 137.086"
            strokeWidth={6}
            strokeLinecap="round"
            stroke="url(#emptySproutBranch)"
          />
          <AnimatedG animatedProps={rightLeafProps}>
            <Path
              d="M146 135.086C168 125.086 187 138.086 182 162.086C178 177.086 165 189.086 157 194.086C152 170.086 144 153.086 146 135.086Z"
              fill="url(#emptySproutRightLeaf)"
              strokeWidth={1.6}
              stroke={art.leafLight}
            />
            <Path
              opacity={0.5}
              d="M148 136.086C150.077 140.241 151.857 144.412 153.34 148.599M153.34 148.599C154.603 152.165 155.65 155.742 156.481 159.331M153.34 148.599L152 149.086M153.34 148.599L174 141.086M156.481 159.331C157.423 163.394 158.088 167.472 158.477 171.565M156.481 159.331L154 160.086M156.481 159.331L177 153.086M158.477 171.565C159.155 178.692 158.996 185.866 158 193.086M158.477 171.565L157 172.086M158.477 171.565L174 166.086"
              stroke={art.vein}
            />
          </AnimatedG>
        </AnimatedG>
        <AnimatedG animatedProps={leftLeafProps}>
          <Path
            d="M94.0001 130.086C70.0001 110.086 50.0001 122.086 53.0001 144.086C55.0001 169.086 74.0001 184.086 80.0001 188.086C88.0001 169.086 96.0001 148.086 94.0001 130.086Z"
            fill="url(#emptySproutLeftLeaf)"
            strokeWidth={1.6}
            stroke={art.leafLight}
          />
          <Path
            opacity={0.5}
            d="M92 132.086C86.4964 138.885 82.7221 146.627 80.6772 155.312M80.6772 155.312C79.9244 158.509 79.406 161.834 79.1219 165.287M80.6772 155.312L83 156.086M80.6772 155.312L59 148.086M79.1219 165.287C78.5886 171.77 78.8813 178.703 80 186.086M79.1219 165.287L82 166.086M79.1219 165.287L64 161.086M84 144.086L63 134.086"
            stroke={art.vein}
          />
        </AnimatedG>
      </AnimatedG>

      <AnimatedG animatedProps={ground1Props}>
        <Path
          d="M30 194.087C20 184.753 10 183.087 0 189.087C6.66667 199.087 16.6667 200.753 30 194.087Z"
          fill={art.fallenDeep}
        />
      </AnimatedG>
      <AnimatedG animatedProps={ground2Props}>
        <Path
          d="M173 203.086C183.667 193.086 194.667 191.42 206 198.086C196.667 207.42 185.667 209.086 173 203.086Z"
          fill={art.fallenMid}
        />
      </AnimatedG>
      <AnimatedG animatedProps={ground3Props}>
        <Path
          d="M63 221.087C54.3333 215.087 46.3333 215.42 39 222.087C47 228.087 55 227.754 63 221.087Z"
          fill={art.fallenDeep}
        />
      </AnimatedG>
    </Svg>
  );
}
