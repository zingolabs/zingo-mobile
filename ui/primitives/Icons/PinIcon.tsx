import React from 'react';
import { Path } from 'react-native-svg';
import { Icon } from './Icon';

/** Lucide `pin` (ISC); `filled` paints the head, for a pinned address. */
export function PinIcon({
  filled,
  ...props
}: React.ComponentProps<typeof Icon> & { filled?: boolean }) {
  return (
    <Icon {...props}>
      <Path d="M12 17v5" />
      <Path
        fill={filled ? props.color : 'none'}
        d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
      />
    </Icon>
  );
}
