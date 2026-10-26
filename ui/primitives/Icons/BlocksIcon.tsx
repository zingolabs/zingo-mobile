import React from 'react';
import { Rect } from 'react-native-svg';
import { Icon } from './Icon';

export function BlocksIcon({
  size = 16,
  color,
}: React.ComponentProps<typeof Icon>) {
  return (
    <Icon size={size} color={color}>
      <Rect x={3} y={3} width={7} height={7} rx={1.5} />
      <Rect x={14} y={3} width={7} height={7} rx={1.5} />
      <Rect x={3} y={14} width={7} height={7} rx={1.5} />
      <Rect x={14} y={14} width={7} height={7} rx={1.5} />
    </Icon>
  );
}
