import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

export function FiltersIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props} viewBox="0 0 24 24">
      <Path d="M2 5h20"/>
      <Path d="M6 12h12"/>
      <Path d="M9 19h6"/>
    </Icon>
  );
}
