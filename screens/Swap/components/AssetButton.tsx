/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, View } from 'react-native';
import { radiusPill, space8, useTheme } from '@app/theme';
import type { TokenEntryType } from '@app/swap';
import Text from '@ui/primitives/Text';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import TokenLogo from './TokenLogo';

type AssetButtonProps = {
  token: TokenEntryType | null;
  /** The surface the chip sits on, which rings the chain badge. */
  surfaceColor: string;
  /** Opens the picker; absent on the fixed ZEC side. */
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * The asset chip: logo, ticker and, when the asset sits on a chain that is
 * not its own, the chain under it. A chevron says it opens the picker.
 */
export default function AssetButton({
  token,
  surfaceColor,
  onPress,
  accessibilityLabel,
  testID,
}: AssetButtonProps) {
  const { colors } = useTheme();
  const ticker = token?.ticker || token?.symbol || '';
  const isNative = !!token && token.chain === token.symbol;
  const network = token && !isNative ? chainDisplayName(token.chain) : '';
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: space8,
        height: 44,
        paddingLeft: 9,
        paddingRight: onPress ? 12 : 14,
        borderRadius: radiusPill,
        borderWidth: 1,
        borderColor: colors.borderMuted,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <TokenLogo
        token={token}
        size={28}
        surfaceColor={surfaceColor}
        forceBadge
      />
      <View>
        <Text variant="bodyStrong">{ticker}</Text>
        {!!network && (
          <Text variant="caption" tone="muted">
            {network}
          </Text>
        )}
      </View>
      {!!onPress && <ChevronDown size={16} color={colors.fgMuted} />}
    </Pressable>
  );
}
