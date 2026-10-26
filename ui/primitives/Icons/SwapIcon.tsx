import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `arrow-left-right` (ISC). */
export function SwapIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M8 3 4 7l4 4" />
      <Path d="M4 7h16" />
      <Path d="m16 21 4-4-4-4" />
      <Path d="M20 17H4" />
    </Icon>
  );
}
