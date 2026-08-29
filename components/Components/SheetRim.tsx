import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { radiusSheet, useTheme } from '../../app/theme';

const RIM_STROKE = 1.5;
const RIM_INSET = RIM_STROKE / 2;

type SheetRimProps = {
  radius?: number;
};

// Measure the sheet width with onLayout so the rim stays aligned when the sheet is narrower than the window.
const SheetRim: React.FunctionComponent<SheetRimProps> = ({ radius = radiusSheet }) => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const inner = radius - RIM_INSET;
  const corner = radius / width;
  const path = `M ${RIM_INSET} ${radius} A ${inner} ${inner} 0 0 1 ${radius} ${RIM_INSET} L ${width - radius} ${RIM_INSET} A ${inner} ${inner} 0 0 1 ${width - RIM_INSET} ${radius}`;

  return (
    <View style={styles.rim} onLayout={onLayout} pointerEvents="none">
      {width > 2 * radius && (
        <Svg width={width} height={radius + RIM_STROKE}>
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
