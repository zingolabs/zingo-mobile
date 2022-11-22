/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { Svg, Circle, Text as SVGText } from 'react-native-svg';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';

type circularProgressProps = {
  bgColor?: string;
  pgColor?: string;
  textSize?: number;
  textColor?: string;
  size: number;
  strokeWidth: number;
  text: string;
  progressPercent: number;
};

const CircularProgress: React.FunctionComponent<circularProgressProps> = props => {
  const { colors } = useTheme() as unknown as ThemeType;
  const { size, strokeWidth, text, progressPercent } = props;
  const radius = (size - strokeWidth) / 2;
  const circum = radius * 2 * Math.PI;
  const svgProgress = 100 - progressPercent;

  return (
    <View style={{ margin: 10 }}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          stroke={props.bgColor ? props.bgColor : colors.card}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          {...{ strokeWidth }}
        />

        {/* Progress Circle */}
        <Circle
          stroke={props.pgColor ? props.pgColor : colors.primary}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={`${circum} ${circum}`}
          strokeDashoffset={radius * Math.PI * 2 * (svgProgress / 100)}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          {...{ strokeWidth }}
        />

        {/* Text */}
        <SVGText
          fontSize={props.textSize ? props.textSize : '10'}
          x={size / 2}
          y={size / 2 + (props.textSize ? props.textSize / 2 - 1 : 5)}
          textAnchor="middle"
          fill={props.textColor ? props.textColor : colors.text}>
          {text}
        </SVGText>
      </Svg>
    </View>
  );
};

export default CircularProgress;
