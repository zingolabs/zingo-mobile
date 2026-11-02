import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Sent, in History: an arrow up and out. */
export function TxSentIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Path d="M7 7h10v10" />
      <Path d="M7 17 17 7" />
    </Icon>
  );
}
