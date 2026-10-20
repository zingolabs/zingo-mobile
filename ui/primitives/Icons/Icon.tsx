import React from 'react';
import Svg, { SvgProps } from 'react-native-svg';
import { iconSize, iconStroke } from '@app/theme';

/**
 * The SVG stroke that shows `iconStroke` at `size`: the 24 grid scales the
 * stroke with the icon, so a 16 icon would otherwise look thin and a 34 bold.
 */
export const strokeFor = (size: number) => (iconStroke * iconSize) / size;

interface IconSvgProps extends Omit<SvgProps, 'strokeWidth'> {
  size?: number;
  color?: string;
  children?: React.ReactNode;
}

export function Icon({
  size = iconSize,
  color = 'currentColor',
  children,
  ...rest
}: IconSvgProps) {
  return (
    <Svg
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeFor(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...rest}
    >
      {children}
    </Svg>
  );
}
