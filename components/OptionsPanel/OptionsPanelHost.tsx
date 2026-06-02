/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import {
  BackHandler,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useBottomSheetModal } from '@gorhom/bottom-sheet';

import OptionsPanel, { OptionsPanelProps } from './OptionsPanel';
import { useOptionsPanel } from '../../app/context/optionsPanel';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SLIDE_DURATION_MS = 500;

type OptionsPanelHostProps = OptionsPanelProps & {
  /** Active app surface (navigator, tabs…). Slides down when isOpen=true. */
  children: React.ReactNode;
};

/**
 * Renders the Options panel as a static background layer and the active
 * app surface on top, sliding it down off-screen when the panel opens.
 * Reads isOpen from <OptionsPanelProvider/> (must wrap this component).
 */
const OptionsPanelHost: React.FC<OptionsPanelHostProps> = ({
  children,
  ...panelProps
}) => {
  const { isOpen, close } = useOptionsPanel();
  const { dismissAll } = useBottomSheetModal();
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(isOpen ? SCREEN_HEIGHT : 0, {
      duration: SLIDE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [isOpen, translateY]);

  // When the panel opens, close any BottomSheetModal that was open in the
  // screen behind. Without this the modal stays mounted (it's portaled
  // under the provider) and would re-appear on top of the next screen the
  // user navigates to from Options.
  const prevIsOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      dismissAll();
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, dismissAll]);

  // Android hardware/gesture back: while the panel is open, the back
  // action just closes it (does NOT pop the underlying screen). This
  // listener is registered last so it runs FIRST in BackHandler's stack;
  // if the panel is closed we return false and the next listener (the
  // existing BottomSheetBackHandler) handles the press normally.
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

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Background layer — always mounted so it's already laid out when
          the front layer slides off; no flash of empty content. */}
      <View style={StyleSheet.absoluteFill}>
        <OptionsPanel {...panelProps} />
      </View>

      {/* Front layer = current app surface. */}
      <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
        {children}
      </Animated.View>
    </View>
  );
};

export default OptionsPanelHost;
