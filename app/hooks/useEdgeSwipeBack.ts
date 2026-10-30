import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

/** From this close to the left edge, this far or this fast. */
const EDGE = 24;
const SWIPE_BACK = 80;
const SWIPE_FLING = 500;

/**
 * iOS's back swipe where the native one can't run (a modal, a view inside
 * a screen, the onboarding's own transitions): a swipe from the left edge
 * calls `onBack`. Off elsewhere, and off without `onBack`.
 */
export function useEdgeSwipeBack(onBack: (() => void) | undefined) {
  return Gesture.Pan()
    .enabled(Platform.OS === 'ios' && !!onBack)
    .hitSlop({ left: 0, width: EDGE })
    .activeOffsetX(10)
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onEnd(e => {
      if (e.translationX > SWIPE_BACK || e.velocityX > SWIPE_FLING) {
        onBack?.();
      }
    });
}
