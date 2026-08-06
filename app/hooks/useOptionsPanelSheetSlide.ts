import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useOptionsPanel } from '../context/optionsPanel';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Same feel both ways: start fast, decelerate into the resting position.
export const SLIDE_DURATION_MS = 500;
export const SLIDE_EASING = Easing.out(Easing.cubic);

// Cross-fade with the OptionsPanel overlay on open. Phase 1 mirrors the
// panel's fade-in delay (125ms); phase 2 mirrors its fade duration (125ms).
// While the sheet drops, it goes 1 → 0.6 → 0 so that the panel — which
// fades 0 → 1 during phase 2 — blends in instead of replacing.
const SHEET_FADE_PHASE1_MS = 125;
const SHEET_FADE_PHASE2_MS = 125;
const SHEET_PHASE1_OPACITY = 0.6;

/**
 * Slide-down animation for the BottomSheet that lives inside burger
 * screens. Wrap the sheet's container with `<Animated.View>` and apply the
 * returned style:
 *
 *   const slideStyle = useOptionsPanelSheetSlide();
 *   <Animated.View style={[StyleSheet.absoluteFill, slideStyle]}>
 *     <BottomSheet ... />
 *   </Animated.View>
 *
 * Only the sheet moves — the screen's `<Header />` stays fixed and
 * crossfades its own content via `useOptionsPanel` (see Header.tsx).
 */
export function useOptionsPanelSheetSlide() {
  const { isOpen } = useOptionsPanel();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(isOpen ? SCREEN_HEIGHT : 0, {
      duration: SLIDE_DURATION_MS,
      easing: SLIDE_EASING,
    });
    if (isOpen) {
      opacity.value = withSequence(
        withTiming(SHEET_PHASE1_OPACITY, {
          duration: SHEET_FADE_PHASE1_MS,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0, {
          duration: SHEET_FADE_PHASE2_MS,
          easing: Easing.out(Easing.cubic),
        }),
      );
    } else {
      // Close path untouched: snap opacity back to 1 while the sheet is
      // still off-screen, so the slide-up is fully visible from frame one.
      opacity.value = 1;
    }
  }, [isOpen, translateY, opacity]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}
