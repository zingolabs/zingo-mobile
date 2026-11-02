import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@app/theme';

/** The emblem's own proportions (its viewBox). */
const WIDTH = 74.33353374;
const HEIGHT = 86.52671914;

/**
 * SwapKit's emblem, drawn from the white version they publish for dark
 * backgrounds (swapkit.dev/logos/swapkit-emblem-white.svg), in its own colour.
 */
export default function SwapKitLogo({ height = 16 }: { height?: number }) {
  const { colors } = useTheme();
  return (
    <Svg
      width={(height * WIDTH) / HEIGHT}
      height={height}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      accessible={false}
    >
      <Path
        fill={colors.fgSwapKitMark}
        d="M24.67985466,0C11.07124131,0,0,11.07124131,0,24.67985466h12.38851737c0-6.7773392,5.51399808-12.29133729,12.29133729-12.29133729h49.65367908V0H24.67985466Z"
      />
      <Path
        fill={colors.fgSwapKitMark}
        d="M12.38900327,37.06934383h49.55552719v12.38997507H12.38851737v-12.38851737H0v24.77703475h61.94453047c-.00024295,6.77654961-5.5141803,12.29036549-12.29085139,12.29036549H0v12.38851737h49.65367908c13.60812745,0,24.67936876-11.07124131,24.67936876-24.67936876h-12.38851737v-12.38754557h12.38851737v-24.77897835H12.38900327v12.38851737Z"
      />
    </Svg>
  );
}
