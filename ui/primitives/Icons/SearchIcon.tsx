import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function SearchIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={11} cy={11} r={8} />
      <Path d="m21 21-4.3-4.3" />
    </Icon>
  );
}
