import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function KeyIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={7.5} cy={15.5} r={5} />
      <Path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
    </Icon>
  );
}
