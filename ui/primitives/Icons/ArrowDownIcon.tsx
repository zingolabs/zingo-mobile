import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `arrow-down` (ISC). */
export function ArrowDownIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M12 5v14" />
      <Path d="m19 12-7 7-7-7" />
    </Icon>
  );
}
