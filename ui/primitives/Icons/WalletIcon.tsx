import React from 'react';
import { Circle, Path, Rect } from 'react-native-svg';
import { Icon } from './Icon';

export function WalletIcon(props: React.ComponentProps<typeof Icon>) {
  const { color = 'currentColor' } = props;
  return (
    <Icon {...props}>
      <Path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <Rect x={3.5} y={7.5} width={17} height={12} rx={2.5} />
      <Circle cx={16.5} cy={13.5} r={1.2} fill={color} stroke="none" />
    </Icon>
  );
}
