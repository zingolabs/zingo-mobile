import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `tags` (ISC). */
export function TagsIcon(props: React.ComponentProps<typeof Icon>) {
  const { color = 'currentColor' } = props;
  return (
    <Icon {...props}>
      <Path d="M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z" />
      <Path d="M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193" />
      <Circle cx={10.5} cy={6.5} r={0.5} fill={color} />
    </Icon>
  );
}
