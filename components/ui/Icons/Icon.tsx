import React from 'react';
import Svg, { SvgProps } from 'react-native-svg';

interface IconSvgProps extends SvgProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export function Icon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  children,
  ...rest
}: IconSvgProps) {
  return (
    <Svg
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...rest}
    >
      {children}
    </Svg>
  );
}
