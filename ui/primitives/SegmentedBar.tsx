/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '@app/theme';

import useReduceMotion from '@app/hooks/useReduceMotion';

// A segment lights up where it stands instead of growing across itself, so a
// confirmation reads as a switch thrown rather than a distance covered. Opacity
// is the only thing that changes, which keeps the whole bar on the native
// driver while proving work occupies the JS thread.
const FILL_MS = 180;
// Broadcast is the softer state, so it arrives slower than a confirmation, and
// each segment of the run lights this long after the one before it.
const ACTIVE_FILL_MS = 220;
const ACTIVE_STAGGER_MS = 40;
// The frontier segment breathes: one half-cycle each way, at an amplitude low
// enough that it never resolves into something moving, only into a bar that is
// still working.
const BREATHE_MS = 900;
const BREATHE_PEAK = 0.3;
// A confirmation flares on the segment that just lit. Quick up, slow down, so
// the eye catches the arrival and not the decay.
const FLASH_IN_MS = 90;
const FLASH_OUT_MS = 420;
const FLASH_PEAK = 0.5;
// Both highlights are white laid over the fill, so brighter means the same
// colour with more light in it rather than a second colour.
const HIGHLIGHT = '#ffffff';
const GAP = 3;

type SegmentedBarProps = {
  // One segment per piece the phase works through: batches on the status
  // screens, parts inside a batch. Phases that report continuously rather than
  // in confirmations have nothing to count and use ProgressBar instead.
  segments: number;
  // Share of the whole bar that is done, 0..1. Segments light whole, since the
  // confirmations behind this number land whole.
  progress: number;
  // First piece in flight, lit in activeColor ahead of the confirmed run. For
  // work whose only signal is "started" or "finished", with nothing to
  // interpolate in between.
  active?: number;
  // How many pieces are in flight together, a broadcast batch being the case
  // that needs more than one.
  activeSpan?: number;
  activeColor?: string;
  color?: string;
  height?: number;
};

type SegmentProps = {
  // How lit the segment should read, 0 or 1. Eased to from wherever the segment
  // already sits, so one lit by a broadcast run stays lit when the run moves
  // past it and the colour swaps underneath.
  level: number;
  fillMs: number;
  fillDelay: number;
  // The breathe's contribution to the highlight, already gated: flat zero on
  // every segment but the frontier.
  ambient: Animated.AnimatedInterpolation<number>;
  // The flash fires on the false-to-true edge, not on the state.
  confirmed: boolean;
  color: string;
  trackColor: string;
  height: number;
  radius: number;
  gap: boolean;
};

const Segment: React.FunctionComponent<SegmentProps> = ({
  level,
  fillMs,
  fillDelay,
  ambient,
  confirmed,
  color,
  trackColor,
  height,
  radius,
  gap,
}) => {
  const opacity = useRef(new Animated.Value(level)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const wasConfirmed = useRef(confirmed);

  useEffect(() => {
    const anim = Animated.timing(opacity, {
      toValue: level,
      duration: fillMs,
      delay: fillDelay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [level, fillMs, fillDelay, opacity]);

  useEffect(() => {
    const rising = confirmed && !wasConfirmed.current;
    wasConfirmed.current = confirmed;
    if (!rising) {
      return;
    }
    const anim = Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: FLASH_IN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(flash, {
        toValue: 0,
        duration: FLASH_OUT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => {
      anim.stop();
      flash.setValue(0);
    };
  }, [confirmed, flash]);

  // Both highlights ride the fill's own opacity, so neither can whiten a
  // segment the fill has not reached.
  const glow = Animated.multiply(
    Animated.add(
      flash.interpolate({ inputRange: [0, 1], outputRange: [0, FLASH_PEAK] }),
      ambient,
    ),
    opacity,
  );

  return (
    <View
      style={{
        flex: 1,
        height,
        borderRadius: radius,
        backgroundColor: trackColor,
        overflow: 'hidden',
        marginRight: gap ? GAP : 0,
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: color, opacity },
        ]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: HIGHLIGHT, opacity: glow },
        ]}
      />
    </View>
  );
};

// A progress bar cut into one segment per piece of work. Each segment lights on
// its own, so progress reads as pieces done rather than a distance travelled,
// and the user can count what is left against the list of batches or
// transactions on the same screen.
const SegmentedBar: React.FunctionComponent<SegmentedBarProps> = ({
  segments,
  progress,
  active,
  activeSpan = 1,
  activeColor,
  color,
  height = 6,
}) => {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();

  // A plan whose size is still being fetched renders as one empty segment
  // rather than nothing at all.
  const count = Math.max(1, segments);
  const fill = color ?? colors.fgAccent;
  const radius = height / 2;

  // Callers pass exact multiples of one segment, so this is a count and not a
  // rounding guess.
  const litCount = Math.round(progress * count);
  const complete = litCount >= count;
  // Where the breathe sits: the last segment of an in-flight run, or the last
  // one confirmed. Negative until something is lit.
  const frontier =
    active === undefined
      ? litCount - 1
      : Math.min(count - 1, active + activeSpan - 1);

  const breathe = useRef(new Animated.Value(0)).current;
  // Nothing to imply on a bar that is empty or finished, so the loop does not
  // run at all rather than running behind a gate that holds it at zero.
  const breathing = !reduceMotion && !complete && frontier >= 0;

  useEffect(() => {
    if (!breathing) {
      breathe.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: BREATHE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: BREATHE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, breathing]);

  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: count }).map((_, i) => {
        const runIndex = active === undefined ? -1 : i - active;
        const inFlight = runIndex >= 0 && runIndex < activeSpan;
        return (
          <Segment
            key={i}
            level={inFlight || i < litCount ? 1 : 0}
            fillMs={inFlight ? ACTIVE_FILL_MS : FILL_MS}
            fillDelay={
              inFlight && !reduceMotion ? runIndex * ACTIVE_STAGGER_MS : 0
            }
            ambient={breathe.interpolate({
              inputRange: [0, 1],
              outputRange: [0, breathing && i === frontier ? BREATHE_PEAK : 0],
            })}
            confirmed={!reduceMotion && !inFlight && i < litCount}
            // The swap out of activeColor is a cut, covered by the flash that
            // fires on the same confirmation.
            color={inFlight ? (activeColor ?? fill) : fill}
            trackColor={colors.bottomSheetBorder}
            height={height}
            radius={radius}
            gap={i < count - 1}
          />
        );
      })}
    </View>
  );
};

export default SegmentedBar;
