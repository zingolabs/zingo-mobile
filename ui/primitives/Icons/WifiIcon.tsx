import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `wifi` (ISC). */
export function WifiIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M12 20h.01" />
      <Path d="M2 8.82a15 15 0 0 1 20 0" />
      <Path d="M5 12.859a10 10 0 0 1 14 0" />
      <Path d="M8.5 16.429a5 5 0 0 1 7 0" />
    </Icon>
  );
}
