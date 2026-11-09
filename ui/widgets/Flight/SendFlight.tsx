/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { ease } from '@app/theme/motion';
import { sendArt as art } from '@app/theme/sendArt';
import { samplePath } from './pathPoints';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const WIDTH = 300;
const HEIGHT = 220;

const TRIP_MS = 1700;
const RING_MS = 1800;
const ORBIT_MS = 6000;
const BEAT_MS = 1200;
const POOL_BEAT_MS = 1300;
const JIG_MS = 1400;
/** How long the plane sits unfolded before it starts to bob. */
const BOB_AFTER_MS = 1100;
const BOB = 4;

const FLY =
  'M74 138 C 124 140 170 132 174 108 C 178 86 148 86 158 66 C 168 47 206 42 246 40';
type Vec = [number, number];
const SEGMENTS: [Vec, Vec, Vec, Vec][] = [
  [
    [74, 138],
    [124, 140],
    [170, 132],
    [174, 108],
  ],
  [
    [174, 108],
    [178, 86],
    [148, 86],
    [158, 66],
  ],
  [
    [158, 66],
    [168, 47],
    [206, 42],
    [246, 40],
  ],
];
const ROUTE = samplePath(SEGMENTS, 48);
const STOPS = ROUTE.points.map((_, i) => i / (ROUTE.points.length - 1));
const PLANE = { width: 34, height: 36 };
const XS = ROUTE.points.map(p => p.x - PLANE.width / 2);
const YS = ROUTE.points.map(p => p.y - PLANE.height / 2);
const TURNS = ROUTE.points.map(p => p.angle + 48);

/**
 * A dashed path that grows: the first n dashes at index n, so it appears
 * dash by dash. A mask over one dashed path would be shorter, but native
 * renderers do not redraw a mask when what is inside it moves.
 */
const growingDashes = (
  segments: [Vec, Vec, Vec, Vec][],
  dash: number,
  gap: number,
) => {
  const { length } = samplePath(segments, 2);
  const fine = samplePath(segments, Math.ceil(length) + 1).points;
  const start = `M${fine[0].x} ${fine[0].y}`;
  return Array.from(
    { length: Math.floor(length / (dash + gap)) + 1 },
    (_, n) =>
      Array.from({ length: n }, (__, k) => {
        const from = fine[Math.round(k * (dash + gap))];
        const to = fine[Math.round(k * (dash + gap) + dash)];
        return `M${from.x.toFixed(1)} ${from.y.toFixed(1)}L${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
      }).join('') || start,
  );
};

const TRAILS = growingDashes(SEGMENTS, 3, 8);
const dashCount = TRAILS.length - 1;

/**
 * The mix nodes, 30%, 56% and 80% along the route, and the leaf each sheds.
 * `lights` and `passes` are the fractions of the eased trip at which the plane
 * nears and reaches the node; each leaf falls on the side clear of the route.
 */
const NODES = [
  {
    at: 0.3,
    x: 149.549,
    y: 130.217,
    r: 2.8,
    lights: 0.23,
    passes: 0.31,
    leaf: { x: 149.549, y: 142.217 },
  },
  {
    at: 0.56,
    x: 159.425,
    y: 81.932,
    r: 3.4,
    lights: 0.332,
    passes: 0.412,
    leaf: { x: 153.425, y: 90.932 },
  },
  {
    at: 0.8,
    x: 195.387,
    y: 45.567,
    r: 2.8,
    lights: 0.471,
    passes: 0.551,
    leaf: { x: 195.387, y: 57.567 },
  },
];
const LEAF_FALL = 24;

const POOL_DOTS = [
  { x: 228, y: 30, at: 0 },
  { x: 264, y: 27, at: 0.25 },
  { x: 232, y: 58, at: 0.5 },
  { x: 263, y: 55, at: 0.75 },
];
const POOL_CENTER = { x: 246, y: 40 };

const BADGE = { x: 283, y: 14, r: 11 };
const ARCS = [
  'M286.18 -1.68 A16 16 0 0 1 298.17 19.09',
  'M294.99 24.59 A16 16 0 0 1 271.01 24.59',
  'M267.83 19.09 A16 16 0 0 1 279.82 -1.68',
];
const SPARKS = [
  { x: 0, y: -20 },
  { x: 17, y: -10 },
  { x: 18, y: 9 },
  { x: 0, y: 20 },
  { x: -17, y: 10 },
  { x: -17, y: -9 },
];

/** The sprout is drawn large and shown at 56%: this viewBox places it. */
const PLANT_SCALE = 0.56;
const PLANT_X = 14;
const PLANT_Y = 51.5;
const PLANT_BOX = `${-PLANT_X / PLANT_SCALE} ${-PLANT_Y / PLANT_SCALE} ${WIDTH / PLANT_SCALE} ${HEIGHT / PLANT_SCALE}`;
const inPlant = (x: number, y: number) =>
  `${PLANT_X + x * PLANT_SCALE}px ${PLANT_Y + y * PLANT_SCALE}px`;
const COIN = { x: 75.15, y: 258.14 };
const COIN_ORIGIN = inPlant(COIN.x, COIN.y);
const LEFT_LEAF_ORIGIN = inPlant(71.67, 221.47);
const RIGHT_LEAF_ORIGIN = inPlant(75.15, 203.48);
const STEM_LENGTH = 84.526;

const TRIP_EASE = Easing.bezier(0.45, 0, 0.25, 1);
const REDUCE = { reduceMotion: ReduceMotion.System };

/**
 * The paper planes of a send. The second, of a TEX send, is smaller and rides
 * behind the first: it hangs from `anchor` instead of its middle, and `scale`
 * draws its whole route smaller too, as in the design.
 */
const PLANES = [
  { anchor: { x: PLANE.width / 2, y: PLANE.height / 2 }, scale: 1, index: 0 },
  { anchor: { x: 40.12, y: 29.52 }, scale: 0.8, index: 1 },
];
type PlaneShape = (typeof PLANES)[number];
const PAIR_LAG_MS = 140;

const REACH_MS = 800;
const FALL_POINTS = 32;
/** A falling plane is gone before the end of its branch. */
const FALL_END = 0.78;
const FALL_STOPS = Array.from(
  { length: FALL_POINTS },
  (_, i) => i / (FALL_POINTS - 1),
);
const TIMER_R = 17;
const TIMER_LENGTH = 2 * Math.PI * TIMER_R;

/**
 * A failure's branch off the route: how far the plane got, how long it waits
 * there, the dotted way down from `from` by its `bends` (relative to `from`),
 * and the red badge that closes it, at `badge`.
 */
const makeBranch = ({
  along,
  wait,
  timed = false,
  node,
  from,
  bends,
  badge,
  icon,
}: {
  along: number;
  wait: number;
  timed?: boolean;
  node?: (typeof NODES)[number];
  from: Vec;
  bends: [Vec, Vec, Vec];
  badge: Vec;
  icon: 'cross' | 'clock';
}) => {
  const [c1, c2, c3] = bends.map(([x, y]): Vec => [
    from[0] + x,
    from[1] + y,
  ]) as [Vec, Vec, Vec];
  const way: [Vec, Vec, Vec, Vec][] = [[from, c1, c2, c3]];
  const points = samplePath(way, FALL_POINTS).points;
  const bx = from[0] + badge[0];
  const by = from[1] + badge[1];
  return {
    along,
    timed,
    wait,
    node,
    /** When the plane starts to fall, counting from the failure. */
    lead: (along > 0 && along < 1 ? REACH_MS : 0) + wait,
    from,
    dashes: growingDashes(way, 2.6, 6),
    xs: points.map(p => p.x - PLANE.width / 2),
    ys: points.map(p => p.y - PLANE.height / 2),
    turns: points.map(p => p.angle + 48),
    bx,
    by,
    mark:
      icon === 'cross'
        ? `M${bx - 3} ${by - 3} L${bx + 3} ${by + 3} M${bx + 3} ${by - 3} L${bx - 3} ${by + 3}`
        : `M${bx} ${by - 4} V${by} L${bx + 3} ${by + 2}`,
  };
};

const BRANCHES = {
  build: makeBranch({
    along: 0,
    wait: 0,
    from: [60, 168],
    bends: [
      [12, 0],
      [22, 4],
      [30, 4],
    ],
    badge: [39, 4],
    icon: 'cross',
  }),
  nym: makeBranch({
    along: NODES[1].at,
    wait: 350,
    node: NODES[1],
    from: [NODES[1].x, NODES[1].y],
    bends: [
      [-13, 2],
      [-24, 10],
      [-28, 21],
    ],
    badge: [-31, 30],
    icon: 'cross',
  }),
  nymexp: makeBranch({
    along: NODES[2].at,
    wait: 1600,
    timed: true,
    node: NODES[2],
    from: [NODES[2].x, NODES[2].y],
    bends: [
      [7, 10],
      [12, 20],
      [13, 32],
    ],
    badge: [13, 41],
    icon: 'clock',
  }),
  poolexp: makeBranch({
    along: 1,
    wait: 1800,
    timed: true,
    from: [246, 40],
    bends: [
      [4, 12],
      [8, 22],
      [8, 34],
    ],
    badge: [8, 43],
    icon: 'clock',
  }),
};
/** Where a send can end without Sent. */
export type FlightFailure = keyof typeof BRANCHES;
const spring = (duration: number) => ({
  duration,
  easing: ease.spring,
  ...REDUCE,
});
const emphasized = (duration: number) => ({
  duration,
  easing: ease.emphasized,
  ...REDUCE,
});
const standard = (duration: number) => ({
  duration,
  easing: ease.standard,
  ...REDUCE,
});

/** 0 at the ends of a loop, 1 halfway, for what goes and comes back. */
const wave = (phase: number) => {
  'worklet';
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
};

/** The steps of a send, each one a scene of the same drawing. */
export type FlightStep = 'build' | 'nym' | 'pool' | 'conf' | 'done';

/** The step each failure happens at. */
export const FAILED_AT: Record<FlightFailure, FlightStep> = {
  build: 'build',
  nym: 'nym',
  nymexp: 'nym',
  poolexp: 'pool',
};

const scene = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: WIDTH,
  height: HEIGHT,
} as const;
const svgStyle = { overflow: 'visible' } as const;

const PlantSvg = ({ children }: { children: React.ReactNode }) => (
  <Svg width={WIDTH} height={HEIGHT} viewBox={PLANT_BOX} style={svgStyle}>
    {children}
  </Svg>
);

const LeafGradient = ({
  id,
  x1,
  y1,
  x2,
  y2,
  shades = art,
}: {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  shades?: { leafLight: string; leafMid: string; leafDeep: string };
}) => (
  <LinearGradient
    id={id}
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    gradientUnits="userSpaceOnUse"
  >
    <Stop stopColor={shades.leafLight} />
    <Stop offset={0.5} stopColor={shades.leafMid} />
    <Stop offset={1} stopColor={shades.leafDeep} />
  </LinearGradient>
);

const PlaneGradient = ({
  id,
  x1,
  y1,
  x2,
  y2,
}: {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) => (
  <LinearGradient
    id={id}
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    gradientUnits="userSpaceOnUse"
  >
    <Stop stopColor={art.planeLight} />
    <Stop offset={0.55} stopColor={art.planeMid} />
    <Stop offset={1} stopColor={art.planeDeep} />
  </LinearGradient>
);

const PlaneArt = ({ id }: { id: number }) => (
  <Svg width={PLANE.width} height={PLANE.height} viewBox="116 31 74 78">
    <Defs>
      <PlaneGradient
        id={`edge${id}`}
        x1={120.4}
        y1={35}
        x2={190.4}
        y2={100.7}
      />
      <PlaneGradient
        id={`fold${id}`}
        x1={120.4}
        y1={37.4}
        x2={159.2}
        y2={96.3}
      />
      <LeafGradient
        id={`wing${id}`}
        x1={150.3}
        y1={43.6}
        x2={193.8}
        y2={67.9}
      />
    </Defs>
    <Path
      d="M120.37 60.95L183.69 35.35C186.01 34.42 186.71 35.58 185.78 38.81L166.3 103.15C165.37 105.92 163.98 105.92 162.12 103.15L149.6 79.63L120.37 60.95Z"
      fill={art.planeBody}
      strokeWidth={6}
      strokeLinejoin="round"
      stroke={`url(#edge${id})`}
    />
    <Path
      d="M120.37 60.95L149.6 79.63L184.39 37.42"
      strokeWidth={5}
      strokeLinejoin="round"
      stroke={`url(#fold${id})`}
      fill="none"
    />
    <Path
      d="M150.29 78.94L178.82 43.65L164.21 94.85L150.29 78.94Z"
      fill={`url(#wing${id})`}
    />
    <Path
      d="M154.47 78.94L172.56 54.03"
      strokeWidth={1.6}
      stroke={art.planeVein}
    />
  </Svg>
);

/** A mix node: it flashes green as the plane passes, and stays lit once it has landed or, in a send that failed, once passed. */
const MixPoint = ({
  node,
  clock,
  flying,
  landed,
  reach,
  failing,
}: {
  node: (typeof NODES)[number];
  clock: SharedValue<number>;
  flying: boolean;
  landed: SharedValue<number>;
  reach: SharedValue<number>;
  failing: boolean;
}) => {
  const lit = useAnimatedProps(() => {
    const local = (clock.value + 1 - node.lights) % 1;
    const flash = flying
      ? interpolate(local, [0, 0.04, 0.1, 0.3, 1], [0, 0, 1, 0, 0])
      : failing
        ? interpolate(
            reach.value,
            [node.at - 0.1, node.at - 0.04, node.at],
            [0, 1, 0],
            Extrapolation.CLAMP,
          )
        : 0;
    return {
      opacity: flying
        ? flash
        : failing
          ? interpolate(
              reach.value,
              [node.at - 0.1, node.at - 0.04],
              [0, 1],
              Extrapolation.CLAMP,
            )
          : landed.value,
      r: node.r * (1 + 0.7 * flash),
    };
  });
  return (
    <>
      <Circle
        cx={node.x}
        cy={node.y}
        r={node.r}
        fill={art.nodeFill}
        stroke={art.nodeStroke}
        strokeWidth={1.6}
      />
      <AnimatedCircle
        cx={node.x}
        cy={node.y}
        fill={art.nodeLit}
        stroke={art.nodeLit}
        strokeWidth={1.6}
        animatedProps={lit}
      />
    </>
  );
};

/** A leaf shed when the plane passes a node. Until the first pass, nothing falls. */
const FallingLeaf = ({
  node,
  clock,
  flown,
}: {
  node: (typeof NODES)[number];
  clock: SharedValue<number>;
  flown: SharedValue<number>;
}) => {
  const style = useAnimatedStyle(() => {
    if (flown.value === 0 && clock.value < node.passes) {
      return { opacity: 0 };
    }
    const local = (clock.value + 1 - node.passes) % 1;
    const out = Easing.out(Easing.ease);
    const appear = out(Math.min(1, local / 0.12));
    const fall = local < 0.12 ? 0 : out((local - 0.12) / 0.88);
    return {
      opacity: local < 0.12 ? 0.95 * appear : 0.95 * (1 - fall),
      transform: [
        { translateY: LEAF_FALL * fall },
        { scale: local < 0.12 ? 0.3 + 0.7 * appear : 1 - 0.15 * fall },
        {
          rotate: `${local < 0.12 ? 10 * appear : 10 + 60 * fall}deg`,
        },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: node.leaf.x - 4,
          top: node.leaf.y - 6,
          width: 9,
          height: 13,
        },
        style,
      ]}
    >
      <Svg width={9} height={13} viewBox="0 0 9 13">
        <Defs>
          <LeafGradient id="drop" x1={-1} y1={1} x2={10} y2={12} />
        </Defs>
        <Path d="M0 0A9 13 0 0 1 9 13A9 13 0 0 1 0 0Z" fill="url(#drop)" />
      </Svg>
    </Animated.View>
  );
};

/** Another transaction waiting in the mempool, a fraction `at` out of step with the rest. */
const PoolDot = ({
  x,
  y,
  at,
  jig,
}: {
  x: number;
  y: number;
  at: number;
  jig: SharedValue<number>;
}) => {
  const moved = useAnimatedProps(() => {
    const up = wave((jig.value + at) % 1);
    return { cx: x + 2 * up, cy: y - 2 * up };
  });
  return <AnimatedCircle r={2.6} fill={art.poolDot} animatedProps={moved} />;
};

/** A third of the badge's ring: it lights with a small pop when its block arrives. */
const BlockArc = ({ d, on }: { d: string; on: boolean }) => {
  const lit = useSharedValue(on ? 1 : 0);
  const pop = useSharedValue(0);
  useEffect(() => {
    if (!on) {
      lit.value = 0;
      return;
    }
    lit.value = withTiming(1, { duration: 300, ...REDUCE });
    pop.value = withSequence(
      withTiming(1, spring(189)),
      withTiming(0, spring(231)),
    );
  }, [on, lit, pop]);
  const props = useAnimatedProps(() => ({
    opacity: lit.value,
    strokeWidth: 3 + 2.5 * pop.value,
  }));
  return (
    <>
      <Path
        d={d}
        fill="none"
        stroke={art.track}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <AnimatedPath
        d={d}
        fill="none"
        stroke={art.confirmed}
        strokeLinecap="round"
        animatedProps={props}
      />
    </>
  );
};

const Spark = ({
  x,
  y,
  burst,
}: {
  x: number;
  y: number;
  burst: SharedValue<number>;
}) => {
  const props = useAnimatedProps(() => ({
    cx: BADGE.x + x * burst.value,
    cy: BADGE.y + y * burst.value,
    r: 1.8 * (0.4 + 0.6 * burst.value),
    /** 0.6 is where the eased burst stands a quarter of the way through its time. */
    opacity: interpolate(burst.value, [0, 0.6, 1], [0, 1, 0]),
  }));
  return <AnimatedCircle fill={art.confirmed} animatedProps={props} />;
};

/** The node where a send failed: it turns red with a pop when the plane falls from it. */
const BadNode = ({
  node,
  lead,
  still,
}: {
  node: (typeof NODES)[number];
  lead: number;
  still: boolean;
}) => {
  const shown = useSharedValue(still ? 1 : 0);
  const pop = useSharedValue(0);
  useEffect(() => {
    if (still) {
      return;
    }
    shown.value = withDelay(lead, withTiming(1, standard(300)));
    pop.value = withDelay(
      lead,
      withSequence(withTiming(1, standard(210)), withTiming(0, standard(490))),
    );
  }, [still, lead, shown, pop]);
  const props = useAnimatedProps(() => ({
    opacity: shown.value,
    r: node.r * (1 + pop.value),
  }));
  return (
    <AnimatedCircle
      cx={node.x}
      cy={node.y}
      fill={art.failed}
      stroke={art.failed}
      strokeWidth={1.6}
      animatedProps={props}
    />
  );
};

/** A failure's dotted way down, its red badge, and the time running out before it. */
const FailedBranch = ({
  branch,
  still,
}: {
  branch: (typeof BRANCHES)[FlightFailure];
  still: boolean;
}) => {
  const drawn = useSharedValue(still ? 1 : 0);
  const pop = useSharedValue(still ? 1 : 0);
  const mark = useSharedValue(still ? 1 : 0);
  const time = useSharedValue(0);
  const over = useSharedValue(0);
  useEffect(() => {
    if (still) {
      return;
    }
    const { lead, wait, timed } = branch;
    drawn.value = withDelay(lead, withTiming(1, emphasized(650)));
    pop.value = withDelay(lead + 480, withTiming(1, spring(460)));
    mark.value = withDelay(lead + 820, withTiming(1, emphasized(380)));
    if (timed) {
      time.value = withDelay(
        lead - wait,
        withTiming(1, { duration: wait, easing: Easing.linear, ...REDUCE }),
      );
      over.value = withDelay(lead, withTiming(1, { duration: 250, ...REDUCE }));
    }
  }, [branch, still, drawn, pop, mark, time, over]);

  const line = useAnimatedProps(() => ({
    d: branch.dashes[Math.ceil(drawn.value * (branch.dashes.length - 1))],
  }));
  const disc = useAnimatedProps(() => ({
    r: 8.5 * pop.value,
    strokeWidth: 1.6 * pop.value,
  }));
  const markProps = useAnimatedProps(() => ({
    strokeDashoffset: 24 * (1 - mark.value),
  }));
  /** The ring empties in grey, and turns red for its last 30%. */
  const ring = useAnimatedProps(() => ({
    strokeDashoffset: TIMER_LENGTH * time.value,
    opacity: Math.min(1, time.value / 0.08) * (1 - over.value),
  }));
  const redRing = useAnimatedProps(() => ({
    strokeDashoffset: TIMER_LENGTH * time.value,
    opacity:
      interpolate(time.value, [0.7, 1], [0, 1], Extrapolation.CLAMP) *
      (1 - over.value),
  }));
  const [x, y] = branch.from;
  const timerProps = {
    cx: x,
    cy: y,
    r: TIMER_R,
    fill: 'none',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeDasharray: [TIMER_LENGTH, TIMER_LENGTH],
    rotation: -90,
    originX: x,
    originY: y,
  } as const;
  return (
    <>
      <AnimatedPath
        d={branch.dashes[0]}
        fill="none"
        stroke={art.failed}
        strokeWidth={2.2}
        strokeLinecap="round"
        animatedProps={line}
      />
      <AnimatedCircle
        cx={branch.bx}
        cy={branch.by}
        fill={art.failedFill}
        stroke={art.failed}
        animatedProps={disc}
      />
      <AnimatedPath
        d={branch.mark}
        fill="none"
        stroke={art.failedMark}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[24, 24]}
        animatedProps={markProps}
      />
      {branch.timed && !still && (
        <>
          <AnimatedCircle
            {...timerProps}
            stroke={art.badgeText}
            animatedProps={ring}
          />
          <AnimatedCircle
            {...timerProps}
            stroke={art.failed}
            animatedProps={redRing}
          />
        </>
      )}
    </>
  );
};

/** The grey twin of a part of the sprout, fading in over it as the sprout wilts. */
const Wilted = ({
  wilt,
  children,
}: {
  wilt: SharedValue<number>;
  children: React.ReactNode;
}) => {
  const props = useAnimatedProps(() => ({ opacity: wilt.value }));
  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
};

/** A paper plane: on its route, sitting at either end, or falling off a failure's branch. */
const FlightPlane = ({
  shape,
  trip,
  clock,
  reach,
  fall,
  unfold,
  beat,
  bobbing,
  land,
  building,
  flying,
  waiting,
  still,
  failure,
}: {
  shape: PlaneShape;
  trip: SharedValue<number>;
  clock: SharedValue<number>;
  reach: SharedValue<number>;
  fall: SharedValue<number>;
  unfold: SharedValue<number>;
  beat: SharedValue<number>;
  bobbing: SharedValue<number>;
  land: SharedValue<number>;
  building: boolean;
  flying: boolean;
  waiting: boolean;
  still: boolean;
  failure?: FlightFailure;
}) => {
  const wilting = failure === 'build';
  const branch = failure && !wilting ? BRANCHES[failure] : undefined;
  const hang = {
    x: PLANE.width / 2 - shape.anchor.x,
    y: PLANE.height / 2 - shape.anchor.y,
  };
  const style = useAnimatedStyle(() => {
    const down = fall.value > 0 ? branch : undefined;
    const along = flying
      ? still
        ? 0.55
        : trip.value
      : building || wilting
        ? 0
        : failure
          ? reach.value
          : 1;
    const bob = building
      ? bobbing.value * wave((beat.value - BOB_AFTER_MS / BEAT_MS + 1) % 1)
      : waiting
        ? wave(beat.value)
        : 0;
    const way = down ? fall.value * FALL_END : along;
    const stops = down ? FALL_STOPS : STOPS;
    const x = interpolate(way, stops, down ? down.xs : XS);
    const y = interpolate(way, stops, down ? down.ys : YS);
    const turn = interpolate(way, stops, down ? down.turns : TURNS);
    const radians = (turn * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const opacity = down
      ? interpolate(fall.value, [0, 0.6, 1], [1, 0.8, 0])
      : wilting
        ? Math.min(1, unfold.value) * (1 - fall.value)
        : failure === 'poolexp'
          ? 1
          : failure
            ? interpolate(reach.value, [0, 0.08, 0.88, 1], [0, 1, 1, 0])
            : flying
              ? still
                ? 1
                : interpolate(clock.value, [0, 0.08, 0.88, 1], [0, 1, 1, 0])
              : Math.min(1, unfold.value);
    const shrink = down
      ? 1 - 0.45 * fall.value
      : wilting
        ? 1 - 0.8 * fall.value
        : 1;
    return {
      opacity,
      transform: [
        {
          translateX:
            shape.scale * (x + hang.x * cos - hang.y * sin) + 3 * land.value,
        },
        {
          translateY:
            shape.scale * (y + hang.x * sin + hang.y * cos) -
            BOB * bob -
            3 * land.value,
        },
        {
          rotate: `${turn - 30 * (1 - unfold.value) - (wilting ? 40 * fall.value : 0)}deg`,
        },
        { scale: unfold.value * shape.scale * shrink },
      ],
    };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', left: 0, top: 0, ...PLANE }, style]}
    >
      <PlaneArt id={shape.index} />
    </Animated.View>
  );
};

/** Runs `value` from 0 to 1 every `ms`, again and again, while `on`, starting `lag` ms late. */
const useLoop = (
  value: SharedValue<number>,
  ms: number,
  on: boolean,
  easing: NonNullable<WithTimingConfig['easing']> = Easing.linear,
  lag = 0,
) =>
  useEffect(() => {
    if (!on) {
      return;
    }
    value.set(0);
    value.set(
      withDelay(lag, withRepeat(withTiming(1, { duration: ms, easing }), -1)),
    );
    return () => cancelAnimation(value);
  }, [value, ms, on, easing, lag]);

/**
 * Plays a failure for one plane: from wherever it is it goes on to where the
 * send failed, waits there, and falls.
 */
const useFall = (
  failure: FlightFailure | undefined,
  still: boolean,
  index: number,
  trip: SharedValue<number>,
  reach: SharedValue<number>,
  fall: SharedValue<number>,
) =>
  useEffect(() => {
    if (!failure) {
      reach.set(0);
      fall.set(0);
      return;
    }
    const { along, lead } = BRANCHES[failure];
    if (still) {
      reach.set(along);
      fall.set(1);
      return;
    }
    const from = along === 0 ? 0 : along === 1 ? 1 : trip.get();
    reach.set(from);
    if (from !== along) {
      const easing = TRIP_EASE;
      /** Past the point already, it finishes the lap and flies there again. */
      const flight =
        from > along
          ? withSequence(
              withTiming(1, { duration: 200 }),
              withTiming(0, { duration: 0 }),
              withTiming(along, { duration: REACH_MS - 200, easing }),
            )
          : withTiming(along, { duration: REACH_MS, easing });
      reach.set(withDelay(index * PAIR_LAG_MS, flight));
    }
    fall.set(
      withDelay(
        lead + index * (failure === 'build' ? 120 : 160),
        withTiming(
          1,
          failure === 'build'
            ? { duration: 500, easing: Easing.in(Easing.ease) }
            : { duration: 760, easing: Easing.bezier(0.5, 0, 0.75, 0) },
        ),
      ),
    );
  }, [failure, still, index, trip, reach, fall]);

/**
 * A send told on one drawing. Creating, the coin works on the proof while the
 * sprout grows out of it and a paper plane unfolds. Through NYM, the plane
 * flies the dotted route again and again, lighting the mix nodes and shedding
 * a leaf at each. In the mempool it has landed among others waiting. Confirming,
 * the badge's ring fills a third per block. Sent, the check draws, sparks fly
 * and the sprout stretches. A send that fails ends where it is: the plane
 * reaches the point of the `failure`, and falls down a red branch to a badge;
 * failing to create, the sprout wilts instead. 300 x 220, scaled down to
 * `width` when narrower.
 */
export default function SendFlight({
  step: told = 'nym',
  confirmations = 0,
  width = WIDTH,
  pair = false,
  failure,
}: {
  step?: FlightStep;
  /** Thirds of the ring filled while confirming. */
  confirmations?: number;
  width?: number;
  /** A TEX send, two transactions: a second plane rides behind the first. */
  pair?: boolean;
  failure?: FlightFailure;
}) {
  const still = useReducedMotion();
  const step = failure ? FAILED_AT[failure] : told;
  const wilting = failure === 'build';
  const building = step === 'build' && !failure;
  const flying = step === 'nym' && !failure;
  const waiting = step === 'pool' && !failure;
  const done = step === 'done';
  const arrived = waiting || step === 'conf' || done;
  const badged = step === 'conf' || done;

  /** A trip in linear time, for what lights and falls on its own clock. */
  const clock = useSharedValue(0);
  /** The same trip eased, for the plane and its trail. */
  const trip = useSharedValue(0);
  const spin = useSharedValue(0);
  const beat = useSharedValue(0);
  const jig = useSharedValue(0);
  const flown = useSharedValue(0);

  const stem = useSharedValue(building ? 0 : 1);
  const leftLeaf = useSharedValue(building ? 0 : 1);
  const rightLeaf = useSharedValue(building ? 0 : 1);
  const unfold = useSharedValue(building ? 0 : 1);
  const bobbing = useSharedValue(0);
  const ring = useSharedValue(building ? 1 : 0);
  const landed = useSharedValue(arrived ? 1 : 0);
  const pool = useSharedValue(waiting ? 1 : step === 'conf' ? 0.3 : 0);
  const badge = useSharedValue(badged ? 1 : 0);
  const disc = useSharedValue(1);
  const number = useSharedValue(done ? 0 : 1);
  const check = useSharedValue(0);
  const burst = useSharedValue(0);
  const leftHappy = useSharedValue(1);
  const rightHappy = useSharedValue(1);
  const land = useSharedValue(0);
  const wilt = useSharedValue(0);
  const reach = useSharedValue(0);
  const fall = useSharedValue(0);
  const clock2 = useSharedValue(0);
  const trip2 = useSharedValue(0);
  const reach2 = useSharedValue(0);
  const fall2 = useSharedValue(0);

  useLoop(clock, TRIP_MS, flying && !still);
  useLoop(trip, TRIP_MS, flying && !still, TRIP_EASE);
  useLoop(
    clock2,
    TRIP_MS,
    pair && flying && !still,
    Easing.linear,
    PAIR_LAG_MS,
  );
  useLoop(trip2, TRIP_MS, pair && flying && !still, TRIP_EASE, PAIR_LAG_MS);
  useFall(failure, still, 0, trip, reach, fall);
  useFall(failure, still, 1, trip2, reach2, fall2);
  useLoop(spin, waiting ? ORBIT_MS : RING_MS, (building || waiting) && !still);
  useLoop(
    beat,
    waiting ? POOL_BEAT_MS : BEAT_MS,
    (building || waiting) && !still,
  );
  useLoop(jig, JIG_MS, waiting && !still);

  useEffect(() => {
    flown.value = 0;
    if (flying) {
      flown.value = withDelay(TRIP_MS, withTiming(1, { duration: 0 }));
    }
  }, [flying, flown]);

  useEffect(() => {
    if (building) {
      stem.value = 0;
      leftLeaf.value = 0;
      rightLeaf.value = 0;
      unfold.value = 0;
      stem.value = withTiming(1, emphasized(560));
      leftLeaf.value = withDelay(360, withTiming(1, spring(420)));
      rightLeaf.value = withDelay(460, withTiming(1, spring(420)));
      unfold.value = withDelay(640, withTiming(1, spring(420)));
      bobbing.value = withDelay(BOB_AFTER_MS, withTiming(1, { duration: 0 }));
    } else if (!wilting) {
      stem.value = 1;
      leftLeaf.value = 1;
      rightLeaf.value = 1;
      unfold.value = 1;
      bobbing.value = 0;
    }
    ring.value = withTiming(building || wilting ? 1 : 0, {
      duration: 250,
      ...REDUCE,
    });
    wilt.value = still
      ? Number(wilting)
      : withTiming(wilting ? 1 : 0, standard(700));
    landed.value = withTiming(arrived ? 1 : 0, { duration: 300, ...REDUCE });
    pool.value =
      failure === 'poolexp'
        ? withDelay(BRANCHES.poolexp.lead, withTiming(0, standard(350)))
        : withTiming(waiting ? 1 : step === 'conf' ? 0.3 : 0, standard(350));
    badge.value = withTiming(badged ? 1 : 0, standard(350));
    number.value = withTiming(done ? 0 : 1, { duration: 200, ...REDUCE });

    if (step === 'conf') {
      disc.value = 0.4;
      disc.value = withTiming(1, spring(380));
    }
    if (done) {
      const happy = (delay: number) =>
        withDelay(
          delay,
          withSequence(
            withTiming(1.18, spring(405)),
            withTiming(1, spring(495)),
          ),
        );
      disc.value = withSequence(
        withTiming(1.22, spring(192)),
        withTiming(1, spring(288)),
      );
      check.value = 0;
      check.value = withDelay(120, withTiming(1, emphasized(420)));
      burst.value = 0;
      burst.value = withDelay(200, withTiming(1, emphasized(700)));
      leftHappy.value = happy(250);
      rightHappy.value = happy(330);
      land.value = withSequence(
        withTiming(1, spring(240)),
        withTiming(0, spring(360)),
      );
    } else {
      check.value = 0;
      burst.value = 0;
      leftHappy.value = 1;
      rightHappy.value = 1;
      land.value = 0;
    }
  }, [
    step,
    failure,
    still,
    building,
    wilting,
    waiting,
    arrived,
    badged,
    done,
    stem,
    leftLeaf,
    rightLeaf,
    unfold,
    bobbing,
    ring,
    wilt,
    landed,
    pool,
    badge,
    number,
    disc,
    check,
    burst,
    leftHappy,
    rightHappy,
    land,
  ]);

  const trail = useAnimatedProps(() => {
    const shown = failure
      ? reach.value
      : flying
        ? still
          ? 0
          : trip.value
        : arrived
          ? 1
          : 0;
    return { d: TRAILS[Math.ceil(shown * dashCount)] };
  });
  const stemProps = useAnimatedProps(() => ({
    strokeDashoffset: STEM_LENGTH * (1 - stem.value),
  }));
  const stemWiltProps = useAnimatedProps(() => ({
    strokeDashoffset: STEM_LENGTH * (1 - stem.value),
  }));
  const leftLeafStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: leftLeaf.value * leftHappy.value },
      {
        rotate: `${(flying ? -7 * wave(clock.value) : 0) - 34 * wilt.value}deg`,
      },
    ],
  }));
  const rightLeafStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: rightLeaf.value * rightHappy.value },
      {
        rotate: `${(flying ? -7 * wave((clock.value + 300 / TRIP_MS) % 1) : 0) + 30 * wilt.value}deg`,
      },
    ],
  }));
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: building ? 1 + 0.07 * wave(beat.value) : 1 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const poolStyle = useAnimatedStyle(() => ({ opacity: pool.value }));
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waiting ? spin.value * 360 : 0}deg` }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: badge.value }));
  const discProps = useAnimatedProps(() => ({
    r: BADGE.r * disc.value,
    strokeWidth: 1.5 * disc.value,
  }));
  const numberProps = useAnimatedProps(() => ({ opacity: number.value }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: 24 * (1 - check.value),
  }));

  const scale = Math.min(1, width / WIDTH);
  const branch = failure ? BRANCHES[failure] : undefined;
  const plane = {
    unfold,
    beat,
    bobbing,
    land,
    building,
    flying,
    waiting,
    still,
    failure,
  };
  return (
    <View
      testID={
        failure
          ? 'computing.failed'
          : done
            ? 'computing.sent'
            : 'computing.flight'
      }
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={{ width: WIDTH * scale, height: HEIGHT * scale }}
    >
      <View
        testID={`computing.flight.${failure ?? step}`}
        style={{
          width: WIDTH,
          height: HEIGHT,
          transform: [{ scale }],
          transformOrigin: 'top left',
        }}
      >
        <Svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={[scene, svgStyle]}
        >
          <Path
            d={FLY}
            fill="none"
            stroke={art.track}
            strokeWidth={2}
            strokeDasharray={[1, 7]}
            strokeLinecap="round"
          />
          <AnimatedPath
            d={TRAILS[0]}
            fill="none"
            stroke={art.trail}
            strokeWidth={2.4}
            strokeLinecap="round"
            animatedProps={trail}
          />
          {branch && failure && (
            <FailedBranch key={failure} branch={branch} still={still} />
          )}
          {NODES.map(node => (
            <MixPoint
              key={node.lights}
              node={node}
              clock={clock}
              flying={flying}
              landed={landed}
              reach={reach}
              failing={!!failure}
            />
          ))}
          {branch?.node && failure && (
            <BadNode
              key={failure}
              node={branch.node}
              lead={branch.lead}
              still={still}
            />
          )}
        </Svg>

        <View style={scene}>
          <PlantSvg>
            <Path
              d="M77.93 274.75C120.97 274.75 155.86 269.48 155.86 262.99C155.86 256.49 120.97 251.23 77.93 251.23C34.89 251.23 0 256.49 0 262.99C0 269.48 34.89 274.75 77.93 274.75Z"
              fill={art.ground}
            />
            <Path
              d="M20.87 260.91C38.96 252.15 54.74 250.07 68.19 254.69C87.21 245.46 106.92 246.61 127.33 258.14"
              strokeWidth={2}
              stroke={art.track}
              fill="none"
            />
            <Path
              d="M43.14 258.84C53.35 251.92 63.55 250.3 73.76 253.99C82.57 249.38 92.31 250.99 102.98 258.84"
              fill={art.mound}
            />
            <AnimatedPath
              d="M73.76 255.38C66.8 233.7 67.03 216.63 74.45 204.17C80.48 194.49 82.1 184.34 79.32 173.73"
              strokeWidth={7}
              strokeLinecap="round"
              stroke={art.stem}
              fill="none"
              strokeDasharray={[STEM_LENGTH, STEM_LENGTH]}
              animatedProps={stemProps}
            />
            {wilting && (
              <Wilted wilt={wilt}>
                <AnimatedPath
                  d="M73.76 255.38C66.8 233.7 67.03 216.63 74.45 204.17C80.48 194.49 82.1 184.34 79.32 173.73"
                  strokeWidth={7}
                  strokeLinecap="round"
                  stroke={art.wilted.stem}
                  fill="none"
                  strokeDasharray={[STEM_LENGTH, STEM_LENGTH]}
                  animatedProps={stemWiltProps}
                />
              </Wilted>
            )}
          </PlantSvg>
        </View>

        <Animated.View
          style={[scene, { transformOrigin: LEFT_LEAF_ORIGIN }, leftLeafStyle]}
        >
          <PlantSvg>
            <Defs>
              <LeafGradient id="left" x1={30.6} y1={189} x2={62.3} y2={228.9} />
            </Defs>
            <Path
              d="M71.67 221.47C50.79 219.4 33.4 205.56 30.62 188.95C55.66 188.95 70.28 200.72 71.67 221.47Z"
              fill="url(#left)"
            />
            <Path
              d="M70.28 219.4C57.29 206.94 45.69 198.64 35.49 194.49"
              strokeWidth={1.6}
              stroke={art.vein}
              fill="none"
            />
            {wilting && (
              <Wilted wilt={wilt}>
                <Defs>
                  <LeafGradient
                    id="leftWilted"
                    x1={30.6}
                    y1={189}
                    x2={62.3}
                    y2={228.9}
                    shades={art.wilted}
                  />
                </Defs>
                <Path
                  d="M71.67 221.47C50.79 219.4 33.4 205.56 30.62 188.95C55.66 188.95 70.28 200.72 71.67 221.47Z"
                  fill="url(#leftWilted)"
                />
                <Path
                  d="M70.28 219.4C57.29 206.94 45.69 198.64 35.49 194.49"
                  strokeWidth={1.6}
                  stroke={art.wilted.vein}
                  fill="none"
                />
              </Wilted>
            )}
          </PlantSvg>
        </Animated.View>
        <Animated.View
          style={[
            scene,
            { transformOrigin: RIGHT_LEAF_ORIGIN },
            rightLeafStyle,
          ]}
        >
          <PlantSvg>
            <Defs>
              <LeafGradient
                id="right"
                x1={75.1}
                y1={171.5}
                x2={106.7}
                y2={208.6}
              />
            </Defs>
            <Path
              d="M75.15 203.48C77.93 182.73 93.93 170.27 112.72 171.65C109.24 191.03 96.72 204.17 75.15 203.48Z"
              fill="url(#right)"
            />
            <Path
              d="M78.63 201.41C87.9 188.49 97.41 180.42 107.15 177.19"
              strokeWidth={1.6}
              stroke={art.vein}
              fill="none"
            />
            {wilting && (
              <Wilted wilt={wilt}>
                <Defs>
                  <LeafGradient
                    id="rightWilted"
                    x1={75.1}
                    y1={171.5}
                    x2={106.7}
                    y2={208.6}
                    shades={art.wilted}
                  />
                </Defs>
                <Path
                  d="M75.15 203.48C77.93 182.73 93.93 170.27 112.72 171.65C109.24 191.03 96.72 204.17 75.15 203.48Z"
                  fill="url(#rightWilted)"
                />
                <Path
                  d="M78.63 201.41C87.9 188.49 97.41 180.42 107.15 177.19"
                  strokeWidth={1.6}
                  stroke={art.wilted.vein}
                  fill="none"
                />
              </Wilted>
            )}
          </PlantSvg>
        </Animated.View>

        <Animated.View
          style={[scene, { transformOrigin: COIN_ORIGIN }, ringStyle]}
        >
          <PlantSvg>
            <Circle
              cx={COIN.x}
              cy={COIN.y}
              r={19}
              fill="none"
              stroke={wilting ? art.failed : art.coinRing}
              strokeWidth={1.6}
              strokeDasharray={[3, 4]}
            />
          </PlantSvg>
        </Animated.View>
        <Animated.View
          style={[scene, { transformOrigin: COIN_ORIGIN }, coinStyle]}
        >
          <PlantSvg>
            <Circle
              cx={COIN.x}
              cy={COIN.y}
              r={11.76}
              fill={art.coinFill}
              strokeWidth={2}
              stroke={art.coinRing}
            />
            <Path
              d="M74.25 249.6H76.05V252.3H79.9V254.5L73.5 261.8H79.9V264H76.05V266.7H74.25V264H70.4V261.8L76.8 254.5H70.4V252.3H74.25Z"
              fill={art.coinMark}
            />
          </PlantSvg>
        </Animated.View>

        <Animated.View style={[scene, poolStyle]}>
          <Animated.View
            style={[
              scene,
              { transformOrigin: `${POOL_CENTER.x}px ${POOL_CENTER.y}px` },
              orbitStyle,
            ]}
          >
            <Svg width={WIDTH} height={HEIGHT} style={svgStyle}>
              <Circle
                cx={POOL_CENTER.x}
                cy={POOL_CENTER.y}
                r={25}
                fill="none"
                stroke={art.nodeStroke}
                strokeWidth={1.8}
                strokeDasharray={[4, 5]}
              />
            </Svg>
          </Animated.View>
          <Svg width={WIDTH} height={HEIGHT} style={[scene, svgStyle]}>
            {POOL_DOTS.map(dot => (
              <PoolDot key={dot.at} {...dot} jig={jig} />
            ))}
          </Svg>
        </Animated.View>

        <Animated.View
          testID={`computing.flight.filled.${done ? ARCS.length : step === 'conf' ? confirmations : 0}`}
          style={[scene, badgeStyle]}
        >
          <Svg width={WIDTH} height={HEIGHT} style={svgStyle}>
            {ARCS.map((d, i) => (
              <BlockArc
                key={d}
                d={d}
                on={done || (step === 'conf' && i < confirmations)}
              />
            ))}
            <AnimatedCircle
              cx={BADGE.x}
              cy={BADGE.y}
              fill={art.badgeFill}
              stroke={art.badgeStroke}
              animatedProps={discProps}
            />
            <AnimatedG animatedProps={numberProps}>
              <SvgText
                x={BADGE.x}
                y={14.5}
                fill={art.badgeText}
                fontSize={10}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {`${step === 'conf' ? confirmations : 0}/${ARCS.length}`}
              </SvgText>
            </AnimatedG>
            <AnimatedPath
              d="M277.6 14.6 L281.4 18.4 L288.6 10.3"
              fill="none"
              stroke={art.confirmed}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={[24, 24]}
              animatedProps={checkProps}
            />
            {SPARKS.map(spark => (
              <Spark key={`${spark.x}:${spark.y}`} {...spark} burst={burst} />
            ))}
          </Svg>
        </Animated.View>

        <FlightPlane
          shape={PLANES[0]}
          trip={trip}
          clock={clock}
          reach={reach}
          fall={fall}
          {...plane}
        />
        {pair && (
          <FlightPlane
            shape={PLANES[1]}
            trip={trip2}
            clock={clock2}
            reach={reach2}
            fall={fall2}
            {...plane}
          />
        )}

        {flying &&
          !still &&
          NODES.map(node => (
            <FallingLeaf
              key={node.passes}
              node={node}
              clock={clock}
              flown={flown}
            />
          ))}
      </View>
    </View>
  );
}
