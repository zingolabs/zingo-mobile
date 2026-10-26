import React from 'react';
import { View } from 'react-native';
import { space12, space20, useTheme, iconSizeSm } from '@app/theme';
import Text from '@ui/primitives/Text';
import { MessagesIcon } from '@ui/primitives/Icons/MessagesIcon';
import type { RowText } from '@screens/History/historyRowText';
import PrivateAmount, { useAmountReveal } from '@ui/widgets/PrivateAmount';
import { AVATAR_SIZE } from './HistoryAvatar';

/** Where a row's text starts, which is also where its hairline starts. */
export const ROW_TEXT_INSET = space20 + AVATAR_SIZE + space12;

/**
 * A History row's layout: the leading icon, the title over a line with the
 * state and the date, and the two figures on the right. The hairline above
 * starts at the text and stops at the gutter.
 */
export default function HistoryRowBody({
  leading,
  text,
  hairline,
  trailing,
  memo,
  compact,
}: {
  leading?: React.ReactNode;
  text: RowText;
  hairline: boolean;
  trailing?: React.ReactNode;
  memo?: boolean;
  /** The folded leg rows: smaller type, indented under the swap's icon. */
  compact?: boolean;
}) {
  const { colors } = useTheme();
  /** A tap on either figure shows all of the row's amounts. */
  const amounts = useAmountReveal();
  const topColor =
    text.topTone === 'positive'
      ? colors.fgAccent
      : text.topTone === 'muted'
        ? colors.fgMuted
        : colors.fgDefault;
  const stateColor =
    text.state?.tone === 'warning'
      ? colors.fgWarning
      : text.state?.tone === 'danger'
        ? colors.fgDanger
        : colors.fgDefault;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: space12,
        minHeight: compact ? 46 : 64,
        paddingVertical: compact ? 6 : 12,
        paddingLeft: compact ? ROW_TEXT_INSET : space20,
        paddingRight: space20,
      }}
    >
      {hairline && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: ROW_TEXT_INSET,
            right: space20,
            height: 1,
            backgroundColor: colors.borderSubtle,
          }}
        />
      )}
      {compact && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: space20 + AVATAR_SIZE / 2,
            width: 1,
            backgroundColor: colors.borderMuted,
          }}
        />
      )}
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          variant={
            text.titleMono ? 'address' : compact ? 'bodySmall' : 'bodyStrong'
          }
          numberOfLines={1}
          ellipsizeMode="middle"
          style={compact && !text.titleMono ? { fontWeight: '600' } : undefined}
        >
          {text.title}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 8,
            marginTop: 4,
          }}
        >
          {!!text.state && (
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: stateColor }}
            >
              {`${text.state.text} ·`}
            </Text>
          )}
          <Text
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {text.line}
            {!!text.lineAmount && amounts.show(text.lineAmount)}
          </Text>
          {memo && <MessagesIcon size={iconSizeSm} color={colors.fgMuted} />}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <PrivateAmount
          reveal={amounts}
          text={text.top}
          variant={compact ? 'bodySmall' : 'bodyStrong'}
          numberOfLines={1}
          style={{ color: topColor, ...(compact ? { fontWeight: '600' } : {}) }}
        />
        {!!text.bottom && (
          <PrivateAmount
            reveal={amounts}
            text={text.bottom}
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={{ marginTop: 4 }}
          />
        )}
      </View>
      {trailing}
    </View>
  );
}
