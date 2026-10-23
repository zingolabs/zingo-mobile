import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

/** A single tag: names one of the wallet's own addresses. */
export function TagIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <Circle cx={7.5} cy={7.5} r={1.3} />
    </Icon>
  );
}
