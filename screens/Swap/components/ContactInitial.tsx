/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';
import { ChainLogo } from '@ui/widgets/ChainSelect';

/**
 * A contact's initial on a tint of its colour, as in the address book, with
 * the coin's badge in the corner when the row is about a swap.
 */
export default function ContactInitial({
  name,
  color,
  size,
  badge,
}: {
  name: string;
  color: string;
  size: number;
  /** The other coin's ticker, badged in the corner. */
  badge?: string;
}) {
  const { colors } = useTheme();
  const badgeSize = Math.round(size * 0.5);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}29`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color,
          fontSize: Math.round(size * 0.42),
          fontWeight: '700',
        }}
      >
        {name.slice(0, 1).toUpperCase()}
      </Text>
      {!!badge && (
        <View
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            borderRadius: badgeSize,
            borderWidth: 2,
            borderColor: colors.bgSurface,
            backgroundColor: colors.bgSurface,
          }}
        >
          <ChainLogo chain={badge} size={badgeSize} />
        </View>
      )}
    </View>
  );
}
