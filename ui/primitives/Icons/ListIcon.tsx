import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function ListIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13" />
    </Icon>
  );
}
