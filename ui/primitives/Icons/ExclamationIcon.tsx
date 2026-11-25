import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function ExclamationIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M12 5v9M12 19h.01" />
    </Icon>
  );
}
