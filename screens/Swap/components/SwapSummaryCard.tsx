/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { radiusMd, space12, space16, useTheme } from '@app/theme';
import { formatAmountForDisplay } from '@app/swap';
import type { SwapAssetType } from '@app/swap';
import Text from '@ui/primitives/Text';
import TokenLogo from './TokenLogo';
import { tokenEntryOf } from '@screens/Swap/swapAssets';

export type SwapSummarySide = {
  label: string;
  asset: SwapAssetType;
  amount: string;
  /** USD per unit at quote time; 0 hides the fiat line. */
  usdUnitPrice: number;
};

/** The two amounts of a swap, each with its asset and what it was worth. */
export default function SwapSummaryCard({
  sides,
  testID,
}: {
  sides: SwapSummarySide[];
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        borderRadius: radiusMd,
        paddingHorizontal: space16,
      }}
    >
      {sides.map((side, index) => {
        const usd = parseFloat(side.amount) * side.usdUnitPrice;
        return (
          <View
            key={side.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              columnGap: space12,
              paddingVertical: 13,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.bottomSheetBorder,
            }}
          >
            <Text variant="caption" tone="muted">
              {side.label}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: 10,
              }}
            >
              <TokenLogo
                token={tokenEntryOf(side.asset)}
                size={28}
                surfaceColor={colors.bgSurface}
                forceBadge
              />
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="bodyStrong" style={{ fontSize: 18 }}>
                  {`${formatAmountForDisplay(side.amount)} ${side.asset.ticker ?? side.asset.symbol}`}
                </Text>
                {side.usdUnitPrice > 0 && Number.isFinite(usd) && (
                  <Text variant="bodySmall" tone="muted">
                    {`≈ $${usd.toFixed(2)}`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
