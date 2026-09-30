/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo } from 'react';
import { AppState, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { duration, ease } from '@app/theme/motion';
import { Branch, Layer, leftBranch, rightBranch } from './layers';

type Corner = 'topLeft' | 'bottomRight';

type WelcomeBranchesProps = {
  width: number;
  height: number;
  parted?: boolean;
};

const DESIGN_WIDTH = 402;
const DESIGN_HEIGHT = 874;
const GUST_PERIOD_S = 8;
const BRANCH_BEND_DEG = 1.7;
const TREMBLE_DEG = 1.2;
const WIND_DELAY_S_PER_PT = 0.004;
const CLOCK_HORIZON_S = 100000;
const PART_SHIFT_PT = 70;
const PART_TURN_DEG = 12;

const gust = (u: number): number => {
  'worklet';
  const w = (2 * Math.PI) / GUST_PERIOD_S;
  return (
    0.55 * Math.sin(w * u) +
    0.3 * Math.sin(2 * w * u + 1.3) +
    0.15 * Math.sin(3 * w * u + 2.7)
  );
};

const root = (branch: Branch, corner: Corner) =>
  corner === 'topLeft' ? { x: 0, y: 0 } : { x: branch.w, y: branch.h };

const distanceFromRoot = (leaf: Layer, branch: Branch, corner: Corner) => {
  const r = root(branch, corner);
  const pivot = leaf.pivot ?? { x: 0, y: 0 };
  return Math.hypot(leaf.x + pivot.x - r.x, leaf.y + pivot.y - r.y);
};

type LeafProps = {
  leaf: Layer;
  index: number;
  delayS: number;
  launchDelayMs: number;
  side: number;
  green: boolean;
  clock: SharedValue<number>;
  reduced: boolean;
  testID: string;
};

const Leaf: React.FC<LeafProps> = ({
  leaf,
  index,
  delayS,
  launchDelayMs,
  side,
  green,
  clock,
  reduced,
  testID,
}) => {
  const unfold = useSharedValue(reduced ? 1 : 0);
  const amp = 3 + (index % 3);
  const period = 2.6 + ((index * 0.7) % 1.8);
  const phase = index * 1.9;
  const pivot = leaf.pivot ?? { x: 0, y: 0 };

  useEffect(() => {
    if (reduced) {
      unfold.value = 1;
      return;
    }
    unfold.value = withDelay(
      launchDelayMs,
      withTiming(1, { duration: 420, easing: ease.spring }),
    );
  }, [launchDelayMs, reduced, unfold]);

  const style = useAnimatedStyle(() => {
    const t = clock.value;
    const wind =
      side * amp * gust(t - delayS) +
      TREMBLE_DEG * Math.sin((2 * Math.PI * t) / period + phase);
    const opening = (1 - unfold.value) * -28 * side;
    return {
      opacity: green
        ? 0.78 + 0.22 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 3.2))
        : 1,
      transform: [
        { rotate: `${opening + wind}deg` },
        { scale: unfold.value },
      ],
    };
  });

  return (
    <Animated.Image
      testID={testID}
      source={leaf.source}
      style={[
        {
          position: 'absolute',
          left: leaf.x,
          top: leaf.y,
          width: leaf.w,
          height: leaf.h,
          transformOrigin: [pivot.x, pivot.y, 0],
        },
        style,
      ]}
    />
  );
};

type BranchViewProps = {
  branch: Branch;
  corner: Corner;
  side: number;
  scale: number;
  clock: SharedValue<number>;
  part: SharedValue<number>;
  reduced: boolean;
  greenLeaf?: number;
  testID: string;
};

const BranchView: React.FC<BranchViewProps> = ({
  branch,
  corner,
  side,
  scale,
  clock,
  part,
  reduced,
  greenLeaf,
  testID,
}) => {
  const grow = useSharedValue(reduced ? 1 : 0);
  const r = root(branch, corner);
  const distances = useMemo(
    () => branch.leaves.map(l => distanceFromRoot(l, branch, corner)),
    [branch, corner],
  );
  const maxDistance = Math.max(...distances);

  useEffect(() => {
    if (reduced) {
      grow.value = 1;
      return;
    }
    grow.value = withTiming(1, { duration: 520, easing: ease.out });
  }, [grow, reduced]);

  const sway = useAnimatedStyle(() => {
    const bend = side * BRANCH_BEND_DEG * gust(clock.value);
    const away = corner === 'topLeft' ? -1 : 1;
    return {
      opacity: 1 - 0.6 * part.value,
      transform: [
        { translateX: away * PART_SHIFT_PT * part.value },
        { translateY: away * PART_SHIFT_PT * part.value },
        { rotate: `${bend + side * PART_TURN_DEG * part.value}deg` },
        { scale: scale },
      ],
    };
  });
  const stem = useAnimatedStyle(() => ({
    transform: [{ scale: grow.value }],
  }));

  const anchor =
    corner === 'topLeft' ? { top: 0, left: 0 } : { bottom: 0, right: 0 };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: branch.w,
          height: branch.h,
          transformOrigin: [r.x, r.y, 0],
          ...anchor,
        },
        sway,
      ]}
    >
      <Animated.Image
        testID={`${testID}.stem`}
        source={branch.stem.source}
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: branch.w,
            height: branch.h,
            transformOrigin: [r.x, r.y, 0],
          },
          stem,
        ]}
      />
      {branch.leaves.map((leaf, i) => (
        <Leaf
          key={i}
          leaf={leaf}
          index={i}
          delayS={distances[i] * WIND_DELAY_S_PER_PT}
          launchDelayMs={250 + (600 * distances[i]) / maxDistance}
          side={side}
          green={i === greenLeaf}
          clock={clock}
          reduced={reduced}
          testID={`${testID}.leaf.${i + 1}`}
        />
      ))}
    </Animated.View>
  );
};

const WelcomeBranches: React.FC<WelcomeBranchesProps> = ({
  width,
  height,
  parted = false,
}) => {
  const reduced = useReducedMotion();
  const clock = useSharedValue(0);
  const part = useSharedValue(parted ? 1 : 0);
  const scale = Math.min(1, width / DESIGN_WIDTH, height / DESIGN_HEIGHT);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const run = () => {
      const from = clock.value;
      clock.value = withRepeat(
        withTiming(from + CLOCK_HORIZON_S, {
          duration: CLOCK_HORIZON_S * 1000,
          easing: Easing.linear,
        }),
        -1,
      );
    };
    run();
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        run();
      } else {
        cancelAnimation(clock);
      }
    });
    return () => {
      sub.remove();
      cancelAnimation(clock);
    };
  }, [clock, reduced]);

  useEffect(() => {
    part.value = withTiming(parted ? 1 : 0, {
      duration: parted ? duration.leavesPart : duration.leavesReturn,
      easing: parted ? ease.emphasized : ease.settle,
    });
  }, [part, parted]);

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, width, height }}
    >
      <BranchView
        branch={leftBranch}
        corner="topLeft"
        side={1}
        scale={scale}
        clock={clock}
        part={part}
        reduced={reduced}
        greenLeaf={5}
        testID="welcome.left"
      />
      <BranchView
        branch={rightBranch}
        corner="bottomRight"
        side={-1}
        scale={scale}
        clock={clock}
        part={part}
        reduced={reduced}
        testID="welcome.right"
      />
    </View>
  );
};

export default WelcomeBranches;
