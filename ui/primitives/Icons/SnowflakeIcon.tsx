import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function SnowflakeIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M2 12h20M12 2v20m8-15-8 5-8-5m16 10-8-5-8 5M9 4l3 3 3-3M9 20l3-3 3 3M4 9l3 3-3 3M20 9l-3 3 3 3" />
    </Icon>
  );
}
