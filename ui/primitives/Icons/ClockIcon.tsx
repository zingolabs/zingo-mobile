import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function ClockIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Icon>
  );
}
