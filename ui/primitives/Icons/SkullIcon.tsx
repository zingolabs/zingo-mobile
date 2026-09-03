import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function SkullIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="m12.5 17-.5-1-.5 1h1z" />
      <Path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z" />
      <Circle cx={15} cy={12} r={1} />
      <Circle cx={9} cy={12} r={1} />
    </Icon>
  );
}
