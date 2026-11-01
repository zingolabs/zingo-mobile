import React from 'react';
import Svg, { Circle, Path, SvgProps } from 'react-native-svg';
import { strokeFor } from './Icon';

type Props = {
  size?: number;
  /** The disc. */
  color: string;
  /** The check on the disc. */
  checkColor: string;
  style?: SvgProps['style'];
};

export function CheckCircleIcon({
  size = 20,
  color,
  checkColor,
  style,
}: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
    >
      <Circle cx={12} cy={12} r={10} fill={color} />
      <Path
        d="m7.5 12.3 3 3 6-6.3"
        stroke={checkColor}
        strokeWidth={strokeFor(size) * 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
