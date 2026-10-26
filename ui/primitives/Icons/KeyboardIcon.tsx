import React from 'react';
import { Path, Rect } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `keyboard` (ISC). */
export function KeyboardIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M10 8h.01" />
      <Path d="M12 12h.01" />
      <Path d="M14 8h.01" />
      <Path d="M16 12h.01" />
      <Path d="M18 8h.01" />
      <Path d="M6 8h.01" />
      <Path d="M7 16h10" />
      <Path d="M8 12h.01" />
      <Rect width={20} height={16} x={2} y={4} rx={2} />
    </Icon>
  );
}
