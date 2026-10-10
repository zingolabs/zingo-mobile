import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function BanIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="m4.9 4.9 14.2 14.2" />
    </Icon>
  );
}
