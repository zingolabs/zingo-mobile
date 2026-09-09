import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function XIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}
