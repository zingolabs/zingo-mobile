/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Manual re-quote control that doubles as an auto-refresh countdown: a refresh
 * glyph wrapped in a ring that fills clockwise from empty to full over
 * `durationMs` (the quote refresh cadence). The ring restarts whenever
 * `resetKey` changes — pass the live quote's `receivedAtMs` so a fresh quote
 * (auto OR manual) resets the fill.
 *
 * Tapping fires `onPress` (a manual re-quote). While `disabled` (a fetch in
 * flight or the post-tap cooldown) the whole control dims and ignores taps.
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
  /** Change this to restart the fill from 0 (e.g. the quote's receivedAtMs). */
  resetKey: number | string;
  onPress: () => void;
  disabled?: boolean;
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
  onPress,
  disabled,
  style,
  testID,
}: QuoteRefreshRingProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const strokeWidth = 2;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.linear,
      // strokeDashoffset is not supported by the native driver.
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [resetKey, durationMs, progress]);

  // Full offset = empty ring; 0 = full ring. Stable across re-renders.
  const strokeDashoffset = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
      }),
    [progress, circumference],
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      testID={testID}
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
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
    </Pressable>
  );
}
