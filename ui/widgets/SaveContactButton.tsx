/* eslint-disable react-native/no-inline-styles */
import React from 'react';

import { iconSizeMd, space8, touchTarget, useTheme } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import { UserPlusIcon } from '@ui/primitives/Icons/UserPlusIcon';

type SaveContactButtonProps = {
  label: string;
  onPress: () => void;
  testID?: string;
  /** The book's own action in the same place: Send again once the contact is saved. */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
};

/** The details' action for an outside address: Save contact, or Send again once it is saved. */
export default function SaveContactButton({
  label,
  onPress,
  testID,
  icon: Icon = UserPlusIcon,
}: SaveContactButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      kind="link"
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: space8,
        minHeight: touchTarget,
        marginTop: space8,
      }}
    >
      <Icon size={iconSizeMd} color={colors.fgAccent} />
      <Text
        variant="caption"
        style={{ flexShrink: 1, fontWeight: '700', color: colors.fgAccent }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
