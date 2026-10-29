import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

/** A transaction still in the mempool or confirming, in History. */
export function TxPendingIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 6v6l4 2" />
    </Icon>
  );
}
