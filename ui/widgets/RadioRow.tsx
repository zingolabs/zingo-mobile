/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, View } from 'react-native';
import { radiusLg, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';
import Radio from '@ui/primitives/Radio';

export type PillTone = 'positive' | 'warning';

/** A short uppercase mark beside a title: Best in green, Public in amber. */
export function Pill({ text, tone }: { text: string; tone: PillTone }) {
  const { colors } = useTheme();
  const color = tone === 'positive' ? colors.fgPriceUp : colors.fgWarning;
  return (
    <Text
      style={{
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingHorizontal: 6,
        borderRadius: 5,
        overflow: 'hidden',
        color,
        backgroundColor:
          tone === 'positive' ? colors.bgAccentSubtle : colors.bgWarningSubtle,
      }}
    >
      {text}
    </Text>
  );
}

/** The card a group of radio rows sits in. */
export function RadioList({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      style={{
        borderRadius: radiusLg,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        backgroundColor: colors.bgCanvas,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

type RadioRowProps = {
  title: string;
  pill?: { text: string; tone: PillTone };
  /** The line under the title. */
  sub?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  /** Buttons at the end of the row, outside its own press. */
  trailing?: React.ReactNode;
  first?: boolean;
  testID?: string;
};

/** One choice in a radio list: the mark, the title with its pill, a line under it. */
export default function RadioRow({
  title,
  pill,
  sub,
  selected,
  onPress,
  trailing,
  first,
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
        testID={testID}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          columnGap: 13,
          minHeight: 56,
          paddingVertical: 10,
          paddingLeft: 14,
          paddingRight: trailing ? 0 : 14,
          backgroundColor: pressed ? colors.bgMutedSubtle : 'transparent',
        })}
      >
        <Radio selected={selected} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', columnGap: 7 }}
          >
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: 13,
                lineHeight: 18,
                fontWeight: '600',
              }}
            >
              {title}
            </Text>
            {!!pill && <Pill text={pill.text} tone={pill.tone} />}
          </View>
          {!!sub && (
            <Text
              variant="caption"
              tone="muted"
              style={{ marginTop: 2, lineHeight: 16 }}
            >
              {sub}
            </Text>
          )}
        </View>
      </Pressable>
      {!!trailing && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 6,
          }}
        >
          {trailing}
        </View>
      )}
    </View>
  );
}
