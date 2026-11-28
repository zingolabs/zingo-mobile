/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme, iconSizeMd, textVariants } from '@app/theme';
import type { SwapAssetType } from '@app/swap';
import Text from '@ui/primitives/Text';
import { ChevronRight } from '@ui/primitives/Icons/Chevron';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import TokenLogo from './TokenLogo';
import { tokenEntryOf } from '@screens/Swap/swapAssets';

type Leg = {
  asset: SwapAssetType;
  label: string;
  amount: string;
  unit: string;
  /** The amount in dollars, empty when unpriced. */
  fiat: string;
  /** Green by default when arriving; muted for what never arrived. */
  tone?: 'positive' | 'default' | 'muted';
  /** Struck through: what an expired or failed swap would have got. */
  strike?: boolean;
};

/**
 * The top of a swap's review: what is happening, then what leaves and what
 * arrives side by side with their value in dollars, the arriving amount in
 * green. Selling ZEC, "Processing via NYM" sits over it with its note.
 * What follows the pair, like a status, goes under it.
 */
export default function PairHero({
  title,
  sent,
  received,
  processing,
  children,
}: {
  title: string;
  sent: Leg;
  received: Leg;
  /** The Nym label over the pair and its note; absent when nothing goes through NYM. */
  processing?: { label: string; note: string };
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const leg = (
    { asset, label, amount, unit, fiat, tone, strike = false }: Leg,
    incoming: boolean,
  ) => (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', rowGap: 8 }}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <TokenLogo
        token={tokenEntryOf(asset)}
        size={44}
        surfaceColor={colors.bgSurface}
        forceBadge={asset.chain !== asset.symbol}
      />
      <Text
        variant="subtitle"
        color={
          (tone ?? (incoming ? 'positive' : 'default')) === 'positive'
            ? colors.fgAccent
            : tone === 'muted'
              ? colors.fgMuted
              : undefined
        }
        strike={strike}
        style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}
      >
        {amount}
        <Text variant="bodySmall" tone="muted">{` ${unit}`}</Text>
      </Text>
      {!!fiat && (
        <Text variant="caption" tone="muted">
          {fiat}
        </Text>
      )}
    </View>
  );
  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      {!!processing && (
        <View style={{ marginBottom: 12 }}>
          <InfoTooltip
            testID="swap.review.nym-info"
            label={processing.label}
            labelStyle={{
              fontSize: textVariants.caption.fontSize,
              fontWeight: '600',
              textTransform: 'uppercase',
              color: colors.fgNym,
            }}
            text={processing.note}
          />
        </View>
      )}
      <Text
        variant="bodyStrong"
        style={{ fontWeight: '600', textAlign: 'center' }}
      >
        {title}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          alignSelf: 'stretch',
          marginTop: 16,
        }}
      >
        {leg(sent, false)}
        <View style={{ marginTop: 32 }}>
          <ChevronRight size={iconSizeMd} color={colors.fgMuted} />
        </View>
        {leg(received, true)}
      </View>
      {children}
    </View>
  );
}
