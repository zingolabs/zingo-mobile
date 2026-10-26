import React from 'react';
import { Circle } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `circle-dot` (ISC). */
export function RadioOnIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={1} />
      <Circle cx={12} cy={12} r={10} />
    </Icon>
  );
}
