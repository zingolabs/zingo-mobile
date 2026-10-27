/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { iconSizeSm, radiusSm, space8, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

/**
 * The "Don’t show this again" row of a warning sheet. It keeps its own tick,
 * since the sheet is drawn outside the screen that asked for it, and tells
 * the caller each change.
 */
export default function DontShowAgain({
  label,
  onChange,
  testID,
}: {
  label: string;
  onChange: (checked: boolean) => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const [checked, setChecked] = useState<boolean>(false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => {
        const next = !checked;
        setChecked(next);
        onChange(next);
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        columnGap: space8,
        paddingVertical: 4,
        marginBottom: space8,
      }}
    >
      <View
        style={{
          width: iconSizeSm + 4,
          height: iconSizeSm + 4,
          borderRadius: radiusSm,
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? colors.bgAccent : colors.bgSurface,
          borderColor: checked ? colors.bgAccent : colors.borderMuted,
        }}
      >
        {checked && <CheckIcon size={iconSizeSm} color={colors.fgOnAccent} />}
      </View>
      <Text variant="bodySmall" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}
