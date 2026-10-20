import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `cloud-download` (ISC). */
export function CloudDownloadIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Path d="M12 13v8l-4-4" />
      <Path d="m12 21 4-4" />
      <Path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284" />
    </Icon>
  );
}
