/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo } from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, FeGaussianBlur, Filter, G, Path } from 'react-native-svg';
import { create } from 'qrcode';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { SnowflakeIcon } from '@ui/primitives/Icons/SnowflakeIcon';

const VEIL_MS = 220;
const BLUR_PT = 9;
const QUIET = 2;
const LOGO = 34;
const INK = '#060B12';
const PAPER = '#FFFFFF';

// Native filters run on the bitmap in device pixels; web runs in points.
const BLUR_DEVIATION =
  Platform.OS === 'web' ? BLUR_PT : BLUR_PT * PixelRatio.get();

// One path for every dark module, in module units.
const modulesPath = (text: string): { d: string; size: number } => {
  const { modules } = create(text, { errorCorrectionLevel: 'M' });
  let d = '';
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) {
        d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
      }
    }
  }
  return { d, size: modules.size + QUIET * 2 };
};

const Code = React.memo<{
  d: string;
  units: number;
  px: number;
  blur: boolean;
}>(({ d, units, px, blur }) => (
  <Svg width={px} height={px} viewBox={`0 0 ${units} ${units}`}>
    {blur && (
      <Defs>
        <Filter
          id="qrblur"
          filterUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={units}
          height={units}
        >
          <FeGaussianBlur stdDeviation={(BLUR_DEVIATION * units) / px} />
        </Filter>
      </Defs>
    )}
    <G filter={blur ? 'url(#qrblur)' : undefined}>
      <Path d={`M0 0h${units}v${units}h-${units}z`} fill={PAPER} />
      <Path d={d} fill={INK} />
    </G>
  </Svg>
));

type KeyQrProps = {
  value: string;
  size: number;
  hidden: boolean;
};

// A scannable QR of the viewing key with a snowflake in the middle. Hidden,
// it blurs and dims; both renderings stay mounted and only cross-fade.
const KeyQr: React.FunctionComponent<KeyQrProps> = ({
  value,
  size,
  hidden,
}) => {
  const { colors } = useTheme();
  const { d, size: units } = useMemo(() => modulesPath(value), [value]);
  const veil = useSharedValue(hidden ? 1 : 0);
  useEffect(() => {
    veil.value = withTiming(hidden ? 1 : 0, {
      duration: VEIL_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.Never,
    });
  }, [hidden, veil]);
  const sharp = useAnimatedStyle(() => ({ opacity: 1 - veil.value }));
  const blurred = useAnimatedStyle(() => ({ opacity: veil.value * 0.55 }));

  return (
    <View
      testID="viewingkey.qr"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: PAPER,
      }}
    >
      <Animated.View style={[{ position: 'absolute' }, sharp]}>
        <Code d={d} units={units} px={size} blur={false} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, blurred]}>
        <Code d={d} units={units} px={size} blur />
      </Animated.View>
      <View
        style={{
          position: 'absolute',
          left: (size - LOGO) / 2,
          top: (size - LOGO) / 2,
          width: LOGO,
          height: LOGO,
          borderRadius: 9,
          backgroundColor: PAPER,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SnowflakeIcon size={22} color={colors.fgViewOnly} strokeWidth={2} />
      </View>
    </View>
  );
};

export default KeyQr;
