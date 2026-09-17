import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@app/theme';

// The round-button analog of SheetRim: a full bottomSheetBorder ring.
const STROKE = 1;

const RingBorder: React.FunctionComponent<{ size: number }> = ({ size }) => {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} style={styles.ring} pointerEvents="none">
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={(size - STROKE) / 2}
        stroke={colors.bottomSheetBorder}
        strokeWidth={STROKE}
        fill="none"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  ring: { position: 'absolute', top: 0, left: 0 },
});

export default RingBorder;
