import React from 'react';
import { Circle, Line } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `zoom-in` (ISC). */
export function ZoomInIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Circle cx={11} cy={11} r={8} />
      <Line x1={21} x2={16.65} y1={21} y2={16.65} />
      <Line x1={11} x2={11} y1={8} y2={14} />
      <Line x1={8} x2={14} y1={11} y2={11} />
    </Icon>
  );
}
