import React from 'react';
import { Path, Rect } from 'react-native-svg';
import { Icon } from './Icon';

export function CopyIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Rect width={14} height={14} x={8} y={8} rx={2} ry={2} />
      <Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
  );
}
