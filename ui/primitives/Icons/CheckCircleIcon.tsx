import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Sized = { size?: number };

export function CheckCircleIcon({ size = 18 }: Sized) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#149D05" />
      <Path
        d="m7.5 12.3 3 3 6-6.3"
        stroke="#06200A"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
