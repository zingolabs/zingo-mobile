import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { strokeFor } from './Icon';

type SproutIconProps = {
  size?: number;
  color: string;
  potColor?: string;
};

// The seed phrase mark: two leaves on a stem over a pot.
export function SproutIcon({
  size = 16,
  color,
  potColor = '#5A3A1E',
}: SproutIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Drawn on a 16 x 15 grid, scaled onto 24 and centered until it is redrawn. */}
      <G transform="translate(0 0.75) scale(1.5)">
        <Path
          d="M8 12.2V6.4M8 7.2C8 4.3 6 2.4 1.8 2.4c0 3 1.9 4.8 6.2 4.8zM8 6.3C8 3.3 10 1.3 14.2 1.3c0 3-1.9 5-6.2 5z"
          stroke={color}
          strokeWidth={strokeFor(size) / 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect
          x={2.8}
          y={12.2}
          width={10.4}
          height={2.3}
          rx={1.15}
          fill={potColor}
        />
      </G>
    </Svg>
  );
}
