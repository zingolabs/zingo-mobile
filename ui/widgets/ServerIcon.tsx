import React, { useEffect } from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// The dot crossfades to its new color.
const DOT_MS = 300;

import { useTheme } from '@app/theme';

// The tone the option icons are drawn in.
const STROKE = '#B1BBC5';

type ServerIconProps = {
  // No internet or a server that doesn't answer turns the dot red, Offline
  // grey; otherwise it is green.
  noInternet: boolean;
  unreachable?: boolean;
  offline: boolean;
  size?: number;
  // The surface behind the icon, for the ring that cuts the dot out.
  background?: string;
};

// The server icon: a database cylinder with a status dot.
const ServerIcon: React.FC<ServerIconProps> = ({
  noInternet,
  unreachable,
  offline,
  size = 32,
  background,
}) => {
  const { colors } = useTheme();
  const dot =
    noInternet || (unreachable && !offline)
      ? colors.fgDangerEmphasis
      : offline
        ? colors.fgMuted
        : colors.fgAccent;
  const from = useSharedValue(dot);
  const to = useSharedValue(dot);
  const mix = useSharedValue(1);
  useEffect(() => {
    if (dot === to.value) {
      return;
    }
    from.value = to.value;
    to.value = dot;
    mix.value = 0;
    mix.value = withTiming(1, { duration: DOT_MS });
  }, [dot, from, to, mix]);
  const dotProps = useAnimatedProps(() => ({
    fill: interpolateColor(mix.value, [0, 1], [from.value, to.value]),
  }));
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M22.5 9C22.5 10.6569 18.9183 12 14.5 12C10.0817 12 6.5 10.6569 6.5 9C6.5 7.34315 10.0817 6 14.5 6C18.9183 6 22.5 7.34315 22.5 9Z"
        stroke={STROKE}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 9V16M6.5 16V23C6.5 24.7 10.1 26 14.5 26C18.9 26 22.5 24.7 22.5 23V16M6.5 16C6.5 17.7 10.1 19 14.5 19C18.9 19 22.5 17.7 22.5 16M22.5 16V9"
        stroke={STROKE}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <AnimatedCircle
        testID="server.icon.dot"
        cx={25.5}
        cy={25.5}
        r={5.5}
        animatedProps={dotProps}
        stroke={background ?? colors.bgCanvas}
        strokeWidth={2}
      />
    </Svg>
  );
};

export default ServerIcon;
