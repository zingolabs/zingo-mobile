import React from 'react';
import { Circle } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `ellipsis` (ISC). */
export function EllipsisIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={1} />
      <Circle cx={19} cy={12} r={1} />
      <Circle cx={5} cy={12} r={1} />
    </Icon>
  );
}
