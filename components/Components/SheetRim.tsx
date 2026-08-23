import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../app/theme';

const SHEET_W = Dimensions.get('window').width;
const SHEET_RADIUS = 40;
const RIM_STROKE = 1.5;
const RIM_INSET = RIM_STROKE / 2;
const RIM_CORNER = SHEET_RADIUS / SHEET_W;
const RIM_PATH = `M 0 ${SHEET_RADIUS + RIM_INSET} A ${SHEET_RADIUS} ${SHEET_RADIUS} 0 0 1 ${SHEET_RADIUS} ${RIM_INSET} L ${SHEET_W - SHEET_RADIUS} ${RIM_INSET} A ${SHEET_RADIUS} ${SHEET_RADIUS} 0 0 1 ${SHEET_W} ${SHEET_RADIUS + RIM_INSET}`;

const SheetRim: React.FunctionComponent = () => {
  const { colors } = useTheme();
  return (
    <Svg
      width={SHEET_W}
      height={SHEET_RADIUS + RIM_STROKE}
      style={styles.rim}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="sheetRim" x1="0" y1="0" x2="1" y2="0">
          <Stop
            offset="0"
            stopColor={colors.bottomSheetBorder}
            stopOpacity={0}
          />
          <Stop
            offset={RIM_CORNER}
            stopColor={colors.bottomSheetBorder}
            stopOpacity={1}
          />
          <Stop
            offset={1 - RIM_CORNER}
            stopColor={colors.bottomSheetBorder}
            stopOpacity={1}
          />
          <Stop
            offset="1"
            stopColor={colors.bottomSheetBorder}
            stopOpacity={0}
          />
        </LinearGradient>
      </Defs>
      <Path
        d={RIM_PATH}
        stroke="url(#sheetRim)"
        strokeWidth={RIM_STROKE}
        fill="none"
      />
    </Svg>
  );
};

const styles = StyleSheet.create({
  rim: { position: 'absolute', top: 0, left: 0 },
});

export default SheetRim;
