import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function CheckIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}
