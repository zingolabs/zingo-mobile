import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** A migration to Ironwood, in History: an arrow up over two layers. */
export function TxMigrationIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Path d="M12 2.5v8.5" />
      <Path d="m8.5 6 3.5-3.5 3.5 3.5" />
      <Path d="m3 13 9 4.5 9-4.5" />
      <Path d="m3 17.5 9 4.5 9-4.5" />
    </Icon>
  );
}
