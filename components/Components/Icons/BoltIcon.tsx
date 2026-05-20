import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { Icon } from './Icon';

export function MessagesIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props} viewBox="0 0 24 24">
      <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <Circle cx="12" cy="12" r="4" />
    </Icon>
  );
}
