import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Received, in History: an arrow down and in. */
export function TxReceivedIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Path d="M17 7 7 17" />
      <Path d="M17 17H7V7" />
    </Icon>
  );
}
