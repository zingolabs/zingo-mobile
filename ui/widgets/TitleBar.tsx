/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, View } from 'react-native';
import { iconSizeMd, space4, space8, space16, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';

/** An icon button at one end of the bar. */
export type TitleBarAction = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  /** The back arrow is the accent green, as in the Header; the rest are muted. */
  accent?: boolean;
  disabled?: boolean;
  /** Drawn over the icon's corner: the filter dot. */
  badge?: React.ReactNode;
};

/** Each end keeps this width, so the title stays centred with one action or none. */
const SIDE = 48;
/** History's bar in dev, the designer's reference: 8 over the title, 6 under. */
const PAD_BOTTOM = 6;
/** An action's own padding across, which with its slop makes a 44 pt target. */
const ACTION_PAD = 14;

/**
 * The bar at the top of a panel or a sheet, as History's in dev: the title
 * in the barTitle style, centred, with an icon action (20, muted) at either
 * end. Home, Send, Receive, Swap, FullPanel and every sheet use it.
 */
export default function TitleBar({
  title,
  left,
  right,
  onLayout,
  testID,
}: {
  /** A string takes the bar's title style; a node (a picker) is drawn as given. */
  title: string | React.ReactElement;
  left?: TitleBarAction | React.ReactElement;
  right?: TitleBarAction | React.ReactElement;
  /** The bar's height, for a sheet that keeps its snap points under it. */
  onLayout?: (height: number) => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const action = (a: TitleBarAction | React.ReactElement | undefined) => {
    if (!a) {
      return null;
    }
    if (React.isValidElement(a)) {
      return a;
    }
    const Icon = a.icon;
    return (
      <Pressable
        testID={a.testID}
        accessibilityRole="button"
        accessibilityLabel={a.accessibilityLabel}
        disabled={a.disabled}
        onPress={a.onPress}
        hitSlop={space8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: ACTION_PAD,
          paddingVertical: space4,
        }}
      >
        <Icon
          size={iconSizeMd}
          color={a.accent ? colors.fgAccent : colors.fgMuted}
        />
        {a.badge}
      </Pressable>
    );
  };
  return (
    <View
      testID={testID}
      onLayout={e => onLayout?.(e.nativeEvent.layout.height)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: space8,
        paddingBottom: PAD_BOTTOM,
        paddingHorizontal: space16,
      }}
    >
      <View style={{ width: SIDE, alignItems: 'flex-start' }}>
        {action(left)}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {typeof title === 'string' ? (
          <Text variant="barTitle" numberOfLines={1}>
            {title}
          </Text>
        ) : (
          title
        )}
      </View>
      <View style={{ width: SIDE, alignItems: 'flex-end' }}>
        {action(right)}
      </View>
    </View>
  );
}
