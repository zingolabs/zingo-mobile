import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function UserPlusIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={9} cy={8} r={4} />
      <Path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M19 7v6M16 10h6" />
    </Icon>
  );
}
