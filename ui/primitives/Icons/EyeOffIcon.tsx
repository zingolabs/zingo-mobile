import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function EyeOffIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M10.73 5.08a10.75 10.75 0 0 1 11.2 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49" />
      <Path d="M14.08 14.16a3 3 0 0 1-4.24-4.24" />
      <Path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14" />
      <Path d="m2 2 20 20" />
    </Icon>
  );
}
