import React from 'react';
import { Path, Rect } from 'react-native-svg';
import { Icon } from './Icon';

export function ClipboardPasteIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M11 14h10" />
      <Path d="M16 4h2a2 2 0 0 1 2 2v1.344" />
      <Path d="m17 18 4-4-4-4" />
      <Path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113" />
      <Rect x={8} y={2} width={8} height={4} rx={1} />
    </Icon>
  );
}
