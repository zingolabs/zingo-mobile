import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

const GREEN = '#37D41F';

type Sized = { size?: number };

export function HalfCircleIcon({ size = 17 }: Sized) {
  return (
    <Icon size={size} color={GREEN} strokeWidth={1.9}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 3v18" />
      <Path d="M12 3a9 9 0 0 1 0 18" fill={GREEN} fillOpacity={0.35} />
    </Icon>
  );
}
