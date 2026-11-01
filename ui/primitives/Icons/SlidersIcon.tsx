import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function SlidersIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Path d="M21 4h-7" />
      <Path d="M10 4H3" />
      <Path d="M21 12h-9" />
      <Path d="M8 12H3" />
      <Path d="M21 20h-5" />
      <Path d="M12 20H3" />
      <Path d="M14 2v4" />
      <Path d="M8 10v4" />
      <Path d="M16 18v4" />
    </Icon>
  );
}
