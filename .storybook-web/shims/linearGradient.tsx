import React from 'react';
import { View, ViewProps } from 'react-native';

const fill = { position: 'absolute', inset: 0 } as const;

type Point = { x: number; y: number };

type Props = ViewProps & {
  colors: string[];
  locations?: number[];
  start?: Point;
  end?: Point;
  children?: React.ReactNode;
};

/** Paints react-native-linear-gradient as a CSS gradient, top to bottom. */
const LinearGradient: React.FunctionComponent<Props> = ({
  colors,
  locations,
  start,
  end,
  children,
  ...rest
}) => {
  const dx = (end?.x ?? 0.5) - (start?.x ?? 0.5);
  const dy = (end?.y ?? 1) - (start?.y ?? 0);
  const direction =
    Math.abs(dx) > Math.abs(dy)
      ? dx >= 0
        ? 'to right'
        : 'to left'
      : dy >= 0
        ? 'to bottom'
        : 'to top';
  const stops = colors
    .map((c, i) =>
      locations?.[i] === undefined ? c : `${c} ${locations[i] * 100}%`,
    )
    .join(', ');

  return (
    <View {...rest}>
      <div
        style={{
          ...fill,
          backgroundImage: `linear-gradient(${direction}, ${stops})`,
        }}
      />
      {children}
    </View>
  );
};

export default LinearGradient;
