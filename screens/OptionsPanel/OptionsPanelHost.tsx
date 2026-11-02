/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import Animated, {
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
import { duration, ease } from '@app/theme/motion';
import { useTheme } from '@app/theme';

/**
 * Opening, the sheet slides away first and the panel fades in over its last
 * part, so the two surfaces overlap; closing, the panel just fades out. A
 * screen pushed from the panel veils it in place with bgScrim (the token
 * carries the dim): the panel never moves, so the screen pops straight back
 * onto it.
 */
const PUSHED_DIM = 1;

type OptionsPanelHostProps = OptionsPanelProps & {
  /** The home tabs. They stay fixed; only the sheet inside each tab slides,
   *  and the header crossfades through the shared `useOptionsPanel` state. */
  children: React.ReactNode;
};

/**
 * Mounts the OptionsPanel as an overlay that fills the home route, so a
 * screen pushed from the panel lands over it. The panel then waits under
 * that screen, dimmed, and comes to the front again when the home
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
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const dim = useSharedValue(0);
  const shown = kind !== 'closed';
  const front = kind === 'open';

  useEffect(() => {
    const tween = withTiming(shown ? 1 : 0, {
      duration: duration.fast,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
    opacity.value = shown ? withDelay(duration.fast, tween) : tween;
  }, [shown, opacity]);

  useEffect(() => {
    const under = kind === 'under';
    dim.value = withTiming(under ? PUSHED_DIM : 0, {
      duration: under ? duration.screen : duration.sheetClose,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
  }, [kind, dim]);

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
  const dimStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Active app surface — stays fixed. */}
      <View style={StyleSheet.absoluteFill}>{children}</View>

      {/* Options panel — fades in over the home. Closed, it is out of the
          touch tree. Under a screen it holds every touch without answering
          it: while that screen pops it is in sight, and a tap must not reach
          the home behind it. */}
      <Animated.View
        testID={`optionspanel.${kind}`}
        pointerEvents={shown ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, overlayStyle]}
      >
        <View
          pointerEvents={front ? 'auto' : 'none'}
          style={StyleSheet.absoluteFill}
        >
          <OptionsPanel {...panelProps} />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.bgScrim },
            dimStyle,
          ]}
        />
      </Animated.View>
    </View>
  );
};

export default OptionsPanelHost;
