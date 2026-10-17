/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import {
  BackHandler,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useBottomSheetModal } from '@gorhom/bottom-sheet';
import { useIsFocused } from '@react-navigation/native';

import OptionsPanel, { OptionsPanelProps } from './OptionsPanel';
import { useOptionsPanel } from '@app/context/optionsPanel';
import { ease } from '@app/theme/motion';
import { useTheme } from '@app/theme';

const FADE_DURATION_MS = 125;
// Open sequence (total ≈ 250ms = slide duration):
//   1) 0–125ms:   only the sheet slides down — panel stays at opacity 0
//   2) 125–250ms: panel fades 0 → 1 while the sheet is still sliding,
//      producing the "morphing" overlap between the two surfaces
//   3) end:       panel at full opacity, sheet fully off-screen
// Close path is untouched: panel just fades 1 → 0 immediately.
const OPEN_FADE_DELAY_MS = 125;
// A screen pushed from the panel shifts it back and dims it, the same way
// the seed backup sits over WalletSeed.
const PUSHED_SHIFT = 0.28;
const PUSHED_DIM = 0.55;
const PUSH_IN_MS = 380;
const PUSH_OUT_MS = 320;

type OptionsPanelHostProps = OptionsPanelProps & {
  /** The home tabs. They stay fixed; only the sheet inside each tab slides,
   *  and the header crossfades through the shared `useOptionsPanel` state. */
  children: React.ReactNode;
};

/**
 * Mounts the OptionsPanel as an overlay that fills the home route, so a
 * screen pushed from the panel lands over it. The panel then waits under
 * that screen, shifted back, and comes to the front again when the home
 * regains the focus. Closed, the overlay is transparent and out of the
 * touch tree.
 */
const OptionsPanelHost: React.FC<OptionsPanelHostProps> = ({
  children,
  ...panelProps
}) => {
  const { kind, close, surface } = useOptionsPanel();
  const { dismissAll } = useBottomSheetModal();
  const focused = useIsFocused();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const shift = useSharedValue(0);
  const shown = kind !== 'closed';
  const front = kind === 'open';

  useEffect(() => {
    const tween = withTiming(shown ? 1 : 0, {
      duration: FADE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = shown ? withDelay(OPEN_FADE_DELAY_MS, tween) : tween;
  }, [shown, opacity]);

  useEffect(() => {
    const under = kind === 'under';
    shift.value = withTiming(under ? 1 : 0, {
      duration: under ? PUSH_IN_MS : PUSH_OUT_MS,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
  }, [kind, shift]);

  // The screen pushed over the panel has popped: the panel is in front again.
  const wasFocused = useRef(focused);
  useEffect(() => {
    if (focused && !wasFocused.current) {
      surface();
    }
    wasFocused.current = focused;
  }, [focused, surface]);

  // Close any open BottomSheetModal in the screen behind when the panel
  // opens — defensive cleanup (kept from step 5).
  const wasShown = useRef(false);
  useEffect(() => {
    if (shown && !wasShown.current) {
      dismissAll();
    }
    wasShown.current = shown;
  }, [shown, dismissAll]);

  // Android hardware/gesture back: while the panel is in front, the back
  // action just closes it (does NOT pop the underlying screen).
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (front) {
        close();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [front, close]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width * PUSHED_SHIFT * shift.value }],
  }));
  const dimStyle = useAnimatedStyle(() => ({
    opacity: PUSHED_DIM * shift.value,
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Active app surface — stays fixed. */}
      <View style={StyleSheet.absoluteFill}>{children}</View>

      {/* Options panel — fades in over the home, ignores touches unless it
          is in front so the screen behind stays interactive. */}
      <Animated.View
        testID={`optionspanel.${kind}`}
        pointerEvents={front ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, overlayStyle]}
      >
        {/* Fills the strip the shifted panel leaves, so the home never shows
            through while a pushed screen pops off it. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.bgCanvas },
          ]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, panelStyle]}>
          <OptionsPanel {...panelProps} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#000' },
            dimStyle,
          ]}
        />
      </Animated.View>
    </View>
  );
};

export default OptionsPanelHost;
