import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import useReduceMotion from './useReduceMotion';

export type TrickleProgress = {
  // The bar's value, 0..1. Interpolate to a transform, not a width: the bar
  // runs on the native driver and cannot animate layout.
  progress: Animated.Value;
  // Push the ceiling forward as real progress lands. Clamped to 0.985 so the
  // bar never looks finished before finish() is called.
  setCeiling: (ceiling: number) => void;
  // Halt the trickle where it is (error path: the work is no longer
  // progressing and the bar should not pretend otherwise).
  stop: () => void;
  // Halt the trickle and glide the bar the rest of the way to 100%, then run
  // the callback (skipped if the component unmounted mid-glide).
  finish: (onFinished?: () => void) => void;
};

// An always-animated progress bar driver: a continuously-easing "trickle"
// glides the bar toward a ceiling set just past confirmed progress and never
// quite reaches it, so it is always in motion and never jumps in discrete
// steps. Real progress events push the ceiling forward via setCeiling;
// completion pushes it to 1 via finish. Extracted from MigrationSending so
// the splitting screen renders the same feel from coarser events.
const useTrickleProgress = (initialCeiling: number = 0.08): TrickleProgress => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  // Where the bar is headed. Each step runs to completion, so the target it
  // was handed is where it ends up. Reading the value back through a listener
  // instead would put a JS callback on every frame of a native animation,
  // which is the whole cost this bar is trying to avoid.
  const targetRef = useRef(0);
  // Small head start so the bar moves from mount.
  const ceilingRef = useRef(initialCeiling);
  // A ref, not state, so the animation loop reads the latest value without
  // re-subscribing.
  const doneRef = useRef(false);
  const reduceMotion = useReduceMotion();

  // The trickle driver: chains short eased steps, each closing a fraction of
  // the gap to the ceiling, so the bar is perpetually moving. Stops once
  // stop()/finish() marks the work done, or on unmount.
  useEffect(() => {
    if (reduceMotion) {
      // Drop the perpetual creep and let the bar sit where real progress put
      // it. The reading survives, the movement does not.
      progressAnim.setValue(Math.min(1, ceilingRef.current));
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled || doneRef.current) {
        return;
      }
      const target =
        targetRef.current + (ceilingRef.current - targetRef.current) * 0.12;
      targetRef.current = target;
      Animated.timing(progressAnim, {
        toValue: target,
        duration: 360,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled && !doneRef.current) {
          tick();
        }
      });
    };
    tick();
    return () => {
      cancelled = true;
      progressAnim.stopAnimation();
    };
  }, [progressAnim, reduceMotion]);

  const setCeiling = useCallback(
    (ceiling: number) => {
      ceilingRef.current = Math.min(0.985, ceiling);
      if (reduceMotion) {
        targetRef.current = ceilingRef.current;
        progressAnim.setValue(ceilingRef.current);
      }
    },
    [progressAnim, reduceMotion],
  );

  const stop = useCallback(() => {
    doneRef.current = true;
    // Halt the step already in flight. Without this the bar keeps advancing
    // for up to another 360ms after the work it reports has stopped.
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const finish = useCallback(
    (onFinished?: () => void) => {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      if (reduceMotion) {
        progressAnim.setValue(1);
        if (onFinished) {
          onFinished();
        }
        return;
      }
      // Supersedes any in-flight trickle step on the same Animated.Value. If
      // the component unmounts mid-glide, the trickle cleanup's stopAnimation
      // lands finished=false and the callback is skipped.
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && onFinished) {
          onFinished();
        }
      });
    },
    [progressAnim, reduceMotion],
  );

  return { progress: progressAnim, setCeiling, stop, finish };
};

export default useTrickleProgress;
