import React from 'react';
import { Pressable, View } from 'react-native';
import { radiusPill, space8, useTheme, iconSizeSm } from '@app/theme';
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
 * not its own, the chain under it. The one that opens the picker has an edge
 * and a chevron; the fixed ZEC side is just the coin.
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
        height: 42,
        paddingLeft: onPress ? 7 : 0,
        paddingRight: onPress ? 10 : 0,
        borderRadius: radiusPill,
        borderWidth: onPress ? 1 : 0,
        borderColor: colors.bottomSheetBorder,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <TokenLogo
        token={token}
        size={26}
        surfaceColor={surfaceColor}
        forceBadge={!!onPress}
      />
      <View>
        <Text variant="bodyStrong">{ticker}</Text>
        {!!network && (
          <Text variant="caption" tone="muted">
            {network}
          </Text>
        )}
      </View>
      {!!onPress && <ChevronDown size={iconSizeSm} color={colors.fgMuted} />}
    </Pressable>
  );
}
