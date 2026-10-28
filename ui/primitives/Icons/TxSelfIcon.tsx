import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Sent to yourself, in History: two arrows in a loop. */
export function TxSelfIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Path d="m17 2 4 4-4 4" />
      <Path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <Path d="m7 22-4-4 4-4" />
      <Path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Icon>
  );
}
