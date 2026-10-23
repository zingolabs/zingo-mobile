import { useEffect } from 'react';
import {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ease } from '@app/theme/motion';

/** How long a fold takes to open, from the redesign's motion rules. */
const UNFOLD_MS = 260;

/**
 * The style a row takes as a fold opens under it: it fades in and settles
 * from a few points up. Shared values rather than an entering keyframe,
 * which the visual tests' fake clock cannot capture on mount.
 */
export function useUnfold() {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(1, {
      duration: UNFOLD_MS,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
  }, [shown]);
  return useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * -6 }],
  }));
}
