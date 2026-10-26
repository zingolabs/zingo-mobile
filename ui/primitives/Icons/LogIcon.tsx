import React from 'react';
import { Ellipse, Path } from 'react-native-svg';
import { Icon } from './Icon';

/** The Ironwood pool's mark: a cut log. */
export function LogIcon(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon {...props}>
      <Ellipse cx={12} cy={5.5} rx={6} ry={2.5} />
      <Path d="M6 5.5v12c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-12" />
      <Path d="M10 10.5v3" />
      <Path d="M14.5 13v3" />
    </Icon>
  );
}
