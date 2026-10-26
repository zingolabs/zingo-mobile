import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function HalfCircleIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 3v18" />
      <Path d="M12 3a9 9 0 0 1 0 18" fill={color} fillOpacity={0.35} />
    </Icon>
  );
}
