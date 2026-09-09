import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function EyeIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <Circle cx={12} cy={12} r={3} />
    </Icon>
  );
}
