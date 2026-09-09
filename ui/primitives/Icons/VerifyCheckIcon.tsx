import React from 'react';
import { Icon } from './Icon';
import { Path } from 'react-native-svg';

export function VerifyCheckIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <Path d="m9 11 3 3L22 4" />
    </Icon>
  );
}
