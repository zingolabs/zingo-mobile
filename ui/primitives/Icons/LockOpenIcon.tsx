import React from 'react';
import { Path, Rect } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `lock-open` (ISC). */
export function LockOpenIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Rect width={18} height={11} x={3} y={11} rx={2} ry={2} />
      <Path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </Icon>
  );
}
