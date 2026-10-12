import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function FlashlightIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z" />
      <Path d="M6 6h12M12 12v.01" />
    </Icon>
  );
}
