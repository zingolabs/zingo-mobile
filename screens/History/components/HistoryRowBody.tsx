import React from 'react';
import { View } from 'react-native';
import { space12, space20, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';
import { MessagesIcon } from '@ui/primitives/Icons/MessagesIcon';
import type { RowText } from '@screens/History/historyRowText';
import { AVATAR_SIZE } from './HistoryAvatar';

/** Where a row's text starts, which is also where its hairline starts. */
export const ROW_TEXT_INSET = space20 + AVATAR_SIZE + space12;

export const MASK = '•••••';

/**
 * A History row's layout: the leading icon, the title over a line with the
 * state and the date, and the two figures on the right. The hairline above
 * starts at the text and stops at the gutter.
 */
export default function HistoryRowBody({
  leading,
  text,
  privacy,
  hairline,
  trailing,
  memo,
  compact,
}: {
  leading?: React.ReactNode;
  text: RowText;
  privacy: boolean;
  hairline: boolean;
  trailing?: React.ReactNode;
  memo?: boolean;
  /** The folded leg rows: smaller type, indented under the swap's icon. */
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const topColor =
    text.topTone === 'positive'
      ? colors.fgPriceUp
      : text.topTone === 'muted'
        ? colors.fgMuted
        : colors.fgDefault;
  const stateColor =
    text.state?.tone === 'warning'
      ? colors.fgTransparent
      : text.state?.tone === 'danger'
        ? colors.fgDanger
        : colors.fgDefault;
  const titleSize = compact ? 13 : 15;
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
            backgroundColor: colors.sheetHandle,
          }}
        />
      )}
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          variant={text.titleMono ? 'address' : 'bodyStrong'}
          numberOfLines={1}
          ellipsizeMode="middle"
          style={{ fontSize: text.titleMono ? titleSize - 2 : titleSize }}
        >
          {text.title}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 6,
            marginTop: 2,
          }}
        >
          {!!text.state && (
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: stateColor, fontWeight: '600' }}
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
          </Text>
          {memo && <MessagesIcon size={12} color={colors.fgMuted} />}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          variant="bodyStrong"
          numberOfLines={1}
          style={{ color: topColor, fontSize: titleSize }}
        >
          {privacy ? MASK : text.top}
        </Text>
        {!!text.bottom && (
          <Text
            variant="caption"
            tone="muted"
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {privacy ? MASK : text.bottom}
          </Text>
        )}
      </View>
      {trailing}
    </View>
  );
}
