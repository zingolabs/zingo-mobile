import React from 'react';
import { Icon } from './Icon';
import { Circle, Path } from 'react-native-svg';

export function VerifyXIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="m15 9-6 6M9 9l6 6" />
    </Icon>
  );
}
