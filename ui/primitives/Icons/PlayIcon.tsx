import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `play` (ISC). */
export function PlayIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
    </Icon>
  );
}
