import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** A swap, in History: what goes out on top, what comes in under it. */
export function TxSwapIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Path d="M20 7H4" />
      <Path d="m16 3 4 4-4 4" />
      <Path d="M4 17h16" />
      <Path d="m8 13-4 4 4 4" />
    </Icon>
  );
}
