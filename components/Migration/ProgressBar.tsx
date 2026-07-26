/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';

type ProgressBarProps = {
  // 0..1, driven frame for frame. Phases that report continuously have nothing
  // discrete to count, so the bar travels rather than lighting pieces: see
  // SegmentedBar for the other case.
  progress: Animated.Value;
  color?: string;
  height?: number;
};

// The fill is scaled from its left edge rather than sized in percent, so the
// bar runs on the native driver and keeps moving while a Halo2 proof occupies
// the JS thread. The track clips the rounded ends, so the fill carries no
// radius of its own to squash.
const ProgressBar: React.FunctionComponent<ProgressBarProps> = ({
  progress,
  color,
  height = 6,
}) => {
  const { colors } = useTheme() as ThemeType;

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.bottomSheetBorder,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: color ?? colors.primary,
            transformOrigin: 'left',
            transform: [{ scaleX: progress }],
          },
        ]}
      />
    </View>
  );
};

export default ProgressBar;
