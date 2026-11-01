import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `arrow-right` (ISC). */
export function ArrowRightIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </Icon>
  );
}
