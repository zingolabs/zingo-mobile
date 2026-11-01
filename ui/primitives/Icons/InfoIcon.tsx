import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `info` (ISC). */
export function InfoIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 16v-4" />
      <Path d="M12 8h.01" />
    </Icon>
  );
}
