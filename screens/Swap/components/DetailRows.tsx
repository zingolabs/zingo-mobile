/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Pressable, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { radiusMd, space12, useTheme, iconSizeSm } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import Text from '@ui/primitives/Text';
import { useInsetFill } from '@ui/primitives/Surface';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import InfoTooltip from '@ui/widgets/InfoTooltip';

export type DetailRow = {
  label: string;
  value: string;
  /** A value the user copies in full, shown shortened. */
  copy?: string;
  /** Long words that wrap instead of sitting on one line. */
  wrap?: boolean;
  /** What the label means, behind an info icon. */
  tip?: string;
  /** Green for what you get, amber for what came back, Nym green for the mixnet. */
  tone?: 'positive' | 'warning' | 'nym';
  /** Drawn before the value: a contact's avatar. */
  leading?: React.ReactNode;
  /** A shortened address or id, set in the monospace face. */
  mono?: boolean;
  /** A word after the value in Nym green: the review's NYM Enhanced. */
  badge?: string;
};

/** A detail's facts, label on the left and value on the right. */
export default function DetailRows({ rows }: { rows: DetailRow[] }) {
  const { translate, addLastSnackbar } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const inset = useInsetFill();
  const toneColor = (tone: DetailRow['tone']) =>
    tone === 'positive'
      ? colors.fgAccent
      : tone === 'warning'
        ? colors.fgWarning
        : tone === 'nym'
          ? colors.bgNym
          : colors.fgDefault;
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        borderRadius: radiusMd,
        backgroundColor: inset,
      }}
    >
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            columnGap: space12,
            minHeight: 44,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.borderSubtle,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', columnGap: 4 }}
          >
            <Text variant="caption" tone="muted">
              {row.label}
            </Text>
            {!!row.tip && (
              <InfoTooltip label={row.label} text={row.tip}>
                <></>
              </InfoTooltip>
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: 8,
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            {row.leading}
            <Text
              variant={row.mono || row.copy ? 'address' : 'bodySmall'}
              numberOfLines={row.wrap ? undefined : 1}
              style={{
                flexShrink: 1,
                textAlign: 'right',
                fontWeight: '600',
                color: toneColor(row.tone),
              }}
            >
              {row.value}
            </Text>
            {!!row.badge && (
              <Text
                variant="bodySmall"
                style={{ fontWeight: '600', color: colors.bgNym }}
              >
                {row.badge}
              </Text>
            )}
            {!!row.copy && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translate('swap.copy') as string}
                hitSlop={8}
                onPress={() => {
                  Clipboard.setString(row.copy ?? '');
                  addLastSnackbar(translate('swap.copied') as string);
                }}
                style={{
                  width: 28,
                  height: 28,
                  marginVertical: -6,
                  marginRight: -8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CopyIcon size={iconSizeSm} color={colors.fgMuted} />
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
