/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import {
  iconSizeMd,
  radiusMd,
  radiusPill,
  space12,
  space16,
  space24,
  space8,
  touchTarget,
  useTheme,
} from '@app/theme';
import Text from './Text';
import Pressable, { PressTile } from './Pressable';
import { XIcon } from './Icons/XIcon';

/** One control of each kind; press and hold each to see its reaction. */
const Kinds = () => {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space24, alignItems: 'flex-start' }}>
      <Pressable
        kind="button"
        accessibilityRole="button"
        onPress={() => {}}
        style={{
          backgroundColor: colors.bgAccent,
          borderRadius: radiusPill,
          paddingHorizontal: space24,
          paddingVertical: space12,
        }}
      >
        <Text variant="button" color={colors.fgOnAccent}>
          Button
        </Text>
      </Pressable>
      <Pressable
        kind="row"
        accessibilityRole="button"
        onPress={() => {}}
        style={{
          alignSelf: 'stretch',
          backgroundColor: colors.bgSurface,
          borderRadius: radiusMd,
          padding: space16,
        }}
      >
        <Text variant="bodyStrong">Row</Text>
        <Text variant="bodySmall" tone="muted">
          Its background takes the muted tint
        </Text>
      </Pressable>
      <Pressable
        kind="icon"
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => {}}
        style={{
          width: touchTarget,
          height: touchTarget,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <XIcon size={iconSizeMd} color={colors.fgDefault} />
      </Pressable>
      <Pressable kind="link" accessibilityRole="link" onPress={() => {}}>
        <Text variant="bodyStrong" tone="accent">
          Save contact
        </Text>
      </Pressable>
      <Pressable
        kind="tile"
        accessibilityRole="button"
        onPress={() => {}}
        style={{ alignItems: 'center', gap: space8 }}
      >
        <PressTile
          style={{
            width: 56,
            height: 56,
            borderRadius: radiusMd,
            backgroundColor: colors.bgSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <XIcon size={iconSizeMd} color={colors.fgDefault} />
        </PressTile>
        <Text variant="caption">Tile</Text>
      </Pressable>
    </View>
  );
};

const meta: Meta = { title: 'Components/Pressable', render: Kinds };
export default meta;
type Story = StoryObj;

export const Default: Story = {};
