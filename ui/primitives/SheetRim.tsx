import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '@app/theme';

const SHEET_RADIUS = 40;
const RIM_STROKE = 1.5;
const RIM_INSET = RIM_STROKE / 2;

// Measure the sheet width with onLayout so the rim stays aligned when the sheet is narrower than the window.
const SheetRim: React.FunctionComponent = () => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const corner = SHEET_RADIUS / width;
  const path = `M 0 ${SHEET_RADIUS + RIM_INSET} A ${SHEET_RADIUS} ${SHEET_RADIUS} 0 0 1 ${SHEET_RADIUS} ${RIM_INSET} L ${width - SHEET_RADIUS} ${RIM_INSET} A ${SHEET_RADIUS} ${SHEET_RADIUS} 0 0 1 ${width} ${SHEET_RADIUS + RIM_INSET}`;

  return (
    <View style={styles.rim} onLayout={onLayout} pointerEvents="none">
      {width > 2 * SHEET_RADIUS && (
        <Svg width={width} height={SHEET_RADIUS + RIM_STROKE}>
          <Defs>
            <LinearGradient id="sheetRim" x1="0" y1="0" x2="1" y2="0">
              <Stop
                offset="0"
                stopColor={colors.bottomSheetBorder}
                stopOpacity={0}
              />
              <Stop
                offset={corner}
                stopColor={colors.bottomSheetBorder}
                stopOpacity={1}
              />
              <Stop
                offset={1 - corner}
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
            d={path}
            stroke="url(#sheetRim)"
            strokeWidth={RIM_STROKE}
            fill="none"
          />
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rim: { position: 'absolute', top: 0, left: 0, right: 0 },
});

export default SheetRim;
