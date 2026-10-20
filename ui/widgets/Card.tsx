import React from 'react';
import { Pressable, View } from 'react-native';
import { radiusMd, space12, space16, touchTarget, useTheme } from '@app/theme';

export type CardTone =
  'default' | 'selected' | 'orchard' | 'ironwood' | 'sapling';

type CardProps = {
  children: React.ReactNode;
  tone?: CardTone;
  /** No padding, for a card of `ListRow`s edge to edge. */
  flush?: boolean;
  /** Only when the whole card is tappable; it then shows a pressed state. */
  onPress?: () => void;
  testID?: string;
};

/**
 * The raised surface that groups content on the canvas. `selected` marks the
 * chosen option among cards; pair it with a radio or check so the state does
 * not rest on color alone. A pool tone always carries the pool's `Tag`.
 */
const Card: React.FunctionComponent<CardProps> = ({
  children,
  tone = 'default',
  flush = false,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const paint = {
    default: { bg: colors.bgSurface, edge: colors.bottomSheetBorder },
    selected: { bg: colors.bgAccentSubtle, edge: colors.borderAccent },
    orchard: { bg: colors.bgOrchard, edge: colors.borderOrchard },
    ironwood: { bg: colors.bgIronwood, edge: colors.borderIronwood },
    sapling: { bg: colors.bgSapling, edge: colors.borderSapling },
  }[tone];
  const style = {
    backgroundColor: paint.bg,
    borderColor: paint.edge,
    borderWidth: 1,
    borderRadius: radiusMd,
    overflow: 'hidden' as const,
    ...(flush ? {} : { padding: space16, gap: space12 }),
  };
  return onPress ? (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: tone === 'selected' }}
      onPress={onPress}
      style={({ pressed }) => ({
        ...style,
        minHeight: touchTarget,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {children}
    </Pressable>
  ) : (
    <View testID={testID} style={style}>
      {children}
    </View>
  );
};

export default Card;
