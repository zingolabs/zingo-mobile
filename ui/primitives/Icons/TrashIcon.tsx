import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** The lid alone, hinged at its left end, for rows that lift it. */
export function TrashLid(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M3 6h18" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Icon>
  );
}

/** The can alone, on the same grid as the lid. */
export function TrashCan(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
    </Icon>
  );
}

export function TrashIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M3 6h18" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
    </Icon>
  );
}
