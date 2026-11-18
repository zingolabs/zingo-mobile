import { useContext, useEffect } from 'react';
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ContextAppLoaded } from '@app/context';

/** How far the last wallet's figures fade while the next one opens. */
const OPENING_OPACITY = 0.28;
const FADE_MS = 240;

/**
 * Fades the open wallet's figures (balance, history) while another one
 * opens in place, so Home reads as on its way out without leaving.
 */
export function useOpeningFade() {
  const { switching } = useContext(ContextAppLoaded);
  const opening = switching.kind === 'opening';
  const opacity = useSharedValue(opening ? OPENING_OPACITY : 1);
  useEffect(() => {
    opacity.value = withTiming(opening ? OPENING_OPACITY : 1, {
      duration: FADE_MS,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    });
  }, [opening, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
