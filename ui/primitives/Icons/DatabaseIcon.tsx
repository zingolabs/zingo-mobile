import React from 'react';
import { Ellipse, Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `database` (ISC). */
export function DatabaseIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Ellipse cx={12} cy={5} rx={9} ry={3} />
      <Path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <Path d="M3 12A9 3 0 0 0 21 12" />
    </Icon>
  );
}
