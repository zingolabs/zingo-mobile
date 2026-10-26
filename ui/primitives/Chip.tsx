/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable } from 'react-native';
import {
  chipMinHeight,
  radiusPill,
  space12,
  touchTarget,
  useTheme,
} from '@app/theme';
import Text from './Text';

type ChipProps = {
  children: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

/** A pill that toggles a filter of what is already on screen. It never navigates. */
const Chip: React.FunctionComponent<ChipProps> = ({
  children,
  selected,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const slop = (touchTarget - chipMinHeight) / 2;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: slop, bottom: slop }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: chipMinHeight,
        paddingHorizontal: space12,
        borderRadius: radiusPill,
        borderWidth: 1,
        borderColor: selected ? colors.borderAccent : colors.borderMuted,
        backgroundColor: selected ? colors.bgAccentSubtle : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        variant="bodySmall"
        tone={selected ? 'accent' : 'muted'}
        style={{ fontWeight: '600' }}
      >
        {children}
      </Text>
    </Pressable>
  );
};

export default Chip;
