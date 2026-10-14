/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Svg, Circle, Text as SVGText } from 'react-native-svg';
import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';

const FILL_MS = 900;
const FILL_AT = 200;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type circularProgressProps = {
  bgColor?: string;
  pgColor?: string;
  textSize?: number;
  textColor?: string;
  textWeight?: 'normal' | 'bold';
  size: number;
  strokeWidth: number;
  text: string;
  progressPercent: number;
};

// A ring that fills to its percentage, easing from where it stood.
const CircularProgress: React.FunctionComponent<
  circularProgressProps
> = props => {
  const { colors } = useTheme();
  const { size, strokeWidth, text, progressPercent } = props;
  const radius = (size - strokeWidth) / 2;
  const circum = radius * 2 * Math.PI;
  const filled = useSharedValue(0);

  useEffect(() => {
    filled.value = withDelay(
      FILL_AT,
      withTiming(progressPercent / 100, {
        duration: FILL_MS,
        easing: ease.out,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [progressPercent, filled]);

  const arc = useAnimatedProps(() => ({
    strokeDashoffset: circum * (1 - filled.value),
  }));

  return (
    <View style={{ margin: 10 }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={props.bgColor ? props.bgColor : colors.bgCanvas}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          {...{ strokeWidth }}
        />

        <AnimatedCircle
          stroke={props.pgColor ? props.pgColor : colors.fgAccent}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={`${circum} ${circum}`}
          strokeDashoffset={circum * (1 - progressPercent / 100)}
          animatedProps={arc}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          {...{ strokeWidth }}
        />

        <SVGText
          fontSize={props.textSize ? props.textSize : '10'}
          fontWeight={props.textWeight ?? 'normal'}
          x={size / 2}
          y={size / 2 + (props.textSize ? props.textSize / 2 - 1 : 5)}
          textAnchor="middle"
          fill={props.textColor ? props.textColor : colors.fgDefault}
        >
          {text}
        </SVGText>
      </Svg>
    </View>
  );
};

export default CircularProgress;
