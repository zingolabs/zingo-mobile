/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, View } from 'react-native';
import {
  iconSizeMd,
  rowMinHeight,
  space12,
  space16,
  useTheme,
} from '@app/theme';
import Text from './Text';
import { ChevronRight } from './Icons/Chevron';

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** An `Icon` at 20 or an `Avatar`. */
  leading?: React.ReactNode;
  /** An amount, a `Tag` or a small action. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Only when the row opens another screen; rows that expand in place have none. */
  chevron?: boolean;
  /** A hairline above the row, for every row after the first in a flush card. */
  divider?: boolean;
  testID?: string;
};

/**
 * A row of a list. The whole row is the tap target. With large text the
 * trailing value wraps below the title instead of squeezing it.
 */
const ListRow: React.FunctionComponent<ListRowProps> = ({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  chevron = false,
  divider = false,
  testID,
}) => {
  const { colors } = useTheme();
  const body = (
    <>
      {leading}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: space12,
        }}
      >
        <View style={{ flexGrow: 1, flexShrink: 1 }}>
          <Text variant="bodyStrong">{title}</Text>
          {subtitle !== undefined && (
            <Text variant="bodySmall" tone="muted">
              {subtitle}
            </Text>
          )}
        </View>
        {trailing !== undefined && (
          <View style={{ marginLeft: 'auto' }}>{trailing}</View>
        )}
      </View>
      {chevron && <ChevronRight size={iconSizeMd} color={colors.fgMuted} />}
    </>
  );
  const rowStyle = {
    minHeight: rowMinHeight,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: space12,
    paddingVertical: space12,
    paddingHorizontal: space16,
    borderTopWidth: divider ? 1 : 0,
    borderTopColor: colors.borderSubtle,
  };
  return onPress ? (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ ...rowStyle, opacity: pressed ? 0.7 : 1 })}
    >
      {body}
    </Pressable>
  ) : (
    <View testID={testID} style={rowStyle}>
      {body}
    </View>
  );
};

export default ListRow;
