/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@app/theme';
import type { SwapAssetType } from '@app/swap';
import Text from '@ui/primitives/Text';
import { ChevronRight } from '@ui/primitives/Icons/Chevron';
import TokenLogo from './TokenLogo';
import { tokenEntryOf } from '@screens/Swap/swapAssets';

/**
 * The top of a swap's review: what leaves and what arrives as two coins
 * with an arrow, what is happening, what you get at 36 in green and what it
 * costs. Selling ZEC, "Processing via NYM" sits over it.
 */
export default function PairHero({
  from,
  to,
  title,
  amount,
  unit,
  line,
  processing,
}: {
  from: SwapAssetType;
  to: SwapAssetType;
  title: string;
  amount: string;
  unit: string;
  line: string;
  /** The Nym label over the pair; absent when nothing goes through NYM. */
  processing?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      {!!processing && (
        <Text
          variant="caption"
          style={{
            color: colors.bgNym,
            fontWeight: '600',
            letterSpacing: 0.7,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          {processing}
        </Text>
      )}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}
      >
        <TokenLogo
          token={tokenEntryOf(from)}
          size={44}
          surfaceColor={colors.bgSurface}
        />
        <ChevronRight size={18} color={colors.fgMuted} />
        <TokenLogo
          token={tokenEntryOf(to)}
          size={44}
          surfaceColor={colors.bgSurface}
          forceBadge={to.chain !== to.symbol}
        />
      </View>
      <Text
        variant="bodyStrong"
        style={{ marginTop: 12, fontWeight: '600', textAlign: 'center' }}
      >
        {title}
      </Text>
      <Text
        style={{
          marginTop: 12,
          fontSize: 36,
          lineHeight: 40,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
          color: colors.fgPriceUp,
        }}
      >
        {amount}
        <Text
          style={{ fontSize: 18, color: colors.fgMuted }}
        >{` ${unit}`}</Text>
      </Text>
      <Text
        variant="bodySmall"
        tone="muted"
        style={{ marginTop: 2, textAlign: 'center' }}
      >
        {line}
      </Text>
    </View>
  );
}
