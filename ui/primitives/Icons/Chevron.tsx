import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function ChevronUp(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="m18 15-6-6-6 6" />
    </Icon>
  );
}

export function ChevronDown(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="m6 9 6 6 6-6" />
    </Icon>
  );
}
