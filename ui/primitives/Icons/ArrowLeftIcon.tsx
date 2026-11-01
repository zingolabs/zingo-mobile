import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `arrow-left` (ISC). */
export function ArrowLeftIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="m12 19-7-7 7-7" />
      <Path d="M19 12H5" />
    </Icon>
  );
}
