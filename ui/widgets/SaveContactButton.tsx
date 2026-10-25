/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable } from 'react-native';
import { iconSizeMd, space8, touchTarget, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';
import { UserPlusIcon } from '@ui/primitives/Icons/UserPlusIcon';

type SaveContactButtonProps = {
  label: string;
  onPress: () => void;
  testID?: string;
};

/** The details' "Save contact" for an address the book lacks. */
export default function SaveContactButton({
  label,
  onPress,
  testID,
}: SaveContactButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
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
      <UserPlusIcon size={iconSizeMd} color={colors.fgAccent} />
      <Text
        variant="caption"
        style={{ flexShrink: 1, fontWeight: '700', color: colors.fgAccent }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
