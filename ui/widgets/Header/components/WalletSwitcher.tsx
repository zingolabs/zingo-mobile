/* eslint-disable react-native/no-inline-styles */
import React from 'react';
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
  onPress: () => void;
};

/** The open wallet at the Header's left: its avatar and name, opening Wallets. */
export default function WalletSwitcher({
  name,
  category,
  accessibilityLabel,
  onPress,
}: WalletSwitcherProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      kind="button"
      testID="header.wallets"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: space4, bottom: space4 }}
      onPress={onPress}
      style={{
        height: SWITCHER_HEIGHT,
        maxWidth: MAX_WIDTH,
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: space8,
        paddingVertical: space4,
        paddingLeft: space4,
        paddingRight: space8,
        borderRadius: radiusPill,
      }}
    >
      <Avatar kind="contact" size="sm" name={name} category={category} />
      <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
        {name}
      </Text>
      <ChevronDown size={iconSizeSm} color={colors.fgMuted} />
    </Pressable>
  );
}
