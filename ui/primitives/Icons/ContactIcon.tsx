import React from 'react';
import { Circle, Path, Rect } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `contact` (ISC). */
export function ContactIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M16 2v2" />
      <Path d="M7 21v-2a2 2 0 012-2h6a2 2 0 012 2v2" />
      <Path d="M8 2v2" />
      <Circle cx={12} cy={10} r={3} />
      <Rect x={3} y={3} width={18} height={18} rx={2} />
    </Icon>
  );
}
