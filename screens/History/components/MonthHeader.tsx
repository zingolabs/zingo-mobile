import React from 'react';
import { View } from 'react-native';
import { space20, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';

export const MONTH_HEADER_HEIGHT = 38;

/** The month label History pins while its rows scroll under it. */
export default function MonthHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: MONTH_HEADER_HEIGHT,
        justifyContent: 'flex-end',
        paddingHorizontal: space20,
        paddingBottom: 8,
        backgroundColor: colors.bgSurface,
      }}
    >
      <Text
        variant="caption"
        tone="muted"
        style={{
          fontWeight: '600',
          letterSpacing: 0.7,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
