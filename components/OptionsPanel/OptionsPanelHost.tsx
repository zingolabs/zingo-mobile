/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useBottomSheetModal } from '@gorhom/bottom-sheet';

import OptionsPanel, { OptionsPanelProps } from './OptionsPanel';
import { useOptionsPanel } from '../../app/context/optionsPanel';

const FADE_DURATION_MS = 320;
// Open sequence (total ≈ 700ms = slide duration):
//   1) 0–350ms:  only the sheet slides down — panel stays at opacity 0
//   2) 350–670ms: panel fades 0 → 1 while the sheet is still sliding,
//      producing the "morphing" overlap between the two surfaces
//   3) end:       panel at full opacity, sheet fully off-screen
// Close path is untouched: panel just fades 1 → 0 immediately.
const OPEN_FADE_DELAY_MS = 350;

type OptionsPanelHostProps = OptionsPanelProps & {
  /** Active app surface (navigator). Stays fixed; only the sheet inside
   *  each screen slides — see per-screen wiring. The header crossfades
   *  via the shared `useOptionsPanel` state read by Header.tsx. */
  children: React.ReactNode;
};

/**
 * Mounts the OptionsPanel as a screen-filling overlay that fades in/out
 * with the panel state. The active app surface stays in place underneath
 * (the per-screen BottomSheet handles its own slide-down). When the panel
 * is closed the overlay is fully transparent and unmounted from the touch
 * tree via `pointerEvents`.
 */
const OptionsPanelHost: React.FC<OptionsPanelHostProps> = ({
  children,
  ...panelProps
}) => {
  const { isOpen, close } = useOptionsPanel();
  const { dismissAll } = useBottomSheetModal();
  const opacity = useSharedValue(0);

  useEffect(() => {
    const tween = withTiming(isOpen ? 1 : 0, {
      duration: FADE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = isOpen ? withDelay(OPEN_FADE_DELAY_MS, tween) : tween;
  }, [isOpen, opacity]);

  // Close any open BottomSheetModal in the screen behind when the panel
  // opens — defensive cleanup (kept from step 5).
  const prevIsOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      dismissAll();
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, dismissAll]);

  // Android hardware/gesture back: while the panel is open, the back
  // action just closes it (does NOT pop the underlying screen).
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isOpen) {
        close();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isOpen, close]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Active app surface — stays fixed. */}
      <View style={StyleSheet.absoluteFill}>{children}</View>

      {/* Options panel — fades in over everything, ignores touches when
          closed so the screen behind stays interactive. */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, overlayStyle]}
      >
        <OptionsPanel {...panelProps} />
      </Animated.View>
    </View>
  );
};

export default OptionsPanelHost;
