/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { iconSizeSm, radiusPill, space4, space8, useTheme } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';
import Avatar, { AvatarCategory } from '@ui/widgets/Avatar';

/** The switcher's height; its press reaches 44 with the slop. */
export const SWITCHER_HEIGHT = 36;
const MAX_WIDTH = 164;

type WalletSwitcherProps = {
  name: string;
  category: AvatarCategory;
  accessibilityLabel: string;
  /** Opens Wallets; absent, the switcher only names the open wallet. */
  onPress?: () => void;
};

/** The open wallet at the Header's left: its avatar and name, opening Wallets where the screen allows it. */
export default function WalletSwitcher({
  name,
  category,
  accessibilityLabel,
  onPress,
}: WalletSwitcherProps) {
  const { colors } = useTheme();
  const style = {
    height: SWITCHER_HEIGHT,
    maxWidth: MAX_WIDTH,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    columnGap: space8,
    paddingVertical: space4,
    paddingLeft: space4,
    paddingRight: space8,
    borderRadius: radiusPill,
  };
  const identity = (
    <>
      <Avatar kind="contact" size="sm" name={name} category={category} />
      <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
        {name}
      </Text>
    </>
  );
  return onPress ? (
    <Pressable
      kind="button"
      testID="header.wallets"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: space4, bottom: space4 }}
      onPress={onPress}
      style={style}
    >
      {identity}
      <ChevronDown size={iconSizeSm} color={colors.fgMuted} />
    </Pressable>
  ) : (
    <View
      testID="header.wallet"
      accessible
      accessibilityLabel={name}
      style={style}
    >
      {identity}
    </View>
  );
}
