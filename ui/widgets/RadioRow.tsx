/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import Pressable from '@ui/primitives/Pressable';
import { View } from 'react-native';
import {
  radiusMd,
  useTheme,
  rowMinHeight,
  space4,
  space8,
  space12,
  space16,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import Radio from '@ui/primitives/Radio';
import Tag, { TagTone } from '@ui/widgets/Tag';
import { useInsetFill } from '@ui/primitives/Surface';

/** A pool, a recommendation or a wallet's state beside a row's title. */
export type PillTone = TagTone;

/** A tag beside a row's title. */
export type Pill = { text: string; tone: PillTone };

/** The dimmed radio of a choice that can't be picked. */
const UNAVAILABLE_OPACITY = 0.35;

/** The card a group of radio rows sits in. */
export function RadioList({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  const inset = useInsetFill();
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      style={{
        borderRadius: radiusMd,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        backgroundColor: inset,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

/**
 * One row's share of the card, for a virtualized list, which cannot wrap its
 * rows in a `RadioList`: together they draw the same card.
 */
export function RadioListSlice({
  first,
  last,
  children,
}: {
  first: boolean;
  last: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const inset = useInsetFill();
  return (
    <View
      style={{
        borderColor: colors.bottomSheetBorder,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: last ? 1 : 0,
        ...(first && {
          borderTopLeftRadius: radiusMd,
          borderTopRightRadius: radiusMd,
        }),
        ...(last && {
          borderBottomLeftRadius: radiusMd,
          borderBottomRightRadius: radiusMd,
        }),
        backgroundColor: inset,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

type RadioRowProps = {
  title: string;
  pills?: ReadonlyArray<Pill>;
  /** The line under the title. */
  sub?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  /** A coin's or a chain's logo, after the radio. */
  leading?: React.ReactNode;
  /** What the row leads to, at its end and inside its press. */
  aside?: React.ReactNode;
  /** Buttons at the end of the row, outside its own press. */
  trailing?: React.ReactNode;
  first?: boolean;
  /** The choice can't be picked: its radio dims and a press leads elsewhere. */
  unavailable?: boolean;
  testID?: string;
};

/** One choice in a radio list: the mark, the title with its pills, a line under it. */
export default function RadioRow({
  title,
  pills = [],
  sub,
  selected,
  onPress,
  leading,
  aside,
  trailing,
  first,
  unavailable = false,
  testID,
}: RadioRowProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.borderSubtle,
      }}
    >
      <Pressable
        kind="row"
        testID={testID}
        accessibilityRole="radio"
        accessibilityState={
          unavailable
            ? { checked: selected, disabled: true }
            : { checked: selected }
        }
        onPress={onPress}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          columnGap: space12,
          minHeight: rowMinHeight,
          paddingVertical: space12,
          paddingLeft: space16,
          paddingRight: trailing ? 0 : space16,
        }}
      >
        {unavailable ? (
          <View style={{ opacity: UNAVAILABLE_OPACITY }}>
            <Radio selected={selected} />
          </View>
        ) : (
          <Radio selected={selected} />
        )}
        {leading}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: space8,
            }}
          >
            <Text
              variant="bodyStrong"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {title}
            </Text>
            {pills.map(pill => (
              <Tag key={pill.text} tone={pill.tone}>
                {pill.text}
              </Tag>
            ))}
          </View>
          {!!sub && (
            <Text variant="bodySmall" tone="muted">
              {sub}
            </Text>
          )}
        </View>
        {aside}
      </Pressable>
      {!!trailing && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: space4,
          }}
        >
          {trailing}
        </View>
      )}
    </View>
  );
}
