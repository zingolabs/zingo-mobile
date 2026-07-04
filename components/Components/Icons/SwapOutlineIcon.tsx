import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

type Props = { size?: number; color?: string };

export function SwapOutlineIcon({ size = 28, color = '#fff' }: Props) {
  return (
    <Icon size={size} color={color} viewBox="0 0 24 24" strokeWidth={2.5}>
      {/* Top arrow pointing right */}
      <Path d="M3 8h16M15 4l4 4-4 4" />
      {/* Bottom arrow pointing left */}
      <Path d="M21 16H5M9 20l-4-4 4-4" />
    </Icon>
  );
}
