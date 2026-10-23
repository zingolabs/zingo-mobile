/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { radiusPill, space8, useTheme } from '@app/theme';
import type { SwapAssetType } from '@app/swap';
import Text from '@ui/primitives/Text';
import HistoryAvatar from '@screens/History/components/HistoryAvatar';

export type HeroTone = 'positive' | 'default';
export type PillTone = 'accent' | 'warning' | 'danger' | 'neutral';

/**
 * The top of a swap or transaction detail: the icon, what happened, the
 * amount large, what left with its dollars, and a status pill.
 */
export default function DetailHero({
  icon,
  badge,
  title,
  amount,
  unit,
  tone,
  line,
  pill,
  pillTone,
}: {
  icon: React.ReactNode;
  badge?: SwapAssetType;
  title: string;
  amount: string;
  unit: string;
  tone: HeroTone;
  line: string;
  pill: string;
  pillTone: PillTone;
}) {
  const { colors } = useTheme();
  const paint = {
    accent: { bg: colors.bgAccentSubtle, fg: colors.fgAccent },
    warning: { bg: colors.bgWarningSubtle, fg: colors.fgWarning },
    danger: { bg: colors.bgDangerSubtle, fg: colors.fgDanger },
    neutral: { bg: colors.bgMutedSubtle, fg: colors.fgMuted },
  }[pillTone];
  return (
    <View style={{ alignItems: 'center', rowGap: space8, marginVertical: 12 }}>
      <View style={{ transform: [{ scale: 1.33 }], marginBottom: 6 }}>
        <HistoryAvatar icon={icon} badge={badge} />
      </View>
      <Text variant="bodyStrong" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text
        variant="balance"
        style={{
          fontSize: 36,
          color: tone === 'positive' ? colors.fgAccent : colors.fgDefault,
        }}
      >
        {`${amount} `}
        <Text variant="subtitle" tone="muted">
          {unit}
        </Text>
      </Text>
      {!!line && (
        <Text variant="bodySmall" tone="muted" style={{ textAlign: 'center' }}>
          {line}
        </Text>
      )}
      <View
        style={{
          backgroundColor: paint.bg,
          borderRadius: radiusPill,
          paddingHorizontal: 10,
          paddingVertical: 3,
          marginTop: 2,
        }}
      >
        <Text variant="caption" style={{ color: paint.fg, fontWeight: '700' }}>
          {pill}
        </Text>
      </View>
    </View>
  );
}
