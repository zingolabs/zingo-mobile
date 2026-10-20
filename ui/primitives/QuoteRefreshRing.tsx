import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// One coarse wall-clock tick per second, re-rendered only when the arc
// would visibly move: a per-frame Animated.timing on the JS driver cost
// a bridge write every 16 ms for minutes to move the arc by well under
// a pixel.
const RING_TICK_MS = 1_000;
const RING_ARC_STEP = 1 / 64;
const SPIN_MS = 900;
const FETCH_ARC = 0.25;

/**
 * Display-only countdown ring: the arc empties over `durationMs` and
 * refills whenever `resetKey` changes. While `fetching`, a short arc
 * spins instead. It has no tap target and stays out of the
 * accessibility tree: the price beside it carries the announcement.
 */
type QuoteRefreshRingProps = {
  size: number;
  /** Remaining-time arc colour. */
  color: string;
  /** Spinning arc colour while a request runs. */
  fetchColor: string;
  /** Faint track colour. */
  trackColor: string;
  /** Time for the ring to go full → empty (matches the refresh interval). */
  durationMs: number;
  /** Change this to refill the ring (e.g. the next deadline). */
  resetKey: number | string;
  /** Elapsed fraction a refill begins at, for a ring mounted mid-cycle. */
  startProgress?: number;
  fetching?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export default function QuoteRefreshRing({
  size,
  color,
  fetchColor,
  trackColor,
  durationMs,
  resetKey,
  startProgress,
  fetching,
  style,
  testID,
}: QuoteRefreshRingProps) {
  // A ref, so a re-render's fresher phase never restarts the countdown:
  // only resetKey (and a changed duration) may.
  const startProgressRef = useRef(0);
  startProgressRef.current = Math.min(Math.max(startProgress ?? 0, 0), 1);
  const [progress, setProgress] = useState(startProgressRef.current);
  const strokeWidth = 2;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const from = startProgressRef.current;
    const startedAt = Date.now();
    setProgress(from);
    if (from >= 1 || durationMs <= 0) return;
    const tick = setInterval(() => {
      const now = Math.min(from + (Date.now() - startedAt) / durationMs, 1);
      // The functional update returns the previous value for sub-step
      // movement, so React bails out of those re-renders.
      setProgress(prev =>
        now >= 1 || now - prev >= RING_ARC_STEP ? now : prev,
      );
      if (now >= 1) clearInterval(tick);
    }, RING_TICK_MS);
    return () => clearInterval(tick);
  }, [resetKey, durationMs]);

  const turn = useSharedValue(0);
  useEffect(() => {
    if (fetching) {
      turn.value = 0;
      turn.value = withRepeat(
        withTiming(360, {
          duration: SPIN_MS,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.System,
        }),
        -1,
      );
    } else {
      cancelAnimation(turn);
      turn.value = 0;
    }
  }, [fetching, turn]);
  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));

  // Offset 0 = full ring; the full circumference = empty ring.
  const strokeDashoffset = fetching
    ? circumference * (1 - FETCH_ARC)
    : circumference * progress;

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      testID={testID}
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View style={[{ width: size, height: size }, spin]}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={fetching ? fetchColor : color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            // The arc starts at 12 o'clock instead of 3 o'clock.
            rotation={-90}
            originX={center}
            originY={center}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
