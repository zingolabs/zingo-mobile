/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Pressable, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { radiusMd, space12, space16, space4, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import Text from '@ui/primitives/Text';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';

export type DetailRow = {
  label: string;
  value: string;
  /** A value the user copies in full, shown shortened. */
  copy?: string;
  /** Long words that wrap instead of sitting on one line. */
  wrap?: boolean;
};

/** A detail's facts, label on the left and value on the right. */
export default function DetailRows({ rows }: { rows: DetailRow[] }) {
  const { translate, addLastSnackbar } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        borderRadius: radiusMd,
        paddingHorizontal: space16,
      }}
    >
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            columnGap: space12,
            paddingVertical: 11,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.bottomSheetBorder,
          }}
        >
          <Text variant="bodySmall" tone="muted">
            {row.label}
          </Text>
          {row.copy ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate('swap.copy') as string}
              hitSlop={8}
              onPress={() => {
                Clipboard.setString(row.copy ?? '');
                addLastSnackbar(translate('swap.copied') as string);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: space4,
              }}
            >
              <Text variant="address">{row.value}</Text>
              <CopyIcon size={14} color={colors.fgAccent} />
            </Pressable>
          ) : (
            <Text
              variant="bodyStrong"
              numberOfLines={row.wrap ? undefined : 1}
              style={{ flexShrink: 1, textAlign: 'right' }}
            >
              {row.value}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
