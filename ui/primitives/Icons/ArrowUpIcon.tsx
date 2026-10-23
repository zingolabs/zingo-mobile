import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `arrow-up` (ISC). */
export function ArrowUpIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="m5 12 7-7 7 7" />
      <Path d="M12 19V5" />
    </Icon>
  );
}
