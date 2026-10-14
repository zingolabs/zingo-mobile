import React from 'react';
import { Rect } from 'react-native-svg';
import { Icon } from './Icon';

const GREEN = '#37D41F';

type Sized = { size?: number };

export function BlocksIcon({ size = 17 }: Sized) {
  return (
    <Icon size={size} color={GREEN} strokeWidth={1.9}>
      <Rect x={3} y={3} width={7} height={7} rx={1.5} />
      <Rect x={14} y={3} width={7} height={7} rx={1.5} />
      <Rect x={3} y={14} width={7} height={7} rx={1.5} />
      <Rect x={14} y={14} width={7} height={7} rx={1.5} />
    </Icon>
  );
}
