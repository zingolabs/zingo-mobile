/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';

// One coarse wall-clock tick per second, re-rendered only when the arc
// would visibly move: a per-frame Animated.timing on the JS driver cost
// a bridge write every 16 ms for minutes to move the arc by well under
// a pixel.
const RING_TICK_MS = 1_000;
const RING_ARC_STEP = 1 / 64;

/**
 * Display-only countdown ring: a refresh glyph wrapped in a ring that
 * fills clockwise to full over `durationMs` and restarts whenever
 * `resetKey` changes. It offers no tap; ADR 0008 removed the manual
 * fetch, so the ring only reports the cadence that is running.
 */
type QuoteRefreshRingProps = {
  size: number;
  /** Centre refresh-glyph colour. */
  color: string;
  /** Progress-arc (fill) colour. Falls back to `color` when omitted. */
  ringColor?: string;
  /** Faint unfilled-track colour. */
  trackColor: string;
  /** Time for the ring to go empty → full (matches the refresh interval). */
  durationMs: number;
  /** Change this to restart the fill (e.g. the quote's receivedAtMs). */
  resetKey: number | string;
  /** Fill fraction a restart begins at, for a ring mounted mid-cycle. */
  startProgress?: number;
  /** What a screen reader announces for this ring. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export default function QuoteRefreshRing({
  size,
  color,
  ringColor,
  trackColor,
  durationMs,
  resetKey,
  startProgress,
  accessibilityLabel,
  style,
  testID,
}: QuoteRefreshRingProps) {
  // A ref, so a re-render's fresher phase never restarts the fill:
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

  // Full offset = empty ring; 0 = full ring.
  const strokeDashoffset = circumference * (1 - progress);

  const face = (
    <>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
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
          stroke={ringColor ?? color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          // Start the fill at 12 o'clock instead of 3 o'clock.
          rotation={-90}
          originX={center}
          originY={center}
        />
      </Svg>
      <FontAwesomeIcon
        icon={faRotateRight}
        size={Math.round(size * 0.48)}
        color={color}
      />
    </>
  );

  const frame: ViewStyle = {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  };

  // Display-only: no tap stop, no disabled state, just a labeled image.
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[frame, style]}
    >
      {face}
    </View>
  );
}
