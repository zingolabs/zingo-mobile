import React from 'react';
import { Path, Rect } from 'react-native-svg';
import { Icon } from './Icon';

export function MailIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Rect width={18} height={14} x={3} y={5} rx={2.5} ry={2.5} />
      <Path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </Icon>
  );
}
