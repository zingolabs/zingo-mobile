import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** The Sapling pool's mark: a sprout, no pot. */
export function SaplingIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M12 20v-9M12 12c0-4.2-2.8-6.8-8.6-6.8 0 4.1 2.6 6.8 8.6 6.8zM12 10.6c0-4.2 2.8-7 8.6-7 0 4.2-2.6 7-8.6 7z" />
    </Icon>
  );
}
