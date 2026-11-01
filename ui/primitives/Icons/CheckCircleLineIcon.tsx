import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `circle-check` (ISC). */
export function CheckCircleLineIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Path d="m16 9-5.5 5.5L8 12" />
    </Icon>
  );
}
